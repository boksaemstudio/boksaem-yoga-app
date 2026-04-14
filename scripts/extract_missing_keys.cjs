const fs = require('fs');
const path = require('path');

function walk(d) {
  let r = [];
  try {
    fs.readdirSync(d).forEach(f => {
      if (['node_modules', 'dist', '.git', 'public', 'assets'].includes(f)) return;
      let p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) {
         r = r.concat(walk(p));
      } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
         r.push(p);
      }
    });
  } catch (e) {}
  return r;
}

let keys = {};
walk('src').forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let lines = c.split('\n');
  lines.forEach(line => {
    // Basic extraction for: t("g_XXXXX") || "Korean"
    // e.g. {t("g_d4bfea") || t("g_d4bfea") || "\uC120\uC0DD\uB2D8 \uC120\uD0DD"}
    // Just find all g_XXXXX and the string following it.
    let m = line.match(/t\(['"](g_[a-z0-9]+)['"]\).*?\|\|\s*['"]([^'"]+)['"]/);
    if (m) {
        keys[m[1]] = m[2];
    }
  });
});

console.log('Extracted unique keys:', Object.keys(keys).length);
fs.writeFileSync('extracted_keys.json', JSON.stringify(keys, null, 2));

// Generate mock translations for 'en' just to see if we can do true SaaS
let enTranslations = {};
for (const [key, koStr] of Object.entries(keys)) {
    // Decode unicode escapes
    let decoded = koStr.replace(/\\u[\dA-F]{4}/gi, 
          (match) => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16)));
    enTranslations[key] = `[EN] ${decoded}`;
}
fs.writeFileSync('en_translations_patch.json', JSON.stringify(enTranslations, null, 2));

