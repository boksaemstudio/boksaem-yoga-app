/**
 * AI Service Module
 * AI 관련 Cloud Function 호출을 처리합니다.
 * 
 * @module aiModule
 * [Refactor] Extracted from storage.js
 */

import { functions } from "../../firebase";
import { httpsCallable } from "firebase/functions";

// localStorage 안전 접근 헬퍼
const safeGetItem = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const safeSetItem = (key, value) => { try { localStorage.setItem(key, value); } catch { /* ignore */ } };

/**
 * AI 기반 회원 경험 메시지 생성
 */
export const getAIExperience = async (memberName, attendanceCount, day, hour, upcomingClass, weather, credits, remainingDays, language = 'ko', diligence = null, context = 'profile') => {
    // [PERF] 시간별 캐시 — 동일 시간대 중복 Cloud Function 호출 방지
    const cacheKey = `ai_experience_${memberName}_${hour}_${language}_${context}`;
    const cached = safeGetItem(cacheKey);
    if (cached) {
        console.log("[AI] Returning cached experience");
        return JSON.parse(cached);
    }

    try {
        const genAI = httpsCallable(functions, 'generatePageExperienceV2');
        const isGeneric = !memberName || ["방문 회원", "방문회원", "visitor", "Guest"].includes(memberName);
        const res = await genAI({
            memberName, attendanceCount, dayOfWeek: day, timeOfDay: hour, upcomingClass, weather, credits, remainingDays, language, diligence,
            role: isGeneric ? 'visitor' : 'member', type: 'experience', context
        });
        
        // [PERF] 캐시 저장 (fallback 아닌 경우만)
        if (res.data && !res.data.isFallback) {
            safeSetItem(cacheKey, JSON.stringify(res.data));
        }
        return res.data;
    } catch (error) {
        console.warn("AI Experience failed, using fallback:", error);
        const fallbacks = {
            ko: "오늘도 매트 위에서 나를 만나는 소중한 시간 되시길 바랍니다.",
            en: "May you find a precious moment to meet yourself on the mat today.",
            ru: "Желаю вам найти драгоценный момент для встречи с собой на коврике сегодня.",
            zh: "愿你今天在垫子上找到与自己相遇的珍贵时刻。",
            ja: "今日もマットの上で自分自身と向き合う大切な時間となりますように。"
        };
        return { message: fallbacks[language] || fallbacks['ko'], bgTheme: "sunny", colorTone: "#FFFFFF", isFallback: true };
    }
};

/**
 * AI 기반 회원 분석 메시지 생성
 */
export const getAIAnalysis = async (memberName, attendanceCount, logs, timeOfDay, language = 'ko', requestRole = 'member', statsData = null, context = 'profile') => {
    // 1. Check Cache
    const cacheKey = `ai_analysis_${memberName}_${attendanceCount}_${language}_${new Date().getHours()}`;
    const cached = safeGetItem(cacheKey);
    if (cached) {
        console.log("[AI] Returning cached analysis");
        return JSON.parse(cached);
    }

    try {
        const genAI = httpsCallable(functions, 'generatePageExperienceV2');
        const res = await genAI({ memberName, attendanceCount, logs: (logs || []).slice(0, 10), type: 'analysis', timeOfDay, language, role: requestRole, statsData, context });

        // 2. Set Cache
        if (res.data && !res.data.isFallback) {
            safeSetItem(cacheKey, JSON.stringify(res.data));
        }
        return res.data;
    } catch (error) {
        console.warn("AI Analysis failed, using fallback:", error);
        const fallbacks = {
            ko: "수련 기록을 바탕으로 분석 중입니다. 꾸준한 발걸음을 응원합니다!",
            en: "Analyzing your practice records. Cheering for your steady progress!",
            ru: "Анализируем ваши записи тренировок. Поддерживаем ваш постоянный прогресс!",
            zh: "正在通过修炼记录进行分析。为您的坚持加油！",
            ja: "練習記録を分析中です。あなたの着実な歩みを応援します！"
        };
        return { message: fallbacks[language] || fallbacks['ko'], isFallback: true };
    }
};

/**
 * 오늘의 요가 자세 추천
 */
export const getDailyYoga = async (language = 'ko') => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = `daily_yoga_${today}_${language}_v2`;
    const cached = safeGetItem(cacheKey);

    if (cached) return JSON.parse(cached);

    try {
        const genYoga = httpsCallable(functions, 'generateDailyYogaV2');
        const response = await genYoga({ language, timeOfDay: new Date().getHours(), weather: 'Sunny' });
        const data = response.data;

        safeSetItem(cacheKey, JSON.stringify(data));
        return data;
    } catch (e) {
        console.warn("Daily Yoga fetch failed:", e);
        const fallbackData = [
            { name: "Child's Pose", benefit: language === 'ko' ? "휴식 및 이완" : "Rest", instruction: language === 'ko' ? "이마를 매트에 대고 편안하게 쉽니다." : "Rest forehead on mat.", emoji: "👶" },
            { name: "Cat-Cow", benefit: language === 'ko' ? "척추 유연성" : "Spine Flex", instruction: language === 'ko' ? "숨을 마시며 등을 펴고, 내쉬며 둥글게 맙니다." : "Inhale arch, exhale round.", emoji: "🐈" }
        ];
        fallbackData.isFallback = true;
        return fallbackData;
    }
};

/**
 * AI 사용량 조회
 */
export const getAiUsage = async (db, collection, query, orderBy, limit, getDocs) => {
    try {
        const q = query(
            collection(db, 'ai_usage'),
            orderBy("date", "desc"),
            limit(30)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn("Failed to fetch AI usage:", e);
        return [];
    }
};
