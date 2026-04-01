const admin = require('firebase-admin');

const serviceAccount = require('../functions/service-account-key.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// 2. 삭제할 '가짜 지점'들의 영문 ID 명단 (사진 스크린샷 100% 반영)
const FAKE_STUDIOS = [
    'boksaem_gwangheungchang',
    'default',
    'demo_yoga',
    'hongdae'
];

async function deleteCollectionRecursively(collectionRef) {
    const snapshot = await collectionRef.get();
    if (snapshot.empty) return;
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
}

async function nukeStudio(studioId) {
    console.log(`\n💣 [${studioId}] 스튜디오 폭파 작업 시작...`);
    const branchRef = db.collection('branches').doc(studioId);

    // 하위 컬렉션들 모조리 삭제 (회원, 출석, 공지, 수강권, 설정 등)
    const subcollections = ['members', 'attendances', 'packages', 'settings', 'notices', 'payments'];
    for (const sub of subcollections) {
        process.stdout.write(`  - ${sub} 데이터 지우는 중... `);
        await deleteCollectionRecursively(branchRef.collection(sub));
        console.log('완료');
    }

    // branches/studioId 본체 문서 삭제
    process.stdout.write(`  - 메인 branches 문서 탈거 중... `);
    await branchRef.delete();
    console.log('완료');

    // Registry 명부에서 최종 삭제
    process.stdout.write(`  - 레지스트리 명부에서 이름 지우는 중... `);
    await db.collection('platform').doc('registry').collection('studios').doc(studioId).delete();
    console.log('완료');

    console.log(`✅ [${studioId}] 완전 소각 완료!`);
}

async function main() {
    console.log('============================================');
    console.log('🔥 PassFlow Ai - 가짜 스튜디오 대청소 시작 🔥');
    console.log('============================================');
    console.log('삭제 대상:', FAKE_STUDIOS.join(', '));
    console.log('--------------------------------------------\n');

    for (const id of FAKE_STUDIOS) {
        await nukeStudio(id);
    }
    
    console.log('\n🎉 모든 쓰레기 스튜디오 데이터가 클라우드에서 완벽히 소각되었습니다!');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ 작업 중 오류 발생:', err);
    process.exit(1);
});
