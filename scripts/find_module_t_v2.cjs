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

// Find CONST declarations at module level that contain t("g_ calls
// These are the ones that crash because t is not in scope
const allFiles = scanDir('src');
for (const f of allFiles) {
  const c = fs.readFileSync(f, 'utf8');
  const lines = c.split('\n');
  
  // Find the first function/component declaration
  let firstFuncLine = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Common patterns for component/function start
    if (/^(const|function|export\s+default\s+function|export\s+const)\s+\w+\s*=?\s*(\(|function)/.test(line.trim())) {
      firstFuncLine = i;
      break;
    }
  }
  
  // Check lines BEFORE the first function for t("g_ calls
  for (let i = 0; i < firstFuncLine; i++) {
    const line = lines[i];
    if (/t\s*\(\s*["']g_/.test(line) && !line.trim().startsWith('//')) {
      console.log(`❌ ${f.replace(/\\/g, '/')}:${i+1}`);
      console.log(`   ${line.trim().substring(0, 120)}`);
    }
  }
}
console.log('\n--- Done ---');
