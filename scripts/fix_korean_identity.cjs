/**
 * FIX: For EVERY Korean-string key in en section, add identity mapping to ko section
 * e.g., ko["총 출석 완료"] = "총 출석 완료"
 * This ensures Korean text is shown for Korean users instead of English translations
 */
const fs = require('fs');
const content = fs.readFileSync(__dirname + '/../src/utils/translations.js', 'utf8');

// Find en section boundaries
const enStart = content.indexOf('    en: {');
const enEnd = content.indexOf('\n    },', enStart + 100);

// Find all Korean-string keys in en section
const enSection = content.substring(enStart, enEnd);
const koreanKeyRegex = /"([\u3000-\u9FFF\uAC00-\uD7AF\u1100-\u11FF\uF900-\uFAFF\u2600-\u27BF\u2702-\u27B0\ufe0f⚡⚠️⏰📝👆✅❌🔄📸📍📊🧘🎯💪🌟\s\w\-\(\)\/\*\.!?%:,~·\"\\?\!\<\>【】「」]+)"\s*:\s*"([^"]+)"/g;
let match;
const koreanIdentityKeys = {};

while ((match = koreanKeyRegex.exec(enSection)) !== null) {
  const key = match[1];
  // Only add keys that contain Korean characters
  if (/[\uAC00-\uD7AF]/.test(key)) {
    koreanIdentityKeys[key] = key; // Identity mapping: ko["한국어"] = "한국어"
  }
}

console.log(`Found ${Object.keys(koreanIdentityKeys).length} Korean-string keys in en section`);

// Check which ones are already in ko section
const koEnd = content.indexOf('    en: {');
const koSection = content.substring(0, koEnd);

let toAdd = {};
Object.entries(koreanIdentityKeys).forEach(([key, val]) => {
  // Check if key already exists in ko section
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`"${escapedKey}"\\s*:`).test(koSection)) {
    toAdd[key] = val;
  }
});

console.log(`Need to add ${Object.keys(toAdd).length} identity keys to ko section`);

// Inject into ko section
const endMarker = '    // ═══ END AUTO-INJECTED ═══';
let endPos = content.indexOf(endMarker);

// If no end marker, find the end of the last auto-injected block
if (endPos === -1) {
  // Find last injected key before en section  
  // Insert just before en section
  const enStartLine = content.lastIndexOf('\n', enStart);
  // Go back to find the closing } of ko section
  const koClose = content.lastIndexOf('},', enStart);
  endPos = koClose;
}

const newLines = Object.entries(toAdd)
  .map(([k, v]) => `    "${k.replace(/"/g, '\\"')}": "${v.replace(/"/g, '\\"')}",`)
  .join('\n');

const injection = `\n    // ═══ Korean identity keys (prevent English fallback) ═══\n${newLines}\n`;

let newContent = content.slice(0, endPos) + injection + content.slice(endPos);

fs.writeFileSync(__dirname + '/../src/utils/translations.js', newContent);
console.log(`✅ Injected ${Object.keys(toAdd).length} Korean identity keys`);
