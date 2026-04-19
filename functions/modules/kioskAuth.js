/**
 * Kiosk Authentication Module
 * 출석체크 태블릿(Kiosk) 전용 비밀번호 인증 및 보안 토큰 발급
 * 
 * @module modules/kioskAuth
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin } = require("../helpers/common");

exports.verifyKioskPasswordCall = onCall({
    region: "asia-northeast3",
}, async (request) => {
    const { studioId, password } = request.data;

    // 1. 입력 검증
    if (!studioId || !password) {
        throw new HttpsError("invalid-argument", "지점 ID와 비밀번호는 필수입니다.");
    }

    try {
        // 2. Firestore에서 해당 지점의 Kiosk 설정 조회
        const kioskRef = admin.firestore().collection("studios").doc(studioId).collection("settings").doc("kiosk");
        const kioskSnap = await kioskRef.get();

        if (!kioskSnap.exists) {
            throw new HttpsError("not-found", "해당 지점의 키오스크 설정이 없습니다.");
        }

        const kioskData = kioskSnap.data();

        // 3. 비밀번호 검증 (슈퍼어드민에서 설정한 kioskPassword와 일치 여부)
        if (!kioskData.kioskPassword) {
            throw new HttpsError("failed-precondition", "이 지점에는 아직 키오스크 비밀번호가 설정되지 않았습니다. 관리자(슈퍼어드민)에게 문의하세요.");
        }

        if (kioskData.kioskPassword !== password) {
            throw new HttpsError("permission-denied", "비밀번호가 일치하지 않습니다.");
        }

        // 4. Custom Token 발급 (Kiosk 전용)
        // Kiosk도 Admin 수준의 권한(members, attendance 접근)이 필요하므로 role을 admin으로 설정하되,
        // Kiosk 기기임을 식별할 수 있도록 isKiosk: true 플래그를 추가합니다.
        const uid = `kiosk_${studioId}_${Date.now()}`; // 고유 UID 생성
        const additionalClaims = {
            role: "kiosk",
            isKiosk: true,
            studioId: studioId
        };

        const customToken = await admin.auth().createCustomToken(uid, additionalClaims);

        console.log(`[KioskAuth] Successfully issued custom token for Kiosk at ${studioId}`);

        return { token: customToken };

    } catch (error) {
        console.error("[KioskAuth] Error verifying kiosk password:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "키오스크 인증 중 내부 서버 오류가 발생했습니다.");
    }
});
