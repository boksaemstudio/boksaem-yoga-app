const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.join(__dirname, '..', 'service-account-key.json'));
if (admin.apps.length === 0) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = (col) => db.collection(`studios/boksaem-yoga/${col}`);

async function run() {
    // 1. 만료 토큰 정리
    console.log('=== 만료 토큰 정리 ===');
    const expiredTokenIds = [
        'dNzIW3spBOWcX-rjiLJjX-:APA91bGm_CCxpqQ0W5qrDCReMpEfmXj8bCVfKI',  // 원장 (2번째 — NotRegistered)
        'dmOaVKyLqZsgjJoQAp57wy:APA91bGm_CCxpqQ0W5qrDCReMpEfmXj8bCVfKI',  // 다나 (2번째 — NotRegistered)
        'fNj4gx_DzJt6UJN1c2s39b:APA91bGm_CCxpqQ0W5qrDCReMpEfmXj8bCVfKI',  // 원장 (2건 — NotRegistered)
        'fqWKb4i_4tSsoszuQJPD2I:APA91bGm_CCxpqQ0W5qrDCReMpEfmXj8bCVfKI',  // admin — NotRegistered
    ];
    
    // 모든 토큰 조회해서 NotRegistered 테스트 후 삭제
    const allSnap = await tdb('fcm_tokens').get();
    let cleaned = 0;
    for (const doc of allSnap.docs) {
        try {
            await admin.messaging().send({ token: doc.id }, true); // dryRun
        } catch (e) {
            if (e.code === 'messaging/registration-token-not-registered' || 
                e.code === 'messaging/invalid-registration-token') {
                const d = doc.data();
                console.log(`🗑️ 삭제: ${d.instructorName || d.role || 'N/A'} | ${doc.id.substring(0, 25)}...`);
                await doc.ref.delete();
                cleaned++;
            }
        }
    }
    console.log(`✅ 만료 토큰 ${cleaned}개 정리 완료\n`);

    // 2. 원장님한테만 푸시 발송
    console.log('=== 원장님 전용 푸시 발송 ===');
    const snap = await tdb('fcm_tokens').where('instructorName', '==', '원장').get();
    const adminSnap = await tdb('fcm_tokens').where('role', '==', 'admin').get();
    
    const targets = [];
    snap.docs.forEach(d => targets.push({ token: d.id, ...d.data() }));
    adminSnap.docs.forEach(d => targets.push({ token: d.id, ...d.data() }));
    
    if (targets.length === 0) {
        console.log('❌ 원장님 토큰 없음');
        process.exit(1);
    }

    for (const t of targets) {
        console.log(`📤 원장님에게 전송 중... (token: ${t.token.substring(0, 25)}...)`);
        try {
            const result = await admin.messaging().send({
                token: t.token,
                notification: {
                    title: '🧪 테스트 알림',
                    body: '원장님, 푸시 알림 테스트입니다! 정상 수신되면 성공입니다. ✅'
                },
                webpush: {
                    fcmOptions: { link: 'https://boksaem-yoga.web.app/instructor' }
                }
            });
            console.log('✅ 발송 성공:', result);
        } catch (e) {
            console.error('❌ 발송 실패:', e.code, e.message);
        }
    }
    process.exit(0);
}
run();
