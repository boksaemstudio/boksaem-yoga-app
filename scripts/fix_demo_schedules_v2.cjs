const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TARGET = 'demo-yoga';

async function fix() {
    console.log('?뵩 Fixing demo schedules with CORRECT document format...');
    
    // 1. Delete old wrong-format daily_classes
    const oldDocs = await db.collection(`studios/${TARGET}/daily_classes`).get();
    let batch = db.batch();
    let ops = 0;
    for (const d of oldDocs.docs) {
        batch.delete(d.ref);
        ops++;
        if (ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
    }
    if (ops > 0) { await batch.commit(); batch = db.batch(); ops = 0; }
    console.log(`??Deleted ${oldDocs.size} old daily_classes docs`);

    // 2. Insert daily_classes in CORRECT format:
    //    Document ID: {branchId}_{date}  (e.g. "A_2026-03-29")
    //    Document fields: { branchId, date, classes: [{time, title, instructor, status, level, duration}], updatedAt }
    const now = new Date();
    const classTpl = [
        { time: '07:00', title: '紐⑤떇 鍮덉빞??, instructor: '?좊쭏 ?먯옣', level: '1', duration: 60 },
        { time: '10:00', title: '湲곌뎄 ?꾨씪?뚯뒪', instructor: '猷⑥떆 媛뺤궗', level: '1.5', duration: 60 },
        { time: '14:00', title: '?먮쭅?붽?', instructor: '?뚰뵾 吏?먯옣', level: '0.5', duration: 60 },
        { time: '19:00', title: '肄붿뼱 ?명뀗?쒕툕', instructor: '?щ━鍮꾩븘 媛뺤궗', level: '2', duration: 60 },
        { time: '21:00', title: '????섑?', instructor: '?щ━鍮꾩븘 媛뺤궗', level: '1', duration: 60 }
    ];

    for (let d = -30; d <= 60; d++) {
        const date = new Date(now);
        date.setDate(now.getDate() + d);
        const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const dayOfWeek = date.getDay(); // 0=Sun

        for (const branchId of ['A', 'B']) {
            // Sunday: fewer classes
            const classes = dayOfWeek === 0 
                ? classTpl.slice(0, 2).map(c => ({ ...c, status: 'normal' }))
                : classTpl.map(c => ({ ...c, status: 'normal' }));

            const docId = `${branchId}_${dateStr}`;
            batch.set(db.doc(`studios/${TARGET}/daily_classes/${docId}`), {
                branchId,
                date: dateStr,
                classes: classes,
                updatedAt: now.toISOString()
            });
            ops++;
            if (ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
        }
    }
    if (ops > 0) { await batch.commit(); batch = db.batch(); ops = 0; }
    console.log('??Daily classes inserted in correct format');

    // 3. Insert monthly_schedules meta documents (marks months as "saved")
    const months = new Set();
    for (let d = -30; d <= 60; d++) {
        const date = new Date(now);
        date.setDate(now.getDate() + d);
        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        months.add(`${y}_${m}`);
    }

    for (const ym of months) {
        const [y, m] = ym.split('_').map(Number);
        for (const branchId of ['A', 'B']) {
            const metaDocId = `${branchId}_${y}_${m}`;
            batch.set(db.doc(`studios/${TARGET}/monthly_schedules/${metaDocId}`), {
                branchId,
                year: y,
                month: m,
                isSaved: true,
                createdAt: now.toISOString(),
                createdBy: 'demo-seeder'
            });
            ops++;
        }
    }
    if (ops > 0) { await batch.commit(); batch = db.batch(); ops = 0; }
    console.log('??Monthly schedule meta documents set (isSaved: true)');

    // 4. Force overwrite studio identity AGAIN
    await db.doc(`studios/${TARGET}`).set({
        name: 'PassFlow Ai Yoga & Pilates',
        ownerEmail: 'demo@passflow.app',
        plan: 'pro',
        status: 'active',
        settings: {
            IDENTITY: {
                NAME: 'PassFlow Ai Yoga & Pilates',
                NAME_ENGLISH: 'PassFlow Ai Yoga & Pilates',
                SLOGAN: '理쒓퀬???붽? ?ㅽ뒠?붿삤 ?먮룞???붾（??,
                LOGO_TEXT: 'PF',
            },
            THEME: { PRIMARY_COLOR: '#8B5CF6', SKELETON_COLOR: '#1a1a1a' },
            ASSETS: {
                LOGO: { SQUARE: '/assets/passflow_logo.png', WIDE: '/assets/passflow_logo.png' },
                MEMBER_BG: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200&auto=format&fit=crop'
            },
            BRANCHES: [
                { id: 'A', name: '媛뺣궓蹂몄젏', color: '#8B5CF6' },
                { id: 'B', name: '?띾?DI??, color: '#3B82F6' }
            ],
            MEMBERSHIP: {
                TYPES: { 'MTypeA': '湲곌뎄?꾨씪?뚯뒪 30?뚭텒', 'MTypeB': '?뚮씪?됱슂媛 1媛쒖썡沅?, 'MTypeC': '鍮덉빞??臾댁젣???⑥뒪' }
            },
            POLICIES: { ENABLE_EXPIRATION_BLOCK: true, ENABLE_NEGATIVE_CREDITS: false, PHOTO_ENABLED: false, SHOW_CAMERA_PREVIEW: false }
        },
        updatedAt: now.toISOString()
    }, { merge: false });
    console.log('??Studio identity force-set to PassFlow');

    console.log('\n?럦 ALL DONE. Schedules, meta, and identity are now correct.');
    process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });

