const fs = require('fs');

const tsPath = './src/utils/translations.js';
const content = fs.readFileSync(tsPath, 'utf8');
const jsBodyStr = content.replace('export const translations = ', '').trim().replace(/;$/, '');
const translations = eval('(' + jsBodyStr + ')');

const langs = ['ja', 'zh', 'es', 'pt', 'ru', 'fr', 'de', 'vi', 'th'];
const enDict = translations['en'];
const koDict = translations['ko'];
const enKeys = Object.keys(enDict);

// Skip keys that are naturally identical (short codes, numbers, proper nouns, emoji-only, URLs, etc.)
const skipKeys = ['mkt_nav_login', 'feat_nav_login'];
const isNaturallyIdentical = (val, k) => {
  if (!val || val.length <= 3) return true;                    
  if (/^[\d\s:.\-\/,+]+$/.test(val)) return true;             
  if (/^[A-Z]{2,5}$/.test(val)) return true;                  
  if (/^https?:\/\//.test(val)) return true;                   
  if (/^g_[a-f0-9]+$/.test(val)) return true;                 
  if (/^[\p{Emoji}\s✕✓○×]+$/u.test(val)) return true;        
  if (/^(PayPal|Firebase|Google|Chrome|Safari|KakaoTalk|Alimtalk|SMS|MBTI|AI|AES-256|SSL\/TLS|PG|GA4|PWA|Push Token|CEO)/i.test(val)) return true;  
  if (/^(Boksaem|Ssangmun|Mapo|Gongdeok|Ahyeon|Ewha|Sinchon|Hongdae|Mangwon|Hapjeong|Aeogae|Yeouido|PassFlow|Hong Gil-dong|Kim Bang-mun|Song Dae-min)/i.test(val)) return true; 
  if (skipKeys.includes(k)) return true;
  return false;
};

const uniqueMissingKeys = new Set();

for (const lang of langs) {
  const dict = translations[lang] || {};
  for (const k of enKeys) {
    if (k === 'g_c8e9b8' || k.startsWith('g_')) continue; // Assume g_ is mostly complete based on previous analysis
    const enVal = enDict[k];
    const localVal = dict[k];
    if (localVal === enVal && !isNaturallyIdentical(enVal, k)) {
      uniqueMissingKeys.add(k);
    }
  }
}

const missingDict = {};
for (const k of uniqueMissingKeys) {
  missingDict[k] = {
    ko: koDict[k] || enDict[k],
    en: enDict[k]
  };
}

fs.writeFileSync('missing_unique_keys.json', JSON.stringify(missingDict, null, 2), 'utf8');
console.log(`기존 번역본에서 누락되어 영어 폴백으로 사용된 고유 키 스캔 완료: 총 ${uniqueMissingKeys.size}개`);
