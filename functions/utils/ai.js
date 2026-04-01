const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const json5 = require("json5"); // ✅ Robust JSON Parser

class AIService {
    constructor(apiKey) {
        // Ensure we prioritize process.env.GEMINI_KEY which is loaded from .env in V2 functions
        const key = apiKey || process.env.GEMINI_KEY;
        if (!key) throw new Error("API Key is missing for AIService (Check .env or config)");
        this.client = new GoogleGenerativeAI(key);
        
        // gemini-2.5-flash — 현재 SDK 지원 최신 모델
        this.model = this.client.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { maxOutputTokens: 500 }
        });
        
        // Base config for JSON model (Default fallback)
        this.jsonConfig = { 
            responseMimeType: "application/json", 
            maxOutputTokens: 8192, // ✅ [EXPANDED] User requested PhD level capacity
            temperature: 0.85,
            topP: 0.95,
            topK: 40
        };

        this.jsonModel = this.client.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: this.jsonConfig
        });
        
        // [PREMIUM] Pro Model for Complex Parsing (gemini-2.5-pro — 최고 정확도)
        this.proParsingModel = this.client.getGenerativeModel({
            model: "gemini-2.5-pro",
            generationConfig: {
                responseMimeType: "application/json",
                maxOutputTokens: 8192,
                temperature: 0.2,
                topP: 0.8,
                topK: 10
            }
        });

        this.langMap = { 'ko': 'Korean', 'en': 'English', 'ru': 'Russian', 'zh': 'Chinese (Simplified)', 'ja': 'Japanese' };
    }

    getLangName(langCode) {
        return this.langMap[langCode] || 'Korean';
    }

    /**
     * ✅ Generic text generation (Simple wrapper for generateContent)
     */
    async generate(prompt) {
        try {
            const result = await this.model.generateContent(prompt);
            return result.response.text();
        } catch (e) {
            console.error("AI Generation failed:", e.message);
            return "";
        }
    }

    async translate(text, targetLangCode) {
        if (!text || targetLangCode === 'ko') return text;
        const targetLang = this.getLangName(targetLangCode);
        const prompt = `Translate the following text to ${targetLang}. Return ONLY the translation without any preamble, explanation, or markdown:\n\n${text}`;
        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text();
            return response ? response.trim() : text;
        } catch (e) {
            console.error(`Translation to ${targetLangCode} failed:`, e.message);
            return text; // fallback to original
        }
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
                
                // 2. Extract JSON: Support both Objects `{...}` AND Arrays `[...]`
                const firstBrace = cleanText.indexOf('{');
                const lastBrace = cleanText.lastIndexOf('}');
                const firstBracket = cleanText.indexOf('[');
                const lastBracket = cleanText.lastIndexOf(']');
                
                // Determine if the response is an array or object
                const isArray = firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace);
                
                if (isArray && lastBracket !== -1) {
                    cleanText = cleanText.substring(firstBracket, lastBracket + 1);
                } else if (firstBrace !== -1 && lastBrace !== -1) {
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

    async generateDailyYoga(language = 'ko') {
        const targetLang = this.getLangName(language);
        const prompt = `
            Recommend 2 simple home yoga poses for a 3-minute daily routine.
            The user wants DETAILED step-by-step instructions on how to perform the poses correctly, 
            including breathing tips and posture alignment. Do not just give a 1-sentence instruction; 
            explain the method in detail so a beginner can follow along perfectly within 3.
            
            Language: ${targetLang}
            Output MUST be ONLY a valid JSON array of objects with this EXACT format:
            [
                { 
                    "name": "Pose Name (e.g., Cat-Cow)", 
                    "emoji": "🧘", 
                    "benefit": "Core benefit of this pose", 
                    "instruction": "Detailed step-by-step instructions. E.g., 1. Start on your hands and knees. 2. Inhale and arch your back... 3. Exhale and round your spine... focus on your breath." 
                },
                ...
            ]
        `;
        const result = await this.generateExperience(prompt);
        return Array.isArray(result) ? result : (result?.poses || result);
    }

    // Helper to get Gemini Client if needed directly
    getClient() { return this.client; }

    /**
     * ✅ 비정형 문서(이미지, 엑셀 텍스트) 파싱 (Timetable, Pricing, Members)
     */
    async parseDocument(docType, base64Image, textData) {
        let prompt = "";
        let schema = null;

        if (docType === 'timetable') {
            prompt = `
                Extract the yoga/pilates class schedule from the provided image.
                Return ONLY a valid JSON object matching the exact schema. Ensure time is in HH:mm format. 
                If the instructor name is not visible, leave it empty.
                For 'day', use standard Korean days: '월', '화', '수', '목', '금', '토', '일'.
            `;
            schema = {
                type: SchemaType.OBJECT,
                properties: {
                    schedule: {
                        type: SchemaType.ARRAY,
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                day: { type: SchemaType.STRING, description: "Day of the week (e.g., '월')" },
                                time: { type: SchemaType.STRING, description: "Class time in HH:mm format (e.g., '19:30')" },
                                className: { type: SchemaType.STRING, description: "Name of the class (e.g., '아쉬탕가')" },
                                instructor: { type: SchemaType.STRING, description: "Instructor name if available" }
                            },
                            required: ["day", "time", "className"]
                        }
                    }
                },
                required: ["schedule"]
            };
        } else if (docType === 'pricing') {
            prompt = `
                Extract the membership pricing list from the provided image and organize it by CATEGORY.
                
                CRITICAL INSTRUCTIONS:
                1. Group pricing options into categories based on the image structure.
                   Common Korean yoga studio categories: '일반' (General), '심화' (Advanced/Intensive), 
                   '토요하타' (Saturday Hatha), '임산부' (Prenatal), 'TTC' (Teacher Training), etc.
                2. For each category, extract ALL pricing options with:
                   - 'id': A machine-friendly ID (e.g., 'month_8', 'month_12', '10_session', 'unlimited')
                   - 'label': Human-readable label (e.g., '월 8회', '10회권 (3개월)', '월 무제한')
                   - 'basePrice': The standard 1-month price (integer, no currency symbols)
                   - 'credits': Number of sessions. Use 9999 for unlimited (무제한)
                   - 'months': Duration in months (default 1 for monthly subscriptions, 3 for 10-session tickets)
                   - 'type': 'subscription' for monthly plans, 'ticket' for session-based plans
                3. If the image shows DISCOUNTED prices for 3-month or 6-month packages (e.g., "3개월 5%할인", "6개월 10%할인"):
                   - 'discount3': Total price for 3-month package (integer)
                   - 'discount6': Total price for 6-month package (integer)
                4. If a category applies only to specific branches, include 'branches' as an array of branch names.
                5. If a pricing option has a separate cash price (현금가), include 'cashPrice'.
                6. ALL price values must be integers (e.g., 176000, not "176,000원").
                
                CRITICAL: Output MUST BE perfectly valid JSON. No trailing commas, no unescaped quotes.
            `;
            schema = {
                type: SchemaType.OBJECT,
                properties: {
                    categories: {
                        type: SchemaType.ARRAY,
                        description: "Array of pricing categories extracted from the image",
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                categoryKey: { type: SchemaType.STRING, description: "Machine-friendly key (e.g., 'general', 'advanced', 'saturday_hatha', 'kids_flying')" },
                                label: { type: SchemaType.STRING, description: "Category display name (e.g., '일반', '심화')" },
                                options: {
                                    type: SchemaType.ARRAY,
                                    items: {
                                        type: SchemaType.OBJECT,
                                        properties: {
                                            id: { type: SchemaType.STRING, description: "Machine ID (e.g., 'month_8', 'unlimited')" },
                                            label: { type: SchemaType.STRING, description: "Display name (e.g., '월 8회')" },
                                            basePrice: { type: SchemaType.INTEGER, description: "Standard 1-month price in KRW" },
                                            credits: { type: SchemaType.INTEGER, description: "Session count. 9999 for unlimited" },
                                            months: { type: SchemaType.INTEGER, description: "Duration in months" },
                                            type: { type: SchemaType.STRING, description: "'subscription' or 'ticket'" },
                                            discount3: { type: SchemaType.INTEGER, description: "3-month package total price (optional)" },
                                            discount6: { type: SchemaType.INTEGER, description: "6-month package total price (optional)" },
                                            cashPrice: { type: SchemaType.INTEGER, description: "Cash payment price (optional)" }
                                        },
                                        required: ["id", "label", "basePrice", "credits", "months", "type"]
                                    }
                                }
                            },
                            required: ["categoryKey", "label", "options"]
                        }
                    }
                },
                required: ["categories"]
            };
        } else if (docType === 'members') {
            prompt = `
                Parse the following unstructured member list data (likely copied from Excel or CSV) into our exact JSON schema.
                
                CRITICAL INSTRUCTIONS:
                1. 'phone' should be formatted as XXX-XXXX-XXXX.
                2. 'credits': If the data says "무제한", "unlimited", or implies duration without count, set credits to 9999. Extract any explicit numbers as integer.
                3. 'endDate': MUST be a string in YYYY-MM-DD format. 
                   - Look closely for registration dates + duration (e.g., "3개월", "1년") to calculate the end date if an exact end date is not present.
                   - Assume the current year is ${new Date().getFullYear()} if missing.
                   - If impossible to infer, set to null.
                4. Extract any remaining details (like "현금결제", "학생할인") into the 'note' field.
                
                Data to parse:
                ${textData || 'No text data provided.'}
            `;
            schema = {
                type: SchemaType.OBJECT,
                properties: {
                    members: {
                        type: SchemaType.ARRAY,
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                name: { type: SchemaType.STRING, description: "Member name" },
                                phone: { type: SchemaType.STRING, description: "Phone number (XXX-XXXX-XXXX)" },
                                credits: { type: SchemaType.INTEGER, description: "Remaining credits. 9999 for unlimited." },
                                endDate: { type: SchemaType.STRING, description: "Expiration date (YYYY-MM-DD)" },
                                note: { type: SchemaType.STRING, description: "Any extra notes" }
                            },
                            required: ["name"]
                        }
                    }
                },
                required: ["members"]
            };
        } else {
            throw new Error(`Invalid docType: ${docType}`);
        }

        const contents = [];
        if (base64Image) {
            // Strip the data:image/...;base64, part if present
            const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
            const mimeType = base64Image.match(/^data:(image\/[a-zA-Z]*);base64,/)?.[1] || "image/jpeg";
            contents.push({
                role: "user",
                parts: [
                    { inlineData: { data: cleanBase64, mimeType } },
                    { text: prompt }
                ]
            });
        } else {
            contents.push({ role: "user", parts: [{ text: prompt }] });
        }

        try {
            console.log(`Parsing document [${docType}] with Gemini 2.5 Pro (High Accuracy Model)...`);
            const result = await this.proParsingModel.generateContent({
                contents,
                generationConfig: {
                    responseSchema: schema
                }
            });

            const text = result.response.text();
            let cleanText = text.replace(/```json\s?|```/g, '').trim();
            const firstBrace = cleanText.indexOf('{');
            const lastBrace = cleanText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) cleanText = cleanText.substring(firstBrace, lastBrace + 1);

            try {
                // Try to parse cleanly first
                return json5.parse(cleanText);
            } catch (initialError) {
                console.warn(`[AI] Initial JSON parse failed, attempting repair... Error: ${initialError.message}`);
                // Use the built-in repair tool
                const repairedText = this._repairTruncatedJson(cleanText);
                try {
                    return json5.parse(repairedText);
                } catch (repairError) {
                    throw new Error(`Invalid JSON format from AI even after repair: ${initialError.message}`);
                }
            }
        } catch (e) {
            console.error(`parseDocument [${docType}] failed:`, e.message);
            throw new Error(`AI Parsing failed: ${e.message}`);
        }
    }
}

module.exports = AIService;
