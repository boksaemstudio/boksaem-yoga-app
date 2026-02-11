/**
 * Meditation Module
 * 명상 AI 관련 Cloud Functions
 * 
 * @module modules/meditation
 * [Refactor] Extracted from index.js
 */

const { onCall } = require("firebase-functions/v2/https");
const { admin, getAI, checkAIQuota, logAIError } = require("../helpers/common");
const { SchemaType } = require("@google/generative-ai"); // ✅ Import SchemaType

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

        const startTime = Date.now();
        const [response] = await client.synthesizeSpeech({
            input: { text },
            voice,
            audioConfig: { audioEncoding: 'MP3', speakingRate: type === 'meditation' ? 0.9 : 1.0 }
        });
        const latency = Date.now() - startTime;
        console.log(`[Audio:Latency] Type: ${type}, Latency: ${latency}ms, TextLength: ${text.length}`);

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
    cors: ['https://boksaem-yoga.web.app', 'https://boksaem-yoga.firebaseapp.com', 'http://localhost:5173'],
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
        let transitionData = null; // ✅ Pre-generated transition data to avoid delay

        // TYPE 1: DIAGNOSTIC QUESTION
        if (type === 'question') {
            const { chatHistory = [], intentionFocus } = request.data;
            const turnCount = chatHistory.filter(m => m.role === 'user').length; // ✅ Count USER turns only
            const isClosing = turnCount >= 2; // ✅ Start wrapping up after 2 user turns
            const MUST_FINISH = turnCount >= 3; // ✅ Force wrap up at 3 (Maximum 3 user turns)

            // ✅ OPTIMIZATION: Limit context
            const recentHistory = chatHistory.slice(-4); // ✅ Even shorter context

            const historyText = recentHistory.length > 0 
                ? recentHistory.map(m => `${m.role === 'user' ? 'Client' : 'AI'}: ${m.content}`).join('\n')
                : 'No previous conversation.';

            const lastUserMsg = chatHistory.filter(m => m.role === 'user').pop()?.content || '';
            const wantsContinue = /(더 |좊더|들어줘|이야기|계속|말해줘|듣고 싶|휴식|쉬고)/i.test(lastUserMsg);

            // 🎯 8가지 전문가 관점 매핑
            const expertPerspectives = {
                // === 비움 (Healing) ===
                body: {
                    psychologist: "근육의 긴장은 마음의 방어 기제입니다. 이완은 뇌에 안전 신호를 보내는 행위입니다.",
                    philosopher: "몸은 현존의 가장 직접적인 통로입니다. 지금 이 순간, 몸의 감각에 머무르세요.",
                    yoga: "아사나(자세)는 몸을 통한 명상입니다. 긴장을 내려놓으면 프라나(생명력)가 자유롭게 흐릅니다.",
                    mentor: "지친 몸을 돌보는 것은 자기 연민의 시작입니다. 스스로에게 자비로워지세요."
                },
                mind: {
                    psychologist: "생각의 폭풍은 뇌의 과활성화 상태입니다. 고요함은 선택이 아닌 허용입니다.",
                    philosopher: "생각은 구름과 같습니다. 당신은 그 구름을 바라보는 드넓은 하늘 그 자체입니다.",
                    yoga: "치타 브리티(마음의 파동)를 잠재우는 것이 요가의 본질입니다. 관찰자가 되세요.",
                    mentor: "생각을 통제하려 하지 마세요. 그저 지나가도록 허락하세요."
                },
                emotion: {
                    psychologist: "억압된 감정은 신체 증상으로 나타납니다. 감정을 인정하고 흘려보내는 것이 치유입니다.",
                    philosopher: "감정은 날씨와 같습니다. 억누르지 말고, 지나가게 두세요.",
                    yoga: "프라나야마(호흡 조절)는 감정의 파도를 잔잔하게 만듭니다.",
                    mentor: "감정의 찌꺼기를 흘려보내면, 마음에 공간이 생깁니다."
                },
                detachment: {
                    psychologist: "통제 욕구는 불안의 증상입니다. 수용은 심리적 자유의 시작입니다.",
                    philosopher: "통제할 수 없는 것을 놓아두는 것이 진정한 힘입니다.",
                    yoga: "바이라기야(무집착)는 진정한 자유로 가는 길입니다.",
                    mentor: "불안을 내려놓으면 비로소 평온이 찾아옵니다."
                },
                
                // === 채움 (Growth) ===
                sensation: {
                    psychologist: "외부 자극을 차단하면 내면의 목소리가 선명해집니다. 이것이 진정한 집중입니다.",
                    philosopher: "외부로 향한 감각을 돌려 내면을 비추는 것, 그것이 자기 인식의 시작입니다.",
                    yoga: "프라티야하라(감각의 회수)는 진정한 명상으로 가는 문입니다.",
                    mentor: "내 안의 목소리는 항상 있었습니다. 단지 외부의 소음에 묻혀 있었을 뿐입니다."
                },
                acceptance: {
                    psychologist: "자기 연민은 회복 탄력성의 핵심입니다. 수용은 체념이 아닌 능동적 선택입니다.",
                    philosopher: "애쓰지 않음(Wu-wei)의 미학입니다. 되려 하지 말고, 이미 존재하세요.",
                    yoga: "당신은 이미 완전합니다. 요가는 그것을 기억하는 여정입니다.",
                    mentor: "지금 이대로의 당신은 이미 완벽하며, 성장이 아닌 현존이 목표입니다."
                },
                vitality: {
                    psychologist: "에너지 고갈은 회복의 신호입니다. 충전은 생존이 아닌 선택입니다.",
                    philosopher: "생명력은 외부에서 얻는 것이 아닌, 내면에서 깨우는 것입니다.",
                    yoga: "프라나(생명 에너지)는 고갈되지 않고 순환합니다. 흐름을 열어두세요.",
                    mentor: "쉼은 나약함이 아닌, 다시 나아가기 위한 힘입니다."
                },
                gratitude: {
                    psychologist: "감사는 뇌의 긍정 편향을 강화하고 우울을 완화합니다.",
                    philosopher: "소유가 아닌 존재에 집중할 때, 풍요가 보입니다.",
                    yoga: "산토샤(만족)는 진정한 행복의 바탕입니다.",
                    mentor: "당연한 것은 없습니다. 모든 순간이 선물입니다."
                }
            };

            // ✅ 의도에 맞는 전문가 인사이트 선택
            const perspectives = intentionFocus && expertPerspectives[intentionFocus] 
                ? expertPerspectives[intentionFocus]
                : null;

            prompt = `
Role: 복샘 요가의 명상 인사이트 가이드 (Korean, 해요체). 
Goal: Help user notice "Here & Now" sensations (Body, Breath, Feeling) with Radical Acceptance.
USER: ${memberName}

## STRICT RULES:
- **Zero Judgment / Zero Advice**: Do NOT try to "fix" the user or offer positive framing. Just accept their state.
- **Here & Now Focus**: Gently guide attention to current bodily sensations or breath.
- **Deep Empathy**: 표면적 공감이 아닌, 존재론적 공감
- **Integrated Wisdom**: 4가지 전문가 관점을 자연스럽게 녹여낸 대화 (학술적이지 않게)
- **Name Usage**: Use "${memberName}님" VERY sparingly (max once per turn). Natural conversation is priority.
- **Concise**: Keep responses EXTREMELY short (1 sentence, max 60 characters).
- **CRITICAL: NO TECHNICAL TERMS**: 절대 "V1", "V2", "V3", "모드", "옵션" 등의 시스템 용어를 사용하지 마세요.
- **CRITICAL: NO CHOICE QUESTION**: 채팅창에서 명상 모드를 선택하라고 묻지 마세요.
- **CRITICAL: NO MEDITATION TYPE HINTS**: "바디스캔", "호흡 몰입", "자세 교정", "숨 고르기", "호흡 집중" 등 명상 유형을 묻거나 제안하거나 선택지에 넣지 마세요. 명상 유형은 시스템이 자동으로 결정합니다.
- **CRITICAL: RESPONSE OPTIONS**: 선택지는 반드시 사용자의 감정/상태에 관한 것만 제공하세요. 명상 관련 키워드 금지. 예: "조금 나아졌어요", "좀 더 이야기할래요", "그대로 있을게요" 등.
- **JUST LISTEN**: 그저 듣고 공감하세요. 명상 선택은 다음 화면에서 시스템이 처리합니다.

**전문가 통합 관점 (사용자 의도 기반):**
${JSON.stringify(expertPerspectives[intentionFocus || 'body'])}

이 인사이트를 바탕으로 사용자에게 깊이 공감하고, 자연스럽게 대화를 이어가세요.
자연스럽고 대화적이어야 하며, 학술적이거나 설교적이어서는 안 됩니다. 

## CONVERSATION FLOW (엄격히 준수):
- 최대 2~3턴 대화만 합니다.
- If user wants to talk: Listen empathetically but keep it brief.
- **Closing**: When wrapping up, DO NOT suggest specific meditation types. Just say something warm like "충분히 이해했어요" and set isFinalAnalysis: true.

## CONVERSATION MODE:
${wantsContinue && !MUST_FINISH ? '- User wants MORE conversation. Continue empathetically but briefly. Maximum 1 more turn.' : ''}
${isClosing && !wantsContinue ? '- 대화를 마무리하세요. isFinalAnalysis: true로 설정하세요. 자연스럽게 "충분히 들었어요, 준비되면 시작해주세요" 느낌으로 마무리하세요.' : ''}
${MUST_FINISH ? '- 반드시 isFinalAnalysis: true. 대화를 종료합니다. "충분히 이해했어요. 당신에게 맞는 명상을 준비했어요." 느낌으로 마무리하세요.' : ''}

CONVERSATION HISTORY:
${historyText}

JSON Output:
{
    "message": "Response (Korean, polite, under 80 chars, Acceptance-based)",
    "isFinalAnalysis": boolean,
    "analysisSummary": "If final, summary of user state",
    "mappedDiagnosis": "stress/stiff/anxious/tired/overthink/low_energy/calm/mixed/overwhelmed",
    "options": ["조용히 있을래요", "좀 더 이야기할래요", "괜찮아진 것 같아요"]
}
            `;

            // ✅ SCHEMA 1: QUESTION
            const questionSchema = {
                type: SchemaType.OBJECT,
                properties: {
                    message: { type: SchemaType.STRING },
                    isFinalAnalysis: { type: SchemaType.BOOLEAN },
                    analysisSummary: { type: SchemaType.STRING, nullable: true },
                    mappedDiagnosis: { type: SchemaType.STRING, nullable: true },
                    options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                },
                required: ["message", "isFinalAnalysis", "options"]
            };
            
            console.log(`[Meditation:Question] Prompt: ${prompt}`);
            
            try {
                result = await ai.generateExperience(prompt, questionSchema);
                console.log(`[Meditation:Question] Result:`, JSON.stringify(result));
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
                     result.options = ["좀 더 이야기할래요", "잠시 쉬고 싶어요", "조금 나아졌어요"];
                }
                result.options = result.options.slice(0, 3);

                // 3. Boolean Enforcement
                result.isFinalAnalysis = Boolean(result.isFinalAnalysis);
            }

            // ✅ [PRE-GENERATION] Create Transition Message to remove delay
            if (result && (result.isFinalAnalysis || MUST_FINISH)) {
                result.isFinalAnalysis = true; // Enforce if MUST_FINISH
                
                const diagLabelMap = {
                    stress: '지친 마음', stiff: '굳은 몸', anxious: '불안한 마음',
                    tired: '피로한 몸', overthink: '복잡한 생각', low_energy: '무기력함',
                    calm: '평온함', mixed: '복합적인 감정', overwhelmed: '벅찬 마음'
                };
                const dLabel = diagLabelMap[result.mappedDiagnosis] || '현재 상태';
                
                const transPrompt = `
Role: Mindfulness Companion (Korean, 해요체)
Goal: Create a natural, warm transition from conversation to meditation
Context: User (${memberName || '회원'}), State (${dLabel}), Analysis (${result.analysisSummary || ''})
RULES:
- Acknowledge the conversation naturally
- Explain briefly why meditation helps
- Invite them to start
- Max 60 chars, 해요체
JSON Output: { "message": "Transition message" }
                `;

                const transSchema = {
                    type: SchemaType.OBJECT,
                    properties: { message: { type: SchemaType.STRING } },
                    required: ["message"]
                };
                
                try {
                    const transResult = await ai.generateExperience(transPrompt, transSchema);
                    if (transResult && transResult.message) {
                        // Generate Audio for Transition (using 'meditation' voice)
                        const transAudio = await generateInternalAudio(transResult.message, 'meditation');
                        transitionData = {
                            message: transResult.message,
                            audioContent: transAudio
                        };
                    }
                } catch (e) {
                    console.error("Transition pre-gen failed:", e);
                }
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
- **NO TECHNICAL TERMS**: "V1", "V2", "V3" 등의 용어 사용 금지. "호흡 집중", "바디스캔" 등으로 표현.

JSON Output:
{
    "message": "Prescription intro (Korean, polite, max 50 chars, Acceptance-based)",
    "prescriptionReason": "Brief reason in 2 sentences about why this helps notice sensations",
    "brainwaveNote": "Benefit note in 1 sentence focusing on inner silence"
}
            `;
            
            const prescriptionSchema = {
                type: SchemaType.OBJECT,
                properties: {
                    message: { type: SchemaType.STRING },
                    prescriptionReason: { type: SchemaType.STRING },
                    brainwaveNote: { type: SchemaType.STRING }
                },
                required: ["message", "prescriptionReason", "brainwaveNote"]
            };

            console.log(`[Meditation:Prescription] Prompt: ${prompt}`);
            result = await ai.generateExperience(prompt, prescriptionSchema);
            console.log(`[Meditation:Prescription] Result:`, JSON.stringify(result));
        }

        // TYPE 3: SESSION MESSAGE
        else if (type === 'session_message') {
            const interactionContext = {
                v1: 'voice-guided (Comforting, Listen only)', 
                v2: 'breath-reactive (Focus on breath sound)', 
                v3: 'posture-coaching (Body alignment focus)'
            };
            
            let currentPhase = 'deepening';
            if (messageIndex <= 1) currentPhase = 'intro_and_relax';
            else if (messageIndex >= 8) currentPhase = 'closing_and_waking';
            
            prompt = `
Role: Mindfulness Companion. Context: ${interactionContext[interactionType]}. Phase: ${currentPhase}.
Goal: Gently guide the user to notice bodily sensations or breath without judgment.
USER: ${memberName || '회원'}
${request.data.breathLevel !== null && request.data.breathLevel !== undefined ? `\nBreath Detection: ${request.data.breathLevel > 0.5 ? 'Strong breathing detected - encourage to maintain rhythm' : request.data.breathLevel > 0.1 ? 'Moderate breathing detected - gently deepen' : 'Weak/no breathing detected - remind to breathe deeply'}` : ''}

## RULES:
- Generate ONE short guidance in Korean (해요체, 1 sentence, under 40 chars)
- **Zero Judgment**: Use neutral, descriptive language about sensations.
- **Do NOT use "${memberName || '회원'}님" unless absolutely necessary for deep connection.**
- Be unique - NO repetitive phrases
- **NO TECHNICAL TERMS**: Do NOT say V1, V2, V3. Use natural language.
${request.data.breathLevel !== null && request.data.breathLevel !== undefined ? '- **BREATH COACHING**: Respond to the detected breath level. If strong, affirm. If weak, gently encourage deeper breathing.' : ''}

JSON Output:
{
    "message": "Short mindfulness guidance (Radical Acceptance focus)"
}
            `;
            
            const sessionSchema = {
                type: SchemaType.OBJECT,
                properties: { message: { type: SchemaType.STRING } },
                required: ["message"]
            };

            console.log(`[Meditation:Session] Prompt: ${prompt}`);
            result = await ai.generateExperience(prompt, sessionSchema);
            console.log(`[Meditation:Session] Result:`, JSON.stringify(result));
        }

        // TYPE 4: TRANSITION MESSAGE (대화 → 명상 추천)
        else if (type === 'transition_message') {
            const { diagnosis, diagnosisLabel, modeName, analysisSummary } = request.data;
            
            prompt = `
Role: Mindfulness Companion (Korean, 해요체)
Goal: Create a natural, warm transition from conversation to meditation

Context:
- User: ${memberName || '회원'}
- Diagnosis: ${diagnosisLabel || diagnosis}
- Recommended Meditation: ${modeName}
- Analysis Summary: ${analysisSummary || ''}
- Time: ${timeContext}

## RULES:
- Acknowledge the conversation naturally
- Explain briefly why this meditation helps their current state
- Invite them to start with warmth
- Use "${memberName || '회원'}님" once, naturally
- Be unique and empathetic - NO template phrases
- Max 60 Korean characters, 해요체

JSON Output:
{
    "message": "Warm transition message inviting to meditation"
}
            `;
            
            const transitionSchema = {
                type: SchemaType.OBJECT,
                properties: { message: { type: SchemaType.STRING } },
                required: ["message"]
            };

            console.log(`[Meditation:Transition] Prompt: ${prompt}`);
            result = await ai.generateExperience(prompt, transitionSchema);
            console.log(`[Meditation:Transition] Result:`, JSON.stringify(result));
        }

        // TYPE 5: FEEDBACK MESSAGE (명상 종료 후)
        else if (type === 'feedback_message') {
            const { mode, diagnosis, poseMetrics } = request.data;
            
            // 시간대별 컨텍스트
            let timePhrase = '';
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 12) timePhrase = '아침';
            else if (hour >= 12 && hour < 18) timePhrase = '오후';
            else timePhrase = '오늘';
            
            // 진단 레이블 매핑
            const diagLabels = {
                stress: '스트레스', overthink: '생각 과다', stiff: '몸의 긴장',
                anxious: '불안', frustrated: '답답함', tired: '피로',
                low_energy: '에너지 부족', distracted: '산만함'
            };
            const diagLabel = diagLabels[diagnosis] || '현재 상태';

            // 🧠 V3 POSE ANALYSIS CONTEXT
            let poseContext = "";
            if (poseMetrics) {
                const { stabilityScore, issues } = poseMetrics;
                const score = stabilityScore || 0;
                const issueList = issues && issues.length > 0 ? issues.map(i => {
                    const map = { 'leaning_left': '왼쪽 기울임', 'leaning_right': '오른쪽 기울임', 'head_drop': '고개 숙임' };
                    return map[i] || i;
                }).join(', ') : '큰 흔들림 없음';

                poseContext = `
[AI Pose Analysis Data]
- Stability Score: ${score}/100 (Higher is better)
- Detected Issues: ${issueList}
- INSTRUCTION: 
  1. If score > 80: Compliment their stable posture.
  2. If score < 50: Gently encourage them to find balance next time.
  3. If issues detected: Mention them VERY kindly as a tip (e.g., "왼쪽으로 조금 기우셨는데, 다음엔 척추를 세워보세요").
`;
            }
            
            prompt = `
Role: Mindfulness Companion (Korean, 해요체)
Goal: Provide warm, structured feedback after meditation session

Context:
- User: ${memberName || '회원'}
- Completed Meditation: ${mode || 'calm'}
- Time of Day: ${timePhrase}
- Original State: ${diagLabel}
${poseContext}

## RULES:
- Generate EXACTLY 4 feedback sentences as an array
- Each sentence should be unique and meaningful
- Sentence 1: Acknowledge their effort and what they practiced
- Sentence 2: Highlight a specific benefit or insight from this session
- Sentence 3: Note a positive change or progress
- Sentence 4: Warm closing encouragement for the rest of their day
- Use "${memberName || '회원'}님" in ONE sentence only, naturally
- Each sentence: 15-25 Korean characters, 해요체
- Be warm, specific, and caring - NO generic templates

JSON Output:
{
    "message": "Brief summary message (optional, 1 sentence)",
    "feedbackPoints": [
        "Sentence 1: Effort acknowledgment",
        "Sentence 2: Specific benefit",
        "Sentence 3: Positive change noted",
        "Sentence 4: Warm closing"
    ]
}
            `;
            
            const feedbackSchema = {
                type: SchemaType.OBJECT,
                properties: {
                    message: { type: SchemaType.STRING, nullable: true },
                    feedbackPoints: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                },
                required: ["feedbackPoints"]
            };

            console.log(`[Meditation:Feedback] Prompt: ${prompt}`);
            result = await ai.generateExperience(prompt, feedbackSchema);
            console.log(`[Meditation:Feedback] Result:`, JSON.stringify(result));
            
            // ✅ FIX: feedback_message fallback - AI null이면 기본 피드백 제공
            if (!result) {
                const diagLabel = request.data.diagnosis || '명상';
                console.warn('[Meditation:Feedback] AI returned null, using fallback');
                result = {
                    message: `${memberName || '회원'}님, 오늘 명상 수고하셨어요.`,
                    feedbackPoints: [
                        "오늘의 명상을 완주하셨어요",
                        "잠시라도 멈추는 시간이 소중해요",
                        "마음이 한결 고요해졌을 거예요",
                        "내일도 자신에게 이 시간을 선물하세요"
                    ]
                };
            }
            
            // ✅ Normalize feedbackPoints
            if (result && result.feedbackPoints) {
                result.feedbackPoints = result.feedbackPoints.filter(p => p && typeof p === 'string' && p.trim().length > 0);
                if (result.feedbackPoints.length === 0) {
                    result.feedbackPoints = ["명상을 완료하셨어요", "고요한 시간이었어요", "내일도 찾아와주세요"];
                }
            }
        }

        // TYPE 6: DYNAMIC OPTIONS (새로운 기능)
        else if (type === 'options_refresh') {
            const timeHour = new Date().getHours();
            let timeOfDay = 'day';
            if (timeHour >= 5 && timeHour < 11) timeOfDay = 'morning';
            else if (timeHour >= 22 || timeHour < 5) timeOfDay = 'late_night';
            else if (timeHour >= 18) timeOfDay = 'evening';

            prompt = `
Role: Boksaem Yoga AI Curator (Korean).
Goal: Generate varied, poetic, and context-aware labels for meditation options.
Context:
- User: ${memberName || '회원'}
- Time: ${timeOfDay} (${timeContext})
- Weather: ${weather}

STANDARD CATEGORIES (Do NOT change ID):
1. id: "healing" (Core: Rest, Emptiness, Relief)
2. id: "growth" (Core: Energy, Connection, Insight)

STANDARD INTENTIONS (Do NOT change IDs):
- healing: body_rest, mind_quiet, emotion_release, detachment
- growth: sensation, acceptance, vitality, gratitude

## TASK:
Create refined Korean labels for these categories and intentions based on the context (Time/Weather).
- Labels should be poetic yet clear.
- Keep the core meaning but make it feel fresh.
- Max 20 characters for labels.
- **Strictly** maintain the JSON structure below.

JSON Output:
{
    "categories": [
        { "id": "healing", "label": "Context-aware label for Healing", "description": "Short poetic description" },
        { "id": "growth", "label": "Context-aware label for Growth", "description": "Short poetic description" }
    ],
    "intentions": [
        { "id": "body_rest", "category": "healing", "label": "Label for Body Rest" },
        { "id": "mind_quiet", "category": "healing", "label": "Label for Mind Quiet" },
        { "id": "emotion_release", "category": "healing", "label": "Label for Emotion" },
        { "id": "detachment", "category": "healing", "label": "Label for Detachment" },
        { "id": "sensation", "category": "growth", "label": "Label for Sensation" },
        { "id": "acceptance", "category": "growth", "label": "Label for Acceptance" },
        { "id": "vitality", "category": "growth", "label": "Label for Vitality" },
        { "id": "gratitude", "category": "growth", "label": "Label for Gratitude" }
    ]
}
            `;
            
            const optionsSchema = {
                type: SchemaType.OBJECT,
                properties: {
                    categories: {
                        type: SchemaType.ARRAY,
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                id: { type: SchemaType.STRING },
                                label: { type: SchemaType.STRING },
                                description: { type: SchemaType.STRING }
                            },
                            required: ["id", "label", "description"]
                        }
                    },
                    intentions: {
                        type: SchemaType.ARRAY,
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                id: { type: SchemaType.STRING },
                                category: { type: SchemaType.STRING },
                                label: { type: SchemaType.STRING }
                            },
                            required: ["id", "category", "label"]
                        }
                    }
                },
                required: ["categories", "intentions"]
            };

            result = await ai.generateExperience(prompt, optionsSchema);
        }

        if (!result) {
            throw new Error("AI returned null");
        }

        // Generate audio
        let audioContent = null;
        if (result.message) {
            try {
                // ✅ TTS Placeholder Safety (Sync with Client)
                if (memberName) {
                     result.message = result.message.replace(/OO님/g, `${memberName}님`)
                                            // Also replace if simple "OO" is used (sometimes AI does this)
                                            .replace(/OO/g, memberName); 
                }

                // Determine voice type based on context
                // ✅ [FIX] 명상 관련 모든 메시지는 meditation voice 사용
                const MEDITATION_VOICE_TYPES = new Set([
                    'session_message', 
                    'prescription', 
                    'transition_message',  // 채팅 → 명상 전환 시
                    'feedback_message'     // 명상 완료 후 피드백
                ]);
                const voiceType = MEDITATION_VOICE_TYPES.has(type) ? 'meditation' : 'chat';

                
                const audioStartTime = Date.now();
                audioContent = await generateInternalAudio(result.message, voiceType);
                console.log(`[Meditation:Audio] Generation took ${Date.now() - audioStartTime}ms`);
            } catch (audioErr) {
                console.error("Audio generation failed:", audioErr);
            }
        }

        const finalResponse = {
            ...result,
            audioContent: audioContent,
            transitionData: transitionData || null
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
                    ? "잠시 호흡을 고르며 기다려주세요..." 
                    : "오늘 하루 마음이 어떠셨나요?",
                isFinalAnalysis: false,
                options: (request.data.chatHistory && request.data.chatHistory.length > 0)
                    ? ["네, 계속 이야기할게요", "잠시 쉬고 싶어요"]
                    : ["편안해요", "그저 그래요", "복잡해요"]
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
