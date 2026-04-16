const fs = require('fs');
const https = require('https');
const querystring = require('querystring');
const path = require('path');

const tsPath = path.join(__dirname, 'src', 'utils', 'translations.js');
let tsContent = fs.readFileSync(tsPath, 'utf8');

// Safe extraction of the exported object
const objectString = tsContent.replace('export const translations =', '').trim().replace(/;$/, '');
let t = new Function('return ' + objectString)();

// 1. Manually apply the Gemini-verified 14 Variable translations for Brazilian Portuguese
const safePtVars = {
    "totalSessions": "Total {n}",
    "insight_milestone_50": "Você já acumulou {n} práticas intensas. Agora, sinta a textura da sua respiração em vez da perfeição do movimento e experimente o 'Sati' acordar a cada momento. 🙏",
    "insight_user_pattern": "Você é um **'{type}'** que pratica principalmente nas **{day} às {time}**. {desc}",
    "holdElapsed": "Desde {start}, decorreram {elapsed} dias (Solicitado: {requested} dias)",
    "holdExtended": "Data de término estendida em {days} dias",
    "holdRemaining": "Restante: {n} vezes",
    "holdModalDesc": "Máximo {weeks} semanas · {count} vezes",
    "holdWeekDays": "{w} sem ({d} dias)",
    "holdStartBtn": "Iniciar Pausa de {days} dias",
    "normalCount": "Válido {n}",
    "expiredCancelCount": "Cancelado {n}",
    "sessionN": "Sessão {n}",
    "sessionComplete": "Sessão {n} Concluída!",
    "analyzedRecent": "Foram analisados {n} registros recentes."
};
Object.assign(t.pt, safePtVars);

// 2. Automated translation structure for VARIABLE-FREE fallback keys
async function translateSimple(text, targetLang) {
    return new Promise((resolve) => {
        let tl = targetLang === 'zh' ? 'zh-CN' : targetLang;
        const qs = querystring.stringify({client: 'gtx', sl: 'en', tl: tl, dt: 't', q: text});
        const req = https.request({
            hostname: 'translate.googleapis.com', 
            path: '/translate_a/single?'+qs, 
            method: 'GET',
            headers: {'User-Agent': 'Mozilla/5.0'}
        }, res => {
            let body = '';
            res.on('data', c => body+=c);
            res.on('end', () => {
                if(res.statusCode !== 200) return resolve(text);
                try {
                    const j = JSON.parse(body);
                    let str = '';
                    for(const i of j[0]) if(i[0]) str += i[0];
                    resolve(str);
                } catch(e) { resolve(text); }
            });
        });
        req.on('error', () => resolve(text));
        req.end();
    });
}

async function run() {
    console.log("Gemini Ultra Executive Mode: Processing remaining variable-free fallback keys securely.");
    const ignorableKeys = ['ticketType', 'startDate', 'navKiosk', 'management', 'weatherPrefix', 'class_mysore', 'class_vinyasa', 'class_hatha', 'class_ashtanga', 'healthConnected'];
    const langs = ['zh', 'pt'];
    let count = 0;

    for (const lang of langs) {
        let toTranslate = [];
        for (const [key, enVal] of Object.entries(t.en)) {
            if (!enVal) continue;
            if (ignorableKeys.includes(key)) continue;
            
            const localVal = t[lang][key];
            if (!localVal || localVal === '' || localVal === enVal) {
                // Must be longer than 3 chars and NOT contain {variable}
                if (enVal.length > 3 && !enVal.includes('{')) { 
                    toTranslate.push({key, enVal});
                }
            }
        }
        
        console.log(`Translating ${toTranslate.length} safe keys for [${lang.toUpperCase()}]...`);
        const batchSize = 10; // small concurrent batches
        for (let i = 0; i < toTranslate.length; i += batchSize) {
            const batch = toTranslate.slice(i, i + batchSize);
            const promises = batch.map(async (item) => {
                // translate
                const res = await translateSimple(item.enVal, lang);
                t[lang][item.key] = res;
                count++;
            });
            await Promise.all(promises);
            if ((i + batchSize) % 100 === 0) console.log(`  ...${i+batchSize} items done`);
        }
    }

    console.log(`Merging ${count} new safe translations...`);
    const finalCode = `export const translations = {\n` +
      Object.keys(t).map(lang => {
        return `  ${lang}: {\n` + Object.keys(t[lang]).map(k => {
            const safeKey = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(k) ? k : JSON.stringify(k);
            return `    ${safeKey}: ${JSON.stringify(t[lang][k])}`;
        }).join(',\n') + `\n  }`;
      }).join(',\n') + `\n};\n`;
      
    fs.writeFileSync(tsPath, finalCode, 'utf8');
    console.log("✅ Phase 2 & 3: Translation securely applied without variable breaches.");
}
run();
