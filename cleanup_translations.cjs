const fs = require('fs');

const fPath = 'src/utils/translations.js';
let code = fs.readFileSync(fPath, 'utf8');

fs.writeFileSync('tmp_clean.cjs', code.replace(/export const translations =/, 'module.exports =').replace(/import .*/g, ''));
const t = require('./tmp_clean.cjs');
fs.unlinkSync('tmp_clean.cjs');

// Save the resulting clean object back
let outContent = `export const translations = {\n`;
for (const lang of Object.keys(t)) {
    outContent += `    ${lang}: {\n`;
    for (const [k, v] of Object.entries(t[lang])) {
        outContent += `        ${JSON.stringify(k)}: ${JSON.stringify(v)},\n`;
    }
    outContent += `    },\n`;
}
outContent += `};\n`;

fs.writeFileSync(fPath, outContent);
console.log('Cleaned translations.js. Duplicates removed.');
