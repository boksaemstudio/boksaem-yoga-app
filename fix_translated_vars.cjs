const fs = require('fs');

const tsPath = './src/utils/translations.js';
const content = fs.readFileSync(tsPath, 'utf8');
const jsBodyStr = content.replace('export const translations = ', '').trim().replace(/;$/, '');
const translations = eval('(' + jsBodyStr + ')');

const enDict = translations['en'];
const langs = ['ja', 'zh', 'es', 'pt', 'ru', 'fr', 'de', 'vi', 'th'];

let fixCount = 0;

for (const lang of langs) {
    const dict = translations[lang];
    if (!dict) continue;

    for (const [key, enVal] of Object.entries(enDict)) {
        if (!dict[key]) continue;
        
        // Find all {variable} templates in the English version
        const enVars = enVal.match(/\{[a-zA-Z_]+\}/g);
        if (!enVars || enVars.length === 0) continue;

        let localVal = dict[key];
        const localVars = localVal.match(/\{[a-zA-Z_]+\}/g) || [];
        const localVarSet = new Set(localVars);
        const enVarSet = new Set(enVars);

        // Check if any EN variables are missing from the local translation
        const missingVars = enVars.filter(v => !localVarSet.has(v));
        if (missingVars.length === 0) continue;

        // Strategy: Find the translated variables and replace them back to the original
        // Build a mapping of what GT likely translated them to
        // For each missing EN var, search for the translated equivalent in curly braces
        let fixed = localVal;
        
        // Collect all {non-english} vars from local that are NOT in EN
        const extraLocalVars = localVars.filter(v => !enVarSet.has(v));
        
        // If the count of extras matches the count of missing, try to map them 1:1 by position
        if (extraLocalVars.length > 0) {
            // Try positional mapping: find where each EN var appears in EN text, 
            // find corresponding translated var at similar position in local text
            for (const missingVar of missingVars) {
                // Find the position ratio of this var in EN text
                const enPos = enVal.indexOf(missingVar);
                const enRatio = enPos / enVal.length;
                
                // Find the closest extra local var by position ratio
                let bestMatch = null;
                let bestDist = Infinity;
                for (const extraVar of extraLocalVars) {
                    const localPos = fixed.indexOf(extraVar);
                    if (localPos === -1) continue;
                    const localRatio = localPos / fixed.length;
                    const dist = Math.abs(enRatio - localRatio);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestMatch = extraVar;
                    }
                }
                
                if (bestMatch) {
                    fixed = fixed.replace(bestMatch, missingVar);
                    // Remove from extras so it doesn't get used again
                    const idx = extraLocalVars.indexOf(bestMatch);
                    if (idx > -1) extraLocalVars.splice(idx, 1);
                    fixCount++;
                }
            }
        }
        
        // If there are still missing vars (no extras to map), the translation is broken
        // Fall back to the EN value for safety
        const stillMissing = enVars.filter(v => !fixed.includes(v));
        if (stillMissing.length > 0) {
            // Last resort: use English value
            fixed = enVal;
            fixCount++;
        }
        
        dict[key] = fixed;
    }
}

// Write back
let newContent = "export const translations = {\n";
for (const [lang, dict] of Object.entries(translations)) {
    newContent += `  ${lang}: {\n`;
    for (const [k, v] of Object.entries(dict)) {
        newContent += `    ${JSON.stringify(k)}: ${JSON.stringify(v)},\n`;
    }
    newContent += "  },\n";
}
newContent += "};\n";

fs.writeFileSync(tsPath, newContent, 'utf8');
console.log(`✅ 변수 템플릿 복원 완료: ${fixCount}건 수정됨`);

// Verify
const verifyContent = fs.readFileSync(tsPath, 'utf8');
const verifyBody = verifyContent.replace('export const translations = ', '').trim().replace(/;$/, '');
try {
    const verifyT = eval('(' + verifyBody + ')');
    console.log('✅ 문법 검증 통과 - translations.js 파싱 정상');
    
    // Re-check variable integrity
    let remaining = 0;
    for (const lang of langs) {
        for (const [k, enVal] of Object.entries(verifyT.en)) {
            const enVars = enVal.match(/\{[a-zA-Z_]+\}/g);
            if (!enVars) continue;
            const localVal = verifyT[lang]?.[k] || '';
            for (const v of enVars) {
                if (!localVal.includes(v)) remaining++;
            }
        }
    }
    console.log(`잔여 변수 손실: ${remaining}건`);
} catch(e) {
    console.error('❌ 문법 에러 발생!', e.message);
}
