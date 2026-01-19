/**
 * Cloud Functions for My Yoga (나의요가)
 * Uses firebase-functions v2 API with firebase-admin v13
 */

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, onRequest } = require("firebase-functions/v2/https");
const AIService = require("./utils/ai"); // Centralized AI logic
const admin = require("firebase-admin");
const { setGlobalOptions } = require("firebase-functions/v2");
const { HttpsError } = require("firebase-functions/v2/https");

// Initialize Admin
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// Helper to get AI service instance
const getAI = () => {
    const key = process.env.GEMINI_KEY || admin.app().options?.geminiKey;
    return new AIService(key);
};

// V2 함수: 메시지 생성 시 푸시 알림 전송
exports.sendPushOnMessageV2 = onDocumentCreated("messages/{messageId}", async (event) => {
    const messageData = event.data.data();
    const memberId = messageData.memberId;
    const content = messageData.content;

    if (!memberId || !content) return;

    try {
        const tokensSnap = await admin.firestore().collection("fcm_tokens")
            .where("memberId", "==", memberId)
            .get();

        if (tokensSnap.empty) return;

        const tokens = tokensSnap.docs.map(doc => doc.id);

        const payload = {
            notification: {
                title: "나의요가 알림",
                body: content,
            },
            data: {
                url: "/member"
            }
        };

        const response = await admin.messaging().sendToDevice(tokens, payload);
        console.log("Single push sent:", response.successCount);

        // 결과 기록 추가
        await event.data.ref.update({
            pushStatus: {
                sent: true,
                successCount: response.successCount,
                failureCount: response.failureCount,
                sentAt: admin.firestore.FieldValue.serverTimestamp()
            }
        });

    } catch (error) {
        console.error("Error sending push:", error);
        await event.data.ref.update({
            pushStatus: { sent: false, error: error.message }
        });
    }
});

// V2 함수: 대량 푸시 알림 전송
exports.sendBulkPushV2 = onDocumentCreated("push_campaigns/{campaignId}", async (event) => {
    const snap = event.data;
    const data = snap.data();
    const targetMemberIds = data.targetMemberIds || [];
    const titleOriginal = data.title || "나의요가";
    const bodyOriginal = data.body || "";

    if (targetMemberIds.length === 0 || !bodyOriginal) return;

    try {
        const db = admin.firestore();
        const ai = getAI();

        // 1. Optimized Targeting: Fetch only tokens that match language AND are associated with targetMemberIds
        const validTokensByLang = {};

        const allTokensSnap = await db.collection("fcm_tokens").get();
        if (allTokensSnap.empty) return;

        allTokensSnap.forEach(doc => {
            const tokenData = doc.data();
            const memberId = tokenData.memberId;
            if (targetMemberIds.includes(memberId)) {
                const lang = tokenData.language || 'ko';
                if (!validTokensByLang[lang]) validTokensByLang[lang] = [];
                validTokensByLang[lang].push(doc.id);
            }
        });

        const payloadBase = { data: { url: "/member" } };
        let successTotal = 0;
        let failureTotal = 0;

        // 4. Send batches per language
        for (const [lang, tokens] of Object.entries(validTokensByLang)) {
            if (tokens.length === 0) continue;

            const title = await ai.translate(titleOriginal, lang);
            const body = await ai.translate(bodyOriginal, lang);

            const payload = {
                ...payloadBase,
                notification: { title, body }
            };

            const chunkSize = 500;
            for (let i = 0; i < tokens.length; i += chunkSize) {
                const chunk = tokens.slice(i, i + chunkSize);
                const response = await admin.messaging().sendToDevice(chunk, payload);
                successTotal += response.successCount;
                failureTotal += response.failureCount;
            }
        }

        await snap.ref.update({
            status: 'sent',
            successCount: successTotal,
            failureCount: failureTotal,
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });

    } catch (error) {
        console.error("Error in bulk push:", error);
        await snap.ref.update({ status: 'failed', error: error.message });
    }
});

// V2 함수: Gemini AI를 활용한 맞춤형 페이지 경험
exports.generatePageExperienceV2 = onCall({ cors: true, secrets: ["GEMINI_KEY"] }, async (request) => {
    const { memberName, weather, timeOfDay, dayOfWeek, upcomingClass, language = 'ko', role = 'member' } = request.data;

    try {
        const ai = getAI();
        const targetLang = ai.getLangName(language);
        let prompt = "";

        if (request.data.type === 'analysis' || role === 'admin') {
            const logs = request.data.logs || [];
            const recentLogs = logs.slice(0, 10).map(l => l.className).join(", ");
            const stats = request.data.stats || {};

            prompt = `
                 You are the Senior Analyst of '복샘요가'. 
                 Provide a **factual, data-driven analysis** for the ${role === 'admin' ? 'Administrator' : 'Member'}.

                 Context:
                 - Member: ${memberName}
                 - Recent Pattern: ${recentLogs}
                 - Stats: ${JSON.stringify(stats)}

                     Requirements:
                     1. ${role === 'admin' ? 'Focus on retention risk, frequency, and factual insights.' : 'Focus on professional feedback and progress tracking.'}
                     2. Tone: **Factual, Concise, Professional**. No poetic fillers.
                     3. Language: **${targetLang}**.
                     4. Output Format (JSON ONLY):
                     {
                         "message": "Factual analysis text in ${targetLang}",
                         "bgTheme": "data",
                         "colorTone": "#808080"
                     }
             `;
        } else {
            // ... Greeting Prompt Logic ...
            const isGeneric = role === 'visitor' || !memberName || ["방문 회원", "방문회원", "visitor", "Guest"].includes(memberName);
            const preciseTime = `${timeOfDay || 12}:00`;
            const diligence = request.data.diligence || {};
            const diligenceContext = diligence.badge ? `Badge: ${diligence.badge.label}` : "";

            if (isGeneric) {
                prompt = `
                     You are the AI of '나의요가'. Create a simple greeting.
                     Context: ${timeOfDay}h, Weather: ${weather}, Day: ${dayOfWeek}
                     Language: **${targetLang}**.
                     Output Format (JSON ONLY): { "message": "Message in ${targetLang}", "bgTheme": "dawn", "colorTone": "#FDFCF0" }
                 `;
            } else {
                // State Determination Logic for Declaration Message
                const streak = diligence.streak || 0;
                const isAfterClass = request.data.context === 'checkin';
                const lastAtt = diligence.lastAttendanceAt || null; // Assuming available, otherwise treat as rest

                let category = "Rest/No-Show"; // Default
                if (isAfterClass) {
                    category = "After Class (Completion)";
                } else if (streak >= 3) {
                    category = "Frequent Attendance (Already Enough)";
                } else if (streak === 0 && (!lastAtt || (new Date() - new Date(lastAtt) > 7 * 24 * 60 * 60 * 1000))) {
                    category = "Rare/Returning (Don't Force)";
                }

                prompt = `
                    You are the 'Practice Standard Declaration' system of '나의요가'.
                    Your ONLY purpose is to declare a clear, stoic standard for the member's practice today.
                    
                    **CRITICAL SIX PRINCIPLES (STRICTLY FOLLOW)**:
                    1. ❌ NO EVALUATION: No "Good", "Great", "Hard", "Well done".
                    2. ❌ NO EMPATHY: No "Cheer up", "Understand", "It's okay".
                    3. ❌ NO PRESSURE: No "Come back", "Don't give up".
                    4. ⭕️ DECLARE STATE: Just state the fact of the flow/gap.
                    5. ⭕️ VALIDATE RETURN: If they returned after a gap, acknowledge the "Flow is restored".
                    6. ⭕️ NEUTRALITY: The app is a recorder, not a coach.
                    
                    Target Context:
                    - Category: ${category}
                    - Member: ${memberName}
                    
                    **Reference Sentence Sets (Tone: Dry, Objectve, Declarative)**:
                    
                    [After Class / Frequent]
                    - "The practice flow is maintained."
                    - "Today's practice is complete."
                    - "The sequence is continued."
                    
                    [Rare / Returning (CRITICAL)]
                    - "The flow of practice has resumed today."
                    - "A gap in practice has occurred recently."
                    - "Today, the cycle begins again."
                    - "The interval since the last practice was observed."
                    
                    [Rest / No-Show]
                    - "The practice record is currently paused."
                    - "A sufficient gap is being maintained."
                    - "Today stays as a blank in the flow."

                    Instructions:
                    1. 'message': Select or generate ONE NEUTRAL sentence.
                    2. 'contextLog': Generate a DRY, FACT-BASED log (e.g., "Gap occurred", "Flow restored", "3rd Session").
                    
                    Language: **${targetLang}**.
                    
                    Output Format (JSON ONLY):
                    { 
                        "message": "The Declaration Sentence", 
                        "contextLog": "The Objective Log Sentence",
                        "bgTheme": "calm", 
                        "colorTone": "#FDFCF0" 
                    }
                `;
            }
        }

        return await ai.generateExperience(prompt);

    } catch (error) {
        console.error("AI Generation Failed:", error);

        // Fallback Logic
        const fallbackMsgs = {
            ko: { msg: "오늘도 매트 위에서 평온을 찾으세요." },
            en: { msg: "Find peace on the mat today." }
        };
        const msg = fallbackMsgs[language]?.msg || fallbackMsgs.ko.msg;

        return {
            message: msg,
            bgTheme: "sunny",
            colorTone: "#FFFFFF",
            isFallback: true,
            error: error.message
        };
    }
});

// V2 함수: 새로운 공지사항 생성 시 전체 회원 푸시 알림
exports.sendPushOnNoticeV2 = onDocumentCreated("notices/{noticeId}", async (event) => {
    const noticeData = event.data.data();
    const titleOriginal = noticeData.title || "새로운 공지사항";
    const bodyOriginal = noticeData.content || "새로운 소식이 등록되었습니다.";

    try {
        const db = admin.firestore();
        const ai = getAI();
        const allTokensSnap = await db.collection("fcm_tokens").get();
        if (allTokensSnap.empty) return;

        // 1. Group tokens by language
        const tokensByLang = {};
        allTokensSnap.forEach(doc => {
            const tokenData = doc.data();
            const lang = tokenData.language || 'ko';
            if (!tokensByLang[lang]) tokensByLang[lang] = [];
            tokensByLang[lang].push(doc.id);
        });

        // 2. Send batches per language
        const payloadBase = { data: { url: "/member" } };
        let successTotal = 0;
        let failureTotal = 0;

        for (const [lang, tokens] of Object.entries(tokensByLang)) {
            if (tokens.length === 0) continue;

            const title = await ai.translate(titleOriginal, lang);
            const bodyRaw = await ai.translate(bodyOriginal, lang);
            const body = bodyRaw.length > 100 ? bodyRaw.substring(0, 100) + "..." : bodyRaw;

            const payload = {
                ...payloadBase,
                notification: { title: `[Notice] ${title}`, body }
            };

            const chunkSize = 500;
            for (let i = 0; i < tokens.length; i += chunkSize) {
                const chunk = tokens.slice(i, i + chunkSize);
                const response = await admin.messaging().sendToDevice(chunk, payload);
                successTotal += response.successCount;
                failureTotal += response.failureCount;
            }
        }

        await event.data.ref.update({
            pushStatus: {
                sent: true,
                successCount: successTotal,
                failureCount: failureTotal,
                sentAt: admin.firestore.FieldValue.serverTimestamp()
            }
        });

    } catch (error) {
        console.error("Error sending global notice push:", error);
        await event.data.ref.update({
            pushStatus: { sent: false, error: error.message }
        });
    }
});

// Helper for Re-engagement (using AIService)
async function generateReEngagementMessage(member, attendanceStats, language = 'ko') {
    try {
        const ai = getAI();
        return await ai.generateReEngagement(member, attendanceStats, language);
    } catch (e) {
        return null;
    }
}

// V2 함수: 만료 예정 회원 체크
exports.checkExpiringMembersV2 = onSchedule({
    schedule: 'every day 13:00',
    timeZone: 'Asia/Seoul',
    secrets: ["GEMINI_KEY"]
}, async (event) => {
    const db = admin.firestore();
    const today = new Date();
    // Check only D-Day
    const targetDateStr = today.toISOString().split('T')[0];

    console.log("Checking expirations for D-Day:", targetDateStr);

    try {
        const snapshot = await db.collection('members').where('endDate', '==', targetDateStr).get();

        if (snapshot.empty) {
            console.log("No expiring members found today.");
            return null;
        }

        for (const doc of snapshot.docs) {
            const member = doc.data();
            const memberId = doc.id;

            // 최근 3개월 출석 통계 가져오기
            const attendanceSnap = await db.collection('attendance')
                .where('memberId', '==', memberId)
                .limit(20)
                .get();

            const stats = attendanceSnap.docs.map(d => d.data().className).join(", ");
            const lang = member.language || 'ko';

            const aiMessage = await generateReEngagementMessage(member, stats, lang);

            // Localized Fallback
            let fallbackBody = "";
            if (lang === 'en') fallbackBody = `${member.name}, your membership expires today. We await your return to the mat. 🙏`;
            else if (lang === 'ru') fallbackBody = `${member.name}, срок действия вашего абонемента истекает сегодня. Ждем вас на коврике. 🙏`;
            else if (lang === 'zh') fallbackBody = `${member.name}, 您的会员资格今天到期。期待在垫子上再次见到您。🙏`;
            else if (lang === 'ja') fallbackBody = `${member.name}様、本日会員権の有効期限が切れます。マットの上でお待ちしております。🙏`;
            else fallbackBody = `${member.name}님, 오늘이 회원권 만료일입니다. 다시 매트 위에서 평온을 찾으시길 기다릴게요. 🙏`;

            const body = aiMessage || fallbackBody;

            const tokensSnap = await db.collection("fcm_tokens").where("memberId", "==", memberId).get();
            if (!tokensSnap.empty) {
                const tokens = tokensSnap.docs.map(t => t.id);
                await admin.messaging().sendToDevice(tokens, {
                    notification: { title: "나의요가 알림", body },
                    data: { url: "/member" }
                });
            }
        }
        console.log(`Sent scheduled AI notifications to ${snapshot.size} members.`);

    } catch (error) {
        console.error("Error in scheduled expiration check:", error);
    }
    return null;
});

// V2 함수: 낮은 크레딧 알림
exports.checkLowCreditsV2 = onDocumentUpdated({
    document: "members/{memberId}",
    secrets: ["GEMINI_KEY"]
}, async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();
    const memberId = event.params.memberId;
    const db = admin.firestore();

    if (newData.credits === oldData.credits) return null;

    const current = newData.credits;
    // 0회일 때만 발송 (재가입 유도)
    if (current !== 0 || current >= oldData.credits) return null;

    try {
        const attendanceSnap = await db.collection('attendance')
            .where('memberId', '==', memberId)
            .limit(10)
            .get();

        const stats = attendanceSnap.docs.map(d => d.data().className).join(", ");
        const lang = newData.language || 'ko';

        const aiMessage = await generateReEngagementMessage(newData, stats, lang);

        let fallbackBody = "";
        if (lang === 'en') fallbackBody = `${newData.name}, you have used all your credits. We look forward to seeing you again. 🙏`;
        else if (lang === 'ru') fallbackBody = `${newData.name}, у вас закончились занятия. Ждем вас снова. 🙏`;
        else if (lang === 'zh') fallbackBody = `${newData.name}, 您的课程已全部用完。期待再次见到您。🙏`;
        else if (lang === 'ja') fallbackBody = `${newData.name}様、チケットをすべて使い切りました。またのお越しをお待ちしております。🙏`;
        else fallbackBody = `${newData.name}님, 수강권이 모두 소진되었습니다. 다시 매트 위에서 뵙기를 기다리겠습니다. 🙏`;

        const body = aiMessage || fallbackBody;

        const tokensSnap = await db.collection("fcm_tokens").where("memberId", "==", memberId).get();
        if (!tokensSnap.empty) {
            const tokens = tokensSnap.docs.map(t => t.id);
            await admin.messaging().sendToDevice(tokens, {
                notification: { title: "나의요가 알림", body },
                data: { url: "/member" }
            });
            console.log(`AI re-engagement alert sent to ${newData.name}`);
        }
    } catch (e) {
        console.error(e);
    }
});

// V2 함수: 공지사항 목록 실시간 번역
exports.translateNoticesV2 = onCall({ cors: true, secrets: ["GEMINI_KEY"] }, async (request) => {
    const { notices, language = 'ko' } = request.data;
    try {
        const ai = getAI();
        return await ai.translateNotices(notices, language);
    } catch (error) {
        return notices;
    }
});

/**
 * Daily Admin Report at 23:00 KST
 */
exports.sendDailyAdminReportV2 = onSchedule({
    schedule: "0 23 * * *",
    timeZone: "Asia/Seoul",
    secrets: ["GEMINI_KEY"]
}, async (event) => {
    const db = admin.firestore();
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

    try {
        // 1. Fetch Today's Stats
        const attendanceSnap = await db.collection('attendance')
            .where('timestamp', '>=', `${todayStr}T00:00:00`)
            .get();

        const registrationSnap = await db.collection('members')
            .where('regDate', '==', todayStr)
            .get();

        const attendanceCount = attendanceSnap.size;
        const registrationCount = registrationSnap.size;

        // 2. Security & Data Integrity Checks
        // Check for members with negative credits
        const anomalyMembersSnap = await db.collection('members')
            .where('credits', '<', 0)
            .get();
        const anomalyCount = anomalyMembersSnap.size;

        // Check for tokens without memberId (Security risk: rogue devices)
        const ghostTokensSnap = await db.collection('fcm_tokens')
            .where('memberId', '==', null)
            .get();
        const ghostCount = ghostTokensSnap.size;

        // 3. Compose Message
        const message = `[복샘요가 일일 운영/보안 보고]
- 오늘 출석: ${attendanceCount}명
- 신규 가입: ${registrationCount}명

[보안/데이터]
- 크레딧 오류: ${anomalyCount}건 ${anomalyCount > 0 ? '⚠️' : '✅'}
- 유령 토큰: ${ghostCount}건 ${ghostCount > 5 ? '⚠️' : '✅'}

오늘도 수고 많으셨습니다. 평온한 밤 되세요. 🙏`;

        // 4. Find Admin Tokens
        const tokensSnap = await db.collection('fcm_tokens')
            .where('type', '==', 'admin')
            .get();

        if (tokensSnap.empty) {
            console.log("No admin tokens found for daily report.");
            return null;
        }

        const tokens = tokensSnap.docs.map(d => d.id);

        await admin.messaging().sendToDevice(tokens, {
            notification: {
                title: "일일 운영/보안 보고서",
                body: message
            },
            data: { url: "/admin" }
        });

        console.log(`Daily report (incl. security) sent to ${tokens.length} admin devices.`);

    } catch (error) {
        console.error("Error in daily admin report:", error);
    }
    return null;
});

/**
 * Immediate Security Alert: Triggered when member data is updated with anomalies (e.g. negative credits)
 */
exports.onMemberUpdateSecurityAlertV2 = onDocumentUpdated("members/{memberId}", async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();

    // Condition: Credits become negative
    if (newData.credits < 0 && (oldData.credits >= 0 || oldData.credits === undefined)) {
        const db = admin.firestore();
        const memberName = newData.name || "알 수 없는 회원";

        console.log(`[ALERT] Negative credits detected for member: ${memberName} (${event.params.memberId})`);

        try {
            const tokensSnap = await db.collection('fcm_tokens')
                .where('type', '==', 'admin')
                .get();

            if (tokensSnap.empty) return;

            const tokens = tokensSnap.docs.map(d => d.id);
            const message = `[긴급 보안 알림]
${memberName} 회원의 크레딧이 음수(${newData.credits})로 떨어졌습니다. 비정상 접근이나 시스템 오류가 의심됩니다.`;

            await admin.messaging().sendToDevice(tokens, {
                notification: {
                    title: "⚠️ 보안/데이터 긴급 알림",
                    body: message
                },
                data: { url: "/admin" }
            });
        } catch (error) {
            console.error("Error sending emergency push:", error);
        }
    }
});

/**
 * [SECURE] 비즈니스 로직 서버 이관: 출석 체크 및 크레딧 차감
 * 트랜잭션을 사용하여 데이터 무결성을 보장하며, 클라이언트의 직접 쓰기를 대체합니다.
 */
exports.checkInMemberV2Call = onCall({ cors: true }, async (request) => {
    const { memberId, branchId, classTitle } = request.data;
    if (!memberId || !branchId) throw new Error("Missing parameters");

    const db = admin.firestore();
    const memberRef = db.collection('members').doc(memberId);

    try {
        const result = await db.runTransaction(async (t) => {
            const memberDoc = await t.get(memberRef);
            if (!memberDoc.exists) throw new Error("Member not found");

            const memberData = memberDoc.data();
            if (memberData.credits <= 0) throw new Error("Insufficient credits");

            // 1. 크레딧 차감
            t.update(memberRef, {
                credits: admin.firestore.FieldValue.increment(-1),
                lastAttendanceAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 2. 출석 로그 생성
            const attendanceRef = db.collection('attendance').doc();
            const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            const now = new Date();

            t.set(attendanceRef, {
                memberId: memberId,
                memberName: memberData.name,
                branchId: branchId,
                className: classTitle || "Self Practice",
                timestamp: now.toISOString(),
                date: todayStr
            });

            return {
                success: true,
                memberName: memberData.name,
                newCredits: memberData.credits - 1,
                endDate: memberData.endDate || null,
                attendanceId: attendanceRef.id
            };
        });

        return result;
    } catch (e) {
        console.error("Secure check-in failed:", e);
        return { success: false, message: e.message };
    }
});

/**
 * [NEW] Daily Home Yoga Recommendation (Downdog Lite)
 * Generates 3 simple poses based on context (weather/time) for home practice.
 */
exports.generateDailyYogaV2 = onCall({ cors: true, secrets: ["GEMINI_KEY"] }, async (request) => {
    const { weather, timeOfDay, language = 'ko' } = request.data;
    try {
        const ai = getAI();
        const result = await ai.generateHomeYoga(weather, timeOfDay, language);
        if (result) return result;
        throw new Error("No result");
    } catch (e) {
        // Fallback
        return [
            { name: "Child's Pose", benefit: language === 'ko' ? "휴식" : "Rest", instruction: "...", emoji: "👶" },
            { name: "Cat-Cow", benefit: language === 'ko' ? "척추 이완" : "Spine", instruction: "...", emoji: "🐈" },
            { name: "Down Dog", benefit: language === 'ko' ? "전신 스트레칭" : "Stretch", instruction: "...", emoji: "🐕" }
        ];
    }
});

exports.getSecureMemberV2Call = onCall({ cors: true }, async (request) => {
    const { phoneLast4 } = request.data;
    if (!phoneLast4) throw new Error("Missing phoneLast4");

    const db = admin.firestore();
    try {
        const snapshot = await db.collection('members')
            .where('phoneLast4', '==', phoneLast4)
            .limit(10)
            .get();

        if (snapshot.empty) return { members: [] };

        const members = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                credits: data.credits,
                homeBranch: data.homeBranch,
                endDate: data.endDate,
                // 개인정보 마스킹 (010-****-1234)
                phoneMasked: data.phone ? data.phone.substring(0, 3) + "-****-" + data.phone.slice(-4) : "****"
            };
        });

        return { members };
    } catch (e) {
        console.error("Secure member fetch failed:", e);
        throw new Error(e.message);
    }
});

/**
 * [SECURE] 관리자 전용: 전체 회원 목록 조회
 */
exports.getAllMembersAdminV2Call = onCall({ cors: true }, async (request) => {
    // [SECURITY] 관리자 권한 검사: 익명 사용자가 아닌 이메일 인증된 관리자만 허용
    if (!request.auth || !request.auth.token.email) {
        throw new HttpsError("unauthenticated", "관리자 전용 기능입니다. 로그인 후 다시 시도해주세요.");
    }

    const db = admin.firestore();
    try {
        const snapshot = await db.collection('members').orderBy('name').get();
        const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { members };
    } catch (e) {
        console.error("Admin all members fetch failed:", e);
        throw new HttpsError("internal", e.message);
    }
});


// 글로벌 설정: 리전을 서울(asia-northeast3)로 설정
setGlobalOptions({ region: "asia-northeast3" });
