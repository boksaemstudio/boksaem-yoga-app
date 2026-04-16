const fs = require('fs');
const https = require('https');
const querystring = require('querystring');

const BATCH_SIZE = 30; // Use small batches with delimiter
const DELIMITER = '\n\n||\n\n';

function translateBatch(texts, targetLang) {
  return new Promise((resolve, reject) => {
    // Some languages in GT: zh-CN for Chinese, others match exactly
    let tl = targetLang;
    if (tl === 'zh') tl = 'zh-CN';
    
    const combinedText = texts.join(DELIMITER);
    
    // Instead of querystring, we use URLSearchParams or just build it
    const reqBody = querystring.stringify({
      client: 'gtx',
      sl: 'en',
      tl: tl,
      dt: 't',
      q: combinedText
    });

    const options = {
      hostname: 'translate.googleapis.com',
      path: '/translate_a/single',
      method: 'POST', // POST allows much larger bodies
      headers: {
         'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
         'Content-Length': Buffer.byteLength(reqBody),
         'User-Agent': 'Mozilla/5.0'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
              return reject(new Error('HTTP Error: ' + res.statusCode + ' Body: ' + body));
          }
          const json = JSON.parse(body);
          
          // GT response: json[0] is array of arrays [translated string, original string]
          let fullTranslatedText = '';
          if (json && json[0]) {
             for (const item of json[0]) {
                 if (item[0]) fullTranslatedText += item[0];
             }
          }
          
          // Split back by delimiter. Note: GT might add spaces around || like "| |"
          const delimiterRegex = /\s*\|\|\s*/;
          const translatedArray = fullTranslatedText.split(delimiterRegex).map(s => s.trim());
          
          // Fallback if the amount of results misaligns severely (rare but possible)
          if (translatedArray.length < texts.length) {
              console.warn(`Mismatch in ${tl}! Sent ${texts.length}, got ${translatedArray.length}. Attempting individual requests...`);
              return resolve(null); // Return null to signal individual fallback
          }
          
          resolve(translatedArray.slice(0, texts.length));

        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(reqBody);
    req.end();
  });
}

function translateSingle(text, targetLang) {
    return new Promise((resolve, reject) => {
        let tl = targetLang;
        if (tl === 'zh') tl = 'zh-CN';
        const qs = querystring.stringify({client: 'gtx', sl: 'en', tl: tl, dt: 't', q: text});
        const req = https.request({
            hostname: 'translate.googleapis.com', path: '/translate_a/single?'+qs, method: 'GET',
            headers: {'User-Agent': 'Mozilla/5.0'}
        }, res => {
            let body = '';
            res.on('data', c => body+=c);
            res.on('end', () => {
                if (res.statusCode !== 200) return resolve(text); // on error, return english
                try {
                    const j = JSON.parse(body);
                    let t = '';
                    if (j && j[0]) for(const i of j[0]) if (i[0]) t+=i[0];
                    resolve(t);
                } catch(e) { resolve(text); }
            });
        });
        req.on('error', () => resolve(text));
        req.end();
    });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    console.log("Loading missing keys...");
    const missingKeysData = JSON.parse(fs.readFileSync('missing_unique_keys.json', 'utf8'));
    const keys = Object.keys(missingKeysData);
    
    // Languages that need translation
    const langs = ['ja', 'zh', 'es', 'pt', 'ru', 'fr', 'de', 'vi', 'th'];
    
    // Load current translations to not overwrite manually translated ones
    const tsPath = './src/utils/translations.js';
    const content = fs.readFileSync(tsPath, 'utf8');
    const jsBodyStr = content.replace('export const translations = ', '').trim().replace(/;$/, '');
    const masterDict = eval('(' + jsBodyStr + ')');
    
    for (const lang of langs) {
        console.log(`\n=== Translating ${keys.length} keys for [${lang.toUpperCase()}] ===`);
        const translatedObj = {};
        
        let i = 0;
        for (const key of keys) {
            const enText = missingKeysData[key].en;
            // translate individually to maximize stability and prevent delimiter mangling
            // using synchronous tiny delay to respect rate limit
            const result = await translateSingle(enText, lang);
            translatedObj[key] = result;
            i++;
            if (i % 50 === 0) console.log(`  Progress: ${i}/${keys.length}`);
            await sleep(25); // tiny sleep
        }
        
        fs.writeFileSync(`missing_translated_${lang}.json`, JSON.stringify(translatedObj, null, 2));
        console.log(`Saved missing_translated_${lang}.json`);
    }
    
    console.log("\nAll translations successfully generated!");
}

main();
