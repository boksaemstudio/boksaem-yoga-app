const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const json5 = require("json5"); // ✅ Robust JSON Parser

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
        
        // Base config for JSON model
        this.jsonConfig = { 
            responseMimeType: "application/json", 
            maxOutputTokens: 1500,
            temperature: 0.85,
            topP: 0.95,
            topK: 40
        };

        this.jsonModel = this.client.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: this.jsonConfig
        });
        this.langMap = { 'ko': 'Korean', 'en': 'English', 'ru': 'Russian', 'zh': 'Chinese (Simplified)', 'ja': 'Japanese' };
    }

    async generateExperience(prompt, responseSchema = null) {
        // Retry up to 3 times
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                console.log(`Experience Gen attempt ${attempt + 1} - Calling Gemini API...`);
                
                // Prepare config with optional schema
                const config = { ...this.jsonConfig };
                if (responseSchema) {
                    config.responseSchema = responseSchema;
                }

                // 🛠️ REPAIR STRATEGY: Explicitly ask for JSON fix on retries
                let finalPrompt = prompt;
                if (attempt > 0) {
                    finalPrompt += "\n\nIMPORTANT: The previous attempt failed to parse. Please output ONLY valid JSON. No markdown, no preambles.";
                }

                const startTime = Date.now();
                const result = await this.jsonModel.generateContent({
                    contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
                    generationConfig: config
                });

                const latency = Date.now() - startTime;
                let text = result.response.text();
                console.log(`Experience Gen attempt ${attempt + 1} - Raw Response (${latency}ms):`, text);
                
                if (!text) throw new Error("Empty response from AI");

                // 1. Sanitize: Remove Markdown code blocks and potential noise
                let cleanText = text.replace(/```json\s?|```/g, '').trim();
                
                // 2. Extract JSON Object: Find the first '{' and the last '}'
                const firstBrace = cleanText.indexOf('{');
                const lastBrace = cleanText.lastIndexOf('}');
                
                if (firstBrace !== -1 && lastBrace !== -1) {
                    cleanText = cleanText.substring(firstBrace, lastBrace + 1);
                }

                // 3. PARSING STRATEGY: Standard -> JSON5 -> Fixes
                try {
                    // 3.1 Try Standard Native Parse (Fastest)
                    const parsed = JSON.parse(cleanText);
                    if (parsed && typeof parsed === 'object') {
                        console.log(`Experience Gen attempt ${attempt + 1} - Success parsing (Standard JSON)`);
                        return parsed;
                    }
                } catch (stdErr) {
                    console.warn(`Experience Gen attempt ${attempt + 1} - Standard JSON failure:`, stdErr.message);
                    
                    try {
                        // 3.2 Try JSON5 (Robust: handles trailing commas, unquoted keys, comments)
                        const parsed5 = json5.parse(cleanText);
                        if (parsed5 && typeof parsed5 === 'object') {
                            console.log(`Experience Gen attempt ${attempt + 1} - Success parsing (JSON5 - FIXED!)`);
                            return parsed5;
                        }
                    } catch (json5Err) {
                        console.warn(`Experience Gen attempt ${attempt + 1} - JSON5 failure:`, json5Err.message);
                    }
                }
                
                console.warn(`Experience Gen attempt ${attempt + 1} - parsing failed completely`);

                // 🚨 REGEX FALLBACK (Last Resort)
                // If standard parsing fails, try to extract key fields using Regex
                if (attempt >= 1 && text) {
                    console.log("🚨 Attempting Aggressive Regex Fallback...");
                    
                    const extractField = (fieldName) => {
                        // Match "key": "value" (handling escaped quotes)
                        const match = text.match(new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
                        return match ? match[1] : null;
                    };

                    const message = extractField("message");
                    
                    if (message) {
                        console.log("✅ Regex Fallback successful for 'message'!");
                        
                        return {
                            message: message,
                            options: [], 
                            isFinalAnalysis: /"isFinalAnalysis"\s*:\s*true/.test(text),
                            analysisSummary: extractField("analysisSummary") || null,
                            mappedDiagnosis: extractField("mappedDiagnosis") || null,
                            fallbackUsed: true
                        };
                    }
                }

            } catch (e) {
                console.error(`Experience Gen attempt ${attempt + 1} failed:`, e.message);
                // Wait briefly before retry (exponential backoff)
                await new Promise(res => setTimeout(res, 500 * Math.pow(2, attempt)));
            }
        }
        
        console.error("Experience Gen: All attempts failed, returning null");
        return null;
    }

    // Helper to get Gemini Client if needed directly
    getClient() { return this.client; }
}

module.exports = AIService;
