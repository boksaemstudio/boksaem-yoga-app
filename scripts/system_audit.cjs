const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TENANT = 'boksaem-yoga';
const today = '2026-03-20';

async function audit() {
    console.log('=== 📊 종합 시스템 로그 감사 ===');
    console.log(`날짜: ${today} | 테넌트: ${TENANT}\n`);

    // 1. 출석 로그 — 사진 누락 체크
    console.log('── 1. 출석 로그 (사진 체크) ──');
    const attSnap = await db.collection(`studios/${TENANT}/attendance`)
        .where('date', '==', today).get();
    let photoMissing = 0;
    attSnap.forEach(d => {
        const r = d.data();
        const time = r.timestamp?.toDate?.()?.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' }) || '?';
        const hasPhoto = !!r.photoUrl;
        if (!hasPhoto) photoMissing++;
        console.log(`  ${time} ${(r.memberName || '?').padEnd(6)} ${hasPhoto ? '📷' : '❌'} ${r.branch || ''} ${r.status || ''}`);
    });
    console.log(`  총 ${attSnap.size}건, 사진누락 ${photoMissing}건\n`);

    // 2. 에러 로그
    console.log('── 2. 에러 로그 ──');
    try {
        const errSnap = await db.collection(`studios/${TENANT}/errorLogs`)
            .orderBy('timestamp', 'desc').limit(20).get();
        if (errSnap.empty) {
            console.log('  에러 로그 없음 ✅');
        } else {
            errSnap.forEach(d => {
                const e = d.data();
                const time = e.timestamp?.toDate?.()?.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' }) || '?';
                console.log(`  ${time} ${(e.message || e.error || JSON.stringify(e)).substring(0, 100)}`);
            });
        }
    } catch (e) { console.log('  에러 로그 컬렉션 없음 (정상)'); }
    console.log();

    // 3. AI 생성 로그
    console.log('── 3. AI 인사말 생성 ──');
    try {
        const aiSnap = await db.collection(`studios/${TENANT}/aiCache`)
            .orderBy('createdAt', 'desc').limit(10).get();
        if (aiSnap.empty) {
            console.log('  AI 캐시 없음');
        } else {
            aiSnap.forEach(d => {
                const a = d.data();
                const time = a.createdAt?.toDate?.()?.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' }) || '?';
                console.log(`  ${time} ${d.id.substring(0, 15)} msg=${(a.message || '').substring(0, 40)}...`);
            });
        }
    } catch (e) { console.log('  AI 캐시 컬렉션 없음'); }
    console.log();

    // 4. 회원 데이터 무결성
    console.log('── 4. 회원 데이터 무결성 ──');
    const memSnap = await db.collection(`studios/${TENANT}/members`).get();
    let noPhone = 0, noName = 0, noType = 0, total = memSnap.size;
    memSnap.forEach(d => {
        const m = d.data();
        if (!m.phone) noPhone++;
        if (!m.name) noName++;
        if (!m.membershipType) noType++;
    });
    console.log(`  총 ${total}명`);
    console.log(`  전화번호 없음: ${noPhone}, 이름 없음: ${noName}, 회원유형 없음: ${noType}`);
    if (noPhone === 0 && noName === 0) console.log('  ✅ 필수 필드 무결성 OK');
    else console.log('  ⚠️ 필수 필드 누락 있음');
    console.log();

    // 5. 가격표 데이터
    console.log('── 5. 가격표 데이터 ──');
    const priceSnap = await db.collection(`studios/${TENANT}/pricingPlans`).get();
    console.log(`  ${priceSnap.size}개 요금제`);
    priceSnap.forEach(d => {
        const p = d.data();
        console.log(`  - ${p.label || p.name || d.id}: ${p.price?.toLocaleString() || '?'}원 (${p.sessions || '?'}회)`);
    });
    console.log();

    // 6. 스튜디오 설정
    console.log('── 6. 스튜디오 설정 ──');
    const cfgDoc = await db.doc(`studios/${TENANT}/config/settings`).get();
    if (cfgDoc.exists) {
        const c = cfgDoc.data();
        console.log(`  이름: ${c.IDENTITY?.NAME || '?'}`);
        console.log(`  카메라: ${c.POLICIES?.SHOW_CAMERA_PREVIEW ? 'ON' : 'OFF'}`);
        console.log(`  얼굴인식: ${c.POLICIES?.FACE_RECOGNITION_ENABLED ? 'ON' : 'OFF'}`);
        console.log(`  자동닫힘: ${c.POLICIES?.SESSION_AUTO_CLOSE_SEC || '?'}초`);
    } else {
        console.log('  설정 문서 없음 ⚠️');
    }
    console.log();

    // 7. Storage 사진 파일 크기
    console.log('── 7. Firebase Functions 로그 (최근 에러) ──');
    console.log('  → Firebase Console에서 직접 확인 필요');
    console.log('  https://console.firebase.google.com/project/boksaem-yoga/functions/logs');
    console.log();

    console.log('=== 감사 완료 ===');
    process.exit(0);
}

audit().catch(e => { console.error('Audit failed:', e.message); process.exit(1); });
