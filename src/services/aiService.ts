/**
 * AI Service — AI Experiences, Analysis, Daily Yoga
 * TypeScript version
 */
import { functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import { getDoc } from "firebase/firestore";
import { tenantDb } from '../utils/tenantDb';

// ── Types ──
export interface AIExperienceResult {
    message: string;
    bgTheme?: string;
    colorTone?: string;
    isFallback?: boolean;
    [key: string]: unknown;
}

export interface AIAnalysisResult {
    message: string;
    isFallback?: boolean;
    [key: string]: unknown;
}

export interface DailyYogaPose {
    name: string;
    benefit: string;
    instruction: string;
    emoji?: string;
}

export interface AIUsage {
    count: number;
    limit: number;
}

// ── Helpers ──
const _safeGetItem = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const _safeSetItem = (key: string, value: string): void => { try { localStorage.setItem(key, value); } catch { /* ignore */ } };

const INSTRUCTOR_QUOTES = [
    "매트 위에서 나를 만나는 소중한 시간입니다.", "오늘도 회원들에게 따뜻한 에너지를 전해주세요.",
    "선생님의 미소가 스튜디오를 밝힙니다.", "호흡을 통해 마음의 평온을 찾으세요.",
    "오늘 하루도 건강하고 행복하게!", "수련의 깊이가 더해지는 하루가 되길 바랍니다.",
    "나눔의 기쁨을 실천하는 멋진 선생님.", "잠시 멈추어 내면의 소리에 귀 기울여보세요.", "오늘도 즐거운 수련 되세요!"
];

const FALLBACK_MESSAGES: Record<string, string> = {
    ko: "오늘도 매트 위에서 나를 만나는 소중한 시간 되시길 바랍니다.",
    en: "May you find a precious moment to meet yourself on the mat today.",
    ru: "Желаю вам найти драгоценный момент для встречи с собой на коврике сегодня.",
    zh: "愿你今天在垫子上找到与自己相遇的珍贵时刻.",
    ja: "今日もマットの上で自分自身と向き合う大切な時間となりますように。"
};

const getInstructorFallback = (): AIExperienceResult => ({
    message: INSTRUCTOR_QUOTES[Math.floor(Math.random() * INSTRUCTOR_QUOTES.length)],
    bgTheme: "sunny", colorTone: "#FFFFFF", isFallback: true
});

const getFallback = (language: string): AIExperienceResult => ({
    message: FALLBACK_MESSAGES[language] || FALLBACK_MESSAGES['ko'],
    bgTheme: "sunny", colorTone: "#FFFFFF", isFallback: true
});

const DAILY_YOGA_FALLBACK = (language: string): DailyYogaPose[] => [
    { name: "Child's Pose", benefit: language === 'ko' ? "휴식 및 이완" : "Rest", instruction: language === 'ko' ? "이마를 매트에 대고 편안하게 쉽니다." : "Rest forehead on mat.", emoji: "👶" },
    { name: "Cat-Cow", benefit: language === 'ko' ? "척추 유연성" : "Spine Flex", instruction: language === 'ko' ? "숨을 마시며 등을 펴고, 내쉬며 둥글게 맙니다." : "Inhale arch, exhale round.", emoji: "🐈" }
];

// ── Service ──
export const getAIExperience = async (
    memberName: string, attendanceCount: number, day: string, hour: number,
    upcomingClass: string | null, weather: string | null, credits: number, remainingDays: number,
    language = 'ko', diligence: unknown = null, context = 'profile', mbti: string | null = null
): Promise<AIExperienceResult> => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = `ai_experience_${memberName}_${today}_${hour}_${language}_${context}`;
    const cached = _safeGetItem(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
        const genAI = httpsCallable(functions, 'generatePageExperienceV2');
        const isGeneric = !memberName || ["방문 회원", "방문회원", "visitor", "Guest"].includes(memberName);
        const res = await genAI({ memberName, attendanceCount, dayOfWeek: day, timeOfDay: hour, upcomingClass, weather, credits, remainingDays, language, diligence, role: isGeneric ? 'visitor' : 'member', type: 'experience', context, mbti });
        const data = res.data as AIExperienceResult | null;

        if (!data || (Array.isArray(data) && data.length === 0)) {
            return (context === 'instructor' || memberName?.includes('선생님')) ? getInstructorFallback() : getFallback(language);
        }
        if (data && !data.isFallback) _safeSetItem(cacheKey, JSON.stringify(data));
        return data;
    } catch (error) {
        console.warn("AI Experience failed, using fallback:", error);
        return (context === 'instructor' || memberName?.includes('선생님')) ? getInstructorFallback() : getFallback(language);
    }
};

export const getAIAnalysis = async (
    memberName: string, attendanceCount: number, logs: unknown[], timeOfDay: string,
    language = 'ko', requestRole = 'member', statsData: unknown = null, context = 'profile'
): Promise<AIAnalysisResult> => {
    const todayDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = context === 'admin'
        ? `ai_analysis_admin_${todayDate}_${language}`
        : `ai_analysis_${memberName}_${attendanceCount}_${language}_${new Date().getHours()}`;
    const cached = _safeGetItem(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
        const genAI = httpsCallable(functions, 'generatePageExperienceV2');
        const res = await genAI({ memberName, attendanceCount, logs: (logs || []).slice(0, 10), type: 'analysis', timeOfDay, language, role: requestRole, statsData, context });
        const data = res.data as AIAnalysisResult;
        if (data && !data.isFallback) _safeSetItem(cacheKey, JSON.stringify(data));
        return data;
    } catch (error) {
        console.warn("AI Analysis failed, using fallback:", error);
        const fallbacks: Record<string, string> = { ko: "수련 기록을 바탕으로 분석 중입니다.", en: "Analyzing your practice records.", ru: "Анализируем ваши записи.", zh: "正在分析修炼记录.", ja: "練習記録を分析中です。" };
        return { message: fallbacks[language] || fallbacks['ko'], isFallback: true };
    }
};

export interface ChurnAnalysisData {
    branch: string;
    activeCount: number;
    totalMembers: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    detailed?: boolean;
    riskMembers: Array<{
        name: string;
        daysSince: number;
        credits: number;
        subject: string;
        level: string;
    }>;
}

export const getChurnAnalysis = async (
    churnData: ChurnAnalysisData,
    language = 'ko'
): Promise<AIAnalysisResult> => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const hour = new Date().getHours();
    const mode = churnData.detailed ? 'detailed' : 'brief';
    const cacheKey = `ai_churn_${mode}_${churnData.branch}_${today}_${Math.floor(hour / 2)}`;
    const cached = _safeGetItem(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
        const genAI = httpsCallable(functions, 'generatePageExperienceV2');
        const res = await genAI({ 
            type: 'churn_analysis', 
            language,
            churnData,
            memberName: 'Admin',
            role: 'admin'
        });
        const data = res.data as AIAnalysisResult;
        if (data && !data.isFallback) _safeSetItem(cacheKey, JSON.stringify(data));
        return data;
    } catch (error) {
        console.warn("AI Churn Analysis failed, using fallback:", error);
        return { message: `이탈 위험 회원 ${churnData.criticalCount + churnData.highCount + churnData.mediumCount}명 감지.`, isFallback: true };
    }
};

export const generateChurnMessage = async (
    memberInfo: { name: string; daysSince: number; credits: number; subject: string; level: string },
    studioName = '스튜디오',
    language = 'ko'
): Promise<string> => {
    const cacheKey = `ai_churn_msg_${memberInfo.name}_${memberInfo.daysSince}`;
    const cached = _safeGetItem(cacheKey);
    if (cached) return cached;

    try {
        const genAI = httpsCallable(functions, 'generatePageExperienceV2');
        const res = await genAI({
            type: 'churn_message',
            language,
            memberInfo,
            studioName,
            memberName: memberInfo.name,
            role: 'admin'
        });
        const data = res.data as AIAnalysisResult;
        const msg = data?.message || '';
        if (msg && !data.isFallback) _safeSetItem(cacheKey, msg);
        return msg;
    } catch (error) {
        console.warn("AI Churn Message failed:", error);
        return `${memberInfo.name} 회원님, 안녕하세요! 요즘 어떻게 지내세요? 😊 다시 뵙기를 기다리고 있어요 🧘‍♀️`;
    }
};

export const getDailyYoga = async (language = 'ko', mbti: string | null = null): Promise<DailyYogaPose[]> => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = `daily_yoga_${today}_${language}_${mbti || 'none'}_v4`;
    const cached = _safeGetItem(cacheKey);
    if (cached && cached !== 'null' && cached !== 'undefined') {
        try { const parsed = JSON.parse(cached); if (Array.isArray(parsed) && parsed.length > 0) return parsed; } catch { /* ignore */ }
    }
    try {
        const genYoga = httpsCallable(functions, 'generateDailyYogaV2');
        const response = await genYoga({ language, timeOfDay: new Date().getHours(), weather: 'Sunny', mbti });
        const data = response.data as DailyYogaPose[] | null;
        if (!data || (Array.isArray(data) && data.length === 0)) return DAILY_YOGA_FALLBACK(language);
        _safeSetItem(cacheKey, JSON.stringify(data));
        return data;
    } catch (e) {
        console.warn("Daily Yoga fetch failed:", e);
        return DAILY_YOGA_FALLBACK(language);
    }
};

export const getAiUsage = async (): Promise<AIUsage> => {
    try {
        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const docRef = tenantDb.doc('ai_quota', today);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) { const data = snapshot.data() as { count?: number }; return { count: data.count || 0, limit: 1500 }; }
        return { count: 0, limit: 1500 };
    } catch (e) {
        console.error("AI Usage fetch failed:", e);
        return { count: 0, limit: 1500 };
    }
};
