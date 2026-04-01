import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { MEDITATION_MODES, INTERACTION_TYPES, DIAGNOSIS_OPTIONS, WEATHER_OPTIONS, AMBIENT_SOUNDS, MEDITATION_INTENTIONS, MEDITATION_CATEGORIES } from '../constants/meditationConstants';

// 🤖 AI Posture Analysis (MediaPipe) - Loaded Dynamically
// import { Pose } from '@mediapipe/pose'; // REMOVED: Dynamic import used instead
// import * as tf from '@tensorflow/tfjs-core'; // REMOVED: Dynamic import used instead
// import '@tensorflow/tfjs-backend-webgl'; // REMOVED: Dynamic import used instead

import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer';
import { useMeditationAudio } from '../hooks/useMeditationAudio';
import { useMeditationAI } from '../hooks/useMeditationAI';
import { useWeatherAwareness } from '../hooks/useWeatherAwareness';
import { useStudioConfig } from '../contexts/StudioContext';

// ✅ Typewriter Component for smooth text appearance
const TypewriterText = ({ text, speed = 40 }) => {
    const [displayedText, setDisplayedText] = useState('');
    
    useEffect(() => {
        setDisplayedText('');
        if (!text) return;
        
        // Simple internal state to prevent StrictMode double-fire issues on refs
        let index = 0;
        let isCancelled = false;
        
        const interval = setInterval(() => {
            if (isCancelled) return;
            
            setDisplayedText(text.slice(0, index + 1));
            index++;
            
            if (index >= text.length) {
                clearInterval(interval);
            }
        }, speed);
        
        return () => {
            isCancelled = true;
            clearInterval(interval);
        };
    }, [text, speed]);
    
    return <span>{displayedText || '...'}</span>;
};

import { FeedbackView } from '../components/meditation/ui/FeedbackView';
import { PreparationView } from '../components/meditation/views/PreparationView';
import { InitialPrepView } from '../components/meditation/views/InitialPrepView';
import { IntentionView } from '../components/meditation/views/IntentionView';
import { DiagnosisChatView } from '../components/meditation/views/DiagnosisChatView';
import { WeatherView, DiagnosisManualView } from '../components/meditation/views/WeatherView';
import { PrescriptionWizardView } from '../components/meditation/views/PrescriptionWizardView';
import { ActiveSessionView } from '../components/meditation/views/ActiveSessionView';
import { Wind, Brain, Microphone, VideoCamera, Heartbeat, SmileySad, Lightning, Barbell, Sparkle, Sun, CloudRain,
    CloudSnow, Cloud
} from '../components/CommonIcons';
import { getKSTHour } from '../utils/dates';

const ICON_MAP = {
    Wind, Brain, Sparkle, Microphone, VideoCamera, Lightning, Barbell, Heartbeat, SmileySad, Sun, CloudRain, CloudSnow, Cloud
};

// Initialize Firebase Functions
const generateMeditationGuidance = httpsCallable(functions, 'generateMeditationGuidance');

const SELECTED_DIAGNOSIS_FALLBACK = DIAGNOSIS_OPTIONS[0];


const MeditationPage = ({ onClose }) => {
    const { config } = useStudioConfig();
    const navigate = useNavigate();
    
    // Stable Refs for cleanup without re-triggering effects
    const cameraStreamRef = useRef(null);
    const isPlayingRef = useRef(false); // ✅ 세션 활성 상태 추적 Ref (비동기 콜백용)
    const [step, setStep] = useState('initial_prep'); // ✅ 알림 끄기 체크부터 시작
    
    // Context State
    const [timeContext, setTimeContext] = useState('morning');
    const { weatherContext, setWeatherContext, detectWeather } = useWeatherAwareness();
    const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
    const [selectedIntention, setSelectedIntention] = useState(null); // ✅ 선택한 의도
    const [selectedCategory, setSelectedCategory] = useState(null); // ✅ 선택한 카테고리 (비움/채움)

    // Session Settings
    const [activeMode, setActiveMode] = useState(null); 
    const [interactionType, setInteractionType] = useState('v1');
    
    // 🎨 Visual Theme (Randomized)
    const [visualTheme, setVisualTheme] = useState('heartbeat'); 
    
    useEffect(() => {
        const themes = ['heartbeat', 'candle', 'rain', 'snow'];
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        setVisualTheme(randomTheme);
        console.log(`🎨 [Visual Theme] Selected: ${randomTheme}`);
    }, []);

    const [isPlaying, setIsPlaying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [soundEnabled, setSoundEnabled] = useState(true); 
    const [ttcEnabled, setTtcEnabled] = useState(true); // TTC (Text To Calm) Voice Guidance - Default ON
    const [selectedAmbient, setSelectedAmbient] = useState('rain'); // 🎵 Default to 'rain' (User Request: Calm music from start)
    const [audioVolumes, setAudioVolumes] = useState({
        voice: 0.8,    // 🗣️ 음성 안내 (우선순위 1)
        ambient: 0.35, // 🌊 환경음 (배경)
        binaural: 0.1  // 🎵 바이노랄 비트 (잠재의식 - 음량 낮춤)
    });
    
    // Audio/Video State
    const { micVolume, setupAudioAnalysis, stopAudioAnalysis, pauseAudioAnalysis, resumeAudioAnalysis } = useAudioAnalyzer();

    const [permissionError, setPermissionError] = useState(null);
    const [cameraStream, setCameraStream] = useState(null);
    const [showVolumePanel, setShowVolumePanel] = useState(false); // ✅ Phase 3: 볼륨 컨트롤 패널
    const [showVolumeHint, setShowVolumeHint] = useState(false); // ✅ 볼륨 힌트 토스트

    // 🤖 REAL-TIME AI States
    const [memberName] = useState(() => {
        try {
            const stored = localStorage.getItem('member');
            if (stored) {
                const member = JSON.parse(stored);
                return member.name || "회원";
            }
        } catch (e) {
            console.warn("Failed to load member name", e);
        }
        return "회원";
    });

    // 🛠️ DEBUG MODE STATES (User Request)
    const [isDebugMode, setIsDebugMode] = useState(false); // ✅ Default to false (User: Record internally only)
    const [, setDebugClickCount] = useState(0);
    const [ttsState, setTtsState] = useState({ isSpeaking: false, engine: 'None', volume: 0 });

    const handleDebugToggle = useCallback(() => {
        setDebugClickCount(prev => {
            const next = prev + 1;
            if (next >= 5) {
                setIsDebugMode(v => !v);
                return 0;
            }
            return next;
        });
    }, []);

    // 🛠️ DEBUG LOGGING SYSTEM (User Request)
    const logDebug = useCallback((action, data) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`%c[MeditationDebug] ${timestamp} [${action}]`, 'color: #00ffff; font-weight: bold;', data || '');
    }, []);

    // ✅ Extract Audio System hook
    const {
        audioContextRef,
        ambientAudioRef,
        currentAudioRef,
        getAudioContext,
        playBinauralBeats,
        stopBinauralBeats,
        updateBinauralVolume,
        playAmbientMusic,
        stopAmbientMusic,
        stopAmbientMusicAndReset,
        updateAmbientVolume,
        playAudio,
        speak,
        speakFallback,
        stopVoiceOnly,
        stopAllAudio
    } = useMeditationAudio(ttcEnabled, isPlayingRef, step, logDebug, setTtsState, audioVolumes, soundEnabled);

    const {
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

        
        messageIndexRef, sessionDiagnosisRef, consecutiveFailsRef,

        fetchAIPrescription, fetchAIQuestion, fetchAISessionMessage, fetchAIFeedback,
        handleChatResponse, handleManualSubmit, handleReturnToChat, generateReason
    } = useMeditationAI({
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
        onExit: () => { stopAllAudio(); if (onClose) onClose(); else navigate('/'); },
        onMeditationReady: (diag, defaultMode, intType) => {
            stopAllAudio();
            setSelectedDiagnosis(diag);
            setActiveMode(defaultMode);
            setTimeLeft(defaultMode.time);
            setInteractionType(intType);
            setStep('interaction_select');
        }
    });
    
    const [lastSpokenMessage, setLastSpokenMessage] = useState(""); // debug overlay용
    
    // 🌊 Dynamic Options State (AI Generated)
    const [dynamicCategories, setDynamicCategories] = useState(MEDITATION_CATEGORIES);
    const [dynamicIntentions, setDynamicIntentions] = useState(MEDITATION_INTENTIONS);
    const [isOptionsLoading, setIsOptionsLoading] = useState(false); // ✅ 즉시 시작 (CF 호출 제거)

    // [MOVED TO TOP] Debug & Audio Hooks
    // 🧘 Preparation Flow States
    const [prepStep, setPrepStep] = useState(1); 
    
    // ✅ Log Step Change for shared visibility
    useEffect(() => {
        logDebug("StepChange", { step, prepStep });
    }, [step, prepStep]);

    const [prepSelections, setPrepSelections] = useState({
        notified: false,
        posture: 'chair', // 'chair', 'floor', 'lying'
        goal: null
    });

    // 🌊 [최적화] TimeContext만 계산 — options_refresh CF 호출 + 강제 2초 대기 제거
    useEffect(() => {
        logDebug("Mount", { step, prepStep });
        const hour = getKSTHour();
        const tCtx = (hour >= 5 && hour < 11) ? 'morning' : 
                     (hour >= 18 || hour < 5) ? 'evening' : 'day';
        setTimeContext(tCtx);
        logDebug("TimeContext", { tCtx });
    }, []);



    // V3 Pose States
    const [, setPoseData] = useState(null); // 실시간 자세 데이터
    const [, setIsPoseLoading] = useState(false);
    const [, setAlignmentScore] = useState(100); // 0-100 정렬 점수
    
    // Canvas Refs for Golden Skeleton
    const canvasRef = useRef(null);
    const poseRef = useRef(null); // MediaPipe Pose Instance Ref

    // Refs
    const timerRef = useRef(null);
    const messageIntervalRef = useRef(null);
    const videoRef = useRef(null);
    const chatEndRef = useRef(null); // Fixed: Missing Ref
    
    // [MOVED TO TOP] Extra Audio System hooks
    // Stop Session (useCallback for stability - removed stream dependency to fix V3 crash)
    const stopSession = useCallback((stopAmbient = false) => {
        // 🛑 STOP AI AUDIO (Fixed Bug)
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
            currentAudioRef.current = null; 
        }

        clearInterval(timerRef.current); 
        clearInterval(messageIntervalRef.current);
        // Stop Audio Analyzer Hook
        stopAudioAnalysis();
        
        // Use Global Audio Manager
        stopAllAudio(stopAmbient);
        
        // Use Ref for camera cleanup
        if (cameraStreamRef.current) { 
            cameraStreamRef.current.getTracks().forEach(track => track.stop()); 
            cameraStreamRef.current = null;
            setCameraStream(null); 
        }

        if (audioContextRef.current) { audioContextRef.current.close().catch(e => console.error(e)); audioContextRef.current = null; }

        if (poseRef.current) {
            poseRef.current.close(); 
            poseRef.current = null;
        }

        // ✅ Save session info before clearing (for feedback AI)
        const currentMode = activeMode;
        const currentDiag = selectedDiagnosis;
        const elapsedTime = currentMode ? (currentMode.time - timeLeft) : 0;
        
        setIsPlaying(false);
        isPlayingRef.current = false; // ✅ Ref 업데이트
        setStep('diagnosis');
        setPrepStep(1); // Reset prep
        
        // Save session info for feedback
        if (currentMode) {
            setSessionInfo({
                mode: currentMode.id,
                modeName: currentMode.label,
                duration: elapsedTime,
                diagnosis: currentDiag?.id
            });
        }
        
        // ✅ [FIX] 모든 세션 상태 초기화 (텍스트 불일치 방지)
        setActiveMode(null);
        setSelectedDiagnosis(null);
        setSelectedIntention(null);
        setSelectedCategory(null);
        setChatHistory([]);
        setIsAILoading(false); 
        console.log("🛑 stopSession: step to diagnosis");
        setAiMessage("");
        setPrescriptionReason('');
        setWeatherContext(null);
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }, [activeMode, selectedDiagnosis, timeLeft, stopAudioAnalysis]); 

    // 🔍 Stability Analysis Refs
    const stabilityHistoryRef = useRef([]); // Stores {score, timestamp}
    const postureIssuesRef = useRef(new Set()); // Stores detected issues (e.g., "leaning_left")

    // 🦴 Draw Skeleton on Canvas (V3)
    const onPoseResults = useCallback((results) => {
        if (!results.poseLandmarks || !canvasRef.current || !videoRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        
        ctx.clearRect(0, 0, width, height);
        
        // 🎨 Draw Golden Skeleton
        ctx.strokeStyle = config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'; // Gold
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(var(--primary-rgb), 0.5)';

        const drawLine = (p1, p2) => {
            if (!p1 || !p2 || p1.visibility < 0.5 || p2.visibility < 0.5) return;
            ctx.beginPath();
            ctx.moveTo(p1.x * width, p1.y * height);
            ctx.lineTo(p2.x * width, p2.y * height);
            ctx.stroke();
        };

        const landmarks = results.poseLandmarks;
        
        // Body Links (Simplified for Meditation)
        drawLine(landmarks[11], landmarks[12]); // Shoulders
        drawLine(landmarks[11], landmarks[23]); // Left Torso
        drawLine(landmarks[12], landmarks[24]); // Right Torso
        drawLine(landmarks[23], landmarks[24]); // Hips
        drawLine(landmarks[11], landmarks[13]); // Left Arm
        drawLine(landmarks[13], landmarks[15]);
        drawLine(landmarks[12], landmarks[14]); // Right Arm
        drawLine(landmarks[14], landmarks[16]);
        
        // Head (Simplified circle)
        const nose = landmarks[0];
        if (nose && nose.visibility > 0.5) {
            ctx.beginPath();
            ctx.arc(nose.x * width, nose.y * height, 10, 0, 2 * Math.PI);
            ctx.stroke();
        }

        // 🧠 REAL-TIME STABILITY CALCULATION
        if (nose && landmarks[11] && landmarks[12]) {
            const leftShoulder = landmarks[11];
            const rightShoulder = landmarks[12];
            
            // 1. Calculate Center of Shoulders
            const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
            
            // 2. Calculate Deviation (Nose vs Shoulder Center) - checks for leaning/sway
            const deviation = Math.abs(nose.x - shoulderCenterX);
            
            // 3. Vertical alignment (Head drop check)
            const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
            const neckLength = Math.abs(nose.y - shoulderY);
            
            // 4. Score Calculation (0-100) - Simple inverse mapping
            // Deviation > 0.1 is bad, < 0.02 is excellent
            let currentScore = Math.max(0, 100 - (deviation * 500));
            
            // 5. Detect Issues
            if (deviation > 0.08) {
                if (nose.x < shoulderCenterX) postureIssuesRef.current.add("leaning_right"); // Mirrored
                else postureIssuesRef.current.add("leaning_left");
            }
            if (neckLength < 0.15) { // Threshold depends on camera distance, heuristic
                postureIssuesRef.current.add("head_drop");
            }

            // 6. Smooth & Store
            setAlignmentScore(prev => Math.round(prev * 0.9 + currentScore * 0.1));
            stabilityHistoryRef.current.push({ score: currentScore, timestamp: Date.now() });

            // Keep history manageable (last 5 mins max @ ~30fps is too much, keep last 1000 points?)
            if (stabilityHistoryRef.current.length > 1000) stabilityHistoryRef.current.shift();
        }

        setPoseData(landmarks);
    }, []);

    // 🤖 AI Pose Initializer - DYNAMIC IMPORT
    const initPoseEngine = useCallback(async () => {
        if (!videoRef.current || poseRef.current) return;
        
        setIsPoseLoading(true);
        try {
            console.log("⏳ Loading AI Libraries Dynamically...");
            
            // DYNAMIC IMPORTS
            const [{ Pose }, tf, tfBackend] = await Promise.all([
                import('@mediapipe/pose'),
                import('@tensorflow/tfjs-core'),
                import('@tensorflow/tfjs-backend-webgl')
            ]);
            
            console.log("✅ AI Libraries Loaded!");

            const pose = new Pose({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@latest/${file}`,
            });

            pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            pose.onResults(onPoseResults);
            poseRef.current = pose;
            
            // Start detection loop
            const detectFrame = async () => {
                if (videoRef.current && poseRef.current && isPlaying) {
                    await poseRef.current.send({ image: videoRef.current });
                    if (isPlaying) requestAnimationFrame(detectFrame);
                }
            };
            detectFrame();

        } catch (error) {
            console.error("❌ Failed to load AI libraries:", error);
            setPermissionError("AI 엔진 로딩에 실패했습니다. 네트워크를 확인해주세요.");
        } finally {
            setIsPoseLoading(false);
        }
    }, [onPoseResults, isPlaying]);


    // Initial Load with Auto Weather Detection
    // ==========================================
    // 🤖 REAL-TIME AI API CALLS (Hoisted Helpers - TDZ Fix)
    // ==========================================
    // ✅ stopAllAudio를 useRef로 저장하여 순환 참조 방지
    // ✅ NEW: Stop Voice Only (preserves ambient & binaural)
    const stopVoiceOnlyRef = useRef(null);
    stopVoiceOnlyRef.current = () => {
         if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
         // Cloud TTS Audio
         if (currentAudioRef.current) {
            try { currentAudioRef.current.pause(); currentAudioRef.current.currentTime = 0; } catch { /* ignore */ }
            currentAudioRef.current = null;
        }
    };

    const stopSessionRef = useRef(stopSession);
    useEffect(() => { stopSessionRef.current = stopSession; }, [stopSession]);

    // 🤖 Cleanup on Unmount — [최적화] timeContext 중복 계산 제거
    useEffect(() => {
        detectWeather();
        return () => { stopSessionRef.current(); };
    }, []);

    // 🧠 Initial AI Question Load: Immediate Fetch (All AI)
    useEffect(() => {
        // [FIX] Removed !isAILoading ensure fetch triggers even if initialized as loading
        if (step === 'diagnosis' && chatHistory.length === 0 && !currentAIChat) {
             fetchAIQuestion(); 
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, chatHistory.length]);

    // Removed Session End Feedback Greeting as per user request (returning to Home instead)


    useEffect(() => {
        if (cameraStream && videoRef.current) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [cameraStream]);

    useEffect(() => {
        // 1. Binaural Beats Volume
        updateBinauralVolume(soundEnabled ? audioVolumes.binaural : 0);
        // 2. Ambient Audio Volume
        updateAmbientVolume(soundEnabled ? audioVolumes.ambient : 0);
    }, [soundEnabled, audioVolumes, updateBinauralVolume, updateAmbientVolume]);

    // 🎵 Global Ambient Audio Manager (Removed useEffect to fix Autoplay policy)
    // Ambient sound is now triggered directly inside startSession, togglePlay, and stopSession.





    const startMessageLoop = () => {
        if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
        
        // ⚡ 연속 폴백 재시도 횟수 리셋
        consecutiveFailsRef.current = 0;
        
        // First message - try AI
        fetchAISessionMessage();
        
        // ⚡ 동적 간격: 기본 20초, 연속 실패 시 35초로 늘림
        messageIntervalRef.current = setInterval(() => {
            // 연속 실패 3회 이상이면 간격 자동 증가
            if (consecutiveFailsRef.current >= 3) {
                clearInterval(messageIntervalRef.current);
                console.log('[Session] AI 연속 실패 — 35초 간격으로 전환');
                messageIntervalRef.current = setInterval(() => {
                    fetchAISessionMessage();
                }, 35000);
            }
            fetchAISessionMessage();
        }, 20000);
    };

    // 🗣️ TTS Wrapper (Consolidated)
    // Removed auto-speak useEffect to prevent duplicate audio with Cloud TTS

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (step === 'diagnosis' && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, isAILoading, currentAIChat, step]);



    // --- Flow Handlers ---
    const handleDiagnosisSelect = async (option) => {
        setSelectedDiagnosis(option);
        
        // Get mode from diagnosis prescription
        const mode = MEDITATION_MODES.find(m => m.id === option.prescription.modeId);
        const intType = option.prescription.type;
        
        setActiveMode(mode);
        setInteractionType(intType);
        
        // Weather is already auto-detected - use it directly
        const weather = weatherContext || { id: 'sun', temp: 20, humidity: 50 };
        
        // Set fallback reason first
        const fallbackReason = generateReason(timeContext, weather.id, option.id);
        setPrescriptionReason(fallbackReason);
        
        // Then fetch real-time AI prescription
        fetchAIPrescription(option.id, weather.id, mode.id, intType, "");
        
        // Skip weather step - go directly to prescription
        setStep('prescription');
    };

    const handleWeatherSelect = async (weatherOption) => {
        setWeatherContext(weatherOption);
        
        // Get AI prescription mode from diagnosis
        const mode = MEDITATION_MODES.find(m => m.id === selectedDiagnosis.prescription.modeId);
        const intType = selectedDiagnosis.prescription.type;
        
        setActiveMode(mode);
        setInteractionType(intType);
        
        // Set local fallback first
        const fallbackReason = generateReason(timeContext, weatherOption.id, selectedDiagnosis.id);
        setPrescriptionReason(fallbackReason);
        
        // Then try to get real-time AI prescription (async, will update if successful)
        fetchAIPrescription(selectedDiagnosis.id, weatherOption.id, mode.id, intType, "");
        
        setStep('prescription');
    };



    const startFromPrescription = () => {
         logDebug("Flow:StartFromPrescription");
         setStep('preparation');
         setPrepStep(3); // ✅ Start with Posture Guide (New Flow)
    };

    // --- Session Logic ---
    const startSession = async (mode) => {
        setStep('session');
        setPermissionError(null);
        
        // ✅ FIX: 세션 시작 시 진단 정보와 인덱스를 ref에 저장
        sessionDiagnosisRef.current = selectedDiagnosis?.id || null;
        messageIndexRef.current = 0;

        
        // ✅ 볼륨 조절 힌트 토스트 표시 (첫 세션)
        setShowVolumeHint(true);
        setTimeout(() => setShowVolumeHint(false), 5000);
        
        const audioCtx = getAudioContext();

        // 🔊 Always ensure AudioContext is ACTIVE
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        // Binaural Beats
        const initialVolume = soundEnabled ? audioVolumes.binaural : 0;
        playBinauralBeats(200, mode.freq, initialVolume);

        // Sensors
        if (interactionType === 'v2') {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
                });
                setupAudioAnalysis(stream, audioCtx);
            } catch (err) {
                console.error("Mic Error:", err);
                setPermissionError("마이크 권한이 필요합니다.");
                stopSession();
                return;
            }
        } else if (interactionType === 'v3') {
            try {
                // AudioContext resumed above already
                
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                cameraStreamRef.current = stream; // Update Ref
                setCameraStream(stream);
                initPoseEngine(); // Call (MOCKED) engine
            } catch (err) {
                console.error("Camera Error:", err);
                setPermissionError("카메라 권한이 필요합니다. 설정에서 카메라 접근을 허용해주세요.");
                // Give user a moment to see the error before stopping
                setTimeout(() => stopSession(), 3000);
                return;
            }
        }

        // 🎵 Ambient Sound - TRIGGERS DIRECTLY ON USER CLICK to bypass browser Autoplay blocks
        if (selectedAmbient !== 'none' && soundEnabled) {
            const ambientDef = AMBIENT_SOUNDS.find(s => s.id === selectedAmbient);
            playAmbientMusic(ambientDef, audioVolumes.ambient);
            console.log(`🎵 [Audio] Playing Ambient '${selectedAmbient}'`);
        }


        setTimeLeft(mode.time);
        setIsPlaying(true);
        isPlayingRef.current = true; // ✅ Misting Ref Update Fix

        // ✨ Opening Message - Phase 4 Pre-intro Logic
        // ✨ Opening Message - Phase 4 Pre-intro Logic
        const getPreIntro = () => {
             if (selectedIntention?.label) {
                 return `선택하신 '${selectedIntention.label}'을(를) 마음에 품고, 평온한 시간을 시작합니다.`;
             }
             return "숨을 깊게 들이마시고 내쉬며, 당신만의 평온한 시간을 시작합니다.";
        };
        
        const introMessage = getPreIntro();
        setAiMessage(introMessage);
        
        
        // ✅ TTC Voice for Pre-intro - Cloud TTS (High Quality)
        if (ttcEnabled) {
            (async () => {
                try {
                    const introTTS = await generateMeditationGuidance({
                        type: 'session_message',
                        memberName: memberName,
                        timeContext: timeContext,
                        message: introMessage,
                        messageIndex: 0
                    });
                    
                    // ✅ [FIX] 비동기 응답 후 세션이 여전히 활성 상태인지 확인
                    if (isPlayingRef.current) {
                        if (introTTS.data?.message) {
                            // ✅ AI가 새로운 메시지를 줬다면 화면 텍스트도 동기화 (텍스트 불일치 해결)
                            const finalIntroMsg = introTTS.data.message.replace(/OO님/g, `${memberName}님`);
                            setAiMessage(finalIntroMsg);
                        }

                        if (introTTS.data?.audioContent) {
                            playAudio(introTTS.data.audioContent);
                        } else {
                            // Fallback: Browser TTS
                            speak(introMessage);
                        }
                    }
                } catch (err) {
                    console.error('Intro TTS failed:', err);
                    if (isPlayingRef.current) speak(introMessage);
                }
            })();
        }
        
        startTimer();
        
        // Delay the first AI session message to let pre-intro breathe
        setTimeout(() => {
            startMessageLoop();
        }, 8000);
    };



    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) { completeSession(); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const togglePlay = () => {
        if (isPlaying) {
            clearInterval(timerRef.current); clearInterval(messageIntervalRef.current);
            if (audioContextRef.current) audioContextRef.current.suspend();
            pauseAudioAnalysis();
            if (videoRef.current) videoRef.current.pause();
            stopAmbientMusic(); // 🎵 환경음 중지
            setIsPlaying(false);
            isPlayingRef.current = false; // ✅ Ref 업데이트
        } else {
            setIsPlaying(true); 
            isPlayingRef.current = true; // ✅ Ref 업데이트
            startTimer(); startMessageLoop();
            if (audioContextRef.current) audioContextRef.current.resume();
            if (interactionType === 'v2') resumeAudioAnalysis();
            if (videoRef.current) videoRef.current.play();
            
            // 🎵 환경음 재개
            if (selectedAmbient !== 'none' && soundEnabled) {
                const ambientDef = AMBIENT_SOUNDS.find(s => s.id === selectedAmbient);
                playAmbientMusic(ambientDef, audioVolumes.ambient);
            }
        }
    };

    // State for Analysis Transition
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const finishAnalysis = useCallback((forceStart = false) => {
        setIsAnalyzing(true);
        // Clean up chat loop
        if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
        
        // ✨ AI's empathetic/regret message when user chooses quick start
        if (forceStart && chatHistory.length < 3) {
            const regretMessages = [
                "조금 아쉽지만, 괜찮아요. 지금 느끼신 그대로 시작해볼게요. 🙏",
                "더 대화하고 싶었지만, 지금 이 순간도 소중해요. 함께해요.",
                "마음이 급하시군요. 괜찮아요, 지금 바로 평온함으로 안내할게요."
            ];
            const randomMsg = regretMessages[Math.floor(Math.random() * regretMessages.length)];
            setChatHistory(prev => [...prev, { role: 'model', content: randomMsg }]);
            
            // Speak the regret message if TTS is enabled
            if (ttcEnabled) {
                speak(randomMsg);
            }
        }
        
        // Transition delay for effect (longer to let user see the message)
        setTimeout(() => {
            setIsAnalyzing(false);
            stopSession(true); // Stop background audio if any
            setStep('interaction_select'); // Move to meditation type selection (바디스캔/호흡몰입/자세교정)
        }, forceStart && chatHistory.length < 3 ? 3000 : 2000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatHistory.length, ttcEnabled, speak]);

    const completeSession = () => {
        stopSession(false); // ✅ Keep ambient music playing
        setStep('feedback');
        setIsAILoading(true); // Show loading state in feedback screen

        // 🧠 Calculate V3 Pose Metrics
        let poseMetrics = null;
        if (interactionType === 'v3' && stabilityHistoryRef.current.length > 0) {
            const history = stabilityHistoryRef.current;
            const avgScore = Math.round(history.reduce((acc, curr) => acc + curr.score, 0) / history.length);
            const issues = Array.from(postureIssuesRef.current);
            poseMetrics = {
                stabilityScore: avgScore,
                issues: issues
            };
            console.log("🧘 V3 Pose Analysis Result:", poseMetrics);
        }

        // Generate Post-Session Feedback (Async)
        (async () => {
            try {
                // Determine duration logic for context
                // const duration = activeMode?.time || 300;
                
                const startTime = Date.now();
                const fbResult = await generateMeditationGuidance({
                    type: 'feedback_message',
                    memberName, 
                    timeContext,
                    diagnosis: selectedDiagnosis?.id || 'stress',
                    mode: activeMode?.id || 'calm',
                    poseMetrics: poseMetrics // 👈 NEW
                });
                setAiLatency(Date.now() - startTime);
                
                if (fbResult.data) {
                    // Personalize
                    if (fbResult.data.message) {
                        fbResult.data.message = fbResult.data.message.replace(/OO님/g, `${memberName}님`);
                    }
                    if (fbResult.data.feedbackPoints) {
                        // Assuming backend returns points
                        fbResult.data.feedbackPoints = fbResult.data.feedbackPoints.map(p => p.replace(/OO님/g, `${memberName}님`));
                    }
                    
                    setFeedbackData(fbResult.data);
                    
                    if (fbResult.data.audioContent) {
                        playAudio(fbResult.data.audioContent);
                    } else if (ttcEnabled && fbResult.data.message) {
                        speak(fbResult.data.message);
                    }
                }
            } catch (e) {
                console.error("Feedback Generation Failed:", e);
                // Fallback Feedback
                setFeedbackData({
                    message: `${memberName}님, 오늘 명상으로 마음이 한결 편안해지셨길 바래요.`,
                    feedbackPoints: [
                        "명상을 통해 내면의 고요함을 경험했습니다.",
                        "호흡에 집중하며 현재에 머무르는 연습을 했습니다.",
                        "긴장했던 몸과 마음이 조금 더 이완되었습니다.",
                        "오늘 하루도 평온한 마음으로 이어가세요."
                    ]
                });
            } finally {
                setIsAILoading(false);
            }
        })();
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };


    // ==========================================
    // 🎨 RENDER — View Components
    // ==========================================
    const sharedProps = {
        config, visualTheme, isDebugMode, ttsState, step, setStep, audioVolumes, aiMessage, aiLatency,
        stopAllAudio, onClose, navigate, handleDebugToggle, ttcEnabled, activeMode,
        MEDITATION_MODES, INTERACTION_TYPES, DIAGNOSIS_OPTIONS, AMBIENT_SOUNDS, WEATHER_OPTIONS
    };

    switch (step) {
        case 'initial_prep':
            return <InitialPrepView {...sharedProps} setPrepSelections={setPrepSelections} />;

        case 'intention':
            return <IntentionView {...sharedProps}
                isOptionsLoading={isOptionsLoading} selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory} dynamicCategories={dynamicCategories}
                dynamicIntentions={dynamicIntentions} setSelectedIntention={setSelectedIntention}
                fetchAIQuestion={fetchAIQuestion} lastSpokenMessage={lastSpokenMessage}
                currentAIChat={currentAIChat} />;

        case 'diagnosis':
            return <DiagnosisChatView {...sharedProps}
                isAILoading={isAILoading} setIsAILoading={setIsAILoading} currentAIChat={currentAIChat}
                chatHistory={chatHistory} setChatHistory={setChatHistory} manualInput={manualInput}
                setManualInput={setManualInput} isAnalyzing={isAnalyzing} finishAnalysis={finishAnalysis}
                handleChatResponse={handleChatResponse} handleManualSubmit={handleManualSubmit} chatEndRef={chatEndRef}
                setSelectedDiagnosis={setSelectedDiagnosis} setActiveMode={setActiveMode} setTimeLeft={setTimeLeft}
                setInteractionType={setInteractionType} SELECTED_DIAGNOSIS_FALLBACK={SELECTED_DIAGNOSIS_FALLBACK} />;

        case 'diagnosis_manual':
            return <DiagnosisManualView {...sharedProps} handleDiagnosisSelect={handleDiagnosisSelect} />;

        case 'weather':
            return <WeatherView {...sharedProps} handleWeatherSelect={handleWeatherSelect} />;

        case 'prescription_summary':
        case 'interaction_select':
        case 'prescription':
            return <PrescriptionWizardView {...sharedProps}
                currentAIChat={currentAIChat} prescriptionReason={prescriptionReason}
                setActiveMode={setActiveMode} setTimeLeft={setTimeLeft}
                selectedDiagnosis={selectedDiagnosis} weatherContext={weatherContext}
                setInteractionType={setInteractionType} fetchAIPrescription={fetchAIPrescription}
                setPrepStep={setPrepStep} selectedAmbient={selectedAmbient}
                setSelectedAmbient={setSelectedAmbient} interactionType={interactionType}
                startFromPrescription={startFromPrescription} handleReturnToChat={handleReturnToChat} />;

        case 'preparation':
            return <PreparationView {...sharedProps}
                prepStep={prepStep} setPrepStep={setPrepStep}
                prepSelections={prepSelections} setPrepSelections={setPrepSelections}
                interactionType={interactionType} startSession={startSession} />;

        case 'feedback':
            return <FeedbackView
                activeMode={activeMode} feedbackData={feedbackData} formatTime={formatTime}
                timeLeft={timeLeft} modeName={activeMode?.name || "AI 맞춤 명상"} onClose={onClose}
                visualTheme={visualTheme} isDebugMode={isDebugMode} ttsState={ttsState} step={step}
                audioVolumes={audioVolumes} aiMessage={aiMessage} aiLatency={aiLatency}
                isAILoading={isAILoading} points={feedbackData?.feedbackPoints || []}
                stopAllAudio={stopAllAudio} setAiMessage={setAiMessage} setChatHistory={setChatHistory} />;

        default:
            return <ActiveSessionView {...sharedProps}
                interactionType={interactionType} isPlaying={isPlaying} formatTime={formatTime}
                timeLeft={timeLeft} micVolume={micVolume} permissionError={permissionError}
                completeSession={completeSession} togglePlay={togglePlay}
                showVolumePanel={showVolumePanel} setShowVolumePanel={setShowVolumePanel}
                soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled}
                setAudioVolumes={setAudioVolumes} currentAudioRef={currentAudioRef}
                updateAmbientVolume={updateAmbientVolume} updateBinauralVolume={updateBinauralVolume}
                videoRef={videoRef} canvasRef={canvasRef} showVolumeHint={showVolumeHint} />;
    }
};



export default MeditationPage;
