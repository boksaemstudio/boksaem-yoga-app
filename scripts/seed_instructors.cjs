const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function seed() {
    const instructors = [
        { name: '지수 원장', phone: '0101234', pin: '1234', role: '원장' },
        { name: '사라 강사', phone: '0105678', pin: '5678', role: '강사' },
        { name: '보미 선생님', phone: '0109012', pin: '9012', role: '강사' }
    ];
    
    await db.collection('studios').doc('demo-yoga').collection('settings').doc('instructors').set({
        list: instructors,
        updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log('✅ 강사 3명 등록:', instructors.map(i => i.name).join(', '));
    
    const doc = await db.collection('studios').doc('demo-yoga').collection('settings').doc('instructors').get();
    console.log('검증:', JSON.stringify(doc.data().list.map(i => i.name)));
}

seed().catch(console.error).finally(() => process.exit(0));
