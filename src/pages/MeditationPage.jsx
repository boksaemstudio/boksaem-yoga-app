import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { Icons } from '../components/CommonIcons';
import { MEDITATION_MODES, INTERACTION_TYPES, DIAGNOSIS_OPTIONS, WEATHER_OPTIONS, SPECIALIST_QUESTIONS, AI_SESSION_MESSAGES, AMBIENT_SOUNDS, MEDITATION_INTENTIONS, MEDITATION_CATEGORIES } from '../constants/meditationConstants';

// 🤖 AI Posture Analysis (MediaPipe) - Loaded Dynamically
// import { Pose } from '@mediapipe/pose'; // REMOVED: Dynamic import used instead
// import * as tf from '@tensorflow/tfjs-core'; // REMOVED: Dynamic import used instead
// import '@tensorflow/tfjs-backend-webgl'; // REMOVED: Dynamic import used instead

// Unlock icons
const { 
    Play, Pause, X, Wind, SpeakerHigh, SpeakerSlash, Brain, Microphone, VideoCamera, 
    LockKey, Heartbeat, SmileySad, Lightning, Barbell, Sparkle, Sun, CloudRain, 
    CloudSnow, Cloud, House
} = Icons;

// [HOTFIX] Local ArrowLeft to prevent 'Ar' ReferenceError
const ArrowLeft = ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
        <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" />
    </svg>
);

const ArrowUp = ({ size = 24, color = "currentColor", weight="regular" }) => (
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

// ✨ AI Loading Indicator Component (Dynamic Animation)
const AI_LOADING_MESSAGES = [
    "마음을 연결하고 있어요...",
    "깊이 분석 중입니다...",
    "오늘의 당신을 이해하고 있어요...",
    "호흡에 집중해 보세요...",
    "잠시, 고요함 속에 머물러요..."
];

const AILoadingIndicator = ({ compact = false, message = null }) => {
    const [msgIndex, setMsgIndex] = useState(0);
    
    useEffect(() => {
        if (message) return; // Don't cycle if custom message provided
        const interval = setInterval(() => {
            setMsgIndex(prev => (prev + 1) % AI_LOADING_MESSAGES.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [message]);

    const displayMessage = message || AI_LOADING_MESSAGES[msgIndex];
    
    if (compact) {
        return (
            <div style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', 
                padding: '12px 20px', borderRadius: '20px',
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px solid rgba(212, 175, 55, 0.15)'
            }}>
                <div className="ai-thinking-icon" style={{ 
                    width: '28px', height: '28px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--primary-gold, #d4af37)'
                }}>
                    <Brain size={24} weight="duotone" />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>{displayMessage}</span>
            </div>
        );
    }
    
    return (
        <div style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', 
            justifyContent: 'center', gap: '24px', padding: '40px'
        }}>
            {/* Rotating/Pulsing Icon */}
            <div className="ai-thinking-icon" style={{ 
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'rgba(212, 175, 55, 0.1)',
                border: '2px solid rgba(212, 175, 55, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary-gold, #d4af37)',
                boxShadow: '0 0 30px rgba(212, 175, 55, 0.2)'
            }}>
                <Brain size={40} weight="duotone" />
            </div>
            
            {/* Message */}
            <div style={{ textAlign: 'center' }}>
                <div style={{ 
                    color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', fontWeight: '500',
                    marginBottom: '8px', transition: 'opacity 0.3s ease'
                }}>
                    {displayMessage}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                    복순이가 생각하고 있어요
                </div>
            </div>
        </div>
    );
};

const MeditationPage = ({ onClose }) => {
    const navigate = useNavigate();
    
    // Stable Refs for cleanup without re-triggering effects
    const cameraStreamRef = useRef(null);
    const [step, setStep] = useState('initial_prep'); // ✅ 알림 끄기 체크부터 시작
    
    // Context State
    const [timeContext, setTimeContext] = useState('morning');
    const [weatherContext, setWeatherContext] = useState(null);
    const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
    const [selectedIntention, setSelectedIntention] = useState(null); // ✅ 선택한 의도
    const [selectedCategory, setSelectedCategory] = useState(null); // ✅ 선택한 카테고리 (비움/채움)
    const [prescriptionReason, setPrescriptionReason] = useState('');
    const [currentQuestion, setCurrentQuestion] = useState(null);

    // Session Settings
    const [activeMode, setActiveMode] = useState(null); 
    const [interactionType, setInteractionType] = useState('v1');
    const [needsFeedback, setNeedsFeedback] = useState(false); // ✅ Track if session just ended
    
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
    const [aiMessage, setAiMessage] = useState("");
    const [soundEnabled, setSoundEnabled] = useState(true); 
    const [ttcEnabled, setTtcEnabled] = useState(true); // TTC (Text To Calm) Voice Guidance - Default ON
    const [selectedAmbient, setSelectedAmbient] = useState('rain'); // 🎵 Default to 'rain' (User Request: Calm music from start)
    const [audioVolumes, setAudioVolumes] = useState({
        voice: 0.8,    // 🗣️ 음성 안내 (우선순위 1)
        ambient: 0.35, // 🌊 환경음 (배경)
        binaural: 0.1  // 🎵 바이노랄 비트 (잠재의식 - 음량 낮춤)
    });
    
    // Audio/Video State
    const [micVolume, setMicVolume] = useState(0);
    const [permissionError, setPermissionError] = useState(null);
    const [cameraStream, setCameraStream] = useState(null);

    // 🤖 REAL-TIME AI States
    const [isAILoading, setIsAILoading] = useState(true); // Start as loading (All AI)
    const [aiPrescription, setAiPrescription] = useState(null);
    const [aiSessionMessageIndex, setAiSessionMessageIndex] = useState(0);
    const [lastSpokenMessage, setLastSpokenMessage] = useState("");
    const [chatHistory, setChatHistory] = useState([]); // 대화 내역 저장
    const [currentAIChat, setCurrentAIChat] = useState(null); // No static content
    const [manualInput, setManualInput] = useState(""); // User manual input
    const [memberName, setMemberName] = useState(() => {
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
    const [aiRequestLock, setAiRequestLock] = useState(false); // ✅ Prevent duplicate requests
    const [sessionInfo, setSessionInfo] = useState(null); 
    const [feedbackData, setFeedbackData] = useState(null); // ✅ AI Session Feedback (4 sentences)
    
    // 🌊 Dynamic Options State (AI Generated)
    const [dynamicCategories, setDynamicCategories] = useState(MEDITATION_CATEGORIES);
    const [dynamicIntentions, setDynamicIntentions] = useState(MEDITATION_INTENTIONS);
    const [isOptionsLoading, setIsOptionsLoading] = useState(true); // ✅ Start with meditative loading

    // 🛠️ DEBUG MODE STATES (User Request)
    const [isDebugMode, setIsDebugMode] = useState(false); // ✅ Default to false (User: Record internally only)
    const [debugClickCount, setDebugClickCount] = useState(0);
    const [aiLatency, setAiLatency] = useState(0);
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
    const [poseData, setPoseData] = useState(null); // 실시간 자세 데이터
    const [isPoseLoading, setIsPoseLoading] = useState(false);
    const [alignmentScore, setAlignmentScore] = useState(100); // 0-100 정렬 점수
    const [poseWarnings, setPoseWarnings] = useState([]); // 자세 불균형 경고 목록
    
    // Canvas Refs for Golden Skeleton
    const canvasRef = useRef(null);
    const poseRef = useRef(null); // MediaPipe Pose Instance Ref

    // Refs
    const timerRef = useRef(null);
    const messageIntervalRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const sourceRef = useRef(null);
    const animationFrameRef = useRef(null);
    const videoRef = useRef(null);
    const oscLeftRef = useRef(null);
    const oscRightRef = useRef(null);
    const gainNodeRef = useRef(null);
    const chatEndRef = useRef(null); // Fixed: Missing Ref
    const currentAudioRef = useRef(null); // ✅ Tracking for cleanup
    const ambientAudioRef = useRef(null); // 🎵 Ambient sound (rain, ocean, etc.)
    
    // ✅ Request ID Ref for Race Condition Prevention
    const currentRequestIdRef = useRef(0);

    // Stop Session (useCallback for stability - removed stream dependency to fix V3 crash)
    const stopSession = useCallback(() => {
        // 🛑 STOP AI AUDIO (Fixed Bug)
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
            currentAudioRef.current = null; 
        }

        currentRequestIdRef.current += 1; // Invalidate any pending requests

        clearInterval(timerRef.current); 
        clearInterval(messageIntervalRef.current);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (oscLeftRef.current) { try { oscLeftRef.current.stop(); } catch { /* ignore */ } oscLeftRef.current = null; }
        if (oscRightRef.current) { try { oscRightRef.current.stop(); } catch { /* ignore */ } oscRightRef.current = null; }
        
        // 🎵 Stop Ambient Audio
        if (ambientAudioRef.current) {
            ambientAudioRef.current.pause();
            ambientAudioRef.current.currentTime = 0;
            ambientAudioRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect(); 
            if (sourceRef.current.mediaStream) sourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
            sourceRef.current = null;
        }
        
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
        
        setActiveMode(null);
        setSelectedDiagnosis(null);
        setIsAILoading(false); 
        setNeedsFeedback(true); // ✅ Signal that we need to show feedback greeting
        console.log("🛑 stopSession: needsFeedback set to true, step to diagnosis");
        setAiMessage("");
        setMicVolume(0);
        setPrescriptionReason('');
        setWeatherContext(null);
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }, []); 

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
        ctx.strokeStyle = '#d4af37'; // Gold
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(212, 175, 55, 0.5)';

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

    // ✅ stopAllAudio: Stops Voice & Binaural (Keeps Ambient per User Request)
    const stopAllAudioRef = useRef(null);
    stopAllAudioRef.current = (stopAmbient = false) => {
        // 1. Stop Voice
        stopVoiceOnlyRef.current?.();
        
        // 2. Stop Ambient Audio (Only on explicit request or exit)
        if (stopAmbient && ambientAudioRef.current) {
            try { 
                ambientAudioRef.current.pause(); 
                // ambientAudioRef.current.currentTime = 0; // Don't reset time, just pause? Or reset?
                // User might come back. But "Home" button implies reset.
            } catch { /* ignore */ }
            // Do NOT nullify ref if we want to resume later? 
            // But checking AMBIENT_SOUNDS again will recreate it if null.
            // For now, let's keep it paused.
        }
        
        // 3. Stop Binaural Beats Oscillators
        if (oscLeftRef.current) {
            try { oscLeftRef.current.stop(); } catch { /* ignore */ }
            oscLeftRef.current = null;
        }
        if (oscRightRef.current) {
            try { oscRightRef.current.stop(); } catch { /* ignore */ }
            oscRightRef.current = null;
        }
        
        logDebug("StopAllAudio", { stopAmbient });
    };

    // 🗣️ Fallback Local TTS
    const speakFallback = useCallback((text) => {
        if (!text || typeof window === 'undefined' || !ttcEnabled || !window.speechSynthesis) return;
        
        logDebug("SpeakFallback", text);
        stopVoiceOnlyRef.current?.(); // ✅ Only stop previous voice

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.9; // ✅ 차분하게 속도 조절
        utterance.pitch = 1.0; 
        utterance.volume = 0.8; 
        
        setTimeout(() => {
            if (window.speechSynthesis && ttcEnabled) {
                window.speechSynthesis.speak(utterance);
            }
        }, 100);
    }, [ttcEnabled]);

    // 🔊 Cloud TTS Audio Player (Returns Audio object for chaining)
    const playAudio = useCallback((base64String, onEndedCallback) => {
        if (!ttcEnabled) return null;
        if (!base64String) return null;
        
        try {
            stopVoiceOnlyRef.current?.(); // ✅ Only stop previous voice, keep Ambient/Binaural
            
            const audio = new Audio(`data:audio/mp3;base64,${base64String}`);
            audio.volume = audioVolumes.voice; // ✅ 음량 조절 적용
            currentAudioRef.current = audio;

            setTtsState({ isSpeaking: true, engine: 'Cloud TTS', volume: audio.volume }); // 🛠️ DEBUG

            logDebug("PlayAudio:Start", { vol: audioVolumes.voice });

            audio.onended = () => { 
                logDebug("PlayAudio:Ended");
                setTtsState(prev => ({ ...prev, isSpeaking: false })); // 🛠️ DEBUG
                if (currentAudioRef.current === audio) currentAudioRef.current = null;
                if (onEndedCallback) onEndedCallback();
            };
            
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.error("🔊 Audio Playback Failed:", e);
                    logDebug("PlayAudio:Error", e);
                    setTtsState(prev => ({ ...prev, isSpeaking: false })); // 🛠️ DEBUG
                });
            }
            return audio; // ✅ Return for control
        } catch (e) {
            console.error("🔊 Audio Error:", e);
            logDebug("PlayAudio:Catch", e);
            setTtsState(prev => ({ ...prev, isSpeaking: false })); // 🛠️ DEBUG
            return null;
        }
    }, [ttcEnabled, audioVolumes]);

    // 🗣️ TTS Wrapper
    const speak = useCallback((text) => {
        logDebug("Speak:Start", text);
        console.log("🗣️ [TTS Check] Speaking:", text); // ✅ User Verification Log
        if (!text || typeof window === 'undefined' || !ttcEnabled || !window.speechSynthesis) return;
        
        stopVoiceOnlyRef.current?.(); 
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.9; // ✅ 차분하게 속도 조절
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        utterance.onstart = () => setTtsState({ isSpeaking: true, engine: 'Local TTS', volume: 0.8 }); // 🛠️ DEBUG
        utterance.onend = () => setTtsState(prev => ({ ...prev, isSpeaking: false })); // 🛠️ DEBUG
        utterance.onerror = () => setTtsState(prev => ({ ...prev, isSpeaking: false })); // 🛠️ DEBUG
        
        setTimeout(() => {
            if (window.speechSynthesis && ttcEnabled) {
                window.speechSynthesis.speak(utterance);
            }
        }, 100);
    }, [ttcEnabled]);

    useEffect(() => {
        const hour = new Date().getHours();
        let context = 'morning';
        if (hour >= 5 && hour < 12) context = 'morning';
        else if (hour >= 12 && hour < 18) context = 'afternoon';
        else context = 'night';
        
        setTimeContext(context);
        
        // Select random specialist question
        const questions = SPECIALIST_QUESTIONS[context];
        if (questions) {
             setCurrentQuestion(questions[Math.floor(Math.random() * questions.length)]);
        }

        // 🌤️ AUTO WEATHER DETECTION
        detectWeather();

        return () => { stopSession(); };
    }, [stopSession]);

    // 🧠 Initial AI Question Load: Immediate Fetch (All AI)
    useEffect(() => {
        // [FIX] Removed !isAILoading ensure fetch triggers even if initialized as loading
        if (step === 'diagnosis' && chatHistory.length === 0 && !currentAIChat) {
             fetchAIQuestion(); 
        }
    }, [step, chatHistory.length]);

    // 🏆 SESSION END FEEDBACK GREETING (Rock-solid trigger)
    useEffect(() => {
        console.log(`🔍 Feedback Effect check: step=${step}, needsFeedback=${needsFeedback}`);
        if (step === 'diagnosis' && needsFeedback) {
            console.log("🎯 Session Ended - Injecting Feedback Greeting for:", memberName);
            
            // ✅ 폴백 메시지 (AI 실패 시)
            const hour = new Date().getHours();
            let fallbackMsg;
            if (hour >= 5 && hour < 12) {
                fallbackMsg = `${memberName}님, 아침 명상은 어떠셨나요? 상쾌한 하루를 시작하는 데 도움이 되셨길 바라요. 더 나누고 싶은 이야기가 있으신가요?`;
            } else if (hour >= 12 && hour < 18) {
                fallbackMsg = `${memberName}님, 명상은 어떠셨나요? 오후 시간이 조금 더 편안해지셨길 바라요. 더 나누고 싶은 이야기가 있으신가요?`;
            } else {
                fallbackMsg = `${memberName}님, 오늘의 명상은 어떠셨나요? 편안한 밤 되시길 바라요. 더 나누고 싶은 이야기가 있으신가요?`;
            }
            
            // ✅ Clean up state
            setAiRequestLock(false);
            setIsAILoading(false);
            
            // 초기 폴백 메시지 표시
            setCurrentAIChat({
                message: fallbackMsg,
                options: ["네, 더 이야기할래요", "충분해요, 종료할게요"]
            });
            
            // ✅ AI 피드백 메시지 생성 (비동기)
            if (sessionInfo) {
                (async () => {
                    try {
                        const feedbackResult = await generateMeditationGuidance({
                            type: 'feedback_message',
                            memberName: memberName,
                            timeContext: timeContext,
                            modeName: sessionInfo.modeName,
                            duration: sessionInfo.duration,
                            diagnosis: sessionInfo.diagnosis
                        });
                        
                        if (feedbackResult.data?.message) {
                            const aiMsg = feedbackResult.data.message.replace(/OO님/g, `${memberName}님`);
                            setCurrentAIChat({
                                message: aiMsg,
                                options: ["홈으로 가기"] // ✅ "다시 할까요?" → "홈으로 가기"
                            });
                            
                            // AI 음성 재생
                            if (feedbackResult.data.audioContent) {
                                playAudio(feedbackResult.data.audioContent);
                            } else if (ttcEnabled) {
                                speak(aiMsg);
                            }
                        }
                    } catch (err) {
                        console.error('Feedback message AI failed, using fallback:', err);
                        // 폴백은 이미 표시됨
                        if (ttcEnabled) {
                            speakFallback(fallbackMsg);
                        }
                    }
                })();
            } else {
                // 세션 정보 없으면 폴백 TTS만
                if (ttcEnabled) {
                    speakFallback(fallbackMsg);
                }
            }
            
            setNeedsFeedback(false); // Reset flag
        }
    }, [step, needsFeedback, ttcEnabled, speakFallback, memberName, sessionInfo, timeContext, playAudio, speak]);

    // Auto detect weather using OpenWeatherMap API
    const detectWeather = async () => {
        try {
            // Use geolocation if available
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        try {
                            // OpenWeatherMap API (Free tier)
                            const response = await fetch(
                                `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=bd5e378503939ddaee76f12ad7a97608&units=metric`
                            );
                            const data = await response.json();
                            const weatherMain = data.weather?.[0]?.main?.toLowerCase() || '';
                            const weatherDesc = data.weather?.[0]?.description || '';
                            
                            let detected = WEATHER_OPTIONS[0]; // Default: sunny
                            if (weatherMain.includes('rain') || weatherMain.includes('drizzle')) {
                                detected = WEATHER_OPTIONS.find(w => w.id === 'rain');
                            } else if (weatherMain.includes('snow')) {
                                detected = WEATHER_OPTIONS.find(w => w.id === 'snow');
                            } else if (weatherMain.includes('cloud') || weatherMain.includes('mist') || weatherMain.includes('fog')) {
                                detected = WEATHER_OPTIONS.find(w => w.id === 'cloud');
                            }
                            
                            // 🌡️ FULL ENVIRONMENTAL DATA for AI
                            const fullWeatherData = {
                                ...detected,
                                temp: Math.round(data.main?.temp) || 20, // 온도 (°C)
                                humidity: data.main?.humidity || 50, // 습도 (%)
                                windSpeed: Math.round((data.wind?.speed || 0) * 3.6), // 바람 (km/h)
                                description: weatherDesc, // 상세 설명
                                feelsLike: Math.round(data.main?.feels_like) || 20, // 체감 온도
                                city: data.name || '서울'
                            };
                            
                            setWeatherContext(fullWeatherData);
                            console.log('🌤️ Full Weather:', fullWeatherData);
                        } catch (e) {
                            console.error('Weather API failed:', e);
                            setWeatherContext({ ...WEATHER_OPTIONS[0], temp: 20, humidity: 50, windSpeed: 5 });
                        }
                    },
                    () => {
                        // Geolocation denied
                        setWeatherContext({ ...WEATHER_OPTIONS[0], temp: 20, humidity: 50, windSpeed: 5 });
                    },
                    { timeout: 5000 }
                );
            } else {
                setWeatherContext({ ...WEATHER_OPTIONS[0], temp: 20, humidity: 50, windSpeed: 5 });
            }
        } catch (e) {
            console.error('Weather detection failed:', e);
            setWeatherContext({ ...WEATHER_OPTIONS[0], temp: 20, humidity: 50, windSpeed: 5 });
        }
    };

    useEffect(() => {
        if (cameraStream && videoRef.current) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [cameraStream]);

    useEffect(() => {
        // 1. Binaural Beats Volume
        if (gainNodeRef.current && audioContextRef.current) {
            const currentTime = audioContextRef.current.currentTime;
            // ✅ 음량 조절 적용
            gainNodeRef.current.gain.setTargetAtTime(soundEnabled ? audioVolumes.binaural : 0, currentTime, 0.5);
        }

        // 2. Ambient Audio Volume
        if (ambientAudioRef.current) {
            // ✅ 음량 조절 적용
            ambientAudioRef.current.volume = soundEnabled ? audioVolumes.ambient : 0;
        }
    }, [soundEnabled, audioVolumes]);

    // 🎵 Global Ambient Audio Manager
    useEffect(() => {
        if (!selectedAmbient || selectedAmbient === 'none') {
            if (ambientAudioRef.current) {
                ambientAudioRef.current.pause();
                ambientAudioRef.current = null;
            }
            return;
        }

        const ambientDef = AMBIENT_SOUNDS.find(s => s.id === selectedAmbient);
        if (!ambientDef) return;

        // Create or update audio
        if (!ambientAudioRef.current || !ambientAudioRef.current.src.includes(ambientDef.file)) {
            if (ambientAudioRef.current) ambientAudioRef.current.pause();
            
            // Note: In a real app, these should be valid URLs. 
            // Assuming the constants/meditationConstants provides valid paths or we use a specialized player.
            // For now, using a placeholder logic or assuming the file property is a valid path/ID.
            // If they are local files, ensure imports work. 
            // The user report says "only frequency sound" which implies this was missing.
            
            // Check if ambientDef.file is a local path or URL? 
            // Looking at standard project structure, likely it's an import or public URL.
            // Assuming it's a URL or path string.
            
            const audio = new Audio(ambientDef.file); 
            audio.loop = true;
            audio.volume = soundEnabled ? audioVolumes.ambient : 0;
            ambientAudioRef.current = audio;
        }

        // 🌊 배경음 재생 조건: 처방(분석), 가이드 선택, 준비, 세션 단계에서 모두 재생
        const activeAmbientSteps = ['prescription_summary', 'interaction_select', 'prescription', 'preparation', 'session'];
        if ((isPlaying || activeAmbientSteps.includes(step)) && soundEnabled) {
            ambientAudioRef.current.play().catch(e => console.warn("Ambient play failed:", e));
        } else {
            ambientAudioRef.current.pause();
        }
    }, [selectedAmbient, isPlaying, soundEnabled, audioVolumes.ambient, step]);



    // ✅ fetchAIPrescription: Standalone function for diagnosis/weather handlers
    const fetchAIPrescription = async (diagnosisId, weatherId, modeId, intType, currentSummary) => {
        try {
            // Don't set global loading here to avoid full screen blocker if purely background update
            // But if we want to show "Loading..." in prescription step, we can use a local state or just let it pop in.
            // For now, let's use isAILoading if we are transitioning.
            
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
    };

    const fetchAIQuestion = async (history = []) => {
        if (aiRequestLock) return; 
        setAiRequestLock(true);
        setIsAILoading(true);

        // 🔒 Generate New Request ID
        const requestId = currentRequestIdRef.current + 1;
        currentRequestIdRef.current = requestId;
        
        try {
            const hour = new Date().getHours();
            let currentContext = 'night';
            if (hour >= 5 && hour < 12) currentContext = 'morning';
            else if (hour >= 12 && hour < 18) currentContext = 'afternoon';
            
            console.log(`🤖 Fetching AI Question for: ${memberName} (ID: ${requestId})`);
            
            let timeoutId;
            // ✅ TIMEOUT PROTECTION: Force fallback if API hangs > 12s
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
                }, 18000); 
            });

            const startTime = Date.now();
            const apiPromise = generateMeditationGuidance({ 
                type: 'question', 
                memberName: memberName || '회원', 
                timeContext: currentContext,
                chatHistory: history,
                intentionFocus: selectedIntention?.focus // ✅ 전문가 관점 적용
            });

            // Race API vs Timeout
            const result = await Promise.race([apiPromise, timeoutPromise]);
            setAiLatency(Date.now() - startTime);
            clearTimeout(timeoutId); // ✅ Clean up timeout

            // 🛡️ RACE CONDITION GUARD
            if (requestId !== currentRequestIdRef.current) {
                console.warn(`Ignoring stale AI response (ID: ${requestId}, Current: ${currentRequestIdRef.current})`);
                return;
            }

            console.log("🤖 AI Response:", result.data);
            if (result.data) {
                // ✅ Personalization Safety: Replace placeholders if backend missed them
                if (result.data.message) {
                    result.data.message = result.data.message.replace(/OO님/g, `${memberName}님`);
                }
                if (result.data.question) {
                    result.data.question = result.data.question.replace(/OO님/g, `${memberName}님`);
                }
                
                // ✅ Text Sync: Set active chat immediately
                setCurrentAIChat(result.data);
                
                // 🔊 Play Audio & (Removed Auto Transition)
                if (result.data.audioContent) {
                    playAudio(result.data.audioContent);
                } else if (result.data.isFinalAnalysis) {
                    if (ttcEnabled) speak(result.data.message);
                }
            }
        } catch (error) {
            // 🛡️ RACE CONDITION GUARD for Error
            if (requestId !== currentRequestIdRef.current) return;

            console.error('AI Question failed:', error);
            setCurrentAIChat({
                message: "죄송해요, 잠시 연결이 고르지 않네요. 계속 대화해볼까요?",
                options: ["네, 좋아요", "그냥 시작할게요"]
            });
        } finally {
            // 🛡️ Check ID before unlocking (optional but safer)
            if (requestId === currentRequestIdRef.current) {
                setIsAILoading(false);
                setAiRequestLock(false);
            }
        }
    };

    // --- Chat Handlers ---
    const handleChatResponse = async (answer) => {
        if (!answer || aiRequestLock) return;
        
        // ✅ 홈으로 가기 처리
        if (answer === "홈으로 가기") {
            stopAllAudioRef.current?.();
            if (onClose) onClose();
            else navigate('/');
            return;
        }
        
        // ✅ 명상 시작 동의 시 처방 분석 단계로 이동
        if (["네, 시작할게요", "맞춤 명상 시작하기", "명상하고 싶어요", "시작할게요", "명상 시작"].some(trigger => answer.includes(trigger))) {
            const diag = DIAGNOSIS_OPTIONS.find(o => o.id === currentAIChat?.mappedDiagnosis) || SELECTED_DIAGNOSIS_FALLBACK;
            setSelectedDiagnosis(diag);
            setStep('prescription_summary');
            return;
        }
        
        // ✅ 홈으로 가기 처리
        stopAllAudioRef.current?.();

        // 1. Move CURRENT AI chat to history BEFORE clearing
        let updatedHistory = [...chatHistory];
        if (currentAIChat) {
            const aiText = currentAIChat.message || currentAIChat.question;
            if (aiText) {
                updatedHistory = [...updatedHistory, { role: 'model', content: aiText }];
            }
        }

        // 2. Add User Answer
        const userMsg = { role: 'user', content: answer };
        updatedHistory = [...updatedHistory, userMsg];
        
        // 3. Update States
        setChatHistory(updatedHistory);
        setCurrentAIChat(null); 
        setIsAILoading(true);

        // 4. Scroll to bottom
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

        // 5. Fetch Next Question
        await fetchAIQuestion(updatedHistory);
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (!manualInput.trim()) return;
        const text = manualInput;
        setManualInput(""); // Clear first for UX
        handleChatResponse(text);
    };


    // Fetch AI session message (during meditation)
    const fetchAISessionMessage = async () => {
        try {
            const startTime = Date.now();
            const result = await generateMeditationGuidance({
                type: 'session_message',
                memberName: memberName, // ✅ Personalize
                timeContext: timeContext,
                diagnosis: selectedDiagnosis?.id,
                mode: activeMode?.id === 'breath' ? '3min' : (activeMode?.id === 'calm' ? '7min' : '15min'),
                interactionType: interactionType,
                messageIndex: aiSessionMessageIndex
            });
            setAiLatency(Date.now() - startTime);
            
            // ✅ ERROR HANDLING: If backend returns fallback error, force local fallback
            if (result.data && result.data.error) {
                throw new Error("Backend Returned Error: " + result.data.error);
            }

            if (result.data && result.data.message) {
                // ✅ Personalization Safety
                // ✅ Personalization Safety
                const personalizedMsg = result.data.message.replace(/OO님/g, `${memberName}님`);
                console.log("🤖 [AI Message Check] Display Text:", personalizedMsg); // ✅ User Verification Log
                setAiMessage(personalizedMsg);
                setAiSessionMessageIndex(prev => prev + 1);
                
                // Play Cloud Audio ONLY
                if (result.data.audioContent) {
                    playAudio(result.data.audioContent);
                }
            }
        } catch (error) {
            console.error('AI Session message failed:', error);
            // Fallback to static messages
            const messages = AI_SESSION_MESSAGES[interactionType] || AI_SESSION_MESSAGES['v1'];
            const msg = messages[aiSessionMessageIndex % messages.length];
            setAiMessage(msg);
            setAiSessionMessageIndex(prev => prev + 1);
            // No Audio Fallback
        }
    };



    // 🗣️ TTS Wrapper (Consolidated)
    // Removed auto-speak useEffect to prevent duplicate audio with Cloud TTS

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (step === 'diagnosis' && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, isAILoading, currentAIChat, step]);

    const getAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContextRef.current;
    };

    // --- Meditation Specialist Prescription Logic ---
    const generateReason = (time, weatherId, diagnosisId) => {
        const timeText = time === 'morning' ? '하루를 시작하는 아침,' : time === 'afternoon' ? '에너지가 필요한 오후,' : '하루를 정리하는 밤,';
        
        let coreMessage = "";
        
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
        } else {
            coreMessage = "당신의 지금 상태에 딱 맞는 명상을 준비했어요. 마음의 소리에 귀를 기울이며 편안하게 시작해볼까요?";
        }

        return `${timeText} ${coreMessage}`;
    };

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

    // 🔄 Handle Return to Chat (Fix: Silent text & Awkward flow)
    const handleReturnToChat = async () => {
        setStep('diagnosis');
        setIsAILoading(true);
        
        // ✅ 즉시 부드러운 재개 메시지 표시 (AI 생성 전)
        const warmReconnectMsg = `${memberName}님, 다시 돌아오셨네요. 혹시 더 나누고 싶은 이야기가 있으신가요?`;
        setCurrentAIChat({
            message: warmReconnectMsg,
            options: ["네, 있어요", "괜찮아요, 명상할게요"]
        });
        
        // TTS로 즉시 재생
        if (ttcEnabled) speak(warmReconnectMsg);

        // 컨텍스트 보존 프롬프트 (백그라운드에서 더 나은 응답 생성)
        const lastUserMsg = chatHistory.filter(m => m.role === 'user').pop()?.content || '';
        const newHistory = [...chatHistory, { 
            role: 'system',
            content: `[Context] User briefly viewed meditation options but chose to continue conversation. Last discussed: "${lastUserMsg}". Gently ask if they want to explore that topic more deeply, in a warm, human, conversational tone. Do NOT sound robotic or templated.` 
        }];
        setChatHistory(newHistory);
        
        // Fetch improved AI response (will replace the initial message)
        await fetchAIQuestion(newHistory);
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
        const audioCtx = getAudioContext();

        // 🔊 Always ensure AudioContext is ACTIVE
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        // Binaural Beats
        const carrierFreq = 200; 
        const beatFreq = mode.freq; 

        console.log(`🎵 [Binaural Debug] Creating binaural beats - Carrier: ${carrierFreq}Hz, Beat: ${beatFreq}Hz`);
        console.log(`🎵 [Binaural Debug] Sound Enabled: ${soundEnabled}`);

        const oscL = audioCtx.createOscillator();
        const oscR = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscL.type = 'sine'; oscR.type = 'sine';
        oscL.frequency.value = carrierFreq;
        oscR.frequency.value = carrierFreq + beatFreq;

        const pannerL = audioCtx.createStereoPanner();
        const pannerR = audioCtx.createStereoPanner();
        pannerL.pan.value = -1; pannerR.pan.value = 1;

        oscL.connect(pannerL); pannerL.connect(gainNode);
        oscR.connect(pannerR); pannerR.connect(gainNode);

        gainNode.connect(audioCtx.destination);
        // ✅ Set volume based on soundEnabled (0.25 when enabled, 0 when disabled)
        const initialVolume = soundEnabled ? 0.25 : 0;
        gainNode.gain.value = initialVolume;
        
        console.log(`🎵 [Binaural Debug] Initial volume set to: ${initialVolume}`);

        oscL.start(); oscR.start();
        
        console.log(`✅ [Binaural Debug] Oscillators started successfully`);

        oscLeftRef.current = oscL; oscRightRef.current = oscR;
        gainNodeRef.current = gainNode;

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
                    
                    if (introTTS.data?.audioContent) {
                        playAudio(introTTS.data.audioContent);
                    } else {
                        // Fallback: Browser TTS
                        speak(introMessage);
                    }
                } catch (err) {
                    console.error('Intro TTS failed:', err);
                    speak(introMessage);
                }
            })();
        }
        
        startTimer();
        
        // Delay the first AI session message to let pre-intro breathe
        setTimeout(() => {
            startMessageLoop();
        }, 8000);
    };

    const setupAudioAnalysis = (stream, audioCtx) => {
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;
        sourceRef.current = source;
        drawAudioVisualizer();
    };

    const drawAudioVisualizer = () => {
        if (!analyserRef.current) return;
        animationFrameRef.current = requestAnimationFrame(drawAudioVisualizer);
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        let sum = 0;
        // Focus on lower frequencies (breath range)
        for (let i = 0; i < 15; i++) { sum += dataArrayRef.current[i]; }
        const average = sum / 15;
        // Increased sensitivity for breathing and low volume
        setMicVolume(Math.min((average * 6) / 100, 2.5));
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

    const startMessageLoop = () => {
        if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
        
        // First message - try AI
        fetchAISessionMessage();
        
        // Continue with AI messages every 20 seconds
        messageIntervalRef.current = setInterval(() => {
            fetchAISessionMessage();
        }, 20000);
    };

    const togglePlay = () => {
        if (isPlaying) {
            clearInterval(timerRef.current); clearInterval(messageIntervalRef.current);
            if (audioContextRef.current) audioContextRef.current.suspend();
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (videoRef.current) videoRef.current.pause();
            setIsPlaying(false);
        } else {
            setIsPlaying(true); startTimer(); startMessageLoop();
            if (audioContextRef.current) audioContextRef.current.resume();
            if (interactionType === 'v2') drawAudioVisualizer();
            if (videoRef.current) videoRef.current.play();
        }
    };

    // State for Analysis Transition
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const finishAnalysis = useCallback((forceStart = false) => {
        setIsAnalyzing(true);
        // Clean up chat loop
        if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
        
        // Transition delay for effect
        setTimeout(() => {
            setIsAnalyzing(false);
            stopSession(true); // Stop background audio if any
            setStep('prescription'); // Move to next step
        }, 2000);
    }, []);

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
                const duration = activeMode?.time || 300;
                
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
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 9999,
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
                                <div style={{ color: '#4c9bfb', fontWeight: 700, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                    position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 9999,
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
                    position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 9999,
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
                                stopAllAudioRef.current?.(); 
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
                                fontSize: '1.6rem', fontWeight: 600, color: '#4c9bfb', 
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
                                        e.currentTarget.style.borderColor = '#4c9bfb';
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
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 9999,
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
                                fontSize: '1.5rem', fontWeight: 600, color: '#4c9bfb', 
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
                                        fetchAIQuestion([{ role: 'user', content: intention.label }]);
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
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 9999, // 🌑 Dark Mode
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
                            <button onClick={() => { stopAllAudioRef.current?.(); if(onClose) onClose(); else navigate(-1); }} style={{ padding: '8px', border: 'none', background: 'none', cursor: 'pointer' }}>
                                <ArrowLeft size={22} color="white" />
                            </button>
                            <div onClick={handleDebugToggle} style={{ marginLeft: '10px', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>복순 (마음 챙김이)</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <SpeakerHigh size={12} color={ttcEnabled ? "#4caf50" : "#666"} weight="fill" />
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
                                    border: '1px solid #4c9bfb',
                                    color: '#4c9bfb',
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
                                             background: isMe ? 'linear-gradient(135deg, #d4af37, #f1c40f)' : 'rgba(255,255,255,0.08)',
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
                                     background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                     overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0
                                 }}>
                                      <img src="/pwa-192x192.png" alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display='none'; e.target.parentNode.innerText='🧘‍♀️'; }} />
                                 </div>
                                 <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '6px' }}>
                                     <div style={{
                                         background: 'rgba(255,255,255,0.08)', color: 'white', padding: '14px 18px',
                                         borderRadius: '4px 18px 18px 18px', maxWidth: '75vw', fontSize: '1.0rem', lineHeight: '1.6',
                                         boxShadow: '0 4px 15px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)'
                                     }}>{currentAIChat.message || currentAIChat.question || "오늘 하루는 어떠셨나요?"}</div>
                                     <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>
                                         {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                     </span>
                                 </div>
                             </div>
                        )}

                        {isAILoading && (
                             <div style={{ alignSelf: 'center', marginTop: '10px' }}>
                                 <AILoadingIndicator compact={true} message={chatHistory.length === 0 ? "AI 복순이가 당신의 마음을 듣고 있어요..." : null} />
                             </div>
                        )}
                        <div ref={chatEndRef} style={{ height: '2px', width: '100%' }} />
                    </div>

                    {/* 3. Bottom Options & Input */}
                    <div style={{
                        background: '#1a1a1d', borderTop: '1px solid rgba(255,255,255,0.1)',
                        padding: '15px', paddingBottom: 'calc(15px + env(safe-area-inset-bottom))',
                        display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 20
                    }}>
                        {!isAILoading && currentAIChat?.options && (
                            <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none', justifyContent: 'flex-start' }}>
                                {currentAIChat.options.map((opt, i) => (
                                    <button key={i} onClick={() => { stopAllAudioRef.current?.(); handleChatResponse(opt); }}
                                        style={{
                                            flex: '0 0 auto', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                                            padding: '10px 18px', borderRadius: '18px', color: 'rgba(255,255,255,0.9)', 
                                            fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(5px)'
                                        }}>{opt}</button>
                                ))}
                            </div>
                        )}
                        {!currentAIChat?.isFinalAnalysis && !currentAIChat?.isTransition && (
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
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 2000,
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
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 2000,
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
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 2000,
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
                            cursor: 'pointer', boxShadow: '0 10px 20px rgba(212,175,55,0.3)'
                        }}>명상 모드 선택하기</button>
                    
                    <button onClick={() => setStep('diagnosis')}
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
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 2000,
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
                                const defaultMode = MEDITATION_MODES.find(m => m.id === selectedDiagnosis?.prescription.modeId) || MEDITATION_MODES[1];
                                setActiveMode(defaultMode);
                                setTimeLeft(defaultMode.time);
                                // Fetch real prescription details in background
                                fetchAIPrescription(selectedDiagnosis?.id || 'stress', weatherContext?.id || 'sun', defaultMode.id, t.id, "");
                                setStep('preparation');
                                setPrepStep(3); // Go to Posture Guide
                            }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '20px', padding: '25px',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '24px', color: 'white', textAlign: 'left', cursor: 'pointer', transition: 'all 0.3s'
                                }}>
                                <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-gold)' }}>
                                    {t.id === 'v1' ? <Wind size={28} /> : t.id === 'v2' ? <Microphone size={28} /> : <VideoCamera size={28} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px' }}>{t.label}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{t.desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'prescription' && selectedDiagnosis && activeMode) {
        const ModeIcon = ICON_MAP[activeMode.iconName] || ICON_MAP.Wind;
        
        return (
            <div style={{
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 2000,
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
                                <div style={{ color: 'var(--primary-gold)', fontWeight: 700, marginBottom: '8px', fontSize: '0.85rem' }}>📋 AI 복순이의 심리 분석</div>
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
                                        {interactionType === 'v1' && '바디스캔 가이드'}
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
                                cursor: 'pointer', boxShadow: '0 10px 20px rgba(212,175,55,0.3)'
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
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 2000,
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
                        <button onClick={() => setStep('prescription')} style={{ padding: '10px', color: 'white', background: 'none', border: 'none' }}>
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
                                        <div style={{ color: '#4c9bfb', fontWeight: 700, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                                            borderRadius: '12px', border: '1px solid rgba(74, 222, 128, 0.2)', fontSize: '0.85rem', color: '#4ade80'
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
            <div style={{
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 9999,
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
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
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                        <div style={{ marginBottom: '30px', color: 'var(--primary-gold)' }}>
                            <Sparkle size={60} weight="fill" />
                        </div>
                        
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: '10px', textAlign: 'center' }}>
                            오늘의 명상을 마쳤습니다
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '40px', textAlign: 'center' }}>
                            오늘 하루, 당신의 마음을 잘 돌보셨나요?
                        </p>

                        {/* AI Summary Card */}
                        <div style={{ 
                            width: '100%', maxWidth: '400px', background: 'rgba(255,255,255,0.08)', 
                            borderRadius: '24px', padding: '25px', border: '1px solid rgba(255,255,255,0.1)',
                            marginBottom: '40px'
                        }}>
                             <div style={{ color: 'var(--primary-gold)', fontWeight: 700, marginBottom: '15px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img src="/pwa-192x192.png" alt="AI" style={{ width: '100%' }} />
                                </div>
                                AI 복순이의 마음 일기
                             </div>
                             
                             {isAILoading ? (
                                 <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px' }}>
                                     명상 결과를 정리하고 있습니다...
                                 </div>
                             ) : (
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                     {points.length > 0 ? (
                                         points.map((p, i) => (
                                             <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '1.0rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
                                                 <span style={{ color: 'var(--primary-gold)' }}>•</span>
                                                 <span>{p}</span>
                                             </div>
                                         ))
                                     ) : (
                                         <div style={{ color: 'white', fontSize: '1.1rem', lineHeight: 1.7 }}>
                                             {feedbackData?.message || "오늘 하루도 평온하시길 바랍니다."}
                                         </div>
                                     )}
                                 </div>
                             )}
                        </div>

                        {/* Back home button */}
                        {!isAILoading && (
                            <button onClick={() => { stopAllAudioRef.current?.(true); if(onClose) onClose(); else navigate('/member-profile'); }} style={{
                                width: '100%', maxWidth: '300px', background: 'white', color: 'black',
                                padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, border: 'none',
                                cursor: 'pointer', transition: 'all 0.3s ease'
                            }}>홈으로 돌아가기</button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 4. Active Session Step
    const breathingScale = interactionType === 'v2' ? 1 + micVolume : 1;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 3000,
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
                        padding: interactionType === 'v3' ? '15px' : '0', borderRadius: '15px'
                    }}>
                        {aiMessage}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: micVolume > 0.1 ? '#4ade80' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }}>
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
                                background: 'linear-gradient(90deg, #4ade80, #32ff7e)',
                                transition: 'width 0.1s ease-out',
                                boxShadow: '0 0 10px rgba(74, 222, 128, 0.5)'
                            }} />
                        </div>
                        {micVolume > 0.1 && (
                            <span style={{ fontSize: '0.7rem', color: '#4ade80', animation: 'pulse 1s infinite' }}>감지 중...</span>
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
                                <LockKey size={12} weight="fill" color="#4ade80" /> 데이터는 기기 내에서만 처리됩니다
                            </div>
                        )
                    )}
                </div>
                
                {permissionError && (
                    <div style={{ marginTop: '20px', padding: '10px', background: 'rgba(255,0,0,0.2)', color: '#ff6b6b', borderRadius: '8px', fontSize: '0.9rem' }}>
                        ⚠️ {permissionError}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div style={{ position: 'absolute', bottom: '60px', display: 'flex', alignItems: 'center', gap: '40px', zIndex: 20 }}>
                <button onClick={() => { 
                    stopSession(); 
                    if(onClose) onClose(); 
                    else navigate('/member'); 
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

                <button onClick={() => setSoundEnabled(!soundEnabled)} style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)', border: 'none', 
                    color: soundEnabled ? 'white' : 'rgba(255,255,255,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}>
                    {soundEnabled ? <SpeakerHigh size={28} /> : <SpeakerSlash size={28} />}
                </button>

                {/* TTC Toggle Button - Repositioned and stylized */}
                <div style={{ 
                    position: 'absolute', right: '0', bottom: '100px', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
                }}>
                    <button onClick={() => {
                        const next = !ttcEnabled;
                        setTtcEnabled(next);
                        if (next && window.speechSynthesis) {
                            window.speechSynthesis.cancel();
                            const utterance = new SpeechSynthesisUtterance("음성 안내를 시작합니다.");
                            utterance.lang = 'ko-KR';
                            utterance.volume = 0.3;
                            window.speechSynthesis.speak(utterance);
                            if (isPlaying) fetchAISessionMessage();
                        } else if (!next && window.speechSynthesis) {
                            window.speechSynthesis.cancel();
                        }
                    }} style={{
                        width: '50px', height: '50px', borderRadius: '15px',
                        background: ttcEnabled ? 'var(--primary-gold)' : 'rgba(255,255,255,0.15)', border: 'none', 
                        color: ttcEnabled ? '#000' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        transition: 'all 0.3s ease', boxShadow: ttcEnabled ? '0 0 20px rgba(212,175,55,0.4)' : 'none'
                    }}>
                        <SpeakerHigh size={26} weight={ttcEnabled ? "fill" : "regular"} />
                    </button>
                    <span style={{ fontSize: '0.7rem', color: ttcEnabled ? 'var(--primary-gold)' : 'rgba(255,255,255,0.4)', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>TTC ON</span>
                </div>
            </div>

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

// 🛠️ Meditation Debug Overlay Component
const MeditationDebugOverlay = ({ isVisible, ttsState, currentStep, audioLevels, currentText, aiLatency }) => {
    if (!isVisible) return null;

    return (
        <div style={{
            position: 'fixed', top: '80px', left: '20px', right: '20px',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0,255,255,0.3)', borderRadius: '15px',
            padding: '15px', color: '#00ffff', fontSize: '0.75rem', zIndex: 10000,
            fontFamily: 'monospace', pointerEvents: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid rgba(0,255,255,0.2)', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>[MEDITATION DEBUG MODE]</span>
                <span>Latency: {aiLatency}ms</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                    <div style={{ color: '#fff', marginBottom: '4px' }}>📡 AI \u0026 Step Status</div>
                    <div>Step: {currentStep}</div>
                    <div>TTS Engine: {ttsState.engine}</div>
                    <div>Speaking: {ttsState.isSpeaking ? 'YES' : 'NO'}</div>
                </div>
                <div>
                    <div style={{ color: '#fff', marginBottom: '4px' }}>🔊 Audio Levels</div>
                    <div>Voice: {Math.round(audioLevels.voice * 100)}%</div>
                    <div>Ambient: {Math.round(audioLevels.ambient * 100)}%</div>
                    <div>Binaural: {Math.round(audioLevels.binaural * 100)}%</div>
                </div>
            </div>

            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(0,255,255,0.1)' }}>
                <div style={{ color: '#fff', marginBottom: '4px' }}>📝 Raw TTS Text:</div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px', maxHeight: '60px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                    {currentText || 'No text currently processed'}
                </div>
            </div>
        </div>
    );
};

export default MeditationPage;
