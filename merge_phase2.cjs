const fs = require('fs');

const translationsPath = 'src/utils/translations.js';
let code = fs.readFileSync(translationsPath, 'utf8');

const missingEn = JSON.parse(fs.readFileSync('missing_en_localized.json', 'utf8'));
const missingKo = JSON.parse(fs.readFileSync('missing_ko.json', 'utf8')); // missingKo has keys in KO, we will set koKeys[k] = k

// INJECT EN
const enStart = code.lastIndexOf('en: {'); // We use lastIndexOf just in case, but index of works. Let's precise match
const regexEn = /(en:\s*\{)/;
const matchEn = code.match(regexEn);
if (matchEn) {
    let injection = '\n';
    for (const [k, v] of Object.entries(missingEn)) {
        if (!code.substring(matchEn.index, matchEn.index + 20000).includes(`"${k}":`)) {
            injection += `        "${k}": ${JSON.stringify(v)},\n`;
        }
    }
    code = code.substring(0, matchEn.index + matchEn[0].length) + injection + code.substring(matchEn.index + matchEn[0].length);
}

// INJECT KO
const regexKo = /(ko:\s*\{)/;
const matchKo = code.match(regexKo);
if (matchKo) {
    let injection = '\n';
    for (const k of Object.keys(missingKo)) {
        // Only inject if it doesn't already exist.
        // It's possible the key contains spaces, which is totally fine in JS objects strings.
        if (!code.substring(matchKo.index, matchKo.index + 20000).includes(`"${k}":`)) {
            injection += `        ${JSON.stringify(k)}: ${JSON.stringify(k)},\n`;
        }
    }
    code = code.substring(0, matchKo.index + matchKo[0].length) + injection + code.substring(matchKo.index + matchKo[0].length);
}

fs.writeFileSync(translationsPath, code);
console.log(`Successfully merged ${Object.keys(missingEn).length} localized English strings.`);
console.log(`Successfully restored ${Object.keys(missingKo).length} Korean raw string mappings.`);
