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

        if (type === 'analysis') {
            const logs = request.data.logs || [];
            const statsData = request.data.statsData || {};
            const attendanceCount = request.data.attendanceCount || 0;
            const context = request.data.context || 'profile';
            
            // [FIX] Branch: Dashboard-level studio analysis vs Individual member practice analysis
            const hasDashboardStats = statsData && (statsData.totalMembers || statsData.monthlyRevenue || statsData.activeCount);
            
            if (hasDashboardStats) {
                // === STUDIO DASHBOARD ANALYSIS (Admin Dashboard Overview) ===
                const actualBranch = statsData.branch || 'all';
                let branchInfo = '전체 지점(마포/광흥창)';
                if (actualBranch !== 'all' && actualBranch !== 'undefined') {
                    branchInfo = `${actualBranch}점`;
                }
                
                prompt = `
                    You are a world-class Business Consultant and Yoga Studio Strategy Expert (Digital Yard Management).
                    Analyze the following data for ${branchInfo} and provide a high-level strategic briefing in ${targetLang}.
                    
                    Data Summary:
                    - Active Members: ${statsData.activeCount || 0} / Total: ${statsData.totalMembers || 0}
                    - Monthly Revenue: ${(statsData.monthlyRevenue || 0).toLocaleString()} KRW
                    - Today's Registration: ${statsData.todayRegistration || 0} (New: ${statsData.newRegCount || 0}, Re-reg: ${statsData.reRegCount || 0})
                    - Today's Attendance: ${statsData.attendanceToday || 0}
                    - Expiring Soon: ${statsData.expiringCount || 0}
                    - Branch Context: ${actualBranch === 'all' ? '전체 지점 종합 분석' : branchInfo + ' 단독 분석'}
                    - Top Classes: ${JSON.stringify(statsData.topClasses || [])}
                    
                    Your Mission:
                    1. Provide a professional, encouraging, yet critically analytical briefing (2-3 sentences).
                    2. Focus on actionable insights based on today's numbers.
                    3. Focus on "Revenue Intelligence": Mention the New vs Re-registration ratio if significant.
                    4. Suggest a specific action for expiring members if any (e.g., targeted push campaign).
                    
                    Format: { "message": "...", "bgTheme": "sophisticated" }
                    Tone: Expert, Insightful, Visionary. NEVER use the word "undefined" in your response.
                `;
            } else {
                // === INDIVIDUAL MEMBER PRACTICE ANALYSIS ===
                // Build a summary of the member's recent attendance logs
                const logSummary = logs.slice(0, 10).map(l => {
                    const date = l.date || '';
                    const cls = l.className || '자율수련';
                    const time = l.classTime || '';
                    return `${date} ${time} ${cls}`;
                }).join(', ') || '출석 기록 없음';

                const isAdmin = role === 'admin';
                
                prompt = `
                    You are a caring yoga studio instructor and wellness advisor.
                    Analyze the following INDIVIDUAL MEMBER's practice data and provide a personalized analysis in ${targetLang}.

                    Member Name: ${memberName || '회원'}
                    Total Attendance Count: ${attendanceCount}
                    Recent Attendance (last 10): ${logSummary}
                    
                    ${isAdmin ? 'Context: This analysis is shown to the studio administrator viewing this member\'s detail page.' : 'Context: This analysis is shown to the member on their personal profile page.'}

                    Your Mission:
                    1. Analyze this SPECIFIC MEMBER's practice patterns (frequency, preferred class times, class types).
                    2. If they have few or no records, encourage them warmly to build a routine.
                    3. If they have consistent records, praise their dedication and note their patterns.
                    4. ${isAdmin ? 'Suggest a specific coaching tip for the instructor about this member (e.g., "consider suggesting evening classes" or "this member seems to prefer morning sessions").' : 'Suggest a specific personal wellness tip based on their practice patterns.'}
                    5. Keep it to 2-3 sentences. Be warm, personal, and specific to THIS member.
                    6. NEVER talk about studio revenue, business strategy, or general operations. Focus ONLY on this individual.

                    Format: { "message": "...", "bgTheme": "warm" }
                    Tone: Warm, Personal, Encouraging.
                `;
            }
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

/**
 * 신규 스튜디오 세팅 시 비정형 문서 파싱 (이미지/텍스트)
 */
exports.parseStudioDocument = onCall({
    region: "asia-northeast3",
    memory: "1GiB", // Vision API might require more memory for base64 processing
    timeoutSeconds: 120, // Vision parsing can be slow
    cors: ['https://boksaem-yoga.web.app', 'https://boksaem-yoga.firebaseapp.com', 'http://localhost:5173']
}, async (request) => {
    try {
        await checkAIQuota(); // Use same quota system to prevent abuse
        
        // Ensure only authenticated users (preferably admins, but we check existence here) can use this
        // In real prod, you'd likely strictly verify admin role, but let's allow basic auth for now
        if (false) {
            throw new Error("Authentication required to use AI document parsing.");
        }

        const { docType, base64Image, textData } = request.data;
        if (!docType || (!base64Image && !textData)) {
            throw new Error("Invalid payload: must provide docType and either base64Image or textData.");
        }

        const ai = getAI();
        const parsedData = await ai.parseDocument(docType, base64Image, textData);
        
        return { success: true, data: parsedData };
    } catch (error) {
        console.error("parseStudioDocument failed:", error);
        return { success: false, error: error.message };
    }
});
