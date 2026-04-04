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

/**
 * ISO 타임스탬프 또는 YYYY-MM-DD 문자열을 항상 YYYY-MM-DD로 정규화
 * @param {string} dateInput - '2026-03-22' 또는 '2026-03-22T04:26:28.312Z' 형식
 * @returns {string} 'YYYY-MM-DD'
 */
function normalizeDateToYYYYMMDD(dateInput) {
    if (!dateInput) return getKSTDateString(new Date());
    // 이미 YYYY-MM-DD 형식이면 그대로
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;
    // ISO 형식이면 KST 기준으로 YYYY-MM-DD 추출
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return getKSTDateString(new Date());
    return getKSTDateString(d);
}

/**
 * Date 객체에서 KST 기준 HH:MM 시간 추출
 * Cloud Functions는 UTC에서 실행되므로 getHours()가 아닌 KST 변환 필요
 * @param {Date} date
 * @returns {string} 'HH:MM'
 */
function getKSTTimeString(date) {
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
}
const { processAttendanceCore } = require('./coreLogic');

exports.adminAddAttendanceCall = onCall({
    cors: require('../../helpers/cors').ALLOWED_ORIGINS,
    minInstances: 0
}, async (request) => {
    requireAdmin(request, 'adminAddAttendanceCall');

    const { memberId, branchId, date, className, instructor, skipCreditDeduction, studioId } = request.data;

    if (!memberId || !branchId) {
        throw new HttpsError('invalid-argument', '회원 ID와 지점 ID가 필요합니다.');
    }

    const tdb = tenantDb(studioId);
    // [FIX] ISO 형식이 들어와도 항상 YYYY-MM-DD로 정규화 (근원 버그 수정)
    const dateStr = normalizeDateToYYYYMMDD(date);
    // timestamp 복원: date가 ISO면 그 시각 사용, YYYY-MM-DD면 현재 시각 사용
    const dateObj = (date && date.includes('T')) ? new Date(date) : new Date();
    if (isNaN(dateObj.getTime())) {
        throw new HttpsError('invalid-argument', '유효하지 않은 날짜입니다.');
    }

    // 수업 매칭 (수동 출석에서도 스케줄 기반 매칭 지원)
    let finalClassName = className || '수동 확인';
    let finalInstructor = instructor || '관리자';
    // [FIX] Cloud Functions는 UTC — getHours() 대신 KST 기준 시간 사용
    let finalClassTime = getKSTTimeString(dateObj);

    if (finalClassName === '수동 확인') {
        try {
            const schedDoc = await tdb.collection('daily_classes').doc(`${branchId}_${dateStr}`).get();
            if (schedDoc.exists) {
                const classes = (schedDoc.data().classes || []).filter(c => c.status !== 'cancelled');
                // [FIX] KST 기준 분 단위 계산 (UTC getHours() 버그 수정)
                const kstObj = new Date(dateObj.getTime() + 9 * 60 * 60 * 1000);
                const reqMins = kstObj.getUTCHours() * 60 + kstObj.getUTCMinutes();
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
                eventId: null,
                studioId
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
