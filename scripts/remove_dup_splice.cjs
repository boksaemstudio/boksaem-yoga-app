const fs = require('fs');
let lines = fs.readFileSync('src/components/admin/tabs/MembersTab.jsx', 'utf8').split('\n');

// 원본 줄 219~292(0-indexed: 218~291) 삭제 - 닫기 태그 추가 안함!
// 3개 카드(오늘 등록, AI 이탈, 안면 미등록) 제거
// 이 카드들은 stats-grid 안에서 자체 완결되므로 추가 태그 불필요

const start = 219; // 0-indexed, = 220번줄 (오늘 등록 시작 직전 빈줄)
const end = 292;   // 0-indexed, = 293번줄 (마지막 빈줄)

console.log('삭제: 줄', start+1, '~', end+1, '(', end-start+1, '줄)');

// 삭제만, 대체 없음 
lines.splice(start, end - start + 1);

const result = lines.join('\n');
fs.writeFileSync('src/components/admin/tabs/MembersTab.jsx', result);
console.log('✅ 저장 완료,', lines.length, '줄');
