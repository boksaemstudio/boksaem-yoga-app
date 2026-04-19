const fs = require('fs');
const translateModule = require('translate');
const translate = translateModule.default || translateModule;

translate.engine = 'google';
const translationsPath = './src/utils/translations.js';
let translationsData = require(translationsPath).translations;
const langsToProcess = ['pt', 'ru', 'fr', 'en'];

async function processTranslations() {
    for (const lang of langsToProcess) {
        const targetObj = translationsData[lang];
        const koObj = translationsData.ko;
        let missingKeys = [];
        for (const key in koObj) {
            if (targetObj[key] === koObj[key] || (lang !== 'en' && targetObj[key] === translationsData.en[key])) {
                missingKeys.push(key);
            }
        }
        console.log(lang, 'missing:', missingKeys.length);
        for (let i = 0; i < missingKeys.length; i+=50) {
            const batch = missingKeys.slice(i, i+50);
            await Promise.all(batch.map(async k => {
                try {
                    targetObj[k] = await translate(koObj[k], {from:'ko', to: lang === 'en' ? 'en' : lang});
                } catch(e){}
            }));
            console.log(lang, 'translated', Math.min(i+50, missingKeys.length));
            await new Promise(r=>setTimeout(r, 2000));
        }
    }
    let newFileContent = 'export const translations = {\n';
    for (const lang in translationsData) {
        newFileContent += '  ' + lang + ': {\n';
        for (const key in translationsData[lang]) {
            newFileContent += '    "' + key + '": ' + JSON.stringify(translationsData[lang][key]) + ',\n';
        }
        newFileContent += '  },\n';
    }
    fs.writeFileSync(translationsPath, newFileContent);
    console.log('Done mapping rest!');
}
processTranslations();
