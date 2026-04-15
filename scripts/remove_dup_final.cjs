const fs = require('fs');
let lines = fs.readFileSync('src/components/admin/tabs/MembersTab.jsx', 'utf8').split('\n');

// 정확한 줄 번호:
// 219 (빈줄) ~ 293 (빈줄) 제거하고, 
// stats-grid 닫기 </div> + 빈줄로 대체
// 줄 번호는 1-indexed, 배열은 0-indexed

// 219~292 (0-indexed: 218~291) = 74줄을 </div> 1줄로 대체
// 218번 인덱스: 빈줄
// 219~237번: 오늘 등록 요약
// 238~271번: AI 이탈 경고
// 272: 빈줄
// 273~291: 안면 미등록 요약  
// 292: 빈줄

const startRemove = 218; // 0-indexed, 219번 줄 (빈줄)
const endRemove = 292;   // 0-indexed, 293번 줄 (빈줄/공백)

console.log('제거 범위:', startRemove + 1, '~', endRemove + 1);
console.log('  첫줄:', lines[startRemove].trim() || '(빈줄)');
console.log('  마지막줄:', lines[endRemove].trim() || '(빈줄)');

// stats-grid 닫기 추가
const replacement = '                    </div>';
lines.splice(startRemove, endRemove - startRemove + 1, replacement);

const result = lines.join('\n');
fs.writeFileSync('src/components/admin/tabs/MembersTab.jsx', result);

// 빌드 전 검증
const opens = result.split('<div').length - 1;
const closes = result.split('</div>').length - 1;
console.log('\n수정 후:');
console.log('  총 줄 수:', lines.length);
console.log('  div 밸런스 - 여는:', opens, '닫는:', closes, '차이:', opens - closes);
console.log('\n카드 목록:');
result.split('\n').forEach((l, i) => {
    if (l.includes('dashboard-card') && !l.includes('//')) {
        console.log(`  ${i+1}: ${l.trim().substring(0, 80)}`);
    }
});
