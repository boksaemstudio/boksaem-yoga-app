const fs = require('fs');

async function translateText(text, targetLang) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();
        return data[0][0][0];
    } catch(e) {
        console.error("Failed to translate:", text);
        return text; // fallback to original
    }
}

async function run() {
    const texts = JSON.parse(fs.readFileSync('korean_extraction.json', 'utf8'));
    
    console.log(`Starting translation of ${texts.length} items to English...`);
    const enDict = {};
    for (let i=0; i<texts.length; i++) {
        if(i % 50 === 0) console.log(`Progress: ${i}/${texts.length}`);
        enDict[texts[i]] = await translateText(texts[i], 'en');
        await new Promise(r => setTimeout(r, 100)); // Sleep to prevent rate limit
    }
    fs.writeFileSync('en_auto.json', JSON.stringify(enDict, null, 2), 'utf8');

    console.log(`Starting translation of ${texts.length} items to Japanese...`);
    const jaDict = {};
    for (let i=0; i<texts.length; i++) {
        if(i % 50 === 0) console.log(`Progress: ${i}/${texts.length}`);
        jaDict[texts[i]] = await translateText(texts[i], 'ja');
        await new Promise(r => setTimeout(r, 100)); // Sleep to prevent rate limit
    }
    fs.writeFileSync('ja_auto.json', JSON.stringify(jaDict, null, 2), 'utf8');

    console.log("Translation generation complete. en_auto.json and ja_auto.json created.");
}

run();