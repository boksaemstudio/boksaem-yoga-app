const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: 'boksaem-yoga'
    });
}

const db = admin.firestore();

// 1. Ghost Studios (테스트 배포 당시 생성된 가짜/버려진 스튜디오들)
const invalidStudios = [
    'boksaem_gwangheungchang', 'default', 'demo', 'demo_yoga', 
    'dg', 'gangnam', 'hongdae', 'mapo', 'master', 
    'nalesa', 'passflow-0324', 'songfila'
];

// 2. Legacy Root Collections (SaaS 멀티테넌트 마이그레이션 전 쓰이던 옛날 글로벌 데이터)
const legacyRoots = [
    'members', 'attendance', 'daily_classes', 'monthly_schedules', 
    'notices', 'settings', 'images', 'booking_stats', 'bookings', 
    'sales', 'sales_history', 'schedules', 'weekly_templates'
];

async function deleteCollection(collectionRef, batchSize = 100) {
    const query = collectionRef.orderBy('__name__').limit(batchSize);
    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(query, resolve) {
    const snapshot = await query.get();
    const batchSize = snapshot.size;
    if (batchSize === 0) {
        resolve();
        return;
    }
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    process.nextTick(() => {
        deleteQueryBatch(query, resolve);
    });
}

async function nukeGarbage() {
    console.log("🔥 [Phase 1] 루트 레벨 옛날 찌꺼기 컬렉션 소각 시작...");
    for (const root of legacyRoots) {
        process.stdout.write(`- Deleting /${root} ... `);
        await deleteCollection(db.collection(root));
        console.log('✅ Done');
    }

    console.log("\n🔥 [Phase 2] 유령 테넌트(스튜디오) 분자 단위 소각 시작...");
    // Firestore admin SDK에는 하위 컬렉션 자동 삭제 옵션이 없기 때문에 모든 서브컬렉션을 찾아서 지워야 함.
    const knownSubcollections = ['members', 'attendance', 'daily_classes', 'monthly_schedules', 'notices', 'settings', 'images', 'pricing', 'schedules', 'revenue'];
    
    for (const studioId of invalidStudios) {
        process.stdout.write(`- Deleting /studios/${studioId} and deep subcollections ... `);
        const studioRef = db.collection('studios').doc(studioId);
        
        // 지울 하위 컬렉션 순회
        for(const sub of knownSubcollections) {
            await deleteCollection(studioRef.collection(sub));
        }
        
        // 마지막으로 해당 스튜디오 글로벌 컨테이너(문서) 삭제
        await studioRef.delete();
        console.log('✅ Done');
    }

    console.log("\n🧹 가비지 컬렉션(GC) 100% 완료: 서버의 숨통이 트였습니다!");
}

nukeGarbage().catch(e => console.error('Error during nuke:', e));
