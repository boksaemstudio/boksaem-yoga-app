const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'home.html');
let html = fs.readFileSync(file, 'utf8');

// 1. 인포데스크 없는 출석 — 말 줄이기
const old1 = '태블릿 하나만 두세요.<br>비밀번호나 얼굴 인식만으로 회원이 직접 출석하고 들어갑니다.';
const new1 = '태블릿 하나면 끝. 얼굴 인식이나 비밀번호로 즉시 출석.';

// 2. 퇴근길 1분 결산 — 말 줄이기
const old2 = '오늘 누가 왔고, 결제는 얼마가 일어났는지.<br>모바일로 딱 필요한 통계만 깔끔하게 보여드립니다.';
const new2 = '오늘 출석·매출을 모바일에서 한눈에.';

// 3. 히어로 배경 어둡게 — opacity 0.4 → 0.25
const old3 = 'opacity: 0.4;';
const new3 = 'opacity: 0.25;';

let count = 0;

if (html.includes(old1)) { html = html.replace(old1, new1); console.log('✅ 인포데스크 문구 간결화'); count++; }
else console.log('⚠️ 인포데스크 문구 못 찾음');

if (html.includes(old2)) { html = html.replace(old2, new2); console.log('✅ 퇴근길 결산 문구 간결화'); count++; }
else console.log('⚠️ 퇴근길 결산 문구 못 찾음');

if (html.includes(old3)) { html = html.replace(old3, new3); console.log('✅ 히어로 배경 더 어둡게 (0.4 → 0.25)'); count++; }
else console.log('⚠️ opacity 값 못 찾음');

fs.writeFileSync(file, html, 'utf8');
console.log(`\n완료: ${count}건 수정`);
