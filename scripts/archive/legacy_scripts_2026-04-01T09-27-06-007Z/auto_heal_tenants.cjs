const admin = require('firebase-admin');
const acc = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(acc) });

async function autoHealAndMigrate() {
    console.log("=== AUTO HEAL TENANTS START ===");
    const db = admin.firestore();

    // 1. Fetch registry to find true identities
    const registrySnap = await db.collection('platform/registry/studios').get();
    const registries = {};
    registrySnap.forEach(r => registries[r.id] = r.data());
    
    for (const studioId of Object.keys(registries)) {
        if (studioId === 'demo-yoga') continue; // Skip demo
        
        const reg = registries[studioId];
        const studioDoc = db.doc(`studios/${studioId}`);
        const snap = await studioDoc.get();

        if (snap.exists) {
            const data = snap.data();
            let needsHeal = false;
            let updates = { "IDENTITY.NAME": reg.name };

            if (data.IDENTITY?.NAME !== reg.name && data.IDENTITY?.NAME === 'PassFlow Ai 데모 플랫폼') {
                console.log(`[CORBUPTED] ${studioId} -> IDENTITY.NAME is Demo. Healing to ${reg.name}`);
                needsHeal = true;
            }
            if (reg.logoUrl && data.IDENTITY?.LOGO_URL !== reg.logoUrl) {
                // If demo logo got injected
                if (data.IDENTITY?.LOGO_URL?.includes('passflow_ai_logo')) {
                    console.log(`[CORBUPTED] ${studioId} -> IDENTITY.LOGO is Demo. Healing to ${reg.logoUrl}`);
                    updates["IDENTITY.LOGO_URL"] = reg.logoUrl;
                    updates["ASSETS.LOGO.SQUARE"] = reg.logoUrl;
                    updates["ASSETS.LOGO.WIDE"] = reg.logoUrl;
                    needsHeal = true;
                }
            }

            if (needsHeal) {
                await studioDoc.update(updates);
                console.log(`✅ Healed ${studioId}`);
            }
        }
    }

    // 2. Track down the missing uploaded pricing image
    // Ssangmun uploaded a pricing table image while hijacked. It might have been saved in:
    // A. demo-yoga/images/price_table_1
    // B. ssangmun-yoga/images/price_table_1 (but it's not showing due to cache or DB issues)
    
    // We already checked storage. Let's just check the firestore docs.
    const demoPriceImg1 = await db.doc('studios/demo-yoga/images/price_table_1').get();
    const demoPriceImg2 = await db.doc('studios/demo-yoga/images/price_table_2').get();
    const demoPricingSettings = await db.doc('studios/demo-yoga/settings/pricing').get();

    // Is the demo pricing settings containing anything new today? Or did they replace the demo pricing tables?
    // Let's migrate them to Ssangmun just in case they were added recently.
    if (demoPriceImg1.exists) {
        const data = demoPriceImg1.data();
        const now = new Date();
        const updated = data.updatedAt ? new Date(data.updatedAt) : null;
        if (updated && (now - updated) < 24 * 60 * 60 * 1000) {
            console.log("Found recently uploaded price_table_1 in demo-yoga!");
            // Migate to Ssangmun
            await db.doc('studios/ssangmun-yoga/images/price_table_1').set(data);
            console.log("✅ Migrated price_table_1 to ssangmun-yoga!");
        }
    }

    if (demoPriceImg2.exists) {
        const data = demoPriceImg2.data();
        const now = new Date();
        const updated = data.updatedAt ? new Date(data.updatedAt) : null;
        if (updated && (now - updated) < 24 * 60 * 60 * 1000) {
            console.log("Found recently uploaded price_table_2 in demo-yoga!");
            await db.doc('studios/ssangmun-yoga/images/price_table_2').set(data);
            console.log("✅ Migrated price_table_2 to ssangmun-yoga!");
        }
    }

    console.log("=== AUTO HEAL DONE ===");
}

autoHealAndMigrate().then(()=>process.exit(0)).catch(console.error);
