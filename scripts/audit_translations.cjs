/**
 * COMPREHENSIVE AUDIT: Find ALL t() calls that use named keys (not g_ hashes)
 * and verify whether those keys exist in translations.js
 */
const fs = require('fs');
const path = require('path');

// Load translations file to get ALL defined keys
const translationsContent = fs.readFileSync('src/utils/translations.js', 'utf8');

// Extract all defined keys
const definedKeys = new Set();
const keyRegex = /['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\s*:/g;
let match;
while ((match = keyRegex.exec(translationsContent)) !== null) {
  definedKeys.add(match[1]);
}
console.log(`📚 Translation dictionary: ${definedKeys.size} keys defined\n`);

// Scan all source files for t('namedKey') patterns
function scanDir(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && !['node_modules','dist','.git','scripts'].includes(f.name)) files.push(...scanDir(p));
    else if (f.isFile() && (f.name.endsWith('.jsx')||f.name.endsWith('.js')||f.name.endsWith('.ts')||f.name.endsWith('.tsx')) && !f.name.includes('.cjs') && !f.name.includes('.test.')) files.push(p);
  }
  return files;
}

const allFiles = scanDir('src');
const missingKeys = {}; // key -> [{file, line}]
const allUsedKeys = new Set();

for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Find t('namedKey') or t("namedKey") — but NOT t("g_xxx") hashes
    const tCallRegex = /\bt\s*\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\s*\)/g;
    let m;
    while ((m = tCallRegex.exec(line)) !== null) {
      const key = m[1];
      // Skip hash keys (g_xxxx)
      if (key.startsWith('g_')) continue;
      
      allUsedKeys.add(key);
      
      if (!definedKeys.has(key)) {
        if (!missingKeys[key]) missingKeys[key] = [];
        const relPath = f.replace(/\\/g, '/').replace(/.*\/src\//, 'src/');
        missingKeys[key].push({ file: relPath, line: i + 1 });
      }
    }
  }
}

// Report
const missingList = Object.entries(missingKeys);
console.log(`🔍 Total named keys used: ${allUsedKeys.size}`);
console.log(`❌ Missing keys: ${missingList.length}\n`);

if (missingList.length > 0) {
  console.log('═══ MISSING KEYS ═══\n');
  missingList.sort((a, b) => a[0].localeCompare(b[0]));
  missingList.forEach(([key, locations]) => {
    console.log(`  🔴 "${key}" — used in ${locations.length} place(s):`);
    locations.forEach(loc => {
      console.log(`      ${loc.file}:${loc.line}`);
    });
  });
}

// Also check for English fallback strings in LogsTab (summary cards)
console.log('\n═══ ENGLISH HARDCODED STRINGS CHECK ═══\n');
const englishPatterns = [
  'Total attendance',
  'Multiple attendance',
  'enthusiastic',
  'restriction/refusal',
  'Action Required',
  'number of people',
  'busiest class',
  'participation',
  'Attendance trend',
  '7-day moving average',
];

for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const relPath = f.replace(/\\/g, '/').replace(/.*\/src\//, 'src/');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of englishPatterns) {
      if (lines[i].includes(pattern)) {
        console.log(`  🟡 ${relPath}:${i+1} — "${pattern}"`);
      }
    }
  }
}
