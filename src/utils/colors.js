/**
 * Color Utilities for Visual Accessibility
 * [Phase 8] Implement Contrast-Aware Color Logic
 */

/**
 * Calculates the relative luminance of a hex color.
 * (Based on W3C WCAG algorithm)
 * @param {string} hex - Hex color string (e.g., "#d4af37" or "d4af37")
 * @returns {number} Luminance value (0 to 1)
 */
export const getLuminance = (hex) => {
    let r = 0, g = 0, b = 0;
    
    // Normalize hex
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
    
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

/**
 * Returns the best contrasting text color (black or white) for a given background hex.
 * @param {string} hex - Background hex color
 * @returns {string} "#000000" or "#ffffff"
 */
export const getContrastText = (hex) => {
    if (!hex) return '#ffffff';
    try {
        const luminance = getLuminance(hex);
        // Standard WCAG threshold is 0.179, but for dark themes we prefer 0.5 for mid-range.
        return luminance > 0.5 ? '#000000' : '#ffffff';
    } catch (e) {
        return '#ffffff';
    }
};

/**
 * Converts HSL to Hex (useful if studioConfig uses HSL)
 */
export const hslToHex = (h, s, l) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};
/**
 * Determines the color tag for a class based on its title and the studio's schedule legend.
 * @param {string} title - Class title
 * @param {string} dateStr - Check-in date (for future logic)
 * @param {string} instructor - Instructor name (for future logic)
 * @returns {object} { bg, text, border }
 */
export const getTagColor = (title = '', dateStr = '', instructor = '') => {
    // [STUDIO-AGNOSTIC] Default mapping logic.
    // Ideally this would pull from StudioContext, but as a pure utility, we provide robust defaults.
    const lowerTitle = title.toLowerCase();
    
    // Default mappings (Legacy compatibility)
    if (lowerTitle.includes('하타') || lowerTitle.includes('hatha')) {
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' };
    }
    if (lowerTitle.includes('빈야사') || lowerTitle.includes('vinyasa')) {
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34D399', border: 'rgba(16, 185, 129, 0.3)' };
    }
    if (lowerTitle.includes('특별') || lowerTitle.includes('special')) {
        return { bg: 'rgba(212, 175, 55, 0.15)', text: '#D4AF37', border: 'rgba(212, 175, 55, 0.3)' };
    }

    // Default Fallback
    return { bg: 'rgba(156, 163, 175, 0.1)', text: '#9CA3AF', border: 'rgba(156, 163, 175, 0.2)' };
};
