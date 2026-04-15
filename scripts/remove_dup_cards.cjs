const fs = require('fs');
let c = fs.readFileSync('src/components/admin/tabs/MembersTab.jsx', 'utf8');

// 1. stats-grid 내 안면 미등록 요약 카드 제거 (상세 카드가 별도로 있으므로 중복)
const bioSummaryStart = '{/* 4. 안면 미등록 (기능 활성화) */}';
const bioSummaryEnd = '</div>}\r\n                    \r\n';

const startIdx = c.indexOf(bioSummaryStart);
if (startIdx === -1) {
    console.log('안면 미등록 요약 카드를 찾지 못했습니다. 이미 제거되었을 수 있습니다.');
} else {
    const endIdx = c.indexOf(bioSummaryEnd, startIdx);
    if (endIdx !== -1) {
        const removed = c.substring(startIdx, endIdx + bioSummaryEnd.length);
        c = c.substring(0, startIdx) + '</div>\n' + c.substring(endIdx + bioSummaryEnd.length);
        console.log('✅ 안면 미등록 요약 카드 제거 완료');
        console.log('제거된 코드 (첫 80자):', removed.substring(0, 80));
    }
}

// 카드 목록 재확인
const lines = c.split('\n');
console.log('\n현재 dashboard-card 목록:');
lines.forEach((l, i) => {
    if (l.includes('dashboard-card') || l.includes('CollapsibleCard')) {
        console.log(`  ${i+1}: ${l.trim().substring(0, 90)}`);
    }
});

fs.writeFileSync('src/components/admin/tabs/MembersTab.jsx', c);
