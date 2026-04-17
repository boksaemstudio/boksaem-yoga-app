const fs = require('fs');

const { translations: oldT } = require('./old_translations_mod.cjs');
const result = {};

for (const lang of ['ja','zh','es','pt','ru','fr','de','vi','th']) {
    result[lang] = {};
    if (!oldT[lang]) continue;
    for (const [key, value] of Object.entries(oldT[lang])) {
        if (key.startsWith('g_')) {
            result[lang][key] = value;
        }
    }
}

fs.writeFileSync('recovered_g_translations.json', JSON.stringify(result, null, 2), 'utf8');
console.log('Recovered g_ translations for 9 languages');
