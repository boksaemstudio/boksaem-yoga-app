/**
 * Cloud Functions for My Yoga (나의요가)
 * Uses firebase-functions v2 API with firebase-admin v13
 */

const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, onRequest } = require("firebase-functions/v2/https");
const AIService = require("./utils/ai"); // Centralized AI logic
const admin = require("firebase-admin");
const { setGlobalOptions } = require("firebase-functions/v2");
const { HttpsError } = require("firebase-functions/v2/https");

// Set Global Options immediately
setGlobalOptions({ region: "asia-northeast3" });

// Initialize Admin
if (admin.apps.length === 0) {
    admin.initializeApp();
    admin.firestore().settings({ ignoreUndefinedProperties: true });
}

// Helper: Log AI Errors only
const logAIError = async (context, error) => {
    try {
        await admin.firestore().collection('ai_error_logs').add({
            context,
            error: error.message || error,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to log AI error:", e);
    }
};

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
                title: "내요가 알림",
                body: content,
            },
            data: {
                url: "/member"
            }
        };

        const response = await admin.messaging().sendEachForMulticast({
            tokens,
            notification: payload.notification,
            data: payload.data
        });
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

// V2 함수: 대량 푸시 알림 전송 (Optimized with Batching & Pagination)
exports.sendBulkPushV2 = onDocumentCreated("push_campaigns/{campaignId}", async (event) => {
    const snap = event.data;
    const campaignId = event.params.campaignId;
    const data = snap.data();
    const targetMemberIds = data.targetMemberIds || [];
    const titleOriginal = data.title || "내요가";
    const bodyOriginal = data.body || "";

    if (!bodyOriginal) return;

    // 캠페인이 이미 처리되었거나 처리 중인 경우 중복 실행 방지
    if (data.status === 'processing' || data.status === 'sent') return;

    try {
        await snap.ref.update({ status: 'processing', startedAt: admin.firestore.FieldValue.serverTimestamp() });

        const db = admin.firestore();
        const ai = getAI();

        let successTotal = 0;
        let failureTotal = 0;

        // 1. Prepare Content by Language (Pre-translate)
        const supportedLangs = ['ko', 'en', 'ru', 'zh', 'ja'];
        const contentsByLang = {};

        for (const lang of supportedLangs) {
            try {
                const title = await ai.translate(titleOriginal, lang);
                const body = await ai.translate(bodyOriginal, lang);
                contentsByLang[lang] = {
                    notification: { title, body },
                    data: { url: "/member" }
                };
            } catch (e) {
                console.error(`Translation failed for ${lang}, fallback to Korean/Original`);
                contentsByLang[lang] = {
                    notification: { title: titleOriginal, body: bodyOriginal },
                    data: { url: "/member" }
                };
                await logAIError(`BulkPush_Translation_${lang}`, e);
            }
        }

        // 2. Stream tokens to handle large scaling without memory overflow
        let tokenQuery = db.collection("fcm_tokens");

        const isTargeted = targetMemberIds.length > 0;
        const validTokensByLang = { 'ko': [], 'en': [], 'ru': [], 'zh': [], 'ja': [] };

        const stream = tokenQuery.stream();

        // Helper to flush buffer
        const sendBatch = async (tokens, payload) => {
            if (tokens.length === 0) return { success: 0, failure: 0 };
            const res = await admin.messaging().sendEachForMulticast({
                tokens,
                notification: payload.notification,
                data: payload.data
            });
            return { success: res.successCount, failure: res.failureCount };
        };

        for await (const doc of stream) {
            const tokenData = doc.data();
            const token = doc.id;
            const lang = tokenData.language || 'ko';

            if (isTargeted && !targetMemberIds.includes(tokenData.memberId)) continue;

            if (!validTokensByLang[lang]) validTokensByLang[lang] = [];
            validTokensByLang[lang].push(token);

            if (validTokensByLang[lang].length >= 500) {
                const payload = contentsByLang[lang] || contentsByLang['ko'];
                const result = await sendBatch(validTokensByLang[lang], payload);
                successTotal += result.success;
                failureTotal += result.failure;
                validTokensByLang[lang] = [];
            }
        }

        for (const lang of Object.keys(validTokensByLang)) {
            const tokens = validTokensByLang[lang];
            if (tokens.length > 0) {
                const payload = contentsByLang[lang] || contentsByLang['ko'];
                const result = await sendBatch(tokens, payload);
                successTotal += result.success;
                failureTotal += result.failure;
            }
        }

        await snap.ref.update({
            status: 'sent',
            successCount: successTotal,
            failureCount: failureTotal,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });

    } catch (error) {
        console.error("Error in bulk push:", error);
        await snap.ref.update({ status: 'failed', error: error.message });
        await logAIError('BulkPush_System', error);
    }
});

// V2 함수: 2개월 이상 미사용(Ghost) 토큰 정기 정리 (매주 일요일 새벽 4시)
exports.cleanupGhostTokens = onSchedule({
    schedule: '0 4 * * 0',
    timeZone: 'Asia/Seoul',
}, async (event) => {
    const db = admin.firestore();
    const batchSize = 400;
    let totalDeleted = 0;

    console.log("Starting Ghost Token Cleanup...");

    try {
        const ghostSnap = await db.collection("fcm_tokens")
            .where("memberId", "==", null)
            .limit(1000)
            .get();

        if (ghostSnap.empty) {
            console.log("No ghost tokens found.");
            return;
        }

        const batch = db.batch();
        ghostSnap.docs.forEach(doc => {
            batch.delete(doc.ref);
            totalDeleted++;
        });

        await batch.commit();
        console.log(`Deleted ${totalDeleted} ghost tokens.`);
        await logAIError('System_Cleanup', { deleted: totalDeleted, type: 'GhostTokenCleanup' });

    } catch (error) {
        console.error("Cleanup failed:", error);
        await logAIError('System_Cleanup_Failed', error);
    }
});

// Helper: Check & Update AI Daily Usage Quota
const checkAIQuota = async () => {
    const db = admin.firestore();
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const statRef = db.collection('system_stats').doc(`ai_usage_${today}`);

    try {
        const result = await db.runTransaction(async (t) => {
            const doc = await t.get(statRef);
            let count = 0;
            let alertSent = false;

            if (doc.exists) {
                const data = doc.data();
                count = data.count || 0;
                alertSent = data.alertSent || false;
            }

            if (count >= 2000) {
                throw new Error("Daily AI Quota Exceeded");
            }

            const newCount = count + 1;
            const updateData = { count: newCount };

            if (newCount >= 500 && !alertSent) {
                updateData.alertSent = true;
                return { action: 'alert', newCount, updateData };
            }

            t.set(statRef, updateData, { merge: true });
            return { action: 'ok', newCount };
        });

        if (result.action === 'alert') {
            await statRef.set(result.updateData, { merge: true });
            const tokensSnap = await db.collection('fcm_tokens').where('type', '==', 'admin').get();
            if (!tokensSnap.empty) {
                const tokens = tokensSnap.docs.map(d => d.id);
                await admin.messaging().sendEachForMulticast({
                    tokens,
                    notification: {
                        title: "주의: AI 사용량 경고",
                        body: `오늘 AI 호출량이 500회를 초과했습니다. (${result.newCount}회). 과금 주의가 필요합니다.`
                    }
                });
                console.log("Sent AI usage alert to admins.");
            }
        }

    } catch (e) {
        if (e.message === "Daily AI Quota Exceeded") throw new HttpsError('resource-exhausted', "Server is busy.");
        console.error("Quota check failed:", e);
    }
};

// V2 함수: Gemini AI를 활용한 맞춤형 페이지 경험
exports.generatePageExperienceV2 = onCall({ region: "asia-northeast3", cors: true, secrets: ["GEMINI_KEY"] }, async (request) => {
    await checkAIQuota();

    let { memberName, weather, timeOfDay, dayOfWeek, upcomingClass, language = 'ko', role = 'member' } = request.data;

    if (role === 'admin' && !request.auth) {
        console.warn(`[Security] Unauthenticated access attempt for admin role. Downgrading to visitor.`);
        role = 'visitor';
    }

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
                      1. ${role === 'admin' ? 'Focus on retention risk, frequency, and factual insights.' : 'Focus on the member\'s journey inward. Emphasize their own consistent rhythm, breath, and time spent facing themselves. Do NOT compare them to others.'}
                      2. Tone: **${role === 'admin' ? 'Factual, Concise' : 'Meditative, Encouraging, focused on Sati (Mindfulness)'}**.
                      3. Language: **${targetLang}**.
                      4. Output Format (JSON ONLY):
                      {
                          "message": "Analysis text in ${targetLang}",
                          "bgTheme": "data",
                          "colorTone": "#808080"
                      }
              `;
        } else {
            const isGeneric = role === 'visitor' || !memberName || ["방문 회원", "방문회원", "visitor", "Guest"].includes(memberName);
            const preciseTime = `${timeOfDay || 12}:00`;
            const diligence = request.data.diligence || {};
            const streak = diligence.streak || 0;
            const isCheckIn = request.data.context === 'checkin';
            const appName = isCheckIn ? '복샘요가' : '내요가';

            if (isGeneric) {
                prompt = `
                     You are the AI of '${appName}'. Create a short, poetic, and warm greeting for a yoga member.
                     
                     **Philosophy**: Focus inward. Ignore the outside world. Listen to your breath and feel your joints and muscles.

                     Context: ${timeOfDay}h, Weather: ${weather}, Day: ${dayOfWeek}
                     Instructions:
                     1. Tone: Peaceful, deeply internal, focused on 'Here and Now'.
                     2. Content: Encourage feeling the body and breath.
                     3. Length: **EXTREMELY SHORT (EXACTLY 1 SENTENCE)**. No exceptions.
                     4. Language: **${targetLang}**.
                     Output Format (JSON ONLY): { "message": "Message in ${targetLang}", "bgTheme": "dawn", "colorTone": "#FDFCF0" }
                 `;
            } else {
                const lastAtt = diligence.lastAttendanceAt || null;
                let category = "Rest/No-Show";
                if (isCheckIn) {
                    category = "After Class (Completion)";
                } else if (streak >= 3) {
                    category = "Frequent Attendance (Already Enough)";
                } else if (streak === 0 && (!lastAtt || (new Date() - new Date(lastAtt) > 7 * 24 * 60 * 60 * 1000))) {
                    category = "Rare/Returning (Don't Force)";
                }

                const isMultiSession = request.data.isMultiSession || false;
                if (isMultiSession) {
                    category = "Enthusiastic Multi-Session";
                }

                prompt = `
                    You are the 'Yoga Wisdom Guide' of '복샘요가'. 
                    Your purpose is to provide a brief, warm, and deeply inspirational message to a member ${isCheckIn ? 'after' : 'before'} their practice.

                    **Philosophy**: Yoga is a journey of meeting oneself. Focus on breath, joints, and the quiet mind (Shanti).
                    
                    Target Context:
                    - Category: ${category}
                    - Member: ${memberName}
                    - Weather: ${weather}
                    - Time: ${preciseTime}
                    - isCheckIn: ${isCheckIn}

                    Instructions:
                    1. 'message': Create a short (1-2 sentences) message.
                       - If After Class (${isCheckIn}): Provide a warm word of appreciation and a small piece of yoga wisdom or a focus for the rest of their day.
                       - If Multi-Session: Acknowledge their deep commitment and passion ("Two flows in one day...").
                       - If General: A calm declaration of state and a mindful tip.
                    2. 'contextLog': A very short factual summary (e.g., "Deepening flow", "Double practice", "Mindful return").
                    
                    Language: **${targetLang}**.
                    
                    Output Format (JSON ONLY):
                    { 
                        "message": "The Inspirational Sentence", 
                        "contextLog": "Objective Log",
                        "bgTheme": "dawn"
                    }
                `;
            }
        }

        return await ai.generateExperience(prompt);

    } catch (error) {
        console.error("AI Generation Failed:", error);

        const FALLBACKS = [
            "오늘도 매트 위에서 나를 만나는 소중한 시간입니다.",
            "호흡 끝에 찾아오는 고요함을 즐기세요.",
            "몸과 마음이 하나되는 시간, 요가가 시작됩니다.",
            "수련은 나를 사랑하는 가장 정직한 방법입니다.",
            "오늘의 움직임이 내일의 변화를 만듭니다.",
            "매트 위에서는 오직 나에게만 집중하세요.",
            "내안의 소리에 귀 기울이는 시간입니다.",
            "흔들려도 괜찮습니다. 그것 또한 균형의 일부입니다.",
            "천천히, 그리고 꾸준히 나아가는 당신을 응원합니다.",
            "이 시간, 여기에 머무르는 연습을 시작합니다.",
            "오늘 흘린 땀방울이 당신의 마음을 맑게 합니다.",
            "깊은 숨을 들이마시고 무거운 마음은 내쉬세요.",
            "나의 세계를 존중하며, 부드럽게 나아가세요.",
            "요가는 잘하는 것이 아니라, 있는 그대로를 바라보는 것입니다.",
            "오늘도 평온한 마음으로 매트에 섭니다.",
            "나를 위한 따뜻한 위로, 요가 수련.",
            "몸의 감각을 깨우고 마음의 평화를 찾으세요.",
            "비우고 채우는 순환 속에 건강함이 깃듭니다.",
            "당신의 수련은 오늘도 빛나고 있습니다.",
            "고요한 움직임 속에 강한 에너지가 담겨 있습니다."
        ];

        const randomMsg = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
        const fallbackMsgs = {
            ko: { msg: randomMsg },
            en: { msg: "Find peace on the mat today." },
            ru: { msg: "Найдите покой на коврике сегодня." },
            zh: { msg: "今天在瑜伽垫上寻找平静。" },
            ja: { msg: "今日はヨガマットの上で静けさを見つけてください。" }
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
    const bodyOriginal = noticeData.content || "새로운 소식이 등록되었습니다";

    try {
        const db = admin.firestore();
        const ai = getAI();
        const allTokensSnap = await db.collection("fcm_tokens").get();
        if (allTokensSnap.empty) return;

        const tokensByLang = {};
        allTokensSnap.forEach(doc => {
            const tokenData = doc.data();
            const lang = tokenData.language || 'ko';
            if (!tokensByLang[lang]) tokensByLang[lang] = [];
            tokensByLang[lang].push(doc.id);
        });

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
                notification: { title: `[Notice] ${title} `, body }
            };

            const chunkSize = 500;
            for (let i = 0; i < tokens.length; i += chunkSize) {
                const chunk = tokens.slice(i, i + chunkSize);
                const response = await admin.messaging().sendEachForMulticast({
                    tokens: chunk,
                    notification: payload.notification,
                    data: payload.data
                });
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

// Helper for Re-engagement
async function generateReEngagementMessage(member, attendanceStats, language = 'ko') {
    try {
        const ai = getAI();
        return await ai.generateReEngagement(member, attendanceStats, language);
    } catch (e) {
        return null;
    }
}

// Helper: Create Pending Approval & Notify Admin
const createPendingApproval = async (type, targetMemberIds, title, body, data = {}) => {
    const db = admin.firestore();
    try {
        await db.collection('pending_approvals').add({
            type,
            targetMemberIds,
            title,
            body,
            data,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const adminTokensSnap = await db.collection("fcm_tokens").where("type", "==", "admin").get();
        if (!adminTokensSnap.empty) {
            const adminTokens = adminTokensSnap.docs.map(d => d.id);
            await admin.messaging().sendEachForMulticast({
                tokens: adminTokens,
                notification: {
                    title: "주의: 승인 대기 알림",
                    body: "AI가 생성한 새로운 발송 대기 메시지가 있습니다. 승인해주세요."
                }
            });
        }
        console.debug(`Created pending approval[${type}]for ${targetMemberIds.length} members.`);
    } catch (e) {
        console.error("Failed to create pending approval:", e);
    }
};

// V2 함수: 만료 예정 회원 체크 (Optimized: Created Pending Approval)
exports.checkExpiringMembersV2 = onSchedule({
    schedule: 'every day 13:00',
    timeZone: 'Asia/Seoul',
    secrets: ["GEMINI_KEY"]
}, async (event) => {
    const db = admin.firestore();
    const ai = getAI();
    const today = new Date();
    const targetDateStr = today.toISOString().split('T')[0];

    try {
        const snapshot = await db.collection('members').where('endDate', '==', targetDateStr).get();
        if (snapshot.empty) return null;

        const supportedLangs = ['ko', 'en', 'ru', 'zh', 'ja'];
        const messagesByLang = {};

        for (const lang of supportedLangs) {
            try {
                const langName = ai.getLangName(lang);
                const prompt = `Write a short, warm, and professional push notification body for members whose membership expires TODAY. Tone: Encouraging, Inviting renewal, Not pushy. Length: 1 sentence. Language: ** ${langName}**. Output ONLY the valid text.`;
                const result = await ai.model.generateContent(prompt);
                messagesByLang[lang] = result.response.text().trim();
            } catch (e) {
                const fallbackMap = {
                    ko: "오늘 회원권이 만료됩니다. 계속해서 함께 수련할 수 있기를 기다리겠습니다. 🙏",
                    en: "Your membership expires today. We hope to see you on the mat again soon. 🙏",
                    ru: "Ваш абонемент истекает сегодня. Надеемся снова увидеть вас. 🙏",
                    zh: "您的会员资格今天到期。我们希望很快能再次在垫子上见到您。 🙏",
                    ja: "会員権が本日で満了となります。またマットの上でお会いできるのを楽しみにしています。 🙏"
                };
                messagesByLang[lang] = fallbackMap[lang] || fallbackMap['ko'];
            }
        }

        const membersByLang = { 'ko': [], 'en': [], 'ru': [], 'zh': [], 'ja': [] };
        snapshot.docs.forEach(doc => {
            const m = doc.data();
            const lang = m.language || 'ko';
            if (membersByLang[lang]) membersByLang[lang].push(doc.id);
            else membersByLang['ko'].push(doc.id);
        });

        for (const lang of supportedLangs) {
            const memberIds = membersByLang[lang];
            const body = messagesByLang[lang];
            if (memberIds && memberIds.length > 0) {
                await createPendingApproval('expiration', memberIds, "복샘요가 알림", body, { lang, date: targetDateStr });
            }
        }
    } catch (error) {
        console.error("Error in scheduled expiration check:", error);
    }
    return null;
});

// V2 함수: 크레딧 소진 알림 (Approval Required)
exports.checkLowCreditsV2 = onDocumentUpdated({
    document: "members/{memberId}",
    secrets: ["GEMINI_KEY"]
}, async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();
    const memberId = event.params.memberId;
    const db = admin.firestore();

    if (newData.credits === oldData.credits) return null;
    if (newData.credits !== 0 || newData.credits >= oldData.credits) return null;

    try {
        const attendanceSnap = await db.collection('attendance').where('memberId', '==', memberId).limit(10).get();
        const stats = attendanceSnap.docs.map(d => d.data().className).join(", ");
        const lang = newData.language || 'ko';
        const aiMessage = await generateReEngagementMessage(newData, stats, lang);

        let fallbackBody = "";
        if (lang === 'en') fallbackBody = `${newData.name}, you have used all your credits. We look forward to seeing you again. 🙏`;
        else if (lang === 'ru') fallbackBody = `${newData.name}, у вас закончились занятия. Ждем вас снова. 🙏`;
        else if (lang === 'zh') fallbackBody = `${newData.name}, 您的课时已用完。我们期待再次见到您。 🙏`;
        else if (lang === 'ja') fallbackBody = `${newData.name} 様、チケット를 모두 사용했습니다. 또한 매트 위에서 뵙기를 기다리겠습니다. 🙏`;
        else fallbackBody = `${newData.name} 님, 수강권이 모두 소진되었습니다. 다시 매트 위에서 뵙기를 기다리겠습니다. 🙏`;

        const body = aiMessage || fallbackBody;
        const tokensSnap = await db.collection("fcm_tokens").where("memberId", "==", memberId).get();
        if (!tokensSnap.empty) {
            await createPendingApproval('low_credits', [memberId], "나의요가 알림", body, { credits: 0, prevCredits: oldData.credits });
        }
    } catch (e) {
        console.error(e);
    }
});

exports.translateNoticesV2 = onCall({ region: "asia-northeast3", cors: true, secrets: ["GEMINI_KEY"] }, async (request) => {
    const { notices, language = 'ko' } = request.data;
    try {
        const ai = getAI();
        const translated = await ai.translateNotices(notices, language);
        return { notices: translated };
    } catch (error) {
        return { notices: notices };
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
        const attendanceSnap = await db.collection('attendance').where('timestamp', '>=', `${todayStr}T00:00:00`).get();
        const registrationSnap = await db.collection('members').where('regDate', '==', todayStr).get();

        const attendanceCount = attendanceSnap.size;
        const registrationCount = registrationSnap.size;

        const anomalyMembersSnap = await db.collection('members').where('credits', '<', 0).get();
        const anomalyCount = anomalyMembersSnap.size;

        const ghostTokensSnap = await db.collection('fcm_tokens').where('memberId', '==', null).get();
        const ghostCount = ghostTokensSnap.size;

        const message = `[복샘요가 일일 운영 / 보안 보고]
- 오늘 출석: ${attendanceCount} 명
- 신규 가입: ${registrationCount} 명

[보안 / 데이터]
- 크레딧 오류: ${anomalyCount}건 ${anomalyCount > 0 ? '⚠️' : '✅'}
- 유령 토큰: ${ghostCount}건 ${ghostCount > 5 ? '⚠️' : '✅'}

오늘 하루도 수고 많으셨습니다. 평온한 밤 되세요. 🙏`;

        const tokensSnap = await db.collection('fcm_tokens').where('type', '==', 'admin').get();
        if (!tokensSnap.empty) {
            const tokens = tokensSnap.docs.map(d => d.id);
            await admin.messaging().sendEachForMulticast({
                tokens,
                notification: { title: "일일 운영/보안 보고서", body: message },
                data: { url: "/admin" }
            });
        }
    } catch (error) {
        console.error("Error in daily admin report:", error);
    }
    return null;
});

/**
 * Immediate Security Alert: Triggered when member data is updated with anomalies
 */
exports.onMemberUpdateSecurityAlertV2 = onDocumentUpdated("members/{memberId}", async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();

    if (newData.credits < 0 && (oldData.credits >= 0 || oldData.credits === undefined)) {
        const db = admin.firestore();
        const memberName = newData.name || "이름없는 회원";
        try {
            const tokensSnap = await db.collection('fcm_tokens').where('type', '==', 'admin').get();
            if (tokensSnap.empty) return;

            const tokens = tokensSnap.docs.map(d => d.id);
            const message = `[긴급 보안 알림]
${memberName} 회원의 크레딧이 음수(${newData.credits})로 떨어졌습니다. 비정상적인 접근이나 시스템 오류가 의심됩니다.`;

            await admin.messaging().sendEachForMulticast({
                tokens,
                notification: { title: "⚠️ 보안/데이터 긴급 알림", body: message },
                data: { url: "/admin" }
            });
        } catch (error) {
            console.error("Error sending emergency push:", error);
        }
    }
});

/**
 * [DATA INTEGRITY] Automatically maintain phoneLast4 and search fields
 */
exports.maintainMemberSearchFields = onDocumentWritten("members/{memberId}", async (event) => {
    if (!event.data.after.exists) return;
    const newData = event.data.after.data();
    const phone = newData.phone || "";
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const newLast4 = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : cleanPhone;
    if (newLast4 && newData.phoneLast4 !== newLast4) {
        return event.data.after.ref.update({ phoneLast4: newLast4 });
    }
});

/**
 * [SECURE] 비즈니스 로직 서버 이관: 출석 체크 및 크레딧 차감
 */
exports.checkInMemberV2Call = onCall({ region: "asia-northeast3", cors: true }, async (request) => {
    const { memberId, branchId, classTitle, instructor } = request.data;
    if (!memberId || !branchId) throw new HttpsError('invalid-argument', "Missing parameters");

    const db = admin.firestore();
    const memberRef = db.collection('members').doc(memberId);

    try {
        const result = await db.runTransaction(async (t) => {
            const memberDoc = await t.get(memberRef);
            if (!memberDoc.exists) throw new HttpsError('not-found', "Member not found");
            const memberData = memberDoc.data();

            const now = new Date();
            const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            if (memberData.endDate && memberData.endDate < todayStr) {
                throw new HttpsError('failed-precondition', `Membership expired(${memberData.endDate})`);
            }
            if (memberData.credits <= 0) throw new HttpsError('failed-precondition', "Insufficient credits");

            const attendanceCount = (memberData.attendanceCount || 0) + 1;
            const recentAttendanceSnap = await db.collection('attendance').where('memberId', '==', memberId).where('date', '<', todayStr).orderBy('date', 'desc').limit(10).get();
            const prevRecords = recentAttendanceSnap.docs.map(doc => doc.data());

            let streak = 1;
            try { streak = calculateStreak(prevRecords, todayStr); } catch (err) { }

            const isUnlimited = memberData.credits >= 9000;
            const memberUpdate = {
                credits: isUnlimited ? memberData.credits : admin.firestore.FieldValue.increment(-1),
                attendanceCount: admin.firestore.FieldValue.increment(1),
                lastAttendanceAt: admin.firestore.FieldValue.serverTimestamp(),
                streak: streak
            };

            let finalStartDate = memberData.startDate;
            let finalEndDate = memberData.endDate;
            if (memberData.startDate === 'TBD') {
                finalStartDate = todayStr;
                memberUpdate.startDate = finalStartDate;
                if (memberData.duration) {
                    const start = new Date(todayStr);
                    const end = new Date(start);
                    end.setMonth(end.getMonth() + memberData.duration);
                    end.setDate(end.getDate() - 1);
                    finalEndDate = end.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                    memberUpdate.endDate = finalEndDate;
                }
            }

            const todayAttendanceSnap = await db.collection('attendance').where('memberId', '==', memberId).where('date', '==', todayStr).get();
            const isMultiSession = !todayAttendanceSnap.empty;
            const sessionCount = todayAttendanceSnap.size + 1;

            t.update(memberRef, memberUpdate);
            const attendanceRef = db.collection('attendance').doc();
            t.set(attendanceRef, {
                memberId, memberName: memberData.name || 'Unknown', branchId, className: classTitle || "Self Practice",
                instructor: instructor || "관리자", timestamp: now.toISOString(), date: todayStr, isMultiSession, sessionCount,
                context: { streak, creditsBefore: memberData.credits }
            });

            return {
                success: true, memberName: memberData.name, newCredits: memberData.credits - 1, attendanceCount, streak,
                startDate: finalStartDate, endDate: finalEndDate, attendanceId: attendanceRef.id, isMultiSession, sessionCount
            };
        });
        return result;
    } catch (e) {
        if (e.code && e.details) throw e;
        throw new HttpsError('internal', e.message || "Transaction failed");
    }
});

/**
 * [NEW] Daily Home Yoga Recommendation
 */
exports.generateDailyYogaV2 = onCall({ region: "asia-northeast3", cors: true, secrets: ["GEMINI_KEY"] }, async (request) => {
    const { weather, timeOfDay, language = 'ko' } = request.data;
    try {
        const ai = getAI();
        const result = await ai.generateHomeYoga(weather, timeOfDay, language);
        if (result) return result;
        throw new Error("No result");
    } catch (e) {
        return [
            { name: "Child's Pose", benefit: language === 'ko' ? "휴식 및 이완" : "Rest", instruction: language === 'ko' ? "이마를 매트에 대고 평안하게 쉽니다." : "Rest forehead on mat.", emoji: "🧘" },
            { name: "Cat-Cow", benefit: language === 'ko' ? "척추 유연성" : "Spine Flex", instruction: language === 'ko' ? "숨을 마시며 등을 열고, 내쉬며 둥글게 맙니다." : "Inhale arch, exhale round.", emoji: "🐈" },
            { name: "Down Dog", benefit: language === 'ko' ? "전신 스트레칭" : "Full Body", instruction: language === 'ko' ? "엉덩이를 높이 들어 ㅅ자형을 만듭니다." : "Lift hips high.", emoji: "🐕" }
        ];
    }
});

exports.getSecureMemberV2Call = onCall({ cors: true }, async (request) => {
    const { phoneLast4 } = request.data;
    if (!phoneLast4) throw new Error("Missing phoneLast4");
    const db = admin.firestore();
    try {
        const snapshot = await db.collection('members').where('phoneLast4', '==', phoneLast4).limit(10).get();
        if (snapshot.empty) return { members: [] };
        const members = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id, name: data.name, credits: data.credits, attendanceCount: data.attendanceCount || 0,
                streak: data.streak || 0, homeBranch: data.homeBranch, endDate: data.endDate,
                phoneMasked: data.phone ? data.phone.substring(0, 3) + "-****-" + data.phone.slice(-4) : "****"
            };
        });
        return { members };
    } catch (e) {
        throw new Error(e.message);
    }
});

exports.onAttendanceCreated = onDocumentCreated("attendance/{attendanceId}", async (event) => {
    const attendance = event.data.data();
    const memberId = attendance.memberId;
    const currentDate = attendance.date;
    if (!memberId || !currentDate) return;
    const db = admin.firestore();
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
        const prevAttendanceSnap = await db.collection('attendance').where('memberId', '==', memberId).where('date', '>=', cutoffDate).where('date', '<', currentDate).orderBy('date', 'desc').limit(20).get();
        const prevRecords = prevAttendanceSnap.docs.map(doc => doc.data());
        const gapDays = prevRecords.length > 0 ? calculateGap(prevRecords[0].date, currentDate) : 0;
        const streak = calculateStreak(prevRecords, currentDate);
        const timeBand = getTimeBand(attendance.timestamp);
        const recentTimeBands = prevRecords.slice(0, 5).map(r => getTimeBand(r.timestamp));
        const mostCommonBand = getMostCommon(recentTimeBands);
        const timeBandShifted = mostCommonBand && mostCommonBand !== timeBand && recentTimeBands.length >= 3;

        let eventType = "PRACTICE_COMPLETED";
        let context = { gapDays, streak, timeBand, previousTimeBand: mostCommonBand || null };
        if (gapDays === 0) eventType = "FLOW_MAINTAINED";
        else if (gapDays >= 7 && gapDays < 30) eventType = "GAP_DETECTED";
        else if (gapDays >= 30) eventType = "FLOW_RESUMED";
        else if (gapDays >= 1 && gapDays < 7) eventType = "FLOW_MAINTAINED";
        if (timeBandShifted) {
            eventType = "PATTERN_SHIFTED";
            context.shiftDetails = `${mostCommonBand} → ${timeBand}`;
        }
        const messages = generateEventMessage(eventType, context);
        await db.collection('practice_events').add({
            memberId, attendanceId: event.params.attendanceId, eventType, triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
            date: currentDate, context, displayMessage: messages
        });
    } catch (error) {
        await logAIError('PracticeEvent_Calculation', error);
    }
});

function calculateGap(lastDate, currentDate) {
    const last = new Date(lastDate);
    const current = new Date(currentDate);
    return Math.ceil(Math.abs(current - last) / (1000 * 60 * 60 * 24));
}

function calculateStreak(records, currentDate) {
    if (records.length === 0) return 1;
    let streak = 1;
    let expectedDate = new Date(currentDate);
    for (const record of records) {
        expectedDate.setDate(expectedDate.getDate() - 1);
        if (new Date(record.date).toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) streak++;
        else break;
    }
    return streak;
}

function getTimeBand(timestamp) {
    if (!timestamp) return 'UNKNOWN';
    const hour = new Date(timestamp).getHours();
    if (hour >= 6 && hour < 12) return 'MORNING';
    if (hour >= 12 && hour < 18) return 'AFTERNOON';
    if (hour >= 18 && hour < 22) return 'EVENING';
    return 'NIGHT';
}

function getMostCommon(arr) {
    if (arr.length === 0) return null;
    const counts = {};
    arr.forEach(item => counts[item] = (counts[item] || 0) + 1);
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

function generateEventMessage(eventType, context) {
    const templates = {
        PRACTICE_COMPLETED: { ko: "오늘도 수련이 완료되었습니다.", en: "Today's practice is complete.", ru: "Сегодняшняя практика завершена.", zh: "今天的练习已完成。", ja: "今日の練習が完了しました。" },
        FLOW_MAINTAINED: { ko: `수련 리듬을 잘 유지하고 있습니다. (연속 ${context.streak}일)`, en: `Practice flow is maintained. (${context.streak} days streak)`, ru: `Поток практики поддерживается. (${context.streak} дней подряд)`, zh: `练习节奏保持良好。 (连续 ${context.streak} 天)`, ja: `練習のリズムを維持しています。 (連続 ${context.streak} 日)` },
        GAP_DETECTED: { ko: `${context.gapDays}일의 간격이 발생했습니다.`, en: `A gap of ${context.gapDays} days has occurred.`, ru: `Произошел перерыв в ${context.gapDays} дней.`, zh: `出现了 ${context.gapDays} 天的间隔。`, ja: `${context.gapDays} 日の間隔が発生しました。` },
        FLOW_RESUMED: { ko: `${context.gapDays}일 만에 수련이 재개되었습니다.`, en: `Practice resumed after ${context.gapDays} days.`, ru: `Практика возобновлена после ${context.gapDays} дней.`, zh: `在 ${context.gapDays} 天后恢复练习。`, ja: `${context.gapDays} 日ぶりに練習を再개했습니다.` },
        PATTERN_SHIFTED: { ko: `수련 시간대가 변경되었습니다. (${context.shiftDetails})`, en: `Practice time has shifted. (${context.shiftDetails})`, ru: `Время практики изменилось. (${context.shiftDetails})`, zh: `练习时间已更改。 (${context.shiftDetails})`, ja: `練習時間帯が変更されました。 (${context.shiftDetails})` }
    };
    return templates[eventType] || templates.PRACTICE_COMPLETED;
}



exports.getAllMembersAdminV2Call = onCall({ region: "asia-northeast3", cors: true }, async (request) => {
    // [SECURITY] Strict check for non-anonymous admin user
    if (!request.auth || !request.auth.token.email) {
        throw new HttpsError('unauthenticated', 'Permission denied. Admin authentication required.');
    }
    const db = admin.firestore();
    const snapshot = await db.collection("members").get();
    return { members: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
});

exports.sendSelfTestPush = onCall(async (request) => {
    // [SECURITY] Admin only
    if (!request.auth || !request.auth.token.email) {
        throw new HttpsError('unauthenticated', 'Permission denied');
    }
    const token = request.data.token;
    const delay = request.data.delay || 0;
    if (!token) throw new HttpsError('invalid-argument', 'Token is missing');
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, Math.min(delay, 10000)));
    const payload = {
        notification: { title: "나의요가 알림 테스트 성공!", body: "이 메시지가 보이면 푸시 알림이 정상 작동하는 것입니다." },
        data: { url: "/member", test: "true" }
    };
    try {
        const response = await admin.messaging().send({ token, notification: payload.notification, data: payload.data });
        return { success: true, messageId: response };
    } catch (error) {
        throw new HttpsError('internal', error.message || 'Unknown error');
    }
});
