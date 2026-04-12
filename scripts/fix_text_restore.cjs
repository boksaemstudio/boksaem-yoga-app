const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'public', 'home.html');
let html = fs.readFileSync(file, 'utf8');
let count = 0;

// 1. 인포데스크 — 현재 → 15%만 줄인 자연스러운 버전
const old1 = '태블릿 하나면 끝. 얼굴 인식이나 비밀번호로 즉시 출석.';
const new1 = '태블릿 하나만 두세요.<br>얼굴 인식이나 비밀번호로 바로 출석 완료.';
if (html.includes(old1)) { html = html.replace(old1, new1); count++; console.log('✅ 인포데스크 복원+간결화'); }

// 2. 퇴근길 — 현재 → 15%만 줄인 자연스러운 버전
const old2 = '오늘 출석·매출을 모바일에서 한눈에.';
const new2 = '오늘 누가 왔고, 매출은 얼마인지.<br>모바일로 깔끔하게 보여드립니다.';
if (html.includes(old2)) { html = html.replace(old2, new2); count++; console.log('✅ 퇴근길 결산 복원+간결화'); }

// 3. 수강권 — 현재 → 15%만 줄인 자연스러운 버전
const old3 = '출석 즉시 횟수 차감, 노쇼 자동 처리, 예약도 터치 한 번.';
const new3 = '출석 즉시 잔여 횟수 차감, 만료일 자동 체크.<br>노쇼 처리부터 추가 예약까지 터치 한 번이면 끝.';
if (html.includes(old3)) { html = html.replace(old3, new3); count++; console.log('✅ 수강권 복원+간결화'); }

fs.writeFileSync(file, html, 'utf8');
console.log(`\n완료: ${count}건`);
