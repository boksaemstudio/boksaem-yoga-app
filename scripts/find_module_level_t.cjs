const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && !f.name.includes('node_modules') && !f.name.includes('dist')) {
      files.push(...scanDir(p));
    } else if (f.isFile() && (f.name.endsWith('.jsx') || f.name.endsWith('.js')) && !f.name.includes('.test.')) {
      files.push(p);
    }
  }
  return files;
}

const allFiles = scanDir('src');

// Find files where t() is called at MODULE LEVEL (outside any function body)
for (const f of allFiles) {
  const c = fs.readFileSync(f, 'utf8');
  const lines = c.split('\n');
  
  let depth = 0; // Track { } nesting
  let inFunction = false;
  const moduleLevelTCalls = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Count braces (rough heuristic)
    for (const ch of line) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    
    // Module level = depth 0 or 1 (for const X = { ... })
    // We look for t("g_ pattern specifically at low nesting depth
    if (depth <= 1 && /t\s*\(\s*["'`]g_/.test(line)) {
      moduleLevelTCalls.push({ line: i + 1, content: line.trim().substring(0, 120) });
    }
  }
  
  if (moduleLevelTCalls.length > 0) {
    console.log(`\n❌ ${f.replace(/\\/g, '/')}`);
    moduleLevelTCalls.forEach(m => {
      console.log(`   L${m.line}: ${m.content}`);
    });
  }
}

console.log('\n--- Module-level t() scan complete ---');
