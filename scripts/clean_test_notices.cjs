/**
 * 테스트 공지사항 "새 스튜디오 가입: Test Studio" 삭제 스크립트
 * 
 * 복샘요가 스튜디오의 notices 컬렉션에서
 * "Test Studio" 또는 "test-studio" 관련 공지를 찾아 삭제합니다.
 */
const admin = require('firebase-admin');
const path = require('path');

// Service Account 키 로드
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function cleanTestNotices() {
    // 복샘요가 스튜디오 ID들
    const studioIds = ['boksaem', 'boksaem-ssangmun'];
    
    for (const studioId of studioIds) {
        console.log(`\n=== ${studioId} notices 검색 ===`);
        const noticesRef = db.collection(`studios/${studioId}/notices`);
        const snapshot = await noticesRef.get();
        
        if (snapshot.empty) {
            console.log('  공지 없음');
            continue;
        }
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const title = data.title || '';
            const content = data.content || '';
            const isTestData = 
                title.includes('Test Studio') ||
                title.includes('test-studio') ||
                content.includes('Test Studio') ||
                content.includes('test@example.com') ||
                content.includes('test-studio-mnysHz2d') ||
                title.includes('새 스튜디오 가입');
            
            console.log(`  📋 [${doc.id}] ${title.substring(0, 50)} — ${isTestData ? '🔴 테스트 데이터' : '✅ 정상'}`);
            
            if (isTestData) {
                console.log(`     → 삭제 중...`);
                await noticesRef.doc(doc.id).delete();
                console.log(`     → ✅ 삭제 완료`);
            }
        }
    }
    
    console.log('\n✅ 테스트 공지 정리 완료');
    process.exit(0);
}

cleanTestNotices().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
