import { useLanguageStore } from '../stores/useLanguageStore';\n/**
 * useMemberData — Data loading, real-time subscriptions, AI/Weather for MemberProfile
 * Extracted from MemberProfile.jsx to reduce its 1,162-line bulk by ~300 lines.
 */
import { useState, useEffect, useRef } from 'react';
import { onSnapshot, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { auth } from '../firebase';
import { tenantDb } from '../utils/tenantDb';
import { storageService } from '../services/storage';
import { safeLocalStorage } from '../utils/safeLocalStorage';
import { getDaysRemaining, getKSTHour, getKSTMonth, getKSTDayNameEN } from '../utils/dates';

/**
 * @param {Object} options
 * @param {Function} options.t - Translation function
 * @param {string} options.language - Current language code
 * @param {Function} options.setLoginFormValue - Setter for login form values
 * @returns {Object} Member data state and handlers
 */
export function useMemberData({ t, language, setLoginFormValue, setLoginForm }) {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [logLimit, setLogLimit] = useState(10);
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

  // AI dedup refs
  const lastAiExpArgs = useRef('');
  const lastAiAnalysisArgs = useRef('');

  // ── Traditional yoga greeting fallback ──
  const getTraditionalYogaMessage = () => {
    const hour = getKSTHour();
    const month = getKSTMonth();
    let timeMsg = '';
    if (hour >= 5 && hour < 9) timeMsg = t('trad_dawn');
    else if (hour >= 9 && hour < 12) timeMsg = t('trad_morning');
    else if (hour >= 12 && hour < 17) timeMsg = t('trad_afternoon');
    else if (hour >= 17 && hour < 21) timeMsg = t('trad_evening');
    else timeMsg = t('trad_night');

    let seasonMsg = '';
    if (month >= 3 && month <= 5) seasonMsg = t('season_spring');
    else if (month >= 6 && month <= 8) seasonMsg = t('season_summer');
    else if (month >= 9 && month <= 11) seasonMsg = t('season_autumn');
    else seasonMsg = t('season_winter');
    return timeMsg + seasonMsg;
  };

  // ── AI Experience Loader ──
  const loadAIExperience = async (m, attendanceData = null, wData = null) => {
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

      const exp = await storageService.getAIExperience(
        m.name, m.attendanceCount || validAttendance.length, day, hour,
        null,
        wData ? `${t('weather_' + wData.key)} (${wData.temp}°C)` : 'Sunny',
        m.credits || 0, getDaysRemaining(m.endDate), language,
        { streak, lastAttendanceAt: lastAtt }, 'profile'
      );
      if (exp) {
        setAiExperience(exp);
        storageService.setGreetingCache(m.id, { ...exp, _cachedForName: m.name });
      }
    } catch {
      setAiExperience({ message: getTraditionalYogaMessage(), bgTheme: 'sunny' });
    }
  };

  // ── Weather Fetcher ──
  const fetchWeather = async () => {
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current_weather=true');
      const data = await res.json();
      const wc = data.current_weather.weathercode;
      let key = 'clear';
      if (wc >= 1 && wc <= 3) key = 'partly_cloudy';
      if (wc > 3) key = 'cloudy';
      if (wc >= 45 && wc <= 48) key = 'fog';
      if (wc >= 51 && wc <= 67) key = 'rain';
      if (wc >= 71 && wc <= 77) key = 'snow';
      if (wc >= 95) key = 'thunderstorm';

      const wData = { key, temp: data.current_weather.temperature };
      setWeatherData(wData);
      return wData;
    } catch {
      return null;
    }
  };

  // ── Core data loader ──
  const loadMemberData = async (memberId) => {
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

        // Push self-healing
        if (typeof Notification !== 'undefined' && (Notification.permission === 'granted' || localStorage.getItem('push_enabled') === 'true')) {
          storageService.requestPushPermission(memberId).catch(() => {});
          setPushStatus('granted');
        }
      } else {
        setLoginFormValue('error', t('errorMemberNotFound'));
        safeLocalStorage.removeItem('member');
      }
    } catch (e) {
      console.error('Load member failed:', e);
      setLoginFormValue('error', t('unknownError'));
    } finally {
      setLoading(false);
    }
  };

  // ── Real-time Firestore subscriptions (member + attendance) ──
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
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(r => !r.deletedAt));
    });

    return () => { unsubMember(); unsubAttendance(); };
  }, [logLimit]);

  // ── Real-time messages + notices + images subscription ──
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.id]);

  // ── Merge messages + notices into single timeline ──
  useEffect(() => {
    const noticeMessages = notices.slice(0, 10).map(n => ({
      ...n, type: 'notice', content: n.content, timestamp: n.timestamp || n.date
    }));
    const allMessages = [...individualMessages, ...noticeMessages].sort(
      (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
    );
    setMessages(allMessages);
  }, [individualMessages, notices]);

  // ── Initial load from localStorage ──
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

  // ── Language change → re-fetch AI + translate notices ──
  useEffect(() => {
    if (member) {
      setAiExperience(null);
      const validLogs = logs.filter(l => l.status !== 'denied');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // ── Language preference sync ──
  useEffect(() => {
    if (member?.id && member.language !== language) {
      storageService.updateMember(member.id, { language });
    }
    if (member && !auth.currentUser) {
      import('firebase/auth').then(({ signInAnonymously }) => {
        signInAnonymously(auth).then(() => {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            storageService.requestPushPermission(member.id);
          }
        }).catch(() => {});
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, member?.id, member?.language]);

  // ── Login / Logout handlers ──
  const handleLogin = async (e) => {
    e.preventDefault();
    const trimmedName = (typeof e === 'object' ? null : e)?.name?.trim?.();
    // This is called with the form event, loginForm values come from the caller
  };

  const handleLogout = () => {
    if (window.confirm(t('logoutConfirm'))) {
      safeLocalStorage.removeItem('member');
      setMember(null);
      setLoginForm({ name: '', phone: '', error: '' });
    }
  };

  return {
    // State
    member, setMember,
    loading, setLoading,
    logs, setLogs,
    logLimit, setLogLimit,
    notices, setNotices,
    images, setImages,
    weatherData,
    aiExperience, setAiExperience,
    aiAnalysis,
    messages, setMessages,
    individualMessages,
    pushStatus, setPushStatus,
    // Functions
    loadMemberData,
    loadAIExperience,
    fetchWeather,
    handleLogout,
    getTraditionalYogaMessage,
  };
}
