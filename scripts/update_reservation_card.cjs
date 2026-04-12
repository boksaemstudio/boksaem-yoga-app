const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'home.html');
let html = fs.readFileSync(file, 'utf8');

const oldText = '칼같은 수강권 차감</h3>';
const newText = '칼같은 수강권 차감 & 예약 관리</h3>';

const oldDesc = '출석하는 즉시 잔여 횟수가 줄어들고 만료일이 체크됩니다.<br>머리 아픈 계산은 앱에 맡기세요.';
const newDesc = '출석하는 즉시 잔여 횟수가 줄어들고 만료일이 체크됩니다.<br>\n                        노쇼 시 자동 차감 처리, 추가 예약도 터치 한 번이면 끝.<br>머리 아픈 계산은 앱에 맡기세요.';

if (html.includes(oldText)) {
  html = html.replace(oldText, newText);
  console.log('✅ 제목 업데이트: "칼같은 수강권 차감" → "칼같은 수강권 차감 & 예약 관리"');
} else {
  console.log('⚠️ 제목을 찾을 수 없음');
}

if (html.includes(oldDesc)) {
  html = html.replace(oldDesc, newDesc);
  console.log('✅ 설명 업데이트: 노쇼 처리 + 추가예약 문구 추가');
} else {
  console.log('⚠️ 설명을 찾을 수 없음');
}

fs.writeFileSync(file, html, 'utf8');
console.log('✅ 저장 완료');
