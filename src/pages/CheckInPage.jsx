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

const TopBar = React.memo(({ currentTime, weather, currentBranch, branches, handleBranchChange, toggleFullscreen, isFullscreen, language, handleInstallClick }) => {
    const locale = language === 'ko' ? 'ko-KR' : (language === 'en' ? 'en-US' : (language === 'ru' ? 'ru-RU' : (language === 'zh' ? 'zh-CN' : 'ja-JP')));
    return (
        <div className="checkin-top-bar" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 30px',
            zIndex: 10,
            position: 'relative'
        }}>
            <div className="branch-selector">
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

            <div className="top-info-center glass-panel-sm" style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '8px 20px',
                borderRadius: '50px',
                background: 'rgba(255, 255, 255, 0.1)', // Simplified from glass
                border: '1px solid rgba(255, 215, 0, 0.3)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap',
                width: 'fit-content',
                flexShrink: 0
            }}>
                <div className="top-clock outfit-font" style={{
                    fontSize: '2.2rem',
                    fontWeight: 700,
                    color: 'var(--primary-gold)',
                    letterSpacing: '2px',
                    fontVariantNumeric: 'tabular-nums',
                    textShadow: '0 0 15px rgba(255, 215, 0, 0.4)',
                    lineHeight: 1
                }}>
                    {currentTime.toLocaleTimeString(locale, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>

                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />

                {weather && (
                    <>
                        <div className="top-weather" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {getWeatherIcon(weather.weathercode, currentTime.getHours() >= 18 || currentTime.getHours() < 6)}
                            <span className="weather-temp" style={{ fontSize: '1.4rem', fontWeight: 600, color: 'rgba(255,255,255,0.95)', lineHeight: 1 }}>
                                {weather.temperature}°C
                            </span>
                        </div>

                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />

                        <span className="weather-date" style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, letterSpacing: '0.5px', lineHeight: 1 }}>
                            {currentTime.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                        </span>
                    </>
                )}
            </div>

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
                    transition: 'all 0.2s ease'
                }}
            >
                {isFullscreen ? <CornersIn size={24} /> : <CornersOut size={24} />}
            </button>

            <button
                className="install-pwa-btn"
                onClick={handleInstallClick}
                style={{
                    background: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid rgba(212, 215, 0, 0.3)',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--primary-gold)',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 0 10px rgba(212, 175, 55, 0.2)'
                }}
                title="홈 화면에 추가"
            >
                <Plus size={24} weight="bold" />
            </button>
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
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showInstallGuide, setShowInstallGuide] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const { language } = useLanguage();

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
            setShowInstallGuide(true);
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

        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        // Auto-refresh AI standby message every 10 minutes
        const aiRefreshTimer = setInterval(() => {
            console.log("Refreshing AI standby message...");
            loadAIExperience("방문 회원", null, null, weather);
        }, 10 * 60 * 1000);

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
            clearInterval(timer);
            clearInterval(aiRefreshTimer);
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
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) {
                // Minimal delay (30ms) to ensure 4th digit is visible, then submit
                setTimeout(() => {
                    handleSubmit(newPin);
                }, 30);
            }
        }
    };

    const handleClear = () => {
        setPin('');
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
            const result = await storageService.checkIn(pinCode, currentBranch);

            if (result.success) {
                if (result.needsSelection) {
                    setDuplicateMembers(result.members);
                    setShowSelectionModal(true);
                } else {
                    // Fetch personalized WELCOME message
                    // We use the same getAIExperience but logic on server side should ideally handle 'welcome' nuances based on inputs
                    // Since we can't change server easily right now, we rely on the prompt context we pass (credits, etc)
                    const welcomeMsg = await loadWelcomeMessage(result.member, currentBranch);
                    showCheckInSuccess(result, welcomeMsg);
                }
            } else {
                setMessage({ type: 'error', text: result.message });
                startDismissTimer(2000); // Short duration for errors
            }
        } catch {
            setMessage({ type: 'error', text: '출석 처리 중 오류가 발생했습니다.' });
            startDismissTimer(2000); // Short duration for errors
        } finally {
            setLoading(false);
        }
    };

    const handleSelectMember = async (memberId) => {
        setShowSelectionModal(false);
        setLoading(true);
        try {
            const result = await storageService.checkInById(memberId, currentBranch);
            if (result.success) {
                const welcomeMsg = await loadWelcomeMessage(result.member, currentBranch);
                showCheckInSuccess(result, welcomeMsg);
            } else {
                setMessage({ type: 'error', text: result.message });
                startDismissTimer(2000); // Short duration for errors
            }
        } catch {
            setMessage({ type: 'error', text: '출석 처리 중 오류가 발생했습니다.' });
            startDismissTimer(2000); // Short duration for errors
        } finally {
            setLoading(false);
        }
    };

    const showCheckInSuccess = (result, customAiMsg = null) => {
        // Use the freshly fetched custom message, or fall back to standby, or generic
        const aiMsg = customAiMsg || aiExperience?.message || `${result.member.name}님 환영합니다!`;
        const cleanMsg = aiMsg.replace(/^.*님,\s*/, '').trim(); // Clean it up just in case

        setMessage({
            type: 'success',
            text: `${result.member.name}님 환영합니다!`,
            subText: cleanMsg,
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

                        {/* Gamification: Smart Diligence Display */}
                        {result.member.diligence ? (
                            <div style={{ textAlign: 'center', animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                                <div style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: '8px', color: result.member.diligence.badge.color }}>
                                    {result.member.diligence.badge.label}
                                </div>
                                <div style={{
                                    fontSize: '3rem',
                                    fontWeight: 800,
                                    color: result.member.diligence.badge.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    textShadow: `0 0 20px ${result.member.diligence.badge.color}40`
                                }}>
                                    <span style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.3))' }}>
                                        {result.member.diligence.badge.icon}
                                    </span>
                                </div>
                                <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', marginTop: '5px' }}>
                                    {result.member.diligence.message}
                                </div>
                            </div>
                        ) : (
                            /* Fallback to Streak if Diligence fails */
                            result.member.streak > 1 ? (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.2rem', opacity: 0.6, marginBottom: '8px' }}>연속 수련</div>
                                    <div style={{ fontSize: '3rem', fontWeight: 800, color: '#FF6B6B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span>🔥</span> {result.member.streak}일
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.2rem', opacity: 0.6, marginBottom: '8px' }}>누적 출석</div>
                                    <div style={{ fontSize: '3rem', fontWeight: 800, color: 'white' }}>
                                        {result.attendanceCount}회
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
            )
        });
        setPin('');
        startDismissTimer(8000); // Long duration for reading success message
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
                        const hour = new Date().getHours();
                        if (hour >= 5 && hour < 12) return bgMorning;
                        if (hour >= 12 && hour < 17) return bgAfternoon;
                        if (hour >= 17 && hour < 21) return bgEvening;
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
                    background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%), rgba(0,0,0,0.2)'
                }} />
            </div>

            {/* Top Bar - Optimized with Memoization */}
            <TopBar
                currentTime={currentTime}
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
                        {!message && (
                            <div className="pin-display scanline-container">
                                {pin.padEnd(4, '•').split('').map((c, i) => (
                                    <span key={i} className={i < pin.length ? 'pin-active' : 'pin-inactive'}>{c}</span>
                                ))}
                            </div>
                        )}

                        <div className="message-container">
                            {message ? (
                                <div
                                    className={`message-box ${message.type}`}
                                    onClick={() => {
                                        setMessage(null);
                                        setPin('');
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                    }}
                                    onTouchStart={(e) => {
                                        // Prevents "ghost clicks" on elements behind the message
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setMessage(null);
                                        setPin('');
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                    }}
                                >
                                    <div className="message-content">
                                        <div className="message-text" style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '20px' }}>{message.text}</div>
                                        {message.subText && <div className="message-subtext" style={{ fontSize: '1.8rem', opacity: 1, marginBottom: '20px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{message.subText}</div>}
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
                                border: '1px solid rgba(255, 215, 0, 0.4)'
                            }}
                            onClick={() => setShowInstallGuide(true)}
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
                                <h3 style={{ fontSize: '2.2rem', color: 'var(--primary-gold)', marginBottom: '12px', fontWeight: 900, lineHeight: 1 }}>
                                    복샘요가
                                </h3>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li style={{ fontSize: '1.3rem', color: 'rgba(255, 255, 255, 0.95)', display: 'flex', alignItems: 'center', gap: '10px', lineHeight: 1.1 }}>
                                        ✓ 잔여횟수 확인
                                    </li>
                                    <li style={{ fontSize: '1.3rem', color: 'rgba(255, 255, 255, 0.95)', display: 'flex', alignItems: 'center', gap: '10px', lineHeight: 1.1 }}>
                                        ✓ 수업일정 보기
                                    </li>
                                    <li style={{ fontSize: '1.3rem', color: 'rgba(255, 255, 255, 0.95)', display: 'flex', alignItems: 'center', gap: '10px', lineHeight: 1.1 }}>
                                        ✓ 맞춤알림 받기
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                <div className="checkin-keypad-section glass-panel ai-glow" style={{ position: 'relative' }}>
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
                                    onClick={() => handleSelectMember(m.id)}
                                    className="member-card"
                                    style={{
                                        padding: '40px',
                                        fontSize: '2rem',
                                        borderRadius: '24px',
                                        background: 'rgba(255,255,255,0.1)',
                                        color: 'white',
                                        border: '2px solid rgba(255,255,255,0.2)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '15px',
                                        transition: 'all 0.1s',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span style={{ fontWeight: '800' }}>{m.name}</span>
                                    <span style={{ fontSize: '1.4rem', opacity: 0.8, background: 'rgba(0,0,0,0.3)', padding: '5px 15px', borderRadius: '50px' }}>
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
            {/* PWA Install Guide for Check-in (Kiosk/Tablet) */}
            {showInstallGuide && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        backdropFilter: 'blur(10px)'
                    }}
                    onClick={() => setShowInstallGuide(false)}
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
                        <h3 style={{ fontSize: '1.8rem', color: 'var(--primary-gold)', marginBottom: '20px' }}>홈 화면에 추가하기</h3>
                        <p style={{ color: 'white', lineHeight: '1.8', fontSize: '1.1rem', marginBottom: '30px' }}>
                            출석 체크 페이지를 앱처럼 사용하시려면 <br />
                            브라우저 메뉴에서 <strong>'홈 화면에 추가'</strong>를 <br />
                            선택해 주세요. <br /><br />
                            <small style={{ color: 'rgba(255,255,255,0.6)' }}>
                                * 아이패드(iOS)는 상단 <strong>'공유'</strong> 버튼 클릭 후 <br />
                                <strong>'홈 화면에 추가'</strong>를 누르시면 됩니다.
                            </small>
                        </p>
                        <button
                            className="action-btn primary"
                            style={{ width: '100%', height: '60px', fontSize: '1.2rem', borderRadius: '15px' }}
                            onClick={() => setShowInstallGuide(false)}
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckInPage;
