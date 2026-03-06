import { functions, db } from "../firebase";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";

const _safeGetItem = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const _safeSetItem = (key, value) => { try { localStorage.setItem(key, value); } catch { /* ignore */ } };

export const getAIExperience = async (memberName, attendanceCount, day, hour, upcomingClass, weather, credits, remainingDays, language = 'ko', diligence = null, context = 'profile') => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = `ai_experience_${memberName}_${today}_${hour}_${language}_${context}`;
    const cached = _safeGetItem(cacheKey);
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
        
        if (res.data && !res.data.isFallback) {
            _safeSetItem(cacheKey, JSON.stringify(res.data));
        }
        return res.data;
    } catch (error) {
        console.warn("AI Experience failed, using fallback:", error);
        
        if (context === 'instructor' || memberName?.includes('선생님')) {
            const instructorQuotes = [
                "매트 위에서 나를 만나는 소중한 시간입니다.",
                "오늘도 회원들에게 따뜻한 에너지를 전해주세요.",
                "선생님의 미소가 스튜디오를 밝힙니다.",
                "호흡을 통해 마음의 평온을 찾으세요.",
                "오늘 하루도 건강하고 행복하게!",
                "수련의 깊이가 더해지는 하루가 되길 바랍니다.",
                "나눔의 기쁨을 실천하는 멋진 선생님.",
                "잠시 멈추어 내면의 소리에 귀 기울여보세요.",
                "오늘도 즐거운 수련 되세요!"
            ];
            const randomQuote = instructorQuotes[Math.floor(Math.random() * instructorQuotes.length)];
            return { message: randomQuote, bgTheme: "sunny", colorTone: "#FFFFFF", isFallback: true };
        }

        const fallbacks = {
            ko: "오늘도 매트 위에서 나를 만나는 소중한 시간 되시길 바랍니다.",
            en: "May you find a precious moment to meet yourself on the mat today.",
            ru: "Желаю вам найти драгоценный момент для встречи с собой на коврике сегодня.",
            zh: "愿你今天在垫子上找到与自己相遇的珍贵时刻.",
            ja: "今日もマットの上で自分自身と向き合う大切な時間となりますように。"
        };
        return { message: fallbacks[language] || fallbacks['ko'], bgTheme: "sunny", colorTone: "#FFFFFF", isFallback: true };
    }
};

export const getAIAnalysis = async (memberName, attendanceCount, logs, timeOfDay, language = 'ko', requestRole = 'member', statsData = null, context = 'profile') => {
    const cacheKey = `ai_analysis_${memberName}_${attendanceCount}_${language}_${new Date().getHours()}`;
    const cached = _safeGetItem(cacheKey);
    if (cached) {
        console.log("[AI] Returning cached analysis");
        return JSON.parse(cached);
    }

    try {
        const genAI = httpsCallable(functions, 'generatePageExperienceV2');
        const res = await genAI({ memberName, attendanceCount, logs: (logs || []).slice(0, 10), type: 'analysis', timeOfDay, language, role: requestRole, statsData, context });

        if (res.data && !res.data.isFallback) {
            _safeSetItem(cacheKey, JSON.stringify(res.data));
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

export const getDailyYoga = async (language = 'ko') => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = `daily_yoga_${today}_${language}_v2`;
    const cached = _safeGetItem(cacheKey);

    if (cached) return JSON.parse(cached);

    try {
        const genYoga = httpsCallable(functions, 'generateDailyYogaV2');
        const response = await genYoga({ language, timeOfDay: new Date().getHours(), weather: 'Sunny' });
        const data = response.data;

        _safeSetItem(cacheKey, JSON.stringify(data));
        return data;
    } catch (e) {
        console.warn("Daily Yoga fetch failed:", e);
        // [FIX] Always return an array. If we need to flag it as fallback, we can't just add a property to the array easily 
        // without it potentially being lost or causing confusion. But for our UI, we check 'isFallback' on the data if it's an object.
        // Let's return the array and HomeYogaSection will handle the fallback UI.
        const fallbackData = [
            { name: "Child's Pose", benefit: language === 'ko' ? "휴식 및 이완" : "Rest", instruction: language === 'ko' ? "이마를 매트에 대고 편안하게 쉽니다." : "Rest forehead on mat.", emoji: "👶" },
            { name: "Cat-Cow", benefit: language === 'ko' ? "척추 유연성" : "Spine Flex", instruction: language === 'ko' ? "숨을 마시며 등을 펴고, 내쉬며 둥글게 맙니다." : "Inhale arch, exhale round.", emoji: "🐈" }
        ];
        return fallbackData;
    }
};

export const getAiUsage = async () => {
    try {
        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const docRef = doc(db, 'ai_quota', today);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            const data = snapshot.data();
            return { count: data.count || 0, limit: 5000 };
        }
        return { count: 0, limit: 5000 };
    } catch (e) {
        console.error("AI Usage fetch failed:", e);
        return { count: 0, limit: 2000 };
    }
};
