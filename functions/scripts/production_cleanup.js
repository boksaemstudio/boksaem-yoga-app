const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupProductionData() {
    console.log("🚀 Starting Production Cleanup...\n");

    // 1. Collections to Wipe Completely (Test Data)
    // Note: members/attendance are wiped by CSV Migration tool, but we can wipe them here too if requested.
    // User requested: Notices, Push History, Error Logs.
    const collectionsToWipe = [
        'notices',           // 공지사항
        'error_logs',        // 에러 로그
        'push_campaigns',    // 푸시 발송 내역 (대량)
        'messages',          // 개별 푸시 내역
        'push_history',      // (Legacy) 푸시 이력
        'pending_approvals'  // 승인 대기 중인 AI 메시지
    ];

    for (const col of collectionsToWipe) {
        console.log(`🧹 Cleaning collection: ${col}...`);
        const batchSize = 400;
        let deletedCount = 0;

        while (true) {
            const snapshot = await db.collection(col).limit(batchSize).get();
            if (snapshot.empty) break;

            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            deletedCount += snapshot.size;
            console.log(`   - Deleted ${snapshot.size} docs (Total: ${deletedCount})`);
        }
        console.log(`✅ ${col} cleared.\n`);
    }

    console.log("----------------------------------------------------------------");
    console.log("ℹ️  Preserved Collections (Not Deleted):");
    console.log("   - daily_classes (시간표)");
    console.log("   - pricing (가격표)");
    console.log("   - studio_config (설정)");
    console.log("   - members, attendance, sales (Will be wiped when you upload CSV)");
    console.log("----------------------------------------------------------------");
    console.log("✨ Cleanup Complete! Ready for Production.");
}

cleanupProductionData().catch(console.error);
