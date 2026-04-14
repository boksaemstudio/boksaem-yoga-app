/**
 * 정밀 모듈 레벨 t() 호출 스캐너 v3
 * React 컴포넌트 바디 외부에서 t()를 호출하는 모든 곳을 찾습니다.
 */
const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && !['node_modules', 'dist', '.git'].includes(f.name)) {
      files.push(...scanDir(p));
    } else if (f.isFile() && (f.name.endsWith('.jsx') || f.name.endsWith('.js')) && !f.name.includes('.test.') && !f.name.includes('.cjs')) {
      files.push(p);
    }
  }
  return files;
}

const allFiles = scanDir('src');
let totalIssues = 0;

for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  
  // Track scope: Are we inside a function/component body?
  let braceDepth = 0;
  let insideComponent = false;
  let tDefined = false;
  const issues = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    
    // Track brace depth
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    
    // Check if t is being defined (useLanguageStore)
    if (/const\s+t\s*=\s*useLanguageStore|const\s*{\s*t\s*}\s*=\s*useLanguageStore|useLanguageStore\.getState\(\)\.t/.test(line)) {
      tDefined = true;
    }
    
    // Check for component/function start at top level
    if (braceDepth === 0) {
      if (/^(const|let|var|function|export\s+default\s+function|export\s+const|export\s+function)\s+\w+/.test(trimmed)) {
        // If this starts a function (contains => { or function(
        if (/=>\s*{|function\s*\(|=\s*memo\s*\(/.test(line)) {
          insideComponent = true;
          tDefined = false; // Reset
        }
      }
    }
    
    // At brace depth 0, t() calls are module-level (DANGEROUS)
    if (braceDepth === 0 && /\bt\s*\(\s*["']/.test(line)) {
      issues.push({ line: i + 1, text: trimmed.substring(0, 120) });
    }
    
    braceDepth += openBraces - closeBraces;
    if (braceDepth < 0) braceDepth = 0;
  }
  
  if (issues.length > 0) {
    const relPath = f.replace(/\\/g, '/').replace(/.*\/src\//, 'src/');
    console.log(`\n❌ ${relPath} (${issues.length} issues)`);
    issues.forEach(iss => {
      console.log(`   L${iss.line}: ${iss.text}`);
    });
    totalIssues += issues.length;
  }
}

console.log(`\n\n═══ Total: ${totalIssues} module-level t() calls found ═══`);
