/**
 * 하드코딩 한국어 감사 스크립트
 * JSX/JS 파일에서 t() 없이 직접 한국어가 사용된 곳을 찾습니다.
 */
const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && !['node_modules', 'dist', '.git', 'scripts', 'i18n'].includes(f.name)) {
      files.push(...scanDir(p));
    } else if (f.isFile() && (f.name.endsWith('.jsx') || f.name.endsWith('.js')) && !f.name.includes('.test.') && !f.name.includes('.cjs')) {
      files.push(p);
    }
  }
  return files;
}

// Korean character regex (Hangul syllables + Jamo)
const koreanRegex = /[\uAC00-\uD7AF\u3131-\u3163]{2,}/;

// Patterns to SKIP (these are OK):
const skipPatterns = [
  /^\s*\/\//, // comments
  /^\s*\*/, // block comments
  /^\s*\/\*/, // block comment start
  /t\s*\(/, // inside t() call
  /console\.(log|error|warn|info)/, // console logs
  /import\s/, // import statements
  /^\s*\*\s/, // JSDoc
  /fallback/, // fallback strings (intentional)
  /labelFallback/, // our key/fallback pattern
  /descFallback/, // our key/fallback pattern
  /\|\|\s*["'`]/, // || "fallback" patterns (OK - these are fallbacks after t())
  /["'`]g_[a-f0-9]+["'`]/, // translation keys
  /alert\(/, // alerts with Korean (would need t() but might be OK as confirm messages)
  /confirm\(/, // confirm dialogs
  /prompt\(/, // prompt dialogs
];

const allFiles = scanDir('src');
const results = {};

for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  const findings = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip if no Korean
    if (!koreanRegex.test(line)) continue;
    
    // Skip known OK patterns
    if (skipPatterns.some(p => p.test(line))) continue;
    
    // Extract the Korean text
    const matches = line.match(/[\uAC00-\uD7AF\u3131-\u3163\s]+/g);
    if (!matches) continue;
    
    const koreanText = matches.filter(m => m.trim().length >= 2).map(m => m.trim());
    if (koreanText.length === 0) continue;
    
    findings.push({
      line: i + 1,
      korean: koreanText.join(' | '),
      context: line.trim().substring(0, 150)
    });
  }
  
  if (findings.length > 0) {
    const relPath = f.replace(/\\/g, '/').replace(/.*\/src\//, 'src/');
    results[relPath] = findings;
  }
}

// Output summary
const totalFiles = Object.keys(results).length;
const totalFindings = Object.values(results).reduce((sum, f) => sum + f.length, 0);

console.log(`\n══════════════════════════════════════════`);
console.log(`  하드코딩 한국어 감사 결과`);
console.log(`  파일: ${totalFiles}개 | 라인: ${totalFindings}개`);
console.log(`══════════════════════════════════════════\n`);

// Group by category
const categories = {
  'pages/': { files: {}, label: '📄 페이지' },
  'components/admin/': { files: {}, label: '🔧 관리자 컴포넌트' },
  'components/checkin/': { files: {}, label: '📋 체크인 컴포넌트' },
  'components/': { files: {}, label: '🧩 공통 컴포넌트' },
  'services/': { files: {}, label: '⚙️ 서비스' },
  'utils/': { files: {}, label: '🔨 유틸리티' },
  'stores/': { files: {}, label: '📦 스토어' },
  'other': { files: {}, label: '📁 기타' },
};

for (const [file, findings] of Object.entries(results)) {
  let categorized = false;
  for (const [prefix, cat] of Object.entries(categories)) {
    if (prefix !== 'other' && file.includes(prefix)) {
      cat.files[file] = findings;
      categorized = true;
      break;
    }
  }
  if (!categorized) categories['other'].files[file] = findings;
}

for (const [, cat] of Object.entries(categories)) {
  const fileCount = Object.keys(cat.files).length;
  if (fileCount === 0) continue;
  
  const lineCount = Object.values(cat.files).reduce((sum, f) => sum + f.length, 0);
  console.log(`\n${cat.label} (${fileCount}개 파일, ${lineCount}개 라인)`);
  console.log('─'.repeat(50));
  
  for (const [file, findings] of Object.entries(cat.files)) {
    console.log(`\n  📌 ${file} (${findings.length}건)`);
    findings.slice(0, 5).forEach(f => {
      console.log(`     L${f.line}: "${f.korean}"`);
      console.log(`         ${f.context.substring(0, 100)}`);
    });
    if (findings.length > 5) {
      console.log(`     ... 외 ${findings.length - 5}건 더`);
    }
  }
}

console.log(`\n\n═══ 요약 ═══`);
console.log(`총 ${totalFiles}개 파일에서 ${totalFindings}건의 하드코딩 한국어 발견`);
console.log(`(t() 호출, 주석, 콘솔 로그, fallback 문자열은 제외됨)\n`);
