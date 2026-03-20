/**
 * Attendance Helpers — 공통 유틸리티
 * 체크인/오프라인/이벤트 모듈에서 공유
 */

const calculateGap = (lastDate, currentDate) => {
    if (!lastDate) return 999;
    const last = new Date(lastDate);
    const current = new Date(currentDate);
    return Math.floor((current - last) / (1000 * 60 * 60 * 24));
};

const calculateStreak = (records, currentDate) => {
    if (!records || records.length === 0) return 1;
    const uniqueDates = Array.from(new Set(records.map(r => r.date).filter(Boolean)));
    const dates = uniqueDates.sort().reverse();
    let streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
        const gap = calculateGap(dates[i + 1], dates[i]);
        if (gap === 1) streak++;
        else break;
    }
    return streak;
};

const getTimeBand = (timestamp) => {
    const kstHour = new Date(new Date(timestamp).getTime() + 9 * 60 * 60 * 1000).getUTCHours();
    if (kstHour < 9) return 'early';
    if (kstHour < 12) return 'morning';
    if (kstHour < 15) return 'afternoon';
    if (kstHour < 18) return 'evening';
    return 'night';
};

const getMostCommon = (arr) => {
    if (!arr || arr.length === 0) return null;
    const counts = {};
    arr.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

const generateEventMessage = (eventType, context) => {
    const messages = {
        'FLOW_MAINTAINED': '꾸준한 수련이 이어지고 있어요!',
        'GAP_DETECTED': '다시 돌아오셔서 반가워요!',
        'FLOW_RESUMED': '오랜만에 오셨네요. 환영합니다!',
        'PATTERN_SHIFTED': `수련 시간대가 ${context.shiftDetails}로 변경되었네요.`,
        'MILESTONE': `${context.milestone}회 출석 달성! 축하드려요!`
    };
    return messages[eventType] || '오늘도 수련을 위해 오셨군요!';
};

module.exports = { calculateGap, calculateStreak, getTimeBand, getMostCommon, generateEventMessage };
