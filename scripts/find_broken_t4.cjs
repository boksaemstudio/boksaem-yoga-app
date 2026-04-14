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

for (const f of allFiles) {
  const c = fs.readFileSync(f, 'utf8');
  const lines = c.split('\n');
  
  // Find t() calls used as translation function
  const tCallLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    // Match standalone t( but NOT .t( or _t( or at( or const t or let t or "t(" in string
    if (/(?<![a-zA-Z_.$])t\s*\(/.test(line)) {
      tCallLines.push(i + 1);
    }
  }
  if (tCallLines.length === 0) continue;
  
  // ALL possible ways t could be defined
  const defined = 
    /const\s+t\s*=\s*useLanguageStore/.test(c) ||
    /const\s+t\s*=\s*useMemo/.test(c) ||
    c.includes('useLanguageStore.getState().t') ||
    /const\s*{\s*t\s*}/.test(c) ||          // const { t } = ...
    /const\s*{\s*[^}]*,\s*t\s*[,}]/.test(c) || // const { x, t } = ...
    /const\s*{\s*t\s*,/.test(c) ||           // const { t, x } = ...
    /function\s+\w+\s*\([^)]*\bt\b/.test(c) || // function foo(t, ...)
    /=\s*\([^)]*\bt\b[^)]*\)\s*=>/.test(c) || // (t) => or (x, t) =>
    /let\s+t\s*=/.test(c) ||
    /var\s+t\s*=/.test(c);
  
  if (!defined) {
    const shortName = f.replace(/\\/g, '/');
    console.log(`❌ ${shortName}`);
    console.log(`   t() on lines: ${tCallLines.slice(0, 8).join(', ')} (${tCallLines.length} total)`);
    // Show the actual line content for first few
    tCallLines.slice(0, 3).forEach(ln => {
      console.log(`   L${ln}: ${lines[ln-1].trim().substring(0, 100)}`);
    });
    console.log();
  }
}

console.log('--- Scan complete ---');
