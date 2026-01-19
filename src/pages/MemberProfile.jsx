import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import {
    User, Calendar, Ticket, CaretRight,
    InstagramLogo, YoutubeLogo,
    SealCheck, BellRinging, BellSlash, House, Megaphone, Article, SignOut,
    DownloadSimple, Export, ChatCircleDots, CloudSun,
    Fire, Plant, Leaf, Sparkle, Waves, Boat, Barbell
} from '@phosphor-icons/react';
import logo from '../assets/logo.png';
import memberBg from '../assets/zen_yoga_bg.png';
import MemberScheduleCalendar from '../components/MemberScheduleCalendar';
// Placeholder images - in a real generalized app, these would come from config/DB too
import timeTable1 from '../assets/timetable_gwangheungchang.png';
import timeTable2 from '../assets/timetable_mapo.png';
import priceTable1 from '../assets/price_table_1.png';
import priceTable2 from '../assets/price_table_2.png';
import { Globe } from '@phosphor-icons/react';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguageContext as useLanguage } from '../context/LanguageContext';
import { STUDIO_CONFIG } from '../studioConfig';
import InteractiveParticles from '../components/InteractiveParticles';

const ENCOURAGING_MESSAGES = [
    "오늘의 수련이 회원님의 지친 몸과 마음을 따뜻하게 안아줄 거예요. 오늘도 즐거운 하루 되세요! ✨",
    "매트 위, 고요한 숨결 속에서 참된 자아(Atman)를 만나는 시간을 가져보세요. ✨",
    "조급해하지 마세요. 지금 이 순간의 호흡만으로도 당신은 이미 충분합니다. 🧘‍♀️",
    "맑은 숨과 고운 마음. 수련의 여정 자체가 당신의 빛나는 증거입니다. ✨",
    "오늘 하루도 수고한 나에게 정성스러운 프라나(Prana)를 선물해주세요. 🌿",
    "느려도 괜찮습니다. 자신만의 리듬으로 깊어지는 수련의 맛을 느껴보세요. 😊",
    "차분한 호흡 끝에 찾아오는 샨티(Shanti, 평화)의 마음을 향유하세요. 🕉️"
];

const safeSessionStorage = {
    getItem: (key) => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn('localStorage access denied:', e);
            return null;
        }
    },
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('localStorage write denied:', e);
        }
    },
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('localStorage remove denied:', e);
        }
    }
};

const MemberProfile = () => {
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('home');
    const { language, t } = useLanguage();

    const [langLabelIndex, setLangLabelIndex] = useState(0);
    const langLabels = ["언어", "Language", "Язык", "语言", "言語"];

    // Added for schedule view
    const [scheduleView, setScheduleView] = useState('calendar');

    useEffect(() => {
        const interval = setInterval(() => {
            setLangLabelIndex((prev) => (prev + 1) % langLabels.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [langLabels.length]);

    // Persist language to member profile when changed
    useEffect(() => {
        if (member && member.id) {
            storageService.updateMember(member.id, { language: language });
        }
    }, [language, member]);

    const [logs, setLogs] = useState([]);
    const [notices, setNotices] = useState([]);
    const [images, setImages] = useState({});
    const [weatherData, setWeatherData] = useState(null); // Changed to object { key, temp }
    const [aiExperience, setAiExperience] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState(null);

    const [pushStatus, setPushStatus] = useState('default');

    // PWA Install State
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);
    const [isInAppBrowser, setIsInAppBrowser] = useState(false);

    // Login States
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');

    const [scheduleBranch, setScheduleBranch] = useState('gwangheungchang'); // Default, will update on auth

    useEffect(() => {
        const storedMember = safeSessionStorage.getItem('member');
        if (storedMember) {
            const m = JSON.parse(storedMember);
            loadMemberData(m.id);
        } else {
            setLoading(false);
        }

        // Check platform and install eligibility
        try {
            const userAgent = window.navigator.userAgent.toLowerCase();
            setIsIOS(/iphone|ipad|ipod/.test(userAgent));

            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator && window.navigator.standalone);
            setIsInStandaloneMode(!!isStandalone);

            // Detect In-App Browsers
            const inApp = /kakaotalk|naver|instagram|line/i.test(userAgent);
            setIsInAppBrowser(inApp);
        } catch (e) {
            console.warn('Agent check failed', e);
        }

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        const unsubscribe = storageService.subscribe(() => {
            setNotices(storageService.getNotices());
            setImages(storageService.getImages());
            if (member) {
                storageService.getMemberById(member.id).then(m => {
                    if (m) setMember(m);
                });
                storageService.getAttendanceByMemberId(member.id).then(h => {
                    setLogs(h);
                });
            }
        });

        if (member) {
            fetchWeather(); // This will call loadAIExperience

            // Initial translation for notices if language is not 'ko'
            if (language !== 'ko' && notices.length > 0) {
                storageService.translateNotices(notices, language).then(translated => {
                    setNotices(translated);
                });
            }
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [member ? member.id : null]);

    const fetchWeather = async () => {
        try {
            const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current_weather=true');
            const data = await res.json();
            const weatherCode = data.current_weather.weathercode;

            // Map code to translation key suffix
            let weatherKey = 'clear';
            if (weatherCode >= 1 && weatherCode <= 3) weatherKey = 'partly_cloudy';
            if (weatherCode > 3) weatherKey = 'cloudy';
            if (weatherCode >= 45 && weatherCode <= 48) weatherKey = 'fog';
            if (weatherCode >= 51 && weatherCode <= 67) weatherKey = 'rain';
            if (weatherCode >= 71 && weatherCode <= 77) weatherKey = 'snow';
            if (weatherCode >= 95) weatherKey = 'thunderstorm';

            // Store raw weather key for AI, but display translated
            const wData = { key: weatherKey, temp: data.current_weather.temperature };
            setWeatherData(wData);

            // For AI, we might want to pass a generic English term or the translated one. 
            // The backend handles localized response, so passing the translated one is fine as long as AI understands it.
            // Or better, pass the raw code/key if possible, but existing generic AI relies on string description.
            // For safety, let's pass a known simple string or the translated one.
            if (member) loadAIExperience(member, language, wData); // Pass language
        } catch (err) {
            console.log('Weather fetch failed', err);
            if (member) {
                const daysLeft = getDaysRemaining(member.endDate);
                loadAIExperience(member, language, null, daysLeft);
            }
        }
    };


    // Reload AI when language changes
    useEffect(() => {
        if (member) {
            setAiExperience(null); // Force loading state
            console.log(`[AI Request] RELOADING AI Experience for language: ${language}`);

            loadAIExperience(member, language, weatherData); // Use current language

            // Also reload analysis
            setAiAnalysis(null);
            const now = new Date();
            storageService.getAIAnalysis(member.name, logs.length, logs, now.getHours(), language, 'member')
                .then(analysis => {
                    // Check if current language hasn't changed during request to prevent racing
                    if (language === storageService._lastAnalysisLang) {
                        console.log('[AI Request] Analysis Loaded Success or Fallback');
                        setAiAnalysis(analysis || { message: t('analysisPending'), isError: true });
                    }
                })
                .catch(err => {
                    console.warn("AI Analysis halted (safe fail):", err);
                    setAiAnalysis({ message: t('analysisPending'), isError: true });
                });

            // Translate notices
            if (notices.length > 0) {
                storageService.translateNotices(notices, language).then(translated => {
                    setNotices(translated);
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language]);


    const loadAIExperience = async (m, targetLang, wData = null, daysLeft = null) => {
        try {
            const now = new Date();
            const hour = now.getHours();
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            const day = dayNames[now.getDay()];

            // Format weather string for AI
            let weatherStr = null;
            if (wData && wData.key) {
                weatherStr = t(`weather_${wData.key}`) + ` (${wData.temp}°C)`;
            }

            // daysLeft가 안 넘어오면 직접 계산
            let actualDaysRemaining = 0;
            try {
                actualDaysRemaining = daysLeft !== null ? daysLeft : (m.endDate ? getDaysRemaining(m.endDate) : 0);
            } catch (e) {
                console.warn("Date calc error", e);
            }

            // 다가오는 수업 정보 추출
            const branchSchedule = STUDIO_CONFIG.DEFAULT_SCHEDULE_TEMPLATE[m.homeBranch || 'gwangheungchang'];
            let upcoming = t('selfPractice');
            if (branchSchedule) {
                const currentTotalMin = hour * 60 + now.getMinutes();
                const next = branchSchedule
                    .filter(s => s.days.includes(day))
                    .map(s => {
                        const [h, min] = s.startTime.split(':').map(Number);
                        return { ...s, totalMin: h * 60 + min };
                    })
                    .filter(s => s.totalMin >= currentTotalMin)
                    .sort((a, b) => a.totalMin - b.totalMin)[0];

                if (next) upcoming = `${next.startTime} - ${next.className} (${next.instructor})`;
            }

            const currentWeather = weatherStr;

            const response = await storageService.getAIExperience(
                m.name,
                logs.length,
                day,
                hour,
                upcoming,
                currentWeather,
                m.credits,
                actualDaysRemaining,
                targetLang // Pass the specific language requested
            );

            // Check if current language matches targetLang to prevent racing
            if (response && language === targetLang) {
                console.log('[AI Request] Experience Loaded Success', response);
                setAiExperience(response);
            }
        } catch (error) {
            console.error("AI Experience Load Failed (Graceful Fallback):", error);
            // Fallback to prevent blank screen
            setAiExperience({
                message: t('welcomeMessageDefault') || "오늘도 평온한 수련 되세요.",
                bgTheme: 'hatha'
            });
        }
    };

    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the A2HS prompt');
            }
            setInstallPrompt(null);
        });
    };

    const loadMemberData = async (memberId) => {
        try {
            const memberData = await storageService.getMemberById(memberId);
            if (memberData) {
                setMember(memberData);
                const history = await storageService.getAttendanceByMemberId(memberId);

                // Gamification: Calculate Streak & Diligence
                const streak = storageService.getMemberStreak(memberId, history);

                // Load Smart Diligence
                let diligence = null;
                try {
                    diligence = await storageService.getMemberDiligence(memberId);
                } catch (e) {
                    console.warn("Failed to load diligence", e);
                }

                setMember(prev => ({ ...prev, streak, diligence }));

                setLogs(history);
                setScheduleBranch(memberData.homeBranch || 'gwangheungchang');

                const noticeData = await storageService.getNotices();
                setNotices(noticeData);
                setImages(storageService.getImages());


                // Load AI Analysis
                const now = new Date();
                const analysis = await storageService.getAIAnalysis(memberData.name, history.length, history, now.getHours(), language || 'ko');
                if (analysis) setAiAnalysis(analysis);

                if ('Notification' in window) {
                    const permission = Notification.permission;
                    const isEnabled = localStorage.getItem('push_enabled');

                    if (permission === 'granted' && isEnabled !== 'false') {
                        setPushStatus('granted');
                    } else if (permission === 'denied') {
                        setPushStatus('denied');
                    } else {
                        setPushStatus('default');
                    }
                }
            } else {
                setError(t('errorMemberNotFound'));
                safeSessionStorage.removeItem('member');
            }
        } catch (error) {
            console.error("Failed to load member data", error);
            setError(t('unknownError'));
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const trimmedName = name.trim();
        const trimmedPhone = phone.trim();

        if (!trimmedName || trimmedPhone.length < 4) {
            setError(t('inputError'));
            return;
        }

        setLoading(true);
        try {
            const result = await storageService.loginMember(trimmedName, trimmedPhone);
            if (result.success) {
                safeSessionStorage.setItem('member', JSON.stringify(result.member));
                loadMemberData(result.member.id);
            } else {
                setError(result.message);
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            setError(t('loginFailed') + ': ' + (err.message || t('unknownError')));
            setLoading(false);
        }
    };

    const handleLogout = () => {
        if (window.confirm(t('logoutConfirm'))) {
            safeSessionStorage.removeItem('member');
            setMember(null);
            setName('');
            setPhone('');
            setError('');
        }
    };

    const getTraditionalYogaMessage = () => {
        const now = new Date();
        const hour = now.getHours();
        const month = now.getMonth() + 1;

        let timeMsg = "";
        if (hour >= 5 && hour < 9) timeMsg = t('trad_dawn');
        else if (hour >= 9 && hour < 12) timeMsg = t('trad_morning');
        else if (hour >= 12 && hour < 17) timeMsg = t('trad_afternoon');
        else if (hour >= 17 && hour < 21) timeMsg = t('trad_evening');
        else timeMsg = t('trad_night');

        let seasonMsg = "";
        if (month >= 3 && month <= 5) seasonMsg = t('season_spring');
        else if (month >= 6 && month <= 8) seasonMsg = t('season_summer');
        else if (month >= 9 && month <= 11) seasonMsg = t('season_autumn');
        else seasonMsg = t('season_winter');

        return timeMsg + seasonMsg;
    };

    const handlePushRequest = async () => {
        const status = await storageService.requestPushPermission(member.id);
        if (status === 'granted') {
            setPushStatus('granted');
            localStorage.setItem('push_enabled', 'true');
            alert(t('pushEnabled'));
        } else if (status === 'denied') {
            setPushStatus('denied');
            alert(t('pushBlocked'));
        }
    };

    const handlePushDisable = async () => {
        if (window.confirm(t('pushDisabledConfirm'))) {
            await storageService.deletePushToken();
            setPushStatus('default');
            localStorage.setItem('push_enabled', 'false');
            alert(t('pushDisabled'));
        }
    };

    const getDaysRemaining = (endDate) => {
        if (!endDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        const diffTime = end - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

    if (!member) {
        return (
            <div style={{
                minHeight: '100vh',
                backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url(${memberBg})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '20px', color: 'white', overflowY: 'auto'
            }}>
                <div style={{ animation: 'slideUp 0.8s ease-out', textAlign: 'center', width: '100%', maxWidth: '360px' }}>
                    <div style={{ marginBottom: '40px' }}>
                        <img src={logo} alt={STUDIO_CONFIG.NAME} style={{ width: '85px', height: 'auto', opacity: 0.9, filter: 'brightness(0) invert(1) drop-shadow(0 0 15px rgba(255, 255, 255, 0.4))', marginBottom: '25px' }} />
                        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '10px', color: 'var(--primary-gold)' }}>{t('loginTitle')}</h2>
                        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', wordBreak: 'keep-all' }}>
                            {t('loginWelcome')}<br />
                            {t('loginSub')}
                        </p>
                    </div>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Language Selector in Login */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                            <LanguageSelector variant="minimal" />
                        </div>

                        <div style={{ textAlign: 'left', marginBottom: '4px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginLeft: '12px' }}>{t('nameLabel')}</label>
                            <input style={{ ...authInputStyle, marginTop: '4px' }} placeholder={t('namePlaceholder')} value={name} onChange={e => setName(e.target.value)} lang="ko" inputMode="text" autoComplete="name" spellCheck="false" autoCorrect="off" />
                        </div>
                        <div style={{ textAlign: 'left', marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginLeft: '12px' }}>{t('phoneLabel')}</label>
                            <input style={{ ...authInputStyle, marginTop: '4px' }} placeholder={t('phonePlaceholder')} value={phone} onChange={e => setPhone(e.target.value)} maxLength={4} type="tel" autoComplete="tel-suffix" />
                        </div>
                        {error && <p style={{ color: 'var(--accent-error)', fontSize: '0.9rem', marginBottom: '10px' }}>{error}</p>}
                        <button type="submit" style={{ ...authButtonStyle, marginTop: '10px' }}>{t('checkRecordBtn')}</button>
                    </form>
                    <p style={{ marginTop: '30px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                        {t('loginFooter')}
                    </p>
                </div>
            </div>
        );
    }



    const daysRemaining = getDaysRemaining(member.endDate);

    return (
        <div className="member-profile-wrapper" style={{
            minHeight: '100vh',
            position: 'relative',
            overflowX: 'hidden',
            overflowY: 'auto',
            background: '#000000' // Pure Black Base
        }}>
            {/* 1. Base Background Layer - Always visible for consistency */}
            <div
                className="profile-bg"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url(${memberBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    zIndex: 1,
                    opacity: 1
                }}
            />

            {/* 2. Overlays (z-index: 3-4) */}
            <div className="bg-aura" style={{ position: 'fixed', zIndex: 3, pointerEvents: 'none' }} />
            {/* InteractiveParticles is handled component-wise if imported */}
            <div className="profile-overlay" style={{ background: 'rgba(0,0,0,0.1)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 4 }} />

            {/* 3. Content Container (z-index: 10 - Must be higher than overlays) */}
            <div className="profile-container" style={{ paddingBottom: '120px', position: 'relative', zIndex: 10 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={logo} alt="Logo" style={{ width: '30px', height: 'auto', filter: 'brightness(0) invert(1)' }} />
                        <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white' }}>{STUDIO_CONFIG.NAME}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div className="pulse-gold" style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.1)',
                            padding: '4px 8px',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <span key={langLabelIndex} style={{
                                fontSize: '0.8rem',
                                color: 'rgba(255,255,255,0.7)',
                                marginRight: '8px',
                                marginLeft: '4px',
                                minWidth: '40px',
                                textAlign: 'right',
                                animation: 'fadeIn 0.5s ease-out'
                            }}>
                                {langLabels[langLabelIndex]}
                            </span>
                            <div style={{ minWidth: '80px' }}>
                                <LanguageSelector variant="minimal" />
                            </div>
                        </div>
                        <button onClick={handleLogout} className="icon-btn" style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '10px', color: 'white', fontSize: '0.85rem' }}>{t('logout')}</button>
                    </div>
                </div>

                {/* Main Tabs Content */}
                <div className="tabs-content" style={{ padding: '0 10px' }}>

                    {/* HOME TAB */}
                    {activeTab === 'home' && (
                        <div className="fade-in">
                            <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px', background: 'rgba(20, 20, 20, 0.9)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                    <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, color: 'white' }}>{member.name} 님</h1>
                                    <span style={{ background: 'var(--primary-gold)', color: 'black', padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold' }}>{t('branch' + (member.homeBranch === 'gwangheungchang' ? 'Gwangheungchang' : 'Mapo'))}</span>
                                    {/* Smart Diligence Badge */}
                                    {member.diligence ? (
                                        <span style={{ background: member.diligence.badge.color, color: 'white', padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {(() => {
                                                const IconMap = { Fire, Plant, Leaf, Sparkle, Waves, Boat, Barbell };
                                                const IconComponent = IconMap[member.diligence.badge.icon] || Sparkle;
                                                return <IconComponent weight="fill" />;
                                            })()}
                                            {member.diligence.badge.label}
                                        </span>
                                    ) : (
                                        member.streak > 1 && (
                                            <span style={{ background: '#FF6B6B', color: 'white', padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                🔥 {member.streak}일 연속
                                            </span>
                                        )
                                    )}
                                    <span style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem' }}>{member.phone}</span>
                                </div>
                                <div style={{ marginBottom: '20px', animation: 'fadeIn 1.2s ease-out', position: 'relative' }}>
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: '-10px',
                                            background: aiExperience?.colorTone || 'rgba(212, 175, 55, 0.1)',
                                            opacity: 0.1,
                                            borderRadius: '15px',
                                            filter: 'blur(10px)'
                                        }}
                                    />
                                    {/* Weather and Greeting */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <CloudSun size={18} weight="duotone" />
                                            {weatherData ? `${t('weather_' + weatherData.key)} (${weatherData.temp}°C)` : (aiExperience ? (aiExperience.weather || '') : '')}
                                        </div>
                                        <h1 style={{ fontSize: '1.4rem', fontWeight: 'bold', lineHeight: '1.4', margin: 0, color: 'white' }}>
                                            {aiExperience ? aiExperience.message : getTraditionalYogaMessage()}
                                        </h1>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px', color: 'white' }}>{t('currentMembership')}</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--primary-gold)' }}>
                                            {t(`class_${member.membershipType}`) !== `class_${member.membershipType}` ? t(`class_${member.membershipType}`) : (member.membershipType || t('class_regular'))} ({member.subject || t('ticket')})
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px', color: 'white' }}>{t('remainingCredits')}</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{member.credits > 200 ? t('unlimited') : `${member.credits}${t('times')}`}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px', color: 'white' }}>{t('expiryDate')}</div>
                                        <div style={{ fontSize: '1rem', color: 'white' }}>
                                            {member.endDate ? new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : (language === 'en' ? 'en-US' : (language === 'ru' ? 'ru-RU' : (language === 'zh' ? 'zh-CN' : 'ja-JP'))), { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(member.endDate)) : t('unlimited')}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px', color: 'white' }}>{t('daysLeft')}</div>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'white' }}>{member.endDate ? (daysRemaining >= 0 ? `D-${daysRemaining}` : t('expired')) : '-'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Attendance Summary */}
                            {logs.length > 0 && (
                                <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', background: 'rgba(24, 24, 27, 0.9)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-gold)', margin: 0 }}>{t('recentAttendance')}</h3>
                                        <button onClick={() => setActiveTab('history')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{t('viewAll')} {'>'}</button>
                                    </div>
                                    <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--primary-gold)' }}>
                                                {new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : (language === 'en' ? 'en-US' : (language === 'ru' ? 'ru-RU' : (language === 'zh' ? 'zh-CN' : 'ja-JP'))), { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(logs[0].timestamp))}
                                            </div>
                                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white' }}>{logs[0].className ? (t(`class_${logs[0].className}`) !== `class_${logs[0].className}` ? t(`class_${logs[0].className}`) : logs[0].className) : t('selfPractice')} {logs[0].instructor && `(${logs[0].instructor})`}</div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'white', opacity: 0.7 }}>{t('sessionOrder', { n: logs.length })}</div>
                                    </div>
                                </div>
                            )}



                            {/* Settings */}
                            <div className="glass-panel" style={{ padding: '20px', background: 'rgba(20, 20, 20, 0.8)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <BellRinging size={20} color="var(--primary-gold)" />
                                        <span style={{ color: 'white', fontWeight: 500 }}>{t('notificationSetting')}</span>
                                    </div>
                                    {pushStatus === 'granted' ?
                                        <button onClick={handlePushDisable} style={{ background: '#10B981', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', border: 'none' }}>ON</button> :
                                        <button onClick={handlePushRequest} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', border: 'none' }}>OFF</button>
                                    }
                                </div>
                            </div>

                            {/* PWA Install Prompt */}
                            {!isInStandaloneMode && !isInAppBrowser && (
                                <div className="glass-panel" style={{
                                    padding: '24px',
                                    marginTop: '25px',
                                    background: 'linear-gradient(135deg, #1a1a1c, #0d0d0f)',
                                    border: '1px solid var(--primary-gold)',
                                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'var(--primary-gold)', opacity: 0.05, borderRadius: '50%' }} />

                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                                        <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                            <DownloadSimple size={32} color="var(--primary-gold)" weight="bold" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: '0 0 6px 0', color: 'var(--primary-gold)', fontSize: '1.2rem', fontWeight: '800' }}>
                                                {t('installApp')}
                                            </h4>
                                            <p style={{ margin: '0 0 16px 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                                {isIOS
                                                    ? t('installDescIOS')
                                                    : t('installDescAndroid')
                                                }
                                            </p>

                                            {isIOS ? (
                                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.2)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>
                                                        <span style={{ background: 'var(--primary-gold)', color: 'black', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>1</span>
                                                        하단 <Export size={20} weight="bold" style={{ color: '#007AFF' }} /> 공유 버튼 클릭
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>
                                                        <span style={{ background: 'var(--primary-gold)', color: 'black', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>2</span>
                                                        '홈 화면에 추가' 선택
                                                    </div>
                                                </div>
                                            ) : (
                                                installPrompt ? (
                                                    <button
                                                        onClick={handleInstallClick}
                                                        style={{
                                                            background: 'var(--primary-gold)',
                                                            color: 'black',
                                                            border: 'none',
                                                            padding: '12px 24px',
                                                            borderRadius: '12px',
                                                            fontWeight: '800',
                                                            fontSize: '1rem',
                                                            cursor: 'pointer',
                                                            width: '100%',
                                                            boxShadow: '0 5px 15px rgba(212, 175, 55, 0.3)'
                                                        }}
                                                    >
                                                        {t('installBtn')}
                                                    </button>
                                                ) : (
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--primary-gold)', opacity: 0.8, background: 'rgba(212, 175, 55, 0.05)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                                                        {t('appInstallGuide')}
                                                    </p>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* In-App Browser Warning */}
                            {isInAppBrowser && (
                                <div className="glass-panel" style={{
                                    padding: '16px',
                                    marginTop: '20px',
                                    background: 'rgba(255, 165, 2, 0.1)',
                                    border: '1px solid rgba(255, 165, 2, 0.3)'
                                }}>
                                    <p style={{ margin: 0, color: '#ffa502', fontSize: '0.85rem', lineHeight: '1.5' }}>
                                        {t('inAppBrowserWarning')}
                                    </p>
                                </div>
                            )}

                            {/* Social Buttons */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '20px' }}>
                                <a href={STUDIO_CONFIG.SOCIAL.Gwangheungchang_Instagram} target="_blank" rel="noreferrer" style={socialBtnStyle}><InstagramLogo size={24} color="#E1306C" /><span>{t('branchGwangheungchang')}</span></a>
                                <a href={STUDIO_CONFIG.SOCIAL.Mapo_Instagram} target="_blank" rel="noreferrer" style={socialBtnStyle}><InstagramLogo size={24} color="#E1306C" /><span>{t('branchMapo')}</span></a>
                                <a href={STUDIO_CONFIG.SOCIAL.Youtube} target="_blank" rel="noreferrer" style={socialBtnStyle}><YoutubeLogo size={24} color="#FF0000" /><span>Youtube</span></a>
                                <a href={STUDIO_CONFIG.SOCIAL.Blog} target="_blank" rel="noreferrer" style={socialBtnStyle}><Article size={24} color="#03C75A" /><span>Blog</span></a>
                            </div>
                        </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeTab === 'history' && (
                        <div className="fade-in">
                            {/* Statistics Panel */}
                            <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', background: 'rgba(20, 20, 20, 0.9)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: 'var(--primary-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Article size={20} /> {t('myAnalysis')}
                                </h3>
                                <div style={{
                                    marginBottom: '15px',
                                    padding: '12px 16px',
                                    background: 'rgba(212, 175, 55, 0.1)',
                                    borderRadius: '10px',
                                    borderLeft: '3px solid var(--primary-gold)',
                                }}>
                                    <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.5', color: 'var(--primary-gold)', fontWeight: '700', wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }}>
                                        {aiAnalysis ? aiAnalysis.message.replace(/\*\*/g, '') : t('analysisPending')}
                                    </p>
                                </div>
                                {logs.length === 0 && (
                                    <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>{t('notEnoughData')}</p>
                                )}
                            </div>

                            {/* Logs List */}
                            <div className="glass-panel" style={{ padding: '20px', background: 'rgba(24, 24, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-gold)', margin: 0 }}>{t('historyTitle')}</h3>
                                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{t('totalSessions', { n: logs.length })}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {logs.map((log, idx) => {
                                        const date = new Date(log.timestamp);
                                        return (
                                            <div key={log.id} style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--primary-gold)' }}>
                                                        {new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : (language === 'en' ? 'en-US' : (language === 'ru' ? 'ru-RU' : (language === 'zh' ? 'zh-CN' : 'ja-JP'))), { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)} {date.toLocaleTimeString(language === 'ko' ? 'ko-KR' : (language === 'en' ? 'en-US' : (language === 'ru' ? 'ru-RU' : (language === 'zh' ? 'zh-CN' : 'ja-JP'))), { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white' }}>
                                                        {log.className ? (t(`class_${log.className}`) !== `class_${log.className}` ? t(`class_${log.className}`) : log.className) : t('selfPractice')}
                                                        {log.instructor && `(${log.instructor})`}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', opacity: 0.4, color: 'white' }}>
                                                        {log.branchId === 'gwangheungchang' ? t('branchGwangheungchang') : (log.branchId === 'mapo' ? t('branchMapo') : log.branchId)} |
                                                        {member.membershipType ? (t(`class_${member.membershipType}`) !== `class_${member.membershipType}` ? t(`class_${member.membershipType}`) : member.membershipType) : t('class_regular')}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--primary-gold)', border: '1px solid currentColor', padding: '2px 8px', borderRadius: '10px' }}>{t('sessionOrder', { n: logs.length - idx })}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SCHEDULE TAB */}
                    {activeTab === 'schedule' && (
                        <div className="fade-in">
                            <div className="glass-panel" style={{ padding: '24px', background: 'rgba(15, 15, 15, 0.9)', minHeight: '400px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                                <div style={{ marginBottom: '25px', textAlign: 'left' }}>
                                    <h2 style={{ fontSize: '1.5rem', color: 'white', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>{t('scheduleTitle')}</h2>
                                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--primary-gold)', opacity: 0.9, lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                        {t('scheduleSub')}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px', display: 'flex', gap: '4px' }}>
                                        <button onClick={() => setScheduleView('calendar')} style={{ ...viewToggleStyle, background: scheduleView === 'calendar' ? 'white' : 'transparent', color: scheduleView === 'calendar' ? 'black' : 'white', borderRadius: '8px' }}>{t('viewCalendar')}</button>
                                        <button onClick={() => setScheduleView('image')} style={{ ...viewToggleStyle, background: scheduleView === 'image' ? 'white' : 'transparent', color: scheduleView === 'image' ? 'black' : 'white', borderRadius: '8px' }}>{t('viewWeekly')}</button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                                    {STUDIO_CONFIG.BRANCHES.map(b => (
                                        <button
                                            key={b.id}
                                            onClick={() => setScheduleBranch(b.id)}
                                            style={{
                                                flex: 1,
                                                padding: '12px',
                                                borderRadius: '12px',
                                                fontWeight: 'bold',
                                                border: scheduleBranch === b.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                                background: scheduleBranch === b.id ? 'var(--primary-gold)' : 'rgba(255,255,255,0.03)',
                                                color: scheduleBranch === b.id ? 'black' : 'rgba(255,255,255,0.6)',
                                                fontSize: '0.9rem',
                                                transition: 'all 0.3s ease',
                                                boxShadow: scheduleBranch === b.id ? '0 4px 15px rgba(212, 175, 55, 0.3)' : 'none'
                                            }}
                                        >
                                            {t('branch' + (b.id === 'gwangheungchang' ? 'Gwangheungchang' : 'Mapo'))}
                                        </button>
                                    ))}
                                </div>
                                {scheduleView === 'calendar' ? (
                                    <MemberScheduleCalendar branchId={scheduleBranch || 'gwangheungchang'} attendanceLogs={logs} />
                                ) : (
                                    <div style={{ position: 'relative', width: '100%', borderRadius: '10px', overflow: 'hidden' }}>
                                        <img
                                            src={scheduleBranch === 'gwangheungchang' ? (images.timetable_gwangheungchang || timeTable1) : (images.timetable_mapo || timeTable2)}
                                            style={{ width: '100%', display: 'block' }}
                                            alt="timetable"
                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                        />
                                        <div style={{ display: 'none', height: '200px', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px' }}>{t('noTimetableImage')}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* PRICES TAB */}
                    {activeTab === 'prices' && (
                        <div className="fade-in">
                            <img src={images.price_table_1 || priceTable1} style={{ width: '100%', borderRadius: '15px', marginBottom: '15px' }} alt="price" />
                            <img src={images.price_table_2 || priceTable2} style={{ width: '100%', borderRadius: '15px' }} alt="price" />
                        </div>
                    )}

                    {/* NOTICES TAB */}
                    {activeTab === 'notices' && (
                        <div className="fade-in">
                            <div style={{ padding: '0 5px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                                    <Megaphone size={28} color="var(--primary-gold)" weight="fill" />
                                    <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'white', margin: 0 }}>{t('noticesTitle')}</h2>
                                </div>
                                {notices.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                        {notices.map((notice, idx) => (
                                            <div key={notice.id || idx} className="glass-panel" style={{
                                                padding: 0,
                                                background: 'rgba(24, 24, 27, 0.7)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '24px',
                                                overflow: 'hidden',
                                                boxShadow: '0 15px 35px rgba(0,0,0,0.3)'
                                            }}>
                                                {(notice.image || notice.imageUrl) ? (
                                                    <div>
                                                        {/* Header (Title & Date) - Now above image */}
                                                        <div style={{ padding: '24px 24px 15px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>
                                                                <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--primary-gold)', margin: 0, lineHeight: '1.3', wordBreak: 'keep-all' }}>
                                                                    {notice.title}
                                                                </h3>
                                                                <span style={{
                                                                    fontSize: '0.7rem',
                                                                    color: 'rgba(255,255,255,0.7)',
                                                                    whiteSpace: 'nowrap',
                                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                                    padding: '4px 12px',
                                                                    borderRadius: '20px',
                                                                    fontWeight: '600',
                                                                    border: '1px solid rgba(255,255,255,0.05)'
                                                                }}>
                                                                    {notice.date || (notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : '최근')}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Image - Now below title */}
                                                        <div style={{ width: '100%', overflow: 'hidden' }}>
                                                            <img
                                                                src={notice.image || notice.imageUrl}
                                                                alt="notice"
                                                                style={{ width: '100%', height: 'auto', display: 'block', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ padding: '24px 24px 10px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '10px' }}>
                                                            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary-gold)', margin: 0, lineHeight: '1.4', wordBreak: 'keep-all' }}>
                                                                {notice.title}
                                                            </h3>
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                color: 'rgba(255,255,255,0.5)',
                                                                whiteSpace: 'nowrap',
                                                                background: 'rgba(212, 175, 55, 0.15)',
                                                                padding: '4px 12px',
                                                                borderRadius: '20px',
                                                                fontWeight: '600'
                                                            }}>
                                                                {notice.date || (notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : '최근')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div style={{ padding: '20px 24px 30px' }}>
                                                    <p style={{
                                                        margin: 0,
                                                        fontSize: '1.05rem',
                                                        color: 'rgba(255,255,255,0.9)',
                                                        lineHeight: '1.8',
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-all'
                                                    }}>
                                                        {notice.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                        <Megaphone size={40} style={{ opacity: 0.2, marginBottom: '15px' }} />
                                        <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, textAlign: 'center' }}>{t('noNewNotices')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div >

            {/* Bottom Navigation */}
            < div style={{
                position: 'fixed',
                bottom: '20px',
                left: '20px',
                right: '20px',
                height: '75px',
                background: 'rgba(20, 20, 23, 0.85)',
                backdropFilter: 'blur(15px)',
                borderRadius: '25px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '0 15px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
                zIndex: 1000,
                transition: 'all 0.3s ease'
            }}>

                <NavItem active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<House size={26} />} label={t('tabHome')} />
                <NavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<Article size={26} />} label={t('tabHistory')} />
                <NavItem active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} icon={<Calendar size={26} />} label={t('tabSchedule')} />
                <NavItem active={activeTab === 'prices'} onClick={() => setActiveTab('prices')} icon={<Ticket size={26} />} label={t('tabPrices')} />
                <NavItem active={activeTab === 'notices'} onClick={() => setActiveTab('notices')} icon={<Megaphone size={26} />} label={t('tabNotices')} />
            </div >
        </div >
    );
};

const NavItem = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} style={{
        background: 'none',
        border: 'none',
        color: active ? 'var(--primary-gold)' : 'rgba(255,255,255,0.4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '8px',
        borderRadius: '16px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: active ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
    }}>
        {React.cloneElement(icon, {
            weight: active ? 'fill' : 'regular',
            style: { filter: active ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.5))' : 'none' }
        })}
        <span style={{ fontSize: '0.65rem', fontWeight: active ? '800' : '600' }}>{label}</span>
    </button>
);

const authInputStyle = { width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(18,18,18,0.6)', color: 'white', fontSize: '1.1rem', textAlign: 'center', outline: 'none' };
const authButtonStyle = { width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: 'var(--primary-gold)', color: 'black', fontSize: '1rem', fontWeight: 'bold' };
const viewToggleStyle = { border: 'none', padding: '5px 15px', borderRadius: '18px', fontSize: '0.8rem', cursor: 'pointer' };
const socialBtnStyle = { background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '12px 5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textDecoration: 'none', color: 'white', fontSize: '0.7rem' };

export default MemberProfile;
