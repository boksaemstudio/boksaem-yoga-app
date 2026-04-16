const fs = require('fs');
const parser = require('@babel/parser');

// Phase 1에서 처리한 4대 핵심 파일 + 현재 추가 처리한 파일들
const files = [
  'src/pages/SuperAdminPage.jsx',
  'src/pages/AdminDashboard.jsx',
  'src/pages/CheckInPage.jsx',
  'src/pages/InstructorPage.jsx',
  'src/pages/AuthActionPage.jsx'
];

const koreanRegex = /[\u3131-\uD79D]/;

for (const file of files) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`INSPECTING: ${file}`);
  console.log('='.repeat(60));
  
  const code = fs.readFileSync(file, 'utf8');
  
  // === CHECK 1: 빌드 파싱 가능한지 (문법 오류 감지) ===
  try {
    parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
    console.log('✅ [1] 문법 파싱 성공 (Syntax OK)');
  } catch(e) {
    console.log(`❌ [1] 문법 오류 발견! Line ${e.loc?.line}: ${e.message}`);
  }
  
  // === CHECK 2: useLanguageStore import 존재 여부 ===
  if (code.includes("import { useLanguageStore }") || code.includes("import {useLanguageStore}")) {
    console.log('✅ [2] useLanguageStore import 존재');
  } else {
    console.log('❌ [2] useLanguageStore import 누락!');
  }
  
  // === CHECK 3: t 함수 정의 존재 여부 ===
  if (code.includes("useLanguageStore(s => s.t)") || code.includes("useLanguageStore(s=>s.t)")) {
    console.log('✅ [3] const t = useLanguageStore(s => s.t) 존재');
  } else {
    console.log('⚠️ [3] t 함수 할당 패턴 확인 필요');
  }
  
  // === CHECK 4: Hook이 컴포넌트 최상위에서 호출되는지 (콜백/조건문 안에 없는지) ===
  const lines = code.split('\n');
  let insideComponent = false;
  let braceCount = 0;
  let hookInBadPlace = false;
  const hookLine = lines.findIndex(l => l.includes('useLanguageStore(s'));
  
  if (hookLine >= 0) {
    // Check if the hook is inside a callback or condition
    const before = lines.slice(Math.max(0, hookLine - 5), hookLine).join(' ');
    if (before.includes('if (') || before.includes('if(') || before.includes('.forEach') || before.includes('.map(')) {
      console.log(`⚠️ [4] Hook이 조건문/콜백 내부에 있을 수 있음! Line ${hookLine + 1}`);
      hookInBadPlace = true;
    } else {
      console.log(`✅ [4] Hook 위치 정상 (Line ${hookLine + 1})`);
    }
  }
  
  // === CHECK 5: 남은 RAW 한글 (t()로 감싸지지 않은 것) ===
  let rawKoreanCount = 0;
  const rawKoreanSamples = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!koreanRegex.test(line)) continue;
    
    const trimmed = line.trim();
    // 주석 무시
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    // import 무시
    if (trimmed.startsWith('import ')) continue;
    // 이미 t()로 감싸진 것 무시
    if (line.includes('t(') || line.includes('t("') || line.includes("t('")) continue;
    
    rawKoreanCount++;
    if (rawKoreanSamples.length < 10) {
      rawKoreanSamples.push(`  L${i+1}: ${trimmed.substring(0, 120)}`);
    }
  }
  
  if (rawKoreanCount === 0) {
    console.log('✅ [5] Raw 한글 0개 (모두 t() 처리됨)');
  } else {
    console.log(`⚠️ [5] Raw 한글 ${rawKoreanCount}개 잔존:`);
    rawKoreanSamples.forEach(s => console.log(s));
  }
  
  // === CHECK 6: t() 호출에서 fallback 패턴 검증 ===
  // t("key") || "한글" 패턴이 올바른지
  const tCallRegex = /t\("([^"]+)"\)\s*\|\|\s*/g;
  let tCallCount = 0;
  let match;
  while ((match = tCallRegex.exec(code)) !== null) {
    tCallCount++;
  }
  console.log(`📊 [6] t() 호출 수: ${tCallCount}개`);
  
  // === CHECK 7: 이중 t() 감싸기 여부 (t(t("key"))) ===
  const doubleTRegex = /t\(\s*t\s*\(/g;
  const doubleT = code.match(doubleTRegex);
  if (doubleT) {
    console.log(`❌ [7] 이중 t() 감싸기 발견! ${doubleT.length}건`);
  } else {
    console.log('✅ [7] 이중 t() 감싸기 없음');
  }
  
  // === CHECK 8: 깨진 JSX 패턴 검사 (닫히지 않은 태그) ===
  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
  if (openBraces === closeBraces) {
    console.log(`✅ [8] 중괄호 균형 정상 ({${openBraces} / }${closeBraces})`);
  } else {
    console.log(`❌ [8] 중괄호 불균형! { ${openBraces} vs } ${closeBraces} (차이: ${openBraces - closeBraces})`);
  }
}

console.log('\n\n=== 전체 빌드 테스트는 npm run build로 반드시 확인하세요 ===');
