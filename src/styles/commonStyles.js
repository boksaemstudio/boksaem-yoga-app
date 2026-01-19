/**
 * Common style objects used across the application
 * 애플리케이션 전체에서 재사용되는 공통 스타일 객체
 */

// Button Styles
export const buttonStyles = {
    primary: {
        backgroundColor: 'var(--primary-gold)',
        color: '#1a1a1a',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)'
    },

    secondary: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    },

    danger: {
        backgroundColor: 'rgba(255, 82, 82, 0.15)',
        color: '#FF5252',
        border: '1px solid rgba(255, 82, 82, 0.3)',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    },

    small: {
        padding: '6px 12px',
        fontSize: '0.875rem'
    }
};

// Input Styles
export const inputStyles = {
    base: {
        width: '100%',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-input)',
        color: 'var(--text-primary)',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.2s ease'
    },

    focused: {
        borderColor: 'var(--primary-gold)'
    },

    error: {
        borderColor: '#FF5252'
    }
};

// Card Styles
export const cardStyles = {
    base: {
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    },

    elevated: {
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        padding: '20px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
    },

    interactive: {
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        padding: '20px',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }
};

// Modal Styles
export const modalStyles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
    },

    content: {
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid var(--border-color)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }
};

// Text Styles
export const textStyles = {
    heading1: {
        fontSize: '2rem',
        fontWeight: '700',
        color: 'var(--text-primary)',
        margin: '0 0 16px 0'
    },

    heading2: {
        fontSize: '1.5rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
        margin: '0 0 12px 0'
    },

    heading3: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
        margin: '0 0 8px 0'
    },

    body: {
        fontSize: '1rem',
        color: 'var(--text-primary)',
        lineHeight: '1.5'
    },

    bodySecondary: {
        fontSize: '1rem',
        color: 'var(--text-secondary)',
        lineHeight: '1.5'
    },

    small: {
        fontSize: '0.875rem',
        color: 'var(--text-secondary)'
    }
};

// Badge Styles
export const badgeStyles = {
    default: {
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '0.875rem',
        fontWeight: '500',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: 'var(--text-primary)'
    },

    success: {
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '0.875rem',
        fontWeight: '500',
        backgroundColor: 'rgba(46, 213, 115, 0.2)',
        color: '#2ed573'
    },

    warning: {
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '0.875rem',
        fontWeight: '500',
        backgroundColor: 'rgba(255, 165, 2, 0.2)',
        color: '#ffa502'
    },

    danger: {
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '0.875rem',
        fontWeight: '500',
        backgroundColor: 'rgba(255, 82, 82, 0.2)',
        color: '#FF5252'
    }
};

// Layout Styles
export const layoutStyles = {
    flexCenter: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    },

    flexBetween: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },

    flexColumn: {
        display: 'flex',
        flexDirection: 'column'
    },

    grid2Col: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px'
    },

    grid3Col: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px'
    }
};

/**
 * Merge multiple style objects
 * @param  {...Object} styles - Style objects to merge
 * @returns {Object} Merged style object
 */
export const mergeStyles = (...styles) => {
    return Object.assign({}, ...styles);
};
