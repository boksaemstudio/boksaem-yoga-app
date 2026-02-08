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
    minInstances: 1 // ✅ Cold Start 방지
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
            const isClosing = turnCount >= 10; // ✅ 대화 지속 허용 (5 → 10)
            const MUST_FINISH = turnCount >= 15; // ✅ 더 길게 대화 (8 → 15)

            const historyText = chatHistory.length > 0 
                ? chatHistory.map(m => `${m.role === 'user' ? 'Client' : 'AI'}: ${m.content}`).join('\n')
                : 'No previous conversation.';

            // ✅ 사용자 대화 지속 의도 탐지
            const lastUserMsg = chatHistory.filter(m => m.role === 'user').pop()?.content || '';
            const wantsContinue = /(더 |좊더|들어줘|이야기|계속|말해줘|듣고 싶|휴식|쉬고)/i.test(lastUserMsg);

            prompt = `
Role: Holistic Wellness Counselor (Korean, 해요체).
USER: ${memberName || '회원'}

## STRICT RULES:
- NEVER ask for user's name (you already know it: "${memberName || '회원'}")
- NEVER introduce yourself or mention your name
- **Use "${memberName || '회원'}님" extremely sparingly (max once per 3 turns). Constant repetition is robotic.**
- Each response MUST be unique and empathetic - NO repetitive phrases
- Keep responses SHORT (under 40 Korean characters)

## CONVERSATION MODE:
${wantsContinue ? '- User wants MORE conversation. DO NOT end. Continue empathetically for 3-5 more turns.' : ''}
${isClosing && !wantsContinue ? '- Gently guide toward meditation.' : ''}
${MUST_FINISH ? '- SET isFinalAnalysis: true AND mappedDiagnosis.' : ''}

CONVERSATION HISTORY:
${historyText}

JSON Output:
{
    "message": "Response (Korean, polite, <40 chars)",
    "isFinalAnalysis": boolean,
    "analysisSummary": "If final, summary of user state",
    "mappedDiagnosis": "stress/stiff/anxious/tired/overthink/low_energy",
    "options": ["User Reply Option 1 (Statement)", "User Reply Option 2 (Statement)", "User Reply Option 3 (Statement)"] -- **CRITICAL: These must be short answers the USER would say to you, NOT questions.**
}
            `;
            
            result = await ai.generateExperience(prompt);
        }

        // TYPE 2: PRESCRIPTION REASON
        else if (type === 'prescription') {
            const diagId = request.data.diagnosis || request.data.mappedDiagnosis || "stress";
            const analysis = request.data.analysisSummary || "";
            const weatherLabels = { sun: '맑음', cloud: '흐림', rain: '비', snow: '눈' };

            prompt = `
Role: Wellness Counselor (Korean, 해요체). Target: Prescription for ${diagId}.
USER: ${memberName || '회원'}
Context: ${analysis}
Weather: ${weatherLabels[weather] || weather}, Time: ${timeContext}.

## STRICT RULES:
- NEVER introduce yourself or mention your name
- Address user as "${memberName || '회원'}님" naturally
- Be unique and empathetic - NO repetitive phrases

JSON Output:
{
    "message": "Specific guidance (Korean, polite, max 50 chars)",
    "prescriptionReason": "Brief reason in 2 sentences",
    "brainwaveNote": "Benefit note in 1 sentence"
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
Role: Meditation Instructor. Context: ${interactionContext[interactionType]}. Phase: ${currentPhase}.
USER: ${memberName || '회원'}

## RULES:
- Generate ONE short guidance in Korean (해요체, max 25 chars)
- **Do NOT use "${memberName || '회원'}님" unless absolutely necessary for emotional impact.**
- Be unique - NO repetitive phrases

JSON Output:
{
    "message": "Short guidance"
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
                message: "오늘 하루 마음이 어떠셨나요?",
                isFinalAnalysis: false,
                options: ["편안해요", "그저 그래요", "지쳤어요"]
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
