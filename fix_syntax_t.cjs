const fs = require('fs');
const path = require('path');
let count = 0;

function walk(d) {
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f);
    if(fs.statSync(p).isDirectory() && !f.includes('node_modules') && !f.includes('.git')) walk(p);
    else if (p.endsWith('.js') || p.endsWith('.jsx')) {
      let c = fs.readFileSync(p, 'utf8');
      
      // Match t("g_xxx" || "Korean Text") where inside t() the || happens
      // e.g. t("g_8f1334" || "오늘 새로 등록하거나")
      // We want to extract key and fallback, and move || outside t()
      
      const regex = /t\(\s*(["']g_[a-f0-9]+["'])\s*\|\|\s*([^)]+)\s*\)/g;
      
      // We should check if the file actually has it to avoid rewriting unnecessarily
      let matchCount = 0;
      let newC = c.replace(regex, (match, key, fallback) => {
        matchCount++;
        count++;
        // Output: t("g_xxx") || fallback
        return `(t(${key}) || ${fallback})`;
      });

      // Special case: t(t("g_xxx") || "fb" || "fb") which might have happened with my triple t replacer
      // But the main issue is t("key" || "fallback")
      
      if (matchCount > 0) {
        fs.writeFileSync(p, newC);
        console.log(`Fixed ${matchCount} matches in ${p}`);
      }
    }
  });
}
walk('src');
console.log('Total fixed:', count);
