const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const acc = require('../functions/service-account-key.json');
const { refreshDemoData } = require('../functions/helpers/demoSeeder');

try { initializeApp({ credential: cert(acc) }); } catch (e) {}
const db = getFirestore();

async function run() {
    console.log("🔥 긴급 복구 오토 스크립트 가동 중...");
    
    // 1. 기존 잘못된 컬렉션 지우기 (daily_classes 찌꺼기 삭제)
    console.log("1. 잘못 입력되었던 daily_classes 캐시 삭제 중...");
    const tdb = db.collection('studios').doc('demo-yoga');
    const oldClasses = await tdb.collection('daily_classes').get();
    const batch = db.batch();
    oldClasses.docs.forEach(d => batch.delete(d.ref));
    if (oldClasses.size > 0) await batch.commit();

    // 2. 복샘요가 로고 흔적 강제 완전 소각 (Field 삭제)
    console.log("2. 찌꺼기로 남은 복샘요가 스케줄/타임테이블 로고 완전 소각 중...");
    await tdb.update({
        'settings.ASSETS.SCHEDULE': FieldValue.delete(),
        'settings.ASSETS.TIMETABLE': FieldValue.delete()
    });

    // 3. 데모 시더 실행 (아까 classes로 바꾼 정상 버전)
    console.log("3. 데모 데이터 정상 재생성 중 (월간 클래스 & 출석)...");
    await refreshDemoData();
    
    console.log("✅ 완료!! 화면을 새로고침 하시면 완벽하게 뜰 것입니다!");
    process.exit(0);
}

run().catch(console.error);
