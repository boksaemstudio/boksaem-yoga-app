
import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../service-account-key.json');

try {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
    if (!admin.apps.length) admin.initializeApp();
}

const db = admin.firestore();

async function initializeConfig() {
    console.log("=== INITIALIZING CONFIG DATA ===\n");

    // 1. Create studio_config/master
    const masterConfig = {
        instructors: ['세연', '한아', '송미', '원장'],
        classTypes: ['하타', '빈야사', '인요가', '플라잉', '키즈요가'],
        classLevels: ['1', '2', '3'],
        branches: [
            { id: 'gwangheungchang', name: '광흥창점', code: 'GH' },
            { id: 'mapo', name: '마포점', code: 'MP' }
        ],
        updatedAt: new Date().toISOString()
    };

    try {
        await db.collection('studio_config').doc('master').set(masterConfig);
        console.log("✅ Created studio_config/master");
        console.log("   Instructors:", masterConfig.instructors.join(', '));
        console.log("   Class Types:", masterConfig.classTypes.join(', '));
    } catch (e) {
        console.error("❌ Failed to create master config:", e.message);
    }

    // 2. Create weekly_template for gwangheungchang
    const gwangheungchangTemplate = {
        branchId: 'gwangheungchang',
        classes: [
            { day: '월', time: '10:00', title: '하타', instructor: '원장', status: 'normal', duration: 60 },
            { day: '월', time: '18:40', title: '인요가', instructor: '한아', status: 'normal', duration: 60 },
            { day: '월', time: '19:50', title: '하타', instructor: '한아', status: 'normal', duration: 60 },
            { day: '화', time: '10:00', title: '하타', instructor: '세연', status: 'normal', duration: 60 },
            { day: '화', time: '18:40', title: '인요가', instructor: '한아', status: 'normal', duration: 60 },
            { day: '수', time: '10:00', title: '하타', instructor: '원장', status: 'normal', duration: 60 },
            { day: '목', time: '10:00', title: '하타', instructor: '세연', status: 'normal', duration: 60 },
            { day: '금', time: '10:00', title: '하타', instructor: '원장', status: 'normal', duration: 60 },
        ],
        updatedAt: new Date().toISOString()
    };

    try {
        await db.collection('weekly_templates').doc('gwangheungchang').set(gwangheungchangTemplate);
        console.log("\n✅ Created weekly_template for gwangheungchang");
        console.log(`   Classes: ${gwangheungchangTemplate.classes.length}`);
    } catch (e) {
        console.error("❌ Failed to create gwangheungchang template:", e.message);
    }

    // 3. Create weekly_template for mapo
    const mapoTemplate = {
        branchId: 'mapo',
        classes: [
            { day: '월', time: '10:00', title: '하타', instructor: '세연', status: 'normal', duration: 60 },
            { day: '월', time: '18:40', title: '인요가', instructor: '한아', status: 'normal', duration: 60 },
            { day: '월', time: '19:50', title: '하타', instructor: '한아', status: 'normal', duration: 60 },
            { day: '월', time: '21:00', title: '플라잉', instructor: '송미', status: 'normal', duration: 60, level: '1' },
        ],
        updatedAt: new Date().toISOString()
    };

    try {
        await db.collection('weekly_templates').doc('mapo').set(mapoTemplate);
        console.log("\n✅ Created weekly_template for mapo");
        console.log(`   Classes: ${mapoTemplate.classes.length}`);
    } catch (e) {
        console.error("❌ Failed to create mapo template:", e.message);
    }

    console.log("\n=== INITIALIZATION COMPLETE ===");
    console.log("\n📌 Next Steps:");
    console.log("1. Refresh the admin page");
    console.log("2. Go to Schedule tab");
    console.log("3. Click '⚙️ Settings'");
    console.log("4. Verify that Instructors and Class Types are now populated");
    console.log("5. Edit today's schedule to use correct class names");
}

initializeConfig().catch(console.error);
