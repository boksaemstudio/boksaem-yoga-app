const fs = require('fs');

const TRANSLATIONS_PATH = './src/utils/translations.js';
let content = fs.readFileSync(TRANSLATIONS_PATH, 'utf8');
const objString = content.replace('export const translations = ', '').trim().replace(/;$/, '');
const t = eval('(' + objString + ')');

const langsToPatch = ['zh', 'pt'];
let missingKeys = {};

for (const lang of langsToPatch) {
    missingKeys[lang] = {};
    for (const [key, enVal] of Object.entries(t.en)) {
        if (!enVal) continue;
        const localVal = t[lang][key];
        
        // Skip structural UI elements that are fine in English
        const ignorableKeys = ['ticketType', 'startDate', 'navKiosk', 'management', 'weatherPrefix', 'class_mysore', 'class_vinyasa', 'class_hatha', 'class_ashtanga', 'healthConnected'];
        if (ignorableKeys.includes(key)) continue;

        if (!localVal || localVal === '' || localVal === enVal) {
            // Include if length > 3 or it has variables
            if (enVal.length > 3 || enVal.includes('{')) {
                missingKeys[lang][key] = enVal;
            }
        }
    }
}

const totalZH = Object.keys(missingKeys.zh).length;
const totalPT = Object.keys(missingKeys.pt).length;
console.log(`Needs translation -> ZH: ${totalZH}, PT: ${totalPT}`);

// To translate securely, we write them out for a secure batch pipeline
fs.writeFileSync('smart_translate_queue.json', JSON.stringify(missingKeys, null, 2));
