const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIService {
    constructor(apiKey) {
        // Ensure we prioritize process.env.GEMINI_KEY which is loaded from .env in V2 functions
        const key = apiKey || process.env.GEMINI_KEY;
        if (!key) throw new Error("API Key is missing for AIService (Check .env or config)");
        this.client = new GoogleGenerativeAI(key);
        
        // Using "gemini-3-flash-preview" as requested by USER (Latest & Greatest)
        this.model = this.client.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { maxOutputTokens: 500 }
        });
        this.jsonModel = this.client.getGenerativeModel({
            model: "gemini-3-flash-preview",
            // Increased token limit to prevent JSON truncation
            generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1500 }
        });
        this.langMap = { 'ko': 'Korean', 'en': 'English', 'ru': 'Russian', 'zh': 'Chinese (Simplified)', 'ja': 'Japanese' };
    }

    getLangName(code) {
        return this.langMap[code] || 'Korean';
    }

    async translate(text, targetLangCode) {
        if (targetLangCode === 'ko' || !text) return text;
        const targetLang = this.getLangName(targetLangCode);

        try {
            const prompt = `Translate the following text to ${targetLang}. Output ONLY the translated text.\n\nText: ${text}`;
            const result = await this.model.generateContent(prompt);
            return result.response.text().trim();
        } catch (e) {
            console.error(`Translation failed for ${targetLangCode}:`, e);
            return text;
        }
    }

    async translateNotices(notices, targetLangCode) {
        if (targetLangCode === 'ko' || !notices || notices.length === 0) return notices;
        const targetLang = this.getLangName(targetLangCode);

        try {
            const prompt = `
            Translate the following array of notices into ${targetLang}.
            Keep the original IDs and only translate 'title' and 'content'.
            Output ONLY the translated array in JSON format.
            
            Notices:
            ${JSON.stringify(notices.map(n => ({ id: n.id, title: n.title, content: n.content })))}
            `;

            const result = await this.jsonModel.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\[[\s\S]*\]/);

            if (jsonMatch) {
                const translatedArray = JSON.parse(jsonMatch[0]);
                return notices.map(original => {
                    const trans = translatedArray.find(t => t.id === original.id);
                    return trans ? { ...original, title: trans.title, content: trans.content, isTranslated: true } : original;
                });
            }
            return notices;
        } catch (e) {
            console.error("Notice translation failed:", e);
            return notices;
        }
    }

    async generateHomeYoga(weather, timeOfDay, langCode) {
        const targetLang = this.getLangName(langCode);
        const prompt = `
            Recommend 2 simple yoga poses for a member at home.
            Context: Weather is ${weather || 'Neutral'}, Time is ${timeOfDay || 12}:00.
            
            **Philosophy**: Focus on the **sensation** of the joints and muscles, not the look of the pose. Connect with the breath.

            Instructions:
            1. Poses should be beginner-friendly.
            2. Instruction should mention specific body parts (e.g., "Feel the spine lengthening", "Listen to your breath").
            3. Output STRICTLY valid JSON, no markdown, no code blocks.
            4. Language: **${targetLang}**.

            Output Format (exactly this structure):
            [
              { "name": "Pose Name", "benefit": "Short benefit", "instruction": "1-sentence instruction on sensation/breath", "emoji": "🧘" },
              { "name": "Pose Name 2", "benefit": "Short benefit", "instruction": "1-sentence instruction", "emoji": "🧘" }
            ]
        `;

        // Retry up to 2 times
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const result = await this.jsonModel.generateContent(prompt);
                const text = result.response.text();
                // Try to extract JSON array
                const jsonMatch = text.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
                        return parsed;
                    }
                }
            } catch (e) {
                console.warn(`Home Yoga Gen attempt ${attempt + 1} failed:`, e.message);
            }
        }
        
        // Return fallback data instead of null
        console.warn("Home Yoga Gen: Returning fallback poses");
        return langCode === 'ko' ? [
            { name: "고양이-소 자세", benefit: "척추 유연성", instruction: "호흡에 맞춰 척추를 부드럽게 움직여보세요", emoji: "🐱" },
            { name: "아이 자세", benefit: "휴식과 이완", instruction: "이마를 매트에 대고 깊게 호흡하세요", emoji: "🧒" }
        ] : [
            { name: "Cat-Cow Pose", benefit: "Spine flexibility", instruction: "Move your spine gently with your breath", emoji: "🐱" },
            { name: "Child's Pose", benefit: "Rest and relaxation", instruction: "Rest your forehead on the mat and breathe deeply", emoji: "🧒" }
        ];
    }

    async generateReEngagement(member, stats, langCode) {
        const targetLang = this.getLangName(langCode);
        const prompt = `
            You are the friendly and wise AI director of '복샘요가'.
            The member's membership involves expiration or low credits. Write a short, warm encouragement message to bring them back.
            
            **Philosophy**: "It is time to meet yourself again. Focus on your breath and body."

            Context: Name: ${member.name}, Summary: ${stats || "No recent records"}
            Instructions:
            1. Write very briefly (1-2 sentences) for a Push Notification.
            2. Focus on the value of **time for oneself** and **inner silence**, not just 'exercising'.
            3. Language: **${targetLang}**.
            Output ONLY the message text.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            return result.response.text().trim();
        } catch (e) {
            return null;
        }
    }

    async generateExperience(prompt) {
        // Retry up to 2 times
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                console.log(`Experience Gen attempt ${attempt + 1} - Calling Gemini API...`);
                const result = await this.jsonModel.generateContent(prompt);
                let text = result.response.text();
                console.log(`Experience Gen attempt ${attempt + 1} - Raw response length:`, text?.length);
                
                // 🛠️ ROBUST JSON EXTRACTION (Handles Markdown code blocks and extra text)
                // 1. Remove markdown code blocks if present
                text = text.replace(/```json\s?|```/g, '').trim();
                
                // 2. Find the first '{' and the last '}'
                const firstBrace = text.indexOf('{');
                const lastBrace = text.lastIndexOf('}');
                
                if (firstBrace !== -1 && lastBrace !== -1) {
                    const jsonContent = text.substring(firstBrace, lastBrace + 1);
                    try {
                        const parsed = JSON.parse(jsonContent);
                        if (parsed && typeof parsed === 'object') {
                            console.log(`Experience Gen attempt ${attempt + 1} - Success parsing JSON`);
                            return parsed;
                        }
                    } catch (parseError) {
                        console.warn(`Experience Gen attempt ${attempt + 1} - JSON.parse failed on extracted content:`, parseError.message);
                    }
                }
                console.warn(`Experience Gen attempt ${attempt + 1} - No valid JSON structure found`);
            } catch (e) {
                console.error(`Experience Gen attempt ${attempt + 1} failed:`, e.message);
            }
        }
        
        console.error("Experience Gen: All attempts failed, returning null");
        return null;
    }

    // Helper to get Gemini Client if needed directly
    getClient() { return this.client; }
}

module.exports = AIService;
