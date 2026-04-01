const admin = require('firebase-admin');

// 1. SDK 초기화
const serviceAccount = require('../functions/service-account-key.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// 2. 데모 시더 모듈 
const demoSeeder = require('../functions/helpers/demoSeeder');

async function main() {
    try {
        console.log('-------------------------------------------');
        console.log('🔄 데모 스튜디오 완전 복원 및 레지스트리 삽입 통신 재시작...');
        console.log('-------------------------------------------');
        const sid = 'demo-yoga';

        // [Phase 1] 잃어버린 레지스트리 (SuperAdmin 목록) 부활
        const registryData = {
            id: sid,
            name: 'PassFlow 데모 플랫폼',
            nameEnglish: 'passflow-demo',
            ownerEmail: 'demo@passflow.app',
            status: 'active',
            plan: 'pro',
            domain: '',
            createdAt: new Date().toISOString(),
            memberCount: 0
        };
        await db.collection('platform').doc('registry').collection('studios').doc(sid).set(registryData, { merge: true });
        console.log(`✅ 슈퍼어드민 레지스트리에 [${sid}] 등록! (이제 슈퍼어드민 화면에 뜹니다)`);

        // [Phase 2] 데모 시더(Demo Seeder) 본체 구동
        console.log(`🚀 기존 demoSeeder 엔진을 구동하여 수만 건의 가상 데이터를 쏟아 붓습니다...`);
        // demoSeeder.js 내부 함수를 직접 타게팅 
        await demoSeeder.refreshDemoData();

        console.log('\n===========================================');
        console.log('🎉 데모 스튜디오가 더 화려한 데이터와 함께 완벽히 부활했습니다!');
        console.log('===========================================');
        process.exit(0);
    } catch (e) {
        console.error('❌ 복원 중 치명적인 에러 발생:', e);
        process.exit(1);
    }
}

main();
