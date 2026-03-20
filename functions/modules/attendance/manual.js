/**
 * 관리자 수동 출석 Cloud Function
 * 
 * [DRY] 프론트엔드에서 복잡한 비즈니스 로직을 직접 처리하지 않고,
 * 서버의 coreLogic.processAttendanceCore를 호출하여
 * 키오스크/오프라인과 100% 동일한 규칙을 적용합니다.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { tenantDb, getKSTDateString } = require("../../helpers/common");
const { requireAdmin } = require('../../helpers/authGuard');
const { processAttendanceCore } = require('./coreLogic');

exports.adminAddAttendanceCall = onCall({
    cors: ['https://boksaem-yoga.web.app', 'https://boksaem-yoga.firebaseapp.com', 'http://localhost:5173'],
    minInstances: 0
}, async (request) => {
    requireAdmin(request, 'adminAddAttendanceCall');

    const { memberId, branchId, date, className, instructor, skipCreditDeduction } = request.data;

    if (!memberId || !branchId) {
        throw new HttpsError('invalid-argument', '회원 ID와 지점 ID가 필요합니다.');
    }

    const tdb = tenantDb();
    const dateStr = date || getKSTDateString(new Date());
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) {
        throw new HttpsError('invalid-argument', '유효하지 않은 날짜입니다.');
    }

    // 수업 매칭 (수동 출석에서도 스케줄 기반 매칭 지원)
    let finalClassName = className || '수동 확인';
    let finalInstructor = instructor || '관리자';
    let finalClassTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

    if (finalClassName === '수동 확인') {
        try {
            const schedDoc = await tdb.collection('daily_classes').doc(`${branchId}_${dateStr}`).get();
            if (schedDoc.exists) {
                const classes = (schedDoc.data().classes || []).filter(c => c.status !== 'cancelled');
                const reqMins = dateObj.getHours() * 60 + dateObj.getMinutes();
                const matched = classes.find(cls => {
                    if (!cls.time) return false;
                    const [h, m] = cls.time.split(':').map(Number);
                    const start = h * 60 + m;
                    return reqMins >= start - 30 && reqMins <= start + (cls.duration || 60) + 30;
                });
                if (matched) {
                    finalClassName = matched.title || matched.className || '수업';
                    finalInstructor = matched.instructor || '선생님';
                    finalClassTime = matched.time;
                } else {
                    finalClassName = '자율수련';
                    finalInstructor = '회원';
                }
            }
        } catch (e) {
            console.warn('[AdminAttendance] Schedule match failed:', e.message);
        }
    }

    try {
        const result = await tdb.raw().runTransaction(async (transaction) => {
            return processAttendanceCore(transaction, {
                memberId,
                branchId,
                className: finalClassName,
                instructor: finalInstructor,
                classTime: finalClassTime,
                dateStr,
                timestampISO: dateObj.toISOString(),
                type: 'manual',
                eventId: null
            }, {
                skipCreditDeduction: !!skipCreditDeduction,
                skipValidation: true  // 관리자는 만료/횟수 무시 가능
            });
        });

        return result;
    } catch (error) {
        if (error.code) throw error;
        throw new HttpsError('internal', error.message);
    }
});
