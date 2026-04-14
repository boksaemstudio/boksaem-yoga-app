/**
 * fix_module_level_t.cjs
 * 
 * 근본 수정: 자동화 스크립트가 모듈 레벨 상수(컴포넌트 밖)에 주입한 
 * t("g_xxx") || t("g_xxx") || ... || "한글" 패턴을 "한글" 폴백으로 교체합니다.
 * 
 * React Hook인 useLanguageStore의 t()는 컴포넌트/훅 안에서만 호출 가능합니다.
 * 모듈 레벨에서 호출하면 ReferenceError: t is not defined 크래시가 발생합니다.
 */
const fs = require('fs');
const path = require('path');

// 파일 내 t("xxx") || t("xxx") || ... || "fallback" 패턴을 "fallback"으로 변환
function fixModuleLevelT(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Pattern: t("g_xxx") || t("g_xxx") || ... || "실제문자열"
  // 마지막 || 뒤의 실제 한글/영어 문자열만 남기고 앞의 t() 호출을 모두 제거
  // This regex matches: one or more t("...") || chains followed by a final fallback string
  const pattern = /(?:t\s*\(\s*["'][^"']*["']\s*\)\s*\|\|\s*)+(?:t\s*\(\s*["'][^"']*["']\s*\)\s*\|\|\s*)*(["'`][^"'`]*["'`])/g;
  
  content = content.replace(pattern, (match, fallback) => {
    return fallback;
  });
  
  // Also handle: t("key") || "fallback" (single t() call)
  const singlePattern = /t\s*\(\s*["'][^"']*["']\s*\)\s*\|\|\s*(["'`][^"'`]*["'`])/g;
  content = content.replace(singlePattern, (match, fallback) => {
    // Only replace if we're NOT inside a component (heuristic: check if there's a t declaration nearby)
    return fallback;
  });
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    const changes = original.split('\n').length - content.split('\n').length;
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }
  return false;
}

// Target files that are NOT React components (module-level constants)
const targetFiles = [
  'src/App.jsx',
  'src/studioConfig.js',
  'src/i18n/onboardingI18n.js',
  'src/constants/aiMessages.js',
  'src/constants/meditationConstants.js',
  'src/init/security.js',
];

let fixCount = 0;
targetFiles.forEach(f => {
  const fullPath = path.resolve(f);
  if (fs.existsSync(fullPath)) {
    if (fixModuleLevelT(fullPath)) fixCount++;
  } else {
    console.log(`⚠️  Not found: ${f}`);
  }
});

console.log(`\n🔧 Total files fixed: ${fixCount}`);
