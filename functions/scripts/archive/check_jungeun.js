
const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkJungEun() {
    console.log('🔍 Searching for members with "정은" in their name...');
    
    const membersRef = db.collection('members');
    const snapshot = await membersRef.get();

    let foundCount = 0;
    snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name && data.name.includes('정은')) {
            console.log(`✅ Member: ${data.name} (${doc.id}) - Status: ${data.status}`);
            foundCount++;
        }
    });

    if (foundCount === 0) console.log('❌ No members found with "정은" in their name.');
}

checkJungEun().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
