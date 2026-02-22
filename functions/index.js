/**
 * Cloud Functions for My Yoga (나의요가)
 * Entry Point - Modular Architecture
 * 
 * Uses firebase-functions v2 API with firebase-admin v13
 * 
 * @module index
 * [Refactor] Modularized - delegating to separate modules
 */

const { setGlobalOptions } = require("firebase-functions/v2");

// Set Global Options immediately
setGlobalOptions({ region: "asia-northeast3" });

// [URGENT DATA FIX] Polyfill for sv-SE date format
// Ensures that "YYYY-MM-DD" expectations never break even if Node environment locales change.
const originalToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function(locale, options) {
    if (locale === 'sv-SE') {
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Seoul',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            const parts = formatter.formatToParts(this);
            const y = parts.find(p => p.type === 'year')?.value;
            const m = parts.find(p => p.type === 'month')?.value;
            const d = parts.find(p => p.type === 'day')?.value;
            if (y && m && d) return `${y}-${m}-${d}`;
        } catch (e) {
            console.warn("Date polyfill error:", e);
        }
    }
    return originalToLocaleDateString.call(this, locale, options);
};

// Import all modules
const pushFunctions = require('./modules/push');
const aiFunctions = require('./modules/ai');
const memberFunctions = require('./modules/member');
const attendanceFunctions = require('./modules/attendance');
const scheduledFunctions = require('./modules/scheduled');
const meditationFunctions = require('./modules/meditation');
const solapiFunctions = require('./modules/solapi');

// Re-export all functions
module.exports = {
    // Push Notification Functions
    ...pushFunctions,
    
    // AI Generation Functions
    ...aiFunctions,
    
    // Member Functions
    ...memberFunctions,
    
    // Attendance Functions
    ...attendanceFunctions,
    
    // Scheduled Jobs
    ...scheduledFunctions,
    
    // Meditation AI Functions
    ...meditationFunctions,

    // Solapi Message Functions
    ...solapiFunctions
};

/**
 * Module Summary:
 * 
 * pushFunctions (4):
 *   - sendPushOnMessageV2
 *   - sendBulkPushV2
 *   - sendPushOnNoticeV2
 *   - cleanupGhostTokens
 * 
 * aiFunctions (3):
 *   - generatePageExperienceV2
 *   - translateNoticesV2
 *   - generateDailyYogaV2
 * 
 * memberFunctions (2):
 *   - getSecureMemberV2Call
 *   - checkExpiringMembersV2
 * 
 * attendanceFunctions (2):
 *   - checkInMemberV2Call
 *   - onAttendanceCreated
 * 
 * scheduledFunctions (2):
 *   - checkLowCreditsV2
 *   - sendDailyAdminReportV2
 * 
 * meditationFunctions (1):
 *   - generateMeditationGuidance
 * 
 * Total: 14 Cloud Functions
 */
