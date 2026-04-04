/**
 * 출석 사진 업로드 → 강사 푸시 알림 (사진 포함 버전)
 * attendance 모듈에서 분리
 */

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { admin, tenantDb, getAllFCMTokens, getStudioName, getStudioLogoUrl } = require('../../helpers/common');
const { getStudioUrl } = require('../../helpers/urls');

exports.onAttendancePhotoAdded = onDocumentUpdated({
    document: `studios/{studioId}/attendance/{attendanceId}`,
    region: "asia-northeast3"
}, async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // photoUrl이 새로 추가된 경우에만 실행
    if (before.photoUrl || !after.photoUrl) return;

    const tdb = tenantDb(event.params.studioId);
    const attendanceId = event.params.attendanceId;
    const instructorName = after.instructor;

    if (!instructorName || instructorName === '미지정' || instructorName === '회원') return;

    try {
        const { getAllFCMTokens } = require("../../helpers/common");
        const { tokens, tokenSources } = await getAllFCMTokens(null, { role: 'instructor', instructorName, studioId: event.params.studioId });

        if (tokens.length === 0) return;

        const memberName = after.memberName || '회원';
        const className = after.className || '수업';

        let rankLabel = '';
        const totalCount = after.cumulativeCount || 0;
        if (totalCount === 1) rankLabel = ' [신규]';
        else if (totalCount >= 2 && totalCount <= 3) rankLabel = ` [${totalCount}회차]`;

        let body = `${memberName}님이 출석하셨습니다.`;
        if (after.credits !== undefined || after.endDate) {
            const credits = after.credits !== undefined ? `${after.credits}회 남음` : '';
            const expiry = after.endDate ? `(~${after.endDate.slice(2)})` : '';
            body = `${className} | ${credits} ${expiry}`;
        }

        const logoUrl = await getStudioLogoUrl(event.params.studioId);

        for (const token of tokens) {
            try {
                await admin.messaging().send({
                    token,
                    notification: { title: `🧘‍♀️ ${memberName}${rankLabel}님 출석`, body, imageUrl: after.photoUrl },
                    webpush: {
                        notification: { icon: logoUrl, badge: logoUrl, image: after.photoUrl, tag: `att-${attendanceId}`, renotify: false },
                        fcm_options: { link: getStudioUrl('/instructor') }
                    }
                });
            } catch (sendErr) {
                if (sendErr.code === 'messaging/invalid-registration-token' || sendErr.code === 'messaging/registration-token-not-registered') {
                    const collectionName = tokenSources[token] || 'fcm_tokens';
                    await tdb.collection(collectionName).doc(token).delete().catch(() => {});
                }
            }
        }
        console.log(`[Photo Push] Sent photo notification for ${attendanceId}`);
    } catch (err) {
        console.warn('[Photo Push] Error:', err.message);
    }
});
