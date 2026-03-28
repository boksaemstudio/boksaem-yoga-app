const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fixDemo() {
    const STUDIO_ID = 'demo-yoga';
    console.log(`Fixing images and branches for ${STUDIO_ID}...`);
    
    // 0. Update Branches strictly to 1 Main Branch (본점)
    // ⚠️ 대문자 BRANCHES — 앱 코드와 일치
    await db.collection('studios').doc(STUDIO_ID).update({
        BRANCHES: [
            { id: 'main', name: '본점', color: 'var(--primary-theme-color)' }
        ],
        branches: admin.firestore.FieldValue.delete(),
        updatedAt: new Date().toISOString()
    });
    console.log('✅ BRANCHES updated to [본점], lowercase branches purged');

    // 1. Update Pricing Images (Using relative paths pointing to public/assets/)
    // 월/주간 시간표를 둘 다 채우라고 하셨으니, subUrl(심화/일반)에도 꽉 채워넣습니다.
    await db.collection('studios').doc(STUDIO_ID).collection('assets').doc('pricing').set({
        mainUrl: '/assets/demo_pricing.png',
        subUrl: '/assets/demo_pricing.png',
        updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('✅ Pricing URLs updated');

    // 2. Update Schedule Images (월간 / 다음달 전부 채우기)
    await db.collection('studios').doc(STUDIO_ID).collection('assets').doc('schedule').set({
        currentUrl: '/assets/demo_schedule.png',
        nextUrl: '/assets/demo_schedule.png',
        updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('✅ Schedule URLs updated');

    // 3. Update Logo Image
    await db.collection('studios').doc(STUDIO_ID).collection('assets').doc('logo').set({
        url: '/assets/demo_logo.png', // Assuming demo_logo was also generated
        updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('✅ Logo URL updated');

    console.log('Done!');
    process.exit(0);
}

fixDemo().catch(console.error);
