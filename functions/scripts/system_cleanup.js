/**
 * 복샘요가 시스템 데이터 정리 스크립트
 * 1. 7일 이상 된 미처리 승인 대기(pending_approvals) 삭제
 * 2. 90일 이상 된 오래된 FCM 토큰 삭제
 */

const admin = require("firebase-admin");
const path = require("path");

const SA_PATH = path.join(__dirname, "..", "service-account-key.json");
if (!admin.apps.length) {
    const sa = require(SA_PATH);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

async function cleanupSystemData() {
    console.log("🧹 [시스템 정리] 시작...");

    // 1. 오래된 pending_approvals 정리 (7일 이상)
    console.log("\n📋 [1] 오래된 승인 대기 데이터 정리 중...");
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const pendingSnap = await db.collection("pending_approvals")
        .where("createdAt", "<", weekAgo)
        .get();

    let pendingDeleted = 0;
    for (const doc of pendingSnap.docs) {
        await doc.ref.delete();
        pendingDeleted++;
    }
    console.log(`   ✅ ${pendingDeleted}건 삭제 완료`);

    // 2. 오래된 FCM 토큰 정리 (90일 이상)
    console.log("\n🔔 [2] 오래된 FCM 토큰 정리 중...");
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const FCM_COLLECTIONS = ["fcm_tokens", "fcmTokens", "push_tokens"];
    let fcmDeleted = 0;

    for (const col of FCM_COLLECTIONS) {
        try {
            const snap = await db.collection(col).get();
            for (const doc of snap.docs) {
                const d = doc.data();
                const ts = (d.updatedAt || d.createdAt || d.timestamp)?.toDate?.() || new Date(0);
                if (ts < ninetyDaysAgo) {
                    await doc.ref.delete();
                    fcmDeleted++;
                }
            }
        } catch (e) {
            console.log(`   ℹ️ ${col} 컬렉션 처리 건너뜀 (없거나 오류)`);
        }
    }
    console.log(`   ✅ ${fcmDeleted}건 삭제 완료`);

    console.log("\n✨ 모든 시스템 정리가 완료되었습니다!");
}

cleanupSystemData()
    .then(() => process.exit(0))
    .catch(e => {
        console.error("❌ 처리 중 오류 발생:", e);
        process.exit(1);
    });
