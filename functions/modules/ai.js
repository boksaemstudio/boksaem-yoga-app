/**
 * AI Module
 * AI 생성 관련 Cloud Functions
 * 
 * @module modules/ai
 * [Refactor] Extracted from index.js
 */

const { onCall } = require("firebase-functions/v2/https");
const { admin, getAI, checkAIQuota, logAIError, logAIRequest } = require("../helpers/common");

/**
 * AI 기반 맞춤형 페이지 경험 생성
 */
exports.generatePageExperienceV2 = onCall({ 
    region: "asia-northeast3", 
    memory: "512MiB",
    timeoutSeconds: 120,
    cors: ['https://boksaem-yoga.web.app', 'https://boksaem-yoga.firebaseapp.com', 'http://localhost:5173'] 
}, async (request) => {
    await checkAIQuota();

    let role = request.data.role || 'member';
    const type = request.data.type || 'experience';
    const language = request.data.language || 'ko';
    const memberName = request.data.memberName;
    const timeOfDay = request.data.timeOfDay;
    const weather = request.data.weather;
    const diligence = request.data.diligence || {};
    const streak = diligence.streak || 0;

    if (role === 'admin' && !request.auth) {
        role = 'visitor';
    }

    // [DEBUG] Log AI Request
    await logAIRequest('experience', memberName, { 
        role, type, language, timeOfDay, weather 
    }, {
        uid: request.auth?.uid || 'anonymous',
        ip: request.rawRequest ? request.rawRequest.ip : 'unknown'
    });

    try {
        const ai = getAI();
        const targetLang = ai.getLangName(language);
        let prompt = "";

        if (type === 'analysis' || role === 'admin') {
            const logs = request.data.logs || [];
            const statsData = request.data.statsData || {};
            const branchInfo = statsData.branch === 'all' ? '전체 지점(마포/광흥창)' : `${statsData.branch}점`;
            
            prompt = `
                You are a highly experienced Yoga Studio Director and Business Consultant.
                Analyze the following data for ${branchInfo} and provide 1-2 sentences of strategic management advice in ${targetLang}.
                
                Data Summary:
                - Active Members: ${statsData.activeCount} / Total: ${statsData.totalMembers}
                - Monthly Revenue: ${statsData.monthlyRevenue?.toLocaleString()} KRW
                - Today's Registration: ${statsData.todayRegistration} (New: ${statsData.newRegCount}, Re-reg: ${statsData.reRegCount})
                - Today's Attendance: ${statsData.attendanceToday}
                - Dormant Members (Risk): ${statsData.dormantCount}
                - Expiring Soon: ${statsData.expiringCount}
                - App Adoption: ${statsData.installedCount} members
                - Top Classes: ${JSON.stringify(statsData.topClasses)}
                
                Goal: Provide a concise, professional, and actionable insight. 
                Focus on: Member retention (dormant/expiring), revenue growth (re-registration), or operational efficiency based on attendance patterns.
                Format: { "message": "...", "bgTheme": "dawn" }
            `;
        } else {
            prompt = `
                Generate a warm, personalized greeting for ${memberName || 'visitor'}.
                Streak: ${streak}, TimeOfDay: ${timeOfDay}h, Weather: ${weather}.
                Length: 1 sentence. Language: ${targetLang}.
                Format: { "message": "...", "bgTheme": "dawn" }
            `;
        }

        const result = await ai.generateExperience(prompt);
        return result;

    } catch (error) {
        console.error("AI Generation Failed:", error);
        return {
            message: "매트 위에서 나를 만나는 소중한 시간입니다.",
            bgTheme: "sunny",
            isFallback: true,
            error: error.message
        };
    }
});

/**
 * 공지사항 번역
 */
exports.translateNoticesV2 = onCall({ 
    region: "asia-northeast3", 
    memory: "512MiB",
    timeoutSeconds: 120,
    cors: ['https://boksaem-yoga.web.app', 'https://boksaem-yoga.firebaseapp.com', 'http://localhost:5173'] 
}, async (request) => {
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
 * 오늘의 요가 자세 추천
 */
exports.generateDailyYogaV2 = onCall({ 
    region: "asia-northeast3", 
    memory: "512MiB",
    timeoutSeconds: 120,
    cors: ['https://boksaem-yoga.web.app', 'https://boksaem-yoga.firebaseapp.com', 'http://localhost:5173'] 
}, async (request) => {
    try {
        await checkAIQuota();
        const ai = getAI();
        const language = request.data.language || 'ko';
        const result = await ai.generateDailyYoga(language);
        return result;
    } catch (error) {
        console.error("Daily yoga failed:", error);
        return [
            { name: "Child's Pose", benefit: "휴식", instruction: "이마를 매트에 대세요", emoji: "👶" },
            { name: "Cat-Cow", benefit: "유연성", instruction: "숨에 맞춰 움직이세요", emoji: "🐈" }
        ];
    }
});
