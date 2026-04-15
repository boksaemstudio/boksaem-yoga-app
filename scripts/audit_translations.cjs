/**
 * 전 언어 번역 키 감사 스크립트
 * - ko 섹션의 모든 키를 기준으로 각 언어에서 누락된 키 확인
 * - 각 언어에서 영어(en)와 동일한 값을 가진 키 식별 (미번역 의심)
 * - 상단 바 핵심 키(collapse, expand, addToHomeShort, aiAnalysisShort, notificationsOff 등) 특별 검사
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'utils', 'translations.js');
const content = fs.readFileSync(filePath, 'utf-8');

// Extract translations object - parse it as JS
const fn = new Function(content.replace('export const translations =', 'return') );
const translations = fn();

const langs = Object.keys(translations);
console.log(`\n🌐 발견된 언어: ${langs.join(', ')} (총 ${langs.length}개)\n`);

const koKeys = Object.keys(translations.ko);
const enKeys = Object.keys(translations.en || {});
console.log(`📊 ko 키 수: ${koKeys.length}, en 키 수: ${enKeys.length}\n`);

// 상단 바 핵심 키 목록
const criticalKeys = [
  'collapse', 'expand', 'addToHomeScreen', 'addToHomeShort',
  'collapseAll', 'expandAll', 'aiAnalysisShort', 'aiRefreshTitle',
  'notificationsOn', 'notificationsOff', 'allBranches',
  'admin_btn_collapse', 'admin_btn_expand',
  'admin_members_btn_add', 'admin_members_stat_active',
  'admin_members_loading', 'admin_tab_search_ph',
  'admin_badge_active', 'admin_badge_expired',
  'attendance', 'activityLog', 'admin_tab_all_member',
  'admin_tab_ai_churn', 'admin_tab_monthly_revenue',
];

// 각 언어별 감사
let totalIssues = 0;

for (const lang of langs) {
  if (lang === 'ko') continue; // ko는 기준
  
  const langData = translations[lang];
  const langKeys = Object.keys(langData);
  
  // 1. ko에는 있지만 이 언어에 없는 키
  const missingFromKo = koKeys.filter(k => !(k in langData));
  
  // 2. en에는 있지만 이 언어에 없는 키 (en 이외 언어)
  const missingFromEn = lang !== 'en' ? enKeys.filter(k => !(k in langData)) : [];
  
  // 3. en 값과 동일한 값을 가진 키 (en 이외 언어 - 미번역 의심)
  const enData = translations.en || {};
  const untranslated = lang !== 'en' ? langKeys.filter(k => {
    const val = langData[k];
    const enVal = enData[k];
    // 기술 용어, 숫자, 빈 문자열은 제외
    if (!val || !enVal) return false;
    if (val === enVal && val.length > 3 && !/^[A-Z0-9\s\-_.:\/]+$/i.test(val) && !val.includes('http') && !val.includes('PassFlow') && !val.includes('MBTI') && !val.includes('AI ') && !val.includes('Chrome') && !val.includes('Safari') && !val.includes('iOS') && !val.includes('Android')) {
      return true;
    }
    return false;
  }) : [];
  
  // 4. 핵심 키 체크
  const missingCritical = criticalKeys.filter(k => !(k in langData));
  const untranslatedCritical = lang !== 'en' ? criticalKeys.filter(k => {
    return k in langData && k in enData && langData[k] === enData[k] && langData[k].length > 2;
  }) : [];
  
  const issues = missingFromKo.length + missingCritical.length + untranslatedCritical.length;
  totalIssues += issues;
  
  console.log(`${'='.repeat(60)}`);
  console.log(`🔤 [${lang.toUpperCase()}] 감사 결과`);
  console.log(`   총 키 수: ${langKeys.length}`);
  
  if (missingCritical.length > 0) {
    console.log(`\n   ⛔ 핵심 키 누락 (${missingCritical.length}개):`);
    missingCritical.forEach(k => console.log(`      - ${k}`));
  }
  
  if (untranslatedCritical.length > 0) {
    console.log(`\n   ⚠️  핵심 키 미번역 (영어와 동일, ${untranslatedCritical.length}개):`);
    untranslatedCritical.forEach(k => console.log(`      - ${k}: "${langData[k]}"`));
  }
  
  if (missingFromKo.length > 0) {
    console.log(`\n   📋 ko 대비 누락 키 (${missingFromKo.length}개):`);
    missingFromKo.slice(0, 15).forEach(k => console.log(`      - ${k}`));
    if (missingFromKo.length > 15) console.log(`      ... 외 ${missingFromKo.length - 15}개`);
  }
  
  if (lang !== 'en' && missingFromEn.length > 0) {
    console.log(`\n   📋 en 대비 누락 키 (${missingFromEn.length}개):`);
    missingFromEn.slice(0, 10).forEach(k => console.log(`      - ${k}`));
    if (missingFromEn.length > 10) console.log(`      ... 외 ${missingFromEn.length - 10}개`);
  }
  
  if (untranslated.length > 0) {
    console.log(`\n   🔍 미번역 의심 (en과 동일값, ${untranslated.length}개):`);
    untranslated.slice(0, 10).forEach(k => console.log(`      - ${k}: "${langData[k]}"`));
    if (untranslated.length > 10) console.log(`      ... 외 ${untranslated.length - 10}개`);
  }
  
  if (issues === 0 && untranslated.length === 0) {
    console.log(`   ✅ 문제 없음!`);
  }
  console.log('');
}

console.log(`\n${'='.repeat(60)}`);
console.log(`📊 전체 감사 요약: ${totalIssues === 0 ? '✅ 모든 언어 정상!' : `⚠️ 총 ${totalIssues}건의 문제 발견`}`);
console.log(`${'='.repeat(60)}\n`);
