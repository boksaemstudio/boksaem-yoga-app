/**
 * 회원권 관련 공통 유틸리티
 * TBD 판단, upcoming 활성화 로직 등을 중앙화하여
 * attendance.js(CF), attendanceService.js(프론트) 간 로직 일관성 보장
 */

/**
 * startDate가 TBD(미확정)인지 판단
 * @param {string|null|undefined} startDate
 * @returns {boolean}
 */
export const isTBD = (startDate) => startDate === 'TBD';

/**
 * 날짜 문자열을 YYYY-MM-DD 형식으로 반환 (KST)
 * @param {Date} date
 * @returns {string}
 */
export const toKSTDateString = (date) => {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
};

/**
 * 기간(개월) 기반 종료일 계산
 * @param {string} startDateStr - YYYY-MM-DD
 * @param {number} durationMonths
 * @returns {string} YYYY-MM-DD
 */
export const calculateEndDate = (startDateStr, durationMonths) => {
  const end = new Date(startDateStr);
  const months = (durationMonths === 9999) ? 1 : durationMonths; // 9999 = 무제한 특수 처리
  end.setMonth(end.getMonth() + months);
  end.setDate(end.getDate() - 1);
  return toKSTDateString(end);
};

/**
 * upcomingMembership 활성화 판단 및 새로운 필드 계산
 * 
 * @param {Object} memberData - 현재 회원 데이터 (credits, endDate, upcomingMembership)
 * @param {string} todayStr - 오늘 날짜 YYYY-MM-DD
 * @returns {{ shouldActivate: boolean, newFields: Object|null }}
 *   - shouldActivate: true이면 upcoming을 활성화해야 함
 *   - newFields: { membershipType, credits, startDate, endDate } (활성화 시)
 */
export const evaluateUpcomingActivation = (memberData, todayStr) => {
  const upcoming = memberData.upcomingMembership;
  if (!upcoming || !upcoming.startDate) {
    return { shouldActivate: false, newFields: null };
  }

  const isUpcomingTBD = isTBD(upcoming.startDate);
  let shouldActivate = false;
  let newStartDate = upcoming.startDate;
  let newEndDate = upcoming.endDate;

  if (isUpcomingTBD) {
    // TBD: 현재 회원권이 소진/만료된 상태에서만 활성화
    const currentCredits = memberData.credits || 0;
    const isCurrentExpired = memberData.endDate
      ? (new Date(todayStr) > new Date(memberData.endDate))
      : false;
    const isCurrentExhausted = currentCredits <= 0 || isCurrentExpired;

    if (isCurrentExhausted) {
      shouldActivate = true;
      newStartDate = todayStr;
      newEndDate = calculateEndDate(todayStr, upcoming.durationMonths || 1);
    }
  } else {
    // 시작일이 지정된 경우: 출석일 >= 시작일이면 활성화
    if (new Date(todayStr) >= new Date(upcoming.startDate)) {
      shouldActivate = true;
    }
  }

  if (!shouldActivate) {
    return { shouldActivate: false, newFields: null };
  }

  return {
    shouldActivate: true,
    newFields: {
      membershipType: upcoming.membershipType,
      credits: upcoming.credits,
      startDate: newStartDate,
      endDate: newEndDate,
    }
  };
};
