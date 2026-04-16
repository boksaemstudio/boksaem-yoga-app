const fs = require('fs');
const path = require('path');

const tsPath = path.join(__dirname, 'src', 'utils', 'translations.js');
let tsContent = fs.readFileSync(tsPath, 'utf8');

const objectString = tsContent.replace('export const translations =', '').trim().replace(/;$/, '');
let t = new Function('return ' + objectString)();

const langs = ['ja', 'zh', 'es', 'pt', 'ru', 'fr', 'de', 'vi', 'th'];

for (const lang of langs) {
    const file = `missing_translated_${lang}.json`;
    if (fs.existsSync(file)) {
        if (!t[lang]) t[lang] = {};
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        Object.assign(t[lang], data);
    }
}

const finalCode = `export const translations = {\n` +
      Object.keys(t).map(lang => {
        return `  ${lang}: {\n` + Object.keys(t[lang]).map(k => {
            const safeKey = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(k) ? k : JSON.stringify(k);
            return `    ${safeKey}: ${JSON.stringify(t[lang][k])}`;
        }).join(',\n') + `\n  }`;
      }).join(',\n') + `\n};\n`;
      
fs.writeFileSync(tsPath, finalCode, 'utf8');
console.log("Cached translations merged back.");
