const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) files.push(...scanDir(p));
    else if (f.name.endsWith('.jsx') || f.name.endsWith('.js')) files.push(p);
  }
  return files;
}

// Check ALL admin components + AdminDashboard page + hooks used by admin
const dirs = [
  'src/components/admin',
  'src/components/common',
  'src/components/checkin',
];
const extraFiles = [
  'src/pages/AdminDashboard.jsx',
  'src/pages/SuperAdminPage.jsx',
];

const allFiles = [];
dirs.forEach(d => { if (fs.existsSync(d)) allFiles.push(...scanDir(d)); });
extraFiles.forEach(f => { if (fs.existsSync(f)) allFiles.push(f); });

for (const f of allFiles) {
  const c = fs.readFileSync(f, 'utf8');
  const lines = c.split('\n');
  
  // Find lines that call t() as a translation function
  const tCallLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    // Match t('...') or t("...") or t(`...`) but not .t( or _t( etc
    if (/(?<![a-zA-Z_.$])t\s*\(/.test(line)) {
      tCallLines.push(i + 1);
    }
  }
  
  if (tCallLines.length === 0) continue;
  
  // Check if t is defined
  const hasHookT = /const\s+t\s*=\s*useLanguageStore/.test(c);
  const hasGetStateT = c.includes('useLanguageStore.getState().t');
  const hasParamT = /export\s+(default\s+)?function\s+\w+\s*\([^)]*\bt\b/.test(c) 
    || /=\s*\(\s*\{[^}]*\bt\b[^}]*\}\s*\)/.test(c)
    || /=\s*\([^)]*\bt\b[^)]*\)\s*=>/.test(c);
  const hasMemoT = /const\s+t\s*=\s*useMemo/.test(c);
  const hasDestructT = /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useLanguageStore/.test(c);
  
  const status = hasHookT ? 'hookT' : hasGetStateT ? 'getStateT' : hasParamT ? 'paramT' : hasMemoT ? 'memoT' : hasDestructT ? 'destructT' : 'MISSING';
  
  const shortName = f.replace(/\\/g, '/');
  if (status === 'MISSING') {
    console.log(`❌ BROKEN: ${shortName} (${tCallLines.length} t() calls, lines: ${tCallLines.slice(0,3).join(',')})`);
  }
}

console.log('\n--- Done ---');
