/**
 * 누락 컬렉션 추가 마이그레이션 스크립트
 * 
 * 기존 migrate_tenant_data.cjs에 없던 컬렉션들을 루트 → 테넌트로 복사
 * settings, fcm_tokens는 기존 스크립트에 있지만, 이후 프론트에서
 * globalDoc으로 저장한 데이터가 있을 수 있으므로 다시 실행합니다.
 * 
 * 사용법: node scripts/migrate_remaining.cjs
 */

const admin = require('firebase-admin');

const path = require('path');
const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'boksaem-yoga'
});

const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';

// 이번에 프론트에서 tenantDb.doc으로 변경한 모든 컬렉션
const COLLECTIONS_TO_MIGRATE = [
    'settings',         // pricing, instructors, classTypes, classLevels, kiosk
    'fcm_tokens',       // 푸시 토큰
    'fcmTokens',        // 레거시 푸시 토큰
    'push_tokens',      // 레거시 푸시 토큰
    'error_logs',       // 에러 로그
    'system_state',     // 키오스크 동기화
    'ai_quota',         // AI 사용량
    'stats',            // revenue_summary
    'message_approvals' // AI 메시지 승인
];

async function migrateCollection(collectionName) {
    console.log(`\n📂 Migrating: ${collectionName}`);
    
    const sourceRef = db.collection(collectionName);
    const targetRef = db.collection(`studios/${STUDIO_ID}/${collectionName}`);
    
    const snapshot = await sourceRef.get();
    
    if (snapshot.empty) {
        console.log(`  ⏭️  Empty collection, skipping.`);
        return { name: collectionName, count: 0, status: 'empty' };
    }
    
    console.log(`  📊 Found ${snapshot.size} documents in ROOT`);
    
    // 테넌트 경로에 이미 있는 문서 확인
    const targetSnap = await targetRef.get();
    const existingIds = new Set(targetSnap.docs.map(d => d.id));
    
    const BATCH_SIZE = 400;
    let processed = 0;
    let skipped = 0;
    let batch = db.batch();
    let batchCount = 0;
    
    for (const doc of snapshot.docs) {
        if (existingIds.has(doc.id)) {
            // 이미 테넌트에 있으면 최신 데이터로 덮어쓰기 (merge)
            const targetDocRef = targetRef.doc(doc.id);
            batch.set(targetDocRef, doc.data(), { merge: true });
        } else {
            // 새로 복사
            const targetDocRef = targetRef.doc(doc.id);
            batch.set(targetDocRef, doc.data());
        }
        batchCount++;
        
        if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            processed += batchCount;
            console.log(`  ✅ Batch committed: ${processed}/${snapshot.size}`);
            batch = db.batch();
            batchCount = 0;
        }
    }
    
    if (batchCount > 0) {
        await batch.commit();
        processed += batchCount;
        console.log(`  ✅ Final batch: ${processed}/${snapshot.size} (${skipped} already existed, merged)`);
    }
    
    return { name: collectionName, count: processed, status: 'migrated' };
}

async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('  🔄 추가 컬렉션 테넌트 마이그레이션');
    console.log(`  Root / → studios/${STUDIO_ID}/`);
    console.log('═══════════════════════════════════════════');
    
    const results = [];
    
    for (const col of COLLECTIONS_TO_MIGRATE) {
        try {
            const result = await migrateCollection(col);
            results.push(result);
        } catch (error) {
            console.error(`  ❌ Error migrating ${col}:`, error.message);
            results.push({ name: col, count: 0, status: 'error', error: error.message });
        }
    }
    
    console.log('\n═══════════════════════════════════════════');
    console.log('  📋 Migration Summary');
    console.log('═══════════════════════════════════════════');
    
    let totalDocs = 0;
    for (const r of results) {
        const icon = r.status === 'migrated' ? '✅' : r.status === 'empty' ? '⏭️' : '❌';
        console.log(`  ${icon} ${r.name}: ${r.count} docs (${r.status})`);
        totalDocs += r.count;
    }
    
    console.log(`\n  Total: ${totalDocs} documents migrated.`);
    console.log('═══════════════════════════════════════════\n');
    
    process.exit(0);
}

main().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
});
