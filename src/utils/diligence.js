import { differenceInDays, subDays, startOfWeek } from 'date-fns';

/**
 * Smart Diligence Analysis Utility
 * 
 * Analyzes member attendance patterns to provide gamified feedback.
 * Differentiates between:
 * 1. Period-based (Unlimited/Month) -> Focus on "Frequency/Consistency"
 * 2. Count-based (Ticket) -> Focus on "Pacing" (Are they using it fast enough?)
 * 
 * [i18n] All labels/descriptions use key+fallback pattern.
 * t() is passed as a parameter, NOT called at module level.
 */

// Badge Definitions (Premium Icons) — keys only, resolved at render time
export const BADGE_KEYS = {
    PASSION:      { id: 'passion',      icon: 'Fire',    color: '#FF4500', labelKey: 'badge_passion_label',      labelFallback: '열정 요기',    descKey: 'badge_passion_desc',      descFallback: '주 3회 이상 꾸준히 수련중!' },
    STEADY:       { id: 'steady',       icon: 'Plant',   color: '#4CAF50', labelKey: 'badge_steady_label',       labelFallback: '성실 요기',    descKey: 'badge_steady_desc',       descFallback: '규칙적인 수련 흐름을 유지중입니다.' },
    STARTER:      { id: 'starter',      icon: 'Leaf',    color: '#8BC34A', labelKey: 'badge_starter_label',      labelFallback: '새싹 요기',    descKey: 'badge_starter_desc',      descFallback: '요가 여정의 아름다운 시작!' },
    WELCOME_BACK: { id: 'welcome_back', icon: 'Sparkle', color: 'var(--primary-gold)', labelKey: 'badge_welcome_label', labelFallback: '반가운 요기', descKey: 'badge_welcome_desc', descFallback: '다시 매트 위에 오신 것을 환영해요!' },
    FLOWING:      { id: 'flowing',      icon: 'Waves',   color: '#2196F3', labelKey: 'badge_flowing_label',      labelFallback: '몰입 요기',    descKey: 'badge_flowing_desc',      descFallback: '물 흐르듯 자연스러운 수련 페이스!' },
    ON_TRACK:     { id: 'on_track',     icon: 'Boat',    color: '#00BCD4', labelKey: 'badge_ontrack_label',      labelFallback: '순항 요기',    descKey: 'badge_ontrack_desc',      descFallback: '등록하신 횟수를 알맞게 사용하고 계십니다.' },
    NEED_BOOST:   { id: 'need_boost',   icon: 'Barbell', color: '#FF9800', labelKey: 'badge_needboost_label',    labelFallback: '응원 필요',    descKey: 'badge_needboost_desc',    descFallback: '조금 더 자주 만나요 우리!' }
};

/** Resolve a badge key object into a localized badge using t() */
const resolveBadge = (badgeKey, t) => ({
    id: badgeKey.id,
    icon: badgeKey.icon,
    color: badgeKey.color,
    label: t(badgeKey.labelKey) || badgeKey.labelFallback,
    desc: t(badgeKey.descKey) || badgeKey.descFallback
});

/** Legacy compat: export old-style BADGES (Korean defaults, no t needed) */
export const BADGES = Object.fromEntries(
    Object.entries(BADGE_KEYS).map(([key, val]) => [key, {
        id: val.id,
        icon: val.icon,
        color: val.color,
        label: val.labelFallback,
        desc: val.descFallback
    }])
);

/**
 * Main analysis function.
 * @param {Object} member - Member object
 * @param {Array} history - Attendance history logs
 * @param {Function} [t] - Optional translation function. If omitted, Korean fallback is used.
 */
export const analyzeDiligence = (member, history, t) => {
    if (!member || !history) return null;

    // Safe t function
    const _t = t || ((key) => null);

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
        status = analyzeUnlimitedMember(recentLogs, streak, _t);
    } else {
        status = analyzeTicketMember(recentLogs, member, streak, _t);
    }

    return {
        ...status,
        streak // Include classic streak for legacy support or extra flair
    };
};

// --- Unlimited Member Logic (Frequency is King) ---
const analyzeUnlimitedMember = (logs, streak, t) => {
    // Calculate Average Weekly Visits over last 4 weeks
    const weeksMap = {};
    const now = new Date();

    logs.forEach(log => {
        const d = log.timestamp ? new Date(log.timestamp.seconds * 1000 || log.timestamp) : new Date(log.createdAt);
        const weekStart = startOfWeek(d, { weekStartsOn: 1 }).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); // Monday start (KST)
        weeksMap[weekStart] = (weeksMap[weekStart] || 0) + 1;
    });

    const activeWeeks = Object.keys(weeksMap).length;
    const totalVisits = logs.length;
    const weeklyAvg = activeWeeks > 0 ? (totalVisits / 4) : 0;

    // Logic
    if (streak >= 3) {
        return {
            type: 'streak_fire',
            badge: resolveBadge(BADGE_KEYS.PASSION, t),
            message: t('badge_msg_streak_fire') || `${streak} days in a row! Incredible dedication!`,
            messageParams: { streak }
        };
    }

    // Check "This Week" count
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const thisWeekCount = weeksMap[thisWeekStart] || 0;

    if (thisWeekCount >= 3) {
        return {
            type: 'high_freq',
            badge: resolveBadge(BADGE_KEYS.PASSION, t),
            message: t('badge_msg_high_freq') || `${thisWeekCount} sessions this week! You're on fire!`,
            messageParams: { thisWeekCount }
        };
    }

    if (weeklyAvg >= 2 || thisWeekCount >= 2) {
        return {
            type: 'steady',
            badge: resolveBadge(BADGE_KEYS.STEADY, t),
            message: t('badge_msg_steady') || '꾸준함이 돋보이는 수련 흐름입니다.'
        };
    }

    // Check Recency
    const lastVisit = logs.length > 0 ?
        (logs[0].timestamp ? new Date(logs[0].timestamp.seconds * 1000 || logs[0].timestamp) : new Date(logs[0].createdAt))
        : null;

    if (lastVisit) {
        const daysSinceLast = differenceInDays(now, lastVisit);
        if (daysSinceLast > 14) {
            return {
                type: 'welcome_back',
                badge: resolveBadge(BADGE_KEYS.WELCOME_BACK, t),
                message: t('badge_msg_welcome_back') || '오랜만의 수련, 정말 반가워요!'
            };
        }
    }

    if (logs.length < 5) {
        return {
            type: 'starter',
            badge: resolveBadge(BADGE_KEYS.STARTER, t),
            message: t('badge_msg_starter') || '시작이 반! 꾸준히 함께해요.'
        };
    }

    return {
        type: 'normal',
        badge: resolveBadge(BADGE_KEYS.STEADY, t),
        message: t('badge_msg_encourage') || '오늘도 매트 위에 선 당신을 응원합니다.'
    };
};

// --- Ticket Member Logic (Pacing is King) ---
const analyzeTicketMember = (logs, member, streak, t) => {
    const lastVisit = logs.length > 0 ?
        (logs[0].timestamp ? new Date(logs[0].timestamp.seconds * 1000 || logs[0].timestamp) : new Date(logs[0].createdAt))
        : null;

    if (!lastVisit) {
        return {
            type: 'starter',
            badge: resolveBadge(BADGE_KEYS.STARTER, t),
            message: t('badge_msg_first_class') || '첫 수련을 축하드려요!'
        };
    }

    const daysSinceLast = differenceInDays(new Date(), lastVisit);

    if (daysSinceLast > 21) {
        return {
            type: 'need_boost',
            badge: resolveBadge(BADGE_KEYS.NEED_BOOST, t),
            message: t('badge_msg_need_boost') || '다시 운동 리듬을 찾아보세요! 화이팅!'
        };
    }

    if (daysSinceLast > 10) {
        return {
            type: 'welcome_back',
            badge: resolveBadge(BADGE_KEYS.WELCOME_BACK, t),
            message: t('badge_msg_come_back') || '다시 오셔서 기뻐요! 꾸준히 이어가봐요.'
        };
    }

    // High Frequency for Ticket User (Bonus)
    if (streak >= 2) {
        return {
            type: 'streak',
            badge: resolveBadge(BADGE_KEYS.FLOWING, t),
            message: t('badge_msg_flowing') || '연속 수련이라니! 몰입도가 대단하네요.'
        };
    }

    // Regular healthy pace (within 3~7 days)
    if (daysSinceLast <= 7) {
        return {
            type: 'on_track',
            badge: resolveBadge(BADGE_KEYS.ON_TRACK, t),
            message: t('badge_msg_on_track') || '이상적인 수련 주기를 유지하고 계시네요.'
        };
    }

    return {
        type: 'normal',
        badge: resolveBadge(BADGE_KEYS.STEADY, t),
        message: t('badge_msg_beautiful') || '차곡차곡 쌓이는 수련이 아름답습니다.'
    };
};

// --- Helpers ---
const calculateConsecutiveDays = (history) => {
    if (!history || history.length === 0) return 0;

    const uniqueDays = [...new Set(history.map(h => {
        const d = h.timestamp ? new Date(h.timestamp.seconds * 1000 || h.timestamp) : new Date(h.createdAt);
        return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    }))].sort().reverse();

    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

    let currentStreak = 0;

    let startIndex = 0;
    if (uniqueDays[0] === today) {
        currentStreak = 1;
        startIndex = 1;
    } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (uniqueDays[0] === yesterday.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })) {
            return 0;
        } else {
            return 0;
        }
    }

    let checkDate = new Date(today);

    for (let i = startIndex; i < uniqueDays.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        if (uniqueDays[i] === checkDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })) {
            currentStreak++;
        } else {
            break;
        }
    }
    return currentStreak;
};
