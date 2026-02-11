/**
 * useMeditationAI - 명상 AI 채팅/처방/세션 메시지 관리 훅
 * 
 * [Refactor] MeditationPage.jsx에서 추출됨
 * AI 관련 로직을 캡슐화하여 MeditationPage의 복잡도를 줄입니다.
 * 
 * @module useMeditationAI
 */

import { useState, useRef, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { DIAGNOSIS_OPTIONS, AI_SESSION_MESSAGES } from '../constants/meditationConstants';

const generateMeditationGuidance = httpsCallable(functions, 'generateMeditationGuidance');
const SELECTED_DIAGNOSIS_FALLBACK = DIAGNOSIS_OPTIONS[0];

/**
 * @param {Object} options
 * @param {string} options.memberName - 회원 이름
 * @param {string} options.timeContext - 시간대 컨텍스트
 * @param {Object} options.audioAPI - useMeditationAudio에서 반환된 { playAudio, speak, speakFallback, stopAllAudio }
 * @param {boolean} options.ttcEnabled - TTS 활성화 여부
 * @param {Function} options.logDebug - 디버그 로깅 함수
 */
export const useMeditationAI = ({ memberName, timeContext, audioAPI, ttcEnabled, logDebug }) => {
    // Chat State
    const [isAILoading, setIsAILoading] = useState(true);
    const [aiPrescription, setAiPrescription] = useState(null);
    const [aiSessionMessageIndex, setAiSessionMessageIndex] = useState(0);
    const [chatHistory, setChatHistory] = useState([]);
    const [currentAIChat, setCurrentAIChat] = useState(null);
    const [manualInput, setManualInput] = useState("");
    const [aiRequestLock, setAiRequestLock] = useState(false);
    const [prescriptionReason, setPrescriptionReason] = useState('');
    const [feedbackData, setFeedbackData] = useState(null);
    const [aiLatency, setAiLatency] = useState(0);

    // Refs for race condition prevention
    const currentRequestIdRef = useRef(0);
    const chatEndRef = useRef(null);

    // --- Fetch AI Question (Chat) ---
    const fetchAIQuestion = useCallback(async (history = [], selectedIntention = null) => {
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
                    resolve({ data: { message: fallbackMsg, isFinalAnalysis: false, options: fallbackOptions, error: "timeout" } });
                }, 18000);
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
                if (result.data.message) {
                    result.data.message = result.data.message.replace(/OO님/g, `${memberName}님`);
                }
                if (result.data.question) {
                    result.data.question = result.data.question.replace(/OO님/g, `${memberName}님`);
                }
                
                setCurrentAIChat(result.data);
                
                if (result.data.audioContent) {
                    audioAPI?.playAudio(result.data.audioContent);
                } else if (result.data.isFinalAnalysis && ttcEnabled) {
                    audioAPI?.speak(result.data.message);
                }
            }
        } catch (error) {
            if (requestId !== currentRequestIdRef.current) return;
            console.error('AI Question failed:', error);
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
    }, [memberName, timeContext, audioAPI, ttcEnabled, aiRequestLock]);

    // --- Chat Response Handler ---
    const handleChatResponse = useCallback(async (answer, onNavigateHome, selectedIntention) => {
        if (!answer || aiRequestLock) return;
        
        if (answer === "홈으로 가기") {
            audioAPI?.stopAllAudio();
            onNavigateHome?.();
            return;
        }
        
        if (["네, 시작할게요", "맞춤 명상 시작하기", "명상하고 싶어요", "시작할게요", "명상 시작"].some(trigger => answer.includes(trigger))) {
            const diag = DIAGNOSIS_OPTIONS.find(o => o.id === currentAIChat?.mappedDiagnosis) || SELECTED_DIAGNOSIS_FALLBACK;
            return { action: 'start_meditation', diagnosis: diag };
        }
        
        audioAPI?.stopAllAudio();

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

        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        await fetchAIQuestion(updatedHistory, selectedIntention);
        
        return null;
    }, [chatHistory, currentAIChat, aiRequestLock, audioAPI, fetchAIQuestion]);

    // --- Manual Submit ---
    const handleManualSubmit = useCallback((e, onNavigateHome, selectedIntention) => {
        e.preventDefault();
        if (!manualInput.trim()) return;
        const text = manualInput;
        setManualInput("");
        handleChatResponse(text, onNavigateHome, selectedIntention);
    }, [manualInput, handleChatResponse]);

    // --- Fetch Prescription ---
    const fetchAIPrescription = useCallback(async (diagnosisId, weatherId, modeId, intType, currentSummary) => {
        try {
            const startTime = Date.now();
            const prescResult = await generateMeditationGuidance({
                type: 'prescription',
                memberName,
                timeContext,
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
            console.error('Prescription fetch failed:', err);
        }
    }, [memberName, timeContext]);

    // --- Fetch Session Message ---
    const fetchAISessionMessage = useCallback(async (selectedDiagnosis, activeMode, interactionType) => {
        try {
            const startTime = Date.now();
            const result = await generateMeditationGuidance({
                type: 'session_message',
                memberName,
                timeContext,
                diagnosis: selectedDiagnosis?.id,
                mode: activeMode?.id === 'breath' ? '3min' : (activeMode?.id === 'calm' ? '7min' : '15min'),
                interactionType,
                messageIndex: aiSessionMessageIndex
            });
            setAiLatency(Date.now() - startTime);
            
            if (result.data && result.data.error) {
                throw new Error("Backend Returned Error: " + result.data.error);
            }

            if (result.data && result.data.message) {
                const personalizedMsg = result.data.message.replace(/OO님/g, `${memberName}님`);
                setAiSessionMessageIndex(prev => prev + 1);
                
                if (result.data.audioContent) {
                    audioAPI?.playAudio(result.data.audioContent);
                }
                
                return personalizedMsg;
            }
        } catch (error) {
            console.error('AI Session message failed:', error);
            const messages = AI_SESSION_MESSAGES[interactionType] || AI_SESSION_MESSAGES['v1'];
            const msg = messages[aiSessionMessageIndex % messages.length];
            setAiSessionMessageIndex(prev => prev + 1);
            return msg;
        }
        return null;
    }, [memberName, timeContext, aiSessionMessageIndex, audioAPI]);

    // --- Generate Feedback ---
    const generateFeedback = useCallback(async (selectedDiagnosis, activeMode, poseMetrics) => {
        try {
            const startTime = Date.now();
            const fbResult = await generateMeditationGuidance({
                type: 'feedback_message',
                memberName,
                timeContext,
                diagnosis: selectedDiagnosis?.id || 'stress',
                mode: activeMode?.id || 'calm',
                poseMetrics
            });
            setAiLatency(Date.now() - startTime);
            
            if (fbResult.data) {
                if (fbResult.data.message) {
                    fbResult.data.message = fbResult.data.message.replace(/OO님/g, `${memberName}님`);
                }
                if (fbResult.data.feedbackPoints) {
                    fbResult.data.feedbackPoints = fbResult.data.feedbackPoints.map(p => p.replace(/OO님/g, `${memberName}님`));
                }
                
                if (fbResult.data.audioContent) {
                    audioAPI?.playAudio(fbResult.data.audioContent);
                } else if (ttcEnabled && fbResult.data.message) {
                    audioAPI?.speak(fbResult.data.message);
                }
                
                setFeedbackData(fbResult.data);
                return fbResult.data;
            }
        } catch (e) {
            console.error("Feedback Generation Failed:", e);
            const fallback = {
                message: `${memberName}님, 오늘 명상으로 마음이 한결 편안해지셨길 바래요.`,
                feedbackPoints: [
                    "명상을 통해 내면의 고요함을 경험했습니다.",
                    "호흡에 집중하며 현재에 머무르는 연습을 했습니다.",
                    "긴장했던 몸과 마음이 조금 더 이완되었습니다.",
                    "오늘 하루도 평온한 마음으로 이어가세요."
                ]
            };
            setFeedbackData(fallback);
            return fallback;
        }
    }, [memberName, timeContext, audioAPI, ttcEnabled]);

    // --- Reset AI State ---
    const resetAIState = useCallback(() => {
        setIsAILoading(false);
        setAiRequestLock(false);
        setAiSessionMessageIndex(0);
        setChatHistory([]);
        setCurrentAIChat(null);
        setManualInput("");
        setPrescriptionReason('');
        setAiPrescription(null);
        setFeedbackData(null);
        currentRequestIdRef.current += 1;
    }, []);

    return {
        // State
        isAILoading, setIsAILoading,
        aiPrescription, setAiPrescription,
        aiSessionMessageIndex,
        chatHistory, setChatHistory,
        currentAIChat, setCurrentAIChat,
        manualInput, setManualInput,
        aiRequestLock, setAiRequestLock,
        prescriptionReason, setPrescriptionReason,
        feedbackData, setFeedbackData,
        aiLatency,
        
        // Refs
        currentRequestIdRef,
        chatEndRef,
        
        // Methods
        fetchAIQuestion,
        handleChatResponse,
        handleManualSubmit,
        fetchAIPrescription,
        fetchAISessionMessage,
        generateFeedback,
        resetAIState,
        
        // Firebase function (for direct access)
        generateMeditationGuidance,
    };
};
