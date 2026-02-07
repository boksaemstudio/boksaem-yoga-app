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
            default: { languageCode: 'ko-KR', name: 'ko-KR-Wavenet-A', ssmlGender: 'FEMALE' },
            meditation: { languageCode: 'ko-KR', name: 'ko-KR-Wavenet-B', ssmlGender: 'FEMALE' },
            fast: { languageCode: 'ko-KR', name: 'ko-KR-Standard-A', ssmlGender: 'FEMALE' }
        };

        const voice = voiceConfigs[type] || voiceConfigs.default;

        const [response] = await client.synthesizeSpeech({
            input: { text },
            voice,
            audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 }
        });

        return response.audioContent?.toString('base64') || null;
    } catch (error) {
        console.error('[Audio] Generation failed:', error);
        return null;
    }
};

/**
 * 명상 AI 가이드 생성
 */
exports.generateMeditationGuidance = onCall({
    region: "asia-northeast3",
    cors: true
}, async (request) => {
    console.log("🧘 Meditation Guidance Request:", JSON.stringify(request.data));
    await checkAIQuota();

    const { 
        type, // 'question' | 'prescription' | 'session_message'
        timeContext,
        weather,
        mode,
        interactionType,
        messageIndex,
        memberId
    } = request.data;

    try {
        const ai = getAI();
        let prompt = "";
        let result = null;

        // TYPE 1: DIAGNOSTIC QUESTION
        if (type === 'question') {
            const { chatHistory = [] } = request.data;
            const turnCount = chatHistory.length;
            const isClosing = turnCount >= 7;
            const MUST_FINISH = turnCount >= 10;

            const historyText = chatHistory.length > 0 
                ? chatHistory.map(m => `${m.role === 'user' ? 'Client' : 'AI'}: ${m.content}`).join('\n')
                : 'No previous conversation.';

            prompt = `
                You are a Holistic Wellness Master AI named '복순(Boksoon)' for '복샘요가'.
                Identity: Warm life mentor, expert in yoga & psychology.
                
                CONVERSATION HISTORY:
                ${historyText}
                
                TURN: ${turnCount + 1}
                ${isClosing ? 'Start pushing toward analysis.' : ''}
                ${MUST_FINISH ? 'MUST SET isFinalAnalysis: true AND PROVIDE DIAGNOSIS NOW.' : ''}
                
                If user says "Start", "Yes", "Let's do it" -> SET 'isFinalAnalysis: true' IMMEDIATELY.
                
                Output Format (JSON ONLY):
                {
                    "message": "Your response (Korean, conversational)",
                    "isFinalAnalysis": boolean,
                    "analysisSummary": "Short summary of diagnosis",
                    "mappedDiagnosis": "stress/stiff/anxious/tired/overthink/low_energy..."
                }
            `;
            
            result = await ai.generateExperience(prompt);
        }

        // TYPE 2: PRESCRIPTION REASON
        else if (type === 'prescription') {
            const { analysisSummary = "", mappedDiagnosis = "stress" } = request.data;
            const weatherLabels = { sun: '맑음', cloud: '흐림', rain: '비', snow: '눈' };

            prompt = `
                Generate a personalized meditation prescription.
                Diagnosis: ${mappedDiagnosis}
                Analysis: ${analysisSummary}
                Weather: ${weatherLabels[weather] || weather}
                Time: ${timeContext}
                
                Output Format (JSON ONLY):
                {
                    "prescriptionReason": "Why this meditation (Korean, 2 sentences)",
                    "brainwaveNote": "Scientific note about benefits"
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
                You are a Meditation Course Instructor AI.
                Context: ${interactionContext[interactionType]}, Phase: ${currentPhase}.
                Message Index: ${messageIndex}
                
                Generate ONE short guidance message in Korean (max 30 chars).
                Be warm, encouraging, and context-appropriate.
                
                Output Format (JSON ONLY):
                {
                    "message": "Guidance message (Korean, max 30 chars)"
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
                audioContent = await generateInternalAudio(result.message, 'meditation');
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
                isFinalAnalysis: false
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
                audioContent = await generateInternalAudio(fb.message, 'meditation');
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
