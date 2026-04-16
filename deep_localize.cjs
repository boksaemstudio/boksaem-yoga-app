const fs = require('fs');
const https = require('https');

// SaaS & Fitness Deep Localization Dictionary
const localizer = {
    ja: {
        pre: [
            [/요가원/g, '스튜디오'],
            [/원장님/g, '오너'],
            [/선생님/g, '인스트럭터'],
            [/강사/g, '인스트럭터'],
            [/수강권/g, '티켓'],
            [/수련/g, '레슨'],
            [/회원님/g, '멤버'],
            [/결제/g, '결제'],
        ],
        post: [
            [/ヨガウォン/g, 'スタジオ'],
            [/修練/g, 'レッスン'],
            [/受講券/g, 'チケット'],
            [/チケットが尽き/g, 'チケットが消化され'],
            [/先生/g, 'インストラクター'],
            [/会員/g, 'メンバー様'],
            [/ウォン長/g, 'オーナー様'],
            [/院長/g, 'オーナー様']
        ]
    },
    zh: { // Simplified Chinese
        pre: [
            [/요가원/g, '스튜디오'],
            [/원장님/g, '관리자'],
            [/수강권/g, '멤버십'],
            [/수련/g, '수업']
        ],
        post: [
            [/瑜伽沙龙/g, '瑜伽工作室'],
            [/修炼/g, '课程'],
            [/院长/g, '店长'],
            [/老师/g, '教练']
        ]
    },
    ru: { // Russian
        pre: [
            [/요가원/g, '스튜디오'],
            [/원장님/g, '관리자'],
            [/수강권/g, '멤버십'],
            [/수련/g, '수업']
        ],
        post: [
            [/йога-вон/gi, 'студия'],
            [/директор/gi, 'администратор'],
            [/тренировка/gi, 'занятие']
        ]
    },
    es: { // Spanish
        pre: [
            [/요가원/g, '스튜디오'],
            [/원장님/g, '스튜디오 오너'],
            [/수강권/g, '멤버십 패스'],
            [/수련/g, '요가 수업'],
            [/체육시설/g, '피트니스 스튜디오']
        ],
        post: [
            [/Yogawon/gi, 'Estudio'],
            [/Yoga-won/gi, 'Estudio'],
            [/Wonjang-nim/gi, 'Propietario']
        ]
    },
    pt: { // Portuguese
        pre: [
            [/요가원/g, '스튜디오'],
            [/원장님/g, '스튜디오 오너'],
            [/수강권/g, '패스'],
            [/수련/g, '수업'],
            [/체육시설/g, '피트니스 스튜디오']
        ],
        post: [
            [/Yogawon/gi, 'Estúdio'],
            [/Yoga-won/gi, 'Estúdio'],
            [/Wonjang-nim/gi, 'Proprietário']
        ]
    },
    fr: { // French
        pre: [
            [/요가원/g, '스튜디오'],
            [/원장님/g, '스튜디오 오너'],
            [/수강권/g, '멤버십 패스'],
            [/수련/g, '요가 수업'],
            [/체육시설/g, '피트니스 스튜디오']
        ],
        post: [
            [/Yogawon/gi, 'Studio'],
            [/Yoga-won/gi, 'Studio'],
            [/Wonjang-nim/gi, 'Propriétaire']
        ]
    },
    de: { // German
        pre: [
            [/요가원/g, '스튜디오'],
            [/원장님/g, '스튜디오 오너'],
            [/수강권/g, '멤버십'],
            [/수련/g, '수업'],
            [/체육시설/g, '피트니스 스튜디오']
        ],
        post: [
            [/Yogawon/gi, 'Studio'],
            [/Yoga-won/gi, 'Studio'],
            [/Wonjang-nim/gi, 'Inhaber']
        ]
    }
};

async function translateText(text, targetLang) {
    const langCode = targetLang === 'zh' ? 'zh-CN' : targetLang;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=${langCode}&dt=t&q=${encodeURIComponent(text)}`;
    
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    let translated = '';
                    parsed[0].forEach(t => translated += t[0]);
                    resolve(translated);
                } catch(e) {
                    console.error("Translation fail:", data);
                    resolve(text);
                }
            });
        }).on('error', () => resolve(text));
    });
}

async function runLayer(lang) {
    const translationsPath = 'src/utils/translations.js';
    let code = fs.readFileSync(translationsPath, 'utf8');
    
    const tmpName = `tmp_trans_${new Date().getTime()}_${Math.floor(Math.random()*10000)}.cjs`;
    fs.writeFileSync(tmpName, code.replace(/export const translations =/, 'module.exports =').replace(/import .*/g, ''));
    const t = require('./' + tmpName);
    fs.unlinkSync(tmpName);
    
    const masterKeys = Object.keys(t.ko);
    const targetKeys = new Set(Object.keys(t[lang]));
    const missingKeys = masterKeys.filter(k => !targetKeys.has(k)).slice(0, 100);
    
    if (missingKeys.length === 0) {
        console.log(`[${lang}] is completely localized!`);
        return;
    }
    
    console.log(`Translating ${missingKeys.length} keys to ${lang}...`);
    
    const newTranslations = {};
    for (let i=0; i<missingKeys.length; i++) {
        const key = missingKeys[i];
        let text = t.ko[key];
        
        if (localizer[lang] && localizer[lang].pre) {
            localizer[lang].pre.forEach(([regex, repl]) => {
                text = text.replace(regex, repl);
            });
        }
        
        let translated = await translateText(text, lang);
        
        if (localizer[lang] && localizer[lang].post) {
             localizer[lang].post.forEach(([regex, repl]) => {
                translated = translated.replace(regex, repl);
            });
        }
        
        newTranslations[key] = translated;
        if ((i+1) % 20 === 0) console.log(`  Processed ${i+1}/${missingKeys.length}...`);
        await new Promise(r => setTimeout(r, 200));
    }
    
    const regexBlock = new RegExp(`(${lang}:\\s*\\{)`);
    const match = code.match(regexBlock);
    if (match) {
        let injection = '\n';
        for (const [k, v] of Object.entries(newTranslations)) {
            injection += `        ${JSON.stringify(k)}: ${JSON.stringify(v)},\n`;
        }
        code = code.substring(0, match.index + match[0].length) + injection + code.substring(match.index + match[0].length);
        fs.writeFileSync(translationsPath, code);
        console.log(`Success: Injected ${missingKeys.length} deep-localized strings for [${lang}]`);
    } else {
        console.error(`Could not find dictionary block for ${lang}`);
    }
}

const target = process.argv[2] || 'es';
runLayer(target).then(() => console.log('Done.'));
