// Script to inject collapse/expand and settingUp translation keys
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'utils', 'translations.js');
let content = fs.readFileSync(filePath, 'utf8');

const keys = {
  ko: `
        // Collapsible Card & Common
        collapse: "접기",
        expand: "펼치기",
        settingUp: "설정중",`,

  en: `
        // Collapsible Card & Common
        collapse: "Collapse",
        expand: "Expand",
        settingUp: "Setting up",`,

  ja: `
        // Collapsible Card & Common
        collapse: "閉じる",
        expand: "開く",
        settingUp: "設定中",`,

  ru: `
        // Collapsible Card & Common
        collapse: "Свернуть",
        expand: "Развернуть",
        settingUp: "Настройка",`,

  zh: `
        // Collapsible Card & Common
        collapse: "收起",
        expand: "展开",
        settingUp: "设置中",`,

  es: `
        // Collapsible Card & Common
        collapse: "Cerrar",
        expand: "Abrir",
        settingUp: "Configurando",`,

  pt: `
        // Collapsible Card & Common
        collapse: "Fechar",
        expand: "Abrir",
        settingUp: "Configurando",`,

  fr: `
        // Collapsible Card & Common
        collapse: "Réduire",
        expand: "Développer",
        settingUp: "Configuration",`,

  de: `
        // Collapsible Card & Common
        collapse: "Einklappen",
        expand: "Aufklappen",
        settingUp: "Einrichten",`,
};

let insertCount = 0;

for (const [lang, keysToInsert] of Object.entries(keys)) {
  const langStart = content.indexOf(`    ${lang}: {`);
  if (langStart === -1) continue;

  const blockEnd = content.indexOf('\n    },', langStart + 10);
  if (blockEnd === -1) continue;

  const blockContent = content.substring(langStart, blockEnd);
  if (blockContent.includes("collapse:")) {
    console.log(`[SKIP] ${lang}: collapse key already exists`);
    continue;
  }

  // Find navSettings as anchor (last key we inserted)
  const anchor = 'navSettings:';
  const anchorIdx = content.indexOf(anchor, langStart);
  if (anchorIdx !== -1 && anchorIdx < blockEnd) {
    const lineEnd = content.indexOf('\n', anchorIdx);
    content = content.slice(0, lineEnd) + keysToInsert + content.slice(lineEnd);
    console.log(`[OK] ${lang}: inserted collapse/expand keys`);
    insertCount++;
  } else {
    content = content.slice(0, blockEnd) + keysToInsert + content.slice(blockEnd);
    console.log(`[OK] ${lang}: inserted collapse/expand keys (fallback)`);
    insertCount++;
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\nDone! Inserted collapse/expand keys into ${insertCount} language blocks.`);
