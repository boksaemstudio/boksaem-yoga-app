const fs = require('fs');
const path = require('path');
const pub = p => path.join(__dirname, '..', 'public', p);

const fixes = [
  [pub('home.html'),       '칼같은 수강권 차감 & 예약 관리',    '칼같은 수강권 & 예약 관리'],
  [pub('en/home.html'),    'Credits, Bookings & No-Shows',      'Bookings, Credits & No-Shows'],
  [pub('zh/home.html'),    '课时·预约·缺席管理',                '课时·预约·缺席管理'], // 이미 OK
  [pub('ru/home.html'),    'Абонементы, записи и неявки',       'Абонементы, записи и неявки'], // OK
  [pub('es/home.html'),    'Clases, Reservas y No-Shows',       'Clases, Reservas y No-Shows'], // OK
  [pub('pt/home.html'),    'Aulas, Reservas e Faltas',          'Aulas, Reservas e Faltas'], // OK
  [pub('fr/home.html'),    'Séances, Réservations et Absences', 'Séances, Réservations et Absences'], // OK
  [pub('de/home.html'),    'Credits, Buchungen & No-Shows',     'Buchungen, Credits & No-Shows'],
  [pub('au/home.html'),    'Credits, Bookings & No-Shows',      'Bookings, Credits & No-Shows'],
  [pub('ca/home.html'),    'Credits, Bookings & No-Shows',      'Bookings, Credits & No-Shows'],
];

let c = 0;
for (const [f, old, neu] of fixes) {
  if (!fs.existsSync(f)) continue;
  let h = fs.readFileSync(f, 'utf8');
  if (h.includes(old) && old !== neu) {
    h = h.replace(old, neu);
    fs.writeFileSync(f, h, 'utf8');
    c++;
    console.log(`  ✅ ${path.basename(path.dirname(f))||'KR'}: "${old}" → "${neu}"`);
  }
}
console.log(`\n완료: ${c}건`);
