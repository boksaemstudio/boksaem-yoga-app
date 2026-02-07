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

// Import all modules
const pushFunctions = require('./modules/push');
const aiFunctions = require('./modules/ai');
const memberFunctions = require('./modules/member');
const attendanceFunctions = require('./modules/attendance');
const scheduledFunctions = require('./modules/scheduled');
const meditationFunctions = require('./modules/meditation');

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
    ...meditationFunctions
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
