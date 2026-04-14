const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filepath = path.join(dir, file);
      const stat = fs.statSync(filepath);
      if (stat.isDirectory()) {
        if (!file.includes('node_modules') && !file.includes('.git')) {
          results = results.concat(walk(filepath));
        }
      } else if (/\.(jsx?|tsx?)$/.test(file) && !file.includes('.test.')) {
        results.push(filepath);
      }
    });
  } catch(e) {}
  return results;
}

const files = walk('./src');

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  
  // Check for ANY t("...") or t('...') call 
  const tCalls = content.match(/\bt\(['"][^'"]+['"]\)/g);
  if (!tCalls) return;
  
  // Check if t is defined via hook, props, const, or parameter
  const hasHookT = /useLanguageStore\(s\s*=>\s*s\.t\)/.test(content) || 
                   /useLanguageStore\(s=>s\.t\)/.test(content);
  const hasDestructuredT = /\}\s*=\s*useLanguage/.test(content);
  const hasPropT = /\(\s*\{[^}]*\bt\b[^}]*\}\s*\)/.test(content);
  const hasConstT = /const\s+t\s*=/.test(content);
  const hasLetT = /let\s+t\s*=/.test(content);
  
  // Check if it's a class component with this.t or similar
  const hasClassT = /this\.t/.test(content);
  
  if (!hasHookT && !hasDestructuredT && !hasPropT && !hasConstT && !hasLetT && !hasClassT) {
    console.log(`\n❌ ${f}`);
    console.log(`   ${tCalls.length} t() calls, NO t definition found`);
    tCalls.slice(0, 3).forEach(c => console.log(`   Example: ${c}`));
  }
});

console.log('\n✅ Done');
