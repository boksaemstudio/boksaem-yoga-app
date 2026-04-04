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
    cors: require('../helpers/cors').ALLOWED_ORIGINS 
}, async (request) => {
    await checkAIQuota(request.data.studioId);

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
    }, request.data.studioId);

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
                
                const expiringLine = (statsData.expiringCount > 0) 
                    ? `- Expiring Soon (within 7 days): exactly ${statsData.expiringCount} members` 
                    : '';

                prompt = `
                    You are a world-class Business Consultant and Yoga Studio Strategy Expert (Digital Yard Management).
                    Analyze the following data for ${branchInfo} and provide a high-level strategic briefing in ${targetLang}.
                    
                    Data Summary:
                    - Active Members: ${statsData.activeCount || 0} / Total: ${statsData.totalMembers || 0}
                    - Monthly Revenue: ${(statsData.monthlyRevenue || 0).toLocaleString()} KRW
                    - Today's Registration: ${statsData.todayRegistration || 0} (New: ${statsData.newRegCount || 0}, Re-reg: ${statsData.reRegCount || 0})
                    - Today's Attendance: ${statsData.attendanceToday || 0}
                    ${expiringLine}
                    - Branch Context: ${actualBranch === 'all' ? '전체 지점 종합 분석' : branchInfo + ' 단독 분석'}
                    - Top Classes: ${JSON.stringify(statsData.topClasses || [])}
                    - Current Time: ${statsData.currentHour || 'unknown'}시 (${statsData.timeContext || 'unknown'})
                    - First Class Today: ${statsData.firstClassHour || 10}시
                    
                    ⚠️ CRITICAL TIME-AWARE INSTRUCTION:
                    ${statsData.timeGuidance || 'Provide a balanced analysis based on current data.'}
                    
                    ⚠️ STRICT DATA GROUNDING RULES (MUST FOLLOW):
                    - ONLY reference the EXACT numbers provided above. NEVER fabricate, estimate, or round up any numbers.
                    - If "Expiring Soon" data is not listed above, do NOT mention expiring members at all.
                    - NEVER say numbers like "300명" or "수백 명" unless that exact figure appears in the data above.
                    - If Active Members is ${statsData.activeCount || 0}, you must NOT claim a different number is expiring.
                    
                    Your Mission:
                    1. Provide a professional, encouraging, yet critically analytical briefing (3-5 sentences, must complete all sentences fully).
                    2. Focus on actionable insights appropriate for the current time of day.
                    3. Focus on "Revenue Intelligence": Mention the New vs Re-registration ratio if significant.
                    4. ${expiringLine ? 'Suggest a specific action for the expiring members mentioned above.' : 'Do NOT mention expiring members since there are none.'}
                    5. NEVER state obvious facts like "today's revenue is 0" in the morning before classes start.
                    6. Today's first class starts at ${statsData.firstClassHour || 10}:00 AM. Use this as the reference for class start time. NEVER guess or assume a different time.
                    7. You MUST complete every sentence fully. Do NOT leave any sentence unfinished or cut off.
                    
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
        } else if (type === 'churn_analysis') {
            // === AI CHURN ANALYSIS — 실제 회원 데이터 기반 이탈 분석 ===
            const churnData = request.data.churnData || {};
            const branchName = churnData.branch || '전체';
            const activeCount = churnData.activeCount || 0;
            const totalMembers = churnData.totalMembers || 0;
            
            // 실제 이탈 위험 회원 목록 (프론트에서 전달)
            const riskMembers = (churnData.riskMembers || []).slice(0, 30); // 최대 30명까지만

            const memberDataStr = riskMembers.map((m, i) => 
                `${i+1}. ${m.name} | 미출석 ${m.daysSince}일 | 잔여 ${m.credits}회 | 수강: ${m.subject || '일반'} | 등급: ${m.level}`
            ).join('\n');

            prompt = `
                당신은 요가/필라테스 스튜디오 운영 전문 AI 컨설턴트입니다.
                아래는 "${branchName}" 업장의 실제 회원 이탈 위험 데이터입니다.
                
                📊 업장 현황:
                - 활성 회원: ${activeCount}명 / 전체: ${totalMembers}명
                - 이탈 위험 총: ${riskMembers.length}명
                  (위험 ${churnData.criticalCount || 0}명, 주의 ${churnData.highCount || 0}명, 관찰 ${churnData.mediumCount || 0}명)
                
                📋 이탈 위험 회원 상세:
                ${memberDataStr || '현재 이탈 위험 회원 없음'}
                
                ⚙️ 분류 기준:
                - 위험: 30일+ 미출석 또는 잔여 1회 이하 + 14일+ 미출석
                - 주의: 21~29일 미출석
                - 관찰: 14~20일 미출석
                
                ${churnData.detailed ? `
                상세 분석 모드입니다. 아래 형식의 JSON으로 응답하세요:
                {
                    "critical": "[위험 등급 회원들에 대한 구체적 분석 (이름 언급, 미출석 패턴, 잔여 횟수 위험도, 시급한 조치 방안). 해당 회원이 없으면 '해당 없음']",
                    "high": "[주의 등급 회원들에 대한 구체적 분석 (이름 언급, 이탈 전조 패턴, 복귀 유도 전략). 해당 회원이 없으면 '해당 없음']",
                    "medium": "[관찰 등급 회원들에 대한 구체적 분석 (이름 언급, 현재 추세, 예방 조치). 해당 회원이 없으면 '해당 없음']",
                    "summary": "[전체 총평: 이 업장의 이탈 위험 전체 흐름을 거시적으로 분석. 이탈률 추세, 패턴 특징점, 가장 시급한 조치, 중장기 전략을 전문가 관점으로 4~5문장으로 상세히 작성]"
                }
                
                각 분석은:
                - 회원 이름을 구체적으로 언급하세요
                - 각 등급별 2~3문장으로 작성하세요
                - 이모지를 적절히 사용하세요
                - summary는 전문 컨설턴트의 종합 의견으로 4~5문장으로 자세하게 작성하세요
                ` : `
                요청:
                1. 이 업장의 이탈 현황을 표어(슬로건)처럼 한줄로 요약하세요.
                2. 반드시 30자 이내, 1문장으로 작성하세요.
                3. 핵심 수치를 포함하되 간결하게. 예: "위험 11명, 긴급 관리 필요 🚨"
                4. 이모지 1개만 문장 끝에 사용하세요.
                
                Format: { "message": "..." }
                `}
                반드시 ${targetLang}로 작성하세요.
            `;
        } else if (type === 'churn_message') {
            // === AI 개인 맞춤 안부 메시지 — 이탈 위험 회원별 ===
            const memberInfo = request.data.memberInfo || {};
            const studioName = request.data.studioName || '스튜디오';
            
            prompt = `
                당신은 "${studioName}"의 따뜻한 요가 선생님입니다.
                아래 회원에게 보낼 개인 맞춤 안부 메시지를 작성해주세요.
                
                📌 회원 정보:
                - 이름: ${memberInfo.name}
                - 미출석: ${memberInfo.daysSince}일
                - 잔여 횟수: ${memberInfo.credits}회
                - 수강 과목: ${memberInfo.subject || '일반'}
                - 위험 등급: ${memberInfo.level}
                
                메시지 작성 규칙:
                - 회원 이름으로 시작하세요 (예: "${memberInfo.name} 회원님")
                - ${memberInfo.level === '위험' ? '오래 못 뵌 것에 대한 진심 어린 걱정과 안부를 전하세요. 다시 오라는 압박 없이 자연스럽게' : 
                  memberInfo.level === '주의' ? '최근 뜸한 것에 대해 부드럽게 안부를 묻고, 수련의 좋은 점을 상기시켜 주세요' :
                  '꾸준한 수련의 중요성을 따뜻하게 전하면서 다시 오기를 기다린다고 하세요'}
                - 잔여 횟수가 ${memberInfo.credits}회이므로 ${memberInfo.credits <= 2 ? '잔여 횟수가 얼마 남지 않았음을 자연스럽게 언급' : '횟수는 언급하지 마세요'}
                - 이모지를 2~3개 자연스럽게 사용
                - 3~4문장, 80자 이내
                - 광고성 느낌 없이 진심이 느껴지도록
                - 반드시 ${targetLang}로 작성
                
                Format: { "message": "..." }
            `;
        } else {
            const mbti = request.data.mbti || null;
            const mbtiContext = mbti ? `MBTI: ${mbti}. Consider their personality type when crafting the greeting (e.g., introverts might prefer calmer tones, extraverts more energetic).` : '';
            prompt = `
                Generate a warm greeting for someone arriving at a yoga studio.
                Do NOT address them by any name or title (no "회원님", no "방문자님", no names).
                Streak: ${streak}, TimeOfDay: ${timeOfDay}h, Weather: ${weather}.
                ${mbtiContext}
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
    cors: require('../helpers/cors').ALLOWED_ORIGINS 
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
    cors: require('../helpers/cors').ALLOWED_ORIGINS 
}, async (request) => {
    try {
        await checkAIQuota(request.data.studioId);
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
    cors: require('../helpers/cors').ALLOWED_ORIGINS
}, async (request) => {
    // [FIX] Auth guard — 관리자만 문서 파싱 가능
    const { requireAdmin } = require('../helpers/authGuard');
    requireAdmin(request, 'parseStudioDocument');
    try {
        await checkAIQuota(request.data.studioId); // Use same quota system to prevent abuse
        
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
