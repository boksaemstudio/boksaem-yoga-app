/**
 * 🚨 긴급 수정: ssangmun-yoga 테넌트에 잘못 주입된 데모 이미지 데이터 제거
 * 
 * 발견된 오염:
 *   studios/ssangmun-yoga/images/price_table_1 → demo_pricing.png (데모 데이터)
 *   studios/ssangmun-yoga/images/price_table_2 → demo_pricing.png (데모 데이터)
 *   studios/ssangmun-yoga/images/timetable_1   → demo_schedule.png (데모 데이터)
 *   studios/ssangmun-yoga/images/timetable_2   → demo_schedule.png (데모 데이터)
 */
const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function purge() {
    const contaminated = [
        'studios/ssangmun-yoga/images/price_table_1',
        'studios/ssangmun-yoga/images/price_table_2',
        'studios/ssangmun-yoga/images/timetable_1',
        'studios/ssangmun-yoga/images/timetable_2',
    ];

    console.log('🚨 쌍문요가 테넌트 데모 데이터 오염 제거 시작\n');

    for (const path of contaminated) {
        const docRef = db.doc(path);
        const snap = await docRef.get();
        
        if (snap.exists) {
            const data = snap.data();
            const url = data.url || data.base64 || '(no url field)';
            console.log(`  ❌ 삭제: ${path}`);
            console.log(`     데이터: ${typeof url === 'string' ? url.substring(0, 100) : url}`);
            await docRef.delete();
            console.log(`     ✅ 삭제 완료`);
        } else {
            console.log(`  ⏭️ 이미 없음: ${path}`);
        }
    }

    // 검증
    console.log('\n── 삭제 후 검증 ──');
    const remainingSnap = await db.collection('studios/ssangmun-yoga/images').get();
    if (remainingSnap.empty) {
        console.log('  ✅ ssangmun-yoga/images 컬렉션 완전히 비어있음 — 정상');
    } else {
        console.log(`  ⚠️ ${remainingSnap.size}개 문서 남아있음:`);
        remainingSnap.forEach(d => console.log(`    ${d.id}`));
    }

    console.log('\n✅ 쌍문요가 테넌트 데이터 정화 완료');
    process.exit(0);
}

purge().catch(e => { console.error('❌', e); process.exit(1); });
