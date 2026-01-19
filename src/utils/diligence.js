import { differenceInDays, subDays, startOfWeek } from 'date-fns';

/**
 * Smart Diligence Analysis Utility
 * 
 * Analyzes member attendance patterns to provide gamified feedback.
 * Differentiates between:
 * 1. Period-based (Unlimited/Month) -> Focus on "Frequency/Consistency"
 * 2. Count-based (Ticket) -> Focus on "Pacing" (Are they using it fast enough?)
 */

// Badge Definitions (Premium Icons)
export const BADGES = {
    PASSION: { id: 'passion', label: '열정 요기', icon: 'Fire', color: '#FF4500', desc: '주 3회 이상 꾸준히 수련중!' },
    STEADY: { id: 'steady', label: '성실 요기', icon: 'Plant', color: '#4CAF50', desc: '규칙적인 수련 흐름을 유지중입니다.' },
    STARTER: { id: 'starter', label: '새싹 요기', icon: 'Leaf', color: '#8BC34A', desc: '요가 여정의 아름다운 시작!' },
    WELCOME_BACK: { id: 'welcome_back', label: '반가운 요기', icon: 'Sparkle', color: '#FFD700', desc: '다시 매트 위에 오신 것을 환영해요!' },
    FLOWING: { id: 'flowing', label: '몰입 요기', icon: 'Waves', color: '#2196F3', desc: '물 흐르듯 자연스러운 수련 페이스!' },
    ON_TRACK: { id: 'on_track', label: '순항 요기', icon: 'Boat', color: '#00BCD4', desc: '등록하신 횟수를 알맞게 사용하고 계십니다.' },
    NEED_BOOST: { id: 'need_boost', label: '응원 필요', icon: 'Barbell', color: '#FF9800', desc: '조금 더 자주 만나요 우리!' }
};

export const analyzeDiligence = (member, history) => {
    if (!member || !history) return null;

    // 1. Determine Membership Strategy
    const isUnlimited = member.membershipType?.includes('unlimited') || member.credits > 100;

    // 2. Filter history for valid analysis window (e.g., last 3 months)
    const now = new Date();
    const threeMonthsAgo = subDays(now, 90);
    const recentLogs = history.filter(log => {
        const d = log.timestamp ? new Date(log.timestamp.seconds * 1000 || log.timestamp) : new Date(log.createdAt);
        return d >= threeMonthsAgo;
    });

    // 3. Calculate "Day Streak" (Classic) - Keep it as a sub-metric
    const streak = calculateConsecutiveDays(history);

    // 4. Main Analysis
    let status = null;

    if (isUnlimited) {
        status = analyzeUnlimitedMember(recentLogs, streak);
    } else {
        status = analyzeTicketMember(recentLogs, member, streak);
    }

    return {
        ...status,
        streak // Include classic streak for legacy support or extra flair
    };
};

// --- Unlimited Member Logic (Frequency is King) ---
const analyzeUnlimitedMember = (logs, streak) => {
    // Calculate Average Weekly Visits over last 4 weeks
    const weeksMap = {};
    const now = new Date();

    logs.forEach(log => {
        const d = log.timestamp ? new Date(log.timestamp.seconds * 1000 || log.timestamp) : new Date(log.createdAt);
        const weekStart = startOfWeek(d, { weekStartsOn: 1 }).toISOString().split('T')[0]; // Monday start
        weeksMap[weekStart] = (weeksMap[weekStart] || 0) + 1;
    });

    const activeWeeks = Object.keys(weeksMap).length;
    const totalVisits = logs.length;
    const weeklyAvg = activeWeeks > 0 ? (totalVisits / 4) : 0; // Rough approx over 4 weeks window if logs are filtered

    // Logic
    if (streak >= 3) {
        return { type: 'streak_fire', badge: BADGES.PASSION, message: `${streak}일 연속 수련! 엄청난 에너지입니다!` };
    }

    // Check "This Week" count
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString().split('T')[0];
    const thisWeekCount = weeksMap[thisWeekStart] || 0;

    if (thisWeekCount >= 3) {
        return { type: 'high_freq', badge: BADGES.PASSION, message: `이번 주 벌써 ${thisWeekCount}회! 뜨거운 열정입니다.` };
    }

    if (weeklyAvg >= 2 || thisWeekCount >= 2) {
        return { type: 'steady', badge: BADGES.STEADY, message: '꾸준함이 돋보이는 수련 흐름입니다.' };
    }

    // Check Recency
    const lastVisit = logs.length > 0 ?
        (logs[0].timestamp ? new Date(logs[0].timestamp.seconds * 1000 || logs[0].timestamp) : new Date(logs[0].createdAt))
        : null;

    if (lastVisit) {
        const daysSinceLast = differenceInDays(now, lastVisit);
        if (daysSinceLast > 14) {
            return { type: 'welcome_back', badge: BADGES.WELCOME_BACK, message: '오랜만의 수련, 정말 반가워요!' };
        }
    }

    if (logs.length < 5) {
        return { type: 'starter', badge: BADGES.STARTER, message: '시작이 반! 꾸준히 함께해요.' };
    }

    return { type: 'normal', badge: BADGES.STEADY, message: '오늘도 매트 위에 선 당신을 응원합니다.' };
};

// --- Ticket Member Logic (Pacing is King) ---
const analyzeTicketMember = (logs, member, streak) => {
    // 1. Calculate Expected Pace
    // If they have a 3-month ticket (approx 90 days) with 10 credits.
    // Ideal pace: 1 class every 9 days.

    // Let's look at actual usage.

    // If we can't determine initial, fallback to simple frequency
    // But let's try to interpret "Diligence" as "Frequency relative to remaining".

    const lastVisit = logs.length > 0 ?
        (logs[0].timestamp ? new Date(logs[0].timestamp.seconds * 1000 || logs[0].timestamp) : new Date(logs[0].createdAt))
        : null;

    if (!lastVisit) {
        return { type: 'starter', badge: BADGES.STARTER, message: '첫 수련을 축하드려요!' };
    }

    const daysSinceLast = differenceInDays(new Date(), lastVisit);

    // Ticket members shouldn't necessarily come every day.
    // Differentiate "Good Pace" vs "Too Slow".

    if (daysSinceLast > 21) {
        return { type: 'need_boost', badge: BADGES.NEED_BOOST, message: '다시 운동 리듬을 찾아보세요! 화이팅!' };
    }

    if (daysSinceLast > 10) {
        return { type: 'welcome_back', badge: BADGES.WELCOME_BACK, message: '다시 오셔서 기뻐요! 꾸준히 이어가봐요.' };
    }

    // High Frequency for Ticket User (Bonus)
    if (streak >= 2) {
        return { type: 'streak', badge: BADGES.FLOWING, message: '연속 수련이라니! 몰입도가 대단하네요.' };
    }

    // Regular healthy pace (within 3~7 days)
    if (daysSinceLast <= 7) {
        return { type: 'on_track', badge: BADGES.ON_TRACK, message: '이상적인 수련 주기를 유지하고 계시네요.' };
    }

    return { type: 'normal', badge: BADGES.STEADY, message: '차곡차곡 쌓이는 수련이 아름답습니다.' };
};

// --- Helpers ---
const calculateConsecutiveDays = (history) => {
    if (!history || history.length === 0) return 0;

    const uniqueDays = [...new Set(history.map(h => {
        const d = h.timestamp ? new Date(h.timestamp.seconds * 1000 || h.timestamp) : new Date(h.createdAt);
        return d.toLocaleDateString('en-CA');
    }))].sort().reverse();

    const today = new Date().toLocaleDateString('en-CA');

    // If today is not in list (e.g. calculating BEFORE check-in for UI), handle separate
    // But usually history includes current check-in if called after.

    let currentStreak = 0;

    // Check if today exists, if so start there. If not, check yesterday.
    let startIndex = 0;
    if (uniqueDays[0] === today) {
        currentStreak = 1;
        startIndex = 1;
    } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (uniqueDays[0] === yesterday.toLocaleDateString('en-CA')) {
            // Streak is alive, but today not yet checked in. 
            // Depending on when we call this function. 
            // If we call it AFTER checkin, today MUST be there.
            // If before, we might say "Current streak: X days" (meaning up to yesterday).
            // Let's assume we want "Active Streak including today if applicable".
            return 0; // Reset if today not found? Or return yesterday's streak?
            // For gamification "Do check in to keep streak!" -> 0 is motivating.
        } else {
            return 0;
        }
    }

    let checkDate = new Date(today);

    for (let i = startIndex; i < uniqueDays.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        if (uniqueDays[i] === checkDate.toLocaleDateString('en-CA')) {
            currentStreak++;
        } else {
            break;
        }
    }
    return currentStreak;
};
