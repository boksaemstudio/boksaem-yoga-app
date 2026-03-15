/**
 * [SaaS 마이그레이션 스크립트] 루트 레벨 데이터를 특정 테넌트(하위 컬렉션)로 이동
 * 
 * 주의: 이 스크립트는 firebase-admin을 사용하며 로컬에서 실행되어야 합니다.
 * 서비스 계정 키(serviceAccountKey.json)가 현재 디렉토리에 필요합니다.
 * 
 * 실행 방법:
 * node scripts/migrate_tenant_data.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. 서비스 계정 키 로드 (키 경로를 실제 환경에 맞게 수정하세요)
const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error(`\n🚨 [오류] 서비스 계정 키를 찾을 수 없습니다: ${serviceAccountPath}`);
    console.error(`Firebase 콘솔 -> 프로젝트 설정 -> 서비스 계정에서 '새 비공개 키 생성' 후`);
    console.error(`프로젝트 루트에 'serviceAccountKey.json' 이름으로 저장해주세요.\n`);
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 2. 마이그레이션 설정
const TARGET_TENANT_ID = 'boksaem-yoga'; // 이전할 테넌트 ID
const collectionsToMigrate = [
    'members',
    'sales',
    'bookings',
    'attendance',
    'daily_classes',
    'monthly_schedules',
    'monthly_schedules_backup',
    'push_history',
    'notices',
    'face_biometrics',
    'member_diligence',
    // [FIX] 1차 마이그레이션에서 누락된 컬렉션 추가
    'images',
    'messages',
    'push_campaigns',
    'weekly_templates',
    'login_failures'
];

async function migrateCollection(collectionName) {
    console.log(`\n📦 컬렉션 복사 시작: [${collectionName}] -> [studios/${TARGET_TENANT_ID}/${collectionName}]`);
    
    const sourceRef = db.collection(collectionName);
    const targetRef = db.collection(`studios/${TARGET_TENANT_ID}/${collectionName}`);
    
    const snapshot = await sourceRef.get();
    if (snapshot.empty) {
        console.log(`   └ 데이터가 없습니다. 건너뜁니다.`);
        return;
    }

    let batch = db.batch();
    let count = 0;
    let totalCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const newDocRef = targetRef.doc(doc.id);
        
        batch.set(newDocRef, data);
        count++;
        totalCount++;

        // Firestore batch는 최대 500개까지만 허용됨
        if (count === 490) {
            await batch.commit();
            console.log(`   └ ${totalCount}개 문서 복사 완료...`);
            batch = db.batch();
            count = 0;
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`   └ ${totalCount}개 문서 복사 완료...`);
    }
    
    console.log(`✅ [${collectionName}] 복사 완료 (총 ${totalCount}건)`);
}

async function runMigration() {
    console.log('=============================================');
    console.log(`🚀 테넌트 데이터 마이그레이션 시작 (Target: ${TARGET_TENANT_ID})`);
    console.log('=============================================');

    try {
        // 기존 글로벌 설정(settings, system_state)은 테넌트 분리 대상이 아니므로 제외합니다.
        for (const col of collectionsToMigrate) {
            await migrateCollection(col);
        }
        
        console.log('\n🎉 모든 대상 컬렉션 마이그레이션이 완료되었습니다.');
        console.log('주의: 기존 루트 레벨 데이터는 삭제되지 않았습니다. 안전을 위해 검증 후 수동 삭제를 권장합니다.');
        
    } catch (error) {
        console.error('❌ 마이그레이션 중 오류 발생:', error);
    }
}

runMigration();
