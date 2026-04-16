const fs = require('fs');

const c = fs.readFileSync('./src/utils/translations.js', 'utf8');
const j = c.replace('export const translations = ', '').trim().replace(/;$/, '');
const t = eval('(' + j + ')');

const langs = ['ja','zh','es','pt','ru','fr','de','vi','th'];
const result = {};

for (const l of langs) {
    const missing = {};
    for (const [k, v] of Object.entries(t.en)) {
        if (!v) continue;
        const local = t[l][k];
        
        // Exclude generic/proper noun keys that don't need translation broadly
        const ignorableKeys = ['ticketType', 'startDate', 'navKiosk', 'management', 'weatherPrefix', 'class_mysore', 'class_vinyasa', 'class_hatha', 'class_ashtanga', 'healthConnected'];
        if (ignorableKeys.includes(k)) continue;

        // Condition 1: Missing entirely
        if (!local || local === '') {
            missing[k] = v;
        } 
        // Condition 2: Same as English (Un-translated fallback)
        else if (local === v) {
            // But skip short UI labels like "Logo", "Push", "Video", "Kiosk" that legitimately match
            if (v.length > 3 && /[a-z]i/.test(v) && k !== 'guideIOS' && k !== 'guideAndroid') {
                missing[k] = v;
            }
        }
    }
    result[l] = missing;
    console.log(`[${l.toUpperCase()}] Requires Manual Review: ${Object.keys(missing).length}`);
}

fs.writeFileSync('missing_manual_review.json', JSON.stringify(result, null, 2));
