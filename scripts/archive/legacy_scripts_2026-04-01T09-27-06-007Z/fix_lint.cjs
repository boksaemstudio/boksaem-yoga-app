const fs = require('fs');
const path = require('path');

const schedFile = path.join(__dirname, '../src/services/scheduleService.js');
let content = fs.readFileSync(schedFile, 'utf8');

// Fix scheduleService.js syntax
content = content.replace(/import \{\r?\nimport \{ tenantDb \} from '\.\.\/utils\/tenantDb';/g, "import { tenantDb } from '../utils/tenantDb';\nimport {");
fs.writeFileSync(schedFile, content, 'utf8');
console.log('Fixed scheduleService.js imports.');

const storageFile = path.join(__dirname, '../src/services/storage.js');
let storageContent = fs.readFileSync(storageFile, 'utf8');
const lines = storageContent.split(/\r?\n/);

// We need to delete duplicate lines from 1190 to end. 
// Or better, just comment out the aliases near the top (which are 1-liners) to let the bottom remain.
// Let's just comment out the 1-liner aliases at the top explicitly.
const removePatterns = [
  "getImages() { return cachedImages; },",
  "getSales() { return paymentService.getSales(); },",
  "getRevenueStats() { return paymentService.getRevenueStats(); },",
  "getAllSales() { return paymentService.getAllSales(); },",
  "getSalesHistory(memberId) { return paymentService.getSalesHistory(memberId); },",
  "updateSalesRecord(salesId, updates) { return paymentService.updateSalesRecord(salesId, updates); },",
  "deleteSalesRecord(salesId) { return paymentService.deleteSalesRecord(salesId); },",
  "getAttendance() { return attendanceService.getAttendance(); },",
  "getAttendanceByMemberId(memberId) { return attendanceService.getAttendanceByMemberId(memberId); },",
  "getAttendanceByDate(dateStr, branchId = null) { return attendanceService.getAttendanceByDate(dateStr, branchId); },",
  "subscribeAttendance(dateStr, branchId = null, callback) { return attendanceService.subscribeAttendance(dateStr, branchId, callback); },",
  "deleteAttendance(logId, restoreCredit) { return attendanceService.deleteAttendance(logId, restoreCredit); },",
  "clearAllAttendance() { return attendanceService.clearAllAttendance(); }",
  "getNotices() { return cachedNotices; }",
  "subscribeToPushHistory(callback, limitCount = 50) {"
];

let modifiedLines = [];
let skipPushHistory = false;
let pushHistoryCount = 0;

for (let i = 0; i < lines.length; i++) {
   const line = lines[i];
   let shouldComment = false;
   
   if (skipPushHistory) {
     modifiedLines.push('// ' + line);
     if (line.includes('}')) skipPushHistory = false;
     continue;
   }

   for (const pat of removePatterns) {
      if (line.includes(pat)) {
         if (pat === "subscribeToPushHistory(callback, limitCount = 50) {") {
            pushHistoryCount++;
            if (pushHistoryCount === 2) { // There are two, comment the second one
                skipPushHistory = true;
                shouldComment = true;
            }
         } else if (line.trim().length === pat.length || line.trim().startsWith(pat.split('(')[0])) {
             shouldComment = true;
         }
      }
   }
   
   if (line.includes("loadNotices() {") && !line.includes("async")) {
       shouldComment = true; // wait, loadNotices is missing? let's just ignore it unless exact match
   }
   if (line.includes("async loadNotices() {")) {
       // Only keep one loadNotices
       if (!storageContent._seenLoad) storageContent._seenLoad = true;
       else shouldComment = true;
   }

   if (shouldComment) {
       modifiedLines.push('// Duplicate removed: ' + line);
   } else {
       modifiedLines.push(line);
   }
}

fs.writeFileSync(storageFile, modifiedLines.join('\n'), 'utf8');
console.log('Fixed storage.js duplicates.');
