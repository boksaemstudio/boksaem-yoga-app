import React, { useState, useEffect, useRef } from 'react';
import Keypad from '../components/Keypad';
import { storageService } from '../services/storage';
import { STUDIO_CONFIG, getAllBranches, getBranchName } from '../studioConfig';
import logoWide from '../assets/logo_wide.png';
import { MapPin, Sun, Cloud, CloudRain, Snowflake, Lightning, Moon, CornersOut, CornersIn, Fire, Plant, Leaf, Sparkle, Waves, Boat, Barbell, Plus } from '@phosphor-icons/react';
import { useLanguage } from '../hooks/useLanguage';

import bgMorning from '../assets/bg_morning.png';
import bgAfternoon from '../assets/bg_afternoon.png';
import bgEvening from '../assets/bg_evening.png';
import bgNight from '../assets/bg_night.png';
import InstallGuideModal from '../components/InstallGuideModal';


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
const DigitalClock = React.memo(() => {
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

const TopBar = React.memo(({ weather, currentBranch, branches, handleBranchChange, toggleFullscreen, isFullscreen, language, handleInstallClick }) => {
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
            <div className="top-actions-right" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                    className="install-btn"
                    onClick={handleInstallClick}
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
                        transition: 'all 0.3s ease'
                    }}
                >
                    <DownloadSimple size={24} />
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

const CheckInPage = () => {
    const [pin, setPin] = useState('');
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const timerRef = useRef(null);
    const [currentBranch, setCurrentBranch] = useState(() => storageService.getKioskBranch());
    const [duplicateMembers, setDuplicateMembers] = useState([]);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [weather, setWeather] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [aiExperience, setAiExperience] = useState(null);
    const [showKioskInstallGuide, setShowKioskInstallGuide] = useState(false);
    const [showInstallGuide, setShowInstallGuide] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const { language } = useLanguage();

    // Use a slow timer for background period updates (every 5 minutes)
    const [period, setPeriod] = useState(() => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    });

    const branches = getAllBranches();

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('Kiosk accepted the install prompt');
                }
                setDeferredPrompt(null);
            });
        } else {
            setShowKioskInstallGuide(true);
        }
    };

    const fetchWeather = async () => {
        try {
            const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current_weather=true');
            const data = await res.json();
            const currentWeatherData = data.current_weather;
            setWeather(currentWeatherData);
            // Load AI after weather is ready
            loadAIExperience("방문 회원", null, null, currentWeatherData);
        } catch (err) {
            console.log('Weather fetch failed', err);
            loadAIExperience();
        }
    };

    useEffect(() => {
        fetchWeather();

        // Background / Period Slow Timer
        const periodTimer = setInterval(() => {
            const hour = new Date().getHours();
            let newPeriod = 'night';
            if (hour >= 6 && hour < 12) newPeriod = 'morning';
            else if (hour >= 12 && hour < 17) newPeriod = 'afternoon';
            else if (hour >= 17 && hour < 21) newPeriod = 'evening';
            setPeriod(newPeriod);
        }, 5 * 60 * 1000); // 5 minutes

        // Auto-refresh Weather & AI Standby Message every 20 minutes
        // [PROTECTED LOGIC - DO NOT CHANGE]
        // This keeps the greeting fresh (Time/Weather changes) without heavy loops.
        // Do NOT remove this, and do NOT increase frequency. This is the "Truth".
        const refreshTimer = setInterval(() => {
            console.log("Refreshing Weather & AI context...");
            fetchWeather(); // This triggers loadAIExperience with fresh data
        }, 20 * 60 * 1000);


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

    // Reload AI when language changes
    useEffect(() => {
        console.log(`[CheckInPage] Language changed to: ${language}, reloading AI...`);
        loadAIExperience("방문 회원", null, null, weather);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language]);

    const loadAIExperience = async (memberName = "방문 회원", credits = null, remainingDays = null, currentWeatherData = null) => {
        try {
            const now = new Date();
            const hour = now.getHours();
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            const day = days[now.getDay()];

            // Find upcoming class to inform AI
            const classInfo = await storageService.getCurrentClass(currentBranch);

            const exp = await storageService.getAIExperience(
                memberName,
                0,
                day,
                hour,
                classInfo?.title || null,
                currentWeatherData || weather,
                credits,
                remainingDays,
                language, // Use dynamic language
                null, // diligence is null for standby/visitor
                memberName === "방문 회원" || memberName === "visitor" ? 'visitor' : 'member'
            );

            if (exp) {
                // Aggressively remove 'Namaste' and any trailing variations
                let cleanMsg = "";
                if (exp.message) {
                    cleanMsg = exp.message.replace(/나마스테[.]?\s*🙏?/gi, '');
                    cleanMsg = cleanMsg.replace(/^.*님,\s*/, ''); // Remove "Name," prefix if exists
                    cleanMsg = cleanMsg.trim();
                }

                setAiExperience({
                    ...exp,
                    message: cleanMsg || exp.message // Fallback to original if replace failed or empty
                });
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
        // [OPTIMIZED] Instant reaction for QR guide
        if (e.type === 'touchstart' && e.cancelable) {
            e.preventDefault();
        }
        setShowInstallGuide(true);
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

    const loadWelcomeMessage = async (member, currentBranchId) => {
        try {
            const now = new Date();
            const hour = now.getHours();
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            const day = days[now.getDay()];

            // Get context for the welcome message
            const classInfo = await storageService.getCurrentClass(currentBranchId);
            const daysRemaining = member.endDate ? getDaysRemaining(member.endDate) : null;

            const exp = await storageService.getAIExperience(
                member.name,
                member.attendanceCount || 0,
                day,
                hour,
                classInfo?.title || null,
                null, // weather (not available here yet, passing null)
                member.credits,
                daysRemaining,
                language, // Use selected language instead of hardcoded 'ko'
                member.diligence // Pass diligence object
            );
            return exp?.message;
        } catch (e) {
            console.error("Welcome message load failed", e);
            return null;
        }
    };

    const handleSubmit = async (code) => {
        const pinCode = code || pin;
        if (pinCode.length !== 4) return;

        setLoading(true);
        try {
            // [OPTIMIZED] find member first to start AI generation early
            const members = await storageService.findMembersByPhone(pinCode);

            if (members.length === 0) {
                setMessage({ type: 'error', text: '회원 정보를 찾을 수 없습니다.' });
                setPin('');
                startDismissTimer(2000);
                return;
            }

            if (members.length > 1) {
                setDuplicateMembers(members);
                setShowSelectionModal(true);
                return;
            }

            const member = members[0];

            // [STRATEGY] Run Check-in and AI Message generation in PARALLEL
            const checkInPromise = storageService.checkInById(member.id, currentBranch);

            // Start loading welcome message immediately since we know the member
            const welcomePromise = loadWelcomeMessage(member, currentBranch);

            const result = await checkInPromise;

            if (result.success) {
                // Show success UI immediately with a temporary subtext
                showCheckInSuccess(result, null);

                // Wait for AI message (it might already be done or still loading)
                welcomePromise.then(welcomeMsg => {
                    if (welcomeMsg) {
                        setMessage(prev => (prev && prev.member?.id === result.member.id) ? {
                            ...prev,
                            subText: welcomeMsg.replace(/^.*님,\s*/, '').trim()
                        } : prev);
                    }
                });
            } else {
                setMessage({ type: 'error', text: result.message });
                setPin('');
                startDismissTimer(2000);
            }
        } catch (err) {
            console.error("Check-in error:", err);
            setMessage({ type: 'error', text: '출석 처리 중 오류가 발생했습니다: ' + (err.message || String(err)) });
            setPin('');
            startDismissTimer(2000);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectMember = async (memberId) => {
        setShowSelectionModal(false);
        setLoading(true);
        try {
            const member = duplicateMembers.find(m => m.id === memberId);

            // [STRATEGY] Parallelize for selected member
            const checkInPromise = storageService.checkInById(memberId, currentBranch);
            const welcomePromise = loadWelcomeMessage(member, currentBranch);

            const result = await checkInPromise;

            if (result.success) {
                showCheckInSuccess(result, null);
                welcomePromise.then(welcomeMsg => {
                    if (welcomeMsg) {
                        setMessage(prev => (prev && prev.member?.id === result.member.id) ? {
                            ...prev,
                            subText: welcomeMsg.replace(/^.*님,\s*/, '').trim()
                        } : prev);
                    }
                });
            } else {
                setMessage({ type: 'error', text: result.message });
                setPin('');
                startDismissTimer(2000);
            }
        } catch {
            setMessage({ type: 'error', text: '출석 처리 중 오류가 발생했습니다.' });
            setPin('');
            startDismissTimer(2000);
        } finally {
            setLoading(false);
        }
    };

    const showCheckInSuccess = (result) => {
        // [STRICT TABLET UX] No AI, No Emotion, Just Declaration.
        const staticDeclaration = "오늘의 수련이 시작됩니다.";

        setMessage({
            type: 'success',
            member: result.member,
            text: `${result.member.name}님`,
            subText: staticDeclaration,
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
                                {result.member.endDate ? (getDaysRemaining(result.member.endDate) >= 0 ? `D-${getDaysRemaining(result.member.endDate)}` : '만료') : '-'}
                            </div>
                        </div>
                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />

                        {/* Simplified Log for Tablet: Streak or Total only */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', opacity: 0.6, marginBottom: '8px' }}>연속 수련</div>
                            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#FF6B6B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span>🔥</span> {result.member.streak > 1 ? `${result.member.streak}일` : (result.attendanceCount + '회')}
                            </div>
                        </div>
                    </div>
                </div>
            )
        });
        setPin('');
        startDismissTimer(4500); // [ADJUSTED] 4.5s is the sweet spot (Readability vs Flow)
    };

    const getDaysRemaining = (endDate) => {
        if (!endDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        const diffTime = end - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const startDismissTimer = (duration = 5000) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setMessage(null);
            setPin(''); // [FIX] Ensure PIN is clear when returning to standby
        }, duration);
    };

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/member')}&bgcolor=ffffff&color=2c2c2c&margin=10`;

    return (
        <div className="checkin-wrapper" style={{
            position: 'relative',
            width: '100%',
            height: '100vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: '#000'
        }}>
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
                handleInstallClick={handleInstallClick}
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
                <div className={`checkin-info-section ${message ? 'has-message' : ''}`} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    {!message && (
                        <header className="info-header" style={{ marginBottom: '40px' }}>
                            <div className="logo-container">
                                <img src={logoWide} alt="logo" />
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

                        <div className="message-container">
                            {message ? (
                                <div
                                    className={`message-box ${message.type}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setMessage(null);
                                        setPin('');
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                    }}
                                    onTouchStart={(e) => {
                                        // Prevents "ghost clicks" on elements behind the message
                                        e.stopPropagation();
                                        setMessage(null);
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
                            ) : (
                                <div className="instruction-text">
                                    {aiExperience ? (
                                        <>
                                            <span className="outfit-font" style={{
                                                fontSize: 'clamp(1.8rem, 4.5vh, 2.6rem)',
                                                fontWeight: 700,
                                                display: 'block',
                                                marginBottom: '15px',
                                                color: '#FFFFFF',
                                                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                                                wordBreak: 'keep-all',
                                                lineHeight: 1.2
                                            }}>
                                                {aiExperience.message}
                                            </span>
                                        </>
                                    ) : (
                                        <div style={{ opacity: 0.5 }}>AI가 수련의 에너지를 분석 중입니다...</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {!message && (
                        <div
                            className="qr-box glass-panel"
                            style={{
                                padding: '20px 30px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '25px',
                                alignSelf: 'center',
                                border: '1px solid rgba(255, 215, 0, 0.4)',
                                touchAction: 'none' // Disable double-tap zoom for speed
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
                                marginTop: '-8px' // Moved text up slightly for better alignment
                            }}>
                                <h3 style={{ fontSize: '1.9rem', color: 'var(--primary-gold)', marginBottom: '8px', fontWeight: 900, lineHeight: 1 }}>
                                    나의요가
                                </h3>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <li style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.95)', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.1 }}>
                                        ✓ 잔여횟수 확인
                                    </li>
                                    <li style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.95)', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.1 }}>
                                        ✓ 수업일정 보기
                                    </li>
                                    <li style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.95)', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.1 }}>
                                        ✓ 맞춤알림 받기
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                <div className="checkin-keypad-section glass-panel" style={{ position: 'relative' }}>
                    {pin.length === 0 && !message && (
                        <div className="keypad-floating-instruction">
                            전화번호 뒤 4자리를 입력하세요
                        </div>
                    )}
                    <Keypad
                        onKeyPress={handleKeyPress}
                        onClear={handleClear}
                        onSubmit={handleSubmit}
                        disabled={loading}
                    />
                </div>
            </div>

            {showSelectionModal && (
                <div className="modal-overlay">
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
                            onClick={() => setShowSelectionModal(false)}
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
            )}
            {/* PWA Install Guide for Admin Kiosk */}
            {showKioskInstallGuide && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.92)', // Slightly darker for contrast without blur
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000
                    }}
                    onClick={() => setShowKioskInstallGuide(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'rgba(30, 30, 30, 0.95)',
                            padding: '40px',
                            borderRadius: '30px',
                            maxWidth: '450px',
                            width: '90%',
                            textAlign: 'center',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ fontSize: '1.8rem', color: 'var(--primary-gold)', marginBottom: '20px' }}>키오스크 모드 설치</h3>
                        <p style={{ color: 'white', lineHeight: '1.8', fontSize: '1.1rem', marginBottom: '30px' }}>
                            이 화면을 앱처럼 사용하시려면 <br />
                            <strong>'홈 화면에 추가'</strong>를 선택해 주세요.<br />
                            (관리자 전용)
                        </p>
                        <button
                            className="action-btn primary"
                            style={{ width: '100%', height: '60px', fontSize: '1.2rem', borderRadius: '15px' }}
                            onClick={() => setShowKioskInstallGuide(false)}
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}
            {/* 회원용 설치 안내 모달 복구 */}
            {showInstallGuide && (
                <InstallGuideModal onClose={() => setShowInstallGuide(false)} />
            )}
        </div>
    );
};

export default CheckInPage;
