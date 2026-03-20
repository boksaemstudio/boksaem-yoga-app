/**
 * Credit Policy Utilities (Server-side)
 * 주간/일간/총합 크레딧 정책 계산 유틸리티
 * 
 * @module utils/creditPolicyUtils
 */

/**
 * 주어진 날짜가 속한 주의 시작일과 종료일을 계산
 * @param {string} dateStr - 'YYYY-MM-DD' 형식의 날짜
 * @param {number} resetDay - 리셋 요일 (0=일, 1=월, ..., 6=토) 기본값: 1(월요일)
 * @returns {{ weekStart: string, weekEnd: string }} 'YYYY-MM-DD' 형식
 */
function getWeekBoundary(dateStr, resetDay = 1) {
    const date = new Date(dateStr + 'T00:00:00+09:00'); // KST
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ...

    // 현재 요일에서 리셋 요일까지의 거리 계산
    let daysFromReset = dayOfWeek - resetDay;
    if (daysFromReset < 0) daysFromReset += 7;

    const weekStartDate = new Date(date);
    weekStartDate.setDate(date.getDate() - daysFromReset);

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);

    return {
        weekStart: formatDate(weekStartDate),
        weekEnd: formatDate(weekEndDate)
    };
}

/**
 * 주어진 날짜가 속한 일의 범위 (일간 모드용)
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {{ dayStart: string, dayEnd: string }}
 */
function getDayBoundary(dateStr) {
    return { dayStart: dateStr, dayEnd: dateStr };
}

/**
 * 크레딧 정책에 따른 기간 제한 초과 여부 체크
 * @param {Object} params
 * @param {string} params.mode - 'total' | 'weekly' | 'daily'
 * @param {number} params.sessionsPerWeek - 주간 제한 횟수 (0 = 무제한)
 * @param {number} params.sessionsPerDay - 일간 제한 횟수 (0 = 무제한)
 * @param {number} params.periodAttendanceCount - 해당 기간 출석 횟수
 * @param {number} params.totalCredits - 총 잔여 크레딧
 * @returns {{ allowed: boolean, reason: string|null, remaining: number }}
 */
function evaluateCreditPolicy(params) {
    const { mode, sessionsPerWeek, sessionsPerDay, periodAttendanceCount, totalCredits } = params;

    // 1. 총 크레딧 체크 (모든 모드 공통)
    if (totalCredits <= 0) {
        return { allowed: false, reason: 'no_credits', remaining: 0 };
    }

    // 2. 모드별 기간 제한 체크
    if (mode === 'weekly' && sessionsPerWeek > 0) {
        const weeklyRemaining = sessionsPerWeek - periodAttendanceCount;
        if (weeklyRemaining <= 0) {
            return { allowed: false, reason: 'weekly_limit', remaining: 0 };
        }
        return { allowed: true, reason: null, remaining: weeklyRemaining };
    }

    if (mode === 'daily' && sessionsPerDay > 0) {
        const dailyRemaining = sessionsPerDay - periodAttendanceCount;
        if (dailyRemaining <= 0) {
            return { allowed: false, reason: 'daily_limit', remaining: 0 };
        }
        return { allowed: true, reason: null, remaining: dailyRemaining };
    }

    // 3. total 모드: 기간 제한 없음
    return { allowed: true, reason: null, remaining: totalCredits };
}

/**
 * Date → 'YYYY-MM-DD' 포맷
 */
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

module.exports = {
    getWeekBoundary,
    getDayBoundary,
    evaluateCreditPolicy,
    formatDate
};
