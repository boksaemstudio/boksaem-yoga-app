const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    try {
        console.log("=== 1. 잘못 전송된 데모 공지 로그 삭제 ===");
        const msgSnap = await db.collection('studios/boksaem-yoga/messages').get();
        let msgDeleted = 0;
        for (const doc of msgSnap.docs) {
            const data = doc.data();
            if (data.title && (data.title.includes('3월 한정') || data.title.includes('모닝 빈야사'))) {
                await doc.ref.delete();
                msgDeleted++;
                console.log(`Deleted fake message: ${data.title}`);
            }
        }
        console.log(`Deleted ${msgDeleted} fake messages from Admin history.`);
    } catch(e) { console.error(e); }
    process.exit(0);
}
run();
