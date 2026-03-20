/**
 * Attendance Module — Re-export Hub
 * 
 * [DRY Refactor] 비즈니스 로직은 coreLogic.js에 집중.
 * 
 * attendance/
 * ├── coreLogic.js — 비즈니스 로직 단일 심장 (SSoT)
 * ├── helpers.js   — 공통 유틸 (calculateStreak, getTimeBand 등)
 * ├── checkin.js   — checkInMemberV2Call (키오스크 → coreLogic 위임)
 * ├── manual.js    — adminAddAttendanceCall (관리자 수동 → coreLogic 위임)
 * ├── events.js    — onAttendanceCreated (분석 이벤트, 강사 푸시)
 * ├── offline.js   — onPendingAttendanceCreated (오프라인 → coreLogic 위임)
 * └── photos.js    — onAttendancePhotoAdded (사진 푸시)
 */

const { checkInMemberV2Call } = require('./attendance/checkin');
const { adminAddAttendanceCall } = require('./attendance/manual');
const { onAttendanceCreated } = require('./attendance/events');
const { onPendingAttendanceCreated } = require('./attendance/offline');
const { onAttendancePhotoAdded } = require('./attendance/photos');

module.exports = {
    checkInMemberV2Call,
    adminAddAttendanceCall,
    onAttendanceCreated,
    onPendingAttendanceCreated,
    onAttendancePhotoAdded
};
