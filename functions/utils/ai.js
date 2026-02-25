const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const json5 = require("json5"); // ✅ Robust JSON Parser

class AIService {
    constructor(apiKey) {
        // Ensure we prioritize process.env.GEMINI_KEY which is loaded from .env in V2 functions
        const key = apiKey || process.env.GEMINI_KEY;
        if (!key) throw new Error("API Key is missing for AIService (Check .env or config)");
        this.client = new GoogleGenerativeAI(key);
        
        // Using "gemini-2.5-flash" for extremely low latency chat generation
        this.model = this.client.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { maxOutputTokens: 500 }
        });
        
        // Base config for JSON model
        // ✅ FIX: maxOutputTokens 증가 (한글은 영문 대비 ~2x 토큰 소비)
        this.jsonConfig = { 
            responseMimeType: "application/json", 
            maxOutputTokens: 2500,
            temperature: 0.85,
            topP: 0.95,
            topK: 40
        };

        this.jsonModel = this.client.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: this.jsonConfig
        });
        this.langMap = { 'ko': 'Korean', 'en': 'English', 'ru': 'Russian', 'zh': 'Chinese (Simplified)', 'ja': 'Japanese' };
    }

    getLangName(langCode) {
        return this.langMap[langCode] || 'Korean';
    }

    /**
     * ✅ 잘린 JSON 문자열 복구
     * 한글이 잘리면 multi-byte 깨짐 발생 → 정리 후 닫는 괄호 추가
     */
    _repairTruncatedJson(text) {
        if (!text) return null;
        
        let cleaned = text.trim();
        
        // 1. 인코딩 깨진 문자 제거 (EUC-KR 같은 깨진 바이트)
        cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // eslint-disable-line no-control-regex
        
        // 2. 불완전한 유니코드 이스케이프 제거
        cleaned = cleaned.replace(/\\u[0-9a-fA-F]{0,3}$/g, '');
        
        // 3. 잘린 문자열 끝 정리: 불완전한 문자열 값을 닫아줌
        //    예: "message": "안녕하  → "message": "안녕하"
        //    마지막으로 열린 따옴표가 닫히지 않았으면 닫아줌
        const quoteCount = (cleaned.match(/(?<!\\)"/g) || []).length;
        if (quoteCount % 2 !== 0) {
            // 홀수 따옴표 = 열린 문자열이 잘림
            cleaned += '"';
        }
        
        // 4. 잘린 값 끝의 불완전한 토큰 정리
        //    예: "key": "value", "next":  → 마지막 불완전 키-값 제거
        cleaned = cleaned.replace(/,\s*"[^"]*"\s*:\s*$/m, '');
        cleaned = cleaned.replace(/,\s*$/m, '');
        
        // 5. 같은 수의 열린/닫힌 괄호가 되도록 수정
        const openBraces = (cleaned.match(/{/g) || []).length;
        const closeBraces = (cleaned.match(/}/g) || []).length;
        const openBrackets = (cleaned.match(/\[/g) || []).length;
        const closeBrackets = (cleaned.match(/]/g) || []).length;
        
        // 닫히지 않은 배열 먼저 닫기
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
            cleaned += ']';
        }
        // 닫히지 않은 객체 닫기
        for (let i = 0; i < openBraces - closeBraces; i++) {
            cleaned += '}';
        }
        
        return cleaned;
    }
    
    /**
     * ✅ 강화된 Regex Fallback - 모든 응답 타입 대응
     * message, options, feedbackPoints, isFinalAnalysis 등 추출
     */
    _regexFallback(text) {
        if (!text) return null;
        
        const result = {};
        
        // 문자열 필드 추출 (안전한 방식)
        const extractString = (fieldName) => {
            // "key": "value" 패턴 - 한글 및 특수문자 지원
            const patterns = [
                new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's'),
                new RegExp(`"${fieldName}"\\s*:\\s*'((?:[^'\\\\]|\\\\.)*)'`, 's'),
            ];
            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) return match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
            }
            return null;
        };
        
        // 배열 필드 추출 (문자열 배열)
        const extractStringArray = (fieldName) => {
            // "key": [...] 패턴
            const arrayRegex = new RegExp(`"${fieldName}"\\s*:\\s*\\[((?:[^\\[\\]]|\\[(?:[^\\[\\]]*)])*)]`, 's');
            const match = text.match(arrayRegex);
            if (!match) return null;
            
            const items = [];
            const itemRegex = /"((?:[^"\\]|\\.)*)"/g;
            let itemMatch;
            while ((itemMatch = itemRegex.exec(match[1])) !== null) {
                items.push(itemMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'));
            }
            return items.length > 0 ? items : null;
        };
        
        // 불리언 필드 추출
        const extractBoolean = (fieldName) => {
            const match = text.match(new RegExp(`"${fieldName}"\\s*:\\s*(true|false)`, 'i'));
            return match ? match[1].toLowerCase() === 'true' : null;
        };
        
        // 1. message (가장 중요)
        const message = extractString('message');
        if (message) result.message = message;
        
        // 2. question (일부 응답 타입에서 사용)
        const question = extractString('question');
        if (question) result.question = question;
        
        // 3. options (채팅 선택지)
        const options = extractStringArray('options');
        if (options) result.options = options;
        
        // 4. feedbackPoints (피드백 배열)
        const feedbackPoints = extractStringArray('feedbackPoints');
        if (feedbackPoints) result.feedbackPoints = feedbackPoints;
        
        // 5. isFinalAnalysis
        const isFinal = extractBoolean('isFinalAnalysis');
        if (isFinal !== null) result.isFinalAnalysis = isFinal;
        
        // 6. analysisSummary
        const summary = extractString('analysisSummary');
        if (summary) result.analysisSummary = summary;
        
        // 7. mappedDiagnosis
        const diagnosis = extractString('mappedDiagnosis');
        if (diagnosis) result.mappedDiagnosis = diagnosis;
        
        // 8. prescriptionReason
        const reason = extractString('prescriptionReason');
        if (reason) result.prescriptionReason = reason;
        
        // 9. categories & intentions (options_refresh)
        const categories = extractStringArray('categories');
        if (categories) result.categories = categories;
        const intentions = extractStringArray('intentions');
        if (intentions) result.intentions = intentions;
        
        // 최소 message 또는 feedbackPoints가 있어야 유효
        if (result.message || result.feedbackPoints || result.question || result.prescriptionReason) {
            result.fallbackUsed = true;
            console.log("✅ Enhanced Regex Fallback successful! Extracted fields:", Object.keys(result).join(', '));
            return result;
        }
        
        return null;
    }

    async generateExperience(prompt, responseSchema = null) {
        // Retry up to 3 times
        let currentMaxTokens = this.jsonConfig.maxOutputTokens;
        
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                console.log(`Experience Gen attempt ${attempt + 1} - Calling Gemini API... (maxTokens: ${currentMaxTokens})`);
                
                // Prepare config with optional schema + dynamic token limit
                const config = { 
                    ...this.jsonConfig,
                    maxOutputTokens: currentMaxTokens
                };
                if (responseSchema) {
                    config.responseSchema = responseSchema;
                }

                // 🛠️ REPAIR STRATEGY: Explicitly ask for JSON fix on retries
                let finalPrompt = prompt;
                if (attempt > 0) {
                    finalPrompt += "\n\nIMPORTANT: The previous attempt failed to parse. Please output ONLY valid JSON. No markdown, no preambles. Keep Korean text SHORT to avoid truncation.";
                }

                const startTime = Date.now();
                const result = await this.jsonModel.generateContent({
                    contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
                    generationConfig: config
                });

                const latency = Date.now() - startTime;
                
                // ✅ FIX 1: finishReason 체크 (토큰 부족으로 잘림 감지)
                const candidate = result.response.candidates?.[0];
                const finishReason = candidate?.finishReason;
                
                let text = result.response.text();
                console.log(`Experience Gen attempt ${attempt + 1} - Raw Response (${latency}ms, finishReason: ${finishReason}):`, text?.substring(0, 300));
                
                if (!text) throw new Error("Empty response from AI");

                // ✅ FIX 2: MAX_TOKENS로 잘린 경우 → 토큰 늘려서 재시도
                if (finishReason === 'MAX_TOKENS') {
                    console.warn(`⚠️ Response truncated (MAX_TOKENS)! Increasing limit from ${currentMaxTokens} to ${currentMaxTokens + 1000}`);
                    currentMaxTokens += 1000;
                    
                    // 잘린 응답이라도 복구 시도
                    const repaired = this._repairTruncatedJson(text);
                    if (repaired) {
                        try {
                            const parsed = JSON.parse(repaired);
                            if (parsed && typeof parsed === 'object') {
                                console.log(`✅ Truncated JSON repaired successfully!`);
                                parsed._repaired = true;
                                return parsed;
                            }
                        } catch (repairErr) {
                            console.warn('Truncated JSON repair failed, will retry with more tokens:', repairErr.message);
                        }
                        
                        // JSON 복구 실패해도 Regex로 추출 시도
                        const regexResult = this._regexFallback(text);
                        if (regexResult) return regexResult;
                    }
                    
                    // 마지막 시도가 아니면 계속 재시도
                    if (attempt < 2) continue;
                }

                // 1. Sanitize: Remove Markdown code blocks and potential noise
                let cleanText = text.replace(/```json\s?|```/g, '').trim();
                
                // 2. Extract JSON Object: Find the first '{' and the last '}'
                const firstBrace = cleanText.indexOf('{');
                const lastBrace = cleanText.lastIndexOf('}');
                
                if (firstBrace !== -1 && lastBrace !== -1) {
                    cleanText = cleanText.substring(firstBrace, lastBrace + 1);
                }

                // 3. PARSING STRATEGY: Standard -> JSON5 -> Repair -> Regex
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
                    
                    // 3.3 ✅ NEW: Truncated JSON Repair (잘린 JSON 자동 복구)
                    try {
                        const repaired = this._repairTruncatedJson(cleanText);
                        if (repaired) {
                            const parsedRepaired = JSON.parse(repaired);
                            if (parsedRepaired && typeof parsedRepaired === 'object') {
                                console.log(`Experience Gen attempt ${attempt + 1} - Success parsing (Repaired JSON!)`);
                                parsedRepaired._repaired = true;
                                return parsedRepaired;
                            }
                        }
                    } catch (repairErr) {
                        console.warn(`Experience Gen attempt ${attempt + 1} - Repair failure:`, repairErr.message);
                    }
                }
                
                console.warn(`Experience Gen attempt ${attempt + 1} - All parsers failed`);

                // 3.4 ✅ ENHANCED REGEX FALLBACK (모든 시도에서 실행)
                const regexResult = this._regexFallback(text);
                if (regexResult) return regexResult;

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
