const fs = require('fs');
const path = require('path');

const tsPath = path.join(__dirname, 'src', 'utils', 'translations.js');
let tsContent = fs.readFileSync(tsPath, 'utf8');

// The 10 languages from LanguageSelector.jsx
const targetLangs = ['ko', 'en', 'ja', 'zh', 'es', 'pt', 'ru', 'fr', 'de', 'vi', 'th'];

// 4. Extract currentTranslations first so we can use English keys for backfilling
const jsBodyStr = tsContent.replace('export const translations = ', '');
let currentTranslations = {};
try {
  // safe eval by trimming trailing semicolon or spaces
  const cleanStr = jsBodyStr.trim().replace(/;$/, '');
  currentTranslations = eval('(' + cleanStr + ')');
} catch (e) {
  console.log("Could not eval translations.js", e);
}

// 1. Get the current English keys.
let enDict = currentTranslations['en'] || {};
if (fs.existsSync('incoming_en_chunk.json')) {
  try {
    Object.assign(enDict, JSON.parse(fs.readFileSync('incoming_en_chunk.json', 'utf8')));
  } catch (e) {
    console.log('Error reading EN chunk', e);
  }
}

const masterKeys = Object.keys(enDict);
console.log(`Master EN dictionary has ${masterKeys.length} keys.`);

const getChunksFor = (lang) => {
  const files = fs.readdirSync('.').filter(f => f.startsWith('incoming_' + lang) && f.endsWith('.json'));
  let dict = {};
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      Object.assign(dict, data);
    } catch (e) {
      console.log(`Error reading ${f}`);
    }
  }
  return dict;
};

// 3. Build dictionaries for all 9 languages
const finalDicts = {};
for (const lang of targetLangs) {
  finalDicts[lang] = getChunksFor(lang);
  console.log(`${lang} loaded with ${Object.keys(finalDicts[lang]).length} keys before backfilling.`);
}



for (const lang of targetLangs) {
   if (currentTranslations[lang]) {
      // merge anything currently in translations.js into finalDicts, but let chunks override
      finalDicts[lang] = { ...currentTranslations[lang], ...finalDicts[lang] };
   }
}

// 5. Backfill non-Korean languages with EN
for (const lang of targetLangs) {
  if (lang === 'en' || lang === 'ko') continue; 
  let backfilled = 0;
  for (const k of masterKeys) {
    if (!finalDicts[lang][k]) {
      finalDicts[lang][k] = enDict[k]; // backfill with English
      backfilled++;
    }
  }
  console.log(`${lang} backfilled ${backfilled} keys with EN. Total: ${Object.keys(finalDicts[lang]).length}`);
}

// Re-generate translations.js
let newFileContent = `export const translations = {\n`;

for (const lang of targetLangs) {
   newFileContent += `    ${lang}: {\n`;
   for (const [k, v] of Object.entries(finalDicts[lang])) {
      newFileContent += `        ${JSON.stringify(k)}: ${JSON.stringify(v)},\n`;
   }
   newFileContent += `    },\n`;
}

newFileContent += `};\n`;

fs.writeFileSync('src/utils/translations.js', newFileContent, 'utf8');
console.log('Saved to src/utils/translations.js');
