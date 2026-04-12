const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'public', 'home.html');
let html = fs.readFileSync(file, 'utf8');

const old = '출석하는 즉시 잔여 횟수가 줄어들고 만료일이 체크됩니다.<br>\n                        노쇼 시 자동 차감 처리, 추가 예약도 터치 한 번이면 끝.<br>머리 아픈 계산은 앱에 맡기세요.';
const neu = '출석 즉시 횟수 차감, 노쇼 자동 처리, 예약도 터치 한 번.';

if (html.includes(old)) {
  html = html.replace(old, neu);
  fs.writeFileSync(file, html, 'utf8');
  console.log('✅ 수강권 문구 간결화 완료');
} else {
  console.log('⚠️ 못 찾음');
}
