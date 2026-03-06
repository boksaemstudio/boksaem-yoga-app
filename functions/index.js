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
 * memberFunctions (4):
 *   - getSecureMemberV2Call
 *   - memberLoginV2Call
 *   - verifyInstructorV2Call
 *   - checkExpiringMembersV2
 * 
 * attendanceFunctions (2):
 *   - checkInMemberV2Call
 *   - onAttendanceCreated
 *   - onAttendancePhotoAdded
 * 
 * scheduledFunctions (3):
 *   - checkLowCreditsV2
 *   - sendDailyAdminReportV2
 *   - sendScheduledMessages
 * 
 * meditationFunctions (1):
 *   - generateMeditationGuidance
 * 
 * solapiFunctions (3):
 *   - sendMessageOnApproval
 *   - sendSolapiOnMessageV2
 *   - getSolapiBalance
 * 
 * Total: 21 Cloud Functions
 */
