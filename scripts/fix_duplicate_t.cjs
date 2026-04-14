/**
 * fix_duplicate_t.cjs - props로 t를 받는 컴포넌트에서 중복 const t 선언을 제거
 */
const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    fs.readdirSync(dir).forEach(f => {
      if (f === 'node_modules' || f === 'dist' || f === '.git') return;
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) results = results.concat(walk(p));
      else if (f.endsWith('.jsx') || f.endsWith('.js')) results.push(p);
    });
  } catch(e) {}
  return results;
}

let fixed = 0;
walk('src').forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  // Check if this component receives t as a prop
  // Pattern: destructured props like { ..., t, ... } or { ..., t } 
  const propPattern = /\(\s*\{[^}]*\bt\b[^}]*\}\s*\)\s*=>/s;
  const hasTProp = propPattern.test(content);
  
  if (!hasTProp) return;
  
  // Check if there's also a const t = useLanguageStore declaration
  const hookPattern = /\n\s*const t = useLanguageStore\(s => s\.t\);\n/;
  if (hookPattern.test(content)) {
    content = content.replace(hookPattern, '\n');
    fs.writeFileSync(f, content);
    console.log('✅ Removed duplicate t: ' + f);
    fixed++;
  }
});

console.log('\nFixed: ' + fixed + ' files');
