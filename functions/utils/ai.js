const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

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

    // ... (keep existing methods) ...

    async generateExperience(prompt, responseSchema = null) {
        // Retry up to 3 times
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                console.log(`Experience Gen attempt ${attempt + 1} - Calling Gemini API...`);
                
                // Prepare config with optional schema
                const config = { ...this.jsonConfig };
                if (responseSchema) {
                    config.responseSchema = responseSchema;
                    // console.log("Using Structured Output Schema");
                }

                const startTime = Date.now();
                const result = await this.jsonModel.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: config
                });

                const latency = Date.now() - startTime;
                let text = result.response.text();
                console.log(`Experience Gen attempt ${attempt + 1} - Raw Response (${latency}ms):`, text);
                
                // 🛠️ ROBUST JSON EXTRACTION
                if (!text) throw new Error("Empty response from AI");

                // 1. Sanitize: Remove Markdown code blocks and potential noise
                let cleanText = text.replace(/```json\s?|```/g, '').trim();
                
                // 2. Extract JSON Object: Find the first '{' and the last '}'
                const firstBrace = cleanText.indexOf('{');
                const lastBrace = cleanText.lastIndexOf('}');
                
                if (firstBrace !== -1 && lastBrace !== -1) {
                    const jsonCandidate = cleanText.substring(firstBrace, lastBrace + 1);
                    try {
                        // Attempt standard parse
                        const parsed = JSON.parse(jsonCandidate);
                        if (parsed && typeof parsed === 'object') {
                            console.log(`Experience Gen attempt ${attempt + 1} - Success parsing JSON`);
                            return parsed;
                        }
                    } catch (parseError) {
                         console.warn(`Experience Gen attempt ${attempt + 1} - Standard JSON parse failed:`, parseError.message);
                         
                         // 2.1 Attempt to fix common trailing comma issue (e.g., "[...],]")
                         try {
                             const fixedJson = jsonCandidate.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
                             const parsedFixed = JSON.parse(fixedJson);
                             if (parsedFixed && typeof parsedFixed === 'object') {
                                 console.log(`Experience Gen attempt ${attempt + 1} - Success parsing Fixed JSON`);
                                 return parsedFixed;
                             }
                         } catch (fixError) {
                             console.warn(`Experience Gen attempt ${attempt + 1} - Fixed JSON parse failed:`, fixError.message);
                         }
                    }
                }
                
                console.warn(`Experience Gen attempt ${attempt + 1} - No valid JSON structure found`);

                // 🚨 REGEX FALLBACK (Aggressive)
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
                        
                        // Try to extract other fields if possible
                        const isFinalAnalysis = /"isFinalAnalysis"\s*:\s*true/.test(text);
                        const analysisSummary = extractField("analysisSummary");
                        const mappedDiagnosis = extractField("mappedDiagnosis");
                        
                        return {
                            message: message,
                            options: [], // Default empty options if list parsing fails
                            isFinalAnalysis: isFinalAnalysis,
                            analysisSummary: analysisSummary || null,
                            mappedDiagnosis: mappedDiagnosis || null,
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
