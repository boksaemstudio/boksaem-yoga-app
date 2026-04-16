const fs = require('fs');

const tsPath = './src/utils/translations.js';
const content = fs.readFileSync(tsPath, 'utf8');

// safely extract the translations object
const jsBodyStr = content.replace('export const translations = ', '').trim().replace(/;$/, '');
const translations = eval('(' + jsBodyStr + ')');

const langs = ['ko', 'en', 'ja', 'zh', 'es', 'pt', 'ru', 'fr', 'de', 'vi', 'th'];

// Select a few representative keys to test constraints across languages
const keysToCheck = {
    'Currency / Localizing numbers': 'g_190abc',
    'Date / Time shorthand': 'g_cae82d',
    'Domain (Yoga/Meditation)': 'g_31c9a1',
    'Verb/UI Action (Check-in)': 'g_660ceb',
    'Tone / Encouragement': 'g_491a53'
};

for (const [category, key] of Object.entries(keysToCheck)) {
    console.log(`\n=== Category: ${category} (Key: ${key}) ===`);
    for (const lang of langs) {
        if (translations[lang]) {
            console.log(`[${lang}]: ${translations[lang][key]}`);
        } else {
            console.log(`[${lang}]: MISSING ENTIRE LANG`);
        }
    }
}
