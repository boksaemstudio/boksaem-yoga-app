/**
 * Admin Claims Module
 * Custom Claims 기반 관리자 권한 관리
 * 
 * Claims 구조:
 *   - role: "superadmin" | "admin"
 *   - studioId: "boksaem-yoga" (admin인 경우 필수)
 * 
 * @module modules/adminClaims
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin } = require("../helpers/common");

/**
 * 관리자 Claims 설정 (슈퍼어드민 전용)
 * 
 * @param {string} email - 대상 이메일
 * @param {string} role - "admin" | "superadmin"
 * @param {string} [studioId] - role이 admin인 경우 필수
 */
exports.setAdminClaimsCall = onCall({
    region: "asia-northeast3",
}, async (request) => {
    // 1. 호출자 인증 확인
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    // 2. 호출자가 슈퍼어드민인지 확인
    const callerClaims = request.auth.token;
    if (callerClaims.role !== "superadmin") {
        throw new HttpsError("permission-denied", "슈퍼어드민만 권한을 설정할 수 있습니다.");
    }

    const { email, role, studioId } = request.data;

    // 3. 입력 검증
    if (!email || !role) {
        throw new HttpsError("invalid-argument", "email과 role은 필수입니다.");
    }
    if (!["admin", "superadmin"].includes(role)) {
        throw new HttpsError("invalid-argument", "role은 admin 또는 superadmin이어야 합니다.");
    }
    if (role === "admin" && !studioId) {
        throw new HttpsError("invalid-argument", "admin 역할에는 studioId가 필수입니다.");
    }

    try {
        // 4. 대상 사용자 조회
        const userRecord = await admin.auth().getUserByEmail(email);

        // 5. Custom Claims 설정
        const claims = { role };
        if (studioId) claims.studioId = studioId;

        await admin.auth().setCustomUserClaims(userRecord.uid, claims);

        console.log(`[AdminClaims] Set claims for ${email}: ${JSON.stringify(claims)}`);

        return {
            success: true,
            message: `${email}에 ${role} 권한 설정 완료${studioId ? ` (studioId: ${studioId})` : ''}`,
            claims
        };
    } catch (e) {
        console.error("[AdminClaims] Error:", e);
        if (e.code === "auth/user-not-found") {
            throw new HttpsError("not-found", `${email} 사용자를 찾을 수 없습니다.`);
        }
        throw new HttpsError("internal", e.message);
    }
});

/**
 * 현재 사용자의 Claims 조회
 */
exports.getMyClaimsCall = onCall({
    region: "asia-northeast3",
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    return {
        uid: request.auth.uid,
        email: request.auth.token.email,
        role: request.auth.token.role || null,
        studioId: request.auth.token.studioId || null,
    };
});
