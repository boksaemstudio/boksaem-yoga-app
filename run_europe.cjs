const cp = require('child_process');

function runUntilDone(lang) {
    console.log(`\n============================`);
    console.log(`Starting localization for [${lang.toUpperCase()}]`);
    console.log(`============================\n`);
    let done = false;
    let safeCount = 0;
    while(!done && safeCount < 20) {
        safeCount++;
        try {
            const out = cp.execSync(`node deep_localize.cjs ${lang}`, {encoding:'utf8'});
            console.log(`[${lang}] Batch ${safeCount}: \n` + out.trim());
            if(out.includes('completely localized')) {
                done = true;
            }
        } catch(e) {
            console.error(`Error in ${lang}:`, e.message);
        }
    }
    if(done) {
        console.log(`✅ [${lang.toUpperCase()}] Fully Localized.`);
    } else {
        console.log(`⚠️ [${lang.toUpperCase()}] Stopped after 20 batches to prevent infinite loops.`);
    }
}

// Sequence for Europe and Latin America
runUntilDone('es');
runUntilDone('pt');
runUntilDone('fr');
runUntilDone('de');
