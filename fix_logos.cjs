const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'boksaem-yoga' });
const db = admin.firestore();

async function run() {
    const studios = ['boksaem-yoga', 'ssangmun-yoga', 'demo-yoga'];
    
    console.log('\n=== 🔍 전수 조사: 모든 스튜디오 로고 설정 ===\n');
    for (const id of studios) {
        const doc = await db.doc(`studios/${id}`).get();
        if (!doc.exists) { console.log(`[${id}] ❌ 문서 없음`); continue; }
        const d = doc.data();
        console.log(`[${id}] ${d.IDENTITY?.NAME || '(이름없음)'}`);
        console.log(`  IDENTITY.LOGO_URL: ${d.IDENTITY?.LOGO_URL || '(없음)'}`);
        console.log(`  ASSETS.LOGO.WIDE: ${d.ASSETS?.LOGO?.WIDE || '(없음)'}`);
        console.log(`  ASSETS.LOGO.SQUARE: ${d.ASSETS?.LOGO?.SQUARE || '(없음)'}`);
        console.log(`  ASSETS.LOGO.RYS200: ${d.ASSETS?.LOGO?.RYS200 || '(없음)'}`);
        console.log('');
    }

    // 데모 스튜디오: 정사각형 로고 + RYS200 제거
    console.log('=== 🔧 데모 스튜디오 로고 업데이트 ===');
    await db.doc('studios/demo-yoga').set({
        IDENTITY: { LOGO_URL: '/assets/passflow_square_logo.png' },
        ASSETS: { LOGO: { WIDE: '/assets/passflow_ai_logo_transparent.png', SQUARE: '/assets/passflow_square_logo.png', RYS200: '' } }
    }, { merge: true });
    console.log('✅ demo-yoga 완료\n');

    // 쌍문요가: RYS200 제거 (복샘요가 전용)
    console.log('=== 🔧 쌍문요가 RYS200 제거 ===');
    await db.doc('studios/ssangmun-yoga').set({
        ASSETS: { LOGO: { RYS200: '' } }
    }, { merge: true });
    console.log('✅ ssangmun-yoga 완료\n');

    // 복샘요가: RYS200 확인 (이미 있어야 함)
    const boksaem = await db.doc('studios/boksaem-yoga').get();
    const bData = boksaem.data();
    if (!bData?.ASSETS?.LOGO?.RYS200 || bData.ASSETS.LOGO.RYS200 === '') {
        console.log('⚠️ 복샘요가에 RYS200 누락! 복구합니다...');
        await db.doc('studios/boksaem-yoga').set({
            ASSETS: { LOGO: { RYS200: '/assets/RYS200.webp' } }
        }, { merge: true });
        console.log('✅ boksaem-yoga RYS200 복구 완료\n');
    } else {
        console.log(`✅ 복샘요가 RYS200 정상: ${bData.ASSETS.LOGO.RYS200}\n`);
    }

    console.log('=== ✅ 최종 확인 ===\n');
    for (const id of studios) {
        const doc = await db.doc(`studios/${id}`).get();
        if (!doc.exists) continue;
        const d = doc.data();
        console.log(`[${id}] ${d.IDENTITY?.NAME || ''}`);
        console.log(`  LOGO_URL: ${d.IDENTITY?.LOGO_URL || '(없음)'}`);
        console.log(`  WIDE: ${d.ASSETS?.LOGO?.WIDE || '(없음)'}`);
        console.log(`  RYS200: ${d.ASSETS?.LOGO?.RYS200 || '(없음)'}`);
        console.log('');
    }
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
