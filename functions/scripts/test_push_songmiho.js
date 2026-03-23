const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'boksaem-yoga'
});
const db = admin.firestore();
const STUDIO = 'boksaem-yoga';

async function testPush() {
    const allSnap = await db.collection(`studios/${STUDIO}/fcm_tokens`).get();
    
    // 1. 송미호 토큰 (doc ID = token)
    console.log('=== 송미호 토큰 ===');
    const songTokens = [];
    const seen = new Set();
    allSnap.forEach(doc => {
        const d = doc.data();
        if (d.memberId === 'hP0V5MbrVIkz5fmD14cY' && d.role === 'member') {
            if (!seen.has(doc.id)) {
                seen.add(doc.id);
                songTokens.push(doc.id); // doc ID가 실제 토큰
                console.log(`  ${doc.id.substring(0, 40)}... updated=${d.updatedAt}`);
            }
        }
    });
    console.log(`고유 토큰: ${songTokens.length}개\n`);
    
    // 가장 최신 토큰만 사용 (중복 방지)
    if (songTokens.length > 0) {
        console.log('--- 송미호 푸시 발송 ---');
        const resp = await admin.messaging().sendEachForMulticast({
            notification: { title: '🧘 복샘요가', body: '송미호님, 푸시 알림이 정상 작동합니다! ✅' },
            tokens: songTokens
        });
        console.log(`성공: ${resp.successCount}, 실패: ${resp.failureCount}`);
        resp.responses.forEach((r, i) => {
            console.log(`  [${i}] ${r.success ? '✅ ' + r.messageId : '❌ ' + r.error?.code}`);
        });
    }
    
    // 2. admin 토큰
    console.log('\n=== 관리자(admin) 토큰 ===');
    const adminTokens = [];
    const adminSeen = new Set();
    allSnap.forEach(doc => {
        const d = doc.data();
        if (d.role === 'admin' && !adminSeen.has(doc.id)) {
            adminSeen.add(doc.id);
            adminTokens.push(doc.id);
            console.log(`  ${doc.id.substring(0, 40)}... updated=${d.updatedAt}`);
        }
    });
    console.log(`고유 토큰: ${adminTokens.length}개`);
    
    if (adminTokens.length > 0) {
        console.log('\n--- 관리자 푸시 발송 ---');
        const resp = await admin.messaging().sendEachForMulticast({
            notification: { title: '🔔 관리자 알림 테스트', body: '관리자 푸시 알림 정상 작동! ✅' },
            tokens: adminTokens
        });
        console.log(`성공: ${resp.successCount}, 실패: ${resp.failureCount}`);
        resp.responses.forEach((r, i) => {
            console.log(`  [${i}] ${r.success ? '✅ ' + r.messageId : '❌ ' + r.error?.code}`);
        });
    }
    
    process.exit(0);
}

testPush().catch(err => { console.error(err); process.exit(1); });
