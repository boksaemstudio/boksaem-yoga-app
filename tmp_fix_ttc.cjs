const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const tenantDb = db.doc('studios/boksaemstudio');

async function fixTTC() {
    console.log('--- TTC Pricing Checking ---');
    // 1. settings/pricing 체크
    const sdoc = await tenantDb.collection('settings').doc('pricing').get();
    if (sdoc.exists) {
        let changed = false;
        let data = sdoc.data();
        // data가 nested object일 수 있으므로 탐색
        for (const [catKey, catVal] of Object.entries(data)) {
            if (catVal && Array.isArray(catVal.options)) {
                catVal.options.forEach(opt => {
                    if (opt.id.toLowerCase().includes('ttc') || opt.label.toLowerCase().includes('ttc')) {
                        console.log(`Found TTC in settings/pricing: ${opt.label}, months: ${opt.months}`);
                        if (opt.months !== 3) {
                            opt.months = 3;
                            changed = true;
                            console.log(' => Fixed to 3 months');
                        }
                    }
                });
            }
        }
        if (changed) {
            await tenantDb.collection('settings').doc('pricing').update(data);
            console.log('Saved settings/pricing');
        } else {
            console.log('No changes in settings/pricing');
        }
    }

    // 2. pricing collection (old schema) 체크
    const ps = await tenantDb.collection('pricing').get();
    for (const doc of ps.docs) {
        const p = doc.data();
        if (p.name && p.name.toLowerCase().includes('ttc')) {
            console.log(`Found TTC in pricing coll: ${p.name}, months: ${p.months}, validDays: ${p.validDays}`);
            let needsUpdate = false;
            let updateData = {};
            if (p.months !== 3) { updateData.months = 3; needsUpdate = true; }
            if (p.validDays !== 90 && p.validDays !== 93) { updateData.validDays = 90; needsUpdate = true; }
            if (needsUpdate) {
                await doc.ref.update(updateData);
                console.log(` => Fixed pricing doc to 3 months/90 days`);
            }
        }
    }
    console.log('Done check_ttc');
}

fixTTC().catch(console.error);
