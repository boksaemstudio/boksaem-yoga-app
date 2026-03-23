const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'boksaem-yoga'
});
const db = admin.firestore();
const STUDIO = 'boksaem-yoga';

async function testInstructorPush() {
    const col = db.collection(`studios/${STUDIO}/fcm_tokens`);
    
    // 1. 강사 토큰 확인
    console.log('=== 강사(instructor) 토큰 ===');
    const snap = await col.get();
    const instructorTokens = [];
    snap.forEach(doc => {
        const d = doc.data();
        if (d.role === 'instructor' || (d.roles && d.roles.includes('instructor'))) {
            console.log(`  ${doc.id.substring(0, 40)}...`);
            console.log(`    instructorName=${d.instructorName || 'N/A'} role=${d.role} roles=${d.roles || 'N/A'} updated=${d.updatedAt}`);
            instructorTokens.push(doc.id);
        }
    });
    console.log(`강사 토큰: ${instructorTokens.length}개\n`);
    
    if (instructorTokens.length === 0) {
        console.log('❌ 강사 토큰이 없습니다.');
        process.exit(0);
    }
    
    // 2. 테스트 푸시 발송
    console.log('--- 강사 푸시 발송 ---');
    let success = 0, fail = 0;
    for (const token of instructorTokens) {
        try {
            const result = await admin.messaging().send({
                token,
                notification: { title: '🧘 복샘요가 강사앱', body: '강사 푸시 알림 테스트입니다! ✅' },
                data: { url: '/instructor', tag: 'instructor-test' }
            });
            console.log(`  ✅ ${result}`);
            success++;
        } catch (e) {
            console.log(`  ❌ ${e.code || e.message}`);
            fail++;
        }
    }
    console.log(`성공: ${success}, 실패: ${fail}`);
    
    process.exit(0);
}

testInstructorPush().catch(err => { console.error(err); process.exit(1); });
