const fs = require('fs');
const { translations } = require('./src/utils/translations.js');

async function main() {
    const missing = JSON.parse(fs.readFileSync('missing_g_keys.json', 'utf8'));
    const enDict = {};
    
    let matched = 0;
    const entries = Object.entries(missing);
    
    // Pass 1: Try to match with existing translations
    for (const [key, koText] of entries) {
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
            // Keep the original string as placeholder, we will translate it next
            enDict[key] = koText;
        }
    }
    
    console.log(`Matched ${matched} / ${entries.length} using existing translations.`);
    
    // Pass 2: Translate via Google Translate API
    let i = 0;
    for (const [key, text] of Object.entries(enDict)) {
        if (text === missing[key]) {
            // Needs translation
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
                
                i++;
                if (i % 20 === 0) console.log(`Translated ${i} API calls...`);
                // Sleep slightly to avoid rate limit
                await new Promise(r => setTimeout(r, 100));
            } catch (e) {
                console.error(`Failed to translate: ${text}`);
            }
        }
    }
    
    fs.writeFileSync('en_g_translations.json', JSON.stringify(enDict, null, 2), 'utf8');
    console.log('Translations saved to en_g_translations.json');
}

main().catch(console.error);
