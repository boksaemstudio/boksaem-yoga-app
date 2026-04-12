/**
 * PassFlow AI — 글로벌 슬로건 업데이트 스크립트
 * 
 * "저렴하고, 단순하고, 똑똑한 AI 스튜디오 관리 플랫폼"
 * 
 * 각 나라의 히어로 섹션 상단 뱃지(badge)를 현지화된 슬로건으로 교체합니다.
 * 대사관처럼 독립적이면서도 하나의 통일된 메시지를 전달합니다.
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// 각 나라별 "대사관" 슬로건 — 현지 전문가가 쓴 것처럼
const SLOGANS = {
  'ko': {
    badge: '저렴하고, 단순하고, 똑똑한 AI 스튜디오 관리 플랫폼',
    file: path.join(publicDir, 'home.html'),
  },
  'en': {
    badge: 'Affordable. Simple. AI-Smart Studio Management.',
    file: path.join(publicDir, 'en', 'home.html'),
  },
  'ja': {
    badge: '安い。シンプル。AIで賢い — スタジオ管理の新基準',
    file: path.join(publicDir, 'ja', 'home.html'),
  },
  'zh': {
    badge: '实惠 · 简洁 · AI智能 — 工作室管理新标准',
    file: path.join(publicDir, 'zh', 'home.html'),
  },
  'ru': {
    badge: 'Доступно. Просто. ИИ-управление студией.',
    file: path.join(publicDir, 'ru', 'home.html'),
  },
  'es': {
    badge: 'Económico. Simple. Gestión de estudio con IA.',
    file: path.join(publicDir, 'es', 'home.html'),
  },
  'pt': {
    badge: 'Acessível. Simples. Gestão de estúdio com IA.',
    file: path.join(publicDir, 'pt', 'home.html'),
  },
  'fr': {
    badge: 'Abordable. Simple. Gestion de studio par IA.',
    file: path.join(publicDir, 'fr', 'home.html'),
  },
  'de': {
    badge: 'Günstig. Einfach. KI-intelligente Studioverwaltung.',
    file: path.join(publicDir, 'de', 'home.html'),
  },
  'in': {
    badge: 'Affordable. Simple. AI-Smart Studio Management for India.',
    file: path.join(publicDir, 'in', 'home.html'),
  },
  'au': {
    badge: 'Affordable. Simple. AI-Smart Studio Management for Australia.',
    file: path.join(publicDir, 'au', 'home.html'),
  },
  'ca': {
    badge: 'Affordable. Simple. AI-Smart Studio Management for Canada.',
    file: path.join(publicDir, 'ca', 'home.html'),
  },
};

let updated = 0;
let skipped = 0;

for (const [lang, config] of Object.entries(SLOGANS)) {
  if (!fs.existsSync(config.file)) {
    console.log(`  ⚠️ [${lang}] 파일 없음: ${config.file}`);
    skipped++;
    continue;
  }

  let html = fs.readFileSync(config.file, 'utf8');

  // 히어로 뱃지를 찾아서 교체
  // 패턴: border-radius:30px; ... margin-bottom:24px; ... >TEXT HERE</div>
  // 각 파일마다 뱃지 텍스트가 다르므로, 구조적으로 찾기
  
  // Strategy: hero 섹션 안의 첫 번째 뱃지(border-radius:30px 포함) 내부 텍스트를 교체
  const badgeRegex = /(border-radius:30px[^>]*>)\s*([\s\S]*?)\s*(<\/div>)/;
  const match = html.match(badgeRegex);
  
  if (match) {
    const oldText = match[2].trim();
    const newText = `\n                ${config.badge}\n            `;
    
    if (oldText === config.badge) {
      console.log(`  ✓ [${lang}] 이미 최신: "${config.badge.substring(0, 40)}..."`);
      skipped++;
      continue;
    }
    
    html = html.replace(match[0], match[1] + newText + match[3]);
    fs.writeFileSync(config.file, html, 'utf8');
    console.log(`  ✅ [${lang}] 뱃지 업데이트:`);
    console.log(`       이전: "${oldText.substring(0, 50)}..."`);
    console.log(`       변경: "${config.badge}"`);
    updated++;
  } else {
    console.log(`  ⚠️ [${lang}] 뱃지 요소를 찾을 수 없음 — 수동 확인 필요`);
    skipped++;
  }
}

console.log('');
console.log(`━━━ 완료: ${updated}개 업데이트, ${skipped}개 스킵 ━━━`);
