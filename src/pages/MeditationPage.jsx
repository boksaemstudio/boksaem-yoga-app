import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ArrowLeft, Play, Pause, X, Wind, SpeakerHigh, SpeakerSlash, Brain, Microphone, VideoCamera, LockKey, Heartbeat, SmileySad, Lightning, Barbell, Sparkle, Sun, CloudRain, CloudSnow, Cloud } from '@phosphor-icons/react';

// Initialize Firebase Functions
const functions = getFunctions(undefined, 'asia-northeast3');
const generateMeditationGuidance = httpsCallable(functions, 'generateMeditationGuidance');

// ==========================================
// 🧘 MEDITATION SPECIALIST AI - CONFIG
// ==========================================

const MEDITATION_MODES = [
    { id: 'breath', label: '3분 숨 고르기', time: 3 * 60, icon: Wind, color: '#48dbfb', desc: '잠깐의 호흡으로 균형 찾기', freq: 10 },
    { id: 'calm', label: '7분 마음 정돈', time: 7 * 60, icon: Brain, color: '#FFD700', desc: '흐트러진 마음 돌보기', freq: 8 },
    { id: 'deep', label: '15분 깊은 이완', time: 15 * 60, icon: Sparkle, color: '#a29bfe', desc: '깊은 명상의 세계로', freq: 6 },
];

// Interaction Types with Emotional Names
const INTERACTION_TYPES = {
    v1: { id: 'v1', label: '고요한 안내', desc: 'AI의 목소리가 당신을 이끕니다', icon: Wind },
    v2: { id: 'v2', label: '호흡의 파도', desc: '당신의 숨소리에 반응합니다', icon: Microphone },
    v3: { id: 'v3', label: '거울 명상', desc: 'AI가 자세를 부드럽게 교정합니다', icon: VideoCamera }
};

const DIAGNOSIS_OPTIONS = [
    { id: 'stress', label: '머리가 복잡해요', icon: Lightning, color: '#FF6B6B', prescription: { modeId: 'calm', type: 'v2' } },
    { id: 'stiff', label: '몸이 찌뿌둥해요', icon: Barbell, color: '#4ECDC4', prescription: { modeId: 'breath', type: 'v3' } },
    { id: 'anxious', label: '마음이 불안해요', icon: Heartbeat, color: '#FFD93D', prescription: { modeId: 'deep', type: 'v2' } },
    { id: 'tired', label: '무기력해요', icon: SmileySad, color: '#A8A4CE', prescription: { modeId: 'calm', type: 'v1' } },
    { id: 'overthink', label: '생각이 꼬리에 꼬리를 물어요', icon: Brain, color: '#a29bfe', prescription: { modeId: 'calm', type: 'v2' } },
    { id: 'frustrated', label: '가슴이 답답해요', icon: Wind, color: '#48dbfb', prescription: { modeId: 'breath', type: 'v2' } },
    { id: 'low_energy', label: '에너지가 바닥났어요', icon: Sparkle, color: '#FFD32A', prescription: { modeId: 'breath', type: 'v1' } },
    { id: 'distracted', label: '집중이 안 돼요', icon: Lightning, color: '#32ff7e', prescription: { modeId: 'calm', type: 'v2' } }
];

const WEATHER_OPTIONS = [
    { id: 'sun', label: '맑음', icon: Sun, color: '#FFD23F' },
    { id: 'cloud', label: '흐림', icon: Cloud, color: '#B0C4DE' },
    { id: 'rain', label: '비', icon: CloudRain, color: '#4895EF' },
    { id: 'snow', label: '눈', icon: CloudSnow, color: '#A8E6CF' },
];

// ==========================================
// 🧠 NATURAL DIAGNOSTIC QUESTIONS (NOT FORMULAIC!)
// Questions that feel like a real person asking, not a form
// ==========================================
const SPECIALIST_QUESTIONS = {
    morning: [
        { 
            q: "아까 알람 소리 들었을 때, 솔직히 어떤 기분이었어요?",
            sub: "첫 반응이 하루를 말해줘요",
            insight: "짜증 → 피로 누적, 불안 → 과제 압박, 무덤덤 → 무기력"
        },
        { 
            q: "지금 이 순간, 가장 하고 싶은 게 뭐예요?",
            sub: "숨겨진 욕구가 현재 상태를 알려줘요",
            insight: "자고 싶다 → 피로, 도망치고 싶다 → 스트레스, 아무것도 → 무기력"
        },
        {
            q: "오늘 누군가를 만나야 한다면, 기대돼요 아니면 피하고 싶어요?",
            sub: "사회적 에너지 상태를 체크해요",
            insight: "피하고 싶다면 혼자만의 명상이 맞아요"
        },
        {
            q: "지금 5초간 가만히 있어보세요... 무슨 생각이 먼저 왔어요?",
            sub: "무의식이 가장 먼저 보내는 신호예요",
            insight: "걱정 → 불안, 할 일 → 스트레스, 아무것도 → 좋은 상태"
        }
    ],
    afternoon: [
        { 
            q: "지금 뭔가에 집중하라고 하면... 솔직히 가능해요?",
            sub: "오후의 정신 상태를 직접 물어봐요",
            insight: "불가능 → 과부하, 억지로 가능 → 스트레스, 가능 → 양호"
        },
        { 
            q: "오늘 아직 웃은 적 있어요?",
            sub: "감정의 온도를 체크해요",
            insight: "기억 안 남 → 무감각, 없음 → 긴장/스트레스"
        },
        {
            q: "지금 가장 신경 쓰이는 게 뭐예요? 한 단어로요.",
            sub: "단어 하나가 마음의 핵심을 보여줘요",
            insight: "그 단어가 오늘의 명상 주제가 될 거예요"
        },
        {
            q: "몸 어디가 가장 불편해요? 손으로 만져보세요.",
            sub: "몸은 거짓말을 안 해요",
            insight: "어깨→책임감, 허리→지지 부족, 목→표현 억압"
        }
    ],
    night: [
        { 
            q: "오늘 하루, 한 문장으로 하면 뭐였어요?",
            sub: "무의식이 하루를 정리하는 방식이에요",
            insight: "부정적 문장 → 정화 필요, 중립 → 마무리 필요"
        },
        { 
            q: "지금 뇌가 '꺼졌으면 좋겠다' 싶어요?",
            sub: "정신적 과부하 정도를 알아봐요",
            insight: "강하게 공감 → 깊은 이완 필요"
        },
        {
            q: "오늘 나한테 '수고했다' 말해줬어요?",
            sub: "자기 위로 능력을 체크해요",
            insight: "아니요 → 자기 연민 명상 추천"
        },
        {
            q: "지금 눈 감으면 바로 잘 수 있을 것 같아요?",
            sub: "수면 준비 상태를 알아봐요",
            insight: "아니요 → 생각 정리 명상 필요"
        }
    ]
};

// V1 Session Guidance Messages (Meditation Specialist Tone)
const AI_SESSION_MESSAGES = {
    v1: [
        "편안한 자세를 찾아보세요. 완벽할 필요 없어요.",
        "코로 천천히 들이마시고... 4초... 참고... 7초... 내쉬고... 8초...",
        "생각이 떠오르면 판단하지 말고 그냥 바라보세요. 구름처럼 지나갈 거예요.",
        "어깨를 귀에서 멀리 떨어뜨려보세요. 아, 그렇죠.",
        "이 순간, 당신은 아무것도 해야 할 필요가 없어요.",
        "호흡이 당신을 데려가는 곳으로 따라가보세요.",
        "지금 이 공간은 안전해요. 모든 것을 내려놓아도 괜찮아요.",
        "매 호흡마다 긴장이 조금씩 녹아내리고 있어요.",
        "잘하고 있어요. 이 순간에 있는 것만으로 충분해요.",
        "마지막으로, 오늘 하루 나에게 '수고했다'고 말해주세요."
    ],
    v2: [
        "당신의 호흡 소리가 들려요. 자연스러운 리듬이네요.",
        "내쉴 때마다 어깨가 조금씩 내려가는 것을 느껴보세요.",
        "호흡이 깊어지고 있어요. 좋은 신호예요.",
        "숨이 들어오고 나가는 그 사이의 고요함을 느껴보세요.",
        "지금 호흡은 파도와 같아요. 밀려오고, 밀려가고.",
        "숨소리 외에 아무것도 신경 쓰지 않아도 돼요."
    ],
    v3: [
        "자세를 확인해볼게요. 척추가 자연스럽게 펴져 있나요?",
        "턱을 살짝 당기고 목 뒤를 늘려보세요.",
        "어깨가 귀 쪽으로 올라갔네요. 투욱 떨어뜨려보세요.",
        "미간에 힘을 빼보세요. 표정이 부드러워졌어요.",
        "손은 편하게 무릎 위에 올려놓으세요.",
        "자세가 안정되니 호흡도 깊어지네요."
    ]
};

const MeditationPage = () => {
    const navigate = useNavigate();
    
    // Flow State
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
    const [ttcEnabled, setTtcEnabled] = useState(false); // TTC (Text To Calm) Voice Guidance
    
    // Audio/Video State
    const [micVolume, setMicVolume] = useState(0);
    const [permissionError, setPermissionError] = useState(null);
    const [cameraStream, setCameraStream] = useState(null);

    // 🤖 REAL-TIME AI States
    const [isAILoading, setIsAILoading] = useState(false);
    const [aiPrescription, setAiPrescription] = useState(null);
    const [aiSessionMessageIndex, setAiSessionMessageIndex] = useState(0);
    const [lastSpokenMessage, setLastSpokenMessage] = useState("");

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

    // Stop Session (useCallback for stability)
    const stopSession = useCallback(() => {
        clearInterval(timerRef.current); 
        clearInterval(messageIntervalRef.current);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (oscLeftRef.current) { try { oscLeftRef.current.stop(); } catch { /* ignore */ } oscLeftRef.current = null; }
        if (oscRightRef.current) { try { oscRightRef.current.stop(); } catch { /* ignore */ } oscRightRef.current = null; }
        if (sourceRef.current) {
            sourceRef.current.disconnect(); 
            if (sourceRef.current.mediaStream) sourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
            sourceRef.current = null;
        }
        if (cameraStream) { cameraStream.getTracks().forEach(track => track.stop()); setCameraStream(null); }
        if (audioContextRef.current) { audioContextRef.current.close().catch(e => console.error(e)); audioContextRef.current = null; }

        setIsPlaying(false);
        setStep('diagnosis');
        setActiveMode(null);
        setSelectedDiagnosis(null);
        setAiMessage("");
        setMicVolume(0);
        setPrescriptionReason('');
        setWeatherContext(null);
    }, [cameraStream]);

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
        setCurrentQuestion(questions[Math.floor(Math.random() * questions.length)]);

        // 🌤️ AUTO WEATHER DETECTION
        detectWeather();

        return () => { stopSession(); };
    }, [stopSession]);

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
    
    // Fetch AI-generated question (Real-time from Gemini)
    const fetchAIQuestion = async () => {
        setIsAILoading(true);
        try {
            const result = await generateMeditationGuidance({
                type: 'question',
                timeContext: timeContext
            });
            if (result.data && result.data.question) {
                setCurrentQuestion({
                    q: result.data.question,
                    sub: result.data.subtext || '',
                    insight: result.data.insight || ''
                });
            }
        } catch (error) {
            console.error('AI Question fetch failed:', error);
            // Fallback to static question
            const questions = SPECIALIST_QUESTIONS[timeContext];
            setCurrentQuestion(questions[Math.floor(Math.random() * questions.length)]);
        } finally {
            setIsAILoading(false);
        }
    };

    // Fetch AI-generated prescription reason
    const fetchAIPrescription = async (diagnosisId, weatherId, modeId, intType) => {
        setIsAILoading(true);
        try {
            const result = await generateMeditationGuidance({
                type: 'prescription',
                timeContext: timeContext,
                weather: weatherId,
                diagnosis: diagnosisId,
                mode: modeId === 'breath' ? '3min' : modeId === 'calm' ? '7min' : '15min',
                interactionType: intType
            });
            if (result.data) {
                setAiPrescription(result.data);
                setPrescriptionReason(result.data.reason || '');
            }
        } catch (error) {
            console.error('AI Prescription fetch failed:', error);
            // Use local fallback
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
                mode: activeMode?.id === 'breath' ? '3min' : activeMode?.id === 'calm' ? '7min' : '15min',
                interactionType: interactionType,
                messageIndex: aiSessionMessageIndex
            });
            if (result.data && result.data.message) {
                setAiMessage(result.data.message);
                setAiSessionMessageIndex(prev => prev + 1);
                
                // TTC Voice Guidance
                if (ttcEnabled && window.speechSynthesis) {
                    const utterance = new SpeechSynthesisUtterance(result.data.message);
                    utterance.lang = 'ko-KR';
                    utterance.rate = 0.8; // Calmer, slower voice
                    window.speechSynthesis.speak(utterance);
                }
            }
        } catch (error) {
            console.error('AI Session message failed:', error);
            // Fallback to static messages
            const messages = AI_SESSION_MESSAGES[interactionType];
            const msg = messages[aiSessionMessageIndex % messages.length];
            setAiMessage(msg);
            setAiSessionMessageIndex(prev => prev + 1);

            if (ttcEnabled && window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance(msg);
                utterance.lang = 'ko-KR';
                utterance.rate = 0.8;
                window.speechSynthesis.speak(utterance);
            }
        }
    };

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
                setCameraStream(stream);
            } catch (err) {
                console.error("Camera Error:", err);
                setPermissionError("카메라 권한이 필요합니다. 설정에서 카메라 접근을 허용해주세요.");
                // Give user a moment to see the error before stopping
                setTimeout(() => stopSession(), 3000);
                return;
            }
        }

        setTimeLeft(mode.time);
        setIsPlaying(true);
        
        // Opening Message
        const messages = AI_SESSION_MESSAGES[interactionType];
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
        for (let i = 0; i < 10; i++) { sum += dataArrayRef.current[i]; }
        const average = sum / 10;
        // Increased sensitivity for breathing
        setMicVolume(Math.min((average * 4) / 100, 2.0));
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
    // 🎨 RENDER
    // ==========================================

    // 1. Diagnosis Step (Specialist Question)
    if (step === 'diagnosis') {
        return (
            <div style={{
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 2000,
                display: 'flex', flexDirection: 'column', padding: '20px',
                backgroundImage: 'radial-gradient(circle at 50% 30%, #1a1a2e 0%, #000000 70%)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                    <button onClick={() => navigate(-1)} style={{ padding: '10px', color: 'white', background: 'none', border: 'none' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 style={{ flex: 1, textAlign: 'center', fontSize: '1.1rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginRight: '44px' }}>
                        명상 전문 AI
                    </h1>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '30px' }}>
                    {currentQuestion && (
                        <div style={{ textAlign: 'center', marginBottom: '40px', maxWidth: '340px' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '15px', lineHeight: 1.5 }}>
                                {currentQuestion.q}
                            </h2>
                            <p style={{ color: 'var(--primary-gold)', fontSize: '0.9rem', marginBottom: '10px', fontStyle: 'italic' }}>
                                {currentQuestion.sub}
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                                💡 {currentQuestion.insight}
                            </p>
                        </div>
                    )}

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
        return (
             <div style={{
                position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 2000,
                display: 'flex', flexDirection: 'column', padding: '20px',
                backgroundImage: 'radial-gradient(circle at 50% 30%, #1a1a2e 0%, #000000 70%)'
            }}>
                <div style={{ marginTop: '40px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '60px' }}>
                    <div style={{ marginBottom: '20px', color: 'var(--primary-gold)' }}><Sparkle size={48} weight="fill" /></div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', marginBottom: '30px', textAlign: 'center' }}>
                        명상 전문 AI 처방
                    </h2>

                    <div style={{ 
                        width: '100%', maxWidth: '350px', background: 'rgba(255,255,255,0.08)', 
                        borderRadius: '24px', padding: '25px', border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', flexDirection: 'column', gap: '18px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: `${activeMode.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: activeMode.color }}>
                                <activeMode.icon size={28} weight="duotone" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>처방 코스</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white' }}>{activeMode.label}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                             <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: '#ffffff20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                {interactionType === 'v1' && <Wind size={24} />}
                                {interactionType === 'v2' && <Microphone size={24} />}
                                {interactionType === 'v3' && <VideoCamera size={24} />}
                            </div>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>인터랙션</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white' }}>
                                    {interactionType === 'v1' && '가이드 명상'}
                                    {interactionType === 'v2' && '숨소리 반응형'}
                                    {interactionType === 'v3' && 'AI 자세 코칭'}
                                </div>
                            </div>
                        </div>

                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '5px 0' }} />

                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, wordBreak: 'keep-all', textAlign: 'center' }}>
                            {prescriptionReason}
                        </div>

                        {/* Analysis Variables for Transparency */}
                        <div style={{ marginTop: '5px', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', fontSize: '0.8rem' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>추천 코스</span>
                                <span style={{ color: '#a29bfe', fontWeight: 600 }}>{activeMode.freq}Hz {activeMode.freq === 10 ? '이완(Alpha)' : activeMode.freq === 8 ? '정돈(Alpha-Theta)' : '깊은 이완(Theta)'}</span>
                            </div>
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '10px 0' }} />
                            
                            {/* User Selection: Time */}
                            <div style={{ marginBottom: '15px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>시간 선택</div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {MEDITATION_MODES.map(m => (
                                        <button 
                                            key={m.id}
                                            onClick={() => { setActiveMode(m); setTimeLeft(m.time); }}
                                            style={{
                                                flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.75rem',
                                                background: activeMode.id === m.id ? 'var(--primary-gold)' : 'rgba(255,255,255,0.05)',
                                                color: activeMode.id === m.id ? 'black' : 'white',
                                                border: 'none', transition: 'all 0.2s', fontWeight: 600
                                            }}
                                        >
                                            {m.label.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* User Selection: Type */}
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>가이드 유형</div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {Object.values(INTERACTION_TYPES).map(t => (
                                        <button 
                                            key={t.id}
                                            onClick={() => setInteractionType(t.id)}
                                            style={{
                                                flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.75rem',
                                                background: interactionType === t.id ? 'var(--primary-gold)' : 'rgba(255,255,255,0.05)',
                                                color: interactionType === t.id ? 'black' : 'white',
                                                border: 'none', transition: 'all 0.2s', fontWeight: 600
                                            }}
                                        >
                                            {t.id === 'v1' ? '안내' : t.id === 'v2' ? '숨소리' : '자세'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {isAILoading && (
                                <div style={{ textAlign: 'center', color: 'var(--primary-gold)', marginTop: '15px', fontSize: '0.75rem' }}>
                                    ✨ AI가 최적의 명상을 구성 중...
                                </div>
                            )}
                        </div>
                    </div>

                    <button onClick={startFromPrescription} style={{
                        marginTop: '35px', width: '100%', maxWidth: '350px',
                        background: 'var(--primary-gold)', color: 'black',
                        padding: '16px', borderRadius: '16px', fontSize: '1.05rem', fontWeight: 700, border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer'
                    }}>
                        <Play size={22} weight="fill" /> 시작하기
                    </button>
                    
                    <button onClick={() => setStep('diagnosis')} style={{ marginTop: '12px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', cursor: 'pointer' }}>
                        다시 선택
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

            {/* Background Animation (V1/V2) */}
            {interactionType !== 'v3' && (
                <>
                    <div className={`breathing-circle ${isPlaying ? 'animate' : 'paused'}`} style={{
                        position: 'absolute',
                        width: '300px', height: '300px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${activeMode?.color}40 0%, transparent 70%)`,
                        filter: 'blur(40px)',
                        zIndex: 0,
                        transform: interactionType === 'v2' ? `scale(${breathingScale})` : undefined,
                        transition: interactionType === 'v2' ? 'transform 0.1s ease-out' : undefined
                    }} />
                    <div className={`breathing-circle-inner ${isPlaying ? 'animate-inner' : 'paused'}`} style={{
                        position: 'absolute',
                        width: '200px', height: '200px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${activeMode?.color}60 0%, transparent 70%)`,
                        filter: 'blur(20px)',
                        zIndex: 0,
                        transform: interactionType === 'v2' ? `scale(${breathingScale * 0.8})` : undefined,
                        transition: interactionType === 'v2' ? 'transform 0.1s ease-out' : undefined
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

                <div style={{ fontSize: '4.5rem', fontWeight: 200, color: 'white', fontVariantNumeric: 'tabular-nums', letterSpacing: '-2px', textShadow: '0 0 30px rgba(255,255,255,0.3)' }}>
                    {formatTime(timeLeft)}
                </div>

                {/* Privacy Notice */}
                {(interactionType === 'v2' || interactionType === 'v3') && (
                    <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                        <LockKey size={12} weight="fill" color="#4ade80" /> 데이터는 기기 내에서만 처리됩니다
                    </div>
                )}
                
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

                {/* TTC Toggle Button */}
                <button onClick={() => {
                    const next = !ttcEnabled;
                    setTtcEnabled(next);
                    if (next && window.speechSynthesis) {
                        // Quick confirmation voice
                        const utterance = new SpeechSynthesisUtterance("음성 안내를 시작합니다.");
                        utterance.lang = 'ko-KR';
                        window.speechSynthesis.speak(utterance);
                    }
                }} style={{
                    position: 'absolute', right: '-80px', width: '50px', height: '50px', borderRadius: '50%',
                    background: ttcEnabled ? 'var(--primary-gold)' : 'rgba(255,255,255,0.1)', border: 'none', 
                    color: ttcEnabled ? '#000' : 'white',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    fontSize: '0.65rem', fontWeight: 'bold', gap: '2px'
                }}>
                    <SpeakerHigh size={20} weight={ttcEnabled ? "fill" : "regular"} />
                    TTC
                </button>
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

                .breathing-circle.animate { animation: breathe 8s infinite ease-in-out; }
                .breathing-circle-inner.animate-inner { animation: breathe-inner 8s infinite ease-in-out; }
                .paused { animation-play-state: paused !important; }
            `}</style>
        </div>
    );
};

export default MeditationPage;
