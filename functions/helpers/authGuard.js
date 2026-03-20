/**
 * Auth Guard Helpers
 * Cloud Functions caller authentication utilities
 * 
 * [SaaS] onCall 함수의 인증 검증을 중앙화
 */

const { HttpsError } = require("firebase-functions/v2/https");

/**
 * 인증된 사용자인지 확인 (anonymous 포함)
 * 회원앱에서 로그인한 유저만 호출 가능
 */
function requireAuth(request, functionName = 'unknown') {
    if (!request.auth) {
        console.warn(`[AuthGuard] Unauthenticated call to ${functionName} blocked`);
        throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    return request.auth;
}

/**
 * 관리자 권한 확인
 * Firebase Auth custom claims에 admin=true가 있어야 함
 * 또는 Firebase console에서 직접 호출하는 경우 (auth.uid 존재)
 * 
 * SaaS에서는 studio 소유자/관리자의 claim을 체크하는 것이 이상적이지만,
 * 현재는 auth가 존재하면 허용 (cors 제한과 함께)
 */
function requireAdmin(request, functionName = 'unknown') {
    if (!request.auth) {
        console.warn(`[AuthGuard] Unauthenticated admin call to ${functionName} blocked`);
        throw new HttpsError('unauthenticated', '관리자 인증이 필요합니다.');
    }
    // Future: check request.auth.token.admin === true
    return request.auth;
}

module.exports = { requireAuth, requireAdmin };
