const admin = require('firebase-admin');
const sa = require('./functions/service-account-key.json');

admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    // Delete 원장's stale tokens
    console.log('=== Cleaning 원장 stale FCM tokens ===');
    const tokensSnap = await db.collection('fcm_tokens')
        .where('role', '==', 'instructor')
        .where('instructorName', '==', '원장')
        .get();
    
    for (const doc of tokensSnap.docs) {
        console.log(`  Deleting: ${doc.id.substring(0, 30)}...`);
        await doc.ref.delete();
    }
    console.log(`✅ Deleted ${tokensSnap.size} stale tokens for 원장`);
    console.log('\n원장님은 /instructor 페이지에서 푸시 알림을 다시 허용해주세요.');
    
    process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
