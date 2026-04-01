const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    const studios = ['boksaem-yoga', 'ssangmun-yoga', 'demo-yoga'];
    
    for (const sid of studios) {
        console.log(`\n=== ${sid} images collection ===`);
        const snap = await db.collection(`studios/${sid}/images`).get();
        if (snap.empty) {
            console.log('  EMPTY');
        } else {
            snap.forEach(d => {
                const data = d.data();
                const preview = data.base64 ? `base64(${data.base64.substring(0,50)}...)` : 
                               data.url ? data.url.substring(0, 100) : 'no-data';
                console.log(`  ${d.id}: ${preview}`);
                if (data.updatedAt) console.log(`    updatedAt: ${data.updatedAt}`);
            });
        }
    }
    
    // Also check if the same base64 data exists across studios
    console.log('\n=== Cross-check: same image data across studios ===');
    const imagesByStudio = {};
    for (const sid of studios) {
        imagesByStudio[sid] = {};
        const snap = await db.collection(`studios/${sid}/images`).get();
        snap.forEach(d => {
            const data = d.data();
            const hash = (data.base64 || data.url || '').substring(0, 100);
            imagesByStudio[sid][d.id] = hash;
        });
    }
    
    // Compare
    const allImageKeys = new Set();
    Object.values(imagesByStudio).forEach(imgs => Object.keys(imgs).forEach(k => allImageKeys.add(k)));
    
    for (const key of allImageKeys) {
        const studiosWith = studios.filter(s => imagesByStudio[s][key]);
        if (studiosWith.length > 1) {
            const identical = studiosWith.every(s => imagesByStudio[s][key] === imagesByStudio[studiosWith[0]][key]);
            console.log(`  ${key}: found in ${studiosWith.join(', ')} ${identical ? '⚠️ IDENTICAL DATA!' : '(different data)'}`);
        }
    }
    
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
