/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 출석 코어 로직 — 단일 진실 공급원 (Single Source of Truth)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 키오스크 체크인, 관리자 수동 출석, 오프라인 동기화가
 * 모두 이 하나의 함수를 통과합니다.
 * 
 * 비즈니스 로직을 여러 곳에 복사하지 마십시오.
 * 모든 출석 규칙 변경은 이 파일 하나만 수정하면 됩니다.
 */

const { admin, tenantDb, getKSTDateString } = require("../../helpers/common");
const membershipUtils = require('../../utils/membershipUtils');
const { calculateStreak } = require('./helpers');

/**
 * TBD 매출(Sales) 기록을 실일자로 업데이트 (fire-and-forget)
 * @param {string} memberId
 * @param {string} startDate - 해소된 시작일
 * @param {string} endDate - 해소된 종료일
 */
function updateTBDSalesRecords(memberId, startDate, endDate, studioId) {
    const tdb = tenantDb(studioId);
    setImmediate(async () => {
        try {
            const salesSnap = await tdb.collection('sales')
                .where('memberId', '==', memberId)
                .where('startDate', '==', 'TBD')
                .get();
            if (!salesSnap.empty) {
                const batch = tdb.raw().batch();
                salesSnap.forEach(doc => { batch.update(doc.ref, { startDate, endDate }); });
                await batch.commit();
                console.log(`[CoreLogic] Updated ${salesSnap.size} TBD sales records for ${memberId}`);
            }
        } catch (e) { console.warn(`[CoreLogic] Failed to update sales TBD for ${memberId}:`, e.message); }
    });
}

/**
 * 홀딩(일시정지) 해제 처리
 * @param {Object} memberData - 회원 문서 데이터 (mutate됨)
 * @param {string} dateStr - 해제 기준일 (YYYY-MM-DD)
 * @param {string} timestampISO - 해제 시각 (ISO string)
 * @returns {{ holdReleased: boolean, holdUpdates: Object }} Firestore에 쓸 필드
 */
function processHoldRelease(memberData, dateStr, timestampISO) {
    if (memberData.holdStatus !== 'holding' || !memberData.holdStartDate) {
        return { holdReleased: false, holdUpdates: {} };
    }

    const holdStart = new Date(memberData.holdStartDate + 'T00:00:00+09:00');
    const todayDate = new Date(dateStr + 'T00:00:00+09:00');
    
    // 기본적으로 쉰 날짜 전체 계산
    let actualHoldDays = Math.max(1, Math.round((todayDate - holdStart) / (1000 * 60 * 60 * 24)));

    // [규칙 지키기] 신청/입력한 일수를 초과해서 쉬었다면 최대 허용 기간까지만 연장하도록 Cap (한도 제한)
    if (memberData.holdRequestedDays) {
        actualHoldDays = Math.min(actualHoldDays, memberData.holdRequestedDays);
    }

    if (memberData.endDate && memberData.endDate !== 'TBD' && memberData.endDate !== 'unlimited') {
        const currentEnd = new Date(memberData.endDate);
        currentEnd.setDate(currentEnd.getDate() + actualHoldDays);
        memberData.endDate = getKSTDateString(currentEnd);
        console.log(`[CoreLogic] Hold released: +${actualHoldDays} days. New endDate: ${memberData.endDate}`);
    }

    const holdHistory = memberData.holdHistory || [];
    const updatedHistory = holdHistory.map((h, i) => {
        if (i === holdHistory.length - 1 && !h.releasedAt) {
            return { ...h, releasedAt: timestampISO, actualDays: actualHoldDays };
        }
        return h;
    });

    memberData.holdStatus = null;
    memberData.holdStartDate = null;
    memberData.holdRequestedDays = null;
    memberData.holdHistory = updatedHistory;

    return {
        holdReleased: true,
        holdUpdates: {
            holdStatus: admin.firestore.FieldValue.delete(),
            holdStartDate: admin.firestore.FieldValue.delete(),
            holdRequestedDays: admin.firestore.FieldValue.delete(),
            holdHistory: updatedHistory
        }
    };
}

/**
 * 선등록(Upcoming Membership) 활성화 처리
 * @param {Object} memberData - 회원 문서 데이터 (mutate됨)
 * @param {string} dateStr - 기준일
 * @returns {{ activated: boolean, swapUpdates: Object|null }}
 */
function processUpcomingActivation(memberData, dateStr) {
    if (!memberData.upcomingMembership || !memberData.upcomingMembership.startDate) {
        return { activated: false, swapUpdates: null };
    }

    const result = membershipUtils.evaluateUpcomingActivation(memberData, dateStr);
    if (!result.shouldActivate) {
        return { activated: false, swapUpdates: null };
    }

    console.log(`[CoreLogic] Activating upcoming membership`);
    memberData.membershipType = result.membershipType;
    memberData.credits = result.credits;
    memberData.startDate = result.startDate;
    memberData.endDate = result.endDate;

    return {
        activated: true,
        swapUpdates: {
            membershipType: memberData.membershipType,
            credits: memberData.credits,
            startDate: memberData.startDate,
            endDate: memberData.endDate,
            duration: memberData.upcomingMembership.durationMonths || 1,
            upcomingMembership: admin.firestore.FieldValue.delete()
        }
    };
}

/**
 * TBD(미확정 시작일) 해소 처리
 * @param {Object} memberData - 회원 문서 데이터 (mutate됨)
 * @param {string} memberId - 매출 기록 업데이트용
 * @param {string} dateStr - 오늘 날짜 = 새 시작일
 * @returns {{ resolved: boolean, startDate: string, endDate: string }}
 */
function processTBDResolution(memberData, memberId, dateStr) {
    const st = memberData.startDate;
    const ed = memberData.endDate;
    if (!membershipUtils.isTBD(st) && st && !membershipUtils.isTBD(ed) && ed) {
        return { resolved: false, startDate: st, endDate: ed };
    }

    const dur = memberData.duration || 1;
    const newStart = dateStr;
    const newEnd = membershipUtils.calculateEndDate(newStart, dur);
    memberData.startDate = newStart;
    memberData.endDate = newEnd;
    console.log(`[CoreLogic] TBD resolved: start=${newStart}, end=${newEnd} (duration=${dur}mo)`);

    // Fire-and-forget: Sales 기록도 실일자로 반영
    updateTBDSalesRecords(memberId, newStart, newEnd, memberData._studioId);

    return { resolved: true, startDate: newStart, endDate: newEnd };
}

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * processAttendanceCore — 출석 처리 핵심 엔진
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 키오스크, 관리자 수동, 오프라인 동기화가 모두 이 함수를 호출합니다.
 * 
 * @param {FirebaseFirestore.Transaction} transaction - Firestore 트랜잭션
 * @param {Object} params
 * @param {string} params.memberId
 * @param {string} params.branchId
 * @param {string} params.className - 수업명
 * @param {string} params.instructor - 강사명
 * @param {string} params.classTime - 수업 시간 (HH:MM)
 * @param {string} params.dateStr - 출석 날짜 (YYYY-MM-DD)
 * @param {string} params.timestampISO - ISO timestamp
 * @param {string} params.type - 'checkin' | 'manual'
 * @param {string|null} params.eventId - Idempotency UUID
 * @param {Object} options
 * @param {boolean} options.skipCreditDeduction - 횟수 차감 안 함 (관리자)
 * @param {boolean} options.skipValidation - 만료/횟수 검증 건너뛰기 (관리자)
 * @param {boolean} options.force - 5분 디바운스 무시 (강제 출석)
 * @param {Object|null} options.preActivatedUpcoming - 오프라인에서 미리 계산된 upcoming
 * @returns {Object} 출석 처리 결과
 */
async function processAttendanceCore(transaction, params, options = {}) {
    const { memberId, branchId, className, instructor, classTime, dateStr, timestampISO, type, eventId, source, studioId } = params;
    const { skipCreditDeduction = false, skipValidation = false, force = false, preActivatedUpcoming = null } = options;
    const tdb = tenantDb(studioId);

    // ━━━━ 1. 회원 조회 ━━━━
    const memberRef = tdb.collection('members').doc(memberId);
    const memberSnap = await transaction.get(memberRef);
    if (!memberSnap.exists) {
        return { success: false, status: 'error', message: '회원을 찾을 수 없습니다.' };
    }
    const memberData = memberSnap.data();

    // ━━━━ PRE-STATE BACKUP (For Rollback on Delete) ━━━━
    const preAttendanceState = {
        credits: memberData.credits || 0,
        membershipType: memberData.membershipType || null,
        startDate: memberData.startDate || null,
        endDate: memberData.endDate || null,
        upcomingMembership: memberData.upcomingMembership || null
    };

    // ━━━━ 2. 홀딩 해제 ━━━━
    const { holdReleased, holdUpdates } = processHoldRelease(memberData, dateStr, timestampISO);

    // ━━━━ 3. 선등록 활성화 ━━━━
    let activated = false;
    let swapUpdates = null;

    if (preActivatedUpcoming) {
        // 오프라인 동기화: 프론트에서 미리 계산한 upcoming 적용
        activated = true;
        memberData.membershipType = preActivatedUpcoming.membershipType;
        memberData.credits = preActivatedUpcoming.credits;
        memberData.startDate = preActivatedUpcoming.startDate;
        memberData.endDate = preActivatedUpcoming.endDate;
        swapUpdates = {
            membershipType: memberData.membershipType,
            credits: memberData.credits,
            startDate: memberData.startDate,
            endDate: memberData.endDate,
            upcomingMembership: admin.firestore.FieldValue.delete()
        };
    } else {
        const upResult = processUpcomingActivation(memberData, dateStr);
        activated = upResult.activated;
        swapUpdates = upResult.swapUpdates;
    }

    // ━━━━ 4. TBD 해소 ━━━━
    memberData._studioId = studioId; // Pass studioId for updateTBDSalesRecords
    const tbdResult = processTBDResolution(memberData, memberId, dateStr);
    if (activated && swapUpdates) {
        // 선등록 활성화된 경우 TBD 매출도 업데이트
        updateTBDSalesRecords(memberId, memberData.startDate, memberData.endDate, studioId);
    }

    // ━━━━ 5. 출석 검증 ━━━━
    let attendanceStatus = 'valid';
    let denialReason = null;
    const currentCredits = memberData.credits || 0;
    const safeCredits = Number.isFinite(currentCredits) ? currentCredits : 0;

    if (!skipValidation) {
        // 기간 만료 체크
        if (memberData.endDate && memberData.endDate !== 'TBD' && memberData.endDate !== 'unlimited') {
            if (new Date(dateStr + 'T00:00:00+09:00') > new Date(memberData.endDate + 'T00:00:00+09:00')) {
                attendanceStatus = 'denied';
                denialReason = 'expired';
            }
        }
        // 횟수 부족 체크
        if (attendanceStatus === 'valid' && safeCredits <= 0) {
            attendanceStatus = 'denied';
            denialReason = 'no_credits';
        }
    }

    // ━━━━ 6. 스트릭 & 세션 수 & 디바운스(중복 방어막) ━━━━
    const currentCount = memberData.attendanceCount || 0;
    const recentSnap = await transaction.get(
        tdb.collection('attendance')
            .where('memberId', '==', memberId)
            .orderBy('timestamp', 'desc')
            .limit(30)
    );
    const records = recentSnap.docs.map(d => d.data()).filter(r => r.status === 'valid');

    // 디바운스 방어막 (5초 이내 네트워크 이중전송 방지 — 중복 출석 UX는 프론트가 담당)
    if (!force && records.length > 0 && records[0].timestamp) {
        const lastTime = new Date(records[0].timestamp);
        const nowTime = new Date(timestampISO);
        const diffSeconds = (nowTime - lastTime) / 1000;
        if (diffSeconds < 5) {
            console.log(`[CoreLogic] BLOCKED network duplicate for ${memberId} within ${diffSeconds.toFixed(1)}s.`);
            return { success: false, status: 'error', message: '잠시 후 다시 시도해주세요.' };
        }
    }

    let streak = calculateStreak(records, dateStr);
    if (!Number.isFinite(streak)) streak = 1;

    const todayRecords = recentSnap.docs.map(d => d.data()).filter(r => r.date === dateStr);
    const sessionCount = todayRecords.length + 1;
    const isMultiSession = todayRecords.length > 0;

    // ━━━━ 7. 출석 기록 생성 ━━━━
    const newCredits = attendanceStatus === 'valid' && !skipCreditDeduction ? safeCredits - 1 : safeCredits;
    const newCount = attendanceStatus === 'valid' ? currentCount + 1 : currentCount;

    const attendanceData = {
        memberId,
        memberName: memberData.name,
        branchId,
        date: dateStr,
        className: attendanceStatus === 'valid'
            ? (className || '자율수련')
            : `출석 거부 (${denialReason === 'expired' ? '기간 만료' : denialReason === 'weekly_limit' ? '주간 횟수 초과' : denialReason === 'daily_limit' ? '일간 횟수 초과' : '횟수 부족'})`,
        instructor: instructor || '미지정',
        timestamp: timestampISO,
        type,
        eventId: eventId || null,
        status: attendanceStatus,
        classTime: classTime || null,
        sessionNumber: sessionCount,
        regDate: memberData.regDate || memberData.startDate || dateStr,
        credits: newCredits,
        startDate: memberData.startDate,
        endDate: memberData.endDate,
        cumulativeCount: newCount,
        source: source || type || 'unknown'
    };
    if (denialReason) attendanceData.denialReason = denialReason;

    // ━━━━ PRE-STATE BACKUP ATTACHMENT ━━━━
    if (activated || tbdResult?.resolved) {
        attendanceData.stateChanges = preAttendanceState;
    }

    const attRef = tdb.collection('attendance').doc();
    transaction.set(attRef, attendanceData);

    // ━━━━ 8. 회원 정보 업데이트 ━━━━
    if (attendanceStatus === 'valid') {
        const updates = {
            attendanceCount: admin.firestore.FieldValue.increment(1),
            streak,
            startDate: memberData.startDate,
            endDate: memberData.endDate,
            lastAttendance: timestampISO
        };

        // 크레딧 차감
        if (activated && swapUpdates) {
            // 선등록 활성화: swapUpdates의 credits에서 1 차감 (skipCreditDeduction 존중)
            const finalCredits = skipCreditDeduction ? swapUpdates.credits : swapUpdates.credits - 1;
            Object.assign(updates, swapUpdates, { credits: finalCredits });
        } else if (skipCreditDeduction) {
            // 관리자: 차감 안 함
        } else {
            updates.credits = admin.firestore.FieldValue.increment(-1);
        }

        // 홀딩 해제 필드
        if (holdReleased) {
            Object.assign(updates, holdUpdates);
        }

        transaction.update(memberRef, updates);
    }

    return {
        success: true,
        attendanceId: attRef.id,
        attendanceStatus,
        denialReason,
        newCredits,
        attendanceCount: newCount,
        streak,
        startDate: memberData.startDate,
        endDate: memberData.endDate,
        memberName: memberData.name,
        isMultiSession,
        sessionCount
    };
}

module.exports = {
    processAttendanceCore,
    processHoldRelease,
    processUpcomingActivation,
    processTBDResolution,
    updateTBDSalesRecords
};
