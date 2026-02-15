
const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixMultipleMembers() {
    console.log('🔍 Auditing all members for missing status...');
    
    const membersRef = db.collection('members');
    const snapshot = await membersRef.get();

    let fixCount = 0;
    const batch = db.batch();

    snapshot.forEach((doc) => {
        const data = doc.data();
        // If status is missing OR 'undefined' string (sometimes happens with bad migrations)
        if (!data.status || data.status === 'undefined') {
            const name = data.name || 'Unknown';
            console.log(`   👉 Fixing member: ${name} (${doc.id}) - Status was ${data.status}`);
            batch.update(doc.ref, { status: 'active', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            fixCount++;
        }
    });

    if (fixCount > 0) {
        await batch.commit();
        console.log(`\n✅ Successfully fixed ${fixCount} members.`);
    } else {
        console.log('\n✅ No members found with missing status.');
    }
}

fixMultipleMembers().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
