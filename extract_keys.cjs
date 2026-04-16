const fs = require('fs');
const path = require('path');
const koMap = Object.create(null);

function walk(d) {
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f);
    if(fs.statSync(p).isDirectory() && !f.includes('node_modules')) walk(p);
    else if (p.endsWith('.js') || p.endsWith('.jsx')) {
      const c = fs.readFileSync(p, 'utf8');
      
      // We match the t("g_xxx") || ... || "Korean text" pattern
      // To gracefully catch all combinations (including the triple-t bug patterns)
      const matches = c.matchAll(/t\(\s*["'](g_[a-f0-9]+)["']\s*\)\s*\|\|[^\n]*?(?:["']([^"']+)["'])/g);
      for (const m of matches) {
        koMap[m[1]] = m[2];
      }
    }
  });
}
walk('src');

const extractedKeys = Object.keys(koMap);
console.log('Extracted unique g_ keys from code:', extractedKeys.length);
fs.writeFileSync('tmp_ko_map.json', JSON.stringify(koMap, null, 2));

// Load translations.js
const transRaw = fs.readFileSync('src/utils/translations.js', 'utf8');
const koMatches = [...transRaw.matchAll(/["'](g_[a-f0-9]+)["']:/g)];
const currentKoKeys = new Set(koMatches.map(m => m[1]));

console.log('Current keys in translations.js (ko target):', currentKoKeys.size);

const missingInDict = extractedKeys.filter(k => !currentKoKeys.has(k));
console.log('Keys missing from dictionary:', missingInDict.length);
