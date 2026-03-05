
const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

try {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
    if (!admin.apps.length) admin.initializeApp();
}

const db = admin.firestore();

async function checkConfig() {
    console.log("=== CHECKING CONFIG DATA ===\n");

    // Check studio_config
    try {
        const configSnap = await db.collection('studio_config').doc('master').get();
        if (configSnap.exists) {
            const data = configSnap.data();
            console.log("📋 Instructors:", data.instructors || []);
            console.log("📋 Class Types:", data.classTypes || []);
            console.log("📋 Class Levels:", data.classLevels || []);
        } else {
            console.log("❌ No master config found.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }

    // Check weekly_templates
    console.log("\n=== WEEKLY TEMPLATES ===\n");
    const branches = ['gwangheungchang', 'mapo'];
    for (const branchId of branches) {
        try {
            const templateSnap = await db.collection('weekly_templates').doc(branchId).get();
            if (templateSnap.exists) {
                const data = templateSnap.data();
                console.log(`✅ Template for ${branchId}:`);
                if (data.classes) {
                    data.classes.slice(0, 3).forEach((cls, i) => {
                        console.log(`   [${i + 1}] ${cls.day || 'N/A'} ${cls.time || 'N/A'} - ${cls.title || cls.name || 'N/A'} (${cls.instructor || 'N/A'})`);
                    });
                }
            }
        } catch (e) {
            console.error(`Error fetching template for ${branchId}:`, e.message);
        }
    }
}

checkConfig().catch(console.error);
