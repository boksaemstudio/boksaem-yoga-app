const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'boksaem-yoga'
});
const db = admin.firestore();
const STUDIO = 'boksaem-yoga';

async function debug() {
    // fNj4gx 토큰 prefix로 찾기
    console.log('=== fNj4gx 토큰 검색 ===');
    const allSnap = await db.collection(`studios/${STUDIO}/fcm_tokens`).get();
    let found = 0;
    allSnap.forEach(doc => {
        const d = doc.data();
        if (doc.id.startsWith('fNj4gx') || (d.token && d.token.startsWith('fNj4gx'))) {
            console.log(`\n  docId: ${doc.id}`);
            console.log(`  data:`, JSON.stringify(d, null, 2));
            found++;
        }
    });
    console.log(`\nfNj4gx 토큰 ${found}개`);
    
    // fqWKb4 토큰도 (admin 것으로 보이는)
    console.log('\n=== fqWKb4 토큰 검색 (admin) ===');
    allSnap.forEach(doc => {
        const d = doc.data();
        if (doc.id.startsWith('fqWKb4') || (d.token && d.token.startsWith('fqWKb4'))) {
            console.log(`\n  docId: ${doc.id}`);
            console.log(`  data:`, JSON.stringify(d, null, 2));
        }
    });
    
    // 모든 고유 memberId 출력
    console.log('\n=== 모든 고유 memberId ===');
    const mids = new Set();
    allSnap.forEach(doc => {
        const d = doc.data();
        if (d.memberId) mids.add(d.memberId);
    });
    mids.forEach(id => console.log(`  ${id}`));
    
    process.exit(0);
}

debug().catch(err => { console.error(err); process.exit(1); });
