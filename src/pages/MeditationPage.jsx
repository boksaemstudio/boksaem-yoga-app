import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
const functions = getFunctions(undefined, 'asia-northeast3');
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

    // Stop Session (useCallback for stability - removed stream dependency to fix V3 crash)
    const stopSession = useCallback(() => {
        // 🛑 STOP AI AUDIO (Fixed Bug)
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
            currentAudioRef.current = null; 
        }

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
        setActiveMode(null);
        setSelectedDiagnosis(null);
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
        if (step === 'diagnosis' && chatHistory.length === 0) {
             fetchAIQuestion(); 
        }
    }, [step]);

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
        if (gainNodeRef.current && audioContextRef.current) {
            const currentTime = audioContextRef.current.currentTime;
            gainNodeRef.current.gain.setTargetAtTime(soundEnabled ? 0.1 : 0, currentTime, 0.5);
        }
    }, [soundEnabled]);

    // ==========================================
    // 🤖 REAL-TIME AI API CALLS
    // ==========================================
    
    // 🗣️ Fallback Local TTS (Defined FIRST to avoid ReferenceError in playAudio dependencies)
    const speakFallback = useCallback((text) => {
        if (!text || typeof window === 'undefined' || !ttcEnabled) return;
        window.speechSynthesis.cancel();
        
        // Ensure cloud audio is ALSO stopped
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.9; 
        utterance.pitch = 1.0; 
        utterance.volume = 0.6; 
        window.speechSynthesis.speak(utterance);
    }, [ttcEnabled]);

    // 🔊 Cloud TTS Audio Player (Strict High Quality Only)
    const playAudio = useCallback((base64String) => {
        if (!ttcEnabled) return;
        
        if (!base64String) {
            console.warn("🔊 Cloud Audio Missing - Waiting (User Preference: No Low Quality Fallback)");
            return;
        }
        
        try {
            // STOP previous audio first
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
            
            const audio = new Audio(`data:audio/mp3;base64,${base64String}`);
            audio.volume = 0.9; 
            currentAudioRef.current = audio; // ✅ Track it

            audio.onended = () => {
                currentAudioRef.current = null;
            };
            
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.error("🔊 Audio Playback Failed:", e);
                });
            }
        } catch (e) {
            console.error("🔊 Audio Error:", e);
        }
    }, [ttcEnabled]);



    // Fetch AI-generated question (Enhanced for multi-turn chat)
    const fetchAIQuestion = async (history = []) => {
        setIsAILoading(true);
        try {
            // 🕒 Calculate Time Context Dynamically (Fixes "Morning at Night" bug)
            const hour = new Date().getHours();
            let currentContext = 'night';
            if (hour >= 5 && hour < 12) currentContext = 'morning';
            else if (hour >= 12 && hour < 18) currentContext = 'afternoon';
            
            const genGuidance = httpsCallable(functions, 'generateMeditationGuidance');
            const result = await genGuidance({ 
                type: 'question', 
                timeContext: currentContext, // Use dynamic time
                chatHistory: history 
            });
            
            if (result.data) {
                setCurrentAIChat(result.data);
                
                // Play Cloud Audio ONLY
                if (result.data.audioContent) {
                    playAudio(result.data.audioContent);
                }

                // 심리 분석이 완료된 경우 -> 처방 화면으로 전환
                if (result.data.isFinalAnalysis) {
                    const diag = DIAGNOSIS_OPTIONS.find(o => o.id === result.data.mappedDiagnosis) || DIAGNOSIS_OPTIONS[0];
                    setSelectedDiagnosis(diag);

                    // Set Defaults for Session if not set
                    const defaultMode = MEDITATION_MODES[0]; 
                    if (!activeMode) {
                        setActiveMode(defaultMode);
                        setTimeLeft(defaultMode.time);
                    }

                    // 🚀 FORCE STEP TRANSITION
                    setStep('prescription');

                    // Fetch Prescription Data with CORRECT arguments
                    // (diagnosisId, weatherId, modeId, intType)
                    const wId = weatherContext?.id || 'sun';
                    const mId = activeMode?.id || defaultMode.id;
                    const iType = interactionType || 'v1';

                    fetchAIPrescription(diag.id, wId, mId, iType);
                }
            } else {
                throw new Error("No data from AI");
            }
        } catch (error) {
            console.error('AI Question failed:', error);
            // Fallback to local chat instead of manual mode for seamless experience
            setCurrentAIChat({
                question: "안녕하세요? 오늘 하루는 어떠셨나요? (AI 연결 지연으로 기본 모드)",
                options: ["조금 지쳤어요", "편안해요", "머리가 복잡해요"]
            });
        } finally {
            setIsAILoading(false);
        }
    };

    // --- Chat Handlers ---
    const handleChatResponse = async (answer) => {
        if (!answer) return;

        // 1. Capture Context (Current Question + User Answer)
        // Ensure we save the AI's question to history so the flow makes sense
        const previousAIQuestion = currentAIChat?.question;
        
        let newHistory = [...chatHistory];
        if (previousAIQuestion) {
            newHistory.push({ role: 'model', content: previousAIQuestion });
        }
        newHistory.push({ role: 'user', content: answer });

        setChatHistory(newHistory);
        
        // 2. Clear current & Loading
        setCurrentAIChat(null); 
        setIsAILoading(true);

        // 3. Scroll to bottom
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        // 4. Fetch Next Question
        await fetchAIQuestion(newHistory);
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (!manualInput.trim()) return;
        handleChatResponse(manualInput);
        setManualInput("");
    };

    // ... (fetchAIPrescription)
    const fetchAIPrescription = async (diagnosisId, weatherId, modeId, intType) => {
        setIsAILoading(true);
        try {
            const result = await generateMeditationGuidance({
                type: 'prescription',
                timeContext: timeContext,
                weather: weatherId,
                diagnosis: diagnosisId,
                mode: modeId === 'breath' ? '3min' : (modeId === 'calm' ? '7min' : '15min'),
                interactionType: intType
            });
            if (result.data) {
                setAiPrescription(result.data);
                setPrescriptionReason(result.data.reason || '');
                
                // Play Cloud Audio ONLY
                if (result.data.audioContent) {
                    playAudio(result.data.audioContent);
                }
            }
        } catch (error) {
            console.error('AI Prescription fetch failed:', error);
        } finally {
            setIsAILoading(false);
        }
    };

    // Fetch AI session message (during meditation)
    const fetchAISessionMessage = async () => {
        try {
            const result = await generateMeditationGuidance({
                type: 'session_message',
                timeContext: timeContext,
                diagnosis: selectedDiagnosis?.id,
                mode: activeMode?.id === 'breath' ? '3min' : (activeMode?.id === 'calm' ? '7min' : '15min'),
                interactionType: interactionType,
                messageIndex: aiSessionMessageIndex
            });
            if (result.data && result.data.message) {
                setAiMessage(result.data.message);
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
    const speak = useCallback((text) => {
        // Kept for compatibility with other parts if they call 'speak' directly
        speakFallback(text);
    }, [speakFallback]);

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
        fetchAIPrescription(option.id, weather.id, mode.id, intType);
        
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
        fetchAIPrescription(selectedDiagnosis.id, weatherOption.id, mode.id, intType);
        
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
         startSession(activeMode);
    };

    // --- Session Logic ---
    const startSession = async (mode) => {
        setStep('session');
        setPermissionError(null);
        const audioCtx = getAudioContext();

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
        gainNode.gain.value = soundEnabled ? 0.1 : 0;

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
                // Ensure audio context is ready even for V3 (for TTC / sound)
                if (audioCtx.state === 'suspended') await audioCtx.resume();
                
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
        if (ambientConfig && ambientConfig.audioUrl) {
            try {
                const ambientAudio = new Audio(ambientConfig.audioUrl);
                ambientAudio.loop = true;
                ambientAudio.volume = soundEnabled ? 0.3 : 0; // Lower than binaural
                ambientAudio.crossOrigin = 'anonymous';
                
                // Play with error handling
                const playPromise = ambientAudio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => console.warn('Ambient audio autoplay blocked:', e));
                }
                
                ambientAudioRef.current = ambientAudio;
                console.log(`🎵 Ambient sound started: ${ambientConfig.label}`);
            } catch (e) {
                console.warn('Failed to start ambient audio:', e);
            }
        }

        setTimeLeft(mode.time);
        setIsPlaying(true);
        
        // Opening Message
        const messages = AI_SESSION_MESSAGES[interactionType] || AI_SESSION_MESSAGES['v1'];
        setAiMessage(messages[0]);
        
        startTimer();
        startMessageLoop();
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
                    <button onClick={() => { window.speechSynthesis.cancel(); if(onClose) onClose(); else navigate(-1); }} style={{ padding: '8px', border: 'none', background: 'none', cursor: 'pointer' }}>
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
                    paddingBottom: '160px', // Space for bottom input
                    display: 'flex', flexDirection: 'column', gap: '20px'
                }}>
                    {/* Date Divider */}
                    <div style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>
                        {new Date().toLocaleDateString()}
                    </div>

                    {/* Chat Bubbles */}
                    {chatHistory.map((msg, idx) => {
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
                                     {currentAIChat.question || "오늘 하루는 어떠셨나요?"}
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
                             {chatHistory.length === 0 ? "복순이가 준비하고 있어요..." : "답변을 생각하는 중..."}
                         </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* 3. Fixed Bottom Options */}
                {/* 3. Fixed Bottom Options & Input */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: '#1a1a1d', borderTop: '1px solid rgba(255,255,255,0.1)',
                    padding: '15px', paddingBottom: 'calc(15px + env(safe-area-inset-bottom))',
                    display: 'flex', flexDirection: 'column', gap: '12px',
                    animation: 'slideUp 0.3s ease-out',
                    zIndex: 20
                }}>
                    {/* A. Quick Options */}
                    {!isAILoading && currentAIChat?.options && (
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px', scrollbarWidth: 'none', justifyContent: 'flex-start' }}>
                            {currentAIChat.options.map((opt, i) => (
                                <button
                                    key={i}
                                    onClick={() => { 
                                        if (window.speechSynthesis) window.speechSynthesis.cancel(); 
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
                    <form onSubmit={handleManualSubmit} style={{ 
                        display: 'flex', gap: '10px', alignItems: 'center' 
                    }}>
                        <input 
                            type="text" 
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            disabled={isAILoading}
                            placeholder={isAILoading ? "답변을 기다리는 중..." : "직접 입력하기..."}
                            style={{
                                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '24px', padding: '14px 20px', color: 'white', fontSize: '1rem',
                                outline: 'none', transition: 'all 0.2s'
                            }}
                        />
                        <button type="submit" disabled={!manualInput.trim() || isAILoading} style={{
                            background: manualInput.trim() ? 'var(--primary-gold)' : 'rgba(255,255,255,0.1)',
                            color: manualInput.trim() ? 'black' : 'rgba(255,255,255,0.3)',
                            border: 'none', borderRadius: '50%', width: '48px', height: '48px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            transition: 'all 0.2s', flexShrink: 0
                        }}>
                            <ArrowUp size={22} weight="bold" />
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
                        borderRadius: '24px', padding: '25px', border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', flexDirection: 'column', gap: '18px'
                    }}>
                        {/* 1. AI Analysis Analysis (Prioritized) */}
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
                            <div style={{ color: 'var(--primary-gold)', fontWeight: 700, marginBottom: '8px', fontSize: '0.85rem' }}>📋 복순이의 심리 분석</div>
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

                    <button onClick={startFromPrescription} style={{
                        marginTop: '35px', width: '100%', maxWidth: '350px',
                        background: 'var(--primary-gold)', color: 'black',
                        padding: '16px', borderRadius: '16px', fontSize: '1.05rem', fontWeight: 700, border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer'
                    }}>
                        <Play size={22} weight="fill" /> 시작하기
                    </button>
                    
                    <button onClick={handleReturnToChat} style={{ marginTop: '12px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', cursor: 'pointer' }}>
                        다시 선택 (대화로 돌아가기)
                    </button>
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
            `}</style>
        </div>
    );
};

export default MeditationPage;
