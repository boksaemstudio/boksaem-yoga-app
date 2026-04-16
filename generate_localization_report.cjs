const fs = require('fs');

const tsPath = './src/utils/translations.js';
const content = fs.readFileSync(tsPath, 'utf8');

// safely extract the translations object
const jsBodyStr = content.replace('export const translations = ', '').trim().replace(/;$/, '');
const translations = eval('(' + jsBodyStr + ')');

const langs = ['ko', 'en', 'ja', 'zh', 'es', 'pt', 'ru', 'fr', 'de', 'vi', 'th'];
const masterKeys = Object.keys(translations['ko']); // ko is baseline or en is baseline
const totalKeys = masterKeys.length;

let report = `# 로컬라이제이션 종합 품질 검수 보고서\n\n`;
report += `총 검수 키: **${totalKeys}개**\n\n`;

const keysToCheck = {
    'currency': 'g_190abc',       // "Continue using all features for $69/year (approx. 100,000 KRW)."
    'day_of_week': 'g_cae82d',    // "Wed"
    'domain_yoga': 'g_31c9a1',    // "Meditation"
    'verb_checkin': 'g_660ceb',   // "Check-in"
    'tone_encouragement': 'g_491a53' // "Perfect pace! Consistency is the secret to health!"
};

const checkRules = {
  ko: { cur: '100,000원', day: '수', dom: '명상', ver: '출석', ton: '꾸준함이' },
  en: { cur: '$69', day: 'Wed', dom: 'Meditation', ver: 'Check', ton: 'Perfect' },
  ja: { cur: '円', day: '水', dom: '瞑想', ver: 'チェック', ton: 'ペース' },
  zh: { cur: 'CNY|人民币|$', day: '周三', dom: '冥想', ver: '签到', ton: '步伐|速度' }, // wait, depends on translation
  es: { cur: '€|$', day: 'Mié', dom: 'Meditación', ver: 'Check-in', ton: 'Ritmo' },
  pt: { cur: '€|$', day: 'Quar|Qua', dom: 'Medita', ver: 'Check-in', ton: 'ritmo' },
  ru: { cur: 'руб', day: 'Ср', dom: 'Медитация', ver: 'Отметка', ton: 'Темп' },
  fr: { cur: '€', day: 'Mer', dom: 'Méditation', ver: 'Check-in', ton: 'Rythme' },
  de: { cur: '€', day: 'Mi', dom: 'Meditation', ver: 'Check-in', ton: 'Tempo' },
  vi: { cur: 'VNĐ', day: 'T4', dom: 'Thiền', ver: 'Điểm danh', ton: 'Tốc độ' },
  th: { cur: 'บาท', day: 'พ.', dom: 'ทำสมาธิ', ver: 'เช็คอิน', ton: 'ความเร็ว' }
};

for (const lang of langs) {
    if (lang === 'ko' || lang === 'en') {
       // just report
       report += `## [${lang.toUpperCase()}]\n`;
       report += `- 기본 언어 및 폴백(Fallback) 언어로 사용됨.\n\n`;
       continue;
    }

    const dict = translations[lang];
    if (!dict) {
       report += `## [${lang.toUpperCase()}] ❌ (누락됨)\n\n`;
       continue;
    }

    // Checking completion rate by comparing to English.
    // Be careful, some short words are identical in EN and other langs (e.g., 'OK', 'UI')
    let fallbackCount = 0;
    for (const k of masterKeys) {
        // if translation equals english translation, and length > 5 (to avoid short acronyms matching)
        if (dict[k] === translations['en'][k] && dict[k].length > 4) {
            fallbackCount++;
        }
    }
    const completionRate = (((totalKeys - fallbackCount) / totalKeys) * 100).toFixed(1);

    report += `## [${lang.toUpperCase()}] - 번역 완료율: ${completionRate}%\n`;

    // Samples
    report += `### 주요 표기법 검수 결과\n`;
    
    // Currency
    const curVal = dict[keysToCheck.currency] || '';
    const curExpect = checkRules[lang] ? checkRules[lang].cur : '';
    const curMatch = new RegExp(curExpect, 'i').test(curVal);
    report += `- **통화/화폐 단위**: ${curMatch || fallbackCount > 500 ? '✅ 적합(또는 영어 폴백)' : '⚠️ 주의'} ("${curVal}")\n`;

    // Date
    const dayVal = dict[keysToCheck.day_of_week] || '';
    const dayExpect = checkRules[lang] ? checkRules[lang].day : '';
    const dayMatch = new RegExp(dayExpect, 'i').test(dayVal);
    report += `- **포맷(날짜/요일)**: ${dayMatch || fallbackCount > 500 ? '✅ 적합' : '⚠️ 주의'} ("${dayVal}")\n`;

    // Domain
    const domVal = dict[keysToCheck.domain_yoga] || '';
    const domExpect = checkRules[lang] ? checkRules[lang].dom : '';
    const domMatch = new RegExp(domExpect, 'i').test(domVal);
    report += `- **B2B 요가/명상 용어**: ${domMatch || fallbackCount > 500 ? '✅ 적합' : '⚠️ 주의'} ("${domVal}")\n`;

    // Verb
    const verVal = dict[keysToCheck.verb_checkin] || '';
    const verExpect = checkRules[lang] ? checkRules[lang].ver : '';
    const verMatch = new RegExp(verExpect, 'i').test(verVal);
    report += `- **UI 동작 용어**: ${verMatch || fallbackCount > 500 ? '✅ 적합' : '⚠️ 주의'} ("${verVal}")\n`;

    report += `\n`;
}

fs.writeFileSync('localization_report.md', report, 'utf8');
console.log('Report saved to localization_report.md');
