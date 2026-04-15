const classUtils = require('./src/utils/classUtils');
const ts = { _seconds: 1776141000, _nanoseconds: 0 }; // 2026-04-14T04:30:00Z = 13:30 KST
const log = {
  id: '4g6jV5tT50gWXxXGARfK',
  memberId: 'DB9wQU25SGNPTlX1ekwq',
  memberName: '허향무',
  className: '마이솔',
  method: 'manual',
  branchId: 'gwangheungchang',
  status: 'valid',
  note: '관리자 수동 등록 (2026-04-14 광흥창 오후1:30 마이솔 희정선생님)',
  instructor: '희정',
  timestamp: { toDate: () => new Date(ts._seconds * 1000) }
};

const info = classUtils.guessClassInfo(log);
console.log('guessClassInfo Result:', info);
console.log('classTime:', info?.startTime || '00:00');
console.log('key:', `${info?.className || log.className}-${info?.instructor || log.instructor}-${log.branchId}-${info?.startTime || '00:00'}`);
