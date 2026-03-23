const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'boksaem-yoga'
});
const db = admin.firestore();
const STUDIO = 'boksaem-yoga';

async function debug() {
    const memberId = 'hP0V5MbrVIkz5fmD14cY'; // 송미호
    
    // 1. members 문서의 fcmToken 필드 확인
    console.log('=== members 문서 fcmToken 필드 ===');
    const memberDoc = await db.doc(`studios/${STUDIO}/members/${memberId}`).get();
    if (memberDoc.exists) {
        const d = memberDoc.data();
        console.log(`  name: ${d.name || d.memberName}`);
        console.log(`  fcmToken: ${d.fcmToken ? d.fcmToken.substring(0, 40) + '...' : 'NONE'}`);
        console.log(`  pushEnabled: ${d.pushEnabled}`);
        console.log(`  lastTokenUpdate: ${d.lastTokenUpdate}`);
    }
    
    // 2. getAllFCMTokens 함수 실행 시뮬레이션
    console.log('\n=== Cloud Function이 사용할 토큰 조회 ===');
    const collections = ['fcm_tokens', 'fcmTokens', 'push_tokens'];
    for (const col of collections) {
        const snap = await db.collection(`studios/${STUDIO}/${col}`)
            .where('memberId', '==', memberId).get();
        console.log(`  [${col}] memberId 쿼리: ${snap.size}개`);
        snap.forEach(doc => {
            const d = doc.data();
            console.log(`    docId: ${doc.id.substring(0, 30)}... role=${d.role} token_field=${d.token ? d.token.substring(0,30)+'...' : 'NONE'}`);
        });
    }
    
    // 3. 모든 fNj4gx 토큰의 memberId 확인
    console.log('\n=== fNj4gx 토큰들의 memberId 확인 ===');
    const allSnap = await db.collection(`studios/${STUDIO}/fcm_tokens`).get();
    allSnap.forEach(doc => {
        if (doc.id.startsWith('fNj4gx')) {
            const d = doc.data();
            console.log(`  ${doc.id.substring(0, 40)}... memberId=${d.memberId || 'NONE'} role=${d.role}`);
        }
    });
    
    // 4. Cloud Function push.js의 getAllFCMTokens 로직 시뮬레이션
    console.log('\n=== getAllFCMTokens 시뮬레이션 (memberId 필터) ===');
    let tokens = [];
    for (const col of collections) {
        try {
            const s = await db.collection(`studios/${STUDIO}/${col}`)
                .where('memberId', '==', memberId).get();
            s.forEach(doc => {
                const d = doc.data();
                const t = d.token || doc.id;
                tokens.push(t);
            });
        } catch (e) {}
    }
    console.log(`총 찾은 토큰: ${tokens.length}개`);
    tokens.forEach(t => console.log(`  ${t.substring(0, 40)}...`));
    
    process.exit(0);
}

debug().catch(err => { console.error(err); process.exit(1); });
