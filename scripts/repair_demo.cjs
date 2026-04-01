const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TARGET = 'demo-yoga'; // Or 'demo' depending on what's active

async function fix() {
    console.log('🚀 Fixing demo schedules with 120 days of coverage (for April 2026+)...');

    // 1. Clear old daily_classes
    const oldDocs = await db.collection(`studios/${TARGET}/daily_classes`).get();
    let batch = db.batch();
    let ops = 0;
    for (const d of oldDocs.docs) {
        batch.delete(d.ref);
        ops++;
        if (ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
    }
    if (ops > 0) { await batch.commit(); batch = db.batch(); ops = 0; }
    console.log(`🧹 Deleted ${oldDocs.size} old daily_classes docs`);

    // 2. Clear old monthly_schedules
    const oldMeta = await db.collection(`studios/${TARGET}/monthly_schedules`).get();
    for (const m of oldMeta.docs) {
        batch.delete(m.ref);
        ops++;
        if (ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
    }
    if (ops > 0) { await batch.commit(); batch = db.batch(); ops = 0; }
    console.log(`🧹 Deleted ${oldMeta.size} old monthly_schedules docs`);

    // 3. Insert daily_classes in CORRECT format:
    const now = new Date();
    const classTpl = [
        { time: '07:00', title: '모닝 빈야사', instructor: '유마 원장', level: '1', duration: 60 },
        { time: '10:00', title: '기구 필라테스', instructor: '루시 강사', level: '1.5', duration: 60 },
        { time: '14:00', title: '힐링요가', instructor: '소피 지점장', level: '0.5', duration: 60 },
        { time: '19:00', title: '코어 인텐시브', instructor: '올리비아 강사', level: '2', duration: 60 },
        { time: '21:00', title: '심야 하타', instructor: '올리비아 강사', level: '1', duration: 60 }
    ];

    // Seed from Date - 60 days to +60 days
    for (let d = -60; d <= 60; d++) {
        const date = new Date(now);
        date.setDate(now.getDate() + d);
        // local time formatting setup correctly YYYY-MM-DD
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        const dayOfWeek = date.getDay(); // 0=Sun

        for (const branchId of ['A', 'B']) {
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
    console.log('✅ Daily classes inserted from -60 to +60 days for branches A & B');

    // 4. Insert monthly_schedules meta documents (marks months as "saved" for admin app)
    const months = new Set();
    for (let d = -60; d <= 60; d++) {
        const date = new Date(now);
        date.setDate(now.getDate() + d);
        months.add(`${date.getFullYear()}_${date.getMonth() + 1}`);
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
                createdBy: 'auto-repair'
            });
            ops++;
        }
    }
    if (ops > 0) { await batch.commit(); batch = db.batch(); ops = 0; }
    console.log('✅ Monthly schedule metadata generated successfully.');

    // 5. Overwrite Config Branches explicitly to [A, B] so the Admin ui doesn't desync
    await db.doc(`studios/${TARGET}`).set({
        "settings.BRANCHES": [
            { id: 'A', name: '강남본점', color: '#8B5CF6' },
            { id: 'B', name: '송파DI점', color: '#3B82F6' }
        ]
    }, { merge: true });
    
    // Some legacy branches structure fallback
    await db.doc(`studios/${TARGET}`).set({
        BRANCHES: [
            { id: 'A', name: '강남본점', color: '#8B5CF6' },
            { id: 'B', name: '송파DI점', color: '#3B82F6' }
        ]
    }, { merge: true });

    console.log('🎉 Demo environment completely repaired and locked down!');
    process.exit(0);
}

fix().catch(console.error);
