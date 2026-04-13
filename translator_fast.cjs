const fs = require('fs');

async function translateText(text, targetLang) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();
        return data[0][0][0];
    } catch(e) {
        return text; 
    }
}

async function run() {
    const texts = JSON.parse(fs.readFileSync('korean_extraction.json', 'utf8'));
    const enDict = {};
    const jaDict = {};
    
    // Concurrent translation with limit
    async function processBatch(arr, lang, dict) {
        const concurrency = 20;
        let index = 0;
        const workers = Array(concurrency).fill(null).map(async () => {
             while (index < arr.length) {
                 const currentIndex = index++;
                 const text = arr[currentIndex];
                 dict[text] = await translateText(text, lang);
             }
        });
        await Promise.all(workers);
    }
    
    console.log(`Translating to EN...`);
    await processBatch(texts, 'en', enDict);
    fs.writeFileSync('en_auto.json', JSON.stringify(enDict, null, 2), 'utf8');
    
    console.log(`Translating to JA...`);
    await processBatch(texts, 'ja', jaDict);
    fs.writeFileSync('ja_auto.json', JSON.stringify(jaDict, null, 2), 'utf8');
    
    // Auto Update translations.js
    let tFile = fs.readFileSync('src/utils/translations.js', 'utf8');
    
    // String replacement magic to append objects into existing structure
    // Find the end of `en: {` and inject
    const enInject = Object.keys(enDict).map(k => `        "${k.replace(/"/g, '\\"')}": "${enDict[k].replace(/"/g, '\\"')}",`).join('\n');
    tFile = tFile.replace(/en:\s*\{/, `en: {\n${enInject}`);
    
    const jaInject = Object.keys(jaDict).map(k => `        "${k.replace(/"/g, '\\"')}": "${jaDict[k].replace(/"/g, '\\"')}",`).join('\n');
    tFile = tFile.replace(/ja:\s*\{/, `ja: {\n${jaInject}`);
    
    fs.writeFileSync('src/utils/translations.js', tFile, 'utf8');
    
    console.log("Translation and injection complete!");
}
run();