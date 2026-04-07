const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });

async function investigate() {
    const db = admin.firestore();
    
    // 1. Check studios config - BRANCHES array
    console.log('\n=== 1. 복샘요가 스튜디오 BRANCHES 설정 ===');
    const studioDoc = await db.collection('studios').doc('boksaem-yoga').get();
    if (studioDoc.exists) {
        const data = studioDoc.data();
        const branches = data.BRANCHES || [];
        console.log(`BRANCHES 배열 길이: ${branches.length}`);
        branches.forEach(b => console.log(`  - id: ${b.id}, name: ${b.name}`));
        if (branches.length <= 1) {
            console.log('⚠️ 단일 지점이므로 branches.length > 1 조건에서 branchLabel은 항상 빈 문자열');
        }
    } else {
        console.log('❌ studios/boksaem-yoga 문서가 없음!');
    }
    
    // 2. Check recent attendance - branchId values
    console.log('\n=== 2. 최근 출석 기록의 branchId 분포 ===');
    const attSnap = await db.collection('studios').doc('boksaem-yoga')
        .collection('attendance')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
    
    console.log(`최근 출석 ${attSnap.size}건:`);
    const branchCount = {};
    attSnap.docs.forEach(doc => {
        const d = doc.data();
        const bid = d.branchId || '(없음)';
        branchCount[bid] = (branchCount[bid] || 0) + 1;
        // Show first 5
        if (Object.keys(branchCount).length <= 5 || branchCount[bid] <= 2) {
            console.log(`  ${d.date} | ${d.memberName || '?'} | branchId: ${bid} | class: ${d.className || '?'}`);
        }
    });
    console.log('\nbranchId 분포:', branchCount);
    
    // 3. Check FCM tokens
    console.log('\n=== 3. FCM 토큰 상태 ===');
    const tokensSnap = await db.collection('studios').doc('boksaem-yoga')
        .collection('fcm_tokens')
        .get();
    console.log(`총 FCM 토큰: ${tokensSnap.size}개`);
    const roleCount = {};
    tokensSnap.docs.forEach(doc => {
        const d = doc.data();
        const role = d.role || '(없음)';
        roleCount[role] = (roleCount[role] || 0) + 1;
    });
    console.log('역할별 토큰:', roleCount);
    
    // 4. Check ssangmunyoga studio too
    console.log('\n=== 4. 쌍문요가 스튜디오 BRANCHES 설정 ===');
    const ssDoc = await db.collection('studios').doc('ssangmunyoga').get();
    if (ssDoc.exists) {
        const data = ssDoc.data();
        const branches = data.BRANCHES || [];
        console.log(`BRANCHES 배열 길이: ${branches.length}`);
        branches.forEach(b => console.log(`  - id: ${b.id}, name: ${b.name}`));
    } else {
        console.log('❌ studios/ssangmunyoga 문서가 없음');
    }
    
    process.exit(0);
}

investigate().catch(e => { console.error(e); process.exit(1); });
