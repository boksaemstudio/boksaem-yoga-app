/**
 * Robust Translation Merge Script
 * 
 * Features:
 * 1. Supports adding new keys and UPDATING existing keys.
 * 2. Preserves the structure and comments of src/utils/translations.js.
 * 3. Handles both flat and nested JSON input.
 * 4. Safe escaping for special characters.
 */
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_PATH = path.join(__dirname, 'src/utils/translations.js');

function escapeValue(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function robustMerge() {
    let content = fs.readFileSync(TRANSLATIONS_PATH, 'utf8');
    
    // Find all JSON files in the project root matching missing_translated_*.json or *_translations.json
    const jsonFiles = fs.readdirSync(__dirname).filter(f => 
        (f.startsWith('missing_translated_') && f.endsWith('.json')) || 
        (f.endsWith('_translations.json'))
    );

    console.log(`Found ${jsonFiles.length} translation files.`);

    let totalAdded = 0;
    let totalUpdated = 0;

    for (const jsonFile of jsonFiles) {
        const filePath = path.join(__dirname, jsonFile);
        console.log(`\nProcessing: ${jsonFile}`);
        
        let rawData;
        try {
            rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            console.error(`  Failed to parse ${jsonFile}: ${e.message}`);
            continue;
        }

        // Determine language from filename or data structure
        let data = {};
        let langFromFilename = jsonFile.match(/(?:missing_translated_|)([a-z]{2})(?:_translations|)\.json/);
        
        if (langFromFilename && !rawData[langFromFilename[1]]) {
            // Flat structure: { key: val }
            data[langFromFilename[1]] = rawData;
        } else {
            // Nested structure: { lang: { key: val } }
            data = rawData;
        }

        for (const [lang, translations] of Object.entries(data)) {
            if (typeof translations !== 'object' || translations === null) continue;
            
            console.log(`  Merging language: ${lang}`);
            
            // Find lang section
            const langPattern = new RegExp(`^(\\s*${lang}:\\s*\\{)`, 'm');
            const langMatch = content.match(langPattern);
            
            if (!langMatch) {
                console.log(`  Language '${lang}' not found in translations.js, skipping`);
                continue;
            }

            const langStartIndex = langMatch.index + langMatch[0].length;
            
            // Find the end of the language block (the matching closing brace)
            // This is a bit tricky with regex, so we'll find the next language or end of object
            let nextLangMatch = content.slice(langStartIndex).match(/^\s*[a-z]{2}:\s*\{/m);
            let langEndIndex = nextLangMatch ? langStartIndex + nextLangMatch.index : content.lastIndexOf('}');

            let langContent = content.slice(langStartIndex, langEndIndex);
            let newLangContent = langContent;

            for (const [key, value] of Object.entries(translations)) {
                if (typeof value !== 'string') continue;
                
                const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const keyPattern = new RegExp(`^(\\s*${escapedKey}:\\s*)"([^"]*(?:\\\\.[^"]*)*)"`, 'm');
                const keyMatch = newLangContent.match(keyPattern);
                
                const escapedValue = escapeValue(value);

                if (keyMatch) {
                    // Update existing key if value is different and not empty in source
                    if (value && keyMatch[2] !== escapedValue) {
                        const originalLine = keyMatch[0];
                        const newLine = `${keyMatch[1]}"${escapedValue}"`;
                        newLangContent = newLangContent.replace(originalLine, newLine);
                        totalUpdated++;
                    }
                } else {
                    // Add new key at the beginning of the lang section
                    const newLine = `\n    ${key}: "${escapedValue}",`;
                    newLangContent = newLine + newLangContent;
                    totalAdded++;
                }
            }

            // Update content
            content = content.slice(0, langStartIndex) + newLangContent + content.slice(langEndIndex);
        }
    }

    if (totalAdded > 0 || totalUpdated > 0) {
        fs.writeFileSync(TRANSLATIONS_PATH, content, 'utf8');
        console.log(`\n✅ Finished merging.`);
        console.log(`   - Added: ${totalAdded} keys`);
        console.log(`   - Updated: ${totalUpdated} keys`);
    } else {
        console.log('\n⚠️ No changes made.');
    }
}

robustMerge();
