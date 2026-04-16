const fs = require('fs');

const tsPath = './src/utils/translations.js';
const content = fs.readFileSync(tsPath, 'utf8');

// Parse the existing translations
const jsBodyStr = content.replace('export const translations = ', '').trim().replace(/;$/, '');
const mainTranslations = eval('(' + jsBodyStr + ')');

const langs = ['ja', 'zh', 'es', 'pt', 'ru', 'fr', 'de', 'vi', 'th'];
let mergedCount = 0;

for (const lang of langs) {
    const patchFile = `missing_translated_${lang}.json`;
    if (!fs.existsSync(patchFile)) {
        console.warn(`Patch file not found for ${lang}, skipping.`);
        continue;
    }
    
    console.log(`Applying patch for [${lang}]...`);
    const patchData = JSON.parse(fs.readFileSync(patchFile, 'utf8'));
    
    let langMergedCount = 0;
    for (const [key, value] of Object.entries(patchData)) {
        // Double check against EN identical to ensure we are actually patching a fallback
        if (value && value.trim() !== '') {
            mainTranslations[lang][key] = value;
            langMergedCount++;
            mergedCount++;
        }
    }
    console.log(` -> Merged ${langMergedCount} keys.`);
}

// Generate secure JSON stringification exactly like finalize_translations does
let newFileContent = "export const translations = {\n";
for (const [lang, dict] of Object.entries(mainTranslations)) {
    newFileContent += `  ${lang}: {\n`;
    for (const [k, v] of Object.entries(dict)) {
        newFileContent += `    ${JSON.stringify(k)}: ${JSON.stringify(v)},\n`;
    }
    newFileContent += "  },\n";
}
newFileContent += "};\n";

fs.writeFileSync(tsPath, newFileContent, 'utf8');
console.log(`\nSuccessfully merged a total of ${mergedCount} translated strings into translations.js.`);
