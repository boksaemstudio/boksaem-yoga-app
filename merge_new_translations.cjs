/**
 * Merge new translation keys into translations.js
 * Reads a JSON file with {lang: {key: value}} format and merges into existing translations
 */
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_PATH = path.join(__dirname, 'src/utils/translations.js');

// Read translations.js
let content = fs.readFileSync(TRANSLATIONS_PATH, 'utf8');

// Find all JSON files in the project root matching *_translations.json pattern
const jsonFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('_translations.json'));

// Also check for a single new_translations.json
if (fs.existsSync(path.join(__dirname, 'new_translations.json'))) {
  jsonFiles.push('new_translations.json');
}

let totalMerged = 0;

for (const jsonFile of jsonFiles) {
  const filePath = path.join(__dirname, jsonFile);
  console.log(`\nProcessing: ${jsonFile}`);
  
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`  Failed to parse ${jsonFile}: ${e.message}`);
    continue;
  }
  
  for (const [lang, translations] of Object.entries(data)) {
    if (typeof translations !== 'object') continue;
    
    const keys = Object.keys(translations);
    let added = 0;
    let updated = 0;
    
    // Find the lang section in translations.js
    // Pattern: `  lang: {` at the beginning of a line
    const langPattern = new RegExp(`^(\\s*${lang}:\\s*\\{)`, 'm');
    const match = content.match(langPattern);
    
    if (!match) {
      console.log(`  Language '${lang}' not found in translations.js, skipping`);
      continue;
    }
    
    for (const [key, value] of Object.entries(translations)) {
      // Check if key already exists in this language section
      // We need to find the key within the correct language block
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const keyPattern = new RegExp(`(${lang}:\\s*\\{[\\s\\S]*?)${escapedKey}:\\s*["\`]`);
      
      // Escape the value for insertion
      const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
      
      if (keyPattern.test(content)) {
        // Key exists - update it
        // Find and replace the specific key-value pair
        const replacePattern = new RegExp(
          `(${escapedKey}:\\s*)"([^"]*(?:\\\\.[^"]*)*)"`,
          'g'
        );
        
        // Only replace within the correct language section
        // This is complex, so we'll just add new keys for now
        // Skip updates to avoid accidentally modifying wrong sections
        continue;
      } else {
        // Key doesn't exist - add it after the opening brace of the lang section
        const insertPoint = match.index + match[0].length;
        const newLine = `\n    ${key}: "${escapedValue}",`;
        content = content.slice(0, insertPoint) + newLine + content.slice(insertPoint);
        added++;
      }
    }
    
    console.log(`  ${lang}: +${added} new keys`);
    totalMerged += added;
  }
}

if (totalMerged > 0) {
  fs.writeFileSync(TRANSLATIONS_PATH, content, 'utf8');
  console.log(`\n✅ Total ${totalMerged} new keys merged into translations.js`);
} else {
  console.log('\n⚠️ No new keys to merge');
}
