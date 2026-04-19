const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const translationsPath = path.join(__dirname, 'src/utils/translations.js');
let translationsContent = fs.readFileSync(translationsPath, 'utf8');

// A simple parser since require() might fail if the file is being actively modified
// Actually, I already fixed syntax errors, so I can require it.
let translationsData;
try {
  const { translations } = require('./src/utils/translations.js');
  translationsData = translations;
} catch (e) {
  console.error("Failed to require translations.js", e);
  process.exit(1);
}

// 1. Merge user provided data
const userDataPath = path.join(__dirname, 'user_provided_pt_ru_fr.json');
if (fs.existsSync(userDataPath)) {
  const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
  for (const lang in userData) {
    if (!translationsData[lang]) translationsData[lang] = {};
    for (const key in userData[lang]) {
      translationsData[lang][key] = userData[lang][key];
    }
  }
}

// 2. Extract Korean keys
const koreanKeys = Object.keys(translationsData.ko).filter(k => /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(k) || k.includes(' '));

// 3. Generate g_ keys
const koreanToGKey = {};
koreanKeys.forEach(k => {
  const hash = crypto.createHash('md5').update(k).digest('hex').substring(0, 6);
  koreanToGKey[k] = `g_${hash}`;
});

// 4. Update translation objects
const updatedTranslations = {};
for (const lang in translationsData) {
  updatedTranslations[lang] = {};
  for (const key in translationsData[lang]) {
    if (koreanToGKey[key]) {
      updatedTranslations[lang][koreanToGKey[key]] = translationsData[lang][key];
    } else {
      updatedTranslations[lang][key] = translationsData[lang][key];
    }
  }
}

// Ensure all languages have all keys (fallback to English or Korean if missing)
const allKeys = Object.keys(updatedTranslations.ko);
for (const lang in updatedTranslations) {
  if (lang === 'ko') continue;
  allKeys.forEach(key => {
    if (!updatedTranslations[lang][key]) {
      // Missing translation
      // Use English if available, otherwise Korean
      updatedTranslations[lang][key] = updatedTranslations.en[key] || updatedTranslations.ko[key];
    }
  });
}

// 5. Replace in all JSX/JS files
function scanAndReplace(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanAndReplace(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      if (fullPath === translationsPath) continue;
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      // We need to replace t("Korean") with t("g_hash")
      koreanKeys.forEach(k => {
        const gKey = koreanToGKey[k];
        // Handle double quotes
        const searchDouble = `t("${k}")`;
        if (content.includes(searchDouble)) {
          content = content.split(searchDouble).join(`t("${gKey}")`);
          changed = true;
        }
        // Handle single quotes
        const searchSingle = `t('${k}')`;
        if (content.includes(searchSingle)) {
          content = content.split(searchSingle).join(`t("${gKey}")`);
          changed = true;
        }
        // Handle backticks
        const searchBacktick = `t(\`${k}\`)`;
        if (content.includes(searchBacktick)) {
          content = content.split(searchBacktick).join(`t("${gKey}")`);
          changed = true;
        }
      });
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

scanAndReplace(path.join(__dirname, 'src'));

// 6. Write updated translations.js
let newFileContent = "export const translations = {\n";
for (const lang in updatedTranslations) {
  newFileContent += `  ${lang}: {\n`;
  for (const key in updatedTranslations[lang]) {
    const value = updatedTranslations[lang][key];
    newFileContent += `    "${key}": ${JSON.stringify(value)},\n`;
  }
  newFileContent += "  },\n";
}
newFileContent += "};\n";


fs.writeFileSync(translationsPath, newFileContent);
console.log("Updated translations.js with g_ keys and merged data");

// Write out the mapping for reference
fs.writeFileSync(path.join(__dirname, 'korean_to_gkey_mapping.json'), JSON.stringify(koreanToGKey, null, 2));

console.log(`Replaced ${koreanKeys.length} Korean keys with g_ keys.`);
