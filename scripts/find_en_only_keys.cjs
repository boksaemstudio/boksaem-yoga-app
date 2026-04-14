/**
 * COMPREHENSIVE: Find ALL keys in en/ru/etc sections that are MISSING from ko
 * These are the keys causing English text to show for Korean users
 */
const fs = require('fs');
const content = fs.readFileSync(__dirname + '/../src/utils/translations.js', 'utf8');

// Parse sections manually
const sections = {};
const sectionRegex = /^\s+(\w+):\s*\{/gm;
let match;
const sectionStarts = [];
while ((match = sectionRegex.exec(content)) !== null) {
  sectionStarts.push({ lang: match[1], start: match.index + match[0].length });
}

// Extract keys from each section
function extractKeys(text, startPos, nextStartPos) {
  const sectionText = text.substring(startPos, nextStartPos || text.length);
  const keys = {};
  // Match "key": "value" or key: "value"
  const kvRegex = /["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = kvRegex.exec(sectionText)) !== null) {
    keys[m[1]] = m[2];
  }
  return keys;
}

for (let i = 0; i < sectionStarts.length; i++) {
  const { lang, start } = sectionStarts[i];
  const nextStart = i + 1 < sectionStarts.length ? sectionStarts[i + 1].start - 20 : undefined;
  sections[lang] = extractKeys(content, start, nextStart);
}

const koKeys = new Set(Object.keys(sections.ko || {}));
const enKeys = sections.en || {};

// Find keys in EN that are MISSING from KO
const missingInKo = {};
Object.entries(enKeys).forEach(([key, enValue]) => {
  if (!koKeys.has(key)) {
    missingInKo[key] = enValue;
  }
});

console.log(`ko: ${koKeys.size} keys`);
console.log(`en: ${Object.keys(enKeys).length} keys`);
console.log(`\n❌ Keys in EN but missing from KO: ${Object.keys(missingInKo).length}\n`);

// Show sample of missing keys with their English values
Object.entries(missingInKo).slice(0, 50).forEach(([key, val]) => {
  console.log(`  "${key}": "${val.substring(0, 60)}${val.length > 60 ? '...' : ''}"`);
});

if (Object.keys(missingInKo).length > 50) {
  console.log(`  ... and ${Object.keys(missingInKo).length - 50} more`);
}

// Write the full mapping for fixing
fs.writeFileSync(__dirname + '/en_missing_from_ko.json', JSON.stringify(missingInKo, null, 2));
console.log('\n✅ Full list saved to scripts/en_missing_from_ko.json');
