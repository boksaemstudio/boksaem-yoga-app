/**
 * ULTIMATE FIX: Scan ALL language sections (en, ru, zh, ja, es, pt, fr, de)
 * Find EVERY Korean-text key that exists in any non-ko section
 * Add identity mapping to ko section
 * 
 * Also scan ALL source files to find t("한국어 텍스트") calls
 * and ensure each has a ko identity mapping
 */
const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(__dirname + '/../src/utils/translations.js', 'utf8');

// 1. Find ko section content (for checking existing keys)
const koStart = content.indexOf('ko: {');
const enStart = content.indexOf('    en: {');
const koSection = content.substring(koStart, enStart);

// 2. Find ALL Korean-text keys in ALL non-ko sections
const allSectionsStart = enStart;
const restOfFile = content.substring(allSectionsStart);

const koreanKeyRegex = /"((?:[^"\\]|\\.)*[\uAC00-\uD7AF](?:[^"\\]|\\.)*)"\s*:\s*"/g;
let match;
const allKoreanKeys = new Set();

while ((match = koreanKeyRegex.exec(restOfFile)) !== null) {
  allKoreanKeys.add(match[1]);
}

console.log(`Found ${allKoreanKeys.size} unique Korean-text keys in non-ko sections`);

// 3. Also scan ALL source files for t("한국어") calls
function scanDir(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && !['node_modules','dist','.git','scripts'].includes(f.name)) files.push(...scanDir(p));
    else if (f.isFile() && (f.name.endsWith('.jsx')||f.name.endsWith('.js')||f.name.endsWith('.tsx')||f.name.endsWith('.ts')) && !f.name.includes('.cjs')) files.push(p);
  }
  return files;
}

const srcFiles = scanDir(__dirname + '/../src');
for (const f of srcFiles) {
  const src = fs.readFileSync(f, 'utf8');
  const tCallRegex = /\bt\s*\(\s*["']((?:[^"'\\]|\\.)*[\uAC00-\uD7AF](?:[^"'\\]|\\.)*)['"]\s*\)/g;
  let m;
  while ((m = tCallRegex.exec(src)) !== null) {
    allKoreanKeys.add(m[1]);
  }
}

console.log(`Total unique Korean-text keys (all sources): ${allKoreanKeys.size}`);

// 4. Check which are missing from ko
const toAdd = {};
allKoreanKeys.forEach(key => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`"${escaped}"\\s*:`).test(koSection)) {
    toAdd[key] = key; // Identity mapping
  }
});

console.log(`Missing from ko: ${Object.keys(toAdd).length}`);

// 5. Inject into ko section (before en section)
if (Object.keys(toAdd).length > 0) {
  const lines = Object.entries(toAdd)
    .map(([k, v]) => `    "${k.replace(/"/g, '\\"')}": "${v.replace(/"/g, '\\"')}",`)
    .join('\n');

  const injection = `\n    // ═══ Korean identity keys (ALL) ═══\n${lines}\n`;
  
  // Insert just before en: {
  const insertPos = content.indexOf('    en: {');
  const beforeInsert = content.lastIndexOf('\n', insertPos);
  
  const newContent = content.slice(0, beforeInsert) + injection + content.slice(beforeInsert);
  
  fs.writeFileSync(__dirname + '/../src/utils/translations.js', newContent);
  console.log(`✅ Injected ${Object.keys(toAdd).length} identity keys total`);
} else {
  console.log('✅ No missing keys!');
}

// Verify syntax
try {
  require('child_process').execSync('node -c ' + __dirname + '/../src/utils/translations.js', { stdio: 'pipe' });
  console.log('✅ Syntax check passed');
} catch (e) {
  console.error('❌ SYNTAX ERROR! Rolling back...');
  fs.writeFileSync(__dirname + '/../src/utils/translations.js', content);
}
