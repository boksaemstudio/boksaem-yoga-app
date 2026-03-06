/**
 * Check-In System Configuration
 * 
 * [POETIC] All the heartbeats and rhythms of our studio,
 * captured in constants that define our flow.
 */

export const CHECKIN_CONFIG = {
    // [TIME] Rhythms of Attendance
    TIMEOUTS: {
        SUCCESS_MODAL: 12000,
        DUPLICATE_CHECK: 600000,
        AUTO_CLOSE_MODAL: 30000,
        KEYPAD_REENABLE: 350
    },

    // [SERVICE] Business Boundaries
    SERVICE_HOURS: {
        AI_READY_START: 7,
        AI_READY_END: 23
    },

    // [ASSETS] Visual Identity
    ASSETS: {
        QR_CODE_BASE_URL: 'https://api.qrserver.com/v1/create-qr-code/',
        QR_CODE_PARAMS: 'size=150x150&bgcolor=ffffff&color=2c2c2c&margin=10'
    },

    // [LOCALE] Heartbeat of Language
    LOCALE: 'ko'
};
