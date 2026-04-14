const fs = require('fs');
const path = require('path');

// Walk all .js, .jsx, .ts, .tsx files in src/
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
      } else if (/\.(jsx?|tsx?)$/.test(file)) {
        results.push(filepath);
      }
    });
  } catch(e) {}
  return results;
}

const files = walk('./src');

// For each file, check if t("g_...") is called at MODULE LEVEL (not inside a function)
// The real issue: files that use t() but DON'T define it
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  
  // Check for bare t("g_ calls
  const tCalls = content.match(/\bt\(["']g_[^"']+["']\)/g);
  if (!tCalls) return;
  
  // Check if t is defined in this file
  const hasHookT = content.includes('useLanguageStore(s => s.t)') || 
                   content.includes('useLanguageStore(s=>s.t)') ||
                   content.includes("useLanguageStore(s => s.t)");
  const hasDestructuredT = content.includes('} = useLanguage()') || 
                           content.includes('} = useLanguageStore()');
  const hasParamT = /function\s+\w+\s*\([^)]*\bt\b[^)]*\)/.test(content) ||
                    /\(\s*[^)]*\bt\b[^)]*\)\s*=>/.test(content) ||
                    /\(\s*\{[^}]*\bt\b[^}]*\}\s*\)/.test(content);
  const hasConstT = /const\s+t\s*=/.test(content);
  
  if (!hasHookT && !hasDestructuredT && !hasParamT && !hasConstT) {
    console.log(`\n❌ MISSING t() definition: ${f}`);
    console.log(`   Found ${tCalls.length} t() calls`);
    // Show first 3
    tCalls.slice(0, 3).forEach(c => console.log(`   Example: ${c}`));
  }
});

console.log('\n✅ Scan complete.');
