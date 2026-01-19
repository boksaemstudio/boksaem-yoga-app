import { GoogleGenerativeAI } from "@google/generative-ai";
import { VAPID_KEY } from "../firebase"; // VAPID_KEY is unused here, just checking imports

// Hardcoded API Key from firebase.js (for client-side use as requested by current constraints)
// In production, this should be proxied, but for this specific local task where deployment is blocked, we use it directly.
const API_KEY = "AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw";

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 1.0,
    }
});

export const generateClientSideAIExperience = async (data) => {
    const {
        memberName,
        attendanceCount,
        upcomingClass,
        weather,
        timeOfDay,
        dayOfWeek,
        diligence, // The new Diligence object
        language = 'ko',
        role = 'member'
    } = data;

    console.log("[AI Service] Generating Client-Side Experience for:", memberName);
    console.log("[AI Service] Diligence Data:", diligence);

    const langMap = { 'ko': 'Korean', 'en': 'English', 'ru': 'Russian', 'zh': 'Chinese (Simplified)', 'ja': 'Japanese' };
    const targetLang = langMap[language] || 'Korean';

    // 1. Visitor / Generic Logic
    if (role === 'visitor' || !memberName || ["방문 회원", "방문회원", "visitor", "Guest"].includes(memberName)) {
        const prompt = `
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
        return generateContent(prompt);
    }

    // 1.5 Admin Dashboard Insight Logic
    if (role === 'admin') {
        const stats = data.statsData || {};
        const prompt = `
            You are the 'Yoga Studio Business Analyst AI'.
            Provide a **factual yet encouraging real-time status summary** for the manager.
            
            **Current Stats:**
            - Active Members: ${stats.activeCount || 'Loading...'}
            - Today's Attendance: ${stats.attendanceToday || 0}
            - Expiring Soon: ${stats.expiringCount || 0}
            - Recent Top Classes: ${JSON.stringify(stats.topClasses || [])}
            
            **Instructions:**
            1. Analyze the balance between attendance and registration.
            2. Provide 2 concise sentences of insight or a suggestion for today's operations.
            3. Tone: Professional, Brief, Reliable. (Do NOT be overly poetic).
            4. Language: **${targetLang}**.
            5. Output Format (JSON ONLY):
            { "message": "Factual insight in ${targetLang}", "bgTheme": "sunny", "colorTone": "#FFFFFF" }
        `;
        return generateContent(prompt);
    }

    // 2. Member Logic with Smart Diligence
    // We explicitly inject diligence data here
    let diligenceContext = "";
    if (diligence) {
        diligenceContext = `
            - **Current Badge**: ${diligence.badge?.label || 'None'}
            - **Analysis**: ${diligence.message || 'No specific analysis'}
            - **Icon**: ${diligence.badge?.icon || 'None'}
            - **Consistency Status**: ${diligence.badge?.desc || 'Normal'}
        `;
    }

    const prompt = `
        You are the warm and energetic AI coach of 'Boksaem Yoga'.
        Create a **highly encouraging and emotional welcome message** for ${memberName}.
        
        **Member Stats:**
        - Total Attendance: ${attendanceCount}
        - Next Class: ${upcomingClass || "Self Practice"}
        ${diligenceContext}
        
        **Instructions:**
        1. **ACKNOWLEDGE THEIR EFFORT**: If they have a badge (like '열정 요기', '성실 요기'), explicitly mention it or the spirit of it!
        2. **CONTEXTUALIZE**: Use the 'Analysis' provided above to interpret their recent attendance pattern.
        3. **Tone**: Warm, Energetic, Emotional. Make them feel seen and valued.
        4. **Language**: **${targetLang}**. 
        5. IMPORTANT: Your output MUST be in **${targetLang}**.
        6. **Banned**: "Namaste". End with "Fighting!" or a similarly energetic/warm closing suitable for the culture.
        7. Length: 2-3 sentences. Do not just repeat the stats, weave them into a story.

        Output Format (JSON ONLY):
        { "message": "Passionate message in ${targetLang}", "bgTheme": "hatha", "colorTone": "#FDFCF0" }
    `;

    return generateContent(prompt);
};

async function generateContent(prompt) {
    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error("Invalid structure");
    } catch (error) {
        console.error("[AI Service] Generation Failed:", error);
        return null; // The caller (storage.js) handles fallbacks
    }
}
