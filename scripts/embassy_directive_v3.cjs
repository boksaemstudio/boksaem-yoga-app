/**
 * 전 세계 대사관 최종 지시 — 정확한 h3 제목 매칭 기반
 */
const fs = require('fs');
const path = require('path');
const pub = p => path.join(__dirname, '..', 'public', p);

function apply(file, lang, pairs) {
  if (!fs.existsSync(file)) return 0;
  let h = fs.readFileSync(file, 'utf8');
  let c = 0;
  for (const [o, n] of pairs) {
    if (h.includes(o)) { h = h.replace(o, n); c++; }
  }
  if (h.includes('opacity: 0.4')) { h = h.replace('opacity: 0.4', 'opacity: 0.25'); c++; }
  if (c > 0) fs.writeFileSync(file, h, 'utf8');
  console.log(c > 0 ? `  ✅ [${lang}] ${c}건` : `  ⚠️ [${lang}] 0건`);
  return c;
}

let t = 0;

// 🇪🇸 스페인
t += apply(pub('es/home.html'), 'ES', [
  ['Sin Recepcionista', 'Sin Recepción'],
  ['Descuento Automático', 'Clases, Reservas y No-Shows'],
]);

// 🇧🇷 브라질
t += apply(pub('pt/home.html'), 'PT', [
  ['Sem Recepcionista', 'Sem Recepção'],
  ['Desconto Automático', 'Aulas, Reservas e Faltas'],
]);

// 🇫🇷 프랑스
t += apply(pub('fr/home.html'), 'FR', [
  ['Sans Réceptionniste', 'Sans Réception'],
  ['Déduction Automatique', 'Séances, Réservations et Absences'],
]);

// 🇩🇪 독일
t += apply(pub('de/home.html'), 'DE', [
  ['Kein Empfang Nötig', 'Kein Empfang nötig'],
  ['Automatische Abrechnung', 'Credits, Buchungen & No-Shows'],
]);

// 🇨🇳 중국
t += apply(pub('zh/home.html'), 'ZH', [
  ['自动扣减课时', '课时·预约·缺席管理'],
]);

// 🇷🇺 러시아
t += apply(pub('ru/home.html'), 'RU', [
  ['Авто-списание абонемента', 'Абонементы, записи и неявки'],
]);

// 🇮🇳 인도 (구조가 다름 — 3카드 섹션이 없음, 스킵)
console.log('  ℹ️ [IN] 인도는 다른 레이아웃 — 별도 처리 필요');

console.log(`\n━━━ 2차 지시 완료: ${t}건 ━━━`);
