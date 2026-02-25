import { useState, useRef, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { AI_SESSION_MESSAGES, MEDITATION_MODES, DIAGNOSIS_OPTIONS } from '../constants/meditationConstants';

const generateMeditationGuidance = httpsCallable(functions, 'generateMeditationGuidance');
const SELECTED_DIAGNOSIS_FALLBACK = DIAGNOSIS_OPTIONS[0];

export const useMeditationAI = ({
    memberName,
    timeContext,
    selectedIntention,
    activeMode,
    interactionType,
    micVolume,
    isPlayingRef,
    ttcEnabled,
    stopAllAudio,
    playAudio,
    speak,
    onExit,
    onMeditationReady
}) => {
    // Basic States
    const [isAILoading, setIsAILoading] = useState(true);
    const [aiRequestLock, setAiRequestLock] = useState(false);
    const [aiLatency, setAiLatency] = useState(0);

    // AI Contents
    const [chatHistory, setChatHistory] = useState([]);
    const [currentAIChat, setCurrentAIChat] = useState(null);
    const [manualInput, setManualInput] = useState("");
    const [aiPrescription, setAiPrescription] = useState(null);
    const [prescriptionReason, setPrescriptionReason] = useState('');
    const [aiMessage, setAiMessage] = useState("");
    
    // Session Tracking
    const [sessionInfo, setSessionInfo] = useState(null);
    const [feedbackData, setFeedbackData] = useState(null);


    // Refs
    const currentRequestIdRef = useRef(0);
    const messageIndexRef = useRef(0);
    const sessionDiagnosisRef = useRef(null);
    const consecutiveFailsRef = useRef(0);

    // -----------------------------------------------------
    // 1. Pre-Session: fetchAIPrescription
    // -----------------------------------------------------
    const fetchAIPrescription = useCallback(async (diagnosisId, weatherId, modeId, intType, currentSummary) => {
        try {
            const startTime = Date.now();
            const prescResult = await generateMeditationGuidance({
                type: 'prescription',
                memberName: memberName,
                timeContext: timeContext,
                weather: weatherId,
                diagnosis: diagnosisId,
                analysisSummary: currentSummary,
                mode: modeId === 'breath' ? '3min' : (modeId === 'calm' ? '7min' : '15min'),
                interactionType: intType
            });
            setAiLatency(Date.now() - startTime);
            
            if (prescResult.data) {
                if (prescResult.data.prescriptionReason) {
                    prescResult.data.prescriptionReason = prescResult.data.prescriptionReason.replace(/OO님/g, `${memberName}님`);
                }
                if (prescResult.data.message) {
                    prescResult.data.message = prescResult.data.message.replace(/OO님/g, `${memberName}님`);
                }
                setAiPrescription(prescResult.data);
                setPrescriptionReason(prescResult.data.prescriptionReason || prescResult.data.message || '');
            }
        } catch (err) {
            console.error('Standalone Prescription fetch failed:', err);
        }
    }, [memberName, timeContext, setAiLatency]);

    // -----------------------------------------------------
    // 2. Pre-Session: fetchAIQuestion
    // -----------------------------------------------------
    const fetchAIQuestion = useCallback(async (history = []) => {
        if (aiRequestLock) return; 
        setAiRequestLock(true);
        setIsAILoading(true);

        const requestId = currentRequestIdRef.current + 1;
        currentRequestIdRef.current = requestId;
        
        try {
            const hour = new Date().getHours();
            let currentContext = 'night';
            if (hour >= 5 && hour < 12) currentContext = 'morning';
            else if (hour >= 12 && hour < 18) currentContext = 'afternoon';
            
            let timeoutId;
            const timeoutPromise = new Promise((resolve) => {
                timeoutId = setTimeout(() => {
                    const fallbackMsg = (history && history.length > 0) 
                        ? "잠시 연결이 늦어지네요. 계속해서 이야기 나눠볼까요?" 
                        : "오늘 하루 마음이 어떠셨나요?";
                        
                    const fallbackOptions = (history && history.length > 0)
                        ? ["네, 좋아요", "잠시 생각할게요"]
                        : ["편안해요", "그저 그래요", "지쳤어요"];

                    resolve({
                        data: {
                            message: fallbackMsg,
                            isFinalAnalysis: false,
                            options: fallbackOptions,
                            error: "timeout"
                        }
                    });
                }, 45000); // Increased timeout to prevent premature disconnects
            });

            const startTime = Date.now();
            const apiPromise = generateMeditationGuidance({ 
                type: 'question', 
                memberName: memberName || '회원', 
                timeContext: currentContext,
                chatHistory: history,
                intentionFocus: selectedIntention?.focus
            });

            const result = await Promise.race([apiPromise, timeoutPromise]);
            setAiLatency(Date.now() - startTime);
            clearTimeout(timeoutId);

            if (requestId !== currentRequestIdRef.current) return;

            if (result.data) {
                if (result.data.message) result.data.message = result.data.message.replace(/OO님/g, `${memberName}님`);
                if (result.data.question) result.data.question = result.data.question.replace(/OO님/g, `${memberName}님`);
                
                if (result.data.isFinalAnalysis) {
                    result.data.options = [];
                    result.data.isTransition = true;
                }
                
                setCurrentAIChat(result.data);
                
                if (result.data.audioContent) {
                    playAudio(result.data.audioContent);
                }
                // [FIX] Removed local TTS (speak) for final analysis as requested by user to keep chat silent
            }
        } catch (error) {
            if (requestId !== currentRequestIdRef.current) return;
            setCurrentAIChat({
                message: "죄송해요, 잠시 연결이 고르지 않네요. 계속 대화해볼까요?",
                options: ["네, 좋아요", "그냥 시작할게요"]
            });
        } finally {
            if (requestId === currentRequestIdRef.current) {
                setIsAILoading(false);
                setAiRequestLock(false);
            }
        }
    }, [aiRequestLock, memberName, selectedIntention, playAudio, ttcEnabled, speak, setAiLatency]);

    const handleChatResponse = useCallback(async (answer) => {
        if (!answer || aiRequestLock) return;
        
        stopAllAudio();

        if (answer === "홈으로 가기") {
            if (onExit) onExit();
            return;
        }
        
        if (currentAIChat?.isFinalAnalysis || ["네, 시작할게요", "맞춤 명상 시작하기", "명상하고 싶어요", "시작할게요", "명상 시작", "명상 시작하기"].some(trigger => answer.includes(trigger))) {
            const diag = DIAGNOSIS_OPTIONS.find(o => o.id === currentAIChat?.mappedDiagnosis) || SELECTED_DIAGNOSIS_FALLBACK;
            const defaultMode = MEDITATION_MODES.find(m => m.id === diag?.prescription?.modeId) || MEDITATION_MODES[1];
            
            if (onMeditationReady) {
                onMeditationReady(diag, defaultMode, diag?.prescription?.type || 'v1');
            }
            return;
        }
        
        stopAllAudio();

        let updatedHistory = [...chatHistory];
        if (currentAIChat) {
            const aiText = currentAIChat.message || currentAIChat.question;
            const isFallback = aiText?.includes("연결이 늦어지네요") || aiText?.includes("연결이 고르지 않네요");
            
            if (aiText && !isFallback) {
                updatedHistory = [...updatedHistory, { role: 'model', content: aiText }];
            }
        }

        const isRespondingToFallback = currentAIChat?.message?.includes("연결이 늦어지네요") || currentAIChat?.message?.includes("연결이 고르지 않네요");
        
        if (!isRespondingToFallback) {
            updatedHistory = [...updatedHistory, { role: 'user', content: answer }];
        }
        
        setChatHistory(updatedHistory);
        setCurrentAIChat(null); 
        setIsAILoading(true);

        await fetchAIQuestion(updatedHistory);
    }, [aiRequestLock, currentAIChat, chatHistory, stopAllAudio, onExit, onMeditationReady, fetchAIQuestion]);

    const handleManualSubmit = useCallback((e) => {
        e.preventDefault();
        if (!manualInput.trim()) return;
        const text = manualInput;
        setManualInput("");
        handleChatResponse(text);
    }, [manualInput, handleChatResponse]);

    const handleReturnToChat = useCallback(async () => {
        setIsAILoading(true);
        
        const warmReconnectMsg = `${memberName}님, 다시 돌아오셨네요. 혹시 더 나누고 싶은 이야기가 있으신가요?`;
        setCurrentAIChat({
            message: warmReconnectMsg,
            options: ["네, 있어요", "괜찮아요, 명상할게요"]
        });
        
        if (ttcEnabled) speak(warmReconnectMsg);

        const lastUserMsg = chatHistory.filter(m => m.role === 'user').pop()?.content || '';
        const newHistory = [...chatHistory, { 
            role: 'system',
            content: `[Context] User briefly viewed meditation options but chose to continue conversation. Last discussed: "${lastUserMsg}". Gently ask if they want to explore that topic more deeply, in a warm, human, conversational tone. Do NOT sound robotic or templated.` 
        }];
        setChatHistory(newHistory);
        
        await fetchAIQuestion(newHistory);
    }, [memberName, chatHistory, ttcEnabled, speak, fetchAIQuestion]);

    // -----------------------------------------------------
    // 3. In-Session: fetchAISessionMessage
    // -----------------------------------------------------
    const fetchAISessionMessage = useCallback(async () => {
        try {
            const currentIndex = messageIndexRef.current;
            const currentDiagnosis = sessionDiagnosisRef.current;
            
            const startTime = Date.now();
            let timeoutId;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('Session AI timeout (15s)')), 15000);
            });
            
            const apiPromise = generateMeditationGuidance({
                type: 'session_message',
                memberName: memberName,
                timeContext: timeContext,
                diagnosis: currentDiagnosis,
                mode: activeMode?.id === 'breath' ? '3min' : (activeMode?.id === 'calm' ? '7min' : '15min'),
                interactionType: interactionType,
                messageIndex: currentIndex,
                breathLevel: interactionType === 'v2' ? micVolume : null
            });
            
            const result = await Promise.race([apiPromise, timeoutPromise]);
            clearTimeout(timeoutId);
            setAiLatency(Date.now() - startTime);
            
            if (result.data && result.data.error) throw new Error("Backend Returned Error: " + result.data.error);

            if (result.data && result.data.message) {
                const personalizedMsg = result.data.message.replace(/OO님/g, `${memberName}님`);
                if (isPlayingRef.current) {
                    setAiMessage(personalizedMsg);
                    messageIndexRef.current = currentIndex + 1;
                    consecutiveFailsRef.current = 0;
                    if (result.data.audioContent) {
                        playAudio(result.data.audioContent);
                    } else if (ttcEnabled && speak) {
                        speak(personalizedMsg);
                    }
                }
            }
        } catch (error) {
            console.error('AI Session message failed:', error.message);
            if (isPlayingRef.current) {
                const currentIndex = messageIndexRef.current;
                consecutiveFailsRef.current += 1;
                const failCount = consecutiveFailsRef.current;
                
                if (failCount > 3) return;
                
                const messages = AI_SESSION_MESSAGES[interactionType] || AI_SESSION_MESSAGES['v1'];
                const msg = messages[currentIndex % messages.length];
                setAiMessage(msg);
                messageIndexRef.current = currentIndex + 1;
                if (ttcEnabled && speak) {
                    speak(msg);
                }
            }
        }
    }, [memberName, timeContext, activeMode, interactionType, micVolume, isPlayingRef, playAudio, speak, ttcEnabled, setAiLatency]);

    // -----------------------------------------------------
    // 4. Post-Session: fetchAIFeedback
    // -----------------------------------------------------
    const fetchAIFeedback = useCallback(async (stabilityScore, customSummary) => {
        try {
            const result = await generateMeditationGuidance({
                type: 'feedback',
                memberName: memberName,
                sessionInfo: sessionInfo,
                postureFeedback: customSummary,
                stabilityScore: stabilityScore
            });
            
            if (result.data && result.data.feedbackMessage) {
                setFeedbackData({ 
                    message: result.data.feedbackMessage.replace(/OO님/g, `${memberName}님`),
                    analysis: result.data.analysis 
                });
            }
            return result.data;
        } catch (err) {
            console.error('AI Feedback Failed:', err);
            return null;
        }
    }, [memberName, sessionInfo]);

    // Helpers
    const generateReason = useCallback((time, weatherId, diagnosisId) => {
        const timeText = time === 'morning' ? '하루를 시작하는 아침,' : time === 'afternoon' ? '에너지가 필요한 오후,' : '하루를 정리하는 밤,';
        let coreMessage = "당신의 지금 상태에 딱 맞는 명상을 준비했어요. 마음의 소리에 귀를 기울이며 편안하게 시작해볼까요?";
        
        if (diagnosisId === 'stress' || diagnosisId === 'overthink') {
            coreMessage = "복잡한 생각은 뇌의 베타파 과잉 상태일 수 있어요. 지금 이 순간, 모든 판단을 멈추고 제 안내를 따라 호흡의 파도에 몸을 맡겨보세요. 곧 머릿속이 맑아질 거예요.";
        } else if (diagnosisId === 'stiff') {
            coreMessage = "몸의 긴장은 마음이 보내는 신호예요. 굳어있던 근육을 의식적으로 이완하며 호흡하면, 막혔던 에너지가 흐르기 시작할 거예요.";
        } else if (diagnosisId === 'anxious' || diagnosisId === 'frustrated') {
            coreMessage = "답답하고 불안한 마음은 누구나 가질 수 있는 구름 같은 거예요. 그 구름 뒤에 있는 맑은 하늘을 볼 수 있도록 제가 곁에서 도와드릴게요. 당신은 안전합니다.";
        } else if (diagnosisId === 'tired' || diagnosisId === 'low_energy') {
            coreMessage = "에너지가 부족할 때는 억지로 노력할 필요 없어요. 그저 편안히 앉아 있는 것만으로도 충분한 명상이 됩니다. 당신의 지친 마음을 따뜻하게 안아줄게요.";
        } else if (diagnosisId === 'distracted') {
            coreMessage = "흩어진 마음을 하나로 모으는 연습을 해볼까요? 호흡이라는 닻을 내리고 '지금 여기'로 돌아오는 여정을 시작해봐요.";
        } 
        return `${timeText} ${coreMessage}`;
    }, []);

    return {
        isAILoading, setIsAILoading,
        aiRequestLock, setAiRequestLock,
        aiLatency, setAiLatency,
        chatHistory, setChatHistory,
        currentAIChat, setCurrentAIChat,
        manualInput, setManualInput,
        aiPrescription, setAiPrescription,
        prescriptionReason, setPrescriptionReason,
        aiMessage, setAiMessage,
        sessionInfo, setSessionInfo,
        feedbackData, setFeedbackData,

        
        messageIndexRef,
        sessionDiagnosisRef,
        consecutiveFailsRef,

        fetchAIPrescription,
        fetchAIQuestion,
        fetchAISessionMessage,
        fetchAIFeedback,
        handleChatResponse,
        handleManualSubmit,
        handleReturnToChat,
        generateReason
    };
};
