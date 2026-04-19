import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const locales = ['en', 'ja', 'zh', 'es', 'pt', 'ru', 'fr', 'de', 'vi', 'th'];

const koDict = JSON.parse(fs.readFileSync(path.join(__dirname, 'ko_dictionary.json'), 'utf8'));
const entries = Object.entries(koDict);

async function translateText(text, targetLang, retries = 3) {
    if (!text || text.trim() === '') return text;
    let tl = targetLang;
    if (tl === 'zh') tl = 'zh-CN';
    
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return data[0].map(x => x[0]).join('');
        } catch (e) {
            if (i === retries - 1) {
                console.error(`Failed translation to ${tl} for: ${text}`);
                return text;
            }
            await new Promise(r => setTimeout(r, 500 * (i + 1))); // backoff
        }
    }
}

async function run() {
    console.log("Starting FAST translation process...");
    const results = { ko: koDict };
    
    for (const locale of locales) {
        console.log(`Translating to ${locale}...`);
        results[locale] = {};
        
        // Batch requests
        const batchSize = 10;
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            const promises = batch.map(async ([key, text]) => {
                const translated = await translateText(text, locale);
                results[locale][key] = translated;
            });
            await Promise.all(promises);
            // small delay between batches
            await new Promise(r => setTimeout(r, 200));
        }
        console.log(`Completed ${locale}`);
    }
    
    const patchContent = `\n\n// --- AUTO GENERATED TRANSLATION PATCH ---\n` +
        `const newTranslations = ${JSON.stringify(results, null, 2)};\n` +
        `Object.keys(newTranslations).forEach(lang => {\n` +
        `  if (!translations[lang]) translations[lang] = {};\n` +
        `  Object.assign(translations[lang], newTranslations[lang]);\n` +
        `});\n`;
    
    const targetFile = path.join(__dirname, '../src/utils/translations.js');
    fs.appendFileSync(targetFile, patchContent);
    console.log("Successfully patched translations.js!");
}

run();
