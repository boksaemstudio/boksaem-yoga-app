/**
 * Phase 1: 테넌트 경로 데이터 검증 스크립트
 * studios/boksaem-yoga/ 하위에 모든 필수 데이터가 존재하는지 확인
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'boksaem-yoga'
});

const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';
const tenant = (col) => `studios/${STUDIO_ID}/${col}`;

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

let passed = 0;
let failed = 0;
const results = [];

async function check(name, fn) {
    try {
        const result = await fn();
        if (result.ok) {
            passed++;
            results.push({ name, status: '✅', detail: result.detail });
        } else {
            failed++;
            results.push({ name, status: '❌', detail: result.detail });
        }
    } catch (e) {
        failed++;
        results.push({ name, status: '❌', detail: e.message });
    }
}

async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('  🔍 테넌트 경로 데이터 검증');
    console.log(`  Path: studios/${STUDIO_ID}/`);
    console.log(`  Date: ${today}`);
    console.log('═══════════════════════════════════════════\n');

    // 1. settings/pricing
    await check('settings/pricing', async () => {
        const doc = await db.doc(tenant('settings') + '/pricing').get();
        if (!doc.exists) return { ok: false, detail: '문서 없음' };
        const data = doc.data();
        return { ok: true, detail: `필드: ${Object.keys(data).join(', ')}` };
    });

    // 2. settings/instructors
    await check('settings/instructors', async () => {
        const doc = await db.doc(tenant('settings') + '/instructors').get();
        if (!doc.exists) return { ok: false, detail: '문서 없음' };
        const list = doc.data().list;
        return { ok: Array.isArray(list) && list.length > 0, detail: `강사 ${list?.length || 0}명` };
    });

    // 3. settings/classTypes
    await check('settings/classTypes', async () => {
        const doc = await db.doc(tenant('settings') + '/classTypes').get();
        if (!doc.exists) return { ok: false, detail: '문서 없음' };
        return { ok: true, detail: `필드: ${Object.keys(doc.data()).join(', ')}` };
    });

    // 4. fcm_tokens
    await check('fcm_tokens', async () => {
        const snap = await db.collection(tenant('fcm_tokens')).limit(100).get();
        return { ok: snap.size > 0, detail: `${snap.size}개 토큰` };
    });

    // 5. members
    await check('members', async () => {
        const snap = await db.collection(tenant('members')).get();
        const rootSnap = await db.collection('members').get();
        return {
            ok: snap.size > 0 && snap.size >= rootSnap.size,
            detail: `테넌트: ${snap.size}명, 루트: ${rootSnap.size}명`
        };
    });

    // 6. attendance (오늘)
    await check('attendance (오늘)', async () => {
        const snap = await db.collection(tenant('attendance'))
            .where('date', '==', today).limit(5).get();
        return { ok: snap.size > 0, detail: `오늘 출석: ${snap.size}건` };
    });

    // 7. stats/revenue_summary
    await check('stats/revenue_summary', async () => {
        const doc = await db.doc(tenant('stats') + '/revenue_summary').get();
        if (!doc.exists) return { ok: false, detail: '문서 없음' };
        return { ok: true, detail: `필드: ${Object.keys(doc.data()).slice(0, 5).join(', ')}...` };
    });

    // 8. ai_quota (오늘)
    await check('ai_quota (오늘)', async () => {
        const doc = await db.doc(tenant('ai_quota') + `/${today}`).get();
        if (!doc.exists) return { ok: false, detail: '오늘자 문서 없음 (AI 미사용 가능)' };
        return { ok: true, detail: `count: ${doc.data().count || 0}` };
    });

    // 9. system_state/kiosk_sync
    await check('system_state/kiosk_sync', async () => {
        const doc = await db.doc(tenant('system_state') + '/kiosk_sync').get();
        if (!doc.exists) return { ok: false, detail: '문서 없음' };
        return { ok: true, detail: `lastSync: ${doc.data().lastSync || 'N/A'}` };
    });

    // 10. error_logs
    await check('error_logs', async () => {
        const snap = await db.collection(tenant('error_logs')).limit(5).get();
        return { ok: snap.size > 0, detail: `${snap.size}건 (최근 5개)` };
    });

    // 11. sales
    await check('sales', async () => {
        const snap = await db.collection(tenant('sales')).limit(5).get();
        return { ok: snap.size > 0, detail: `${snap.size}건 (최근 5개)` };
    });

    // 12. daily_classes
    await check('daily_classes', async () => {
        const snap = await db.collection(tenant('daily_classes')).limit(5).get();
        return { ok: snap.size > 0, detail: `${snap.size}건 (최근 5개)` };
    });

    // Summary
    console.log('═══════════════════════════════════════════');
    console.log('  📋 검증 결과');
    console.log('═══════════════════════════════════════════');
    for (const r of results) {
        console.log(`  ${r.status} ${r.name}: ${r.detail}`);
    }
    console.log(`\n  ✅ Passed: ${passed} / ❌ Failed: ${failed} / Total: ${passed + failed}`);
    console.log('═══════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
