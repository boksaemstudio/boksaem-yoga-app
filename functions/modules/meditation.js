/**
 * Meditation Module
 * 명상 AI 관련 Cloud Functions
 * 
 * @module modules/meditation
 * [Refactor] Extracted from index.js
 */

const { onCall } = require("firebase-functions/v2/https");
const { admin, getAI, checkAIQuota, logAIError } = require("../helpers/common");

/**
 * 내부 오디오 생성 헬퍼
 */
const generateInternalAudio = async (text, type = 'default') => {
    if (!text) return null;
    
    try {
        const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
        const client = new TextToSpeechClient();

        const voiceConfigs = {
            // 채팅용: Neural2-B (사용자 요청)
            chat: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-B', ssmlGender: 'FEMALE' },
            // 명상용: Chirp3-HD-Aoede (사용자 요청)
            meditation: { languageCode: 'ko-KR', name: 'ko-KR-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' },
            // 기본값
            default: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-B', ssmlGender: 'FEMALE' }
        };

        const voice = voiceConfigs[type] || voiceConfigs.chat; // Default to chat (Neural2)

        const [response] = await client.synthesizeSpeech({
            input: { text },
            voice,
            audioConfig: { audioEncoding: 'MP3', speakingRate: type === 'meditation' ? 0.9 : 1.0 }
        });

        return response.audioContent?.toString('base64') || null;
    } catch (error) {
        console.error('[Audio] Generation failed:', error);
        return null; // Return null on failure instead of crashing
    }
};

/**
 * 명상 AI 가이드 생성
 */
exports.generateMeditationGuidance = onCall({
    region: "asia-northeast3",
    cors: true,
    minInstances: 1, // ✅ Cold Start 방지
    maxInstances: 10 // ✅ Concurrency Limit Increased (User Request)
}, async (request) => {
    console.log("🧘 Meditation Guidance Request:", JSON.stringify(request.data));
    await checkAIQuota();

    const { 
        type, // 'question' | 'prescription' | 'session_message'
        memberName, // ✅ User name for personalization
        timeContext,
        weather,
        mode,
        interactionType,
        messageIndex
    } = request.data;

    try {
        const ai = getAI();
        let prompt = "";
        let result = null;

        // TYPE 1: DIAGNOSTIC QUESTION
        if (type === 'question') {
            const { chatHistory = [] } = request.data;
            const turnCount = chatHistory.length;
            const isClosing = turnCount >= 12; // ✅ 대화 지속 허용 (10 → 12)
            const MUST_FINISH = turnCount >= 20; // ✅ 더 길게 대화 (15 → 20)

            // ✅ OPTIMIZATION: Limit context to last 6 turns to reduce input tokens & latency
            const recentHistory = chatHistory.slice(-6);

            const historyText = recentHistory.length > 0 
                ? recentHistory.map(m => `${m.role === 'user' ? 'Client' : 'AI'}: ${m.content}`).join('\n')
                : 'No previous conversation.';

            // ✅ 사용자 대화 지속 의도 탐지 (Use last message from full history or recent)
            const lastUserMsg = chatHistory.filter(m => m.role === 'user').pop()?.content || '';
            const wantsContinue = /(더 |좊더|들어줘|이야기|계속|말해줘|듣고 싶|휴식|쉬고)/i.test(lastUserMsg);

            prompt = `
Role: Mindfulness Companion (Korean, 해요체). 
Goal: Help user notice "Here & Now" sensations (Body, Breath, Feeling) with Radical Acceptance.
USER: ${memberName || '회원'}

## STRICT RULES:
- **Zero Judgment / Zero Advice**: Do NOT try to "fix" the user or offer positive framing. Just accept their state.
- **Here & Now Focus**: Gently guide attention to current bodily sensations or breath.
- **Name Usage**: Use "${memberName || '회원'}님" VERY sparingly (max once per 5 turns). Natural conversation is priority.
- **Concise**: Keep responses to 1-2 short sentences (under 80 Korean characters).

## CONVERSATION FLOW:
- If user wants to talk: Listen empathetically for 4-6 more turns.
- If conversation gets deep/long: Naturally suggest a very short (10sec) breath or body sensing moment in the chat.
- **Closing**: When wrapping up, suggest a full meditation session naturally.

## CONVERSATION MODE:
${wantsContinue ? '- User wants MORE conversation. DO NOT end. Continue empathetically.' : ''}
${isClosing && !wantsContinue ? '- Gently guide toward meditation options.' : ''}
${MUST_FINISH ? '- SET isFinalAnalysis: true. Force wrap up.' : ''}

CONVERSATION HISTORY:
${historyText}

JSON Output:
{
    "message": "Response (Korean, polite, under 80 chars, Acceptance-based)",
    "isFinalAnalysis": boolean,
    "analysisSummary": "If final, summary of user state",
    "mappedDiagnosis": "stress/stiff/anxious/tired/overthink/low_energy/calm/mixed/overwhelmed",
    "options": ["그냥 있을게요", "몸이 무거워요", "호흡할래요"]
}
            `;
            
            try {
                result = await ai.generateExperience(prompt);
            } catch (e) {
                console.warn("AI generation failed, using fallback:", e);
                throw e; // Let the main catch block handle it with context-aware fallback
            }

            // ✅ Normalize Result (Robustness)
            if (result) {
                // 1. Message Safety
                if (!result.message || typeof result.message !== 'string') {
                    result.message = "잠시 생각이 깊어졌네요. 계속 이야기 나눠볼까요?"; // Generic continuity
                }
                
                // 2. Options Safety (Max 3, Default if empty)
                if (!result.options || !Array.isArray(result.options) || result.options.length === 0) {
                     result.options = ["네, 좋아요", "듣고 싶어요", "잠시만요"];
                }
                result.options = result.options.slice(0, 3);

                // 3. Boolean Enforcement
                result.isFinalAnalysis = Boolean(result.isFinalAnalysis);
            }
        }

        // TYPE 2: PRESCRIPTION REASON
        else if (type === 'prescription') {
            const diagId = request.data.diagnosis || request.data.mappedDiagnosis || "stress";
            const analysis = request.data.analysisSummary || "";
            const weatherLabels = { sun: '맑음', cloud: '흐림', rain: '비', snow: '눈' };

            prompt = `
Role: Mindfulness Companion (Korean, 해요체). Target: Content for ${diagId}.
Goal: Support the user's state with Radical Acceptance. NO advice, NO fixing.
USER: ${memberName || '회원'}
Context: ${analysis}

## STRICT RULES:
- **Zero Judgment / Zero Advice**: Do NOT try to solve user's problems. Just acknowledge and support the current state.
- **Here & Now Focus**: Briefly mention the value of noticing the present sensation.
- **Name Usage**: Address user as "${memberName || '회원'}님" once, naturally.
- Be unique and empathetic - NO repetitive phrases

JSON Output:
{
    "message": "Prescription intro (Korean, polite, max 50 chars, Acceptance-based)",
    "prescriptionReason": "Brief reason in 2 sentences about why this helps notice sensations",
    "brainwaveNote": "Benefit note in 1 sentence focusing on inner silence"
}
            `;
            
            result = await ai.generateExperience(prompt);
        }

        // TYPE 3: SESSION MESSAGE
        else if (type === 'session_message') {
            const interactionContext = {
                v1: 'voice-guided', v2: 'breath-reactive', v3: 'posture-coaching'
            };
            
            let currentPhase = 'deepening';
            if (messageIndex <= 1) currentPhase = 'intro_and_relax';
            else if (messageIndex >= 8) currentPhase = 'closing_and_waking';
            
            prompt = `
Role: Mindfulness Companion. Context: ${interactionContext[interactionType]}. Phase: ${currentPhase}.
Goal: Gently guide the user to notice bodily sensations or breath without judgment.
USER: ${memberName || '회원'}

## RULES:
- Generate ONE short guidance in Korean (해요체, 1 sentence, under 40 chars)
- **Zero Judgment**: Use neutral, descriptive language about sensations.
- **Do NOT use "${memberName || '회원'}님" unless absolutely necessary for deep connection.**
- Be unique - NO repetitive phrases

JSON Output:
{
    "message": "Short mindfulness guidance (Radical Acceptance focus)"
}
            `;
            
            result = await ai.generateExperience(prompt);
        }

        if (!result) {
            throw new Error("AI returned null");
        }

        // Generate audio
        let audioContent = null;
        if (result.message) {
            try {
                // Determine voice type based on context
                let voiceType = 'chat';
                if (type === 'session_message' || type === 'prescription') {
                    voiceType = 'meditation';
                }
                
                audioContent = await generateInternalAudio(result.message, voiceType);
            } catch (audioErr) {
                console.error("Audio generation failed:", audioErr);
            }
        }

        const finalResponse = {
            ...result,
            audioContent: audioContent
        };

        // Log usage
        try {
            await admin.firestore().collection('meditation_ai_logs').add({
                type,
                timeContext: timeContext || 'unknown',
                weather: weather || 'unknown',
                mode: mode || 'unknown',
                interactionType: interactionType || 'v1',
                messageIndex: messageIndex || 0,
                success: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (logError) {
            console.error("Failed to log meditation usage:", logError);
        }

        console.log("🧘 Meditation AI Result Ready");
        return finalResponse;

    } catch (error) {
        console.error("Meditation AI Generation Failed:", error);
        await logAIError('MeditationAI', error);

        // Fallback responses
        const fallbacks = {
            question: {
                message: (request.data.chatHistory && request.data.chatHistory.length > 0) 
                    ? "잠시 연결이 고르지 않네요. 지금 하신 말씀에 대해 조금 더 들려주실 수 있나요?" 
                    : "오늘 하루 마음이 어떠셨나요?",
                isFinalAnalysis: false,
                options: (request.data.chatHistory && request.data.chatHistory.length > 0)
                    ? ["네, 계속 이야기할게요", "잠시 쉬고 싶어요"]
                    : ["편안해요", "그저 그래요", "지쳤어요"]
            },
            prescription: {
                prescriptionReason: "오늘의 명상으로 마음을 편안하게 해드릴게요.",
                brainwaveNote: "알파파 활성화로 이완 효과"
            },
            session_message: {
                message: "편안하게 호흡하세요."
            }
        };

        const fb = fallbacks[type] || fallbacks.question;
        let audioContent = null;
        
        try {
            if (fb.message) {
                let fbVoiceType = 'chat';
                if (type === 'session_message' || type === 'prescription') {
                    fbVoiceType = 'meditation';
                }
                audioContent = await generateInternalAudio(fb.message, fbVoiceType);
            }
        } catch (fbAudioErr) {
            console.error("Fallback audio failed:", fbAudioErr);
        }

        return {
            ...fb,
            audioContent,
            error: error.message
        };
    }
});
