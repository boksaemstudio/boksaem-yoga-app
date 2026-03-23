import { useState, useEffect, useCallback, useRef } from 'react';
import { onSnapshot, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { auth } from '../firebase';
import { tenantDb } from '../utils/tenantDb';
import { storageService } from '../services/storage';
import { safeLocalStorage } from '../utils/safeLocalStorage';
import { getDaysRemaining, getKSTHour, getKSTMonth, getKSTDayNameEN, toKSTDateString } from '../utils/dates';

/**
 * useMemberProfile — MemberProfile 페이지의 모든 데이터 로딩/리스너/AI 로직을 관리하는 훅
 * 
 * MemberProfile.jsx에서 ~400줄의 비즈니스 로직을 추출하여
 * 페이지 컴포넌트는 순수 렌더링에 집중할 수 있게 합니다.
 */
export const useMemberProfile = (language, t) => {
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [logLimit] = useState(10);
    const [notices, setNotices] = useState([]);
    const [images, setImages] = useState({});
    const [weatherData, setWeatherData] = useState(null);
    const [aiExperience, setAiExperience] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [individualMessages, setIndividualMessages] = useState([]);
    const [messages, setMessages] = useState([]);
    const [pushStatus, setPushStatus] = useState(() => {
        if (typeof Notification === 'undefined') return 'default';
        return Notification.permission;
    });

    const lastAiExpArgs = useRef('');
    const lastAiAnalysisArgs = useRef('');

    // ─── Derived Values ───
    const validLogs = logs.filter(log => log.status !== 'denied');
    const daysRemaining = member ? getDaysRemaining(member.endDate) : null;

    // ─── Traditional Yoga Fallback Message ───
    const getTraditionalYogaMessage = useCallback(() => {
        const hour = getKSTHour();
        const month = getKSTMonth();

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
    }, [t]);

    // ─── AI Loading ───
    const loadAIExperience = useCallback(async (m, attendanceData = null, wData = null) => {
        if (!m) return;
        if (aiExperience && !aiExperience.isFallback) return;

        const hour = getKSTHour();
        const day = getKSTDayNameEN();
        const validAttendance = attendanceData ? attendanceData.filter(l => l.status !== 'denied') : [];
        const currentArgs = `${m.id}_${validAttendance.length}_${day}_${hour}_${wData?.key || 'null'}_${language}`;

        if (lastAiExpArgs.current === currentArgs) return;
        lastAiExpArgs.current = currentArgs;

        try {
            const streak = attendanceData ? storageService.getMemberStreak(m.id, validAttendance) : 0;
            const lastAtt = validAttendance.length > 0 ? (validAttendance[0].timestamp || validAttendance[0].date) : null;

            // 근면성실도 계산
            const DAY = 86400000;
            const WEEK = 7 * DAY;
            const nowMs = Date.now();
            const attendDates = [...new Set(validAttendance.map(l => {
                const ts = l.timestamp || l.date;
                if (!ts) return null;
                const d = typeof ts === 'string' ? new Date(ts) : (ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts));
                return isNaN(d.getTime()) ? null : toKSTDateString(d);
            }).filter(Boolean))].sort();
            let diligenceGrade = null;
            if (attendDates.length >= 3) {
                const dates = attendDates.map(d => new Date(d).getTime());
                const totalWeeks = Math.max(1, Math.ceil((nowMs - dates[0]) / WEEK));
                const weeklyAvg = Math.min(7, attendDates.length / totalWeeks);
                const weeklyScore = Math.min(100, Math.round((weeklyAvg / 3) * 100));
                const gaps = [];
                for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i - 1]) / DAY);
                const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
                const stdDev = Math.sqrt(gaps.reduce((a, g) => a + Math.pow(g - avgGap, 2), 0) / gaps.length);
                const regularityScore = Math.round(Math.max(0, Math.min(100, 100 - stdDev * 10)));
                const recentWeeks = [0, 0, 0, 0];
                attendDates.forEach(d => { const w = Math.floor((nowMs - new Date(d).getTime()) / WEEK); if (w >= 0 && w < 4) recentWeeks[w] = 1; });
                const consistencyScore = Math.round((recentWeeks.reduce((a, b) => a + b, 0) / 4) * 100);
                const twoWeeksAgo = toKSTDateString(new Date(nowMs - 14 * DAY));
                const recentCount = attendDates.filter(d => d >= twoWeeksAgo).length;
                const vitalityScore = Math.min(100, Math.round((recentCount / 6) * 100));
                const totalScore = Math.round(weeklyScore * 0.3 + regularityScore * 0.25 + consistencyScore * 0.25 + vitalityScore * 0.2);
                const grade = totalScore >= 85 ? 'S' : totalScore >= 70 ? 'A' : totalScore >= 50 ? 'B' : totalScore >= 30 ? 'C' : 'D';
                diligenceGrade = { grade, score: totalScore, weeklyAvg: weeklyAvg.toFixed(1), regularity: stdDev < 2 ? '매우 규칙적' : stdDev < 4 ? '규칙적' : '불규칙' };
            }

            const exp = await storageService.getAIExperience(
                m.name, m.attendanceCount || validAttendance.length,
                day, hour, null,
                wData ? `${t('weather_' + wData.key)} (${wData.temp}°C)` : 'Sunny',
                m.credits || 0, getDaysRemaining(m.endDate), language,
                { streak, lastAttendanceAt: lastAtt, diligence: diligenceGrade }, 'profile',
                m.mbti || localStorage.getItem('member_mbti') || null
            );
            if (exp) {
                setAiExperience(exp);
                storageService.setGreetingCache(m.id, { ...exp, _cachedForName: m.name });
            }
        } catch (e) {
            console.error("AI load failed:", e);
            setAiExperience({ message: getTraditionalYogaMessage(), bgTheme: 'sunny' });
        }
    }, [language, t, getTraditionalYogaMessage, aiExperience]);

    // ─── Weather ───
    const fetchWeather = useCallback(async () => {
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
            return wData;
        } catch {
            return null;
        }
    }, []);

    // ─── Main Data Loader ───
    const loadMemberData = useCallback(async (memberId) => {
        try {
            setLoading(true);
            const [memberData, history, noticeData, imagesData, messagesData] = await Promise.all([
                storageService.fetchMemberById(memberId),
                storageService.getAttendanceByMemberId(memberId),
                storageService.loadNotices(),
                storageService.getImages(),
                storageService.getMessagesByMemberId(memberId)
            ]);

            if (memberData) {
                setMember(prev => ({
                    ...memberData,
                    displayName: prev?.displayName || JSON.parse(safeLocalStorage.getItem('member') || '{}').displayName || memberData.name
                }));
                const sortedHistory = (history || []).sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0));
                setLogs(sortedHistory);
                setIndividualMessages(messagesData || []);
                const sortedNotices = (noticeData || []).sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0));
                setNotices(sortedNotices);
                setImages(imagesData || {});

                const validHistory = history.filter(h => h.status !== 'denied');
                const wData = await fetchWeather();
                loadAIExperience(memberData, validHistory, wData);

                const currentAnalysisArgs = `${memberData.name}_${validHistory.length}_${getKSTHour()}_${language}`;
                if (lastAiAnalysisArgs.current !== currentAnalysisArgs) {
                    lastAiAnalysisArgs.current = currentAnalysisArgs;
                    storageService.getAIAnalysis(memberData.name, validHistory.length, validHistory, getKSTHour(), language, 'member')
                        .then(analysis => setAiAnalysis(analysis))
                        .catch(() => setAiAnalysis({ message: t('analysisPending'), isError: true }));
                }

                if (Notification.permission === 'granted' || localStorage.getItem('push_enabled') === 'true') {
                    storageService.requestPushPermission(memberId).catch(() => {});
                    setPushStatus('granted');
                }
            } else {
                safeLocalStorage.removeItem('member');
                return false;
            }
        } catch (e) {
            console.error("Load member failed:", e);
            return false;
        } finally {
            setLoading(false);
        }
        return true;
    }, [language, t, fetchWeather, loadAIExperience]);

    // ─── Push Auto Request ───
    useEffect(() => {
        if (member && typeof window !== 'undefined' && 'Notification' in window) {
            if (window.Notification.permission === 'default') {
                const pushTimer = setTimeout(() => {
                    window.Notification.requestPermission().then(permission => {
                        setPushStatus(permission);
                        if (permission === 'granted') {
                            storageService.requestPushPermission(member.id).catch(() => {});
                        }
                    });
                }, 3500);
                return () => clearTimeout(pushTimer);
            }
        }
    }, [member]);

    // ─── Real-time Firestore Listeners ───
    useEffect(() => {
        const savedMember = safeLocalStorage.getItem('member');
        if (!savedMember) return;
        const memberId = JSON.parse(savedMember).id;

        const unsubMember = onSnapshot(tenantDb.doc('members', memberId), (snap) => {
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() };
                setMember(data);
                safeLocalStorage.setItem('member', JSON.stringify(data));
            }
        });

        const q = query(
            tenantDb.collection('attendance'),
            where('memberId', '==', memberId),
            orderBy('timestamp', 'desc'),
            firestoreLimit(logLimit)
        );
        const unsubAttendance = onSnapshot(q, (snap) => {
            const history = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLogs(history);
        });

        return () => { unsubMember(); unsubAttendance(); };
    }, [logLimit]);

    // ─── Messages Merge ───
    useEffect(() => {
        const noticeMessages = notices.slice(0, 10).map(n => ({
            ...n, type: 'notice', content: n.content, timestamp: n.timestamp || n.date
        }));
        const allMessages = [...individualMessages, ...noticeMessages].sort((a, b) =>
            new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
        );
        setMessages(allMessages);
    }, [individualMessages, notices]);

    // ─── Storage Subscription ───
    useEffect(() => {
        const unsubscribe = storageService.subscribe(async () => {
            const freshNotices = storageService.getNotices();
            setNotices([...freshNotices].sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0)));
            const imgs = await storageService.getImages();
            setImages(imgs);
            if (member) {
                storageService.fetchMemberById(member.id).then(m => { if (m) setMember(m); });
                storageService.getAttendanceByMemberId(member.id).then(h => {
                    setLogs([...h].sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0)));
                });
            }
        });

        let msgUnsub = () => {};
        if (member?.id) {
            const q = query(
                tenantDb.collection('messages'),
                where('memberId', '==', member.id),
                orderBy('timestamp', 'desc'),
                firestoreLimit(30)
            );
            msgUnsub = onSnapshot(q, (snap) => {
                setIndividualMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'admin_individual' })));
            }, () => {
                storageService.getMessagesByMemberId(member.id).then(setIndividualMessages);
            });
        }

        return () => { unsubscribe(); msgUnsub(); };
    }, [member?.id]);

    // ─── Initial Load ───
    useEffect(() => {
        const storedMember = safeLocalStorage.getItem('member');
        if (storedMember) {
            try {
                const m = JSON.parse(storedMember);
                const cachedGreeting = storageService.getGreetingCache(m.id);
                if (cachedGreeting) {
                    const nameForCache = cachedGreeting._cachedForName || '';
                    if (!nameForCache || nameForCache === m.name) setAiExperience(cachedGreeting);
                }
                loadMemberData(m.id);
            } catch {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Language Change ───
    useEffect(() => {
        if (member) {
            storageService.updateMember(member.id, { language });
            setAiExperience(null);
            lastAiExpArgs.current = '';
            loadAIExperience(member, validLogs, weatherData);
            setAiAnalysis(null);
            const currentAnalysisArgs = `${member.name}_${validLogs.length}_${getKSTHour()}_${language}`;
            lastAiAnalysisArgs.current = currentAnalysisArgs;
            storageService.getAIAnalysis(member.name, validLogs.length, validLogs, getKSTHour(), language, 'member')
                .then(analysis => setAiAnalysis(analysis))
                .catch(() => setAiAnalysis({ message: t('analysisPending'), isError: true }));

            if (notices.length > 0) {
                storageService.translateNotices(notices, language).then(setNotices);
            }
        }

        if (member && !auth.currentUser) {
            import("firebase/auth").then(({ signInAnonymously }) => {
                signInAnonymously(auth)
                    .then(() => {
                        if (Notification.permission === 'granted') {
                            storageService.requestPushPermission(member.id);
                        }
                    })
                    .catch(() => {});
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language, member?.id, member?.language]);

    // ─── Login / Logout ───
    const handleLogin = async (name, phone) => {
        setLoading(true);
        try {
            const result = await storageService.loginMember(name, phone);
            if (result.success) {
                const memberWithDisplay = {
                    ...result.member,
                    displayName: result.member.displayName || result.member.name
                };
                safeLocalStorage.setItem('member', JSON.stringify(memberWithDisplay));
                setMember(memberWithDisplay);
                loadMemberData(result.member.id);
                storageService.requestPushPermission(result.member.id).catch(() => {});
                return { success: true };
            } else {
                setLoading(false);
                return { success: false, message: result.message };
            }
        } catch (err) {
            console.error(err);
            setLoading(false);
            return { success: false, message: t('loginFailed') };
        }
    };

    const handleLogout = () => {
        safeLocalStorage.removeItem('member');
        setMember(null);
    };

    // ─── Push Toggle ───
    const handleNotificationToggle = async (checked) => {
        if (checked) {
            try {
                const result = await storageService.reregisterPushToken(member.id);
                if (result.success) {
                    setPushStatus('granted');
                    return { success: true };
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                return { success: false, message: error.message };
            }
        } else {
            setPushStatus('denied');
            return { success: true };
        }
    };

    return {
        // State
        member, loading, logs, validLogs, notices, images, weatherData,
        aiExperience, aiAnalysis, messages, pushStatus, daysRemaining,
        // Actions
        handleLogin, handleLogout, handleNotificationToggle,
        getTraditionalYogaMessage, setScheduleBranch: () => {},
        // Setters (for direct-use children)
        setMember, setNotices, setLogs,
    };
};
