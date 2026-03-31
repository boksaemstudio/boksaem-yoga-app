/**
 * Color Utilities for Visual Accessibility
 * [Phase 8] Implement Contrast-Aware Color Logic
 */

interface TagColor {
    bg: string;
    text: string;
    border: string;
}

/**
 * Calculates the relative luminance of a hex color.
 * (Based on W3C WCAG algorithm)
 */
export const getLuminance = (hex: string): number => {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    
    const a = [r, g, b].map(v => {
        const val = v / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

/**
 * Returns the best contrasting text color (black or white) for a given background hex.
 */
export const getContrastText = (hex: string): string => {
    if (!hex) return '#ffffff';
    try {
        const luminance = getLuminance(hex);
        return luminance > 0.5 ? '#000000' : '#ffffff';
    } catch {
        return '#ffffff';
    }
};

/**
 * Converts HSL to Hex
 */
export const hslToHex = (h: number, s: number, l: number): string => {
    const lNorm = l / 100;
    const a = s * Math.min(lNorm, 1 - lNorm) / 100;
    const f = (n: number): string => {
        const k = (n + h / 30) % 12;
        const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

/**
 * Determines the color tag for a class based on its title.
 * Colors are synchronized with Firestore SCHEDULE_LEGEND.
 * ⚠️ Order matters: more specific keywords (토요하타) must precede generic ones (하타).
 */
export const getTagColor = (title: string = '', _dateStr: string = '', _instructor: string = ''): TagColor => {
    const lowerTitle = title.toLowerCase();
    
    // ── 하타인텐시브/별도등록 (보라) — must precede 하타 ──
    if (lowerTitle.includes('하타인텐시브') || lowerTitle.includes('별도')) {
        return { bg: 'rgba(224, 86, 253, 0.15)', text: 'rgba(224, 86, 253, 0.9)', border: 'rgba(224, 86, 253, 0.4)' };
    }
    // ── 하타 (파랑) ──
    if (lowerTitle.includes('하타') || lowerTitle.includes('hatha')) {
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' };
    }
    // ── 빈야사 (초록) ──
    if (lowerTitle.includes('빈야사') || lowerTitle.includes('vinyasa')) {
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34D399', border: 'rgba(16, 185, 129, 0.3)' };
    }
    // ── 키즈 단독 (노랑) — '키즈플라잉'도 키즈 색상으로 우선 적용됨 ──
    if (lowerTitle.includes('키즈') || lowerTitle.includes('kids')) {
        return { bg: 'rgba(234, 179, 8, 0.2)', text: '#EAB308', border: 'rgba(234, 179, 8, 0.4)' };
    }
    // ── 심화/플라잉/로우플라잉 (주황) ──
    if (lowerTitle.includes('플라잉') || lowerTitle.includes('flying') || lowerTitle.includes('심화')) {
        return { bg: 'rgba(255, 190, 118, 0.2)', text: 'rgba(255, 190, 118, 1)', border: 'rgba(255, 190, 118, 0.5)' };
    }
    // ── 임산부 (민트) ──
    if (lowerTitle.includes('임산부') || lowerTitle.includes('maternity')) {
        return { bg: 'rgba(196, 252, 239, 0.15)', text: 'rgba(129, 236, 236, 1)', border: 'rgba(129, 236, 236, 0.4)' };
    }
    // ── 특별 (골드) ──
    if (lowerTitle.includes('특별') || lowerTitle.includes('special')) {
        return { bg: 'rgba(var(--primary-rgb), 0.15)', text: 'var(--primary-gold)', border: 'rgba(var(--primary-rgb), 0.3)' };
    }

    // ── 일반/기본 (흰색 계열) ──
    return { bg: 'rgba(255, 255, 255, 0.06)', text: '#E5E7EB', border: 'rgba(255, 255, 255, 0.15)' };
};
