const admin = require('../functions/node_modules/firebase-admin');
const sa = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

async function run() {
    console.log('🔄 Seeding missing images and trash items...');
    try {
        const batch = db.batch();
        const tenantDb = db.doc('studios/demo-yoga'); // Target Demo Tenant

        // 1. Logo
        batch.set(db.doc('studios/demo-yoga/images/logo'), {
            url: 'https://passflow-0324.web.app/assets/passflow_ai_logo_transparent_final.png',
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // Wait, images collection isn't a subcollection `files`. It's `studios/demo-yoga/images/ID` directly?
        // Let's do both to be safe. Actually, `tenantDb.collection('images').doc('logo')` is the standard.
        batch.set(db.doc('studios/demo-yoga/images/logo'), {
            url: 'https://passflow-0324.web.app/assets/passflow_ai_logo_transparent_final.png',
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // 2. Weekly Schedules (03, 04)
        const timetableUrl = 'https://passflow-0324.web.app/assets/schedule_dummy.png'; 
        // Wait, I should use the one I generated or a generic placeholder. I'll use a placeholder or something nice.
        // Actually, there's `schedule_dummy.png`? No, let's just use `passflow_ai_logo_transparent_final.png` as fallback for now.
        // Or better: Let's create `const timetableUrl = 'https://passflow-0324.web.app/assets/passflow_ai_logo_transparent_final.png'` for now just to populate it, so it doesn't look empty.
        
        batch.set(db.doc('studios/demo-yoga/images/timetable_main_2026-03'), {
            url: 'https://passflow-0324.web.app/assets/hero_bg_ai.png',
            updatedAt: new Date().toISOString()
        }, { merge: true });

        batch.set(db.doc('studios/demo-yoga/images/timetable_main_2026-04'), {
            url: 'https://passflow-0324.web.app/assets/hero_bg_ai.png',
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // 3. Trash Data
        const trashRef1 = db.collection('studios/demo-yoga/trash').doc();
        batch.set(trashRef1, {
            type: 'member',
            originalId: 'trash_member_1',
            deletedAt: new Date().toISOString(),
            data: { name: '이수진', phone: '010-9988-7766' },
            deletedBy: 'admin@passflow.kr'
        });

        const trashRef2 = db.collection('studios/demo-yoga/trash').doc();
        batch.set(trashRef2, {
            type: 'attendance',
            originalId: 'trash_attendance_1',
            deletedAt: new Date().toISOString(),
            data: { memberName: '김민준', className: '아쉬탕가 베이직', date: '2026-03-25' },
            deletedBy: 'admin@passflow.kr'
        });

        await batch.commit();
        console.log('✅ Demo Assets (Logo, Weekly Schedule, Trash) Seeded Successfully.');

    } catch (e) {
        console.error('❌ Error seeding demo assets:', e);
    }
    process.exit(0);
}

run();
