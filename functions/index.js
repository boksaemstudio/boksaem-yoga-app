/**
 * Cloud Functions for My Yoga (나의요가)
 * Uses firebase-functions v2 API with firebase-admin v13
 */

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, onRequest } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();

// 글로벌 설정: 리전을 서울(asia-northeast3)로 설정
setGlobalOptions({ region: "asia-northeast3" });

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

        // 1. Fetch target members to get languages
        // In Firestore, "in" queries are limited to 10 or 30. If targetMemberIds > 30, we must batch or fetch all members.
        // Assuming we can just fetch all members for simplicity or fetch individually if small.
        // Or better: Fetch tokens where memberId is in targetMemberIds? No, Firestore doesn't support massive "IN" array well.
        // Strategy: Fetch all tokens. Filter by targetMemberIds locally. Fetch all members. Map languages.

        const allTokensSnap = await db.collection("fcm_tokens").get();
        if (allTokensSnap.empty) return;

        const allMembersSnap = await db.collection("members").get();
        const memberLangMap = {};
        allMembersSnap.forEach(doc => {
            memberLangMap[doc.id] = doc.data().language || 'ko';
        });

        const validTokensByLang = { 'ko': [] };

        allTokensSnap.forEach(doc => {
            const tokenData = doc.data();
            if (targetMemberIds.includes(tokenData.memberId)) {
                const lang = memberLangMap[tokenData.memberId] || 'ko';
                if (!validTokensByLang[lang]) validTokensByLang[lang] = [];
                validTokensByLang[lang].push(doc.id);
            }
        });

        const payloadBase = { data: { url: "/member" } };
        let successTotal = 0;
        let failureTotal = 0;

        // Helper (Duplicated from above - should be a shared function in real refactor)
        const getTranslatedContent = async (text, targetLang) => {
            if (targetLang === 'ko') return text;
            try {
                const apiKey = process.env.GEMINI_KEY;
                if (!apiKey) return text;
                const client = new GoogleGenerativeAI(apiKey);
                const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
                const prompt = `Translate the following text to ${targetLang}. Output ONLY the translated text.\n\nText: ${text}`;
                const result = await model.generateContent(prompt);
                return result.response.text().trim();
            } catch (e) {
                console.error(`Translation failed for ${targetLang}:`, e);
                return text;
            }
        };

        for (const [lang, tokens] of Object.entries(validTokensByLang)) {
            if (tokens.length === 0) continue;

            const title = await getTranslatedContent(titleOriginal, lang);
            const body = await getTranslatedContent(bodyOriginal, lang);

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

// V2 함수: Gemini AI를 활용한 맞춤형 페이지 경험(메시지 + 배경) 생성
exports.generatePageExperienceV2 = onCall({ cors: true, secrets: ["GEMINI_KEY"] }, async (request) => {
    const {
        memberName, attendanceCount, upcomingClass, weather, timeOfDay, dayOfWeek, credits, remainingDays,
        language = 'ko', role = 'member' // 'member', 'admin', 'visitor'
    } = request.data;
    const recentClasses = request.data.recentClasses || upcomingClass;

    const apiKey = process.env.GEMINI_KEY || admin.app().options?.geminiKey;
    if (!apiKey) throw new Error("API configuration missing");

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: role === 'admin' ? 0.3 : 1.0, // 관리자는 사실적(0.3), 사용자는 창의적(1.0)
            }
        });

        const langMap = { 'ko': 'Korean', 'en': 'English', 'ru': 'Russian', 'zh': 'Chinese (Simplified)', 'ja': 'Japanese' };
        const targetLang = langMap[language] || 'Korean';

        let prompt = "";

        if (request.data.type === 'analysis' || role === 'admin') {
            const logs = request.data.logs || [];
            const recentLogs = logs.slice(0, 10).map(l => l.className).join(", ");
            const stats = request.data.stats || {};

            prompt = `
                 You are the Senior Analyst of 'Boksaem Yoga'. 
                 Provide a **factual, data-driven analysis** for the ${role === 'admin' ? 'Administrator' : 'Member'}.

                 Context:
                 - Member: ${memberName}
                 - Total Attendance: ${attendanceCount}
                 - Recent Pattern: ${recentLogs}
                 - Stats: ${JSON.stringify(stats)}

                     Requirements (Role: ${role}):
                     1. ${role === 'admin' ? 'Focus on retention risk, frequency, and factual insights.' : 'Focus on professional feedback and progress tracking.'}
                     2. Tone: **Factual, Concise, Professional**. No poetic fillers.
                     3. Language: **${targetLang}**.
                     4. IMPORTANT: Even if member names or class names are in Korean, your output MUST be in **${targetLang}**.
                     5. DO NOT use "Namaste". 
                     
                     Output Format (JSON ONLY):
                     {
                         "message": "Factual analysis text in ${targetLang}",
                         "bgTheme": "data",
                         "colorTone": "#808080"
                     }
             `;
        } else {
            const isGeneric = role === 'visitor' || !memberName || ["방문 회원", "방문회원", "visitor", "Guest"].includes(memberName);

            if (isGeneric) {
                prompt = `
                    You are the poetic and emotional AI of 'Boksaem Yoga'.
                    Create an **emotional and inspiring greeting** for the lobby kiosk.
                    Context: ${timeOfDay}h, Weather: ${weather || "Calm"}, Day: ${dayOfWeek}
                    
                    Instructions:
                    1. Use elegant, warm, and human-like emotional language.
                    2. Write 1-2 sentences that touch the heart.
                    3. Language: **${targetLang}**. 
                    4. IMPORTANT: Even if inputs are in Korean, your output MUST be in **${targetLang}**.
                    5. Banned: "Namaste", "Welcome".
                    6. Tone: Poetic, Artistic.

                    Output Format (JSON ONLY):
                    { "message": "Emotional message in ${targetLang}", "bgTheme": "dawn", "colorTone": "#FDFCF0" }
                `;
            } else {
                prompt = `
                    You are the warm and energetic AI coach of 'Boksaem Yoga'.
                    Create a **highly encouraging and emotional welcome message** for ${memberName}.
                    
                    Stats: Total ${attendanceCount}, Next Class: ${upcomingClass || "Self Practice"}
                    
                    Instructions:
                    1. Focus on 'Energy' and 'Growth'. Make the member feel special and motivated.
                    2. Tone: Warm, Energetic, Emotional.
                    3. Language: **${targetLang}**. 
                    4. IMPORTANT: Even if inputs (like class names) are in Korean, your output MUST be in **${targetLang}**.
                    5. Banned: "Namaste". End with "Fighting!" or similar energetic closing.
                    6. Length: 2-3 sentences.

                    Output Format (JSON ONLY):
                    { "message": "Passionate message in ${targetLang}", "bgTheme": "hatha", "colorTone": "#FDFCF0" }
                `;
            }
        }

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw new Error("Invalid format");

    } catch (error) {
        console.error("AI Generation Failed:", error);

        const isGeneric = role === 'visitor' || !memberName || ["방문 회원", "방문회원", "visitor", "Guest"].includes(memberName);
        const isAnalysis = request.data.type === 'analysis' || role === 'admin';

        // Localized Fallbacks for Server-side Errors
        const fallbackMsgs = {
            ko: {
                analysis: `${memberName || ""} 회원님의 수련 데이터를 분석 중입니다. 잠시만 기다려주세요.`,
                experience: `${memberName ? memberName + "님, " : ""}오늘도 매트 위에서 나를 만나는 소중한 시간 되시길 바랍니다.`
            },
            en: {
                analysis: `Analyzing ${memberName || "your"} training data. Please wait a moment.`,
                experience: `Have a precious time meeting yourself on the mat today${memberName ? ", " + memberName : ""}.`
            },
            ru: {
                analysis: `Анализируем ваши данные тренировок${memberName ? ", " + memberName : ""}. Пожалуйста, подождите.`,
                experience: `Прекрасного времени на коврике сегодня${memberName ? ", " + memberName : ""}.`
            },
            zh: {
                analysis: `正在分析${memberName || "您"}的训练数据。请稍候。`,
                experience: `愿你今天在垫子上度过与自己相处的珍贵时光${memberName ? "，" + memberName : ""}。`
            },
            ja: {
                analysis: `${memberName || "会員"}様の修練データを分析中です。少々お待ちください。`,
                experience: `今日もマットの上で自分と向き合う大切な時間をお過ごしください${memberName ? "、" + memberName : "。"}`
            }
        };

        const lang = fallbackMsgs[language] ? language : 'ko';
        const fallbackMsg = isAnalysis ? fallbackMsgs[lang].analysis : fallbackMsgs[lang].experience;

        return {
            message: fallbackMsg,
            bgTheme: timeOfDay < 10 ? "dawn" : (timeOfDay >= 20 ? "night" : "sunny"),
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
        const allTokensSnap = await db.collection("fcm_tokens").get();
        if (allTokensSnap.empty) return;

        // 1. Fetch all members to map ID -> Language
        // Optimization: In a real large app, store language in fcm_tokens or use topic subscription
        const allMembersSnap = await db.collection("members").get();
        const memberLangMap = {};
        allMembersSnap.forEach(doc => {
            memberLangMap[doc.id] = doc.data().language || 'ko';
        });

        // 2. Group tokens by language
        const tokensByLang = { 'ko': [] };
        allTokensSnap.forEach(doc => {
            const tokenData = doc.data();
            const memberId = tokenData.memberId;
            // Default to 'ko' if not found or no language set
            const lang = (memberId && memberLangMap[memberId]) ? memberLangMap[memberId] : 'ko';

            if (!tokensByLang[lang]) tokensByLang[lang] = [];
            tokensByLang[lang].push(doc.id);
        });

        // 3. Prepare translations
        const payloadBase = { data: { url: "/member" } };
        let successTotal = 0;
        let failureTotal = 0;

        // Helper to translate if needed
        const getTranslatedContent = async (text, targetLang) => {
            if (targetLang === 'ko') return text;
            try {
                const apiKey = process.env.GEMINI_KEY;
                if (!apiKey) return text;
                const client = new GoogleGenerativeAI(apiKey);
                const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

                const prompt = `Translate the following text to ${targetLang}. Output ONLY the translated text.\n\nText: ${text}`;
                const result = await model.generateContent(prompt);
                return result.response.text().trim();
            } catch (e) {
                console.error(`Translation failed for ${targetLang}:`, e);
                return text; // Fallback to original
            }
        };

        // 4. Send batches per language
        for (const [lang, tokens] of Object.entries(tokensByLang)) {
            if (tokens.length === 0) continue;

            const title = await getTranslatedContent(titleOriginal, lang);
            const bodyRaw = await getTranslatedContent(bodyOriginal, lang);
            const body = bodyRaw.length > 100 ? bodyRaw.substring(0, 100) + "..." : bodyRaw;

            const payload = {
                ...payloadBase,
                notification: { title: `[Notice] ${title}`, body }
            };

            // Send to device (max 1000 at a time, but sendToDevice handles it usually or we chunk it)
            // admin.messaging().sendToDevice handles up to 1000 tokens. 
            // If more, we should chunk. Assuming < 1000 for now or relying on library.
            // Actually, sendToDevice is legacy. But we use it here.
            // Safe chunking just in case.
            const chunkSize = 500;
            for (let i = 0; i < tokens.length; i += chunkSize) {
                const chunk = tokens.slice(i, i + chunkSize);
                const response = await admin.messaging().sendToDevice(chunk, payload);
                successTotal += response.successCount;
                failureTotal += response.failureCount;
            }
        }

        console.log(`Global notice push sent. Success: ${successTotal}, Failure: ${failureTotal}`);

        // 결과 기록 추가
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

/**
 * Helper to generate AI re-engagement messages
 */
/**
 * Helper to generate AI re-engagement messages
 */
async function generateReEngagementMessage(member, attendanceStats, language = 'ko') {
    const apiKey = process.env.GEMINI_KEY;
    if (!apiKey) return null;

    try {
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

        const langMap = {
            'ko': 'Korean',
            'en': 'English',
            'ru': 'Russian',
            'zh': 'Chinese (Simplified)',
            'ja': 'Japanese'
        };
        const targetLang = langMap[language] || 'Korean';

        const prompt = `
            You are the friendly and wise AI director of 'Boksaem Yoga'.
            The member's membership involves expiration or low credits. Write a short, warm encouragement message to bring them back.

            Member Info:
            - Name: ${member.name}
            - Summary: ${attendanceStats || "No recent records"}

            Instructions:
            1. Write very briefly (1-2 sentences) for a Push Notification.
            2. Mention their past consistency or consistency in general to trigger nostalgia for peace.
            3. End with a message waiting for them on the mat.
            4. **Language**: Write the response in **${targetLang}**.

            Output ONLY the message text.
        `;

        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (e) {
        console.error("AI Re-engagement Generation Failed:", e);
        return null;
    }
}

/**
 * Daily 9:00 AM Check for Expiring Members
 */
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

/**
 * Trigger on Credits Change (Low Balance Alert)
 */
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
        // 출석 기록 분석
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
    const apiKey = process.env.GEMINI_KEY || admin.app().options?.geminiKey;

    if (!apiKey || !notices || notices.length === 0 || language === 'ko') {
        return notices; // 번역이 필요 없거나 키가 없으면 원본 반환
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const langMap = {
            'en': 'English', 'ru': 'Russian', 'zh': 'Chinese (Simplified)', 'ja': 'Japanese'
        };
        const targetLang = langMap[language] || 'English';

        // 여러 공지사항을 한 번에 번역하기 위한 프롬프트
        const prompt = `
            Translate the following array of notices into ${targetLang}.
            Keep the original IDs and only translate 'title' and 'content'.
            Output ONLY the translated array in JSON format.
            
            Notices:
            ${JSON.stringify(notices.map(n => ({ id: n.id, title: n.title, content: n.content })))}
            
            Requirements:
            1. Language: **${targetLang}**
            2. Tone: Official, polite, information-oriented
            3. Do not change IDs.
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
            const translatedArray = JSON.parse(jsonMatch[0]);
            // 원본 데이터와 병합 (이미지 등 유지)
            return notices.map(original => {
                const trans = translatedArray.find(t => t.id === original.id);
                return trans ? { ...original, title: trans.title, content: trans.content, isTranslated: true } : original;
            });
        }
        return notices;
    } catch (error) {
        console.error("Notice translation failed:", error);
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

        // 5. Send Push
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
 * [SECURE] 온디맨드 회원 조회: 개인정보 노출 최소화
 * 전화번호 뒤 4자리로 필터링하여 필요한 최소 데이터만 반환합니다.
 */
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
 * 클라이언트의 직접적인 'list' 접근이 차단되었으므로, 서버를 통해 데이터를 제공합니다.
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
