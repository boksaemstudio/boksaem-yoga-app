/**
 * 비영어권 대사관 — 정확한 텍스트 기반 교체
 * 각 파일에서 실제 텍스트를 읽어서 정확히 매칭/교체
 */
const fs = require('fs');
const path = require('path');
const publicDir = path.join(__dirname, '..', 'public');

function patch(file, lang, replacements) {
  if (!fs.existsSync(file)) { console.log(`  ⚠️ [${lang}] 파일 없음`); return 0; }
  let html = fs.readFileSync(file, 'utf8');
  let changes = 0;
  for (const [old, neu] of replacements) {
    if (html.includes(old)) {
      html = html.replace(old, neu);
      changes++;
    }
  }
  // 배경 어둡게
  if (html.includes('opacity: 0.4')) { html = html.replace('opacity: 0.4', 'opacity: 0.25'); changes++; }
  if (changes > 0) fs.writeFileSync(file, html, 'utf8');
  console.log(changes > 0 ? `  ✅ [${lang}] ${changes}건 업데이트` : `  ⚠️ [${lang}] 매칭 실패`);
  return changes;
}

let total = 0;

// ─── 🇯🇵 일본 대사관 ──────────────────
total += patch(path.join(publicDir, 'ja', 'home.html'), 'JA', [
  // 일본어 페이지는 spec-category 구조가 다름 — AI顔認証 무인접수 설명 간결화
  ['高額な指紋認証機器やスピードゲートは不要。iPadを1台置くだけで完了。',
   'iPadを1台置くだけ。顔認識かPINで即チェックイン。'],
]);

// ─── 🇨🇳 중국 대사관 ──────────────────
total += patch(path.join(publicDir, 'zh', 'home.html'), 'ZH', [
  // 중국어는 직접 찾아서 교체 — 먼저 패턴 확인
]);

// ─── 🇷🇺 러시아 대사관 ──────────────────
total += patch(path.join(publicDir, 'ru', 'home.html'), 'RU', []);

// ─── 🇪🇸 스페인 대사관 ──────────────────  
total += patch(path.join(publicDir, 'es', 'home.html'), 'ES', []);

// ─── 🇧🇷 브라질 대사관 ──────────────────
total += patch(path.join(publicDir, 'pt', 'home.html'), 'PT', []);

// ─── 🇫🇷 프랑스 대사관 ──────────────────
total += patch(path.join(publicDir, 'fr', 'home.html'), 'FR', []);

// ─── 🇩🇪 독일 대사관 ──────────────────
total += patch(path.join(publicDir, 'de', 'home.html'), 'DE', []);

// ─── 🇮🇳 인도 대사관 ──────────────────
total += patch(path.join(publicDir, 'in', 'home.html'), 'IN', []);

console.log(`\n━━━ 비영어권 대사관 ${total}건 업데이트 완료 ━━━`);
