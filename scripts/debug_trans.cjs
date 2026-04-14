const fs = require('fs');
const content = fs.readFileSync('src/utils/translations.js', 'utf8');

// 직접 "명": "number of people" 패턴 검색
const testPairs = [
    ['명', 'number of people'],
    ['건', 'case'],
    ['총 출석 완료', 'Total attendance completed'],
    ['삭제된 항목이 없습니다', 'No items were deleted'],
    ['소식 및 공지 관리', 'News and notice management'],
];

testPairs.forEach(([ko, en]) => {
    const pattern = '"' + ko + '": "' + en + '"';
    const idx = content.indexOf(pattern);
    if (idx !== -1) {
        // 해당 위치가 ko: {} 블록인지 en: {} 블록인지 확인
        // ko: { 의 위치와 en: { 의 위치 비교
        const koPos = content.indexOf('ko:');
        const enPos = content.indexOf('en:');
        const isInKo = koPos < idx && (enPos === -1 || idx < enPos);
        console.log(ko + ' → ' + en + ' : ' + (isInKo ? 'IN KO BLOCK ❌' : 'IN EN BLOCK ✅'));
    } else {
        console.log(ko + ' → ' + en + ' : NOT FOUND');
    }
});

// ko 블록과 en 블록의 위치 확인
const koMatch = content.match(/\n\s*ko\s*:\s*\{/);
const enMatch = content.match(/\n\s*en\s*:\s*\{/);
console.log('\nko block at position:', koMatch ? content.indexOf(koMatch[0]) : 'NOT FOUND');
console.log('en block at position:', enMatch ? content.indexOf(enMatch[0]) : 'NOT FOUND');

// 파일 구조 확인 (첫 100자, ko 블록 시작, en 블록 시작)
console.log('\nFile starts with:', content.substring(0, 80));
