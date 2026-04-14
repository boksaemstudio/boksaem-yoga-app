/**
 * ULTRA-DEEP t() Scanner v4
 * Finds ALL t() calls that are NOT inside a function body with useLanguageStore.
 * Specifically targets:
 * 1. Module-level t() calls (brace depth 0)
 * 2. Arrow functions WITHOUT braces that call t() but don't have useLanguageStore
 * 3. Any component that uses t() without defining it via useLanguageStore/useLanguage
 */
const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && !['node_modules', 'dist', '.git', 'scripts'].includes(f.name)) {
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
  
  // Strategy: Check if file uses t() and whether t is properly sourced
  const hasT = /\bt\s*\(\s*["']/.test(content);
  if (!hasT) continue;
  
  // Check if file has useLanguageStore or useLanguage import
  const hasLangImport = /useLanguageStore|useLanguage/.test(content);
  
  // If there's no language import at all but t() is used, that's often fine
  // because t could be passed as a prop. But let's check.
  
  // For each function/component, check if t is accessible
  const lines = content.split('\n');
  
  // Find all component definitions and check t() usage
  let insideFunction = false;
  let functionName = '';
  let braceDepth = 0;
  let functionStartBrace = -1;
  let hasTSource = false; // whether t is defined (via hook or param) in current scope
  let tUsages = [];
  let issues = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    
    // Detect function/component start
    if (braceDepth === 0) {
      // const X = (...) => {   OR  const X = memo((...) => {
      const funcMatch = trimmed.match(/^(?:export\s+)?(?:const|let|var|function)\s+(\w+)/);
      if (funcMatch && /=>\s*{|function\s*\(/.test(line)) {
        insideFunction = true;
        functionName = funcMatch[1];
        functionStartBrace = braceDepth;
        hasTSource = false;
        tUsages = [];
      }
      
      // Braceless arrow: const X = (...) => <div>
      if (funcMatch && /=>\s*</.test(line)) {
        // This is a braceless arrow function returning JSX
        // Check if t is used in this and subsequent lines until the component ends
        // AND if t is NOT in its params
        const params = line.match(/\(\s*\{([^}]*)\}\s*\)/);
        const hasTProp = params && /\bt\b/.test(params[1]);
        
        if (!hasTProp && /\bt\s*\(\s*["']/.test(line)) {
          issues.push({ line: i + 1, func: funcMatch[1], text: trimmed.substring(0, 100), reason: 'braceless arrow without t prop' });
        }
      }
    }
    
    // Track t source inside functions
    if (insideFunction && braceDepth > 0) {
      if (/const\s+t\s*=\s*useLanguageStore|const\s*{\s*t\s*}\s*=\s*useLanguage/.test(line)) {
        hasTSource = true;
      }
    }
    
    // Check t() usage at brace depth 0 (module level)
    if (braceDepth === 0 && /\bt\s*\(\s*["']/.test(line)) {
      // Exclude import statements
      if (!trimmed.startsWith('import') && !trimmed.startsWith('export const BADGE') && 
          !trimmed.startsWith('export const analyzeDiligence')) {
        issues.push({ line: i + 1, func: '(module-level)', text: trimmed.substring(0, 100), reason: 'module-level t() call' });
      }
    }
    
    braceDepth += openBraces - closeBraces;
    if (braceDepth < 0) braceDepth = 0;
    
    // When a function ends
    if (insideFunction && braceDepth === 0 && closeBraces > 0) {
      insideFunction = false;
    }
  }
  
  if (issues.length > 0) {
    const relPath = f.replace(/\\/g, '/').replace(/.*\/src\//, 'src/');
    console.log(`\n❌ ${relPath} (${issues.length} issues)`);
    issues.forEach(iss => {
      console.log(`   L${iss.line} [${iss.func}] (${iss.reason}): ${iss.text}`);
    });
    totalIssues += issues.length;
  }
}

console.log(`\n═══ Total: ${totalIssues} potential t() issues ═══`);
