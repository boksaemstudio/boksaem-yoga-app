/**
 * 회원권 관련 공통 유틸리티 모듈 (Cloud Function 용)
 * 프론트엔드의 src/utils/membershipUtils.js와 동일한 로직을 제공합니다.
 */

/**
 * TBD (To Be Determined) 상태인지 확인
 */
function isTBD(dateString) {
    return dateString === 'TBD' || dateString === 'unlimited';
}

/**
 * 주어진 시작일과 기간(개월)으로 KST 기준 종료일을 계산
 */
function calculateEndDate(startDateStr, durationMonths) {
    if (isTBD(startDateStr)) return 'TBD';
    if (durationMonths === 9999) return 'unlimited';

    const end = new Date(startDateStr);
    end.setMonth(end.getMonth() + durationMonths);
    end.setDate(end.getDate() - 1);
    
    // YYYY-MM-DD format based on KST (simple padding)
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, '0');
    const d = String(end.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * 현재 회원 상태와 upcomingMembership 데이터를 비교하여 활성화 여부와 결과를 반환
 */
function evaluateUpcomingActivation(currentMemberData, currentDateStr) {
    const upcoming = currentMemberData.upcomingMembership;
    if (!upcoming || !upcoming.startDate) {
        return { shouldActivate: false };
    }

    let shouldActivate = false;
    let newStartDate = upcoming.startDate;
    let newEndDate = upcoming.endDate;

    if (isTBD(upcoming.startDate)) {
        // TBD 처리 로직: 현재 멤버십이 '소진' 상태일 때 활성화
        const currentCredits = currentMemberData.credits || 0;
        let isCurrentExpired = false;
        
        if (currentMemberData.endDate && !isTBD(currentMemberData.endDate)) {
            const todayObj = new Date(currentDateStr);
            const endObj = new Date(currentMemberData.endDate);
            isCurrentExpired = todayObj > endObj;
        }

        const isCurrentExhausted = currentCredits <= 0 || isCurrentExpired;

        if (isCurrentExhausted) {
            shouldActivate = true;
            newStartDate = currentDateStr; // 오늘부터 시작
            newEndDate = calculateEndDate(newStartDate, upcoming.durationMonths || 1);
        }
    } else {
        // 지정일 처리 로직
        const upcomingStart = new Date(upcoming.startDate);
        const todayDate = new Date(currentDateStr);
        if (todayDate >= upcomingStart) {
            shouldActivate = true;
            // newStartDate, newEndDate는 기존 upcoming 값을 그대로 유지
        }
    }

    if (shouldActivate) {
        return {
            shouldActivate: true,
            membershipType: upcoming.membershipType,
            credits: upcoming.credits,
            startDate: newStartDate,
            endDate: newEndDate
        };
    }

    return { shouldActivate: false };
}

module.exports = {
    isTBD,
    calculateEndDate,
    evaluateUpcomingActivation
};
