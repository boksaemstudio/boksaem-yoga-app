/**
 * SaaS 슈퍼어드민 모듈
 * 전체 테넌트(스튜디오) 통계 및 본사 알림 관련 기능을 담당합니다.
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { admin, getKSTDateString, getAllFCMTokens } = require("../helpers/common");

/**
 * SaaS 슈퍼어드민 전체 플랫폼 통계 보고 (21:00 KST)
 * 대상: role: 'superadmin' 인 본사 관리자 (boksaem-yoga 테넌트 등)
 */
exports.sendSaaSPlatformReport = onSchedule({
    schedule: "0 21 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3"
}, async (event) => {
    try {
        const db = admin.firestore();
        
        // 1. 등록된 스튜디오 현황 (SaaS 메인 DB)
        const studiosSnap = await db.collection('studios').get();
        let totalStudios = 0;
        let activeStudios = 0;
        
        studiosSnap.forEach(doc => {
            totalStudios++;
            if (doc.data().status === 'active') activeStudios++;
        });

        // 2. 승인 대기 중인 가입 신청
        const pendingSnap = await db.collection('pending_approvals').where('status', '==', 'pending').get();
        const pendingCount = pendingSnap.size;

        // 3. 미확인 글로벌(해외) 문의
        const inquiriesSnap = await db.collection('platform_inquiries').where('status', '==', 'new').get();
        const newInquiriesCount = inquiriesSnap.size;

        const reportBody = `[PassFlow SaaS 일일 브리핑] ${getKSTDateString(new Date())}

📊 [가맹 스튜디오 현황]
- 총 가맹점: ${totalStudios} 곳
- 활성 운영: ${activeStudios} 곳

🚀 [운영 액션 대기]
- 신규 스튜디오 심사: ${pendingCount}건 ${pendingCount > 0 ? '🔥' : '✅'}
- 미확인 해외 폼 문의: ${newInquiriesCount}건 ${newInquiriesCount > 0 ? '🔥' : '✅'}`;

        // 슈퍼어드민 관리자 권한을 가진 유저에게만 발송
        // boksaem-yoga 안의 tokens 중 role이 superadmin인 것을 타겟
        const { tokens } = await getAllFCMTokens(null, { role: 'superadmin', studioId: 'boksaem-yoga' });
        
        if (tokens.length > 0) {
            await admin.messaging().sendEachForMulticast({
                tokens,
                data: {
                    title: "🌐 플랫폼 통합 운영 리포트",
                    body: reportBody.substring(0, 200),
                    url: '/superadmin',
                    fullReport: reportBody
                },
                webpush: { headers: { Urgency: 'high' } },
                android: { priority: 'high' }
            });
            console.log("[SaaS Report] Sent successfully to superadmins");
        } else {
            console.warn("[SaaS Report] No super_admin tokens found.");
        }
    } catch (e) {
        console.error('sendSaaSPlatformReport failed:', e);
    }
});


/**
 * 신규 도입 문의(platform_inquiries) 발생 시 실시간 푸시 알림
 */
exports.notifyNewPlatformInquiry = onDocumentCreated({
    document: "platform_inquiries/{inquiryId}",
    region: "asia-northeast3"
}, async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    
    try {
        const { tokens } = await getAllFCMTokens(null, { role: 'superadmin', studioId: 'boksaem-yoga' });
        
        if (tokens.length > 0) {
            const bodyStr = `[${data.country || 'Global'}] ${data.studioName || data.email}\n${(data.message || '').substring(0, 50)}...`;
            await admin.messaging().sendEachForMulticast({
                tokens,
                data: {
                    title: "🔔 신규 글로벌 도입 문의",
                    body: bodyStr,
                    url: '/superadmin'
                },
                webpush: { headers: { Urgency: 'high' } },
                android: { priority: 'high' }
            });
            console.log(`[Push] Sent new inquiry alert to ${tokens.length} superadmins.`);
        }
    } catch (e) {
        console.error('notifyNewPlatformInquiry failed:', e);
    }
});
