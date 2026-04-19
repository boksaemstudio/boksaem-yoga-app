/**
 * Credit Policy Utilities (Frontend)
 * 주간/일간/총합 크레딧 정책 계산 유틸리티
 */

export interface CreditRules {
    mode: 'total' | 'weekly' | 'daily';
    weeklyResetDay: number; // 0=Sun, 1=Mon, ..., 6=Sat
    allowCarryOver: boolean;
    weeklyLimitSource: 'plan' | 'member';
}

export const DEFAULT_CREDIT_RULES: CreditRules = {
    mode: 'total',
    weeklyResetDay: 1,
    allowCarryOver: false,
    weeklyLimitSource: 'plan',
};

/**
 * 주어진 날짜가 속한 주의 시작일과 종료일을 계산
 */
export function getWeekBoundary(dateStr: string, resetDay: number = 1): { weekStart: string; weekEnd: string } {
    const date = new Date(dateStr + 'T00:00:00+09:00');
    const dayOfWeek = date.getDay();

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
 * 크레딧 정책에 따른 기간 제한 초과 여부 체크
 */
export function evaluateCreditPolicy(params: {
    mode: string;
    sessionsPerWeek: number;
    sessionsPerDay?: number;
    periodAttendanceCount: number;
    totalCredits: number;
}): { allowed: boolean; reason: string | null; remaining: number } {
    const { mode, sessionsPerWeek, sessionsPerDay = 0, periodAttendanceCount, totalCredits } = params;

    if (totalCredits <= 0) {
        return { allowed: false, reason: 'no_credits', remaining: 0 };
    }

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

    return { allowed: true, reason: null, remaining: totalCredits };
}

/**
 * 주간 잔여 횟수 표시 텍스트 생성
 */
export function getWeeklyRemainingText(sessionsPerWeek: number, weeklyUsed: number): string {
    if (sessionsPerWeek <= 0) return '';
    const remaining = Math.max(0, sessionsPerWeek - weeklyUsed);
    return `This week ${remaining}/${sessionsPerWeek} remaining`;
}

function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
