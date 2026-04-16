const fs = require('fs');

const tsPath = './src/utils/translations.js';
const content = fs.readFileSync(tsPath, 'utf8');
const jsBodyStr = content.replace('export const translations = ', '').trim().replace(/;$/, '');
const translations = eval('(' + jsBodyStr + ')');

const langs = ['ja', 'zh', 'es', 'pt', 'ru', 'fr', 'de', 'vi', 'th'];
const enDict = translations['en'];
const enKeys = Object.keys(enDict);

// Skip keys that are naturally identical (short codes, numbers, proper nouns, emoji-only, URLs, etc.)
const isNaturallyIdentical = (val) => {
  if (!val || val.length <= 3) return true;                    // very short (OK, AM, PM...)
  if (/^[\d\s:.\-\/,+]+$/.test(val)) return true;             // pure numbers/time
  if (/^[A-Z]{2,5}$/.test(val)) return true;                  // country/lang codes
  if (/^https?:\/\//.test(val)) return true;                   // URLs
  if (/^g_[a-f0-9]+$/.test(val)) return true;                 // placeholder keys
  if (/^[\p{Emoji}\s✕✓○×]+$/u.test(val)) return true;        // emoji-only
  if (/^(PayPal|Firebase|Google|Chrome|Safari|KakaoTalk|Alimtalk|SMS|MBTI|AI|AES-256|SSL\/TLS|PG|GA4|PWA|Push Token|CEO)/i.test(val)) return true;  // tech terms
  if (/^(Boksaem|Ssangmun|Mapo|Gongdeok|Ahyeon|Ewha|Sinchon|Hongdae|Mangwon|Hapjeong|Aeogae|Yeouido|PassFlow|Hong Gil-dong|Kim Bang-mun|Song Dae-min)/i.test(val)) return true; // proper nouns
  return false;
};

console.log('=== 영어 폴백(미번역) 키 검수 보고서 ===\n');

let totalFallbacks = 0;

for (const lang of langs) {
  const dict = translations[lang];
  if (!dict) { console.log(`[${lang}] 전체 누락!`); continue; }

  const fallbacks = [];
  for (const k of enKeys) {
    const enVal = enDict[k];
    const localVal = dict[k];
    // If the translated value is exactly the same as English and it's not a naturally identical term
    if (localVal === enVal && !isNaturallyIdentical(enVal)) {
      fallbacks.push({ key: k, value: enVal.substring(0, 80) });
    }
  }

  console.log(`[${lang.toUpperCase()}] 영어 폴백 ${fallbacks.length}건 / 전체 ${enKeys.length}건`);
  if (fallbacks.length > 0 && fallbacks.length <= 30) {
    for (const f of fallbacks) {
      console.log(`  ⚠️  ${f.key}: "${f.value}${f.value.length >= 80 ? '...' : ''}"`);
    }
  } else if (fallbacks.length > 30) {
    // Show first 15 as samples
    for (const f of fallbacks.slice(0, 15)) {
      console.log(`  ⚠️  ${f.key}: "${f.value}${f.value.length >= 80 ? '...' : ''}"`);
    }
    console.log(`  ... 외 ${fallbacks.length - 15}건 더`);
  }
  totalFallbacks += fallbacks.length;
  console.log('');
}

console.log(`\n총계: ${totalFallbacks}건의 영어 폴백 발견`);
