import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyze() {
  const translationsPath = path.join(__dirname, '../src/utils/translations.js');
  // Dynamic import instead of eval
  try {
      const module = await import('file://' + translationsPath.replace(/\\/g, '/'));
      const translations = module.translations;
      
      const locales = Object.keys(translations);
      console.log('Supported Locales:', locales.join(', '));
      
      const koKeys = Object.keys(translations.ko);
      console.log(`Korean keys count: ${koKeys.length}`);
      
      const missingData = {};
      
      for (const locale of locales) {
        if (locale === 'ko') continue;
        
        const localeKeys = Object.keys(translations[locale] || {});
        const missingKeys = koKeys.filter(k => !(k in translations[locale]));
        
        missingData[locale] = missingKeys;
        console.log(`Locale: ${locale} | Missing keys: ${missingKeys.length}`);
        
        // Also check how many keys in this locale contain Korean characters
        let koValsCount = 0;
        const koreanRegex = /[가-힣]/;
        for (const k of localeKeys) {
            if (k in translations.ko && k in translations[locale]) {
               if (koreanRegex.test(translations[locale][k])) {
                   koValsCount++;
               }
            }
        }
        console.log(`Locale: ${locale} | Values with Korean chars: ${koValsCount}`);
      }
      
      fs.writeFileSync(path.join(__dirname, 'missing_keys.json'), JSON.stringify(missingData, null, 2));
      console.log('Missing keys written to scripts/missing_keys.json');
      
  } catch (e) {
      console.error("Import error:", e);
  }
}

analyze();
