/**
 * 테넌트 격리 데이터 마이그레이션 스크립트
 * 
 * 루트 레벨 컬렉션 → studios/boksaem-yoga/ 하위로 복사
 * 
 * 사용법: 프로젝트 루트에서 실행
 *   node scripts/migrate_tenant_data.cjs
 * 
 * ⚠️ 주의: 이 스크립트는 데이터를 복사합니다 (삭제하지 않음).
 *   원본 루트 데이터는 그대로 유지되므로 안전합니다.
 */

const admin = require('firebase-admin');

// Firebase Admin 초기화 (firebase login 상태에서 실행)
// GOOGLE_APPLICATION_CREDENTIALS 또는 ADC(Application Default Credentials) 사용
admin.initializeApp({
    projectId: 'boksaem-yoga'
});

const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';

// 마이그레이션할 컬렉션 목록 (테넌트별 데이터)
const TENANT_COLLECTIONS = [
    'members',
    'attendance',
    'sales',
    'daily_classes',
    'bookings',
    'booking_stats',
    'booking_logs',
    'fcm_tokens',
    'fcmTokens',
    'push_tokens',
    'messages',
    'notices',
    'push_campaigns',
    'push_history',
    'message_approvals',
    'pending_attendance',
    'pending_approvals',
    'practice_events',
    'settings',
    'stats'
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
    
    console.log(`  📊 Found ${snapshot.size} documents`);
    
    // Batch write (최대 500개씩)
    const BATCH_SIZE = 400;
    let processed = 0;
    let batch = db.batch();
    let batchCount = 0;
    
    for (const doc of snapshot.docs) {
        const targetDocRef = targetRef.doc(doc.id);
        batch.set(targetDocRef, doc.data());
        batchCount++;
        
        if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            processed += batchCount;
            console.log(`  ✅ Batch committed: ${processed}/${snapshot.size}`);
            batch = db.batch();
            batchCount = 0;
        }
    }
    
    // 남은 문서 커밋
    if (batchCount > 0) {
        await batch.commit();
        processed += batchCount;
        console.log(`  ✅ Final batch: ${processed}/${snapshot.size}`);
    }
    
    return { name: collectionName, count: processed, status: 'migrated' };
}

async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('  🔄 테넌트 격리 데이터 마이그레이션');
    console.log(`  Target: studios/${STUDIO_ID}/`);
    console.log('═══════════════════════════════════════════');
    
    const results = [];
    
    for (const col of TENANT_COLLECTIONS) {
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
