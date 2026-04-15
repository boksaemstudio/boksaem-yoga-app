const fs = require('fs');
let c = fs.readFileSync('src/components/admin/tabs/MembersTab.jsx', 'utf8');
const lines = c.split('\n');

// 현재 카드 목록에서 중복 찾기
// 제거할 영역: stats-grid 내의 요약 카드 3개
// - 오늘 등록·결제 (짧은 요약) → 하단에 상세 버전 있음
// - AI 이탈 경고 (짧은 요약) → 하단에 상세 버전 있음  
// - 안면 미등록 (짧은 요약) → 하단에 상세 버전 있음

// stats-grid: 활동중인 회원 카드만 남기고 나머지 3개 제거
// 줄 번호 기반으로 정확히 제거

// 1. "오늘 등록 (성장 지표)" 제거 (220~238)
const todayRegStart = lines.findIndex(l => l.includes('{/* 2. 오늘 등록 (성장 지표) */}'));
const todayRegEnd = lines.findIndex((l, i) => i > todayRegStart && l.trim() === '</div>\r' && lines[i-1]?.includes("t('단위_명')") && lines[i-2]?.includes('#10B981'));

// 2. "AI 이탈 (행동 처방)" 제거 (240~272)
const aiChurnStart = lines.findIndex(l => l.includes('{/* 3. AI 이탈 (행동 처방) */}'));
const aiChurnEnd = lines.findIndex((l, i) => i > aiChurnStart && l.trim().startsWith('return null;'));

// 3. "안면 미등록 (기능 활성화)" 요약 제거 (274~292) 
const bioStart = lines.findIndex(l => l.includes('{/* 4. 안면 미등록 (기능 활성화) */}'));
// 292줄의 </div>} 까지
const bioEnd = lines.findIndex((l, i) => i > bioStart && l.trim() === '</div>}\r');

console.log('오늘 등록 요약:', todayRegStart + 1, '~', todayRegEnd + 1);
console.log('AI 이탈 요약:', aiChurnStart + 1, '~', aiChurnEnd + 2);
console.log('안면 미등록 요약:', bioStart + 1, '~', bioEnd + 1);

// 각 영역의 첫 줄과 마지막 줄 확인
if (todayRegStart !== -1) console.log('  오늘 등록 첫줄:', lines[todayRegStart].trim().substring(0, 60));
if (aiChurnStart !== -1) console.log('  AI 이탈 첫줄:', lines[aiChurnStart].trim().substring(0, 60));
if (bioStart !== -1) console.log('  안면 미등록 첫줄:', lines[bioStart].trim().substring(0, 60));

// 제거할 줄 인덱스 수집
const removeLines = new Set();
if (todayRegStart !== -1 && todayRegEnd !== -1) {
    for (let i = todayRegStart; i <= todayRegEnd; i++) removeLines.add(i);
}
if (aiChurnStart !== -1 && aiChurnEnd !== -1) {
    // aiChurnEnd 줄 + 그 다음줄 })() 까지
    for (let i = aiChurnStart; i <= aiChurnEnd + 1; i++) removeLines.add(i);
}
if (bioStart !== -1 && bioEnd !== -1) {
    for (let i = bioStart; i <= bioEnd; i++) removeLines.add(i);
    // 그 다음 빈 줄도 제거
    if (lines[bioEnd + 1]?.trim() === '') removeLines.add(bioEnd + 1);
}

console.log('\n총 제거할 줄:', removeLines.size);

// 필터링
const newLines = lines.filter((_, i) => !removeLines.has(i));
fs.writeFileSync('src/components/admin/tabs/MembersTab.jsx', newLines.join('\n'));

// 빌드 테스트용 div 밸런스 확인
const newContent = newLines.join('\n');
const opens = newContent.split('<div').length - 1;
const closes = newContent.split('</div>').length - 1;
console.log('수정 후 div 밸런스 - 여는:', opens, '닫는:', closes, '차이:', opens - closes);

// 카드 재확인
newLines.forEach((l, i) => {
    if (l.includes('dashboard-card') || l.includes('CollapsibleCard')) {
        console.log(`  ${i+1}: ${l.trim().substring(0, 90)}`);
    }
});
