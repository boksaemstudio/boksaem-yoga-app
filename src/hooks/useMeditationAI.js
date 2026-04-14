import { useLanguageStore } from '../stores/useLanguageStore';
import { useState, useRef, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { AI_SESSION_MESSAGES, MEDITATION_MODES, DIAGNOSIS_OPTIONS } from '../constants/meditationConstants';
import { getKSTHour } from '../utils/dates';
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
  const t = useLanguageStore(s => s.t);
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
        mode: modeId === 'breath' ? '3min' : modeId === 'calm' ? '7min' : '15min',
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
  const fetchAIQuestion = useCallback(async (history = [], isInitial = false) => {
    if (aiRequestLock) return;
    setAiRequestLock(true);
    setIsAILoading(true);

    // [NEW] Progressive Initialization: Immediately show a welcoming message
    if (isInitial && history.length === 0) {
      const intentionLabel = selectedIntention?.label || t("g_540235") || "\uBA85\uC0C1";
      const initialMessage = `${intentionLabel} 시간을 가져볼까요? 오늘 하루 마음이 어떠셨나요?`;
      setCurrentAIChat({
        message: initialMessage,
        isFinalAnalysis: false,
        options: [t("g_c497b8") || "\uD3B8\uC548\uD574\uC694", t("g_86597c") || "\uC870\uAE08 \uC9C0\uCCE4\uC5B4\uC694", t("g_7bfb74") || "\uBCF5\uC7A1\uD574\uC694"]
      });
      // User requested less TTS during chat to speed things up. It's skipped in backend, keep it skipped here unless explicitly toggled on a previous session
      // We will purposely omit `speak(initialMessage)` here for perceived speed and quiet text-based chat.
      setIsAILoading(false);
      setAiRequestLock(false);
      return;
    }
    const requestId = currentRequestIdRef.current + 1;
    currentRequestIdRef.current = requestId;
    try {
      const hour = getKSTHour();
      let currentContext = 'night';
      if (hour >= 5 && hour < 12) currentContext = 'morning';else if (hour >= 12 && hour < 18) currentContext = 'afternoon';
      let timeoutId;
      const timeoutPromise = new Promise(resolve => {
        timeoutId = setTimeout(() => {
          const fallbackMsg = history && history.length > 0 ? t("g_159cf6") || "\uC7A0\uC2DC \uC5F0\uACB0\uC774 \uB2A6\uC5B4\uC9C0\uB124\uC694. \uACC4\uC18D\uD574\uC11C \uC774\uC57C\uAE30 \uB098\uB220\uBCFC\uAE4C\uC694?" : t("g_657a80") || "\uC624\uB298 \uD558\uB8E8 \uB9C8\uC74C\uC774 \uC5B4\uB5A0\uC168\uB098\uC694?";
          const fallbackOptions = history && history.length > 0 ? [t("g_858158") || "\uB124, \uC88B\uC544\uC694", t("g_a8c969") || "\uC7A0\uC2DC \uC0DD\uAC01\uD560\uAC8C\uC694"] : [t("g_c497b8") || "\uD3B8\uC548\uD574\uC694", t("g_6ceafa") || "\uADF8\uC800 \uADF8\uB798\uC694", t("g_e88580") || "\uC9C0\uCCE4\uC5B4\uC694"];
          resolve({
            data: {
              message: fallbackMsg,
              isFinalAnalysis: false,
              options: fallbackOptions,
              error: "timeout"
            }
          });
        }, 12000); // [최적화] 45초→12초 타임아웃 단축
      });
      const startTime = Date.now();
      const apiPromise = generateMeditationGuidance({
        type: 'question',
        memberName: memberName || t("g_6745df") || "\uD68C\uC6D0",
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
        message: t("g_e44766") || "\uC8C4\uC1A1\uD574\uC694, \uC7A0\uC2DC \uC5F0\uACB0\uC774 \uACE0\uB974\uC9C0 \uC54A\uB124\uC694. \uACC4\uC18D \uB300\uD654\uD574\uBCFC\uAE4C\uC694?",
        options: [t("g_858158") || "\uB124, \uC88B\uC544\uC694", t("g_242fb0") || "\uADF8\uB0E5 \uC2DC\uC791\uD560\uAC8C\uC694"]
      });
    } finally {
      if (requestId === currentRequestIdRef.current) {
        setIsAILoading(false);
        setAiRequestLock(false);
      }
    }
  }, [aiRequestLock, memberName, selectedIntention, playAudio, ttcEnabled, speak, setAiLatency]);
  const handleChatResponse = useCallback(async answer => {
    if (!answer || aiRequestLock) return;
    stopAllAudio();
    if (answer === (t("g_7bee58") || "\uD648\uC73C\uB85C \uAC00\uAE30")) {
      if (onExit) onExit();
      return;
    }
    if (currentAIChat?.isFinalAnalysis || [t("g_93949f") || "\uB124, \uC2DC\uC791\uD560\uAC8C\uC694", t("g_37396e") || "\uB9DE\uCDA4 \uBA85\uC0C1 \uC2DC\uC791\uD558\uAE30", t("g_12daec") || "\uBA85\uC0C1\uD558\uACE0 \uC2F6\uC5B4\uC694", t("g_80cfa5") || "\uC2DC\uC791\uD560\uAC8C\uC694", t("g_abcda1") || "\uBA85\uC0C1 \uC2DC\uC791", t("g_747d3d") || "\uBA85\uC0C1 \uC2DC\uC791\uD558\uAE30"].some(trigger => answer.includes(trigger))) {
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
      const isFallback = aiText?.includes(t("g_629e3c") || "\uC5F0\uACB0\uC774 \uB2A6\uC5B4\uC9C0\uB124\uC694") || aiText?.includes(t("g_f43cd6") || "\uC5F0\uACB0\uC774 \uACE0\uB974\uC9C0 \uC54A\uB124\uC694");
      if (aiText && !isFallback) {
        updatedHistory = [...updatedHistory, {
          role: 'model',
          content: aiText
        }];
      }
    }
    const isRespondingToFallback = currentAIChat?.message?.includes(t("g_629e3c") || "\uC5F0\uACB0\uC774 \uB2A6\uC5B4\uC9C0\uB124\uC694") || currentAIChat?.message?.includes(t("g_f43cd6") || "\uC5F0\uACB0\uC774 \uACE0\uB974\uC9C0 \uC54A\uB124\uC694");
    if (!isRespondingToFallback) {
      updatedHistory = [...updatedHistory, {
        role: 'user',
        content: answer
      }];
    }
    setChatHistory(updatedHistory);
    setCurrentAIChat(null);
    setIsAILoading(true);
    await fetchAIQuestion(updatedHistory);
  }, [aiRequestLock, currentAIChat, chatHistory, stopAllAudio, onExit, onMeditationReady, fetchAIQuestion]);
  const handleManualSubmit = useCallback(e => {
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
      options: [t("g_d7fbec") || "\uB124, \uC788\uC5B4\uC694", t("g_249065") || "\uAD1C\uCC2E\uC544\uC694, \uBA85\uC0C1\uD560\uAC8C\uC694"]
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
        mode: activeMode?.id === 'breath' ? '3min' : activeMode?.id === 'calm' ? '7min' : '15min',
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
        type: 'feedback_message',
        memberName: memberName,
        sessionInfo: sessionInfo,
        postureFeedback: customSummary,
        stabilityScore: stabilityScore
      });
      if (result.data) {
        const data = result.data;
        const points = data.feedbackPoints || [];
        // API might return message as well
        const rawMsg = data.message ? data.message + '\n\n' + points.join('\n') : points.join('\n');
        setFeedbackData({
          message: rawMsg ? rawMsg.replace(/OO님/g, `${memberName}님`) : t("g_691ffa") || "\uBA85\uC0C1 \uAD00\uCC30 \uC77C\uC9C0\uAC00 \uC900\uBE44\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.",
          analysis: data.analysis
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
    const timeText = time === 'morning' ? t("g_6acb87") || "\uD558\uB8E8\uB97C \uC2DC\uC791\uD558\uB294 \uC544\uCE68," : time === 'afternoon' ? t("g_8e3a90") || "\uC5D0\uB108\uC9C0\uAC00 \uD544\uC694\uD55C \uC624\uD6C4," : t("g_d545af") || "\uD558\uB8E8\uB97C \uC815\uB9AC\uD558\uB294 \uBC24,";
    let coreMessage = "\uB2F9\uC2E0\uC758 \uC9C0\uAE08 \uC0C1\uD0DC\uC5D0 \uB531 \uB9DE\uB294 \uBA85\uC0C1\uC744 \uC900\uBE44\uD588\uC5B4\uC694. \uB9C8\uC74C\uC758 \uC18C\uB9AC\uC5D0 \uADC0\uB97C \uAE30\uC6B8\uC774\uBA70 \uD3B8\uC548\uD558\uAC8C \uC2DC\uC791\uD574\uBCFC\uAE4C\uC694?";
    if (diagnosisId === 'stress' || diagnosisId === 'overthink') {
      coreMessage = "\uBCF5\uC7A1\uD55C \uC0DD\uAC01\uC740 \uB1CC\uC758 \uBCA0\uD0C0\uD30C \uACFC\uC789 \uC0C1\uD0DC\uC77C \uC218 \uC788\uC5B4\uC694. \uC9C0\uAE08 \uC774 \uC21C\uAC04, \uBAA8\uB4E0 \uD310\uB2E8\uC744 \uBA48\uCD94\uACE0 \uC81C \uC548\uB0B4\uB97C \uB530\uB77C \uD638\uD761\uC758 \uD30C\uB3C4\uC5D0 \uBAB8\uC744 \uB9E1\uACA8\uBCF4\uC138\uC694. \uACE7 \uBA38\uB9BF\uC18D\uC774 \uB9D1\uC544\uC9C8 \uAC70\uC608\uC694.";
    } else if (diagnosisId === 'stiff') {
      coreMessage = "\uBAB8\uC758 \uAE34\uC7A5\uC740 \uB9C8\uC74C\uC774 \uBCF4\uB0B4\uB294 \uC2E0\uD638\uC608\uC694. \uAD73\uC5B4\uC788\uB358 \uADFC\uC721\uC744 \uC758\uC2DD\uC801\uC73C\uB85C \uC774\uC644\uD558\uBA70 \uD638\uD761\uD558\uBA74, \uB9C9\uD614\uB358 \uC5D0\uB108\uC9C0\uAC00 \uD750\uB974\uAE30 \uC2DC\uC791\uD560 \uAC70\uC608\uC694.";
    } else if (diagnosisId === 'anxious' || diagnosisId === 'frustrated') {
      coreMessage = "\uB2F5\uB2F5\uD558\uACE0 \uBD88\uC548\uD55C \uB9C8\uC74C\uC740 \uB204\uAD6C\uB098 \uAC00\uC9C8 \uC218 \uC788\uB294 \uAD6C\uB984 \uAC19\uC740 \uAC70\uC608\uC694. \uADF8 \uAD6C\uB984 \uB4A4\uC5D0 \uC788\uB294 \uB9D1\uC740 \uD558\uB298\uC744 \uBCFC \uC218 \uC788\uB3C4\uB85D \uC81C\uAC00 \uACC1\uC5D0\uC11C \uB3C4\uC640\uB4DC\uB9B4\uAC8C\uC694. \uB2F9\uC2E0\uC740 \uC548\uC804\uD569\uB2C8\uB2E4.";
    } else if (diagnosisId === 'tired' || diagnosisId === 'low_energy') {
      coreMessage = "\uC5D0\uB108\uC9C0\uAC00 \uBD80\uC871\uD560 \uB54C\uB294 \uC5B5\uC9C0\uB85C \uB178\uB825\uD560 \uD544\uC694 \uC5C6\uC5B4\uC694. \uADF8\uC800 \uD3B8\uC548\uD788 \uC549\uC544 \uC788\uB294 \uAC83\uB9CC\uC73C\uB85C\uB3C4 \uCDA9\uBD84\uD55C \uBA85\uC0C1\uC774 \uB429\uB2C8\uB2E4. \uB2F9\uC2E0\uC758 \uC9C0\uCE5C \uB9C8\uC74C\uC744 \uB530\uB73B\uD558\uAC8C \uC548\uC544\uC904\uAC8C\uC694.";
    } else if (diagnosisId === 'distracted') {
      coreMessage = "\uD769\uC5B4\uC9C4 \uB9C8\uC74C\uC744 \uD558\uB098\uB85C \uBAA8\uC73C\uB294 \uC5F0\uC2B5\uC744 \uD574\uBCFC\uAE4C\uC694? \uD638\uD761\uC774\uB77C\uB294 \uB2FB\uC744 \uB0B4\uB9AC\uACE0 '\uC9C0\uAE08 \uC5EC\uAE30'\uB85C \uB3CC\uC544\uC624\uB294 \uC5EC\uC815\uC744 \uC2DC\uC791\uD574\uBD10\uC694.";
    }
    return `${timeText} ${coreMessage}`;
  }, []);
  return {
    isAILoading,
    setIsAILoading,
    aiRequestLock,
    setAiRequestLock,
    aiLatency,
    setAiLatency,
    chatHistory,
    setChatHistory,
    currentAIChat,
    setCurrentAIChat,
    manualInput,
    setManualInput,
    aiPrescription,
    setAiPrescription,
    prescriptionReason,
    setPrescriptionReason,
    aiMessage,
    setAiMessage,
    sessionInfo,
    setSessionInfo,
    feedbackData,
    setFeedbackData,
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