const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    // settings 컬렉션 전체 문서 나열
    console.log('=== settings 컬렉션 ===');
    const settingsSnap = await tdb.collection('settings').get();
    settingsSnap.forEach(doc => {
        console.log(`  📄 ${doc.id}:`);
        const data = doc.data();
        // POLICIES 관련만 출력
        if (data.POLICIES) console.log(`    POLICIES:`, JSON.stringify(data.POLICIES));
        if (data.policies) console.log(`    policies:`, JSON.stringify(data.policies));
        // 최상위 키 목록
        console.log(`    keys: [${Object.keys(data).join(', ')}]`);
    });

    // 루트 문서 자체에 설정이 있는지 확인
    console.log('\n=== 루트 boksaem-yoga 문서 ===');
    const rootDoc = await tdb.get();
    if (rootDoc.exists) {
        const data = rootDoc.data();
        console.log(`  keys: [${Object.keys(data).join(', ')}]`);
        if (data.POLICIES) console.log(`  POLICIES:`, JSON.stringify(data.POLICIES));
        if (data.policies) console.log(`  policies:`, JSON.stringify(data.policies));
    }

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
