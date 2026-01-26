import React, { useState, useEffect, cloneElement } from 'react';
import { onSnapshot, doc, collection, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '../firebase';
import { storageService } from '../services/storage';
import { Icons } from '../components/CommonIcons';
import { Megaphone } from '@phosphor-icons/react';
import logo from '../assets/logo.png';
import memberBg from '../assets/zen_yoga_bg.png';
import MemberScheduleCalendar from '../components/MemberScheduleCalendar';
import timeTable1 from '../assets/timetable_gwangheungchang.png';
import timeTable2 from '../assets/timetable_mapo.png';
import priceTable1 from '../assets/price_table_1.png';
import priceTable2 from '../assets/price_table_2.png';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguageContext as useLanguage } from '../context/LanguageContext';
import { STUDIO_CONFIG } from '../studioConfig';
import InteractiveParticles from '../components/InteractiveParticles';

// Specialized Sub-Components
import ProfileHeader from '../components/profile/ProfileHeader';
import AISection from '../components/profile/AISection';
import MembershipInfo from '../components/profile/MembershipInfo';
import HomeYogaSection from '../components/profile/HomeYogaSection';
import PWAInstallPrompts from '../components/profile/PWAInstallPrompts';
import SocialLinks from '../components/profile/SocialLinks';
import AttendanceHistory from '../components/profile/AttendanceHistory';
import RecentAttendance from '../components/profile/RecentAttendance';
import ProfileTabs from '../components/profile/ProfileTabs';
import { profileStyles } from '../components/profile/profileStyles';

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
const getDaysRemaining = (endDate) => {
    if (!endDate || endDate === 'TBD' || endDate === 'unlimited') return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return 0;
    end.setHours(0, 0, 0, 0);
    const diff = end - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Unused helper functions removed


const MemberProfile = () => {
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('home');
    const { language, t } = useLanguage();

    const [langLabelIndex, setLangLabelIndex] = useState(0);
    const langLabels = ["언어", "Language", "Язык", "语言", "言語"];

    // Added for schedule view
    const [scheduleView, setScheduleView] = useState('calendar');
    const [scheduleMonth, setScheduleMonth] = useState('current'); // 'current' or 'next'

    useEffect(() => {
        const interval = setInterval(() => {
            setLangLabelIndex((prev) => (prev + 1) % langLabels.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [langLabels.length]);

    // [OPTIMIZED] Persist language preference ONLY when it actually changes
    useEffect(() => {
        if (member && member.id && member.language !== language) {
            console.log(`[Language] Updating member preference to: ${language}`);
            storageService.updateMember(member.id, { language: language });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language, member?.id, member?.language]);

    const [logs, setLogs] = useState([]);
    const [logLimit, setLogLimit] = useState(10);
    const [notices, setNotices] = useState([]);
    const [images, setImages] = useState({});
    const [weatherData, setWeatherData] = useState(null); // Changed to object { key, temp }
    const [aiExperience, setAiExperience] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState(null);

    const [pushStatus, setPushStatus] = useState(() => {
        if (typeof Notification === 'undefined') return 'default';
        if (Notification.permission === 'denied') return 'denied';
        if (Notification.permission === 'granted') return 'granted';
        return 'default';
    });

    // PWA Install State
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isIOS] = useState(() => {
        if (typeof window === 'undefined') return false;
        return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    });
    const [isInStandaloneMode] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator && window.navigator.standalone);
    });
    const [isInAppBrowser] = useState(() => {
        if (typeof window === 'undefined') return false;
        return /kakaotalk|naver|instagram|line/i.test(window.navigator.userAgent.toLowerCase());
    });

    // Login States
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');

    const [scheduleBranch, setScheduleBranch] = useState('gwangheungchang'); // Default, will update on auth

    const [greetingVisible, setGreetingVisible] = useState(true);

    // Destructure styles
    const { authInput: authInputStyle, authButton: authButtonStyle, viewToggle: viewToggleStyle } = profileStyles;

    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then(() => {
            setInstallPrompt(null);
        });
    };

    const loadMemberData = async (memberId) => {
        try {
            setLoading(true);

            // [PERFORMANCE] Parallel Data Loading
            const [memberData, history, noticeData, imagesData] = await Promise.all([
                storageService.getMemberById(memberId),
                storageService.getAttendanceByMemberId(memberId),
                storageService.loadNotices(),
                storageService.getImages()
            ]);

            if (memberData) {
                setMember(memberData);
                setLogs(history || []);
                setNotices(noticeData || []);
                setImages(imagesData || {});

                setScheduleBranch(memberData.homeBranch || 'gwangheungchang');
                fetchWeather();

                if (!weatherData) {
                    loadAIExperience(memberData, history);
                }

                const now = new Date();
                storageService.getAIAnalysis(memberData.name, history.length, history, now.getHours(), language, 'member')
                    .then(analysis => setAiAnalysis(analysis))
                    .catch(() => setAiAnalysis({ message: t('analysisPending'), isError: true }));

                // [Fix] Push Token Self-Healing: If permission already granted, re-sync with server
                // This recovers badges even if the fcm_tokens collection was wiped.
                if (Notification.permission === 'granted' || localStorage.getItem('push_enabled') === 'true') {
                    console.log("[Push Check] Syncing lost tokens for current device...");
                    storageService.requestPushPermission(memberId).catch(err => console.warn(err));
                    setPushStatus('granted');
                }
            } else {
                setError(t('errorMemberNotFound') || "회원 정보를 찾을 수 없습니다.");
                safeSessionStorage.removeItem('member');
            }
        } catch (e) {
            console.error("Load member failed:", e);
            setError(t('unknownError') || "알 수 없는 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // [REAL-TIME] Real-time Listener for Member and Attendance
    useEffect(() => {
        const savedMember = safeSessionStorage.getItem('member');
        if (!savedMember) return;
        const memberId = JSON.parse(savedMember).id;
        // v1.0.5 - Clean and verified


        const unsubMember = onSnapshot(doc(db, 'members', memberId), (snap) => {
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() };
                console.log("[MemberProfile] Real-time member update received");
                setMember(data);
                safeSessionStorage.setItem('member', JSON.stringify(data));
            }
        });

        const q = query(
            collection(db, 'attendance'),
            where('memberId', '==', memberId),
            orderBy('timestamp', 'desc'),
            firestoreLimit(logLimit)
        );
        const unsubAttendance = onSnapshot(q, (snap) => {
            const history = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log(`[MemberProfile] Real-time attendance update: ${history.length} records`);
            setLogs(history);
        });

        return () => {
            if (unsubMember) unsubMember();
            if (unsubAttendance) unsubAttendance();
        };
    }, [logLimit]);

    const loadAIExperience = async (m, attendanceData = null, wData = null) => {
        if (!m) return;

        // [OPTIMIZATION] Check if we already have a specialized AI message (not fallback)
        // effectively prevents re-fetching just because weather loaded
        if (aiExperience && !aiExperience.isFallback) return;

        const now = new Date();
        const hour = now.getHours();

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const day = days[now.getDay()];

        try {
            // [FIX] Calculate diligence data for personalized AI
            const streak = attendanceData ? storageService.getMemberStreak(m.id, attendanceData) : 0;
            // [FIX] Use timestamp instead of date (which is typically undefined in attendance logs)
            const lastAtt = attendanceData && attendanceData.length > 0 ? (attendanceData[0].timestamp || attendanceData[0].date) : null;

            const exp = await storageService.getAIExperience(
                m.name,
                m.attendanceCount || (attendanceData ? attendanceData.length : 0),
                day,
                hour,
                null, // upcoming class
                wData ? `${t('weather_' + wData.key)} (${wData.temp}°C)` : 'Sunny',
                m.credits || 0,
                getDaysRemaining(m.endDate),
                language,
                { streak, lastAttendanceAt: lastAtt }, // [FIX] Pass real diligence data
                'profile'
            );
            if (exp) {
                setAiExperience(exp);
                storageService.setGreetingCache(m.id, exp);
            }
        } catch (e) {
            console.error("AI load failed:", e);
            setAiExperience({
                message: getTraditionalYogaMessage(),
                bgTheme: 'sunny'
            });
        }
    };

    // [GENIUS ANIMATION] Trigger fade effect when AI message arrives
    useEffect(() => {
        if (aiExperience?.message) {
            setGreetingVisible(false);
            const timer = setTimeout(() => setGreetingVisible(true), 150);
            return () => clearTimeout(timer);
        }
    }, [aiExperience?.message]);

    useEffect(() => {
        const storedMember = safeSessionStorage.getItem('member');
        if (storedMember) {
            try {
                const m = JSON.parse(storedMember);
                const cachedGreeting = storageService.getGreetingCache(m.id);
                if (cachedGreeting) {
                    // Check if cache is still valid (e.g. within same hour)
                    // Simple check: if we have it, use it. Admin 'Data Insight' might need fresh, but Greeting is fine.
                    setAiExperience(cachedGreeting);
                }
                loadMemberData(m.id);
            } catch (e) {
                console.warn("Failed to parse stored member", e);
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // [Optimized] Agent checks moved to useState initialization for immediate feedback without flash.

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        const unsubscribe = storageService.subscribe(async () => {
            setNotices(storageService.getNotices());
            const imgs = await storageService.getImages();
            setImages(imgs);
            if (member) {
                storageService.getMemberById(member.id).then(m => {
                    if (m) setMember(m);
                });
                storageService.getAttendanceByMemberId(member.id).then(h => {
                    setLogs(h);
                });
            }
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [member?.id]);

    // async function loadPracticeEvents(memberId) {
    //     try {
    //         const events = await storageService.getPracticeEvents(memberId, 5);
    //         setPracticeEvents(events);
    //     } catch (e) {
    //         console.error('Failed to load practice events:', e);
    //     }
    // }

    async function fetchWeather() {
        try {
            const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current_weather=true');
            const data = await res.json();
            const weatherCode = data.current_weather.weathercode;

            let weatherKey = 'clear';
            if (weatherCode >= 1 && weatherCode <= 3) weatherKey = 'partly_cloudy';
            if (weatherCode > 3) weatherKey = 'cloudy';
            if (weatherCode >= 45 && weatherCode <= 48) weatherKey = 'fog';
            if (weatherCode >= 51 && weatherCode <= 67) weatherKey = 'rain';
            if (weatherCode >= 71 && weatherCode <= 77) weatherKey = 'snow';
            if (weatherCode >= 95) weatherKey = 'thunderstorm';

            const wData = { key: weatherKey, temp: data.current_weather.temperature };
            setWeatherData(wData);

            if (member) loadAIExperience(member, logs, wData);
        } catch (err) {
            console.log('Weather fetch failed', err);
            if (member) loadAIExperience(member, logs, null);
        }
    }

    async function handleLogin(e) {
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
            setError(t('loginFailed') || "로그인 실패");
            setLoading(false);
        }
    }

    const handleLogout = () => {
        if (window.confirm(t('logoutConfirm'))) {
            safeSessionStorage.removeItem('member');
            setMember(null);
            setName('');
            setPhone('');
            setError('');
        }
    };

    useEffect(() => {
        if (member) {
            setAiExperience(null);
            loadAIExperience(member, logs, weatherData);

            setAiAnalysis(null);
            const now = new Date();
            // This Effect handles LANGUAGE change. Initial load is handled by loadMemberData.
            storageService.getAIAnalysis(member.name, logs.length, logs, now.getHours(), language, 'member')
                .then(analysis => setAiAnalysis(analysis))
                .catch(() => setAiAnalysis({ message: t('analysisPending'), isError: true }));

            if (notices.length > 0) {
                storageService.translateNotices(notices, language).then(translated => {
                    setNotices(translated);
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language]);

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
        if (pushStatus === 'denied') {
            const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
            let msg = "알림 권한이 차단되어 있습니다.\n\n";

            if (isPWA) {
                msg += "[앱 알림 켜는 법]\n1. 휴대폰 '설정' > '애플리케이션' (또는 앱)\n2. 목록에서 이 앱(또는 Chrome) 선택\n3. '알림'을 찾아 '허용' 해주세요.\n4. 앱을 껐다 켜주세요.";
            } else {
                msg += "[해제 방법]\n1. 주소창 자물쇠 아이콘 클릭\n2. '설정' 또는 '권한' 클릭\n3. '알림'을 '허용'으로 변경";
            }
            alert(msg);
            return;
        }

        const status = await storageService.requestPushPermission(member.id);
        if (status === 'granted') {
            setPushStatus('granted');
            localStorage.setItem('push_enabled', 'true');
            alert(t('pushEnabled'));
        } else if (status === 'denied') {
            setPushStatus('denied');
            alert("알림 권한이 차단되었습니다. 휴대폰 설정 또는 브라우저 설정에서 알림을 허용해주세요.");
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



    if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

    if (!member) {
        return (
            <div style={{
                minHeight: '100vh',
                position: 'relative',
                overflowX: 'hidden',
                overflowY: 'auto',
                background: '#000000',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                {/* Background layers identical to profile for seamless transition */}
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url(${memberBg})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        zIndex: 1
                    }}
                />
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.1)', zIndex: 4, pointerEvents: 'none' }} />

                <div style={{
                    position: 'relative',
                    zIndex: 10,
                    animation: 'slideUp 0.8s ease-out',
                    textAlign: 'center',
                    width: '100%',
                    maxWidth: '360px'
                }}>
                    <div style={{ marginBottom: '40px' }}>
                        <img src={logo} alt={STUDIO_CONFIG.NAME} style={{ width: '85px', height: 'auto', opacity: 0.9, filter: 'brightness(0) invert(1) drop-shadow(0 0 15px rgba(255, 255, 255, 0.4))', marginBottom: '25px' }} />
                        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '10px', color: 'var(--primary-gold)' }}>{t('loginTitle')}</h2>
                        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', wordBreak: 'keep-all' }}>
                            {t('loginWelcome')}<br />
                            {t('loginSub')}
                        </p>
                    </div>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Language Selector in Login (Unified Style) */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
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
                        </div>

                        <div style={{ textAlign: 'left', marginBottom: '4px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginLeft: '12px' }}>{t('nameLabel')}</label>
                            <input style={{ ...authInputStyle, marginTop: '4px', imeMode: 'active' }} placeholder={t('namePlaceholder')} value={name} onChange={e => setName(e.target.value)} lang="ko" inputMode="text" autoComplete="name" spellCheck="false" autoCorrect="off" />
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
            {(() => {
                // [VISUALIZATION] Determine Particle Mode based on user activity
                let mode = 'calm';
                if (logs && logs.length > 0) {
                    const lastLog = logs[0];
                    const lastDate = new Date(lastLog.timestamp || lastLog.date);
                    const daysSinceLast = (new Date() - lastDate) / (1000 * 60 * 60 * 24);

                    if (daysSinceLast > 14) {
                        mode = 'stillness'; // Dormant
                    } else {
                        // Check for high activity (Burning)
                        // Simple check: 3+ logs in last 7 days OR total logs >= 8 (visible limit)
                        const oneWeekAgo = new Date();
                        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                        const recentLogs = logs.filter(l => new Date(l.timestamp || l.date) > oneWeekAgo);

                        if (recentLogs.length >= 3 || logs.length >= 8) {
                            mode = 'burning';
                        }
                    }
                } else if (member && member.regDate) {
                    // New member check
                    const regDate = new Date(member.regDate);
                    const daysSinceReg = (new Date() - regDate) / (1000 * 60 * 60 * 24);
                    if (daysSinceReg > 14) mode = 'stillness';
                }

                return <InteractiveParticles mode={mode} />;
            })()}
            <div className="profile-overlay" style={{ background: 'rgba(0,0,0,0.1)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 4 }} />

            {/* 3. Content Container (z-index: 10 - Must be higher than overlays) */}
            <div className="profile-container" style={{ paddingBottom: '120px', position: 'relative', zIndex: 10 }}>
                {/* Header */}
                <ProfileHeader
                    logo={logo}
                    langLabelIndex={langLabelIndex}
                    langLabels={langLabels}
                    t={t}
                    logout={handleLogout}
                />

                {/* Main Tabs Content */}
                <div className="tabs-content" style={{ padding: '0 10px' }}>

                    {/* HOME TAB */}
                    {activeTab === 'home' && (
                        <div className="fade-in">


                            <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px', background: 'rgba(20, 20, 20, 0.9)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                <MembershipInfo member={member} daysRemaining={daysRemaining} t={t} />

                                <AISection
                                    aiExperience={aiExperience}
                                    weatherData={weatherData}
                                    greetingVisible={greetingVisible}
                                    t={t}
                                    getTraditionalYogaMessage={getTraditionalYogaMessage}
                                />

                                <HomeYogaSection language={language} t={t} />

                                <RecentAttendance
                                    logs={logs}
                                    language={language}
                                    t={t}
                                    setActiveTab={setActiveTab}
                                />

                                {/* Settings */}
                                <div className="glass-panel" style={{ padding: '20px', background: 'rgba(20, 20, 20, 0.8)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Icons.BellRinging size={20} color="var(--primary-gold)" />
                                            <span style={{ color: 'white', fontWeight: 500 }}>{t('notificationSetting')}</span>
                                        </div>
                                        {pushStatus === 'granted' ?
                                            <button onClick={handlePushDisable} style={{ background: '#10B981', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', border: 'none' }}>ON</button> :
                                            (pushStatus === 'denied' ?
                                                <button onClick={handlePushRequest} style={{ background: '#EF4444', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', border: 'none' }}>차단됨</button> :
                                                <button onClick={handlePushRequest} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', border: 'none' }}>OFF</button>
                                            )
                                        }
                                    </div>
                                </div>

                                <SocialLinks t={t} />

                                <PWAInstallPrompts
                                    isInStandaloneMode={isInStandaloneMode}
                                    isInAppBrowser={isInAppBrowser}
                                    isIOS={isIOS}
                                    installPrompt={installPrompt}
                                    handleInstallClick={handleInstallClick}
                                    t={t}
                                />

                            </div>
                        </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeTab === 'history' && (
                        <div className="fade-in">
                            <AttendanceHistory
                                logs={logs}
                                member={member}
                                language={language}
                                t={t}
                                aiAnalysis={aiAnalysis}
                                logLimit={logLimit}
                                setLogLimit={setLogLimit}
                            />
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
                                    (() => {
                                        const now = new Date();
                                        const currentYear = now.getFullYear();
                                        const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
                                        const currentKeyDate = `${currentYear}-${currentMonthStr}`;

                                        const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                                        const nextYear = nextDate.getFullYear();
                                        const nextMonthStr = String(nextDate.getMonth() + 1).padStart(2, '0');
                                        const nextKeyDate = `${nextYear}-${nextMonthStr}`;

                                        const currentBranchId = scheduleBranch || 'gwangheungchang';

                                        const currentKey = `timetable_${currentBranchId}_${currentKeyDate}`;
                                        const nextKey = `timetable_${currentBranchId}_${nextKeyDate}`;
                                        const oldKey = `timetable_${currentBranchId}`;

                                        const hasNext = !!images[nextKey];
                                        const activeMonth = scheduleMonth === 'next' && hasNext ? 'next' : 'current';
                                        const displayImage = activeMonth === 'next' ? images[nextKey] : (images[currentKey] || images[oldKey] || (currentBranchId === 'gwangheungchang' ? timeTable1 : timeTable2));

                                        return (
                                            <div style={{ position: 'relative', width: '100%', borderRadius: '10px', overflow: 'hidden' }}>
                                                {/* Month Navigation Overlay */}
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '10px',
                                                    padding: '0 5px'
                                                }}>
                                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>
                                                        {activeMonth === 'current' ? `${currentMonthStr}월 시간표` : `${nextMonthStr}월 시간표 (미리보기)`}
                                                    </h3>

                                                    {hasNext && (
                                                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2px' }}>
                                                            <button
                                                                onClick={() => setScheduleMonth('current')}
                                                                style={{
                                                                    background: activeMonth === 'current' ? 'var(--primary-gold)' : 'transparent',
                                                                    color: activeMonth === 'current' ? 'black' : 'rgba(255,255,255,0.6)',
                                                                    border: 'none',
                                                                    borderRadius: '20px',
                                                                    padding: '4px 12px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 'bold',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                {currentMonthStr}월
                                                            </button>
                                                            <button
                                                                onClick={() => setScheduleMonth('next')}
                                                                style={{
                                                                    background: activeMonth === 'next' ? 'var(--primary-gold)' : 'transparent',
                                                                    color: activeMonth === 'next' ? 'black' : 'rgba(255,255,255,0.6)',
                                                                    border: 'none',
                                                                    borderRadius: '20px',
                                                                    padding: '4px 12px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 'bold',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                {nextMonthStr}월 &gt;
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <img
                                                    src={displayImage}
                                                    style={{ width: '100%', display: 'block', borderRadius: '8px' }}
                                                    alt="timetable"
                                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                />
                                                <div style={{ display: 'none', height: '200px', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px' }}>{t('noTimetableImage')}</div>
                                            </div>
                                        );
                                    })()
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
                                {Array.isArray(notices) && notices.length > 0 ? (
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
            </div> {/* End of profile-container */}

            {/* Bottom Navigation */}
            <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} t={t} />
            <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.1, fontSize: '0.6rem', color: 'white' }}>
                v1.0.5 | boksaem-yoga
            </div>
        </div>
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
        {cloneElement(icon, {
            weight: active ? 'fill' : 'regular',
            style: { filter: active ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.5))' : 'none' }
        })}
        <span style={{ fontSize: '0.65rem', fontWeight: active ? '800' : '600' }}>{label}</span>
    </button>
);

export default MemberProfile;
