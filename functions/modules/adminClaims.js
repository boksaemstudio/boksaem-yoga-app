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

/**
 * 관리자 계정 생성 (슈퍼어드민 전용)
 * 임시 비밀번호로 생성 후 비밀번호 재설정 링크를 반환
 * → 관리자 본인이 직접 비밀번호를 설정하게 함
 */
exports.createAdminCall = onCall({
    region: "asia-northeast3",
}, async (request) => {
    if (!request.auth || request.auth.token.role !== "superadmin") {
        throw new HttpsError("permission-denied", "슈퍼어드민만 관리자를 생성할 수 있습니다.");
    }

    const { email, role, studioId, displayName } = request.data;

    if (!email || !role) {
        throw new HttpsError("invalid-argument", "이메일과 역할은 필수입니다.");
    }
    if (role === "admin" && !studioId) {
        throw new HttpsError("invalid-argument", "일반 관리자는 업장 ID(studioId)가 필수입니다.");
    }

    try {
        // 1. 임시 비밀번호로 Firebase Auth 사용자 생성
        const tempPassword = Math.random().toString(36).slice(-12) + "A1!";
        const userRecord = await admin.auth().createUser({
            email,
            password: tempPassword,
            displayName: displayName || email.split("@")[0],
        });

        // 2. Claims 설정
        const claims = { role };
        if (studioId) claims.studioId = studioId;
        await admin.auth().setCustomUserClaims(userRecord.uid, claims);

        // 3. 비밀번호 재설정 링크 생성 (관리자가 직접 비밀번호 설정)
        const resetLink = await admin.auth().generatePasswordResetLink(email);

        console.log(`[AdminClaims] Created admin: ${email} (${role})`);

        return {
            success: true,
            message: `${email} 관리자 계정 생성 완료`,
            uid: userRecord.uid,
            claims,
            resetLink // 슈퍼어드민이 이 링크를 관리자에게 전달
        };
    } catch (e) {
        console.error("[AdminClaims] Create error:", e);
        if (e.code === "auth/email-already-exists") {
            throw new HttpsError("already-exists", "이미 등록된 이메일입니다.");
        }
        throw new HttpsError("internal", e.message);
    }
});

/**
 * 관리자 목록 조회 (슈퍼어드민 전용)
 * 이메일이 있는 실제 사용자만 반환 (익명 제외)
 */
exports.listAdminsCall = onCall({
    region: "asia-northeast3",
}, async (request) => {
    if (!request.auth || request.auth.token.role !== "superadmin") {
        throw new HttpsError("permission-denied", "슈퍼어드민만 조회할 수 있습니다.");
    }

    try {
        const listResult = await admin.auth().listUsers(1000);
        const admins = listResult.users
            .filter(u => u.email) // 이메일 있는 사용자만
            .map(u => ({
                uid: u.uid,
                email: u.email,
                displayName: u.displayName || "",
                role: u.customClaims?.role || null,
                studioId: u.customClaims?.studioId || null,
                lastSignIn: u.metadata?.lastSignInTime || null,
                createdAt: u.metadata?.creationTime || null,
            }));

        return { success: true, admins };
    } catch (e) {
        console.error("[AdminClaims] List error:", e);
        throw new HttpsError("internal", e.message);
    }
});

/**
 * 관리자 비밀번호 변경 (슈퍼어드민 전용)
 */
exports.resetAdminPasswordCall = onCall({
    region: "asia-northeast3",
}, async (request) => {
    if (!request.auth || request.auth.token.role !== "superadmin") {
        throw new HttpsError("permission-denied", "슈퍼어드민만 비밀번호를 변경할 수 있습니다.");
    }

    const { uid, newPassword } = request.data;

    if (!uid || !newPassword) {
        throw new HttpsError("invalid-argument", "uid와 newPassword는 필수입니다.");
    }
    if (newPassword.length < 6) {
        throw new HttpsError("invalid-argument", "비밀번호는 최소 6자 이상이어야 합니다.");
    }

    try {
        await admin.auth().updateUser(uid, { password: newPassword });
        const user = await admin.auth().getUser(uid);
        console.log(`[AdminClaims] Password reset for ${user.email}`);
        return { success: true, message: `${user.email} 비밀번호 변경 완료` };
    } catch (e) {
        console.error("[AdminClaims] Password reset error:", e);
        throw new HttpsError("internal", e.message);
    }
});
