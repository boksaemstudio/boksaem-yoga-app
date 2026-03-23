const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'boksaem-yoga'
});
const db = admin.firestore();
const STUDIO = 'boksaem-yoga';

async function check() {
    const col = db.collection(`studios/${STUDIO}/fcm_tokens`);
    const snap = await col.get();
    
    console.log(`=== 전체 FCM 토큰 현황 (${snap.size}개) ===\n`);
    
    snap.forEach(doc => {
        const d = doc.data();
        const prefix = doc.id.split(':')[0];
        console.log(`[${prefix.substring(0,20)}] role=${d.role || 'N/A'} memberId=${d.memberId || 'N/A'} updated=${d.updatedAt || 'N/A'}`);
        console.log(`  full token: ${doc.id.substring(0, 50)}...`);
    });
    
    // 송미호 서버에서 직접 최신 토큰 발급 테스트
    console.log('\n=== 송미호 회원 토큰으로 즉시 발송 테스트 ===');
    const songSnap = await col.where('memberId', '==', 'hP0V5MbrVIkz5fmD14cY').get();
    console.log(`memberId 쿼리 결과: ${songSnap.size}개`);
    songSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  ${doc.id.substring(0,40)}... role=${d.role} updated=${d.updatedAt}`);
    });
    
    // fNj4gx prefix 토큰 전부 확인
    console.log('\n=== fNj4gx 기기 토큰 전부 ===');
    snap.forEach(doc => {
        if (doc.id.startsWith('fNj4gx')) {
            const d = doc.data();
            console.log(`  ${doc.id.substring(0,50)}...`);
            console.log(`    role=${d.role} memberId=${d.memberId || 'N/A'} updated=${d.updatedAt}`);
        }
    });
    
    process.exit(0);
}

check().catch(err => { console.error(err); process.exit(1); });
