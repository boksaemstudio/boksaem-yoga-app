const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIService {
    constructor(apiKey) {
        if (!apiKey) throw new Error("API Key is missing for AIService");
        this.client = new GoogleGenerativeAI(apiKey);
        this.model = this.client.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { maxOutputTokens: 300 }
        });
        this.jsonModel = this.client.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json", maxOutputTokens: 500 }
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
            3. Output strictly in JSON format.
            4. Language: **${targetLang}**.

            Output Format:
            [
              { "name": "Pose Name", "benefit": "Short benefit", "instruction": "1-sentence instruction on sensation/breath", "emoji": "🧘" },
              ... (2 items)
            ]
        `;

        try {
            const result = await this.jsonModel.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
            throw new Error("Invalid structure");
        } catch (e) {
            console.error("Home Yoga Gen Failed:", e);
            return null; // Fallback handled in index.js
        }
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
        try {
            const result = await this.jsonModel.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
            throw new Error("Invalid format");
        } catch (e) {
            console.error("Experience Gen Failed:", e);
            throw e;
        }
    }

    // Helper to get Gemini Client if needed directly
    getClient() { return this.client; }
}

module.exports = AIService;
