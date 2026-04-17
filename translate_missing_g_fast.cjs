const fs = require('fs');
const { translations } = require('./src/utils/translations.js');

async function main() {
    let enDict = {};
    if (fs.existsSync('en_g_translations.json')) {
        try {
            enDict = JSON.parse(fs.readFileSync('en_g_translations.json', 'utf8'));
        } catch(e) {}
    }
    const missing = JSON.parse(fs.readFileSync('missing_g_keys.json', 'utf8'));
    
    let matched = 0;
    const entries = Object.entries(missing);
    
    // Pass 1: Try to match with existing translations
    for (const [key, koText] of entries) {
        if (enDict[key] && enDict[key] !== missing[key]) continue; // Already translated
        const cleanKo = koText.replace(/[^\uAC00-\uD7AF]/g, '');
        let found = false;
        if (cleanKo) {
            for (const [koKey, koVal] of Object.entries(translations.ko)) {
                if (koKey.replace(/[^\uAC00-\uD7AF]/g, '') === cleanKo || 
                   (typeof koVal === 'string' && koVal.replace(/[^\uAC00-\uD7AF]/g, '') === cleanKo)) {
                    if (translations.en[koKey]) {
                        enDict[key] = translations.en[koKey];
                        matched++;
                        found = true;
                        break;
                    }
                }
            }
        }
        if (!found) {
            enDict[key] = koText;
        }
    }
    
    // Pass 2: Translate via API in parallel chunks
    const toTranslate = Object.entries(enDict).filter(([k, v]) => v === missing[k]);
    console.log(`Need to translate ${toTranslate.length} keys...`);
    
    const concurrency = 20;
    let completed = 0;
    
    for (let i = 0; i < toTranslate.length; i += concurrency) {
        const chunk = toTranslate.slice(i, i + concurrency);
        await Promise.all(chunk.map(async ([key, text]) => {
            try {
                const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=' + encodeURIComponent(text);
                const res = await fetch(url);
                const data = await res.json();
                let translated = '';
                if (data && data[0]) {
                    data[0].forEach(part => {
                        if (part[0]) translated += part[0];
                    });
                }
                if (translated) {
                    enDict[key] = translated;
                }
            } catch (e) {
                console.error(`Failed to translate: ${text}`);
            }
        }));
        completed += chunk.length;
        console.log(`Translated ${completed} / ${toTranslate.length}`);
        fs.writeFileSync('en_g_translations.json', JSON.stringify(enDict, null, 2), 'utf8');
        await new Promise(r => setTimeout(r, 200)); // small delay
    }
    
    console.log('Done!');
}

main().catch(console.error);
