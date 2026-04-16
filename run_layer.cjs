const cp = require('child_process');

function runUntilDone(lang) {
    console.log(`\n============================`);
    console.log(`Starting localization for [${lang.toUpperCase()}]`);
    console.log(`============================\n`);
    let done = false;
    let safeCount = 0;
    while(!done && safeCount < 20) {
        safeCount++;
        const out = cp.execSync(`node deep_localize.cjs ${lang}`, {encoding:'utf8'});
        console.log(`[${lang}] Batch ${safeCount}: \n` + out.trim());
        if(out.includes('completely localized')) {
            done = true;
        }
    }
    if(done) {
        console.log(`✅ [${lang.toUpperCase()}] Fully Localized.`);
    } else {
        console.log(`⚠️ [${lang.toUpperCase()}] Stopped after 20 batches to prevent infinite loops.`);
    }
}

// Ensure execution is sequential
runUntilDone('zh');
runUntilDone('ru');
