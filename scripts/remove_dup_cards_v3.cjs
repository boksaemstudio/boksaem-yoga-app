const fs = require('fs');
let c = fs.readFileSync('src/components/admin/tabs/MembersTab.jsx', 'utf8');

// 방법: 텍스트 블록 기반 검색/제거
// 1. "오늘 등록 (성장 지표)" 요약 제거
const marker1 = '{/* 2. 오늘 등록 (성장 지표) */}';
const end1 = "todayRegistration}{t('단위_명')";
let idx1 = c.indexOf(marker1);
if (idx1 !== -1) {
    // marker1 앞의 줄바꿈+공백부터 시작
    const lineStart1 = c.lastIndexOf('\n', idx1);
    // end1 이후 </div>\r\n 까지
    const endIdx1 = c.indexOf(end1, idx1);
    const closeDiv1 = c.indexOf('</div>', endIdx1);
    const lineEnd1 = c.indexOf('\n', closeDiv1 + 6) + 1;
    console.log('오늘 등록 제거:', idx1, '→', lineEnd1);
    c = c.substring(0, lineStart1) + '\n' + c.substring(lineEnd1);
}

// 2. "안면 미등록 (기능 활성화)" 요약 제거  
const marker3 = '{/* 4. 안면 미등록 (기능 활성화) */}';
const end3 = '</div>}';
let idx3 = c.indexOf(marker3);
if (idx3 !== -1) {
    const lineStart3 = c.lastIndexOf('\n', idx3);
    const endIdx3 = c.indexOf(end3, idx3);
    const lineEnd3 = c.indexOf('\n', endIdx3 + end3.length) + 1;
    console.log('안면 미등록 제거:', idx3, '→', lineEnd3);
    c = c.substring(0, lineStart3) + '\n' + c.substring(lineEnd3);
}

fs.writeFileSync('src/components/admin/tabs/MembersTab.jsx', c);

// 빌드 테스트
const opens = c.split('<div').length - 1;
const closes = c.split('</div>').length - 1;
console.log('div밸런스 - 여는:', opens, '닫는:', closes, '차이:', opens - closes);

// 카드 확인
c.split('\n').forEach((l, i) => {
    if (l.includes('dashboard-card') && !l.includes('//')) {
        console.log(`  ${i+1}: ${l.trim().substring(0, 80)}`);
    }
});
