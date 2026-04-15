const fs = require('fs');
let lines = fs.readFileSync('src/components/admin/tabs/MembersTab.jsx', 'utf8').split('\n');

// 원본에서 stats-grid의 구조:
// 197: <div className="stats-grid">  (열기)
// 201-218: 활동중인 회원 카드 (유지)
// 219: 빈줄
// 220-238: 오늘 등록 카드 (삭제) 
// 239: 빈줄
// 240-272: AI 이탈 경고 (삭제)
// 273: 빈줄
// 274-292: 안면 미등록 (삭제)
// 293: 빈줄/공백
// ※ stats-grid는 명시적 닫기 없음 → 닫기 추가하지 말 것!

// 0-indexed: 219~292 (74줄) 삭제, 닫기 태그 추가 안함
const startIdx = 219; // 0-indexed → 220번째 줄
const endIdx = 292;   // 0-indexed → 293번째 줄

// 대체: stats-grid 닫기 </div>만 넣기 (같은 들여쓰기 수준)
const replacement = '            </div>'; // stats-grid 닫기

console.log('삭제 범위 (1-based):', startIdx + 1, '~', endIdx + 1);
console.log('삭제 줄 수:', endIdx - startIdx + 1);

lines.splice(startIdx, endIdx - startIdx + 1, replacement);

const result = lines.join('\n');
fs.writeFileSync('src/components/admin/tabs/MembersTab.jsx', result);
console.log('✅ 저장 완료, 총', lines.length, '줄');
