import { PWAContext } from '../context/PWAContextDef';
import { useContext, useState, useEffect, lazy, Suspense, useRef } from 'react';
import { onSnapshot, doc, collection, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { storageService } from '../services/storage';
import { Icons } from '../components/CommonIcons';
import logo from '../assets/logo.png';
import memberBg from '../assets/zen_yoga_bg.webp';
// Lazy load MeditationPage to prevent initialization errors and reduce bundle size
const MeditationPage = lazy(() => import('./MeditationPage'));
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
import ScheduleTab from '../components/profile/tabs/ScheduleTab';
import NoticeTab from '../components/profile/tabs/NoticeTab';
import PriceTab from '../components/profile/tabs/PriceTab';
import CustomGlassModal from '../components/common/CustomGlassModal';
import InstallGuideModal from '../components/InstallGuideModal';
import InstallBanner from '../components/common/InstallBanner';

import SocialLinks from '../components/profile/SocialLinks';
import AttendanceHistory from '../components/profile/AttendanceHistory';
import RecentAttendance from '../components/profile/RecentAttendance';
import ProfileTabs from '../components/profile/ProfileTabs';
import { profileStyles } from '../components/profile/profileStyles';
import MyStatsChart from '../components/profile/MyStatsChart';
import MessagesTab from '../components/profile/MessagesTab';
import { getDaysRemaining, getKSTHour } from '../utils/dates';
import ImageLightbox from '../components/common/ImageLightbox';

// Safe localStorage wrapper with error handling
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
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
    const [selectedNoticeId, setSelectedNoticeId] = useState(null);
    const { language, t } = useLanguage();

    const [langLabelIndex, setLangLabelIndex] = useState(0);
    const langLabels = ["언어", "Language", "Язык", "语言", "言語"];

    // [FIX] AI 중복 호출 방지용 Ref
    const lastAiExpArgs = useRef('');
    const lastAiAnalysisArgs = useRef('');

    // Added for schedule view
    const [scheduleView, setScheduleView] = useState('calendar');
    const [scheduleMonth, setScheduleMonth] = useState('current'); // 'current' or 'next'
    
    // PWA Install State
    const [showInstallGuide, setShowInstallGuide] = useState(false); // [PWA] Install Guide

    // [Push] Auto Push Permission Request
    useEffect(() => {
        if (member && typeof window !== 'undefined' && 'Notification' in window) {
            if (window.Notification.permission === 'default') {
                const pushTimer = setTimeout(() => {
                    console.log("[Push Check] Auto-requesting push permission for member...");
                    // Try to request permission automatically
                    window.Notification.requestPermission().then(permission => {
                        setPushStatus(permission);
                        if (permission === 'granted') {
                            storageService.requestPushPermission(member.id).catch(err => console.warn(err));
                        }
                    });
                }, 3500); // UI 안정화 후 3.5초 뒤 띄움
                return () => clearTimeout(pushTimer);
            }
        }
    }, [member]);

    const handleNotificationToggle = async (e) => {
        if (e.target.checked) {
            try {
                const result = await storageService.reregisterPushToken(member.id);
                if (result.success) {
                    setPushStatus('granted');
                    alert('푸시 알림이 설정되었습니다.');
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error("Push registration failed", error);
                alert('알림 설정 실패: ' + error.message);
            }
        } else {
            if (window.confirm('푸시 알림을 끄시겠습니까? (브라우저 설정에서 차단해야 완벽하게 꺼집니다)')) {
                setPushStatus('denied');
            }
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setLangLabelIndex((prev) => (prev + 1) % langLabels.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [langLabels.length]);

    // 🤖 AI Preloader (Background Task for Performance)
    useEffect(() => {
        const preloadAI = () => {
             // Only run if browser supports it, otherwise skip optimization
            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                window.requestIdleCallback(async () => {
                    // Wait 4s for initial render and animations to settle
                    await new Promise(r => setTimeout(r, 4000));
                    
                    try {
                        console.log("🧘 [Background] Preloading AI Engines...");
                        // Prefetch AI modules so they are ready when user clicks 'Meditation'
                        const modules = [
                            import('@mediapipe/pose'),
                            import('@tensorflow/tfjs-core'),
                            import('@tensorflow/tfjs-backend-webgl')
                        ];
                        await Promise.all(modules);
                        console.log("✨ [Background] AI Engines Cached & Ready");
                    } catch (e) {
                        console.debug("[Background] AI Preload deferred/failed", e);
                    }
                }, { timeout: 10000 });
            }
        };
        preloadAI();
    }, []);

    // [OPTIMIZED] Persist language preference ONLY when it actually changes
    useEffect(() => {
        if (member && member.id && member.language !== language) {
            console.log(`[Language] Updating member preference to: ${language}`);
            storageService.updateMember(member.id, { language: language });
        }

        // [FIX] Restore Anonymous Auth Session if missing
        // This ensures 'fcm_tokens' writes succeed even if the page was reloaded
        if (member && !auth.currentUser) {
            import("firebase/auth").then(({ signInAnonymously }) => {
                signInAnonymously(auth)
                    .then(() => {
                        console.log("[MemberProfile] Anonymous session restored for push tokens");
                        // Retry token sync if it might have failed earlier
                        if (Notification.permission === 'granted') {
                            storageService.requestPushPermission(member.id);
                        }
                    })
                    .catch(e => console.warn("[MemberProfile] Session restore failed:", e));
            });
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language, member?.id, member?.language]);

    // [Deep Link] Parse 'tab' from URL to auto-navigate
    useEffect(() => {
        const handleLocationChange = () => {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            const noticeId = params.get('noticeId');
            
            if (noticeId) {
                console.log(`[DeepLink] Specific notice requested: ${noticeId}`);
                setSelectedNoticeId(noticeId);
                setActiveTab('notices');
            } else if (tab && ['home', 'history', 'schedule', 'prices', 'notices', 'messages'].includes(tab)) {
                console.log(`[DeepLink] Navigating to tab: ${tab}`);
                setActiveTab(tab);
            }

            // [FIX] Clear the query param after use so browser reload returns to home
            // Use a short delay to ensure React state has processed it
            if (tab || noticeId) {
                setTimeout(() => {
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, '', newUrl);
                }, 500);
            }
        };

        // Initial check
        handleLocationChange();

        // Listen for history changes (replaceState doesn't trigger popstate, but our SW uses client.navigate)
        window.addEventListener('popstate', handleLocationChange);

        // [ENHANCEMENT] Special listener for deep links if app is already open
        const interval = setInterval(() => {
            if (window.location.search.includes('tab=')) {
                handleLocationChange();
            }
        }, 1000);

        return () => {
            window.removeEventListener('popstate', handleLocationChange);
            clearInterval(interval);
        };
    }, []);

    const [logs, setLogs] = useState([]);
    const [logLimit, setLogLimit] = useState(10);
    const [notices, setNotices] = useState([]);
    const [images, setImages] = useState({});
    const [weatherData, setWeatherData] = useState(null); // Changed to object { key, temp }
    const [aiExperience, setAiExperience] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [messages, setMessages] = useState([]);
    const [lightboxImage, setLightboxImage] = useState(null);

    const [pushStatus, setPushStatus] = useState(() => {
        if (typeof Notification === 'undefined') return 'default';
        if (Notification.permission === 'denied') return 'denied';
        if (Notification.permission === 'granted') return 'granted';
        return 'default';
    });

    // PWA Install State - Restored and updated
    const pwaCtx = useContext(PWAContext) || {};
    const { deferredPrompt, installApp, deviceOS } = pwaCtx;
    const isPwaStandalone = pwaCtx.isStandalone;

    // Login States
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');

    const [scheduleBranch, setScheduleBranch] = useState('gwangheungchang'); // Default, will update on auth

    const [greetingVisible, setGreetingVisible] = useState(true);

    // Destructure styles
    const { authInput: authInputStyle, authButton: authButtonStyle } = profileStyles;


    const loadMemberData = async (memberId) => {
        try {
            setLoading(true);

            // [PERFORMANCE] Parallel Data Loading
            const [memberData, history, noticeData, imagesData, messagesData] = await Promise.all([
                storageService.fetchMemberById(memberId),
                storageService.getAttendanceByMemberId(memberId),
                storageService.loadNotices(),
                storageService.getImages(),
                storageService.getMessagesByMemberId(memberId)
            ]);

            if (memberData) {
                // [FIX] Preserve displayName from existing state or storage if available
                setMember(prev => ({
                    ...memberData,
                    displayName: prev?.displayName || JSON.parse(safeSessionStorage.getItem('member') || '{}').displayName || memberData.name
                }));
                // [FIX] Sort history by timestamp descending (newest first)
                const sortedHistory = (history || []).sort((a, b) => {
                    const timeA = new Date(a.timestamp || a.date || 0).getTime();
                    const timeB = new Date(b.timestamp || b.date || 0).getTime();
                    return timeB - timeA;
                });
                setLogs(sortedHistory);
                setMessages(messagesData || []);

                // [FIX] Sort notices explicitly by timestamp/date descending (newest first)
                const sortedNotices = (noticeData || []).sort((a, b) => {
                    const dateA = new Date(a.timestamp || a.date || 0);
                    const dateB = new Date(b.timestamp || b.date || 0);
                    return dateB - dateA; // Descending (newest first)
                });
                setNotices(sortedNotices);

                setImages(imagesData || {});

                setScheduleBranch(memberData.homeBranch || 'gwangheungchang');
                fetchWeather();

                // [FIX] Filter out denied logs from AI analysis
                const validHistory = history.filter(h => h.status !== 'denied');

                if (!weatherData) {
                    loadAIExperience(memberData, validHistory);
                }

                const currentAnalysisArgs = `${memberData.name}_${validHistory.length}_${getKSTHour()}_${language}`;
                if (lastAiAnalysisArgs.current !== currentAnalysisArgs) {
                    lastAiAnalysisArgs.current = currentAnalysisArgs;
                    storageService.getAIAnalysis(memberData.name, validHistory.length, validHistory, getKSTHour(), language, 'member')
                        .then(analysis => setAiAnalysis(analysis))
                        .catch(() => setAiAnalysis({ message: t('analysisPending'), isError: true }));
                }

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

    // [PERF] 메시지 리스너는 아래 useEffect(line ~445)에서 통합 관리
    // 중복 리스너 제거 — Firestore 연결 1개 절약

    const loadAIExperience = async (m, attendanceData = null, wData = null) => {
        if (!m) return;

        // [OPTIMIZATION] Check if we already have a specialized AI message (not fallback)
        // effectively prevents re-fetching just because weather loaded
        if (aiExperience && !aiExperience.isFallback) return;

        const now = new Date();
        const hour = getKSTHour();

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const day = days[now.getDay()];

        const validAttendance = attendanceData ? attendanceData.filter(l => l.status !== 'denied') : [];
        const currentArgs = `${m.id}_${validAttendance.length}_${day}_${hour}_${wData?.key || 'null'}_${language}`;
        
        if (lastAiExpArgs.current === currentArgs) return;
        lastAiExpArgs.current = currentArgs;

        try {
            // [FIX] Calculate diligence data for personalized AI
            const streak = attendanceData ? storageService.getMemberStreak(m.id, validAttendance) : 0;
            // [FIX] Use timestamp instead of date (which is typically undefined in attendance logs)
            const lastAtt = validAttendance.length > 0 ? (validAttendance[0].timestamp || validAttendance[0].date) : null;

            const exp = await storageService.getAIExperience(
                m.name,
                m.attendanceCount || validAttendance.length,
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

        // handleBeforeInstallPrompt moved to Context

        const unsubscribe = storageService.subscribe(async () => {
            // [FIX] Sort notices explicitly by timestamp descending in real-time update
            const freshNotices = storageService.getNotices();
            setNotices([...freshNotices].sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0)));

            const imgs = await storageService.getImages();
            setImages(imgs);
            if (member) {
                storageService.fetchMemberById(member.id).then(m => {
                    if (m) setMember(m);
                });
                storageService.getAttendanceByMemberId(member.id).then(h => {
                    const sortedH = [...h].sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0));
                    setLogs(sortedH);
                });
            }
        });

        // [REAL-TIME] Dedicated Messages Listener
        let msgUnsub = () => { };
        if (member?.id) {
            console.log(`[MemberProfile] Setting up real-time message listener for: ${member.id}`);
            const q = query(
                collection(db, 'messages'),
                where('memberId', '==', member.id),
                orderBy('timestamp', 'desc'),
                firestoreLimit(30)
            );
            msgUnsub = onSnapshot(q, async (snap) => {
                const individualMessages = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    type: 'admin_individual'
                }));

                // For messages tab, we still want to show both notices and individual messages
                // So we combine them here as well
                const currentNotices = storageService.getNotices();
                const noticeMessages = currentNotices.slice(0, 10).map(n => ({
                    ...n,
                    type: 'notice',
                    content: n.content,
                    timestamp: n.timestamp || n.date
                }));

                const allMessages = [...individualMessages, ...noticeMessages].sort((a, b) => {
                    const timeA = new Date(a.timestamp || 0).getTime();
                    const timeB = new Date(b.timestamp || 0).getTime();
                    return timeB - timeA;
                });

                setMessages(allMessages);
            }, (err) => {
                console.warn("[MemberProfile] Message listener failed (likely pending index):", err);
                // Fallback to getMessagesByMemberId if listener fails
                storageService.getMessagesByMemberId(member.id).then(setMessages);
            });
        }

        return () => {
            // window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            unsubscribe();
            msgUnsub();
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

            if (member) {
                // [FIX] Filter out denied logs
                const validLogs = logs.filter(l => l.status !== 'denied');
                loadAIExperience(member, validLogs, wData);
            }
        } catch (err) {
            console.log('Weather fetch failed', err);
            if (member) {
                const validLogs = logs.filter(l => l.status !== 'denied');
                loadAIExperience(member, validLogs, null);
            }
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
                // [FIX] Use the returned displayName (input name) for UI consistency
                const memberWithDisplay = { 
                    ...result.member,
                    displayName: result.member.displayName || result.member.name 
                };
                safeSessionStorage.setItem('member', JSON.stringify(memberWithDisplay));
                
                // Update local state immediately with displayName
                setMember(memberWithDisplay);
                
                // Load fresh data (this might overwrite member, so we need to merge carefully in loadMemberData or just rely on state)
                loadMemberData(result.member.id);

                // [Fix] Reset token on every login to ensure delivery
                storageService.requestPushPermission(result.member.id).catch(err => console.warn(err));
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
            // [FIX] Filter out denied logs
            const validLogs = logs.filter(l => l.status !== 'denied');
            
            lastAiExpArgs.current = ''; // 강제 다시 업데이트
            loadAIExperience(member, validLogs, weatherData);

            setAiAnalysis(null);
            const currentAnalysisArgs = `${member.name}_${validLogs.length}_${getKSTHour()}_${language}`;
            lastAiAnalysisArgs.current = currentAnalysisArgs;
            storageService.getAIAnalysis(member.name, validLogs.length, validLogs, getKSTHour(), language, 'member')
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
        const hour = getKSTHour();
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



    if (loading) return (
        <div style={{ padding: '20px', minHeight: '100vh', background: '#08080A' }}>
             {/* Skeleton Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingTop: 'env(safe-area-inset-top)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <div className="skeleton" style={{ width: '30px', height: '30px', borderRadius: '50%' }} />
                     <div className="skeleton" style={{ width: '100px', height: '24px' }} />
                </div>
                <div className="skeleton" style={{ width: '80px', height: '32px' }} />
            </div>

            {/* Skeleton Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="skeleton" style={{ width: '100%', height: '180px', borderRadius: '20px' }} />
                <div className="skeleton" style={{ width: '100%', height: '100px', borderRadius: '20px' }} />
                <div className="skeleton" style={{ width: '100%', height: '100px', borderRadius: '20px' }} />
            </div>

             {/* Skeleton Bottom Nav */}
            <div style={{ position: 'fixed', bottom: 'calc(20px + env(safe-area-inset-bottom))', left: '20px', right: '20px', height: '75px', borderRadius: '25px', background: 'rgba(20,20,20,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
    );

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
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '4px 8px'
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
                            <input style={{ ...authInputStyle, marginTop: '4px' }} placeholder={t('namePlaceholder')} value={name} onChange={e => setName(e.target.value)} lang="ko" type="text" inputMode="text" autoComplete="name" spellCheck="false" enterKeyHint="next" />
                        </div>
                        <div style={{ textAlign: 'left', marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginLeft: '12px' }}>{t('phoneLabel')}</label>
                            <input style={{ ...authInputStyle, marginTop: '4px' }} placeholder={t('phonePlaceholder')} value={phone} onChange={e => setPhone(e.target.value)} maxLength={4} type="tel" inputMode="numeric" pattern="[0-9]*" autoComplete="tel-local-suffix" enterKeyHint="go" />
                        </div>
                        {error && <p style={{ color: 'var(--accent-error)', fontSize: '0.9rem', marginBottom: '10px' }}>{error}</p>}
                        <button type="submit" disabled={loading} style={{ ...authButtonStyle, marginTop: '10px' }}>{t('checkRecordBtn')}</button>
                    </form>
                    <p style={{ marginTop: '30px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                        {t('loginFooter')}
                    </p>
                </div>
            </div>
        );
    }



    // [FIX] Filter out denied logs for Statistics & AI (keep 'logs' for History)
    const validLogs = logs.filter(log => log.status !== 'denied');

    const daysRemaining = getDaysRemaining(member.endDate);

    return (
        <div className="member-profile-wrapper" style={{
            minHeight: '100dvh',
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
                // [VISUALIZATION] Determine Particle Mode based on user activity (VALID logs only)
                let mode = 'calm';
                if (validLogs && validLogs.length > 0) {
                    const lastLog = validLogs[0];
                    const lastDate = new Date(lastLog.timestamp || lastLog.date);
                    const daysSinceLast = (new Date() - lastDate) / (1000 * 60 * 60 * 24);

                    if (daysSinceLast > 14) {
                        mode = 'stillness'; // Dormant
                    } else {
                        // Check for high activity (Burning)
                        // Simple check: 3+ valid logs in last 7 days OR total valid logs >= 8
                        const oneWeekAgo = new Date();
                        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                        const recentLogs = validLogs.filter(l => new Date(l.timestamp || l.date) > oneWeekAgo);

                        if (recentLogs.length >= 3 || validLogs.length >= 8) {
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
            <div className="profile-container" style={{ paddingBottom: 'calc(130px + env(safe-area-inset-bottom))', position: 'relative', zIndex: 10 }}>
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

                                {/* [New] Personal Yoga Journey Chart - Valid Logs Only */}
                                <MyStatsChart logs={validLogs} />

                                <AISection
                                    aiExperience={aiExperience}
                                    weatherData={weatherData}
                                    greetingVisible={greetingVisible}
                                    t={t}
                                    getTraditionalYogaMessage={getTraditionalYogaMessage}
                                />

                                <HomeYogaSection language={language} t={t} />

                                <RecentAttendance
                                    logs={validLogs}
                                    language={language}
                                    t={t}
                                    setActiveTab={setActiveTab}
                                />

                                <div className="glass-panel" style={{
                                    padding: '25px 30px',
                                    background: 'linear-gradient(145deg, rgba(25, 25, 25, 0.9), rgba(15, 15, 15, 0.95))',
                                    marginBottom: '20px',
                                    borderRadius: '24px',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '50%',
                                            background: pushStatus === 'granted' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: `1px solid ${pushStatus === 'granted' ? 'rgba(212, 175, 55, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                            transition: 'all 0.3s ease'
                                        }}>
                                            {pushStatus === 'granted' ? (
                                                <Icons.BellRinging size={22} weight="fill" color="var(--primary-gold)" />
                                            ) : (
                                                <Icons.BellSlash size={22} color="rgba(255,255,255,0.4)" />
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>
                                                푸시 알림
                                            </span>
                                            <span style={{ fontSize: '0.85rem', color: pushStatus === 'granted' ? 'var(--primary-gold)' : 'rgba(255,255,255,0.4)', transition: 'color 0.3s' }}>
                                                {pushStatus === 'granted' ? '알림이 켜져 있습니다' : '알림이 꺼져 있습니다'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <label className="premium-switch" style={{ position: 'relative', display: 'inline-block', width: '56px', height: '30px' }}>
                                        <input
                                            type="checkbox"
                                            checked={pushStatus === 'granted'}
                                            onChange={handleNotificationToggle}
                                            style={{ opacity: 0, width: 0, height: 0 }}
                                        />
                                        <span className="premium-slider-track" style={{
                                            position: 'absolute',
                                            cursor: 'pointer',
                                            top: 0, 
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            backgroundColor: pushStatus === 'granted' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                            transition: '0.4s',
                                            borderRadius: '34px',
                                            border: `1px solid ${pushStatus === 'granted' ? 'var(--primary-gold)' : 'rgba(255, 255, 255, 0.2)'}`
                                        }}>
                                            <span style={{
                                                position: 'absolute',
                                                content: '""',
                                                height: '22px',
                                                width: '22px',
                                                left: pushStatus === 'granted' ? '30px' : '4px',
                                                bottom: '3px',
                                                backgroundColor: pushStatus === 'granted' ? 'var(--primary-gold)' : 'rgba(255, 255, 255, 0.4)',
                                                transition: '0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
                                                borderRadius: '50%',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }}></span>
                                        </span>
                                    </label>
                                </div>

                                {/* [RESTORED] PWA Install Guide */}
                                {!isPwaStandalone && (deferredPrompt || deviceOS === 'ios') && (
                                    <div className="glass-panel" style={{
                                        padding: '20px 25px',
                                        background: deviceOS === 'ios' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(212, 175, 55, 0.1)',
                                        marginBottom: '20px',
                                        borderRadius: '24px',
                                        border: deviceOS === 'ios' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(212, 175, 55, 0.3)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '15px',
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                        animation: 'fadeIn 0.5s ease-out'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{
                                                width: '44px', height: '44px', borderRadius: '50%',
                                                background: deviceOS === 'ios' ? '#3B82F6' : 'var(--primary-gold)', 
                                                color: deviceOS === 'ios' ? 'white' : 'black',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                {deviceOS === 'ios' ? <Icons.Share size={24} weight="bold" /> : <Icons.DownloadSimple size={24} weight="bold" />}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>
                                                    {deviceOS === 'ios' ? '아이폰에 앱 설치하기' : '앱 설치하기'}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                                                    {deviceOS === 'ios' ? '사파리(Safari)에서 홈 화면에 추가하세요' : '홈 화면에 추가하여 더 편리하게 이용하세요'}
                                                </span>
                                            </div>
                                        </div>

                                        {deviceOS === 'ios' ? (
                                            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '15px', borderRadius: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>
                                                    <span style={{ background: '#3B82F6', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>1</span>
                                                    <span>하단 <Icons.Share size={18} weight="bold" style={{ verticalAlign: 'middle', margin: '0 2px' }} /> <strong>공유 버튼</strong> 클릭</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>
                                                    <span style={{ background: '#3B82F6', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>2</span>
                                                    <span><Icons.PlusSquare size={18} weight="bold" style={{ verticalAlign: 'middle', margin: '0 2px' }} /> <strong>홈 화면에 추가</strong> 선택</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={installApp}
                                                style={{
                                                    background: 'var(--primary-gold)', color: 'black',
                                                    border: 'none', padding: '12px 18px', borderRadius: '14px',
                                                    fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer',
                                                    width: '100%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                                }}
                                            >
                                                <Icons.DownloadSimple size={20} weight="bold" /> 설치하기
                                            </button>
                                        )}
                                    </div>
                                )}

                                <SocialLinks t={t} />



                            </div>
                        </div>
                    )}

                    {/* HISTORY TAB - Uses ALL logs (includes denied) */}
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

                    {/* SCHEDULE TAB - Uses Valid Logs Only */}
                    {activeTab === 'schedule' && (
                        <ScheduleTab 
                            t={t}
                            scheduleView={scheduleView}
                            setScheduleView={setScheduleView}
                            scheduleBranch={scheduleBranch}
                            setScheduleBranch={setScheduleBranch}
                            STUDIO_CONFIG={STUDIO_CONFIG}
                            validLogs={validLogs}
                            scheduleMonth={scheduleMonth}
                            setScheduleMonth={setScheduleMonth}
                            images={images}
                            timeTable1={timeTable1}
                            timeTable2={timeTable2}
                            setLightboxImage={setLightboxImage}
                        />
                    )}

                    {/* MEDITATION TAB - Full Screen Overlay */}
                    {activeTab === 'meditation' && (
                         <div className="fade-in" style={{ 
                            position: 'fixed', 
                            top: 0, 
                            left: 0, 
                            width: '100%', 
                            height: '100%', 
                            zIndex: 10000, 
                            background: '#18181b' // Default dark bg to prevent transparency issues
                        }}>
                            <Suspense fallback={<div style={{ padding: '50px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Loading Meditation AI...</div>}>
                                <MeditationPage onClose={() => setActiveTab('home')} />
                            </Suspense>
                        </div>
                    )}

                    {/* PRICES TAB */}
                    {activeTab === 'prices' && (
                        <PriceTab 
                            images={images}
                            priceTable1={priceTable1}
                            priceTable2={priceTable2}
                            setLightboxImage={setLightboxImage}
                        />
                    )}

                    {/* NOTICES TAB */}
                    {activeTab === 'notices' && (
                        <NoticeTab 
                            t={t}
                            notices={notices}
                            selectedNoticeId={selectedNoticeId}
                            setSelectedNoticeId={setSelectedNoticeId}
                            setLightboxImage={setLightboxImage}
                        />
                    )}

                    {/* MESSAGES TAB */}
                    {activeTab === 'messages' && (
                        <MessagesTab 
                            messages={messages} 
                            t={t} 
                            setActiveTab={(tab, noticeId) => {
                                setActiveTab(tab);
                                if (noticeId) setSelectedNoticeId(noticeId);
                            }} 
                        />
                    )}
                </div>
            </div> {/* End of profile-container */}

            {/* Bottom Navigation (Hidden in Meditation Mode) */}
            {activeTab !== 'meditation' && (
                <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} t={t} />
            )}

            {/* Confirm/Alert Modal */}
            {confirmModal.isOpen && (
                <CustomGlassModal
                    message={confirmModal.message}
                    isConfirm={confirmModal.isConfirm}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                />
            )}

            {/* 이미지 라이트박스 모달 */}
            {lightboxImage && (
                <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
            )}

            <InstallBanner onManualInstallClick={() => setShowInstallGuide(true)} />
            <InstallGuideModal isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />
            
            <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.1, fontSize: '0.6rem', color: 'white' }}>
                v1.0.5 | boksaem-yoga
            </div>
        </div>
    );
};

export default MemberProfile;
