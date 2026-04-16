const fs = require('fs');

const file = 'src/utils/translations.js';
const code = fs.readFileSync(file, 'utf8');

const tNow = new Date().getTime();
const tempFile = `tmp_extract_translations_${tNow}.cjs`;
let cjsCode = code.replace(/export const translations =/, 'module.exports =');
cjsCode = cjsCode.replace(/import .*/g, '');
fs.writeFileSync(tempFile, cjsCode);

try {
  const translations = require('./' + tempFile);
  const langs = Object.keys(translations);
  
  const masterKeys = new Set();
  langs.forEach(lang => {
    Object.keys(translations[lang]).forEach(k => masterKeys.add(k));
  });
  
  console.log(`\n=== Language Audit ===`);
  console.log(`Total Unique Keys Across All Dictionaries: ${masterKeys.size}`);
  
  langs.forEach(lang => {
    const keys = Object.keys(translations[lang]);
    console.log(`- ${lang.toUpperCase()}: ${keys.length} keys (${masterKeys.size - keys.length} missing)`);
  });
  
  const missingSummary = {};
  langs.forEach(lang => {
    const missing = [];
    masterKeys.forEach(k => {
      if (!(k in translations[lang])) {
         missing.push(k);
      }
    });
    missingSummary[lang] = missing;
  });
  
  fs.writeFileSync('missing_keys.json', JSON.stringify(missingSummary, null, 2));
  
} catch (e) {
  console.error(e);
} finally {
  fs.unlinkSync(tempFile);
}
