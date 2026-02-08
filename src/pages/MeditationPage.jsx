import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { Icons } from '../components/CommonIcons';
import { MEDITATION_MODES, INTERACTION_TYPES, DIAGNOSIS_OPTIONS, WEATHER_OPTIONS, SPECIALIST_QUESTIONS, AI_SESSION_MESSAGES, AMBIENT_SOUNDS } from '../constants/meditationConstants';

// 🤖 AI Posture Analysis (MediaPipe) - Loaded Dynamically
// import { Pose } from '@mediapipe/pose'; // REMOVED: Dynamic import used instead
// import * as tf from '@tensorflow/tfjs-core'; // REMOVED: Dynamic import used instead
// import '@tensorflow/tfjs-backend-webgl'; // REMOVED: Dynamic import used instead

// Unlock icons
const { 
    Play, Pause, X, Wind, SpeakerHigh, SpeakerSlash, Brain, Microphone, VideoCamera, 
    LockKey, Heartbeat, SmileySad, Lightning, Barbell, Sparkle, Sun, CloudRain, 
    CloudSnow, Cloud 
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

const MeditationPage = ({ onClose }) => {
    const navigate = useNavigate();
    
    // Stable Refs for cleanup without re-triggering effects
    const cameraStreamRef = useRef(null);
    const [step, setStep] = useState('diagnosis'); 
    
    // Context State
    const [timeContext, setTimeContext] = useState('morning');
    const [weatherContext, setWeatherContext] = useState(null);
    const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
    const [prescriptionReason, setPrescriptionReason] = useState('');
    const [currentQuestion, setCurrentQuestion] = useState(null);

    // Session Settings
    const [activeMode, setActiveMode] = useState(null); 
    const [interactionType, setInteractionType] = useState('v1');
    const [needsFeedback, setNeedsFeedback] = useState(false); // ✅ Track if session just ended

    const [isPlaying, setIsPlaying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [aiMessage, setAiMessage] = useState("");
    const [soundEnabled, setSoundEnabled] = useState(true); 
    const [ttcEnabled, setTtcEnabled] = useState(true); // TTC (Text To Calm) Voice Guidance - Default ON
    const [selectedAmbient, setSelectedAmbient] = useState('none'); // 🎵 Ambient sound selection
    
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

    // 🧘 Preparation Flow States
    const [prepStep, setPrepStep] = useState(1); // 1: Notifications, 2: Posture, 3: Goal
    const [prepSelections, setPrepSelections] = useState({
        notified: false,
        posture: 'chair', // 'chair', 'floor', 'lying'
        goal: null
    });

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

        setIsPlaying(false);
        setStep('diagnosis');
        setPrepStep(1); // Reset prep
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

    // Empty callback for now (will implement properly when restoring Pose)
    const onPoseResults = useCallback((results) => {
        // Placeholder for restoring logic
        if (!results.poseLandmarks || !canvasRef.current) return;
        // Logic will be restored in next step if needed, or simplifed here
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
    const stopAllAudioRef = useRef(null);
    stopAllAudioRef.current = () => {
        // ✅ 모든 오디오 소스 종합 중단
        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
        
        // Cloud TTS Audio
        if (currentAudioRef.current) {
            try { currentAudioRef.current.pause(); currentAudioRef.current.currentTime = 0; } catch { /* ignore */ }
            currentAudioRef.current = null;
        }
        
        // 🎵 Ambient Audio (빗소리, 파도 등)
        if (ambientAudioRef.current) {
            try { ambientAudioRef.current.pause(); ambientAudioRef.current.currentTime = 0; } catch { /* ignore */ }
            ambientAudioRef.current = null;
        }
        
        // 🎛️ Binaural Beats Oscillators
        if (oscLeftRef.current) {
            try { oscLeftRef.current.stop(); } catch { /* ignore */ }
            oscLeftRef.current = null;
        }
        if (oscRightRef.current) {
            try { oscRightRef.current.stop(); } catch { /* ignore */ }
            oscRightRef.current = null;
        }
        
        console.log("🔇 stopAllAudio: All audio sources stopped");
    };

    // 🗣️ Fallback Local TTS
    const speakFallback = useCallback((text) => {
        if (!text || typeof window === 'undefined' || !ttcEnabled || !window.speechSynthesis) return;
        
        stopAllAudioRef.current?.();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 1.0; 
        utterance.pitch = 1.0; 
        utterance.volume = 0.8; 
        
        setTimeout(() => {
            if (window.speechSynthesis && ttcEnabled) {
                window.speechSynthesis.speak(utterance);
            }
        }, 100);
    }, [ttcEnabled]);

    // 🔊 Cloud TTS Audio Player
    const playAudio = useCallback((base64String) => {
        if (!ttcEnabled) return;
        if (!base64String) return;
        
        try {
            stopAllAudioRef.current?.();
            
            const audio = new Audio(`data:audio/mp3;base64,${base64String}`);
            audio.volume = 0.9; 
            currentAudioRef.current = audio;

            audio.onended = () => { if (currentAudioRef.current === audio) currentAudioRef.current = null; };
            
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => console.error("🔊 Audio Playback Failed:", e));
            }
        } catch (e) {
            console.error("🔊 Audio Error:", e);
        }
    }, [ttcEnabled]);

    // 🗣️ TTS Wrapper (Consolidated) - speakFallback 의존성 제거하여 TDZ 방지
    const speak = useCallback((text) => {
        // 인라인 TTS 로직 (speakFallback 호출 대신)
        if (!text || typeof window === 'undefined' || !ttcEnabled || !window.speechSynthesis) return;
        
        stopAllAudioRef.current?.();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
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
            const msg = `${memberName}님, 명상은 어떠셨나요? 몸과 마음이 조금이라도 더 편안해지셨길 바라요. 더 나누고 싶은 이야기가 있으신가요?`;
            
            // ✅ Clean up state and set feedback
            setAiRequestLock(false);
            setIsAILoading(false);
            setCurrentAIChat({
                message: msg,
                options: ["네, 더 이야기할래요", "충분해요, 종료할게요"]
            });
            
            if (ttcEnabled) {
                console.log("🔊 Speaking feedback greeting");
                speakFallback(msg);
            }
            setNeedsFeedback(false); // Reset flag
        }
    }, [step, needsFeedback, ttcEnabled, speakFallback, memberName]);

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
            // 0.25 matches startSession volume
            gainNodeRef.current.gain.setTargetAtTime(soundEnabled ? 0.25 : 0, currentTime, 0.5);
        }

        // 2. Ambient Audio Volume
        if (ambientAudioRef.current) {
            // 0.5 matches startSession volume
            ambientAudioRef.current.volume = soundEnabled ? 0.5 : 0;
        }
    }, [soundEnabled]);



    // ✅ fetchAIPrescription: Standalone function for diagnosis/weather handlers
    const fetchAIPrescription = async (diagnosisId, weatherId, modeId, intType, currentSummary) => {
        try {
            // Don't set global loading here to avoid full screen blocker if purely background update
            // But if we want to show "Loading..." in prescription step, we can use a local state or just let it pop in.
            // For now, let's use isAILoading if we are transitioning.
            
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
                }, 12000); 
            });

            const apiPromise = generateMeditationGuidance({ 
                type: 'question', 
                memberName: memberName || '회원', 
                timeContext: currentContext,
                chatHistory: history 
            });

            // Race API vs Timeout
            const result = await Promise.race([apiPromise, timeoutPromise]);
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
                
                // Play Cloud Audio (ONE CALL ONLY)
                if (result.data.audioContent) {
                    playAudio(result.data.audioContent);
                } else if (result.data.error === 'timeout') {
                    // Timeout fallback - speak locally if possible
                     speak("잠시 연결이 늦어지네요. 오늘 마음은 어떠세요?");
                }

                if (result.data.isFinalAnalysis) {
                    const diag = DIAGNOSIS_OPTIONS.find(o => o.id === result.data.mappedDiagnosis) || DIAGNOSIS_OPTIONS[0];
                    setSelectedDiagnosis(diag);
                    const defaultMode = MEDITATION_MODES[0]; 
                    if (!activeMode) {
                        setActiveMode(defaultMode);
                        setTimeLeft(defaultMode.time);
                    }
                    
                    // ✅ 자연스러운 전환 멘트
                    const transitionMsg = `${memberName}님, 그럼 이제 명상으로 함께 가볼까요?`;
                    setCurrentAIChat({ 
                        message: transitionMsg, 
                        options: ["네, 갈게요"],
                        isTransition: true,
                        analysisSummary: result.data.analysisSummary || result.data.message || ""
                    });
                    
                    // ✅ 처방 파라미터 저장
                    const wId = weatherContext?.id || 'sun';
                    const mId = activeMode?.id || defaultMode.id;
                    const iType = interactionType || 'v1';
                    const summary = result.data.analysisSummary || result.data.message || "";
                    
                    // 3초 후 prescription 화면으로 전환 후 처방 직접 로드 (인라인, 함수 참조 없음)
                    setTimeout(async () => {
                        setStep('prescription');
                        
                        // ✅ 직접 Cloud Function 호출 (fetchAIPrescription 참조 안함)
                        try {
                            setIsAILoading(true);
                            const prescResult = await generateMeditationGuidance({
                                type: 'prescription',
                                memberName: memberName,
                                timeContext: timeContext,
                                weather: wId,
                                diagnosis: diag.id,
                                analysisSummary: summary,
                                mode: mId === 'breath' ? '3min' : (mId === 'calm' ? '7min' : '15min'),
                                interactionType: iType
                            });
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
                            console.error('Inline Prescription fetch failed:', err);
                        } finally {
                            setIsAILoading(false);
                        }
                    }, 3000);
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
        
        // 🛑 Stop current AI voice immediately when user responds
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
            const result = await generateMeditationGuidance({
                type: 'session_message',
                memberName: memberName, // ✅ Personalize
                timeContext: timeContext,
                diagnosis: selectedDiagnosis?.id,
                mode: activeMode?.id === 'breath' ? '3min' : (activeMode?.id === 'calm' ? '7min' : '15min'),
                interactionType: interactionType,
                messageIndex: aiSessionMessageIndex
            });
            if (result.data && result.data.message) {
                // ✅ Personalization Safety
                const personalizedMsg = result.data.message.replace(/OO님/g, `${memberName}님`);
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
        setCurrentAIChat(null); // Clear stale analysis

        // Add System Note to prompt AI
        const newHistory = [...chatHistory, { 
            role: 'user', 
            content: "[System]: User returned from prescription screen. Ask if they want to change anything or share more details." 
        }];
        setChatHistory(newHistory);
        
        // Fetch new conversational response
        await fetchAIQuestion(newHistory);
    };

    const startFromPrescription = () => {
         setStep('preparation');
         setPrepStep(1);
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
        // ✅ Increase Base Volume (0.1 -> 0.25)
        gainNode.gain.value = soundEnabled ? 0.25 : 0;

        oscL.start(); oscR.start();

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

        // 🎵 Start Ambient Sound Layer (if selected)
        const ambientConfig = AMBIENT_SOUNDS.find(a => a.id === selectedAmbient);
        console.log(`🎵 Ambient Config for '${selectedAmbient}':`, ambientConfig);
        
        if (ambientConfig && ambientConfig.audioUrl) {
            try {
                // ✅ Improved Audio Construction
                const ambientAudio = new Audio();
                ambientAudio.crossOrigin = 'anonymous';
                ambientAudio.src = ambientConfig.audioUrl;
                ambientAudio.loop = true;
                
                // ✅ Ambient Fade-in Logic (0.0 -> 0.5 over 2 seconds)
                ambientAudio.volume = 0; 
                
                // Play with error handling
                const playPromise = ambientAudio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => console.warn('Ambient audio autoplay blocked:', e));
                    
                    // Start fade if playing
                    if (soundEnabled) {
                        let vol = 0;
                        const fadeInInterval = setInterval(() => {
                            vol += 0.05;
                            if (vol >= 0.5) {
                                ambientAudio.volume = 0.5;
                                clearInterval(fadeInInterval);
                            } else {
                                ambientAudio.volume = vol;
                            }
                        }, 200);
                    }
                }
                
                ambientAudioRef.current = ambientAudio;
                console.log(`🎵 Ambient sound started with fade-in: ${ambientConfig.label}`);
            } catch (e) {
                console.warn('Failed to start ambient audio:', e);
            }
        } else if (selectedAmbient !== 'none') {
            console.warn(`⚠️ No audioUrl for ambient '${selectedAmbient}'. Check meditationConstants.js`);
        }

        setTimeLeft(mode.time);
        setIsPlaying(true);
        
        // ✨ Opening Message - Phase 4 Pre-intro Logic
        const getPreIntro = () => {
            const goal = prepSelections.goal;
            if (goal === 'relax') return "모든 긴장을 내려놓고, 그저 편안함이 온몸에 스며들게 하세요.";
            if (goal === 'clear') return "떠오르는 생각들을 흘려보내며, 마음의 호숫가를 고요히 만듭니다.";
            if (goal === 'sense') return "지금 이 순간, 당신의 몸이 전하는 가장 미세한 감각에 귀를 기울여보세요.";
            if (goal === 'stay') return "아무것도 할 필요 없습니다. 그저 지금 이 순간에 온전히 머물러보세요.";
            return "숨을 깊게 들이마시고 내쉬며, 당신만의 평온한 시간을 시작합니다.";
        };
        
        const introMessage = getPreIntro();
        setAiMessage(introMessage);
        
        // TTC Voice for Pre-intro if enabled
        if (ttcEnabled && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(introMessage);
            utterance.lang = 'ko-KR';
            utterance.rate = 0.85;
            utterance.volume = 0.4;
            window.speechSynthesis.speak(utterance);
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

    const completeSession = () => {
        stopSession();
        setStep('diagnosis');
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // ==========================================
    // 🎨 RENDER (Refining V3 Overlay Rendering)
    // ==========================================

    // 1. Diagnosis Step (Conversational AI - Dark Mode)
    if (step === 'diagnosis') {
        return (
            <div style={{
                position: 'fixed', inset: 0, background: '#121212', zIndex: 9999, // 🌑 Dark Mode
                display: 'flex', flexDirection: 'column'
            }}>
                {/* 1. Header (Translucent Dark) */}
                <div style={{
                    padding: '10px 15px', paddingTop: 'max(10px, env(safe-area-inset-top))',
                    display: 'flex', alignItems: 'center', background: 'rgba(20, 20, 20, 0.95)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
                    zIndex: 10
                }}>
                    <button onClick={() => { stopAllAudioRef.current?.(); if(onClose) onClose(); else navigate(-1); }} style={{ padding: '8px', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <ArrowLeft size={22} color="white" />
                    </button>
                    <div style={{ marginLeft: '10px', display: 'flex', flexDirection: 'column' }}>
                         <span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>복순 (마음 챙김이)</span>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <SpeakerHigh size={12} color={ttcEnabled ? "#4caf50" : "#666"} weight="fill" />
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                                {isAILoading ? '생각하는 중...' : '음성 대화 중'}
                            </span>
                         </div>
                    </div>
                </div>

                {/* 2. Chat Area (Scrollable) */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '20px 15px',
                    paddingBottom: '20px', // ✅ Use Flex instead of fixed padding
                    display: 'flex', flexDirection: 'column', gap: '20px'
                }}>
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
                                display: 'flex',
                                justifyContent: isMe ? 'flex-end' : 'flex-start',
                                alignItems: 'flex-start',
                                gap: '8px'
                            }}>
                                {/* Avatar (AI) */}
                                {!isMe && (
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        background: 'var(--primary-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0,
                                        fontSize: '1.2rem'
                                    }}>
                                         🧘‍♀️
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '6px' }}>
                                    
                                     <div style={{
                                         background: isMe ? 'linear-gradient(135deg, #d4af37, #f1c40f)' : 'rgba(255,255,255,0.08)',
                                         color: isMe ? '#000' : '#fff',
                                         padding: '12px 16px',
                                         borderRadius: isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                                         maxWidth: '75vw', fontSize: '0.95rem', lineHeight: '1.6',
                                         boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                                         wordBreak: 'keep-all',
                                         border: isMe ? 'none' : '1px solid rgba(255,255,255,0.1)'
                                     }}>
                                         {msg.content}
                                     </div>
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
                                     background: 'rgba(255,255,255,0.08)', color: 'white',
                                     padding: '14px 18px',
                                     borderRadius: '4px 18px 18px 18px',
                                     maxWidth: '75vw', fontSize: '1.0rem', lineHeight: '1.6',
                                     boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                     border: '1px solid rgba(255,255,255,0.15)',
                                     backdropFilter: 'blur(10px)'
                                 }}>
                                     {currentAIChat.message || currentAIChat.question || "오늘 하루는 어떠셨나요?"}
                                 </div>
                                 <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>
                                     {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                             </div>
                         </div>
                    )}

                    {isAILoading && (
                         <div style={{ alignSelf: 'center', padding: '6px 12px', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--primary-gold)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <div className="typing-indicator"><span></span><span></span><span></span></div>
                             {chatHistory.length === 0 ? "AI 복순이가 준비하고 있어요..." : "답변을 생각하는 중..."}
                         </div>
                    )}
                    <div ref={chatEndRef} style={{ height: '2px', width: '100%' }} />
                </div>

                {/* 3. Fixed Bottom Options */}
                {/* 3. Fixed Bottom Options & Input */}
                <div style={{
                    background: '#1a1a1d', borderTop: '1px solid rgba(255,255,255,0.1)',
                    padding: '15px', paddingBottom: 'calc(15px + env(safe-area-inset-bottom))',
                    display: 'flex', flexDirection: 'column', gap: '12px',
                    animation: 'slideUp 0.3s ease-out',
                    zIndex: 20
                }}>
                    {/* A. Quick Options */}
                    {!isAILoading && currentAIChat?.options && (
                        <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', paddingRight: '20px', scrollbarWidth: 'none', justifyContent: 'flex-start' }}>
                            {currentAIChat.options.map((opt, i) => (
                                <button
                                    key={i}
                                    onClick={() => { 
                                        stopAllAudioRef.current?.(); 
                                        handleChatResponse(opt); 
                                    }}
                                    style={{
                                        flex: '0 0 auto',
                                        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                                        padding: '10px 18px', borderRadius: '18px',
                                        color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.2s',
                                        backdropFilter: 'blur(5px)'
                                    }}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* B. Manual Input */}
                    <form 
                        onSubmit={(e) => {
                            try {
                                handleManualSubmit(e);
                            } catch (err) {
                                console.error("Submit Error:", err);
                                setIsAILoading(false);
                            }
                        }} 
                        style={{ 
                            display: 'flex', gap: '10px', alignItems: 'center',
                            background: 'rgba(255,255,255,0.05)', borderRadius: '28px',
                            padding: '6px 6px 6px 20px', border: '1px solid rgba(255,255,255,0.1)',
                            transition: 'all 0.3s'
                        }}
                    >
                        <input 
                            type="text" 
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            disabled={isAILoading}
                            autoFocus
                            placeholder={isAILoading ? "답변을 기다리는 중..." : "직접 입력하기..."}
                            style={{
                                flex: 1, background: 'transparent', border: 'none',
                                color: 'white', fontSize: '1rem', outline: 'none'
                            }}
                        />
                        <button 
                            type="submit" 
                            disabled={!manualInput.trim() || isAILoading} 
                            style={{
                                background: manualInput.trim() ? 'var(--primary-gold)' : 'rgba(255,255,255,0.1)',
                                color: manualInput.trim() ? 'black' : 'rgba(255,255,255,0.2)',
                                border: 'none', borderRadius: '50%', width: '40px', height: '40px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                cursor: manualInput.trim() ? 'pointer' : 'default',
                                transition: 'all 0.2s', flexShrink: 0
                            }}
                        >
                            <ArrowUp size={24} weight="bold" />
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // 1-b. Manual Diagnosis Step (Fallback)
    if (step === 'diagnosis_manual') {
        return (
            <div style={{
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 2000,
                display: 'flex', flexDirection: 'column', padding: '20px',
                backgroundImage: 'radial-gradient(circle at 50% 30%, #1a1a2e 0%, #000000 70%)'
            }}>
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
        );
    }

    // 2. Weather Step
    if (step === 'weather') {
        return (
             <div style={{
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 2000,
                display: 'flex', flexDirection: 'column', padding: '20px',
                backgroundImage: 'radial-gradient(circle at 50% 30%, #1a1a2e 0%, #000000 70%)'
            }}>
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
        );
    }

    // 3. Prescription Step
    if (step === 'prescription' && selectedDiagnosis && activeMode) {
        const ModeIcon = ICON_MAP[activeMode.iconName] || ICON_MAP.Wind;
        
        return (
            <div style={{
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 2000,
                display: 'flex', flexDirection: 'column', padding: '20px',
                backgroundImage: 'radial-gradient(circle at 50% 30%, #1a1a2e 0%, #000000 70%)',
                overflowY: 'auto', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))'
            }}>
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
                        {/* 1. AI Analysis Analysis (Prioritized) */}
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
                            <div style={{ color: 'var(--primary-gold)', fontWeight: 700, marginBottom: '8px', fontSize: '0.85rem' }}>📋 AI 복순이의 심리 분석</div>
                            {currentAIChat?.isFinalAnalysis ? (
                                <div>{currentAIChat.analysisSummary || prescriptionReason}</div>
                            ) : (
                                <div>{prescriptionReason}</div>
                            )}
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
                                    {interactionType === 'v1' && '편안한 가이드 명상'}
                                    {interactionType === 'v2' && '호흡 반응형 명상'}
                                    {interactionType === 'v3' && 'AI 자세 코칭'}
                                </div>
                            </div>
                        </div>

                        {/* 3. User Options (Collapsible/Separated) */}
                        <div style={{ marginTop: '10px' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>옵션 변경하기</span>
                            </div>
                            
                            {/* Time Selection */}
                            <div style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
                                {MEDITATION_MODES.map(m => (
                                    <button 
                                        key={m.id}
                                        onClick={() => { setActiveMode(m); setTimeLeft(m.time); }}
                                        style={{
                                            flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.75rem',
                                            background: activeMode.id === m.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                                            color: activeMode.id === m.id ? 'white' : 'rgba(255,255,255,0.6)',
                                            border: activeMode.id === m.id ? '1px solid rgba(255,255,255,0.3)' : 'none', 
                                            transition: 'all 0.2s', fontWeight: 600
                                        }}
                                    >
                                        {m.label.split(' ')[0]}
                                    </button>
                                ))}
                            </div>

                            {/* Type Selection */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {Object.values(INTERACTION_TYPES).map(t => (
                                    <button 
                                        key={t.id}
                                        onClick={() => setInteractionType(t.id)}
                                        style={{
                                            flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.75rem',
                                            background: interactionType === t.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                                            color: interactionType === t.id ? 'white' : 'rgba(255,255,255,0.6)',
                                            border: interactionType === t.id ? '1px solid rgba(255,255,255,0.3)' : 'none',
                                            transition: 'all 0.2s', fontWeight: 600
                                        }}
                                    >
                                        {t.id === 'v1' ? '안내' : t.id === 'v2' ? '숨소리' : '자세'}
                                    </button>
                                ))}
                            </div>

                            {/* 🎵 Ambient Sound Selection */}
                            <div style={{ marginTop: '10px' }}>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '8px' }}>🎵 배경음</div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {AMBIENT_SOUNDS.map(a => (
                                        <button 
                                            key={a.id}
                                            onClick={() => setSelectedAmbient(a.id)}
                                            style={{
                                                padding: '6px 12px', borderRadius: '12px', fontSize: '0.7rem',
                                                background: selectedAmbient === a.id ? `${a.color}30` : 'rgba(255,255,255,0.05)',
                                                color: selectedAmbient === a.id ? a.color : 'rgba(255,255,255,0.5)',
                                                border: selectedAmbient === a.id ? `1px solid ${a.color}50` : '1px solid transparent',
                                                transition: 'all 0.2s', fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            {a.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {isAILoading && (
                            <div style={{ textAlign: 'center', color: 'var(--primary-gold)', marginTop: '5px', fontSize: '0.75rem' }}>
                                ✨ 최적의 코스를 로딩 중...
                            </div>
                        )}
                    </div>

                    <div style={{ width: '100%', maxWidth: '350px', paddingBottom: '10px' }}>
                        <button onClick={startFromPrescription} style={{
                            width: '100%',
                            background: 'var(--primary-gold)', color: 'black',
                            padding: '16px', borderRadius: '18px', fontSize: '1.1rem', fontWeight: 800, border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
                            cursor: 'pointer', boxShadow: '0 10px 20px rgba(212,175,55,0.3)'
                        }}>
                            <Play size={24} weight="fill" /> 시작하기
                        </button>
                        
                        <button onClick={handleReturnToChat} style={{ 
                            marginTop: '15px', width: '100%', background: 'transparent', 
                            border: 'none', color: 'rgba(255,255,255,0.4)', 
                            textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem'
                        }}>
                            다시 선택 (대화로 돌아가기)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 🧘 Phase 4: Preparation Flow Step
    if (step === 'preparation') {
        const PREPARATION_GUIDES = {
            chair: {
                title: "의자 명상",
                desc: "회사나 집에서 간편하게",
                steps: [
                    "의자 앞쪽에 걸터앉아 허리를 세웁니다.",
                    "양발은 어깨너비로 벌려 지면에 닿게 합니다.",
                    "손은 편안하게 무릎 위에 올립니다."
                ]
            },
            floor: {
                title: "바닥 명상",
                desc: "조용하고 안정적인 공간에서",
                steps: [
                    "가부좌 또는 편한 책상다리를 합니다.",
                    "쿠션을 활용해 무릎이 엉덩이보다 낮게 합니다.",
                    "척추를 곧게 펴고 정수리를 하늘로 당깁니다."
                ]
            },
            lying: {
                title: "누운 명상",
                desc: "깊은 이완과 수면을 위해",
                steps: [
                    "등을 대고 편안하게 눕습니다.",
                    "다리는 어깨너비로 벌리고 발끝을 툭 떨어뜨립니다.",
                    "팔은 몸 옆에 두고 손바닥이 하늘을 향하게 합니다."
                ]
            }
        };

        const PREPARATION_GOALS = [
            { id: 'relax', label: '온몸의 긴장을 풀고 싶어요' },
            { id: 'clear', label: '복잡한 생각을 비우고 싶어요' },
            { id: 'sense', label: '내 몸의 감각에만 집중해볼게요' },
            { id: 'stay', label: '그저 지금 이대로 머무를래요' }
        ];

        return (
            <div style={{
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 2000,
                display: 'flex', flexDirection: 'column', padding: '20px',
                backgroundImage: 'radial-gradient(circle at 50% 10%, #1a1a2e 0%, #000000 80%)'
            }}>
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
                                <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>방해받지 않도록 <br/>기기를 &apos;무음&apos; 또는 &apos;방해금지&apos; 모드로 <br/>설정해주셨나요?</p>
                            </div>
                            <button 
                                onClick={() => { setPrepSelections({...prepSelections, notified: true}); setPrepStep(2); }}
                                style={{
                                    width: '100%', background: 'var(--primary-gold)', color: 'black',
                                    padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, border: 'none',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                }}
                            >
                                확인했습니다
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Posture Guide */}
                    {prepStep === 2 && (
                        <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeIn 0.5s ease' }}>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'white', marginBottom: '25px', textAlign: 'center' }}>가장 편한 자세를 찾아보세요</h3>
                            
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                {Object.entries(PREPARATION_GUIDES).map(([key, info]) => (
                                    <button 
                                        key={key}
                                        onClick={() => setPrepSelections({...prepSelections, posture: key})}
                                        style={{
                                            flex: 1, padding: '12px 5px', borderRadius: '15px', fontSize: '0.85rem',
                                            background: prepSelections.posture === key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)',
                                            color: prepSelections.posture === key ? 'white' : 'rgba(255,255,255,0.4)',
                                            border: prepSelections.posture === key ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                                            transition: 'all 0.2s', fontWeight: 600
                                        }}
                                    >
                                        {info.title}
                                    </button>
                                ))}
                            </div>

                            <div style={{ 
                                background: 'rgba(255,255,255,0.05)', borderRadius: '25px', padding: '25px',
                                border: '1px solid rgba(255,255,255,0.1)', marginBottom: '30px',
                                minHeight: '220px'
                            }}>
                                <div style={{ color: 'var(--primary-gold)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px' }}>{PREPARATION_GUIDES[prepSelections.posture].desc}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', marginBottom: '15px' }}>{PREPARATION_GUIDES[prepSelections.posture].title} 자세</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {PREPARATION_GUIDES[prepSelections.posture].steps.map((s, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '10px', color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                            <span style={{ color: 'var(--primary-gold)', fontWeight: 800 }}>{i+1}</span>
                                            <span>{s}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={() => setPrepStep(3)}
                                style={{
                                    width: '100%', background: 'var(--primary-gold)', color: 'black',
                                    padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                자세를 잡았습니다
                            </button>
                        </div>
                    )}

                    {/* STEP 3: Goal Selection */}
                    {prepStep === 3 && (
                        <div style={{ width: '100%', maxWidth: '380px', animation: 'fadeIn 0.5s ease' }}>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'white', marginBottom: '10px', textAlign: 'center' }}>오늘의 명상 의도 세우기</h3>
                            <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: '0.9rem', marginBottom: '30px' }}>무엇에 집중하고 싶으신가요?</p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
                                {PREPARATION_GOALS.map((g) => (
                                    <button 
                                        key={g.id}
                                        onClick={() => setPrepSelections({...prepSelections, goal: g.id})}
                                        style={{
                                            padding: '20px', borderRadius: '20px', fontSize: '1rem',
                                            background: prepSelections.goal === g.id ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)',
                                            color: prepSelections.goal === g.id ? 'var(--primary-gold)' : 'rgba(255,255,255,0.7)',
                                            border: prepSelections.goal === g.id ? '1px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.1)',
                                            transition: 'all 0.2s', fontWeight: 600, textAlign: 'left',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}
                                    >
                                        {g.label}
                                        {prepSelections.goal === g.id && <Sparkle size={20} weight="fill" />}
                                    </button>
                                ))}
                            </div>

                            <button 
                                disabled={!prepSelections.goal}
                                onClick={() => startSession(activeMode)}
                                style={{
                                    width: '100%', background: prepSelections.goal ? 'var(--primary-gold)' : 'rgba(255,255,255,0.1)', 
                                    color: prepSelections.goal ? 'black' : 'rgba(255,255,255,0.2)',
                                    padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, border: 'none',
                                    cursor: prepSelections.goal ? 'pointer' : 'default',
                                    boxShadow: prepSelections.goal ? '0 10px 20px rgba(212,175,55,0.3)' : 'none'
                                }}
                            >
                                명상 시작하기
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 4. Active Session Step
    const breathingScale = interactionType === 'v2' ? 1 + micVolume : 1;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: '#000', zIndex: 3000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden'
        }}>
            {/* V3 Camera Layer */}
            {interactionType === 'v3' && (
                <div style={{ position: 'absolute', inset: 0, zIndex: -1, opacity: 0.4 }}>
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
                    />
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        width: '280px', height: '350px',
                        border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '120px',
                        boxShadow: '0 0 80px rgba(255, 215, 0, 0.05) inset'
                    }} />
                </div>
            )}

            {/* Background Animation (V1/V2) - ENHANCED for More Movement */}
            {interactionType !== 'v3' && (
                <>
                    {/* Layer 1: Deep Pulse (Base) */}
                    <div className={`breathing-circle ${isPlaying ? 'animate' : 'paused'}`} style={{
                        position: 'absolute',
                        width: '350px', height: '350px',
                        borderRadius: '50%',
                        backgroundImage: `radial-gradient(circle, ${activeMode?.color}30 0%, transparent 70%)`,
                        filter: 'blur(50px)',
                        zIndex: 0,
                        transform: interactionType === 'v2' ? `scale(${breathingScale})` : undefined,
                        boxShadow: interactionType === 'v2' ? `0 0 ${micVolume * 60}px ${activeMode?.color}40` : 'none',
                        transition: 'all 0.5s ease-out'
                    }} />
                    
                    {/* Layer 2: Core Focus (Sharper) */}
                    <div className={`breathing-circle-inner ${isPlaying ? 'animate-inner' : 'paused'}`} style={{
                        position: 'absolute',
                        width: '220px', height: '220px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${activeMode?.color}50 0%, transparent 70%)`,
                        filter: 'blur(25px)',
                        zIndex: 1,
                        transform: interactionType === 'v2' ? `scale(${breathingScale * 0.85})` : undefined,
                        border: interactionType === 'v2' ? `${Math.min(micVolume * 4, 10)}px solid ${activeMode?.color}50` : 'none',
                        transition: 'all 0.3s ease-out'
                    }} />

                    {/* Layer 3: Floating Drift (New Movement) */}
                    <div className={`floating-circle ${isPlaying ? 'animate-float' : 'paused'}`} style={{
                        position: 'absolute',
                        width: '500px', height: '500px',
                        borderRadius: '45%', // Slightly imperfect circle
                        border: `1px solid ${activeMode?.color}20`,
                        background: 'transparent',
                        zIndex: -1,
                        opacity: 0.6
                    }} />
                    
                    {/* Layer 4: Second Float (Opposite direction) */}
                    <div className={`floating-circle-rev ${isPlaying ? 'animate-float-rev' : 'paused'}`} style={{
                        position: 'absolute',
                        width: '400px', height: '400px',
                        borderRadius: '40%',
                        border: `1px dashed ${activeMode?.color}15`,
                        background: 'transparent',
                        zIndex: -1, 
                        opacity: 0.4
                    }} />
                </>
            )}

            {/* Content Overlay */}
            <div style={{ zIndex: 10, textAlign: 'center', width: '100%', padding: '40px', maxWidth: '600px' }}>
                <div style={{ marginBottom: '50px', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                <button onClick={stopSession} style={{
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
