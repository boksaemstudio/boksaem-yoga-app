/**
 * 관리자 Custom Claims 초기 설정 스크립트
 * 
 * 사용법:
 *   node scripts/set_admin_claims.cjs
 * 
 * 이 스크립트는 최초 1회 실행하여 기존 관리자 계정에 claims를 설정합니다.
 * 이후에는 /super-admin UI 또는 setAdminClaimsCall CF를 통해 관리합니다.
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "../functions/service-account-key.json"));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// ══════════════════════════════════════════════════════
// 여기에 관리자 목록을 설정하세요
// ══════════════════════════════════════════════════════
const ADMIN_LIST = [
    // 슈퍼어드민 (모든 업장 접근 가능 + /super-admin 접근)
    { email: "boksoon@daum.net", role: "superadmin" },

    // 일반 관리자 (특정 업장만 접근 가능)
    // { email: "admin@ssangmun.kr", role: "admin", studioId: "ssangmun-yoga" },
    // { email: "demo@passflow.kr", role: "admin", studioId: "passflow-demo" },
];
// ══════════════════════════════════════════════════════

async function setAllClaims() {
    console.log("\n🔐 관리자 Custom Claims 설정\n");

    for (const entry of ADMIN_LIST) {
        try {
            const user = await admin.auth().getUserByEmail(entry.email);
            
            const claims = { role: entry.role };
            if (entry.studioId) claims.studioId = entry.studioId;

            await admin.auth().setCustomUserClaims(user.uid, claims);
            
            console.log(`✅ ${entry.email}`);
            console.log(`   UID: ${user.uid}`);
            console.log(`   Claims: ${JSON.stringify(claims)}`);
            console.log();
        } catch (e) {
            if (e.code === "auth/user-not-found") {
                console.log(`⚠️  ${entry.email} — 사용자 없음 (Firebase Auth에 등록 필요)`);
            } else {
                console.error(`❌ ${entry.email} — 오류:`, e.message);
            }
            console.log();
        }
    }

    // 현재 모든 사용자 목록 표시
    console.log("─".repeat(60));
    console.log("📋 현재 Firebase Auth 사용자 목록:\n");
    
    const listResult = await admin.auth().listUsers(100);
    for (const user of listResult.users) {
        const claims = user.customClaims || {};
        const roleStr = claims.role ? `[${claims.role}]` : "[미설정]";
        const studioStr = claims.studioId ? `studioId: ${claims.studioId}` : "";
        console.log(`  ${roleStr.padEnd(14)} ${user.email || user.uid} ${studioStr}`);
    }

    console.log(`\n총 ${listResult.users.length}명`);
    console.log("\n💡 claims가 [미설정]인 사용자는 /admin, /super-admin에 접근할 수 없습니다.");
    console.log("   ADMIN_LIST에 추가 후 이 스크립트를 다시 실행하세요.\n");
}

setAllClaims().catch(e => { console.error(e); process.exit(1); });
