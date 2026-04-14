const fs = require('fs');

const extractedPath = 'extracted_keys.json';
const enPatchPath = 'en_translations_patch.json';

if (!fs.existsSync(extractedPath)) {
    console.error("No extracted keys found");
    process.exit(1);
}

const koKeys = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));
const enKeys = JSON.parse(fs.readFileSync(enPatchPath, 'utf8'));

let transFile = fs.readFileSync('src/utils/translations.js', 'utf8');

// Using standard replacement logic
let koIndex = transFile.indexOf('ko: {');
if (koIndex !== -1) {
    let injectStr = '\n        // --- Auto-Injected Extraction Keys ---\n';
    for (const [k, v] of Object.entries(koKeys)) {
        injectStr += `        ${k}: ${JSON.stringify(v)},\n`;
    }
    transFile = transFile.slice(0, koIndex + 5) + injectStr + transFile.slice(koIndex + 5);
}

let enIndex = transFile.indexOf('en: {');
if (enIndex !== -1) {
    let injectStr = '\n        // --- Auto-Injected Extraction Keys ---\n';
    for (const [k, v] of Object.entries(enKeys)) {
        injectStr += `        ${k}: ${JSON.stringify(v)},\n`;
    }
    transFile = transFile.slice(0, enIndex + 5) + injectStr + transFile.slice(enIndex + 5);
}

fs.writeFileSync('src/utils/translations.js', transFile);
console.log(`Successfully injected ${Object.keys(koKeys).length} dynamic keys into ko and en dictionaries!`);
