import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { Icons } from '../components/CommonIcons';
import { MEDITATION_MODES, INTERACTION_TYPES, DIAGNOSIS_OPTIONS, WEATHER_OPTIONS, SPECIALIST_QUESTIONS, AI_SESSION_MESSAGES, AMBIENT_SOUNDS, MEDITATION_INTENTIONS, MEDITATION_CATEGORIES } from '../constants/meditationConstants';

// 🤖 AI Posture Analysis (MediaPipe) - Loaded Dynamically
// import { Pose } from '@mediapipe/pose'; // REMOVED: Dynamic import used instead
// import * as tf from '@tensorflow/tfjs-core'; // REMOVED: Dynamic import used instead
// import '@tensorflow/tfjs-backend-webgl'; // REMOVED: Dynamic import used instead

import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer';
import { useMeditationAudio } from '../hooks/useMeditationAudio';
import { useMeditationAI } from '../hooks/useMeditationAI';
import { useTypewriter } from '../hooks/useTypewriter';
import { useWeatherAwareness } from '../hooks/useWeatherAwareness';
import { AILoadingIndicator } from '../components/meditation/ui/AILoadingIndicator';
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

import { ChatDialog } from '../components/meditation/ui/ChatDialog';
import { PoseCanvas } from '../components/meditation/ui/PoseCanvas';
import { VolumeControlPanel } from '../components/meditation/ui/VolumeControlPanel';
import { FeedbackView } from '../components/meditation/ui/FeedbackView';
import { MeditationDebugOverlay } from '../components/meditation/MeditationDebugOverlay';
import {
    Play, Pause, X, Wind, SpeakerHigh, SpeakerSlash, Brain, Microphone, VideoCamera,
    LockKey, Heartbeat, SmileySad, Lightning, Barbell, Sparkle, Sun, CloudRain,
    CloudSnow, Cloud, User
} from '../components/CommonIcons';
import { storageService } from '../services/storage';

// [HOTFIX] Local ArrowLeft to prevent 'Ar' ReferenceError
const ArrowLeft = ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
        <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" />
    </svg>
);

const ArrowUp = ({ size = 24, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={color} viewBox="0 0 256 256">
        <path d="M213.66,122.34a8,8,0,0,1-11.32,0L136,56v152a8,8,0,0,1-16,0V56L53.66,122.34a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,213.66,122.34Z"></path>
    </svg>
);

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
    const [isOptionsLoading, setIsOptionsLoading] = useState(true); // ✅ Start with meditative loading

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

    // 🌊 Initial AI Options Fetch
    useEffect(() => {
        logDebug("Mount", { step, prepStep });
        
        const fetchOptions = async () => {
            try {
                // Time Context
                const hour = new Date().getHours();
                const tCtx = (hour >= 5 && hour < 11) ? 'morning' : 
                             (hour >= 18 || hour < 5) ? 'evening' : 'day';
                setTimeContext(tCtx);
                logDebug("TimeContext", { tCtx });

                // Fetch Dynamic Options
                logDebug("FetchOptions:Start");
                const startTime = Date.now();
                const result = await generateMeditationGuidance({ 
                    type: 'options_refresh', 
                    timeContext: tCtx,
                    weather: 'unknown' // Client-side weather can be added if needed
                });
                setAiLatency(Date.now() - startTime);
                logDebug("FetchOptions:Result", result.data);

                if (result.data) {
                    if (result.data.categories && Array.isArray(result.data.categories)) {
                        // Merge with constants to keep emojis/IDs but update labels
                        const mergedCats = MEDITATION_CATEGORIES.map(c => {
                            const dyn = result.data.categories.find(d => d.id === c.id);
                            return dyn ? { ...c, label: dyn.label, description: dyn.description } : c;
                        });
                        setDynamicCategories(mergedCats);
                    }
                    if (result.data.intentions && Array.isArray(result.data.intentions)) {
                        const mergedInts = MEDITATION_INTENTIONS.map(i => {
                            const dyn = result.data.intentions.find(d => d.id === i.id);
                            return dyn ? { ...i, label: dyn.label } : i;
                        });
                        setDynamicIntentions(mergedInts);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch dynamic options:", error);
                logDebug("FetchOptions:Error", error);
                // Fallback to constants (already set as default)
            } finally {
                // ✅ Minimum loading time for meditative feel (2s)
                setTimeout(() => setIsOptionsLoading(false), 2000);
            }
        };
        fetchOptions();
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

    // 🤖 Cleanup on Unmount
    useEffect(() => {
        const hour = new Date().getHours();
        let context = 'morning';
        if (hour >= 5 && hour < 12) context = 'morning';
        else if (hour >= 12 && hour < 18) context = 'afternoon';
        else context = 'night';
        
        setTimeContext(context);
        
        // 🌤️ AUTO WEATHER DETECTION
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

    // 🎵 Global Ambient Audio Manager
    useEffect(() => {
        const activeAmbientSteps = ['session'];
        const shouldPlay = (isPlaying || activeAmbientSteps.includes(step)) && soundEnabled;

        if (shouldPlay) {
            const ambientDef = AMBIENT_SOUNDS.find(s => s.id === selectedAmbient);
            playAmbientMusic(ambientDef, audioVolumes.ambient);
        } else {
            stopAmbientMusic();
        }
    }, [selectedAmbient, isPlaying, soundEnabled, audioVolumes.ambient, step, playAmbientMusic, stopAmbientMusic]);





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

        // 🎵 Ambient Sound is now handled by global useEffect
        if (selectedAmbient === 'none') {
             console.log(`🎵 [Audio Debug] No ambient sound selected (mode: 'none')`);
        } else {
             console.log(`🎵 [Audio Debug] Ambient '${selectedAmbient}' managing globally`);
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
            setIsPlaying(false);
            isPlayingRef.current = false; // ✅ Ref 업데이트
        } else {
            setIsPlaying(true); 
            isPlayingRef.current = true; // ✅ Ref 업데이트
            startTimer(); startMessageLoop();
            if (audioContextRef.current) audioContextRef.current.resume();
            if (interactionType === 'v2') resumeAudioAnalysis();
            if (videoRef.current) videoRef.current.play();
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
    // 🎨 RENDER (Refining V3 Overlay Rendering)
    // ==========================================

    // 0. Initial Preparation Step (Notifications Off - First Screen)
    if (step === 'initial_prep') {
        return (
            <div style={{
                position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 9999,
                display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden'
            }}>
                <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                     {/* 🛠️ Debug Overlay */}
                     <MeditationDebugOverlay 
                        isVisible={isDebugMode}
                        ttsState={ttsState}
                        currentStep={step}
                        audioLevels={audioVolumes}
                        currentText={aiMessage}
                        aiLatency={aiLatency}
                    />
                     <div style={{ width: '100%', maxWidth: '350px', animation: 'fadeIn 0.5s ease', textAlign: 'center' }}>
                        <div style={{ marginBottom: '40px' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔕</div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '10px' }}>주변을 고요하게</h3>
                            <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
                                방해받지 않도록 <br/>기기를 &apos;무음&apos; 또는 &apos;방해금지&apos; 모드로 <br/>설정해주셨나요?
                            </p>
                            
                            {/* 🔊 무음 모드 안내 추가 */}
                            <div style={{ 
                                background: 'rgba(76, 155, 251, 0.1)', 
                                border: '1px solid rgba(76, 155, 251, 0.2)',
                                borderRadius: '15px', padding: '15px', marginTop: '10px',
                                textAlign: 'left', fontSize: '0.85rem'
                            }}>
                                <div style={{ color: config.THEME?.PRIMARY_COLOR || '#4c9bfb', fontWeight: 700, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <SpeakerHigh size={14} weight="fill" /> 안심하세요
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                                    &apos;무음&apos;이나 &apos;방해금지&apos; 모드에서도 **명상 가이드와 배경음은 정상적으로 들립니다.** 외부 알림만 차단되니 안심하고 설정해주세요.
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { 
                            setPrepSelections(prev => ({...prev, notified: true})); 
                            setStep('intention'); // Proceed to Category Selection
                        }}
                            style={{
                                width: '100%', background: 'var(--primary-gold)', color: 'black',
                                padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, border: 'none',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>확인했습니다</button>
                    </div>
                </div>
            </div>
        );
    }

    // 0-a. Intention Step (의도 선택 - 2단계 구조)
    if (step === 'intention') {
        // ✅ Meditative Loading Screen
        if (isOptionsLoading) {
             return (
                <div style={{
                    position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 9999,
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
                }}>
                    <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.5 }} />
                <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* 🛠️ Debug Overlay */}
                    <MeditationDebugOverlay 
                        isVisible={isDebugMode}
                        ttsState={ttsState}
                        currentStep={step}
                        audioLevels={audioVolumes}
                        currentText={aiMessage}
                        aiLatency={aiLatency}
                    />
                    <AILoadingIndicator />
                    </div>
                </div>
             );
        }

        // 2-1단계: 카테고리가 선택되지 않았으면 카테고리 선택 화면
        if (!selectedCategory) {
            return (
                <div style={{
                    position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 9999,
                    display: 'flex', flexDirection: 'column', overflow: 'hidden'
                }}>
                    <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
                    {/* Header */}
                    <div style={{
                        padding: '15px 20px', paddingTop: 'max(15px, env(safe-area-inset-top))',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'rgba(20, 20, 20, 0.4)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
                        zIndex: 20
                    }}>
                        {/* 🛠️ Debug Overlay */}
                        <MeditationDebugOverlay 
                            isVisible={isDebugMode}
                            ttsState={ttsState}
                            currentStep={step}
                            audioLevels={audioVolumes}
                            currentText={lastSpokenMessage || aiMessage || currentAIChat?.message}
                            aiLatency={aiLatency}
                        />

                        {/* Title - Left Side */}
                        <div onClick={handleDebugToggle} style={{ cursor: 'pointer' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>
                                오늘의 명상
                            </span>
                        </div>
                        <button onClick={() => { 
                                stopAllAudio(); 
                                if(onClose) onClose(); else navigate(-1); 
                            }} 
                            style={{ 
                                padding: '8px 16px', 
                                border: '1px solid rgba(255,255,255,0.15)', 
                                borderRadius: '20px',
                                background: 'rgba(255, 255, 255, 0.08)', 
                                cursor: 'pointer',
                                color: 'rgba(255,255,255,0.9)',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            <span>나가기</span>
                            <X size={16} weight="bold" />
                        </button>
                    </div>

                    {/* Main Content */}
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column', 
                        justifyContent: 'flex-start', alignItems: 'center', padding: '100px 20px 40px', // ✅ Adjusted layout
                        zIndex: 10
                    }}>
                        {/* Title */}
                        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                            <h2 style={{ 
                                fontSize: '1.6rem', fontWeight: 600, color: config.THEME?.PRIMARY_COLOR || '#4c9bfb', 
                                marginBottom: '15px', lineHeight: 1.4
                            }}>
                                지금 당신의 마음은<br/>어디를 향하고 있나요?
                            </h2>
                            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
                                오늘 명상의 큰 방향을 선택해보세요
                            </p>
                        </div>

                        {/* Category Options (Dynamic) */}
                        <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {dynamicCategories.map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => {
                                        setSelectedCategory(category);
                                    }}
                                    style={{
                                        padding: '30px 25px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '20px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        textAlign: 'left'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(76, 155, 251, 0.15)';
                                        e.currentTarget.style.borderColor = config.THEME?.PRIMARY_COLOR || '#4c9bfb';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '2rem', marginRight: '15px' }}>{category.emoji}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '5px' }}>
                                                {category.label}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                                                {category.description || category.subtitle}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        // 2-2단계: 카테고리가 선택되었으면 해당 카테고리의 의도 선택 화면
        const categoryIntentions = dynamicIntentions.filter(i => i.category === selectedCategory.id);
        
        return (
            <div style={{
                position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 9999,
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                    {/* 🛠️ Debug Overlay */}
                    <MeditationDebugOverlay 
                        isVisible={isDebugMode}
                        ttsState={ttsState}
                        currentStep={step}
                        audioLevels={audioVolumes}
                        currentText={aiMessage}
                        aiLatency={aiLatency}
                    />
                    {/* Header */}
                    <div style={{
                        padding: '10px 15px', paddingTop: 'max(10px, env(safe-area-inset-top))',
                        display: 'flex', alignItems: 'center', background: 'rgba(20, 20, 20, 0.4)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
                        zIndex: 20
                    }}>
                        <button onClick={() => setSelectedCategory(null)} 
                            style={{ padding: '8px', border: 'none', background: 'none', cursor: 'pointer' }}>
                            <ArrowLeft size={22} color="white" />
                        </button>
                        <div style={{ marginLeft: '10px' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>
                                {selectedCategory.label}
                            </span>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column', 
                        justifyContent: 'center', alignItems: 'center', padding: '40px 20px'
                    }}>
                        {/* Title */}
                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <h2 style={{ 
                                fontSize: '1.5rem', fontWeight: 600, color: config.THEME?.PRIMARY_COLOR || '#4c9bfb', 
                                marginBottom: '10px' 
                            }}>
                                조금 더 구체적으로 들여다볼까요?
                            </h2>
                            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                                {selectedCategory.description}
                            </p>
                        </div>

                        {/* Options (Dynamic) */}
                        <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {categoryIntentions.map(intention => (
                                <button
                                    key={intention.id}
                                    onClick={() => {
                                        setSelectedIntention(intention);
                                        setStep('diagnosis');
                                        fetchAIQuestion([], true); // [MOD] Pass true for instant progressive initial message
                                    }}
                                    style={{
                                        padding: '20px', background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '15px',
                                        color: 'white', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'left'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ marginRight: '12px', fontSize: '1.5rem' }}>{intention.emoji}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '5px' }}>
                                                {intention.tag}
                                            </div>
                                            <div style={{ fontSize: '0.95rem' }}>
                                                {intention.label}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 1. Diagnosis Step (Conversational AI - Dark Mode)
    if (step === 'diagnosis') {
        return (
            <div style={{
                position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 9999, // 🌑 Dark Mode
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                    {/* 🛠️ Debug Overlay */}
                    <MeditationDebugOverlay 
                        isVisible={isDebugMode}
                        ttsState={ttsState}
                        currentStep={step}
                        audioLevels={audioVolumes}
                        currentText={aiMessage}
                        aiLatency={aiLatency}
                    />
                    {/* 1. Header (Translucent Dark) */}
                    <div style={{
                        padding: '10px 15px', paddingTop: 'max(10px, env(safe-area-inset-top))',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', // ✅ Adjusted layout
                        background: 'rgba(20, 20, 20, 0.4)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
                        zIndex: 20
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button onClick={() => { stopAllAudio(); if(onClose) onClose(); else navigate(-1); }} style={{ padding: '8px', border: 'none', background: 'none', cursor: 'pointer' }}>
                                <ArrowLeft size={22} color="white" />
                            </button>
                            <div onClick={handleDebugToggle} style={{ marginLeft: '10px', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>{config.AI_CONFIG?.NAME || 'AI'} (마음 챙김이)</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <SpeakerHigh size={12} color={ttcEnabled ? (config.THEME?.SUCCESS_COLOR || "#4caf50") : "#666"} weight="fill" />
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                                        {isAnalyzing ? (
                                            <span className="blinking-text">분석 중...</span> // ✅ Blinking Effect
                                        ) : isAILoading ? '생각하는 중...' : '음성 대화 중'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ✅ START NOW BUTTON */}
                        {!isAnalyzing && (
                            <button 
                                onClick={() => finishAnalysis(true)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    background: 'rgba(76, 155, 251, 0.2)',
                                    border: `1px solid ${config.THEME?.PRIMARY_COLOR || '#4c9bfb'}`,
                                    color: config.THEME?.PRIMARY_COLOR || '#4c9bfb',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                바로 시작
                            </button>
                        )}
                    </div>

                    {/* 2. Chat Area (Scrollable) */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '20px 15px',
                        paddingBottom: '20px', display: 'flex', flexDirection: 'column', gap: '20px'
                    }} className="no-scrollbar">
                        {/* Date Divider */}
                        <div style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>
                            {new Date().toLocaleDateString()}
                        </div>

                        {/* Chat Bubbles */}
                        {chatHistory.filter(msg => !msg.content.startsWith('[System]:')).map((msg, idx) => {
                            const isMe = msg.role === 'user';
                            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            return (
                                <div key={idx} style={{
                                    display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start',
                                    alignItems: 'flex-start', gap: '8px'
                                }}>
                                    {!isMe && (
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%',
                                            background: 'var(--primary-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0,
                                            fontSize: '1.2rem'
                                        }}>🧘‍♀️</div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '6px' }}>
                                         <div style={{
                                             background: isMe ? `linear-gradient(135deg, ${config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'}, #f1c40f)` : 'rgba(255,255,255,0.08)',
                                             color: isMe ? '#000' : '#fff', padding: '12px 16px',
                                             borderRadius: isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                                             maxWidth: '75vw', fontSize: '0.95rem', lineHeight: '1.6',
                                             boxShadow: '0 4px 15px rgba(0,0,0,0.2)', wordBreak: 'keep-all',
                                             border: isMe ? 'none' : '1px solid rgba(255,255,255,0.1)'
                                         }}>{msg.content}</div>
                                         <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2px', minWidth: '55px', textAlign: isMe ? 'right' : 'left' }}>
                                             {timeStr}
                                         </span>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Latest AI Question */}
                        {currentAIChat && !isAILoading && (
                             <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', gap: '8px' }}>
                                 <div style={{
                                     width: '40px', height: '40px', borderRadius: '50%',
                                     background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                     overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0,
                                     color: 'var(--primary-gold)'
                                 }}>
                                       <User size={24} weight="fill" />
                                 </div>
                                 <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '6px' }}>
                                     <div style={{
                                         background: 'rgba(255,255,255,0.08)', color: 'white', padding: '14px 18px',
                                         borderRadius: '4px 18px 18px 18px', maxWidth: '75vw', fontSize: '1.0rem', lineHeight: '1.6',
                                         boxShadow: '0 4px 15px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)'
                                     }}><TypewriterText text={currentAIChat.message || currentAIChat.question || "오늘 하루는 어떠셨나요?"} speed={40} /></div>
                                     <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>
                                         {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                     </span>
                                 </div>
                             </div>
                        )}

                        {isAILoading && (
                             <div style={{ alignSelf: 'center', marginTop: '10px' }}>
                                 <AILoadingIndicator compact={true} message={chatHistory.length === 0 ? `AI ${config.AI_CONFIG?.NAME || 'AI'}가 당신의 마음을 듣고 있어요...` : null} />
                             </div>
                        )}
                        <div ref={chatEndRef} style={{ height: '2px', width: '100%' }} />
                    </div>

                    {/* 3. Bottom Options & Input */}
                    <div style={{
                        background: config.THEME?.SURFACE || '#1a1a1d', borderTop: '1px solid rgba(255,255,255,0.1)',
                        padding: '15px', paddingBottom: 'calc(15px + env(safe-area-inset-bottom))',
                        display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 20
                    }}>
                        {/* ✅ Phase 1: 분석 완료 상태 - 시작 버튼만 표시 */}
                        {!isAILoading && currentAIChat?.isFinalAnalysis && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.5s ease' }}>
                                <button onClick={() => {
                                    stopAllAudio();
                                    const diag = DIAGNOSIS_OPTIONS.find(o => o.id === currentAIChat?.mappedDiagnosis) || SELECTED_DIAGNOSIS_FALLBACK;
                                    setSelectedDiagnosis(diag);
                                    const defaultMode = MEDITATION_MODES.find(m => m.id === diag?.prescription?.modeId) || MEDITATION_MODES[1];
                                    setActiveMode(defaultMode);
                                    setTimeLeft(defaultMode.time);
                                    setInteractionType(diag?.prescription?.type || 'v1');
                                    setStep('interaction_select');
                                }} style={{
                                    width: '100%', background: 'var(--primary-gold)', color: 'black',
                                    padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, border: 'none',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.3)'
                                }}>🧘 명상 시작하기</button>
                                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                                    당신에게 맞는 명상을 준비했어요
                                </p>
                            </div>
                        )}

                        {/* 일반 대화 중: 선택지 버튼 (isFinalAnalysis가 아닐 때만) */}
                        {!isAILoading && currentAIChat?.options?.length > 0 && !currentAIChat?.isFinalAnalysis && (
                            <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none', justifyContent: 'flex-start' }}>
                                {currentAIChat.options.map((opt, i) => (
                                    <button key={i} onClick={() => { stopAllAudio(); handleChatResponse(opt); }}
                                        style={{
                                            flex: '0 0 auto', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                                            padding: '10px 18px', borderRadius: '18px', color: 'rgba(255,255,255,0.9)', 
                                            fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(5px)'
                                        }}>{opt}</button>
                                ))}
                            </div>
                        )}

                        {/* 채팅 입력: 분석 완료가 아니고 isTransition도 아닐 때만 */}
                        {!currentAIChat?.isFinalAnalysis && !currentAIChat?.isTransition && !isAnalyzing && (
                            <form onSubmit={(e) => { try { handleManualSubmit(e); } catch (err) { setIsAILoading(false); } }} 
                                style={{ 
                                    display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', 
                                    borderRadius: '28px', padding: '6px 6px 6px 20px', border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                <input type="text" value={manualInput} onChange={(e) => setManualInput(e.target.value)}
                                    disabled={isAILoading} autoFocus placeholder={isAILoading ? "답변을 기다리는 중..." : "직접 입력하기..."}
                                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '1rem', outline: 'none' }} />
                                <button type="submit" disabled={!manualInput.trim() || isAILoading}
                                    style={{
                                        background: manualInput.trim() ? 'var(--primary-gold)' : 'rgba(255,255,255,0.1)',
                                        color: manualInput.trim() ? 'black' : 'rgba(255,255,255,0.2)',
                                        border: 'none', borderRadius: '50%', width: '40px', height: '40px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                    }}><ArrowUp size={24} weight="bold" /></button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'diagnosis_manual') {
        return (
            <div style={{
                position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 2000,
                display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden'
            }}>
                <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                    {/* 🛠️ Debug Overlay */}
                    <MeditationDebugOverlay 
                        isVisible={isDebugMode}
                        ttsState={ttsState}
                        currentStep={step}
                        audioLevels={audioVolumes}
                        currentText={aiMessage}
                        aiLatency={aiLatency}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                        <button onClick={() => setStep('diagnosis')} style={{ padding: '10px', color: 'white', background: 'none', border: 'none' }}>
                            <ArrowLeft size={24} />
                        </button>
                        <h1 style={{ flex: 1, textAlign: 'center', fontSize: '1.1rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginRight: '44px' }}>
                            명상 선택
                        </h1>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '30px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '25px', fontSize: '0.95rem' }}>
                            지금 느껴지는 상태를 선택해주세요
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', width: '100%', maxWidth: '400px' }}>
                            {DIAGNOSIS_OPTIONS.map((option) => (
                                <button key={option.id} onClick={() => handleDiagnosisSelect(option)} style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px',
                                    transition: 'all 0.3s ease', cursor: 'pointer'
                                }}>
                                    <div style={{ 
                                        width: '50px', height: '50px', borderRadius: '50%', background: `${option.color}20`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: option.color 
                                    }}>
                                        <option.icon size={28} weight="fill" />
                                    </div>
                                    <span style={{ color: 'white', fontWeight: 600 }}>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Weather Step
    if (step === 'weather') {
        return (
             <div style={{
                position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 2000,
                display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden'
            }}>
                <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                    {/* 🛠️ Debug Overlay */}
                    <MeditationDebugOverlay 
                        isVisible={isDebugMode}
                        ttsState={ttsState}
                        currentStep={step}
                        audioLevels={audioVolumes}
                        currentText={aiMessage}
                        aiLatency={aiLatency}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                        <button onClick={() => setStep('diagnosis')} style={{ padding: '10px', color: 'white', background: 'none', border: 'none' }}>
                            <ArrowLeft size={24} />
                        </button>
                        <h1 style={{ flex: 1, textAlign: 'center', fontSize: '1.1rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginRight: '44px' }}>
                            환경 감지
                        </h1>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '40px' }}>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'white', marginBottom: '10px', textAlign: 'center' }}>
                            지금 창밖의 날씨는 어떤가요?
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '50px', textAlign: 'center', fontSize: '0.9rem' }}>
                            날씨에 따라 뇌의 반응 패턴이 달라집니다
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', width: '100%', maxWidth: '400px' }}>
                            {WEATHER_OPTIONS.map((option) => (
                                <button key={option.id} onClick={() => handleWeatherSelect(option)} style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                                    cursor: 'pointer'
                                }}>
                                    <option.icon size={36} color={option.color} weight="duotone" />
                                    <span style={{ color: 'white', fontSize: '1.1rem', marginTop: '5px' }}>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 1-a. Prescription Summary (New AI Analysis View)
    if (step === 'prescription_summary') {
        const summary = currentAIChat?.analysisSummary || prescriptionReason || "당신의 마음 상태를 깊이 들여다보았습니다.";
        return (
            <div style={{
                position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 2000,
                display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden'
            }}>
                <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ marginBottom: '30px', color: 'var(--primary-gold)', textAlign: 'center' }}>
                        <Brain size={60} weight="fill" />
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginTop: '20px' }}>AI 마음 분석</h2>
                    </div>
                    
                    <div style={{ 
                        width: '100%', maxWidth: '400px', background: 'rgba(255,255,255,0.08)', 
                        borderRadius: '24px', padding: '30px', border: '1px solid rgba(255,255,255,0.1)',
                        marginBottom: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                    }}>
                        <p style={{ color: 'white', fontSize: '1.15rem', lineHeight: 1.7, textAlign: 'center', wordBreak: 'keep-all' }}>
                            &quot;{summary}&quot;
                        </p>
                    </div>

                    <button onClick={() => setStep('interaction_select')}
                        style={{
                            width: '100%', maxWidth: '300px', background: 'var(--primary-gold)', color: 'black',
                            padding: '20px', borderRadius: '20px', fontSize: '1.2rem', fontWeight: 800, border: 'none',
                            cursor: 'pointer', boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.3)'
                        }}>명상 모드 선택하기</button>
                    
                    <button onClick={() => {
                            // ✨ AI's warm welcome message when returning to chat
                            const welcomeBackMessages = [
                                "다시 돌아오셨군요! 더 이야기 나눠볼까요? 😊",
                                "좋아요, 조금 더 깊이 들여다볼게요. 지금 어떠세요?",
                                "천천히 가도 괜찮아요. 더 이야기해주시면 더 잘 도와드릴 수 있어요."
                            ];
                            const randomWelcome = welcomeBackMessages[Math.floor(Math.random() * welcomeBackMessages.length)];
                            setChatHistory(prev => [...prev, { role: 'model', content: randomWelcome }]);
                            if (ttcEnabled) speak(randomWelcome);
                            setStep('diagnosis');
                        }}
                        style={{ marginTop: '20px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', textDecoration: 'underline' }}>
                        대화 더 하기
                    </button>
                </div>
            </div>
        );
    }

    // 1-b. Interaction Selection (New Dedicated View)
    if (step === 'interaction_select') {
        return (
            <div style={{
                position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 2000,
                display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden'
            }}>
                <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                    <div style={{ padding: '20px 0', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white' }}>어떤 명상을 원하시나요?</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>나에게 가장 필요한 모드를 선택하세요</p>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'center', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                        {Object.values(INTERACTION_TYPES).map(t => (
                            <button key={t.id} onClick={() => {
                                setInteractionType(t.id);
                                // ✅ [FIX 2] 사용자가 '⏱️ 명상 시간'을 먼저 눌렀다가(activeMode가 있는 상태) 
                                // 이 버튼을 터치했을 때時間が 15분 등 기본으로 다시 덮어씌워지는 오류 수정
                                const modeToUse = activeMode || MEDITATION_MODES.find(m => m.id === selectedDiagnosis?.prescription.modeId) || MEDITATION_MODES[1];
                                setActiveMode(modeToUse);
                                setTimeLeft(modeToUse.time);
                                // Fetch real prescription details in background
                                fetchAIPrescription(selectedDiagnosis?.id || 'stress', weatherContext?.id || 'sun', modeToUse.id, t.id, "");
                                setStep('preparation');
                                setPrepStep(3); // Go to Posture Guide
                            }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '20px', padding: '25px',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '24px', color: 'white', textAlign: 'left', cursor: 'pointer', transition: 'all 0.3s'
                                }}>
                                <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'rgba(var(--primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-gold)' }}>
                                    {t.id === 'v1' ? <Wind size={28} /> : t.id === 'v2' ? <Microphone size={28} /> : <VideoCamera size={28} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px' }}>{t.label}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{t.desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* ✅ Restored Time & Ambient Options */}
                    <div style={{ padding: '0 20px', marginTop: '30px', maxWidth: '400px', margin: '30px auto 0 auto', width: '100%' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '10px' }}>⏱️ 명상 시간</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {MEDITATION_MODES.map(m => (
                                    <button key={m.id} onClick={() => { setActiveMode(m); setTimeLeft(m.time); }}
                                        style={{
                                            flex: 1, padding: '12px 8px', borderRadius: '14px', fontSize: '0.9rem',
                                            background: (activeMode && activeMode.id === m.id) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                                            color: (activeMode && activeMode.id === m.id) ? 'white' : 'rgba(255,255,255,0.6)',
                                            border: (activeMode && activeMode.id === m.id) ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.05)', fontWeight: 600
                                        }}>{m.label.split(' ')[0]}</button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '10px' }}>🎵 자연음 배경 (켜기/끄기)</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {AMBIENT_SOUNDS.map(a => (
                                    <button key={a.id} onClick={() => setSelectedAmbient(a.id)}
                                        style={{
                                            padding: '8px 16px', borderRadius: '16px', fontSize: '0.85rem',
                                            background: selectedAmbient === a.id ? `${a.color}30` : 'rgba(255,255,255,0.05)',
                                            color: selectedAmbient === a.id ? a.color : 'rgba(255,255,255,0.5)',
                                            border: selectedAmbient === a.id ? `1px solid ${a.color}50` : '1px solid transparent',
                                            fontWeight: 600, cursor: 'pointer'
                                        }}>{a.label}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'prescription' && selectedDiagnosis && activeMode) {
        const ModeIcon = ICON_MAP[activeMode.iconName] || ICON_MAP.Wind;
        
        return (
            <div style={{
                position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 2000,
                display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden'
            }}>
                <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflowY: 'auto' }} className="no-scrollbar">
                    {/* 🛠️ Debug Overlay */}
                    <MeditationDebugOverlay 
                        isVisible={isDebugMode}
                        ttsState={ttsState}
                        currentStep={step}
                        audioLevels={audioVolumes}
                        currentText={aiMessage}
                        aiLatency={aiLatency}
                    />
                    <div style={{ marginTop: '20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingBottom: '40px' }}>
                        <div style={{ marginBottom: '20px', color: 'var(--primary-gold)' }}><Sparkle size={48} weight="fill" /></div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', marginBottom: '20px', textAlign: 'center' }}>
                            명상 전문 AI 처방
                        </h2>

                        <div style={{ 
                            width: '100%', maxWidth: '350px', background: 'rgba(255,255,255,0.08)', 
                            borderRadius: '24px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', flexDirection: 'column', gap: '15px'
                        }}>
                            {/* 1. AI Analysis */}
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
                                 <div style={{ color: 'var(--primary-gold)', fontWeight: 700, marginBottom: '8px', fontSize: '0.85rem' }}>📋 AI 심리 분석 결과</div>
                                <div>{currentAIChat?.isFinalAnalysis ? (currentAIChat.analysisSummary || prescriptionReason) : prescriptionReason}</div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '5px 0' }} />

                            {/* 2. Recommendation Hero Card */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: `${activeMode.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: activeMode.color }}>
                                    <ModeIcon size={32} weight="duotone" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--primary-gold)', fontWeight: 600, marginBottom: '2px' }}>✨ AI 강력 추천</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{activeMode.label}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                                        {interactionType === 'v1' && '온몸 이완 가이드'}
                                        {interactionType === 'v2' && '호흡 몰입'}
                                        {interactionType === 'v3' && '자세 교정'}
                                    </div>
                                </div>
                            </div>

                            {/* 3. User Options */}
                            <div style={{ marginTop: '10px' }}>
                                 <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '10px' }}>옵션 변경하기</div>
                                
                                {/* Time Selection */}
                                <div style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
                                    {MEDITATION_MODES.map(m => (
                                        <button key={m.id} onClick={() => { setActiveMode(m); setTimeLeft(m.time); }}
                                            style={{
                                                flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.75rem',
                                                background: activeMode.id === m.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                                                color: activeMode.id === m.id ? 'white' : 'rgba(255,255,255,0.6)',
                                                border: activeMode.id === m.id ? '1px solid rgba(255,255,255,0.3)' : 'none', fontWeight: 600
                                            }}>{m.label.split(' ')[0]}</button>
                                    ))}
                                </div>

                                {/* Type Selection */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {Object.values(INTERACTION_TYPES).map(t => (
                                        <button key={t.id} onClick={() => setInteractionType(t.id)}
                                            style={{
                                                flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.75rem',
                                                background: interactionType === t.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                                                color: interactionType === t.id ? 'white' : 'rgba(255,255,255,0.6)',
                                                border: interactionType === t.id ? '1px solid rgba(255,255,255,0.3)' : 'none', fontWeight: 600
                                            }}>{t.id === 'v1' ? '바디스캔' : t.id === 'v2' ? '호흡' : '자세'}</button>
                                    ))}
                                </div>

                                {/* 🎵 Ambient Sound Selection */}
                                <div style={{ marginTop: '15px' }}>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '8px' }}>🎵 배경음</div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {AMBIENT_SOUNDS.map(a => (
                                            <button key={a.id} onClick={() => setSelectedAmbient(a.id)}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '12px', fontSize: '0.7rem',
                                                    background: selectedAmbient === a.id ? `${a.color}30` : 'rgba(255,255,255,0.05)',
                                                    color: selectedAmbient === a.id ? a.color : 'rgba(255,255,255,0.5)',
                                                    border: selectedAmbient === a.id ? `1px solid ${a.color}50` : '1px solid transparent',
                                                    fontWeight: 600, cursor: 'pointer'
                                                }}>{a.label}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ width: '100%', maxWidth: '350px', marginTop: '30px' }}>
                            <button onClick={startFromPrescription} style={{
                                width: '100%', background: 'var(--primary-gold)', color: 'black',
                                padding: '16px', borderRadius: '18px', fontSize: '1.1rem', fontWeight: 800, border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
                                cursor: 'pointer', boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.3)'
                            }}><Play size={24} weight="fill" /> 시작하기</button>
                            
                            <button onClick={handleReturnToChat} style={{ 
                                marginTop: '15px', width: '100%', background: 'transparent', border: 'none', 
                                color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem'
                            }}>다시 선택 (대화로 돌아가기)</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 🧘 Phase 4: Preparation Flow Step
    if (step === 'preparation') {
        const PREPARATION_GUIDES = {
            chair: {
                title: "의자 명상", desc: "회사나 집에서 간편하게",
                steps: ["의자 앞쪽에 걸터앉아 허리를 세웁니다.", "양발은 어깨너비로 벌려 지면에 닿게 합니다.", "손은 편안하게 무릎 위에 올립니다."]
            },
            floor: {
                title: "바닥 명상", desc: "조용하고 안정적인 공간에서",
                steps: ["가부좌 또는 편한 책상다리를 합니다.", "쿠션을 활용해 무릎이 엉덩이보다 낮게 합니다.", "척추를 곧게 펴고 정수리를 하늘로 당깁니다."]
            },
            lying: {
                title: "누운 명상", desc: "깊은 이완과 수면을 위해",
                steps: ["등을 대고 편안하게 눕습니다.", "다리는 어깨너비로 벌리고 발끝을 툭 떨어뜨립니다.", "팔은 몸 옆에 두고 손바닥이 하늘을 향하게 합니다."]
            }
        };

        return (
            <div style={{
                position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 2000,
                display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden'
            }}>
                <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                    {/* 🛠️ Debug Overlay */}
                    <MeditationDebugOverlay 
                        isVisible={isDebugMode}
                        ttsState={ttsState}
                        currentStep={step}
                        audioLevels={audioVolumes}
                        currentText={aiMessage}
                        aiLatency={aiLatency}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                        <button onClick={() => setStep('interaction_select')} style={{ padding: '10px', color: 'white', background: 'none', border: 'none' }}>
                            <ArrowLeft size={24} />
                        </button>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--primary-gold)', fontWeight: 600 }}>준비 단계 ({prepStep}/3)</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>명상 준비</div>
                        </div>
                        <div style={{ width: '44px' }} />
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '10px' }}>
                        {/* STEP 1: Notifications Off */}
                        {prepStep === 1 && (
                            <div style={{ width: '100%', maxWidth: '350px', animation: 'fadeIn 0.5s ease' }}>
                                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔕</div>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '10px' }}>주변을 고요하게</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
                                        방해받지 않도록 <br/>기기를 &apos;무음&apos; 또는 &apos;방해금지&apos; 모드로 <br/>설정해주셨나요?
                                    </p>

                                    {/* 🔊 무음 모드 안내 추가 */}
                                    <div style={{ 
                                        background: 'rgba(76, 155, 251, 0.1)', 
                                        border: '1px solid rgba(76, 155, 251, 0.2)',
                                        borderRadius: '15px', padding: '15px', marginTop: '10px',
                                        textAlign: 'left', fontSize: '0.85rem'
                                    }}>
                                        <div style={{ color: config.THEME?.PRIMARY_COLOR || '#4c9bfb', fontWeight: 700, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <SpeakerHigh size={14} weight="fill" /> 안심하세요
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                                            &apos;무음&apos;이나 &apos;방해금지&apos; 모드에서도 **명상 가이드와 배경음은 정상적으로 들립니다.** 외부 알림만 차단되니 안심하고 설정해주세요.
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => { setPrepSelections({...prepSelections, notified: true}); setPrepStep(2); }}
                                    style={{
                                        width: '100%', background: 'var(--primary-gold)', color: 'black',
                                        padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, border: 'none',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>확인했습니다</button>
                            </div>
                        )}

                        {/* STEP 3: Posture Guide */}
                        {prepStep === 3 && (
                            <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeIn 0.5s ease' }}>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'white', marginBottom: '15px', textAlign: 'center' }}>가장 편한 자세를 찾아보세요</h3>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                                    {Object.entries(PREPARATION_GUIDES).map(([key, info]) => (
                                        <button key={key} onClick={() => setPrepSelections({...prepSelections, posture: key})}
                                            style={{
                                                flex: 1, padding: '10px 4px', borderRadius: '12px', fontSize: '0.8rem',
                                                background: prepSelections.posture === key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)',
                                                color: prepSelections.posture === key ? 'white' : 'rgba(255,255,255,0.4)',
                                                border: prepSelections.posture === key ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                                                fontWeight: 600
                                            }}>{info.title}</button>
                                    ))}
                                </div>
                                <div style={{ 
                                    background: 'rgba(255,255,255,0.05)', borderRadius: '24px', padding: '20px',
                                    border: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px', minHeight: '180px'
                                }}>
                                    <div style={{ color: 'var(--primary-gold)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>{PREPARATION_GUIDES[prepSelections.posture].desc}</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', marginBottom: '12px' }}>{PREPARATION_GUIDES[prepSelections.posture].title} 자세</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {PREPARATION_GUIDES[prepSelections.posture].steps.map((s, i) => (
                                            <div key={i} style={{ display: 'flex', gap: '8px', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: 1.4 }}>
                                                <span style={{ color: 'var(--primary-gold)', fontWeight: 800 }}>{i+1}</span>
                                                <span>{s}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => setPrepStep(2)} // ✅ Go to Phone Placement NEXT
                                    style={{
                                        width: '100%', background: 'white', color: 'black',
                                        padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, border: 'none',
                                        cursor: 'pointer', marginBottom: '15px'
                                    }}>기기 위치 설정으로</button>
                            </div>
                        )}
                        
                        {/* STEP 2: Phone Placement (Moved AFTER posture) */}
                        {prepStep === 2 && (
                            <div style={{ width: '100%', maxWidth: '350px', animation: 'fadeIn 0.5s ease' }}>
                                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>
                                        {interactionType === 'v3' ? '📏' : (interactionType === 'v2' ? '👄' : '📱')}
                                    </div>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '10px' }}>핸드폰 위치 설정</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, fontSize: '1.1rem' }}>
                                        {interactionType === 'v3' ? "전신 촬영을 위해 핸드폰을 약 2m 거리에 세워두세요." : (interactionType === 'v2' ? "숨소리 감지를 위해 핸드폰을 입 근처(30cm 내)에 비스듬히 세워두세요." : "핸드폰을 손이 닿는 편한 곳에 두세요.")}
                                    </p>
                                    {interactionType === 'v2' && (
                                        <div style={{ 
                                            marginTop: '20px', padding: '12px', background: 'rgba(74, 222, 128, 0.1)', 
                                            borderRadius: '12px', border: `1px solid ${config.THEME?.SUCCESS_COLOR || '#4ade80'}33`, fontSize: '0.85rem', color: config.THEME?.SUCCESS_COLOR || '#4ade80'
                                        }}>💡 <b>Tip:</b> 마이크가 포함된 이어폰을 사용하시면 숨소리를 훨씬 더 정확하게 감지할 수 있어요.</div>
                                    )}
                                </div>
                                <button onClick={() => startSession(activeMode)}
                                    style={{
                                        width: '100%', background: 'var(--primary-gold)', color: 'black',
                                        padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, border: 'none',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>준비 완료 (명상 시작)</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 5. Feedback Step
    if (step === 'feedback') {
        const points = feedbackData?.feedbackPoints || [];
        
        return (
            <FeedbackView
                activeMode={activeMode}
                feedbackData={feedbackData}
                formatTime={formatTime}
                timeLeft={timeLeft}
                modeName={activeMode?.name || "AI 맞춤 명상"}
                onClose={onClose}
                // Optional debug/legacy props
                visualTheme={visualTheme}
                isDebugMode={isDebugMode}
                ttsState={ttsState}
                step={step}
                audioVolumes={audioVolumes}
                aiMessage={aiMessage}
                aiLatency={aiLatency}
                isAILoading={isAILoading}
                points={points}
                stopAllAudio={stopAllAudio}
                setAiMessage={setAiMessage}
                setChatHistory={setChatHistory}
            />
        );
    }

    // 4. Active Session Step
    const breathingScale = interactionType === 'v2' ? 1 + micVolume : 1;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 3000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden'
        }}>
            {/* V3 Camera Layer */}
            {interactionType === 'v3' && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.6 }}>
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
                    />
                    <canvas
                        ref={canvasRef}
                        width={window.innerWidth}
                        height={window.innerHeight}
                        style={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%',
                            transform: 'scaleX(-1)', // Mirror to match video
                            pointerEvents: 'none'
                        }}
                    />
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        width: '280px', height: '350px',
                        border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '120px',
                        boxShadow: '0 0 80px rgba(255, 215, 0, 0.1) inset'
                    }} />
                </div>
            )}

            {/* Global Dynamic Background */}
            <div 
                className={`soul-light-base soul-theme-${visualTheme} ${isPlaying && interactionType !== 'v2' ? 'active' : ''}`} 
                style={{
                     transform: interactionType === 'v2' && isPlaying 
                        ? `translate(-50%, -50%) scale(${1 + Math.min(micVolume, 0.5)})` 
                        : undefined,
                     transition: interactionType === 'v2' ? 'transform 0.1s ease-out' : 'all 1s ease',
                     zIndex: 0
                 }}
            />

            {/* Content Overlay */}
            <div style={{ zIndex: 10, textAlign: 'center', width: '100%', padding: '20px', maxWidth: '600px' }}>
                <div style={{ marginBottom: '20px', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ 
                        color: 'white', fontSize: '1.2rem', fontWeight: 500, lineHeight: 1.6,
                        opacity: isPlaying ? 1 : 0.5, transition: 'opacity 1s ease',
                        textShadow: '0 4px 20px rgba(0,0,0,0.8)', background: interactionType === 'v3' ? 'rgba(0,0,0,0.6)' : 'transparent',
                        padding: interactionType === 'v3' ? '15px' : '0', borderRadius: '15px', wordBreak: 'keep-all'
                    }}>
                        {isPlaying ? <TypewriterText text={aiMessage} speed={50} /> : aiMessage}
                    </p>
                </div>

                <div style={{ fontSize: '4.5rem', fontWeight: 200, color: 'white', fontVariantNumeric: 'tabular-nums', letterSpacing: '-2px', textShadow: '0 0 30px rgba(255,255,255,0.3)', marginBottom: '10px' }}>
                    {formatTime(timeLeft)}
                </div>

                {/* 🎤 Breath Level Meter (NEW: User Request) */}
                {interactionType === 'v2' && (
                    <div style={{ 
                        marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                        animation: 'fadeIn 0.5s ease'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: micVolume > 0.1 ? (config.THEME?.SUCCESS_COLOR || '#4ade80') : 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }}>
                            <Microphone size={20} weight={micVolume > 0.1 ? "fill" : "regular"} style={{ transform: `scale(${1 + Math.min(micVolume, 0.5)})` }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '1px' }}>BREATH LEVEL</span>
                        </div>
                        <div style={{ 
                            width: '120px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden',
                            boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                        }}>
                            <div style={{ 
                                height: '100%', 
                                width: `${Math.min(micVolume * 100, 100)}%`, 
                                background: `linear-gradient(90deg, ${config.THEME?.SUCCESS_COLOR || '#4ade80'}, #32ff7e)`,
                                transition: 'width 0.1s ease-out',
                                boxShadow: '0 0 10px rgba(74, 222, 128, 0.5)'
                            }} />
                        </div>
                        {micVolume > 0.1 && (
                            <span style={{ fontSize: '0.7rem', color: config.THEME?.SUCCESS_COLOR || '#4ade80', animation: 'pulse 1s infinite' }}>감지 중...</span>
                        )}
                    </div>
                )}

                {/* Privacy Notice or TTC Indicator */}
                <div style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {ttcEnabled ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--primary-gold)', fontSize: '0.8rem', fontWeight: 'bold', animation: 'pulse 2s infinite' }}>
                            <SpeakerHigh size={16} weight="fill" /> 음성 안내가 진행 중입니다
                        </div>
                    ) : (
                        (interactionType === 'v2' || interactionType === 'v3') && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                                <LockKey size={12} weight="fill" color={config.THEME?.SUCCESS_COLOR || "#4ade80"} /> 데이터는 기기 내에서만 처리됩니다
                            </div>
                        )
                    )}
                </div>
                
                {permissionError && (
                    <div style={{ marginTop: '20px', padding: '10px', background: `${config.THEME?.DANGER_COLOR || '#ff6b6b'}33`, color: config.THEME?.DANGER_COLOR || '#ff6b6b', borderRadius: '8px', fontSize: '0.9rem' }}>
                        ⚠️ {permissionError}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div style={{ position: 'absolute', bottom: '60px', display: 'flex', alignItems: 'center', gap: '40px', zIndex: 20 }}>
                <button onClick={() => { 
                    // ✅ Phase 2: X 버튼 → 피드백 화면으로 이동 (홈 대신)
                    completeSession();
                }} style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}>
                    <X size={28} />
                </button>

                <button onClick={togglePlay} style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: activeMode?.color, border: 'none', color: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 30px ${activeMode?.color}60`, cursor: 'pointer'
                }}>
                    {isPlaying ? <Pause size={32} weight="fill" /> : <Play size={32} weight="fill" />}
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <button onClick={() => setShowVolumePanel(!showVolumePanel)} style={{
                        width: '60px', height: '60px', borderRadius: '50%',
                        background: showVolumePanel ? 'rgba(var(--primary-rgb), 0.3)' : 'rgba(255,255,255,0.1)', border: 'none', 
                        color: soundEnabled ? 'white' : 'rgba(255,255,255,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}>
                        {soundEnabled ? <SpeakerHigh size={28} /> : <SpeakerSlash size={28} />}
                    </button>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>소리 조절</span>
                </div>


            </div>

            {/* ✅ Phase 3: Volume Control Panel */}
            <VolumeControlPanel
                showVolumePanel={showVolumePanel}
                setShowVolumePanel={setShowVolumePanel}
                audioVolumes={audioVolumes}
                setAudioVolumes={setAudioVolumes}
                currentAudioRef={currentAudioRef}
                updateAmbientVolume={updateAmbientVolume}
                updateBinauralVolume={updateBinauralVolume}
                soundEnabled={soundEnabled}
                setSoundEnabled={setSoundEnabled}
            />

            {/* 🔊 볼륨 조절 힌트 토스트 */}
            {showVolumeHint && !showVolumePanel && (
                <div style={{
                    position: 'absolute', bottom: '190px', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(var(--primary-rgb), 0.2)', backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(var(--primary-rgb), 0.3)', borderRadius: '20px',
                    padding: '8px 16px', color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem',
                    whiteSpace: 'nowrap', animation: 'fadeIn 0.5s ease-out',
                    pointerEvents: 'none'
                }}>
                    🔊 스피커 아이콘을 눌러 볼륨을 조절하세요
                </div>
            )}

            {/* 🛠️ Debug Overlay */}
            <MeditationDebugOverlay 
                isVisible={isDebugMode}
                ttsState={ttsState}
                currentStep={step}
                audioLevels={audioVolumes}
                currentText={aiMessage}
                aiLatency={aiLatency}
            />

            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                }
                @keyframes breathe {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.5); opacity: 0.8; }
                }
                @keyframes breathe-inner {
                    0%, 100% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.3); opacity: 0.4; }
                }
                @keyframes float {
                    0% { transform: rotate(0deg) scale(1) translate(0, 0); }
                    33% { transform: rotate(120deg) scale(1.1) translate(20px, -20px); }
                    66% { transform: rotate(240deg) scale(0.9) translate(-20px, 20px); }
                    100% { transform: rotate(360deg) scale(1) translate(0, 0); }
                }
                @keyframes float-rev {
                    0% { transform: rotate(0deg) scale(1.1) translate(0, 0); }
                    50% { transform: rotate(-180deg) scale(0.9) translate(30px, 30px); }
                    100% { transform: rotate(-360deg) scale(1.1) translate(0, 0); }
                }

                .breathing-circle.animate { animation: breathe 8s infinite ease-in-out; }
                .breathing-circle-inner.animate-inner { animation: breathe-inner 8s infinite ease-in-out; }
                .floating-circle.animate-float { animation: float 20s infinite linear; }
                .floating-circle-rev.animate-float-rev { animation: float-rev 25s infinite linear; }
                .paused { animation-play-state: paused !important; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};



export default MeditationPage;
