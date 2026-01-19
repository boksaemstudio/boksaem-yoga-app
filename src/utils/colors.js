export const CLASS_COLORS = {
    '일반': { bg: 'rgba(255, 255, 255, 1)', text: '#000000', border: 'rgba(220, 220, 220, 1)' },
    '심화': { bg: 'rgba(255, 190, 118, 0.9)', text: '#2d3436', border: 'rgba(255, 190, 118, 1)' }, // Apricot/Orange
    '플라잉': { bg: 'rgba(255, 190, 118, 0.9)', text: '#2d3436', border: 'rgba(255, 190, 118, 1)' }, // Apricot/Orange
    '키즈플라잉': { bg: 'rgba(255, 234, 167, 0.4)', text: '#FFFFFF', border: 'rgba(255, 234, 167, 0.6)' }, // Kids
    '임산부요가': { bg: 'rgba(196, 252, 239, 0.9)', text: '#2d3436', border: 'rgba(129, 236, 236, 1)' }, // Mint Green (Matches Legend)
    '하타인텐시브': { bg: 'rgba(224, 86, 253, 0.7)', text: '#FFFFFF', border: 'rgba(224, 86, 253, 0.9)' }, // Purple (Bright/Magenta)
    '토요하타심화': { bg: 'rgba(224, 86, 253, 0.7)', text: '#FFFFFF', border: 'rgba(224, 86, 253, 0.9)' }, // Purple (Bright/Magenta to match Legend)cial)
    'default': { bg: 'rgba(255, 255, 255, 0.1)', text: '#FFFFFF', border: 'rgba(255, 255, 255, 0.2)' }
};

export const getTagColor = (title, date, instructor) => {
    if (!title) return CLASS_COLORS.default;
    const t = title.toLowerCase();
    const inst = instructor ? instructor.toLowerCase() : '';

    // 1. Pregnant (Green)
    if (t.includes('임산부') || t.includes('임신부')) return CLASS_COLORS['임산부요가'];

    // 2. Special Hatha Intensive (Purple) - e.g. Saturday or Separate Registration
    // Robust Saturday check: manually parse 'YYYY-MM-DD' to avoid timezone issues/UTC offsets
    let isSaturday = false;
    if (date && typeof date === 'string' && date.includes('-')) {
        const [y, m, d] = date.split('-').map(Number);
        const localDate = new Date(y, m - 1, d);
        if (localDate.getDay() === 6) isSaturday = true;
    } else if (date instanceof Date) {
        if (date.getDay() === 6) isSaturday = true;
    }

    // Check by Title keywords, Instructor (Heeyeon), or Saturday + Intensive
    if (t.includes('토요') || t.includes('별도등록') || inst.includes('희연')) {
        return CLASS_COLORS['토요하타심화'];
    }
    // If it's Hatha Intensive on a Saturday, treating it as the special class
    if (isSaturday && (t.includes('하타인텐시브') || t.includes('하타 인텐시브'))) {
        return CLASS_COLORS['토요하타심화'];
    }

    // 3. TTC / Education (Dark Grey)
    if (t.includes('ttc') || t.includes('교육')) {
        return { bg: 'rgba(50, 50, 50, 0.9)', text: '#FFFFFF', border: 'rgba(50, 50, 50, 1)' };
    }

    // 4. Kids Flying (Yellow)
    if (t.includes('키즈')) {
        return CLASS_COLORS['키즈플라잉'];
    }

    // 5. Simhwa / Intensive / Flying (Orange)
    if (t.includes('플라잉') || t.includes('마이솔') || t.includes('심화') || t.includes('하타인텐시브') || t.includes('하타 인텐시브')) {
        if (t.includes('로우플라잉')) return CLASS_COLORS['일반']; // Low Flying usually considered General unless specified otherwise
        return CLASS_COLORS['심화'];
    }

    // 6. General (White)
    return CLASS_COLORS['일반'];
};

export const getMembershipColor = (type) => {
    switch (type) {
        case 'general': return CLASS_COLORS['일반'];
        case 'intensive': return CLASS_COLORS['심화'];
        case 'pregnancy': return CLASS_COLORS['임산부요가'];
        case 'kids': return CLASS_COLORS['키즈플라잉'];
        case 'sat_hatha': return CLASS_COLORS['토요하타심화'];
        default: return CLASS_COLORS.default;
    }
};
