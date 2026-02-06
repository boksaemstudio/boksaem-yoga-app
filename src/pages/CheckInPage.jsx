import { useState, useEffect, useRef, memo } from 'react';
import Keypad from '../components/Keypad';
import { storageService } from '../services/storage';
import { getAllBranches, getBranchName } from '../studioConfig';
import logoWide from '../assets/logo_wide.png';
import { MapPin, Sun, Cloud, CloudRain, Snowflake, Lightning, Moon, CornersOut, CornersIn, Chalkboard } from '@phosphor-icons/react';
import { getDaysRemaining } from '../utils/dates';

import bgMorning from '../assets/bg_morning.png';
import bgAfternoon from '../assets/bg_afternoon.png';
import bgEvening from '../assets/bg_evening.png';
import bgNight from '../assets/bg_night.png';
import InstallGuideModal from '../components/InstallGuideModal';
import InstructorQRModal from '../components/InstructorQRModal';
import rys200Logo from '../assets/RYS200.png';


const getWeatherIcon = (code, isNight) => {
    if (code === 0) return isNight ? <Moon size={24} weight="fill" /> : <Sun size={24} weight="fill" />;
    if (code >= 1 && code <= 3) return <Cloud size={24} weight="fill" />;
    if (code >= 45 && code <= 48) return <Cloud size={24} weight="fill" />; // Fog
    if (code >= 51 && code <= 67) return <CloudRain size={24} weight="fill" />;
    if (code >= 71 && code <= 77) return <Snowflake size={24} weight="fill" />;
    if (code >= 80 && code <= 82) return <CloudRain size={24} weight="fill" />;
    if (code >= 95) return <Lightning size={24} weight="fill" />;
    return <Cloud size={24} weight="fill" />;
};

// [OPTIMIZED] Self-contained Clock to prevent full-page re-renders
const DigitalClock = memo(() => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Optimized formatting for older CPUs
    const h = time.getHours().toString().padStart(2, '0');
    const m = time.getMinutes().toString().padStart(2, '0');
    const s = time.getSeconds().toString().padStart(2, '0');

    return (
        <div className="top-clock outfit-font" style={{
            fontSize: '2.2rem',
            fontWeight: 700,
            color: 'var(--primary-gold)',
            letterSpacing: '2px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1
        }}>
            {h}:{m}:{s}
        </div>
    );
});
DigitalClock.displayName = 'DigitalClock';

const TopBar = memo(({ weather, currentBranch, branches, handleBranchChange, toggleFullscreen, isFullscreen, language, onInstructorClick }) => {
    const locale = language === 'ko' ? 'ko-KR' : (language === 'en' ? 'en-US' : (language === 'ru' ? 'ru-RU' : (language === 'zh' ? 'zh-CN' : 'ja-JP')));
    const now = new Date();


    return (
        <div className="checkin-top-bar" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 30px',
            zIndex: 10,
            position: 'relative'
        }}>
            {/* Left: Branch Selector */}
            <div className="branch-selector" style={{ flex: 1, display: 'flex', gap: '10px' }}>
                {branches.map(branch => (
                    <button
                        key={branch.id}
                        className={`branch-btn ${currentBranch === branch.id ? 'active' : ''}`}
                        onClick={() => handleBranchChange(branch.id)}
                    >
                        <MapPin size={18} weight={currentBranch === branch.id ? 'fill' : 'regular'} /> {branch.name}
                    </button>
                ))}
            </div>

            {/* Center: Clock & Weather (Absolute Centered) */}
            <div className="top-info-center glass-panel-sm" style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '8px 20px',
                borderRadius: '50px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap',
                width: 'fit-content',
                flexShrink: 0
            }}>
                <DigitalClock locale={locale} />

                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />

                {weather && (
                    <>
                        <div className="top-weather" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {getWeatherIcon(weather.weathercode, now.getHours() >= 18 || now.getHours() < 6)}
                            <span className="weather-temp" style={{ fontSize: '1.4rem', fontWeight: 600, color: 'rgba(255,255,255,0.95)', lineHeight: 1 }}>
                                {weather.temperature}°C
                            </span>
                        </div>

                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />

                        <span className="weather-date" style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, letterSpacing: '0.5px', lineHeight: 1 }}>
                            {now.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                        </span>
                    </>
                )}
            </div>

            {/* Right: Action Buttons Grouped */}
            <div className="top-actions-right" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '40px' }}>

                {/* Instructor Button */}
                <button
                    className="instructor-btn"
                    onClick={onInstructorClick}
                    aria-label="강사 앱"
                    style={{
                        background: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid rgba(212, 175, 55, 0.4)',
                        borderRadius: '22px',
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        color: 'var(--primary-gold)',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        transition: 'none'
                    }}
                >
                    <Chalkboard size={20} weight="duotone" />
                    강사
                </button>

                <button
                    className="fullscreen-btn"
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? "전체화면 종료" : "전체화면 시작"}
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '50%',
                        width: '44px',
                        height: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white',
                        transition: 'none'
                    }}
                >
                    {isFullscreen ? <CornersIn size={24} /> : <CornersOut size={24} />}
                </button>
            </div>
        </div>
    );
});
TopBar.displayName = 'TopBar';

const CheckInPage = () => {
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
    const [showKioskInstallGuide, setShowKioskInstallGuide] = useState(false);
    const [showInstallGuide, setShowInstallGuide] = useState(false);
    const [showInstructorQR, setShowInstructorQR] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [keypadLocked, setKeypadLocked] = useState(false); // [FIX] Prevent ghost touches
    const [isOnline, setIsOnline] = useState(navigator.onLine); // [NETWORK] Connectivity state
    // [FIX] Always use Korean for Check-in Page as requested
    // const { language } = useLanguage();
    const language = 'ko';

    // Use a slow timer for background period updates (every 5 minutes)
    const [period, setPeriod] = useState(() => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    });

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

    // [New] Auto-close Install Guide after 5 minutes
    useEffect(() => {
        let timer;
        if (showInstallGuide || showKioskInstallGuide) {
            timer = setTimeout(() => {
                handleModalClose(() => {
                    setShowInstallGuide(false);
                    setShowKioskInstallGuide(false);
                });
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
            const hour = new Date().getHours();
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

    // [NETWORK] Monitor online/offline status
    useEffect(() => {
        const handleOnline = () => {
            console.log('[Network] Connection restored');
            setIsOnline(true);
        };
        const handleOffline = () => {
            console.log('[Network] Connection lost');
            setIsOnline(false);
        };
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const loadAIExperience = async (memberName = "방문 회원", credits = null, remainingDays = null, currentWeatherData = null) => {
        const isStandby = memberName === "방문 회원" || memberName === "visitor";

        try {
            const now = new Date();
            const hour = now.getHours();
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
                // Codes: 0-3(Clear/Cloudy), 51-67/80-82(Rain), 71-77/85-86(Snow)
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

                // 2. Class Context (Priority 2 - if no weather msg selected)
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

                // 3. Time Context (Priority 3 - Default Large Pool)
                if (!staticMsg) {
                    let timeMsgs = [];
                    if (hour >= 6 && hour < 11) { // Morning
                        timeMsgs = [
                            "상쾌한 아침, 건강한 에너지를 깨우세요.",
                            "새로운 하루, 매트 위에서 시작하는 다짐.",
                            "아침의 고요함이 하루의 균형을 잡아줍니다.",
                            "오늘 당신의 하루는 빛날 것입니다.",
                            "맑은 정신으로 맞이하는 아침 수련.",
                            "가장 먼저 나를 만나는 이 시간이 소중합니다."
                        ];
                    } else if (hour >= 11 && hour < 14) { // Lunch
                        timeMsgs = [
                            "오후를 위한 활력, 잠시 쉬어가세요.",
                            "나른함을 깨우고 몸에 생기를 불어넣습니다.",
                            "바쁜 일상 속, 나를 위한 작은 쉼표.",
                            "점심 시간, 짧지만 깊은 충전의 시간입니다.",
                            "몸을 가볍게 비우고 마음을 채우세요."
                        ];
                    } else if (hour >= 14 && hour < 18) { // Afternoon
                        timeMsgs = [
                            "오후의 햇살처럼 따뜻한 에너지를 만드세요.",
                            "지친 오후, 굳은 어깨와 마음을 활짝 펴세요.",
                            "남은 하루를 완주할 힘을 얻어가는 시간.",
                            "지금 이 순간, 오롯이 나에게 집중합니다.",
                            "긴장을 풀고 호흡 깊이 들이마시세요."
                        ];
                    } else if (hour >= 18 && hour < 21) { // Evening
                        timeMsgs = [
                            "오늘 하루의 무게를 매트에 내려놓으세요.",
                            "수고한 당신, 이제 온전히 쉴 시간입니다.",
                            "복잡한 생각은 비우고 내면을 채우세요.",
                            "하루를 마무리하는 가장 아름다운 의식.",
                            "고요한 저녁, 나를 다독이는 따뜻한 수련.",
                            "오늘도 잘 견뎌낸 나에게 감사를 전합니다."
                        ];
                    } else { // Night (21+)
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

                setAiExperience({
                    message: staticMsg,
                    bgTheme: (hour >= 6 && hour < 18) ? "day" : "night",
                    colorTone: "#FDFCF0",
                    isFallback: true
                });
                return; // Stop here, no API call
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



    const handleSubmit = async (code) => {
        const pinCode = code || pin;
        if (pinCode.length !== 4 || loading) return; // Prevent double submission

        // [NETWORK] Check connectivity before attempting server call
        if (!navigator.onLine) {
            setMessage({ type: 'error', text: '⚠️ 네트워크 연결을 확인해주세요' });
            setPin('');
            startDismissTimer(3000);
            return;
        }

        console.log(`[CheckIn] Starting submission for PIN: ${pinCode}`);
        setLoading(true);
        try {
            // [OPTIMIZED] find member first to start AI generation early
            const members = await storageService.findMembersByPhone(pinCode);
            console.log(`[CheckIn] Members found: ${members.length}`);

            if (members.length === 0) {
                setMessage({ type: 'error', text: '회원 정보를 찾을 수 없습니다.' });
                setPin('');
                startDismissTimer(2000);
                return;
            }

            if (members.length > 1) {
                console.log(`[CheckIn] Multiple members found, showing selection modal`);
                setDuplicateMembers(members);
                setShowSelectionModal(true);
                return;
            }

            const member = members[0];
            console.log(`[CheckIn] Single member selected: ${member.name} (${member.id})`);

            // [FIX] Show result IMMEDIATELY without waiting for AI
            const result = await storageService.checkInById(member.id, currentBranch);

            if (result.success) {
                // Show success with static message (no AI)
                showCheckInSuccess(result, null);
            } else {
                handleCheckInError(result.message);
            }
        } catch (err) {
            handleCheckInError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    const handleCheckInError = (errorStr) => {
        console.error("[CheckIn] Error caught:", errorStr);
        let displayMsg = '출석 처리 중 오류가 발생했습니다.';
        const lowerErr = errorStr.toLowerCase();

        // [NETWORK] Network-specific error messages (check first for better UX)
        if (lowerErr.includes('시간 초과') || lowerErr.includes('timeout')) {
            displayMsg = '⏱️ 서버 응답 시간 초과 - 다시 시도해주세요';
        } else if (lowerErr.includes('network') || lowerErr.includes('fetch') || lowerErr.includes('failed to fetch')) {
            displayMsg = '🌐 네트워크 오류 - 연결을 확인해주세요';
        } else if (lowerErr.includes("insufficient credits")) {
            displayMsg = "잔여 횟수가 부족합니다. (0회)";
        } else if (lowerErr.includes("membership expired")) {
            const dateMatch = errorStr.match(/\((.*?)\)/);
            const date = dateMatch ? dateMatch[1] : '';
            displayMsg = date ? `회원권 만료일(${date})이 지났습니다.` : "회원권이 만료되었습니다.";
        } else if (lowerErr.includes("not-found")) {
            displayMsg = "회원 정보를 찾을 수 없습니다.";
        } else {
            displayMsg += ` (${errorStr})`;
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

            // [FIX] Immediate result for selected member
            const result = await storageService.checkInById(memberId, currentBranch);
            console.log(`[CheckIn] SelectMember Result: ${result.success ? 'Success' : 'Fail'}`);

            if (result.success) {
                showCheckInSuccess(result);
            } else {
                handleCheckInError(result.message);
            }
        } catch (err) {
            handleCheckInError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    const showCheckInSuccess = (result) => {
        console.log(`[CheckIn] Showing success for: ${result.member?.name}`);

        // [PERSONALIZED FORMULA] No AI, just logic
        const member = result.member;
        const streak = member.streak || 0;
        const credits = member.credits || 0;
        const attCount = member.attendanceCount || 0;
        const today = new Date();
        const endDate = member.endDate ? new Date(member.endDate) : null;
        let daysLeft = 999;

        if (endDate) {
            today.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        }

        let finalMsg = "오늘의 수련이 시작됩니다.";

        // Priority Logic matches context
        if (streak >= 10) {
            finalMsg = `${streak}일 연속 수련 중입니다. 놀라운 꾸준함입니다!`;
        } else if (streak >= 3) {
            finalMsg = `${streak}일째 수련을 이어가고 계시네요. 좋은 흐름입니다.`;
        } else if (daysLeft <= 7 && daysLeft >= 0) {
            finalMsg = `회원권 만료가 ${daysLeft}일 남았습니다.`;
        } else if (credits <= 3 && credits > 0) {
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

        setMessage({
            type: 'success',
            member: result.member,
            text: `${result.member.name}님`,
            subText: finalMsg,
            details: (
                <div className="attendance-info" style={{
                    marginTop: '30px',
                    padding: '30px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '40px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', opacity: 0.6, marginBottom: '8px' }}>잔여 횟수</div>
                            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary-gold)' }}>
                                {result.member.credits}회
                            </div>
                        </div>
                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />

                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', opacity: 0.6, marginBottom: '8px' }}>잔여 일수</div>
                            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#4CAF50' }}>
                                {(() => {
                                    // [FIX] More robust date handling for "Start on First Attendance" or "Unlimited"
                                    if (!result.member.endDate || result.member.endDate === 'TBD') {
                                        return <span style={{ fontSize: '2rem' }}>확정 전</span>;
                                    }
                                    if (result.member.endDate === 'unlimited') {
                                        return <span style={{ fontSize: '2rem' }}>무제한</span>;
                                    }
                                    const days = getDaysRemaining(result.member.endDate);
                                    if (days === null) return <span style={{ fontSize: '2rem' }}>확정 전</span>;
                                    if (days < 0) return <span style={{ color: '#FF5252' }}>만료</span>;
                                    return `D-${days}`;
                                })()}
                            </div>
                        </div>
                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />

                        {/* Simplified Log for Tablet: Streak or Total only */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', opacity: 0.6, marginBottom: '8px' }}>연속 수련</div>
                            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#FF6B6B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span>🔥</span> {result.member.streak > 1 ? `${result.member.streak}일` : (result.member.attendanceCount || result.attendanceCount || 0) + '회'}
                            </div>
                        </div>
                    </div>
                </div>
            )
        });
        setPin('');
        startDismissTimer(5000); // [ADJUSTED] 5s as requested
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
        // Buffer time to ignore any lingering touch/click events (ghost touches)
        setTimeout(() => {
            setKeypadLocked(false);
        }, 350);
    };

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/member')}&bgcolor=ffffff&color=2c2c2c&margin=10`;

    return (
        <div className="checkin-wrapper" style={{
            position: 'relative',
            width: '100%',
            height: '100dvh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: '#000'
        }}>
            {/* [NETWORK] Offline Warning Banner */}
            {!isOnline && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(90deg, #ff4757, #ff6b81)',
                    color: 'white',
                    padding: '14px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 20px rgba(255, 71, 87, 0.5)'
                }}>
                    ⚠️ 네트워크 연결이 끊겼습니다 - 출석 처리가 불가능합니다
                </div>
            )}
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
                    src={(() => {
                        if (period === 'morning') return bgMorning;
                        if (period === 'afternoon') return bgAfternoon;
                        if (period === 'evening') return bgEvening;
                        return bgNight;
                    })()}
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
                padding: '20px 40px 40px',
                width: '100%',
                margin: '0 auto',
                alignItems: 'stretch',
                overflow: 'hidden'
            }}>
                <div className="checkin-info-section" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
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
                                        <div style={{ opacity: 0.5 }}>요가 수련의 에너지를 연결하고 있습니다...</div>
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
                            전화번호 뒤 4자리를 입력하세요
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
                        <div className="modal-content glass-panel" style={{ width: '95%', maxWidth: '1000px', padding: '40px' }}>
                            <h2 style={{ fontSize: '2.5rem', marginBottom: '30px', textAlign: 'center' }}>회원 선택</h2>
                            <div className="member-grid" style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '25px',
                                marginTop: '20px'
                            }}>
                                {duplicateMembers.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={(e) => {
                                            if (loading) return;
                                            if (e.cancelable) e.preventDefault();
                                            e.stopPropagation();
                                            handleSelectMember(m.id);
                                        }}
                                        className="member-card"
                                        style={{
                                            padding: '30px',
                                            fontSize: '1.8rem',
                                            borderRadius: '24px',
                                            background: 'rgba(255,255,255,0.1)',
                                            color: 'white',
                                            border: '2px solid rgba(255,255,255,0.2)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <span style={{ fontWeight: '800' }}>{m.name}</span>
                                        <span style={{ fontSize: '1.2rem', opacity: 0.8, background: 'rgba(0,0,0,0.3)', padding: '5px 15px', borderRadius: '50px' }}>
                                            {getBranchName(m.homeBranch)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => handleModalClose(() => setShowSelectionModal(false))}
                                style={{
                                    marginTop: '40px',
                                    background: 'transparent',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    color: 'rgba(255,255,255,0.8)',
                                    padding: '15px 40px',
                                    borderRadius: '50px',
                                    fontSize: '1.5rem',
                                    width: '100%'
                                }}
                            >
                                취소
                            </button>
                        </div>
                    </div>
                )
            }

            {/* [FIX] Message Modal as Fixed Overlay for reliable closing */}
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
                                {message.details}
                            </div>
                            <p className="message-dismiss-text" style={{ fontSize: '1.2rem', opacity: 0.7 }}>화면을 터치하면 바로 닫힙니다</p>
                        </div>
                    </div>
                )
            }

            {/* PWA Install Guide for Admin Kiosk */}
            {/* Combined Install Guide with Retry Logic */}
            {
                (showKioskInstallGuide || showInstallGuide) && (
                    <InstallGuideModal
                        onClose={() => handleModalClose(() => {
                            setShowKioskInstallGuide(false);
                            setShowInstallGuide(false);
                        })}
                        onRetry={handleInstallClick}
                    // [New] Auto-close after 5 minutes (300s) if passed as prop, but here handled by wrapper or inside modal.
                    // Since we can't easily change InstallGuideModal props without checking it, let's wrap it here or add a timer effect in CheckInPage that watches this state.
                    />
                )
            }

            {/* Instructor QR Modal */}
            <InstructorQRModal 
                isOpen={showInstructorQR} 
                onClose={() => setShowInstructorQR(false)} 
            />
        </div >
    );
};

// [ADD] Effect to auto-close InstallGuide after 5 minutes
// Since we are inside the component, we can add this useEffect inside CheckInPage
// But CheckInPage is large, let's inject it near other effects or just add a self-closing wrapper?
// Actually, let's just add the useEffect hook in the main component body for simplicity.


export default CheckInPage;
