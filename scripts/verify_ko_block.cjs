const fs = require('fs');
const c = fs.readFileSync('src/utils/translations.js', 'utf8');

// ko 블록 정확한 범위 확인
const koStart = c.indexOf('ko:');
const enStart = c.indexOf('\n    en:');
const koBlock = c.substring(koStart, enStart);

// navAttendance가 ko 블록 내에 있는지 확인
const inKo = koBlock.includes('"navAttendance"');
const inEn = c.substring(enStart).includes('"navAttendance"');
console.log('navAttendance in ko block:', inKo);
console.log('navAttendance in en block:', inEn);

// ko 블록 시작 부분 100자 확인
console.log('\nko block starts at index:', koStart);
console.log('ko block 첫 300자:', koBlock.substring(0, 300));

// navAttendance 키의 정확한 위치
const navIdx = c.indexOf('"navAttendance"');
console.log('\nnavAttendance 첫 등장 위치:', navIdx);
console.log('ko블록 끝 위치:', koStart + koBlock.length);
console.log('en블록 시작 위치:', enStart);
console.log('navAttendance는 ko 안?', navIdx > koStart && navIdx < enStart);

// 모든 nav키가 ko 안에 있는지
['navAttendance','navMembers','navRevenue','navSchedule','navSettings','navTrash'].forEach(k => {
    const idx = c.indexOf('"' + k + '"');
    const isInKo = idx > koStart && idx < enStart;
    console.log(`  ${k}: idx=${idx}, inKo=${isInKo}`);
});
