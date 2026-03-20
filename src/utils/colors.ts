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
 */
export const getTagColor = (title: string = '', _dateStr: string = '', _instructor: string = ''): TagColor => {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('하타') || lowerTitle.includes('hatha')) {
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' };
    }
    if (lowerTitle.includes('빈야사') || lowerTitle.includes('vinyasa')) {
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34D399', border: 'rgba(16, 185, 129, 0.3)' };
    }
    if (lowerTitle.includes('특별') || lowerTitle.includes('special')) {
        return { bg: 'rgba(var(--primary-rgb), 0.15)', text: 'var(--primary-gold)', border: 'rgba(var(--primary-rgb), 0.3)' };
    }

    return { bg: 'rgba(156, 163, 175, 0.1)', text: '#9CA3AF', border: 'rgba(156, 163, 175, 0.2)' };
};
