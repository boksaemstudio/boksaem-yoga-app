const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

async function nukeCollection(colPath) {
    const docs = await db.collection(colPath).get();
    let batch = db.batch();
    let count = 0;
    for (const d of docs.docs) {
        batch.delete(d.ref);
        count++;
        if (count >= 400) {
            await batch.commit();
            batch = db.batch();
            count = 0;
        }
    }
    if (count > 0) await batch.commit();
    console.log('✅ Nuked', colPath);
}

async function nuke() {
    console.log('☢️ SECURING DEMO ENVIRONMENT... NUKING REPLICA DATA.');
    await nukeCollection('studios/demo-yoga/members');
    await nukeCollection('studios/demo-yoga/attendance');
    await nukeCollection('studios/demo-yoga/sales');
    await nukeCollection('studios/demo-yoga/daily_classes');
    await nukeCollection('studios/demo-yoga/notices');
    await nukeCollection('studios/demo-yoga/push_messages');
    await nukeCollection('studios/demo-yoga/pricing');
    await nukeCollection('studios/demo-yoga/classes');
    await nukeCollection('studios/demo-yoga/monthly_schedules_backup');
    await nukeCollection('studios/demo-yoga/settings');
    
    // Reset basic config to completely neutral SaaS branding
    await db.doc('studios/demo-yoga').set({
        name: 'PassFlow Yoga Studio',
        ownerEmail: 'demo@passflow.app',
        plan: 'pro',
        status: 'active',
        settings: {
            IDENTITY: { NAME: 'ZenFlow Demo Studio', SLOGAN: '최고의 요가 스튜디오 관리 시스템' },
            BRANCHES: [{id: 'A', name: '강남점'}, {id: 'B', name: '홍대점'}]
        }
    });

    console.log('✅ ALL DEMO DATA COMPLETELY WIPED AND SECURED.');
    process.exit(0);
}
nuke();
