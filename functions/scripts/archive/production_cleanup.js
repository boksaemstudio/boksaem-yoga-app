const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const readline = require('readline');

function askConfirmation(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function cleanupProductionData() {
    const collectionsToWipe = [
        // 'notices' — 공지사항은 보존 (사용자 작성 데이터)
        'error_logs',        // 에러 로그
        'push_campaigns',    // 푸시 발송 내역 (대량)
        'messages',          // 개별 푸시 내역
        'push_history',      // (Legacy) 푸시 이력
        'pending_approvals'  // 승인 대기 중인 AI 메시지
    ];

    // === 확인 절차 ===
    console.log("\n⚠️  [Production Cleanup] 다음 컬렉션의 모든 데이터가 삭제됩니다:\n");
    for (const col of collectionsToWipe) {
        const snap = await db.collection(col).count().get();
        console.log(`   🗑️  ${col}: ${snap.data().count}건`);
    }
    console.log("\n   ✅ 보존 목록: notices, daily_classes, members, attendance, sales, settings\n");

    const answer = await askConfirmation("정말 삭제하시려면 'DELETE'를 입력하세요: ");
    if (answer !== 'DELETE') {
        console.log("❌ 취소되었습니다.");
        process.exit(0);
    }

    console.log("\n🚀 삭제를 시작합니다...\n");

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

    console.log("✨ Cleanup Complete!");
}

cleanupProductionData().catch(console.error);
