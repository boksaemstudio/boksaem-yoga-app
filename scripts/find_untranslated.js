import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function findUntranslated() {
  const translationsPath = path.join(__dirname, '../src/utils/translations.js');
  const module = await import('file://' + translationsPath.replace(/\\/g, '/'));
  const translations = module.translations;
  const enKeys = new Set(Object.keys(translations.en || {}));
  
  const srcDir = path.join(__dirname, '../src');
  
  const extractT = (filePath, content) => {
      // match t("key") or t('key') or t(`key`)
      // also match t("key") || "fallback"
      const regex = /t\s*\(\s*['"`]([^'"`]+)['"`]/g;
      let match;
      const found = new Set();
      while ((match = regex.exec(content)) !== null) {
          found.add(match[1]);
      }
      return Array.from(found);
  };
  
  const walk = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
          file = path.join(dir, file);
          const stat = fs.statSync(file);
          if (stat && stat.isDirectory()) {
              results = results.concat(walk(file));
          } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
              results.push(file);
          }
      });
      return results;
  };
  
  const files = walk(srcDir);
  const untranslatedKeys = new Set();
  
  files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const keys = extractT(file, content);
      keys.forEach(k => {
          if (!enKeys.has(k)) {
              untranslatedKeys.add(k);
          }
      });
  });
  
  const resultList = Array.from(untranslatedKeys);
  console.log(`Found ${resultList.length} unique keys in source code that DO NOT exist in translations.en`);
  
  // Also collect keys that exist in EN but contain Korean chars
  const koreanVals = [];
  for (const k of enKeys) {
      if (/[가-힣]/.test(translations.en[k])) {
          koreanVals.push(k);
      }
  }
  
  fs.writeFileSync(path.join(__dirname, 'missing_in_source.json'), JSON.stringify({
      keysUsedInSourceButNotInDict: resultList,
      keysInDictWithKoreanValue: koreanVals
  }, null, 2));
  
  console.log(`Wrote results to scripts/missing_in_source.json`);
}

findUntranslated();
