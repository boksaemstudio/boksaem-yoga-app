import { useState, useEffect, useRef } from 'react';
import Keypad from '../components/Keypad';
import { storageService } from '../services/storage';
import { auth } from '../firebase';
import { signInAnonymously } from 'firebase/auth';
import { getAllBranches, getBranchName } from '../studioConfig';
import logoWide from '../assets/logo_wide.png';
import rys200Logo from '../assets/RYS200.png';
import { getKSTHour, getDaysRemaining, safeParseDate } from '../utils/dates';
import { logError } from '../services/modules/errorModule';
import { useNetworkMonitor } from '../hooks/useNetworkMonitor';
import { useTTS } from '../hooks/useTTS';
import { useNetwork } from '../context/NetworkContext';
import { usePWA } from '../hooks/usePWA';
import TopBar from '../components/checkin/TopBar';


// [PERF] 현재 시간대 배경만 로딩 (4장 → 1장, WebP 최적화)
const getBgForPeriod = (period) => {
    switch (period) {
        case 'morning': return import('../assets/bg_morning.webp');
        case 'afternoon': return import('../assets/bg_afternoon.webp');
        case 'evening': return import('../assets/bg_evening.webp');
        default: return import('../assets/bg_night.webp');
    }
};
import KioskInstallGuideModal from '../components/checkin/KioskInstallGuideModal';
import InstructorQRModal from '../components/InstructorQRModal';

// safeParseDate imported from utils/dates

const toKSTDateString = (date) => {
    if (!date) return null;
    let d = safeParseDate(date);
    if (!d || isNaN(d.getTime())) return null;
    return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
};

const CheckInPage = () => {
    // [BUILD] Force CDN cache bust — v2026.02.22.15
    const BUILD_VERSION = '2026.02.22.15';
    console.log('[CheckInPage] Initialized version:', BUILD_VERSION);
    const [pin, setPin] = useState('');
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isReady, setIsReady] = useState(false); // [PERF] Cache ready state
    const timerRef = useRef(null);
    const [currentBranch, setCurrentBranch] = useState(() => storageService.getKioskBranch());
    const [duplicateMembers, setDuplicateMembers] = useState([]);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [weather, setWeather] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [aiExperience, setAiExperience] = useState(null);
    const [aiEnhancedMsg, setAiEnhancedMsg] = useState(null); // [AI] 백그라운드 AI 보강 메시지 (기존에 추가)
    const [aiLoading, setAiLoading] = useState(false); // [AI] AI 통신 중 애니메이션 표시
    const [showKioskInstallGuide, setShowKioskInstallGuide] = useState(false);
    const [showInstallGuide, setShowInstallGuide] = useState(false);
    
    // [NEW] Kiosk Notice & PWA Auto-Update
    const [kioskSettings, setKioskSettings] = useState({ active: false, imageUrl: null });
    const { needRefresh, updateServiceWorker } = usePWA();
    const [selectedMemberId, setSelectedMemberId] = useState(null); // [UX] 2-Step Check-in: track selection
    const [showInstructorQR, setShowInstructorQR] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [keypadLocked, setKeypadLocked] = useState(false); // [FIX] Prevent ghost touches
    const { isOnline, checkConnection } = useNetworkMonitor();
    const { setIsOnline } = useNetwork(); // [NETWORK] GLOBAL Connectivity state
    const { speak } = useTTS();

    // [DUPLICATE] 중복 입력 방지
    const recentCheckInsRef = useRef([]); // [{pin, timestamp}, ...]
    const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
    const [pendingPin, setPendingPin] = useState(null);
    const duplicateAutoCloseRef = useRef(null);
    const [duplicateTimer, setDuplicateTimer] = useState(25); // [UX] 25s countdown for auto-confirm
    // [FIX] State to track if we are in a forced duplicate check-in flow
    const [isDuplicateFlow, setIsDuplicateFlow] = useState(false);
    // [FIX] Always use Korean for Check-in Page as requested
    // const { language } = useLanguage();
    const language = 'ko';

    // [UX] Loading Message Logic
    const [loadingMessage, setLoadingMessage] = useState('출석 확인 중...');
    
    useEffect(() => {
        if (!loading) {
            setLoadingMessage('출석 확인 중...');
            return;
        }

        const timer1 = setTimeout(() => {
            setLoadingMessage('잠시만 기다려주세요...');
        }, 5000);

        const timer2 = setTimeout(() => {
            setLoadingMessage('서버와 연결하고 있습니다.\n조금만 더 기다려 주세요 🙏');
        }, 12000);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [loading]);



    // ... (Use a slow timer for background period updates) ...

    // ...



    // Use a slow timer for background period updates (every 5 minutes)
    const [period, setPeriod] = useState(() => {
        const hour = getKSTHour();
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    });



    // [PERF] 현재 시간대 배경만 동적 로딩
    const [bgImage, setBgImage] = useState(null);
    useEffect(() => {
        getBgForPeriod(period).then(m => setBgImage(m.default));
    }, [period]);

    // [FIX] 계산된 동적 뷰포트 높이(vh)를 CSS 변수로 설정 (100dvh 미지원 태블릿용)
    useEffect(() => {
        const setVh = () => {
            // 브라우저 UI를 제외한 실제 보이는 화면의 1% 높이
            let vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        // 초기 실행
        setVh();
        // 리사이즈, 전체화면 화면 회전 등 이벤트마다 갱신
        window.addEventListener('resize', setVh);
        window.addEventListener('orientationchange', setVh);
        return () => {
            window.removeEventListener('resize', setVh);
            window.removeEventListener('orientationchange', setVh);
        };
    }, []);

    // [New] Auto-reset input after 20s of inactivity
    useEffect(() => {
        if (pin.length > 0) {
            const timer = setTimeout(() => {
                setPin('');
                setMessage(null);
            }, 20000);
            return () => clearTimeout(timer);
        }
    }, [pin]);


    const branches = getAllBranches();

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            window.deferredPrompt = e; // [FIX] Persist globally
            console.log("Install prompt captured");
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if already captured before mount
        if (window.deferredPrompt) {
            setDeferredPrompt(window.deferredPrompt);
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    // [NEW] Kiosk Notice Listener (지점별 + 전체)
    useEffect(() => {
        let branchSettings = { active: false, imageUrl: null };
        let allSettings = { active: false, imageUrl: null };

        const updateCombinedSettings = () => {
            // Priority: Branch specific > All
            if (branchSettings.active) {
                setKioskSettings(branchSettings);
            } else if (allSettings.active) {
                setKioskSettings(allSettings);
            } else {
                setKioskSettings({ active: false, imageUrl: null });
            }
        };

        const unsubscribeBranch = storageService.subscribeToKioskSettings(currentBranch, (settings) => {
            branchSettings = settings;
            updateCombinedSettings();
        });

        const unsubscribeAll = storageService.subscribeToKioskSettings('all', (settings) => {
            allSettings = settings;
            updateCombinedSettings();
        });

        return () => {
            unsubscribeBranch();
            unsubscribeAll();
        };
    }, [currentBranch]);

    // [NEW] Kiosk PWA Auto-Update when Idle & Update Available
    useEffect(() => {
        let idleTimer;
        
        const resetIdleTimer = () => {
            clearTimeout(idleTimer);
            if (needRefresh) {
                // If update is available, wait 3 minutes of inactivity before applying it
                idleTimer = setTimeout(() => {
                    // Only update if no check-in is currently in progress
                    if (!pin && !message && !loading && !showSelectionModal && !showDuplicateConfirm) {
                        console.log('[Kiosk] Idle update triggered.');
                        updateServiceWorker(true);
                    }
                }, 3 * 60 * 1000); // 3 minutes idle
            }
        };

        window.addEventListener('touchstart', resetIdleTimer);
        window.addEventListener('click', resetIdleTimer);
        resetIdleTimer();

        return () => {
            clearTimeout(idleTimer);
            window.removeEventListener('touchstart', resetIdleTimer);
            window.removeEventListener('click', resetIdleTimer);
        };
    }, [needRefresh, pin, message, loading, showSelectionModal, showDuplicateConfirm, updateServiceWorker]);

    // [New] Auto-close Install Guide after 5 minutes
    useEffect(() => {
        let timer;
        if (showInstallGuide || showKioskInstallGuide) {
            timer = setTimeout(() => {
                // Assuming handleModalClose is a function that sets state to close modals
                // The instruction implies adding isOpen={true} to the *rendered* component,
                // not within this useEffect's callback.
                // This useEffect is for auto-closing, so we should call the close functions.
                setShowInstallGuide(false);
                setShowKioskInstallGuide(false);
            }, 300000); // 5 minutes
        }
        return () => clearTimeout(timer);
    }, [showInstallGuide, showKioskInstallGuide]);



    // Correctly proceeding with logic...

    const handleInstallClick = () => {
        const promptEvent = deferredPrompt || window.deferredPrompt;
        if (promptEvent) {
            promptEvent.prompt();
            promptEvent.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }
                setDeferredPrompt(null);
                window.deferredPrompt = null;
            });
        } else {
            setShowInstallGuide(true);
        }
    };

    const fetchWeatherAndAI = async () => {
        try {
            const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current_weather=true');
            const data = await res.json();
            const currentWeatherData = data.current_weather;
            setWeather(currentWeatherData);
            // AI standby loading will be handled by loadAIExperience which checks cache
            loadAIExperience("방문 회원", null, null, currentWeatherData);
        } catch (err) {
            console.log('Weather fetch failed', err);
            loadAIExperience();
        }
    };

    useEffect(() => {
        // [KIOSK MODE] Initialize with cache warming for maximum speed
        const initKiosk = async () => {
            console.time('[CheckIn] Total Init');
            
            // [STABILITY] Get anonymous auth to ensure Firestore write permissions for logging
            try {
                await signInAnonymously(auth);
                console.log('[CheckIn] 🔐 Anonymous auth successful');
            } catch (authErr) {
                console.warn('[CheckIn] Anonymous auth failed:', authErr.message);
            }

            await storageService.initialize({ mode: 'kiosk' });
            setIsReady(true);
            console.timeEnd('[CheckIn] Total Init');
            console.log('[CheckIn] 🚀 Kiosk ready - keypad enabled');
        };
        initKiosk();

        // Initial fetch (weather & AI - can run in parallel)
        fetchWeatherAndAI();

        // Background / Period Slow Timer
        const periodTimer = setInterval(() => {
            const hour = getKSTHour();
            let newPeriod = 'night';
            if (hour >= 6 && hour < 12) newPeriod = 'morning';
            else if (hour >= 12 && hour < 17) newPeriod = 'afternoon';
            else if (hour >= 17 && hour < 21) newPeriod = 'evening';
            setPeriod(newPeriod);
        }, 5 * 60 * 1000); // 5 minutes

        // Auto-refresh Weather & AI Standby Message every 60 minutes (User requested 1-2h)
        const refreshTimer = setInterval(() => {
            console.log("Refreshing Weather & AI context (Hourly)...");
            fetchWeatherAndAI();
        }, 60 * 60 * 1000);


        // 자동 전체화면 유도 (브라우저 정책상 첫 클릭/터치가 필요함)
        const handleFirstInteraction = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(e => console.log("Fullscreen auto-entry blocked", e));
                setIsFullscreen(true);
            }
            window.removeEventListener('click', handleFirstInteraction);
            window.removeEventListener('touchstart', handleFirstInteraction);
        };

        window.addEventListener('click', handleFirstInteraction);
        window.addEventListener('touchstart', handleFirstInteraction);

        return () => {
            clearInterval(periodTimer);
            clearInterval(refreshTimer);
            if (duplicateAutoCloseRef.current) clearInterval(duplicateAutoCloseRef.current); // ✅ Memory Leak Fix: Zombie Timer Destruction
            window.removeEventListener('click', handleFirstInteraction);
            window.removeEventListener('touchstart', handleFirstInteraction);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reload AI when significant state changes
    useEffect(() => {
        // [STABILITY] Don't clear aiExperience here (prevents flickering)
        // loadAIExperience will handle the "is loading" state internally ONLY if no cache exists
        loadAIExperience("방문 회원", null, null, weather);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language, currentBranch]);

    // [NETWORK] Monitor online/offline status handled by NetworkContext


    // ============================================================
    // [ALWAYS-ON GUARD SYSTEM] 키오스크 앱 꺼짐 방지
    // ============================================================

    // [GUARD 1] 탭 절전 복구 (visibilitychange)
    // 태블릿 화면이 꺼졌다 켜지면 캐시 재로드 + 장시간 절전 시 새로고침
    useEffect(() => {
        let lastActiveTime = Date.now();

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                const sleepDuration = Date.now() - lastActiveTime;
                const sleepMinutes = Math.round(sleepDuration / 60000);
                console.log(`[AlwaysOn] Tab woke up after ${sleepMinutes}m`);

                // 5분 이상 잠들었으면 전체 새로고침 (Firestore 연결 불안정)
                if (sleepDuration > 5 * 60 * 1000) {
                    console.log('[AlwaysOn] Long sleep detected, reloading page...');
                    window.location.reload();
                    return;
                }

                // 1분 이상 잠들었으면 캐시만 갱신
                if (sleepDuration > 60 * 1000) {
                    try {
                        console.log('[AlwaysOn] Refreshing cache after short sleep...');
                        await storageService.loadAllMembers();
                        fetchWeatherAndAI();
                    } catch (e) {
                        console.warn('[AlwaysOn] Cache refresh failed:', e);
                    }
                }
            } else {
                lastActiveTime = Date.now();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // [GUARD 2] 화면 절전 방지 (Wake Lock API)
    // 브라우저가 화면을 끄지 않도록 요청
    useEffect(() => {
        let wakeLock = null;

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await navigator.wakeLock.request('screen');
                    console.log('[AlwaysOn] Wake Lock acquired ✅');
                    wakeLock.addEventListener('release', () => {
                        console.log('[AlwaysOn] Wake Lock released, re-acquiring...');
                        // 자동 재획득
                        setTimeout(requestWakeLock, 1000);
                    });
                }
            } catch (e) {
                console.log('[AlwaysOn] Wake Lock not supported or failed:', e.message);
            }
        };

        requestWakeLock();

        // visibilitychange 시 Wake Lock 재획득 (앱 포커스 되돌아올 때)
        const handleWakeLockVisibility = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handleWakeLockVisibility);

        return () => {
            if (wakeLock) wakeLock.release().catch(() => {});
            document.removeEventListener('visibilitychange', handleWakeLockVisibility);
        };
    }, []);

    // [GUARD 3] 주기적 건강 체크 (Heartbeat)
    // 3분마다 앱 상태 확인, 비정상 시 자동 새로고침
    useEffect(() => {
        let heartbeatCount = 0;

        const heartbeat = setInterval(() => {
            heartbeatCount++;
            const rootEl = document.getElementById('root');

            // DOM이 사라졌으면 앱이 죽은 것
            if (!rootEl || !rootEl.children || rootEl.children.length === 0) {
                console.error('[AlwaysOn] Heartbeat: DOM dead, reloading...');
                window.location.reload();
                return;
            }

            // 매 30번째(~90분)마다 예방적 캐시 갱신
            if (heartbeatCount % 30 === 0) {
                console.log('[AlwaysOn] Heartbeat: Preventive cache refresh');
                storageService.loadAllMembers().catch(() => {});
            }
        }, 3 * 60 * 1000); // 3분

        return () => clearInterval(heartbeat);
    }, []);

    const loadAIExperience = async (memberName = "방문 회원", credits = null, remainingDays = null, currentWeatherData = null) => {
        const isStandby = memberName === "방문 회원" || memberName === "visitor";

        try {
            const now = new Date();
            const hour = getKSTHour();
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            const day = days[now.getDay()];

            // [BUSINESS HOURS] Only use AI between 7am-11pm
            const isBusinessHours = hour >= 7 && hour < 23;

            if (!isBusinessHours) {
                // Use fixed message outside business hours
                const fallbackMsg = "오늘도 매트 위에서 나를 만나는 소중한 시간입니다.";
                setAiExperience({
                    message: fallbackMsg,
                    bgTheme: "dawn",
                    colorTone: "#FDFCF0",
                    isFallback: true
                });
                return;
            }

            // Find upcoming class to inform AI
            const classInfo = await storageService.getCurrentClass(currentBranch);
            const classTitle = classInfo?.title || "자율수련";
            const weatherCode = currentWeatherData?.weathercode || weather?.weathercode || '0';

            // [STATIC STANDBY LOGIC] Context-Aware Message Generator
            if (isStandby) {
                let staticMsg = "";

                // 1. Weather Context (Priority 1)
                const wCode = parseInt(weatherCode);
                const isRainy = wCode >= 51 && wCode <= 67 || wCode >= 80 && wCode <= 82;
                const isSnowy = wCode >= 71 && wCode <= 77 || wCode >= 85 && wCode <= 86;

                if (isRainy && Math.random() > 0.3) {
                    const rainMsgs = [
                        "비 오는 날, 매트 위에서 차분함을 느껴보세요.",
                        "빗소리와 함께 내면의 소리에 귀 기울여 보세요.",
                        "촉촉한 공기가 수련의 깊이를 더해줍니다.",
                        "흐린 날일수록 마음의 빛은 더 선명해집니다.",
                        "비에 씻겨나가듯, 걱정도 내려놓으세요."
                    ];
                    staticMsg = rainMsgs[Math.floor(Math.random() * rainMsgs.length)];
                } else if (isSnowy && Math.random() > 0.3) {
                    const snowMsgs = [
                        "눈 내리는 날, 고요한 수련을 시작합니다.",
                        "차가운 공기 속, 몸의 온기를 채워보세요.",
                        "하얀 세상처럼 마음도 깨끗하게 비워내는 시간.",
                        "포근한 스튜디오에서 겨울의 낭만을 즐기세요."
                    ];
                    staticMsg = snowMsgs[Math.floor(Math.random() * snowMsgs.length)];
                }

                // 2. Class Context (Priority 2)
                if (!staticMsg && classTitle && classTitle !== "자율수련" && Math.random() > 0.5) {
                    if (classTitle.includes("플라잉")) {
                        const flyingMsgs = [
                            "중력을 거스르며 자유로움을 느끼는 시간.",
                            "해먹에 몸을 맡기고 척추의 편안함을 찾으세요.",
                            "날개를 펴듯, 몸과 마음을 활짝 열어보세요.",
                            "공중에서의 휴식, 플라잉 요가가 기다립니다."
                        ];
                        staticMsg = flyingMsgs[Math.floor(Math.random() * flyingMsgs.length)];
                    } else if (classTitle.includes("테라피") || classTitle.includes("힐링")) {
                        const healingMsgs = [
                            "지친 몸을 위로하는 치유의 시간입니다.",
                            "부드러운 움직임으로 긴장을 풀어주세요.",
                            "나를 돌보는 가장 따뜻한 방법, 테라피 요가.",
                            "오늘 하루 수고한 몸에게 휴식을 선물하세요."
                        ];
                        staticMsg = healingMsgs[Math.floor(Math.random() * healingMsgs.length)];
                    } else if (classTitle.includes("명상") || classTitle.includes("빈야사")) {
                        const flowMsgs = [
                            "호흡과 움직임이 하나 되는 몰입의 순간.",
                            "흐르는 땀방울만큼 마음은 맑아집니다.",
                            "움직임 속에서 정적인 평화를 찾아보세요.",
                            "나만의 리듬을 찾아가는 여정이 시작됩니다."
                        ];
                        staticMsg = flowMsgs[Math.floor(Math.random() * flowMsgs.length)];
                    }
                }

                // 3. Time Context (Priority 3)
                if (!staticMsg) {
                    let timeMsgs = [];
                    if (hour >= 6 && hour < 11) {
                        timeMsgs = [
                            "상쾌한 아침, 건강한 에너지를 깨우세요.",
                            "새로운 하루, 매트 위에서 시작하는 다짐.",
                            "아침의 고요함이 하루의 균형을 잡아줍니다.",
                            "오늘 당신의 하루는 빛날 것입니다.",
                            "맑은 정신으로 맞이하는 아침 수련.",
                            "가장 먼저 나를 만나는 이 시간이 소중합니다."
                        ];
                    } else if (hour >= 11 && hour < 14) {
                        timeMsgs = [
                            "오후를 위한 활력, 잠시 쉬어가세요.",
                            "나른함을 깨우고 몸에 생기를 불어넣습니다.",
                            "바쁜 일상 속, 나를 위한 작은 쉼표.",
                            "점심 시간, 짧지만 깊은 충전의 시간입니다.",
                            "몸을 가볍게 비우고 마음을 채우세요."
                        ];
                    } else if (hour >= 14 && hour < 18) {
                        timeMsgs = [
                            "오후의 햇살처럼 따뜻한 에너지를 만드세요.",
                            "지친 오후, 굳은 어깨와 마음을 활짝 펴세요.",
                            "남은 하루를 완주할 힘을 얻어가는 시간.",
                            "지금 이 순간, 오롯이 나에게 집중합니다.",
                            "긴장을 풀고 호흡 깊이 들이마시세요."
                        ];
                    } else if (hour >= 18 && hour < 21) {
                        timeMsgs = [
                            "오늘 하루의 무게를 매트에 내려놓으세요.",
                            "수고한 당신, 이제 온전히 쉴 시간입니다.",
                            "복잡한 생각은 비우고 내면을 채우세요.",
                            "하루를 마무리하는 가장 아름다운 의식.",
                            "고요한 저녁, 나를 다독이는 따뜻한 수련.",
                            "오늘도 잘 견뎌낸 나에게 감사를 전합니다."
                        ];
                    } else {
                        timeMsgs = [
                            "깊은 밤, 달빛처럼 은은한 평화를 찾으세요.",
                            "하루의 끝, 내일의 나를 위한 재충전.",
                            "편안한 잠을 위한 깊은 이완의 시간.",
                            "도시의 소음은 잊고 내 숨소리에 집중하세요.",
                            "고요함 속에서 만나는 진정한 휴식."
                        ];
                    }
                    staticMsg = timeMsgs[Math.floor(Math.random() * timeMsgs.length)];
                }

                // [INSTANT] 정적 메시지 즉시 표시 (속도 우선)
                setAiExperience({
                    message: staticMsg,
                    bgTheme: (hour >= 6 && hour < 18) ? "day" : "night",
                    colorTone: "#FDFCF0",
                    isFallback: true
                });

                // [AI ENHANCEMENT] 백그라운드에서 AI 메시지 추가 로드
                setAiLoading(true);
                storageService.getAIExperience(
                    memberName, 0, day, hour, classTitle,
                    currentWeatherData || weather,
                    null, null, language, null, 'visitor', 'checkin'
                ).then(aiResult => {
                    if (aiResult && aiResult.message && !aiResult.isFallback) {
                        let cleanMsg = aiResult.message
                            .replace(/나마스테[.]?\s*🙏?/gi, '')
                            .replace(/^.*님,\s*/, '')
                            .trim();
                        if (cleanMsg && cleanMsg !== staticMsg) {
                            setAiEnhancedMsg(cleanMsg);
                        }
                        // 캐시 저장
                        const cacheKey = `ai_standby_${currentBranch}_${hour}_${day}_${classTitle}_${weatherCode}`;
                        localStorage.setItem('ai_standby_cache', JSON.stringify({ key: cacheKey, data: aiResult }));
                    }
                }).catch(err => {
                    console.warn('[AI Standby] Background AI failed:', err);
                }).finally(() => {
                    setAiLoading(false);
                });
                return; // 대기화면은 여기서 종료 (아래 멤버 전용 AI는 별도)
            }

            const exp = await storageService.getAIExperience(
                memberName,
                0,
                day,
                hour,
                classTitle,
                currentWeatherData || weather,
                credits,
                remainingDays,
                language,
                null,
                isStandby ? 'visitor' : 'member',
                'checkin'
            );

            if (exp) {
                // Aggressively remove 'Namaste' and any trailing variations
                let cleanMsg = "";
                if (exp.message) {
                    cleanMsg = exp.message.replace(/나마스테[.]?\s*🙏?/gi, '');
                    cleanMsg = cleanMsg.replace(/^.*님,\s*/, ''); // Remove "Name," prefix if exists
                    cleanMsg = cleanMsg.trim();
                }

                const finalData = {
                    ...exp,
                    message: cleanMsg || exp.message
                };

                setAiExperience(finalData);

                // [CACHE SAVE]
                if (isStandby) {
                    const cacheKey = `ai_standby_${currentBranch}_${hour}_${day}_${classTitle}_${weatherCode}`;
                    localStorage.setItem('ai_standby_cache', JSON.stringify({ key: cacheKey, data: finalData }));
                }
            }
        } catch (e) {
            console.error("AI Experience load failed", e);
        }
    };



    const handleKeyPress = (num) => {
        setPin(prev => {
            // [NETWORK] 키패드 입력 시작 시(첫 글자) 즉시 연결 상태 확인 (Just-in-Time Check)
            // 사용자가 입력을 마칠 때쯤이면 이미 온라인 상태가 되도록 유도
            if (prev.length === 0) {
                console.log('[CheckIn] User started typing - Triggering background network check');
                checkConnection().catch(e => console.debug('[CheckIn] Background check failed', e));
            }

            if (prev.length < 4) {
                const newPin = prev + num;
                if (newPin.length === 4) {
                    // Immediate submission for performance
                    handleSubmit(newPin);
                }
                return newPin;
            }
            return prev;
        });
    };

    const handleClear = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const handleQRInteraction = (e) => {
        // [FIX] Robust touch handling to prevent "open then close" ghost clicks
        if (e.type === 'touchstart') {
            e.preventDefault(); // Stop mouse emulation
        }
        e.stopPropagation(); // Stop bubbling

        // Toggle logic or Ensure Open
        // If modal logic is buggy (auto-close), force it open with a small delay to bypass race conditions
        setTimeout(() => setShowInstallGuide(true), 10);
    };

    const handleBranchChange = (branchId) => {
        setCurrentBranch(branchId);
        storageService.setKioskBranch(branchId);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => {
                console.error(`Error attempting to enable full-screen mode: ${e.message}`);
            });
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };



    // [DUPLICATE] 중복 입력 확인 후 실제 출석 처리
    const proceedWithCheckIn = async (pinCode, isDuplicateConfirm = false) => {
        console.log(`[CheckIn] Starting submission for PIN: ${pinCode}`);
        setLoading(true);
        try {
            const members = await storageService.findMembersByPhone(pinCode);
            console.log(`[CheckIn] Members found: ${members.length}`);

            if (members.length === 0) {
                setMessage({ type: 'error', text: '회원 정보를 찾을 수 없습니다.' });
                speak("error");
                setPin('');
                startDismissTimer(3000);
                setIsDuplicateFlow(false); // Reset flow
                return;
            }

            // [FIX] Set flow state if confirmed
            if (isDuplicateConfirm) {
                setIsDuplicateFlow(true);
            } else {
                setIsDuplicateFlow(false);
            }

            if (members.length > 1) {
                console.log(`[CheckIn] Multiple members found, showing selection modal`);
                setDuplicateMembers(members);
                setShowSelectionModal(true);
                return;
            }

            const member = members[0];
            console.log(`[CheckIn] Single member selected: ${member.name} (${member.id}), force: ${isDuplicateConfirm}`);

            const result = await storageService.checkInById(member.id, currentBranch, isDuplicateConfirm);

            if (result.success) {
                // [NETWORK] If success and NOT offline, ensure we are Online
                if (!result.isOffline) {
                    setIsOnline(true);
                } else {
                    // [NETWORK] Sync status if we fell back to offline
                    setIsOnline(false);
                }

                if (result.attendanceStatus === 'denied') {
                    handleCheckInError(`기간 혹은 횟수가 만료되었습니다.`);
                } else {
                    // 출석 성공 → 기록 추가
                    recentCheckInsRef.current.push({ pin: pinCode, timestamp: Date.now() });
                    showCheckInSuccess(result, isDuplicateConfirm);
                }
            } else {
                handleCheckInError(result.message);
            }
        } catch (err) {
            handleCheckInError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    // [DUPLICATE] 확인 모달에서 "다시 출석" 클릭
    const confirmDuplicateCheckIn = async () => {
        if (duplicateAutoCloseRef.current) clearInterval(duplicateAutoCloseRef.current);
        setShowDuplicateConfirm(false);
        if (pendingPin) {
            await proceedWithCheckIn(pendingPin, true);
            setPendingPin(null);
        }
    };

    // [DUPLICATE] 확인 모달에서 "취소" 클릭
    const cancelDuplicateCheckIn = () => {
        if (duplicateAutoCloseRef.current) clearInterval(duplicateAutoCloseRef.current);
        setShowDuplicateConfirm(false);
        setPendingPin(null);
        setPin('');
        setLoading(false);
        setDuplicateTimer(25); // Reset
    };

    const handleSubmit = async (code) => {
        const pinCode = code || pin;
        if (pinCode.length !== 4 || loading) return;

        // [NETWORK] We now support offline check-in via storageService fallback
        // The navigator.onLine check is no longer a blocker. 
        // We will show a warning but allow the user to proceed.
        if (!navigator.onLine) {
            console.log('[CheckIn] Proceeding in offline mode...');
        }

        // [DUPLICATE] 60초 이내 동일 PIN 입력 확인
        const now = Date.now();
        const DUPLICATE_WINDOW_MS = 600000; // 10분
        // 만료된 기록 정리
        recentCheckInsRef.current = recentCheckInsRef.current.filter(
            entry => (now - entry.timestamp) < DUPLICATE_WINDOW_MS
        );
        const isDuplicate = recentCheckInsRef.current.some(entry => entry.pin === pinCode);

        if (isDuplicate) {
            console.log(`[CheckIn] Duplicate PIN detected: ${pinCode} (within ${DUPLICATE_WINDOW_MS/1000}s)`);
            setPendingPin(pinCode);
            setShowDuplicateConfirm(true);
            setPin('');
            
            // [UX] Start 25s Countdown for Auto-Confirm (Request: "If I do nothing, attendance should be checked")
            setDuplicateTimer(25);
            
            // Clear existing timer if any
            if (duplicateAutoCloseRef.current) clearInterval(duplicateAutoCloseRef.current);

            duplicateAutoCloseRef.current = setInterval(() => {
                setDuplicateTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(duplicateAutoCloseRef.current);
                        // [UX] Auto-Confirm Logic
                        console.log("Auto-confirming duplicate check-in due to timeout");
                        // We need to trigger confirmDuplicateCheckIn, but we can't call it directly inside state update easily
                        // So we use an effect or just call a wrapped version.
                        // However, duplicatePin state acts as a trigger.
                        // Let's call a separate function or use useEffect to watch timer?
                        // Actually, simpler to just trigger it here if we refactor confirmDuplicateCheckIn to not depend on event.
                        // Check below for confirmDuplicateCheckIn implementation. It uses pendingPin.
                        return 0; 
                    }
                    return prev - 1;
                });
            }, 1000);

            return;
        }

        await proceedWithCheckIn(pinCode);
    };

    // [UX] Watch for timer reaching 0 to trigger auto-confirm
    useEffect(() => {
        if (duplicateTimer === 0 && showDuplicateConfirm && pendingPin) {
            confirmDuplicateCheckIn();
        }
    }, [duplicateTimer, showDuplicateConfirm, pendingPin]);

    const handleCheckInError = (errorStr) => {
        console.error("[CheckIn] Error caught:", errorStr);
        
        // [STABILITY] Log error to Firestore for tracking (e.g., Da-sol Joung's case)
        logError(new Error(errorStr), { 
            context: 'Kiosk CheckIn', 
            branch: currentBranch,
            pin: pin.slice(-4), // Only log last 4 digits for privacy if possible, but here 'pin' is usually last 4 anyway
            pathname: window.location.pathname
        });

        let displayMsg = '출석 처리 중 오류가 발생했습니다.';
        const lowerErr = errorStr.toLowerCase();

        // [NETWORK] Network-specific error messages (check first for better UX)
        if (lowerErr.includes('시간 초과') || lowerErr.includes('timeout')) {
            displayMsg = '⏱️ 서버 응답 시간 초과 - 다시 시도해주세요';
        } else if (lowerErr.includes('network') || lowerErr.includes('fetch') || lowerErr.includes('failed to fetch')) {
            displayMsg = '🌐 네트워크 오류 - 연결을 확인해주세요';
        } else if (lowerErr.includes("insufficient credits")) {
            displayMsg = "잔여 횟수가 부족합니다. (0회)";
        } else if (lowerErr.includes("membership expired") || lowerErr.includes("expired") || lowerErr.includes("만료")) {
            const dateMatch = errorStr.match(/\((.*?)\)/);
            const date = dateMatch ? dateMatch[1] : '';
            displayMsg = date ? `기간 혹은 횟수가 만료되었습니다. (~${date})` : "기간 혹은 횟수가 만료되었습니다.";
        } else if (lowerErr.includes("not-found")) {
            displayMsg = "회원 정보를 찾을 수 없습니다.";
        } else if (lowerErr.includes("infinity")) { // [FIX] Handle 'Infinity' error specifically
            displayMsg = "데이터 오류가 발생했습니다. (Infinity)";
            console.error("[CheckIn] Critical Data Error: Infinity detected");
        } else if (lowerErr.includes("거부")) {
             displayMsg = `⛔ ${errorStr}`; // Special icon for denial
        } else {
            // [FIX] Prevent showing "Infinity" in raw error messages
            if (errorStr.includes("Infinity")) {
                 displayMsg = "데이터 오류가 발생했습니다. (Infinity)";
            } else {
                 displayMsg += ` (${errorStr})`;
            }
        }

        if (lowerErr.includes("insufficient credits") || lowerErr.includes("expired") || lowerErr.includes("만료") || lowerErr.includes("거부") || lowerErr.includes("not-found")) {
             speak("denied"); // [TTS] Denied Feedback
        }

        setMessage({ type: 'error', text: displayMsg });
        setPin('');
        startDismissTimer(3000);
    };

    const handleSelectMember = async (memberId) => {
        if (loading) return;
        setShowSelectionModal(false);
        setLoading(true);
        try {
            const member = duplicateMembers.find(m => m.id === memberId);
            console.log(`[CheckIn] Selected member from modal: ${member?.name} (${memberId})`);

            // [FIX] Pass force flag if in duplicate flow
            const result = await storageService.checkInById(memberId, currentBranch, isDuplicateFlow);
            console.log(`[CheckIn] SelectMember Result: ${result.success ? 'Success' : 'Fail'}`);

            if (result.success) {
                 // [FIX] Check for DENIED status even if success=true
                 if (result.attendanceStatus === 'denied') {
                    const reason = result.denialReason === 'expired' ? '기간 만료' : '횟수 소진';
                    handleCheckInError(`출석이 거부되었습니다. (${reason})`);
                } else {
                    // [NETWORK] Sync status if we fell back to offline
                    if (result.isOffline) {
                        setIsOnline(false);
                    } else {
                        setIsOnline(true);
                    }
                    showCheckInSuccess(result);
                }
            } else {
                handleCheckInError(result.message);
            }
        } catch (err) {
            handleCheckInError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    const showCheckInSuccess = (result, isDuplicate = false) => {
        console.log(`[CheckIn] Showing success for: ${result.member?.name}, isDuplicate: ${isDuplicate}`);

        // [PERSONALIZED FORMULA] No AI, just logic
        const member = result.member;
        const streak = member.streak || 0;
        const credits = member.credits || 0;
        const attCount = member.attendanceCount || 0;
        const today = new Date();
        let daysLeft = 999;
        if (member.endDate) {
            const endDate = safeParseDate(member.endDate);
            today.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            if (!Number.isFinite(daysLeft)) daysLeft = 999; // [FIX] Prevent Infinity
        }

        let finalMsg = "오늘의 수련이 시작됩니다.";

        // EXPIRY Check first (before duplicate msg)
        const isExpiredPeriod = daysLeft < 0;
        // [FIX] credits === 0 means they just successfully used their LAST session. It's only an error if strictly < 0.
        const isExpiredCredits = credits < 0 && Number.isFinite(credits);
        const isLastSessionOrDay = (credits === 0 && Number.isFinite(credits)) || daysLeft === 0;

        // [TTS] Feedback logic
        if (isExpiredPeriod || isExpiredCredits) {
            speak("denied"); 
        } else if (isLastSessionOrDay && !result.isDuplicate) {
            speak("last_session");
        } else if (result.isDuplicate) {
            speak("duplicate");
        } else {
            speak("success"); 
        }

        // [New] Duplicate Check-in Feedback
        if (result.isDuplicate) {
             finalMsg = "이미 출석 처리되었습니다.";
        } else if (isExpiredPeriod && isExpiredCredits) {
            finalMsg = "기간 및 횟수가 만료되었습니다.";
        } else if (isExpiredPeriod) {
            finalMsg = "기간이 만료되었습니다.";
        } else if (isExpiredCredits) {
            finalMsg = "잔여 횟수가 없습니다.";
        } else if (isLastSessionOrDay) {
            finalMsg = "오늘 마지막 수련 후 재등록이 필요합니다.";
        // Priority Logic matches context
        } else if (streak >= 10 && Number.isFinite(streak)) { // [FIX] Check finite
            finalMsg = `${streak}일 연속 수련 중입니다. 놀라운 꾸준함입니다!`;
        } else if (streak >= 3 && Number.isFinite(streak)) { // [FIX] Check finite
            finalMsg = `${streak}일째 수련을 이어가고 계시네요. 좋은 흐름입니다.`;
        } else if (daysLeft <= 7 && daysLeft >= 0) {
            finalMsg = `회원권 만료가 ${daysLeft}일 남았습니다.`;
        } else if (credits <= 2 && credits > 0 && Number.isFinite(credits)) { // [FIX] Check finite
            finalMsg = `잔여 횟수가 ${credits}회 남았습니다.`;
        } else if (attCount >= 100) {
            finalMsg = `${attCount}번째 수련입니다. 항상 함께해 주셔서 감사합니다.`;
        } else if (attCount === 1) {
            finalMsg = "복샘요가에 오신 것을 환영합니다! 첫 수련을 응원합니다.";
        } else {
            // Random Fallback
            const fallbacks = [
                "호흡에 집중하며 나를 만나는 시간입니다.",
                "매트 위에서 평온함을 찾으시길 바랍니다.",
                "오늘도 건강한 하루 되세요.",
                "몸과 마음이 하나되는 순간입니다.",
                "수련을 통해 내면의 평화를 느껴보세요."
            ];
            finalMsg = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }

        // [AI ENHANCEMENT] 규칙 기반 즉시 표시 + AI 백그라운드 보강
        setAiEnhancedMsg(null); // 초기화
        setAiLoading(true); // AI 로딩 시작

            setMessage({
                type: 'success', // [UX] Always show success style
                member: result.member,
                text: `${result.member.name}님`,
                subText: finalMsg, // [UX] No special offline text
            details: (
                <div className="attendance-info" style={{
                    marginTop: '30px',
                    padding: '30px 40px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.1rem', opacity: 0.6, marginBottom: '6px' }}>잔여 횟수</div>
                            <div style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--primary-gold)' }}>
                                {result.member.credits}회
                            </div>
                        </div>
                        
                        <div style={{ width: '1px', height: '50px', background: 'rgba(255,255,255,0.1)' }} />

                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.1rem', opacity: 0.6, marginBottom: '6px' }}>잔여 일수</div>
                            <div style={{ fontSize: '2.8rem', fontWeight: 800, color: '#4CAF50' }}>
                                {(() => {
                                    if (!result.member.endDate || result.member.endDate === 'TBD') {
                                        return <span style={{ fontSize: '1.8rem' }}>확정 전</span>;
                                    }
                                    if (result.member.endDate === 'unlimited') {
                                        return <span style={{ fontSize: '1.8rem' }}>무제한</span>;
                                    }
                                    const days = getDaysRemaining(result.member.endDate);
                                    if (days === null) return <span style={{ fontSize: '1.8rem' }}>확정 전</span>;
                                    if (days < 0) return <span style={{ color: '#FF5252' }}>만료</span>;
                                    return `D-${days}`;
                                })()}
                            </div>
                        </div>

                        {/* 독립적인 버튼 영역: 우측 분리 */}
                        <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.1)', marginLeft: '10px' }} />
                        
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleModalClose(() => setMessage(null));
                            }}
                            className="interactive"
                            style={{
                                background: 'var(--primary-gold)',
                                color: 'black',
                                border: 'none',
                                padding: '15px 35px',
                                borderRadius: '15px',
                                fontSize: '1.3rem',
                                fontWeight: '900',
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                boxShadow: '0 8px 25px var(--primary-gold-glow)',
                                minWidth: '120px',
                                marginLeft: '10px'
                            }}
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )
        });
        setPin('');
        startDismissTimer(12000); // [EXTENDED] 7s -> 12s per user request

        // [AI] 백그라운드 AI 개인화 메시지 요청
        const now2 = new Date();
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        storageService.getAIExperience(
            member.name, attCount, dayNames[now2.getDay()], now2.getHours(),
            null, weather, credits, daysLeft, language,
            { streak, lastAttendanceAt: null },
            'member', 'checkin'
        ).then(aiResult => {
            if (aiResult && aiResult.message && !aiResult.isFallback) {
                let cleanMsg = aiResult.message
                    .replace(/나마스테[.]?\s*🙏?/gi, '')
                    .replace(/^.*님,\s*/, '')
                    .trim();
                if (cleanMsg) {
                    setAiEnhancedMsg(cleanMsg);
                }
            }
        }).catch(err => {
            console.warn('[AI CheckIn] Background AI failed:', err);
        }).finally(() => {
            setAiLoading(false);
        });
    };

    const startDismissTimer = (duration = 5000) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            handleModalClose(() => setMessage(null));
            setPin(''); // [FIX] Ensure PIN is clear when returning to standby
        }, duration);
    };

    // [FIX] Centralized modal close handler with ghost touch prevention
    const handleModalClose = (closeAction) => {
        setKeypadLocked(true);
        closeAction();
        setPin(''); // [FIX] 모달 닫을 때 항상 PIN 초기화
        setAiEnhancedMsg(null); // [AI] 보강 메시지 초기화
        setAiLoading(false); // [AI] 로딩 상태 초기화
        // Buffer time to ignore any lingering touch/click events (ghost touches)
        setTimeout(() => {
            setKeypadLocked(false);
        }, 350);
    };

    // [UX] Auto-close Selection Modal after 30s
    useEffect(() => {
        let timer;
        if (showSelectionModal) {
            timer = setTimeout(() => {
                handleModalClose(() => setShowSelectionModal(false));
            }, 30000); // 30s timeout
        }
        return () => clearTimeout(timer);
    }, [showSelectionModal]);

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/member')}&bgcolor=ffffff&color=2c2c2c&margin=10`;

    return (
        <div className="checkin-wrapper" style={{
            position: 'relative',
            width: '100%',
            height: 'calc(var(--vh, 1vh) * 100)',
            minHeight: '100vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: '#000'
        }}>
            {/* [NETWORK] Global indicator moved to bottom right per user request */}

            {/* Background Image with optimized rendering */}
            <div className="bg-container" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0
            }}>
                <img
                    src={bgImage}
                    alt="bg"
                    className="static-bg"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />
                <div className="bg-overlay" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.5)' // Solid overlay for speed
                }} />
            </div>

            {/* Top Bar - Optimized with Memoization & Internal Clock */}
            <TopBar
                weather={weather}
                currentBranch={currentBranch}
                branches={branches}
                handleBranchChange={handleBranchChange}
                toggleFullscreen={toggleFullscreen}
                isFullscreen={isFullscreen}
                language={language}
                onInstructorClick={() => setShowInstructorQR(true)}
            />

            <div className="checkin-content" style={{
                zIndex: 5,
                flex: 1,
                display: 'flex',
                gap: '40px',
                padding: '50px 40px 60px', /* 상/하단 여백 충분히 확보 (위 50, 아래 60) */
                width: '100%',
                margin: '0 auto',
                alignItems: 'stretch',
                overflow: 'hidden'
            }}>
                <div className="checkin-info-section" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between' /* 중앙 정렬에서 양끝 정렬로 변경해 상/하단 잘림 방지 */
                }}>
                    {!message && (
                        <header className="info-header" style={{ marginBottom: '40px' }}>
                            <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '35px', justifyContent: 'center' }}>
                                {/* [ADJUSTED] Logo sizes: RYS200 (80px), Main Logo (80px) per user request */}
                                <img src={rys200Logo} alt="RYS200" style={{ height: '80px', width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.8 }} />
                                <img src={logoWide} alt="logo" style={{ height: '78px', width: 'auto' }} />
                            </div>
                        </header>
                    )}

                    <div className="info-body">
                        {!message && !showInstallGuide && (
                            <div className="pin-display">
                                {pin.padEnd(4, '•').split('').map((c, i) => (
                                    <span key={i} className={i < pin.length ? 'pin-active' : 'pin-inactive'}>{c}</span>
                                ))}
                            </div>
                        )}

                        {/* [FIX] Moved message modal logic to root level or use portal concept */}
                        <div className="message-container">
                            {/* Only show instruction when no message */}
                            {!message && (
                                <div className={`instruction-text ${loading ? 'loading' : ''}`}>
                                    {aiExperience ? (
                                        <div>
                                            <span className="outfit-font" style={{
                                                fontSize: 'clamp(1.8rem, 4.5vh, 2.6rem)',
                                                fontWeight: 700,
                                                display: 'block',
                                                marginBottom: '15px',
                                                color: '#FFFFFF',
                                                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                                                wordBreak: 'keep-all',
                                                lineHeight: 1.2,
                                                opacity: loading ? 0.3 : 1
                                            }}>
                                                {aiExperience.message}
                                            </span>
                                            {/* [AI] AI 보강 메시지 - 기존 메시지 아래 추가 */}
                                            {aiEnhancedMsg && !loading && (
                                                <div style={{
                                                    marginTop: '8px',
                                                    padding: '12px 16px',
                                                    background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
                                                    border: '1px solid rgba(212,175,55,0.25)',
                                                    borderRadius: '16px',
                                                    animation: 'slideUp 0.6s ease-out',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '10px'
                                                }}>
                                                    <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: '2px' }}>✨</span>
                                                    <span style={{
                                                        fontSize: 'clamp(1rem, 2.5vh, 1.4rem)',
                                                        color: 'rgba(255,255,255,0.9)',
                                                        lineHeight: 1.5,
                                                        fontWeight: 500,
                                                        wordBreak: 'keep-all',
                                                        fontStyle: 'italic'
                                                    }}>
                                                        {aiEnhancedMsg}
                                                    </span>
                                                </div>
                                            )}
                                            {/* [AI] AI 로딩 인디케이터 - 반드시 애니메이션 */}
                                            {aiLoading && !loading && (
                                                <div style={{
                                                    marginTop: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '10px',
                                                    padding: '10px 16px',
                                                    borderRadius: '20px',
                                                    background: 'rgba(212,175,55,0.08)',
                                                    border: '1px solid rgba(212,175,55,0.15)',
                                                    animation: 'fadeIn 0.5s ease-out'
                                                }}>
                                                    <div className="ai-thinking-icon" style={{
                                                        width: '24px', height: '24px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        <svg width="20" height="20" viewBox="0 0 256 256" fill="var(--primary-gold)">
                                                            <path d="M200,48H136V16a8,8,0,0,0-16,0V48H56A32,32,0,0,0,24,80v96a32,32,0,0,0,32,32h80v32a8,8,0,0,0,16,0V208h48a32,32,0,0,0,32-32V80A32,32,0,0,0,200,48ZM172,168H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Zm0-48H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Z"/>
                                                        </svg>
                                                    </div>
                                                    <span style={{
                                                        color: 'rgba(212,175,55,0.85)',
                                                        fontSize: '0.95rem',
                                                        fontWeight: 500,
                                                        animation: 'pulse 1.5s ease-in-out infinite'
                                                    }}>
                                                        AI가 오늘의 메시지를 준비하고 있어요
                                                    </span>
                                                    <div style={{
                                                        display: 'flex', gap: '4px'
                                                    }}>
                                                        {[0, 1, 2].map(i => (
                                                            <div key={i} style={{
                                                                width: '6px', height: '6px',
                                                                borderRadius: '50%',
                                                                background: 'var(--primary-gold)',
                                                                opacity: 0.7,
                                                                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
                                                            }} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {loading && (
                                                <div className="mini-loader" style={{
                                                    fontSize: '1.1rem',
                                                    color: 'var(--primary-gold)',
                                                    fontWeight: 'bold',
                                                    marginTop: '-10px'
                                                }}>
                                                    수련 정보를 확인하고 있습니다...
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                            <div className="ai-thinking-icon" style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="20" height="20" viewBox="0 0 256 256" fill="var(--primary-gold)">
                                                    <path d="M200,48H136V16a8,8,0,0,0-16,0V48H56A32,32,0,0,0,24,80v96a32,32,0,0,0,32,32h80v32a8,8,0,0,0,16,0V208h48a32,32,0,0,0,32-32V80A32,32,0,0,0,200,48ZM172,168H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Zm0-48H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Z"/>
                                                </svg>
                                            </div>
                                            <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>요가 수련의 에너지를 연결하고 있습니다...</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {!message && (
                        <div
                            className="qr-box" // Removed glass-panel
                            style={{
                                background: 'rgba(0,0,0,0.6)', // Simple background
                                borderRadius: '20px',
                                padding: '20px 30px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '25px',
                                alignSelf: 'center',
                                border: '1px solid rgba(255, 215, 0, 0.4)',
                                touchAction: 'none'
                            }}
                            onTouchStart={handleQRInteraction}
                            onMouseDown={(e) => {
                                if (e.button === 0) handleQRInteraction(e);
                            }}
                        >
                            <div className="qr-img-wrapper" style={{ background: 'white', padding: '12px', borderRadius: '16px', flexShrink: 0 }}>
                                <img src={qrCodeUrl} alt="QR" style={{ width: '130px', height: '130px', display: 'block' }} />
                            </div>
                            <div className="qr-text" style={{
                                textAlign: 'left',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                marginTop: '-5px' // Adjusted alignment
                            }}>
                                <h3 style={{ fontSize: '1.9rem', color: 'var(--primary-gold)', marginBottom: '16px', fontWeight: 900, lineHeight: 1 }}>
                                    내 요가
                                </h3>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <li style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.95)', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.1 }}>
                                        ✓ 잔여 횟수 확인
                                    </li>
                                    <li style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.95)', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.1 }}>
                                        ✓ 수업 일정 보기
                                    </li>
                                    <li style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.95)', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.1 }}>
                                        ✓ 맞춤 알림 받기
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                <div className="checkin-keypad-section" style={{ position: 'relative', background: 'transparent', boxShadow: 'none', border: 'none' }}>
                    {/* [UX] Loading Overlay with Friendly Messages (30s Timeout Support) */}
                    {loading && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,0,0,0.85)',
                            borderRadius: '24px',
                            zIndex: 100,
                            padding: '20px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                border: '3px solid rgba(255,215,0,0.3)',
                                borderTop: '3px solid var(--primary-gold)',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                marginBottom: '20px'
                            }} />
                            <p style={{ color: 'var(--primary-gold)', fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
                                {loadingMessage || '출석 확인 중...'}
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginTop: '8px' }}>
                                잠시만 기다려주세요
                            </p>
                        </div>
                    )}
                    {/* [PERF] Loading overlay while cache is warming */}
                    {!isReady && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,0,0,0.7)',
                            borderRadius: '24px',
                            zIndex: 100
                        }}>
                            <div style={{
                                width: '50px',
                                height: '50px',
                                border: '4px solid rgba(255,215,0,0.3)',
                                borderTop: '4px solid var(--primary-gold)',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <p style={{ marginTop: '20px', color: 'var(--primary-gold)', fontSize: '1.2rem', fontWeight: 600 }}>
                                출석 시스템 준비 중...
                            </p>
                        </div>
                    )}
                    {pin.length === 0 && !message && isReady && (
                        <div className="keypad-floating-instruction">
                            전화번호 뒤 4자리를 눌러주세요
                        </div>
                    )}
                    <Keypad
                        onKeyPress={handleKeyPress}
                        onClear={handleClear}
                        onSubmit={handleSubmit}
                        disabled={loading || keypadLocked || !!message || showSelectionModal || showInstallGuide || showKioskInstallGuide || !isReady}
                    />
                </div>
            </div >

            {
                showSelectionModal && (
                    <div
                        className="modal-overlay"
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => {
                            if (e.cancelable) e.preventDefault();
                            e.stopPropagation();
                        }}
                        style={{ zIndex: 3000, touchAction: 'none' }} // Ensure it's on top and blocks gestures
                    >
                        <div className="modal-content glass-panel" style={{
                            width: '95%',
                            maxWidth: '1100px',
                            maxHeight: '90vh',
                            padding: '25px 30px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            overflow: 'hidden'
                        }}>
                            <h2 style={{ fontSize: '2rem', marginBottom: '5px', textAlign: 'center' }}>회원 선택</h2>
                            <p style={{ textAlign: 'center', opacity: 0.7, marginBottom: '10px', fontSize: '0.95rem' }}>
                                해당하는 회원님을 선택해주세요
                                <span style={{ marginLeft: '10px', fontSize: '0.85em', color: '#ff6b6b' }}>
                                    (30초 후 자동 닫힘)
                                </span>
                            </p>

                            {/* [LOGIC] Split Active / Inactive Members */}
                            {(() => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);

                                const activeMembers = [];
                                const inactiveMembers = [];

                                duplicateMembers.forEach(m => {
                                    let isActive = false;
                                    const credits = m.credits || 0;
                                    const endDateStr = m.endDate;

                                    // 1. Check Credits
                                    const hasCredits = credits > 0 || credits === Infinity;

                                    // 2. Check Date
                                    let hasValidDate = true;
                                    if (endDateStr && endDateStr !== 'unlimited' && endDateStr !== 'TBD') {
                                        const endDate = new Date(endDateStr);
                                        endDate.setHours(0, 0, 0, 0);
                                        if (endDate < today) {
                                            hasValidDate = false;
                                        }
                                    }

                                    // Active Logic: Must have credits AND valid date
                                    if (hasCredits && hasValidDate) {
                                        activeMembers.push(m);
                                    } else {
                                        inactiveMembers.push(m);
                                    }
                                });

                                return (
                                    <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: '280px' }}>
                                        {/* LEFT: Active Members (Prominent, Horizontal) */}
                                        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-gold)', borderBottom: '1px solid rgba(212,175,55,0.3)', paddingBottom: '8px' }}>
                                                ✨ 이용 가능 회원
                                            </h3>
                                            <div style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '15px',
                                                flex: 1,
                                                overflowY: 'auto',
                                                alignContent: 'start',
                                                paddingRight: '5px'
                                            }}>
                                                {activeMembers.length > 0 ? activeMembers.map(m => {
                                                    const isSelected = selectedMemberId === m.id;
                                                    return (
                                                        <button
                                                            key={m.id}
                                                            onClick={(e) => {
                                                                if (loading) return;
                                                                e.stopPropagation();
                                                                setSelectedMemberId(m.id);
                                                            }}
                                                            className={`member-card active-member-card ${isSelected ? 'selected' : ''}`}
                                                            style={{
                                                                flex: '1 1 calc(50% - 15px)', // 2 cards per row
                                                                minWidth: '220px',
                                                                padding: '20px',
                                                                borderRadius: '16px',
                                                                background: isSelected ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))' : 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
                                                                color: 'white',
                                                                border: isSelected ? '2px solid var(--primary-gold)' : '2px solid rgba(255,255,255,0.2)',
                                                                boxShadow: isSelected ? '0 0 20px rgba(212,175,55,0.3)' : '0 4px 15px rgba(0,0,0,0.1)',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '12px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                                                minHeight: '140px'
                                                            }}
                                                        >
                                                            <span style={{ fontSize: '1.9rem', fontWeight: '800', color: isSelected ? 'var(--primary-gold)' : 'white' }}>{m.name}</span>
                                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                                                <span style={{ fontSize: '0.9rem', background: 'rgba(0,0,0,0.5)', padding: '5px 12px', borderRadius: '50px' }}>
                                                                    {getBranchName(m.homeBranch)}
                                                                </span>
                                                                <span style={{ fontSize: '0.9rem', background: isSelected ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '50px', color: isSelected ? '#a5d6a7' : 'rgba(255,255,255,0.8)' }}>
                                                                    {m.credits > 900 ? '무제한' : `${m.credits}회`}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                }) : (
                                                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, fontSize: '1.2rem', padding: '30px' }}>
                                                        활성 회원이 없습니다.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* RIGHT: Inactive Members (Compact, Smaller, Unclickable typically) */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '20px', maxWidth: '300px' }}>
                                            <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                                                💤 만료/비활성
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                                                {inactiveMembers.length > 0 ? inactiveMembers.map(m => {
                                                    const isSelected = selectedMemberId === m.id;
                                                    return (
                                                        <div
                                                            key={m.id}
                                                            onClick={(e) => {
                                                                if (loading) return;
                                                                e.stopPropagation();
                                                                setSelectedMemberId(m.id);
                                                            }}
                                                            className={`member-card inactive-member-card ${isSelected ? 'selected' : ''}`}
                                                            style={{
                                                                padding: '10px 15px',
                                                                borderRadius: '8px',
                                                                background: isSelected ? 'rgba(212,175,55,0.15)' : 'rgba(0,0,0,0.3)',
                                                                color: isSelected ? 'var(--primary-gold)' : 'rgba(255,255,255,0.4)',
                                                                border: isSelected ? '1px solid var(--primary-gold)' : '1px dashed rgba(255,255,255,0.1)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                textAlign: 'left',
                                                                cursor: 'pointer',
                                                                opacity: isSelected ? 1 : 0.7,
                                                                transform: isSelected ? 'scale(1.02)' : 'none',
                                                                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                                            }}
                                                        >
                                                            <div>
                                                                <div style={{ fontSize: '1.05rem', fontWeight: isSelected ? '800' : '600' }}>{m.name}</div>
                                                                <div style={{ fontSize: '0.75rem', opacity: isSelected ? 0.9 : 0.6 }}>{getBranchName(m.homeBranch)}</div>
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: '#ff6b6b' }}>만료/비활성</div>
                                                        </div>
                                                    );
                                                }) : (
                                                    <div style={{ opacity: 0.3, textAlign: 'center', padding: '15px', fontSize: '0.85rem' }}>
                                                        해당 없음
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px' }}>
                                <button
                                    onClick={() => handleModalClose(() => setShowSelectionModal(false))}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        color: 'rgba(255,255,255,0.6)',
                                        padding: '12px 30px',
                                        borderRadius: '50px',
                                        fontSize: '1.1rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
                                        e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                                        e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                                    }}
                                >
                                    취소 (닫기)
                                </button>
                                
                                {/* [UX] 2-Step Check-in Final Button */}
                                <button
                                    onClick={(e) => {
                                        if (loading || !selectedMemberId) return;
                                        e.stopPropagation();
                                        handleSelectMember(selectedMemberId);
                                    }}
                                    disabled={!selectedMemberId || loading}
                                    style={{
                                        background: selectedMemberId ? 'var(--primary-gold)' : 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        color: selectedMemberId ? '#000' : 'rgba(255,255,255,0.3)',
                                        padding: '12px 40px',
                                        borderRadius: '50px',
                                        fontSize: '1.1rem',
                                        fontWeight: '700',
                                        cursor: selectedMemberId ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.2s',
                                        boxShadow: selectedMemberId ? '0 4px 15px rgba(212,175,55,0.3)' : 'none'
                                    }}
                                    onMouseOver={(e) => selectedMemberId && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                    onMouseOut={(e) => selectedMemberId && (e.currentTarget.style.transform = 'translateY(0)')}
                                >
                                    {selectedMemberId ? '선택한 회원으로 출석하기' : '회원을 먼저 선택해주세요'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* [FIX] Message Modal as Fixed Overlay for reliable closing */}
            
            {/* [BUILD-FIX] Unminifiable version string inside DOM to defeat all dead-code elimination (v2026.02.22.v8) */}
            <div style={{ display: 'none' }} data-version="2026.02.22.v8">v2026.02.22.v8</div>
            
            {
                message && (
                    <div
                        className="modal-overlay"
                        style={{
                            zIndex: 2500,
                            background: 'rgba(0,0,0,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleModalClose(() => setMessage(null));
                            setPin('');
                            if (timerRef.current) clearTimeout(timerRef.current);
                        }}
                        onTouchStart={(e) => {
                            if (e.cancelable) e.preventDefault();
                            e.stopPropagation();
                            handleModalClose(() => setMessage(null));
                            setPin('');
                            if (timerRef.current) clearTimeout(timerRef.current);
                        }}
                    >
                        <div
                            className={`message-box ${message.type}`}
                            style={{
                                maxWidth: '900px', // Restrict width so it looks like a modal
                                width: '90%',
                                height: 'auto',
                                maxHeight: '80vh',
                                display: 'flex', // Re-apply flex inside
                                flexDirection: 'column'
                            }}
                            onClick={(e) => {
                                // Also allow clicking inside the box to close it (per user request: "touch screen to close immediately")
                                e.stopPropagation();
                                handleModalClose(() => setMessage(null));
                                setPin('');
                                if (timerRef.current) clearTimeout(timerRef.current);
                            }}
                        >
                            <div className="message-content">
                                <div className="message-text" style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '15px' }}>{message.text}</div>
                                {message.subText && <div className="message-subtext" style={{ fontSize: '1.5rem', opacity: 1, marginBottom: '20px', whiteSpace: 'pre-wrap', lineHeight: '1.3' }}>{message.subText}</div>}
                                {/* [AI] 체크인 성공 AI 보강 메시지 */}
                                {message.type === 'success' && aiEnhancedMsg && (
                                    <div style={{
                                        margin: '0 20px 15px',
                                        padding: '14px 18px',
                                        background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                                        border: '1px solid rgba(212,175,55,0.3)',
                                        borderRadius: '16px',
                                        animation: 'slideUp 0.6s ease-out',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px'
                                    }}>
                                        <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: '2px' }}>✨</span>
                                        <span style={{
                                            fontSize: '1.15rem',
                                            color: 'rgba(255,255,255,0.95)',
                                            lineHeight: 1.5,
                                            fontWeight: 500,
                                            wordBreak: 'keep-all',
                                            fontStyle: 'italic'
                                        }}>
                                            {aiEnhancedMsg}
                                        </span>
                                    </div>
                                )}
                                {/* [AI] 체크인 성공 AI 로딩 인디케이터 */}
                                {message.type === 'success' && aiLoading && (
                                    <div style={{
                                        margin: '0 20px 15px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '10px 16px',
                                        borderRadius: '20px',
                                        background: 'rgba(212,175,55,0.08)',
                                        border: '1px solid rgba(212,175,55,0.15)',
                                        animation: 'fadeIn 0.5s ease-out'
                                    }}>
                                        <div className="ai-thinking-icon" style={{
                                            width: '20px', height: '20px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <svg width="16" height="16" viewBox="0 0 256 256" fill="var(--primary-gold)">
                                                <path d="M200,48H136V16a8,8,0,0,0-16,0V48H56A32,32,0,0,0,24,80v96a32,32,0,0,0,32,32h80v32a8,8,0,0,0,16,0V208h48a32,32,0,0,0,32-32V80A32,32,0,0,0,200,48ZM172,168H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Zm0-48H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Z"/>
                                            </svg>
                                        </div>
                                        <span style={{
                                            color: 'rgba(212,175,55,0.85)',
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                            animation: 'pulse 1.5s ease-in-out infinite'
                                        }}>
                                            마음을 담은 메시지를 준비 중...
                                        </span>
                                        <div style={{ display: 'flex', gap: '3px' }}>
                                            {[0, 1, 2].map(i => (
                                                <div key={i} style={{
                                                    width: '5px', height: '5px',
                                                    borderRadius: '50%',
                                                    background: 'var(--primary-gold)',
                                                    opacity: 0.7,
                                                    animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
                                                }} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {message.details}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* [NEW] Kiosk Notice Overlay */}
            {kioskSettings?.active && kioskSettings?.imageUrl && !message && !showSelectionModal && !showDuplicateConfirm && (
                <div 
                    onClick={() => {
                        // Dismiss locally until page reloads or settings update
                        setKioskSettings(prev => ({...prev, active: false}));
                    }}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: '#000',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'fadeIn 0.3s ease-in-out'
                    }}
                >
                    <img 
                        src={kioskSettings.imageUrl} 
                        alt="키오스크 공지" 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                        onClick={(e) => {
                            e.stopPropagation();
                            setKioskSettings(prev => ({...prev, active: false}));
                        }}
                    />
                    <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '10px 20px', borderRadius: '20px', pointerEvents: 'none', fontWeight: 'bold' }}>
                        화면을 터치하면 출석체크로 이동합니다
                    </div>
                </div>
            )}

            {/* PWA Install Guide — Now uses the centralized OS-specific Modal */}
            {/* Install Guide Modal tailored for Landscape Kiosk */}
            <KioskInstallGuideModal 
                isOpen={showKioskInstallGuide || showInstallGuide} 
                onClose={() => {
                    setShowKioskInstallGuide(false);
                    setShowInstallGuide(false);
                }} 
            />

            {/* Instructor QR Modal */}
            <InstructorQRModal 
                isOpen={showInstructorQR} 
                onClose={() => setShowInstructorQR(false)} 
            />

            {showDuplicateConfirm && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', // [UI] Darker background for focus
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'rgba(30,30,30,0.98)',
                        backdropFilter: 'blur(30px)',
                        border: '2px solid rgba(255,80,80,0.5)',
                        borderRadius: '28px',
                        padding: '30px 40px',
                        maxWidth: '750px',
                        width: '95%',
                        textAlign: 'center',
                        boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
                        animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
                        <div style={{
                            fontSize: '3rem',
                            marginBottom: '10px'
                        }}>⚠️</div>
                        <h3 style={{
                            color: '#ff6b6b',
                            fontSize: '2rem',
                            fontWeight: 800,
                            marginBottom: '12px',
                            textShadow: '0 2px 10px rgba(255,107,107,0.3)'
                        }}>잠깐만요! 방금 출석하셨어요</h3>
                        
                        <p style={{
                            color: 'white',
                            fontSize: '1.3rem',
                            lineHeight: 1.4,
                            marginBottom: '6px',
                            fontWeight: 600
                        }}>
                            혹시 <span style={{color: '#ffd700'}}>가족/친구분</span>과 함께 오셨나요?
                        </p>
                        <p style={{
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: '1.1rem',
                            marginBottom: '25px'
                        }}>
                             아니라면, 아래 <span style={{color: '#ff6b6b', textDecoration: 'underline'}}>빨간 버튼</span>을 눌러주세요!
                        </p>

                        <div style={{
                            display: 'flex',
                            gap: '20px',
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                        }}>
                            {/* [UI] Huge Cancel Button */}
                            <button
                                onClick={cancelDuplicateCheckIn}
                                style={{
                                    flex: '1 1 280px',
                                    padding: '20px 15px',
                                    borderRadius: '20px',
                                    border: '3px solid #ff6b6b',
                                    background: 'rgba(255,107,107,0.15)',
                                    color: '#ff6b6b',
                                    fontSize: '1.5rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 10px 30px rgba(255,107,107,0.2)',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span>😱 잘못 눌렀어요!</span>
                                <span style={{fontSize: '0.85rem', fontWeight: 500, opacity: 0.8}}>(취소하기)</span>
                            </button>

                            {/* [UI] Huge Confirm Button */}
                            <button
                                onClick={confirmDuplicateCheckIn}
                                style={{
                                    flex: '1 1 280px',
                                    padding: '20px 15px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #d4af37, #f5d76e)',
                                    color: '#1a1a1a',
                                    fontSize: '1.5rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 10px 30px rgba(212,175,55,0.4)',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span>🙆‍♀️ 네, 또 왔어요</span>
                            </button>
                        </div>

                        {/* [Logic] Auto-confirm countdown */}
                        <div style={{
                            marginTop: '20px',
                            padding: '12px 15px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '14px',
                            border: '1px dashed rgba(255,255,255,0.2)'
                        }}>
                            <p style={{
                                color: 'rgba(255,255,255,0.9)',
                                fontSize: '1rem',
                                marginBottom: '6px'
                            }}>
                                아무것도 안 누르면...
                            </p>
                            <div style={{
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                color: '#ffd700'
                            }}>
                                <span style={{fontSize: '1.5rem', color: '#fff'}}>{duplicateTimer}</span>초 뒤 자동으로 <span style={{textDecoration: 'underline'}}>출석 처리</span>됩니다
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

// [ADD] Effect to auto-close InstallGuide after 5 minutes
// Since we are inside the component, we can add this useEffect inside CheckInPage
// But CheckInPage is large, let's inject it near other effects or just add a self-closing wrapper?
// Actually, let's just add the useEffect hook in the main component body for simplicity.


// [BUILD-FIX] Attach unminifiable property to component object to defeat tree-shaking
// This guarantees Rollup will generate a new chunk hash, forcing Workbox to update!
CheckInPage.__buildVersion = '2026.02.22.v5';

export default CheckInPage;
