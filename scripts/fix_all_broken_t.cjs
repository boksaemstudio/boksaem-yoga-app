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
let fixedCount = 0;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  
  // Check for bare t("g_ calls
  const tCalls = content.match(/\bt\(["']g_[^"']+["']\)/g);
  if (!tCalls) return;
  
  // Check if t is properly defined
  const hasHookT = content.includes('useLanguageStore(s => s.t)') || 
                   content.includes('useLanguageStore(s=>s.t)');
  const hasDestructuredT = content.includes('} = useLanguage()') || 
                           content.includes('} = useLanguageStore()');
  const hasParamT = /function\s+\w+\s*\([^)]*\bt\b[^)]*\)/.test(content) ||
                    /=>\s*\{/.test(content) && /\(\s*[^)]*\bt\b[^)]*\)/.test(content);
  const hasConstT = /const\s+t\s*=/.test(content);
  
  if (hasHookT || hasDestructuredT || hasConstT) return;
  
  // For React components that receive t as a prop - check more carefully
  // If t is passed as prop like ({t, ...}) => ..., it's fine
  const hasPropT = /\(\s*\{\s*[^}]*\bt\b[^}]*\}\s*\)/.test(content);
  if (hasPropT) return;
  
  // This file uses t() but doesn't define it. Fix it by stripping t("g_xxx") || patterns
  let fixed = content;
  
  // Pattern: t("g_xxx") || t("g_xxx") || ... || "fallback" -> "fallback"
  // First strip chained t() || t() || patterns  
  fixed = fixed.replace(/t\(["']g_[a-f0-9]+["']\)\s*\|\|\s*/g, '');
  
  // Any remaining standalone t("g_xxx") that are not part of ||
  // These might be sole expressions - replace with null
  fixed = fixed.replace(/\bt\(["']g_[a-f0-9]+["']\)/g, 'null');
  
  if (fixed !== content) {
    fs.writeFileSync(f, fixed);
    fixedCount++;
    console.log(`✅ Fixed: ${f} (${tCalls.length} t() calls cleaned)`);
  }
});

console.log(`\n🎉 Total files fixed: ${fixedCount}`);
