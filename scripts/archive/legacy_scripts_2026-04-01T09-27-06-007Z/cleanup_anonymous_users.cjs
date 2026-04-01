/**
 * Firebase Auth 익명 사용자 정리 스크립트
 * 
 * 키오스크 앱이 signInAnonymously()로 생성한 익명 계정을 삭제합니다.
 * 이메일이 있는 실제 관리자 계정은 보존합니다.
 * 
 * 사용법: node scripts/cleanup_anonymous_users.cjs
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "../functions/service-account-key.json"));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

async function cleanup() {
    console.log("\n🧹 Firebase Auth 익명 사용자 정리\n");

    let totalDeleted = 0;
    let totalKept = 0;
    let pageToken;

    do {
        const listResult = await admin.auth().listUsers(1000, pageToken);
        pageToken = listResult.pageToken;

        const anonymousUsers = [];
        const realUsers = [];

        for (const user of listResult.users) {
            if (user.email || user.phoneNumber) {
                realUsers.push(user);
            } else {
                // 이메일도 전화번호도 없는 익명 사용자
                anonymousUsers.push(user);
            }
        }

        totalKept += realUsers.length;

        if (anonymousUsers.length > 0) {
            // 100명씩 배치 삭제
            const BATCH = 100;
            for (let i = 0; i < anonymousUsers.length; i += BATCH) {
                const batch = anonymousUsers.slice(i, i + BATCH);
                const uids = batch.map(u => u.uid);
                const result = await admin.auth().deleteUsers(uids);
                totalDeleted += result.successCount;
                if (result.failureCount > 0) {
                    console.warn(`  ⚠️ ${result.failureCount}건 삭제 실패`);
                }
                process.stdout.write(`  삭제 진행: ${totalDeleted}명...\r`);
            }
        }

        console.log(`  페이지 처리 완료: ${anonymousUsers.length}명 삭제, ${realUsers.length}명 보존`);

    } while (pageToken);

    console.log(`\n${"─".repeat(50)}`);
    console.log(`✅ 정리 완료`);
    console.log(`   삭제된 익명 사용자: ${totalDeleted}명`);
    console.log(`   보존된 실제 사용자: ${totalKept}명`);

    // 보존된 사용자 목록
    if (totalKept > 0) {
        console.log(`\n📋 보존된 사용자:`);
        const remaining = await admin.auth().listUsers(100);
        for (const user of remaining.users) {
            const claims = user.customClaims || {};
            const roleStr = claims.role ? `[${claims.role}]` : "";
            console.log(`  ${user.email || user.phoneNumber || user.uid} ${roleStr}`);
        }
    }

    console.log();
}

cleanup().catch(e => { console.error(e); process.exit(1); });
