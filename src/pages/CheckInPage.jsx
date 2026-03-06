import { useState, useEffect, useRef, useCallback } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';
import { storageService } from '../services/storage';
import { getAllBranches } from '../studioConfig';
import { getKSTHour, getDaysRemaining, safeParseDate } from '../utils/dates';
import { logError } from '../services/modules/errorModule';
import { getStaticStandbyMessage } from '../utils/aiStandbyHelper';
import { AIMessages } from '../constants/aiMessages';
import { CHECKIN_CONFIG } from '../constants/CheckInConfig';

// Hooks
import { useAlwaysOnGuardian } from '../hooks/useAlwaysOnGuardian';
import { useAttendanceCamera } from '../hooks/useAttendanceCamera';
import { useNetworkMonitor } from '../hooks/useNetworkMonitor';
import { useTTS } from '../hooks/useTTS';
import { useNetwork } from '../context/NetworkContext';
import { usePWA } from '../hooks/usePWA';

// Components (Ultra-Modular)
import TopBar from '../components/checkin/TopBar';
import CheckInInfoSection from '../components/checkin/CheckInInfoSection';
import CheckInKeypadSection from '../components/checkin/CheckInKeypadSection';
import MessageOverlay from '../components/checkin/MessageOverlay';
import SelectionModal from '../components/checkin/SelectionModal';
import DuplicateConfirmModal from '../components/checkin/DuplicateConfirmModal';
import InstructorQRModal from '../components/InstructorQRModal';
import KioskInstallGuideModal from '../components/checkin/KioskInstallGuideModal';

// Assets
import logoWide from '../assets/logo_wide.png';
import rys200Logo from '../assets/RYS200.png';

const getBgForPeriod = (p) => {
    switch (p) {
        case 'morning': return import('../assets/bg_morning.webp');
        case 'afternoon': return import('../assets/bg_afternoon.webp');
        case 'evening': return import('../assets/bg_evening.webp');
        default: return import('../assets/bg_night.webp');
    }
};

const CheckInPage = () => {
    const BUILD_VERSION = '2026.03.07.v1';
    
    // States
    const [pin, setPin] = useState('');
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [currentBranch, setCurrentBranch] = useState(() => storageService.getKioskBranch());
    const [duplicateMembers, setDuplicateMembers] = useState([]);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [weather, setWeather] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [aiExperience, setAiExperience] = useState(null);
    const [aiEnhancedMsg, setAiEnhancedMsg] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [kioskSettings, setKioskSettings] = useState({ active: false, imageUrl: null });
    const [kioskNoticeHidden, setKioskNoticeHidden] = useState(false);
    const [showInstructorQR, setShowInstructorQR] = useState(false);
    const [keypadLocked, setKeypadLocked] = useState(false);
    const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
    const [showKioskInstallGuide, setShowKioskInstallGuide] = useState(false);
    const [pendingPin, setPendingPin] = useState(null);
    const [duplicateTimer, setDuplicateTimer] = useState(25);
    const [isDuplicateFlow, setIsDuplicateFlow] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('출석 확인 중...');
    const [period, setPeriod] = useState(() => {
        const h = getKSTHour();
        if (h >= 6 && h < 12) return 'morning';
        if (h >= 12 && h < 17) return 'afternoon';
        if (h >= 17 && h < 21) return 'evening';
        return 'night';
    });
    const [bgImage, setBgImage] = useState(null);

    // Refs
    const timerRef = useRef(null);
    const duplicateAutoCloseRef = useRef(null);
    const recentCheckInsRef = useRef([]);
    const autoUpdateRef = useRef({ pin, message, loading, showSelectionModal, showDuplicateConfirm });

    // Hooks Init
    const { needRefresh, updateServiceWorker } = usePWA();
    const { checkConnection } = useNetworkMonitor();
    const { setIsOnline } = useNetwork();
    const { speak } = useTTS();
    const { videoRef, canvasRef, capturePhoto, uploadPhoto } = useAttendanceCamera(true);
    const language = CHECKIN_CONFIG.LOCALE;
    const branches = getAllBranches();
    const qrCodeUrl = `${CHECKIN_CONFIG.ASSETS.QR_CODE_BASE_URL}?${CHECKIN_CONFIG.ASSETS.QR_CODE_PARAMS}&data=${encodeURIComponent(window.location.origin + '/member')}`;

    // Effects
    useEffect(() => { autoUpdateRef.current = { pin, message, loading, showSelectionModal, showDuplicateConfirm }; }, [pin, message, loading, showSelectionModal, showDuplicateConfirm]);
    
    useEffect(() => {
        const init = async () => {
            try { await signInAnonymously(auth); } catch (e) {}
            await storageService.initialize({ mode: 'kiosk' });
            setIsReady(true);
            fetchWeatherAndAI();
        };
        init();
        const vh = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        vh(); window.addEventListener('resize', vh);
        return () => window.removeEventListener('resize', vh);
    }, []);

    useEffect(() => {
        getBgForPeriod(period).then(m => setBgImage(m.default));
    }, [period]);

    // Business Logic: Full Restoration
    const loadAIExperience = async (name = "방문 회원", credits = null, days = null, w = null) => {
        const isStandby = name === "방문 회원";
        try {
            const h = getKSTHour();
            if (h < CHECKIN_CONFIG.SERVICE_HOURS.AI_READY_START || h >= CHECKIN_CONFIG.SERVICE_HOURS.AI_READY_END) {
                setAiExperience({ message: AIMessages.FALLBACK_MESSAGE_OUTSIDE_BUSINESS_HOURS, isFallback: true });
                return;
            }
            const info = await storageService.getCurrentClass(currentBranch);
            const title = info?.title || "자율수련";
            if (isStandby) {
                const staticMsg = getStaticStandbyMessage(h, w?.weathercode || '0', title);
                setAiExperience({ message: staticMsg, isFallback: true });
                setAiLoading(true);
                storageService.getAIExperience(name, 0, '오늘', h, title, w, null, null, language, null, 'visitor', 'checkin')
                    .then(res => { if (res?.message && !res.isFallback) setAiEnhancedMsg(res.message.replace(/나마스테[.]?\s*🙏?/gi, '').trim()); })
                    .finally(() => setAiLoading(false));
            } else {
                const exp = await storageService.getAIExperience(name, 0, '오늘', h, title, w, credits, days, language, null, 'member', 'checkin');
                if (exp) setAiExperience({ ...exp, message: exp.message.replace(/나마스테[.]?\s*🙏?/gi, '').trim() });
            }
        } catch (e) {}
    };

    const fetchWeatherAndAI = async () => {
        try {
            const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current_weather=true');
            const d = await r.json();
            setWeather(d.current_weather);
            loadAIExperience("방문 회원", null, null, d.current_weather);
        } catch (e) { loadAIExperience(); }
    };

    const handleModalClose = useCallback((action) => {
        setKeypadLocked(true);
        action();
        setPin('');
        setAiEnhancedMsg(null);
        setAiLoading(false);
        setTimeout(() => setKeypadLocked(false), 350);
    }, []);

    const showCheckInSuccess = (res, isDup = false) => {
        const m = res.member;
        const credits = m.credits ?? 0;
        let daysLeft = 999;
        if (m.endDate) {
            const end = safeParseDate(m.endDate);
            const now = new Date(); now.setHours(0,0,0,0); end.setHours(0,0,0,0);
            daysLeft = Math.ceil((end - now) / 86400000);
        }

        let msg = "오늘의 수련이 시작됩니다.";
        if (isDup) { msg = "연속 출석입니다."; speak("duplicate"); }
        else if (daysLeft < 0) { msg = "기간이 만료되었습니다."; speak("denied"); }
        else if (credits < 0) { msg = "잔여 횟수가 없습니다."; speak("denied"); }
        else if (credits === 0 || daysLeft === 0) { msg = "오늘 마지막 수련 후 재등록이 필요합니다."; speak("last_session"); }
        else { speak("success"); }

        setMessage({ type: 'success', member: m, text: `${m.name}님`, subText: msg });
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => handleModalClose(() => setMessage(null)), CHECKIN_CONFIG.TIMEOUTS.SUCCESS_MODAL);

        storageService.getAIExperience(m.name, m.attendanceCount, '오늘', getKSTHour(), null, weather, credits, daysLeft, language, null, 'member', 'checkin')
            .then(ai => { if (ai?.message && !ai.isFallback) setAiEnhancedMsg(ai.message.replace(/나마스테[.]?\s*🙏?/gi, '').trim()); })
            .finally(() => setAiLoading(false));
    };

    const proceedWithCheckIn = async (p, isDup = false) => {
        setLoading(true);
        try {
            const members = await storageService.findMembersByPhone(p);
            if (members.length === 0) {
                setMessage({ type: 'error', text: '회원 정보를 찾을 수 없습니다.' });
                speak("error");
                return;
            }
            if (members.length > 1) {
                setDuplicateMembers(members);
                setIsDuplicateFlow(isDup);
                setShowSelectionModal(true);
                return;
            }
            const res = await storageService.checkInById(members[0].id, currentBranch, isDup);
            if (res.success) {
                setIsOnline(!res.isOffline);
                if (res.attendanceStatus === 'denied') {
                    uploadPhoto(res.attendanceId, res.member?.name, 'denied');
                    setMessage({ type: 'error', text: '기간 혹은 횟수가 만료되었습니다.' });
                    speak("denied");
                } else {
                    recentCheckInsRef.current.push({ pin: p, timestamp: Date.now() });
                    uploadPhoto(res.attendanceId, res.member?.name, 'valid');
                    showCheckInSuccess(res, isDup);
                }
            } else {
                setMessage({ type: 'error', text: res.message });
                speak("error");
            }
        } catch (e) { logError(e, { context: 'Kiosk', branch: currentBranch }); }
        finally { setLoading(false); }
    };

    const handleSubmit = useCallback((p) => {
        const pinCode = p || pin;
        if (pinCode.length !== 4 || loading) return;
        capturePhoto();
        const isDup = recentCheckInsRef.current.some(e => e.pin === pinCode && (Date.now() - e.timestamp) < CHECKIN_CONFIG.TIMEOUTS.DUPLICATE_CHECK);
        if (isDup) {
            setPendingPin(pinCode);
            setShowDuplicateConfirm(true);
            setDuplicateTimer(25);
            if (duplicateAutoCloseRef.current) clearInterval(duplicateAutoCloseRef.current);
            duplicateAutoCloseRef.current = setInterval(() => setDuplicateTimer(v => v - 1), 1000);
        } else {
            proceedWithCheckIn(pinCode);
        }
    }, [pin, loading, currentBranch]);

    const handleKeyPress = useCallback((n) => {
        setPin(prev => {
            if (prev.length === 0) { checkConnection(); capturePhoto(); }
            const next = prev + n;
            if (next.length === 4) handleSubmit(next);
            return next.length <= 4 ? next : prev;
        });
    }, [handleSubmit, checkConnection]);

    const closeMessage = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        handleModalClose(() => setMessage(null));
    }, [handleModalClose]);

    // Guard & PWA
    useAlwaysOnGuardian(isReady, () => storageService.checkKioskSettings(currentBranch));

    // [CRITICAL FIX] Memory/CPU Leak - Clear interval when modal closes or timer hits 0
    useEffect(() => { 
        if (!showDuplicateConfirm) {
            if (duplicateAutoCloseRef.current) {
                clearInterval(duplicateAutoCloseRef.current);
                duplicateAutoCloseRef.current = null;
            }
            return;
        }
        
        if (duplicateTimer <= 0) { 
            setShowDuplicateConfirm(false); 
            proceedWithCheckIn(pendingPin, true); 
        } 
    }, [duplicateTimer, showDuplicateConfirm, pendingPin]);

    // Final Poetic Render
    return (
        <div className="checkin-wrapper" style={{ position: 'relative', width: '100%', height: 'calc(var(--vh, 1vh) * 100)', minHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#000' }}>
            <div className="bg-container" style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
                <img src={bgImage} alt="bg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
            </div>

            <TopBar weather={weather} currentBranch={currentBranch} branches={branches} handleBranchChange={c => { setCurrentBranch(c); storageService.setKioskBranch(c); }} toggleFullscreen={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }} language="ko" onInstructorClick={() => setShowInstructorQR(true)} />

            <div className="checkin-content" style={{ zIndex: 5, flex: 1, display: 'flex', gap: '2vh', padding: '3vh 3vw 5vh', width: '100%', alignItems: 'stretch', overflow: 'hidden' }}>
                <CheckInInfoSection pin={pin} loading={loading} aiExperience={aiExperience} aiEnhancedMsg={aiEnhancedMsg} aiLoading={aiLoading} rys200Logo={rys200Logo} logoWide={logoWide} qrCodeUrl={qrCodeUrl} handleQRInteraction={() => setShowKioskInstallGuide(true)} />
                <CheckInKeypadSection pin={pin} loading={loading} isReady={isReady} loadingMessage={loadingMessage} keypadLocked={keypadLocked} showSelectionModal={showSelectionModal} message={message} handleKeyPress={handleKeyPress} handleClear={() => setPin(p => p.slice(0, -1))} handleSubmit={handleSubmit} />
            </div >

            <SelectionModal show={showSelectionModal} duplicateMembers={duplicateMembers} loading={loading} onClose={() => setShowSelectionModal(false)} onSelect={id => { setShowSelectionModal(false); proceedWithCheckIn(pin, isDuplicateFlow); }} />
            <MessageOverlay message={message} onClose={closeMessage} aiExperience={aiExperience} />
            <DuplicateConfirmModal show={showDuplicateConfirm} duplicateTimer={duplicateTimer} onCancel={() => { setShowDuplicateConfirm(false); setPin(''); }} onConfirm={() => { setShowDuplicateConfirm(false); proceedWithCheckIn(pendingPin, true); }} />
            
            {kioskSettings?.active && kioskSettings?.imageUrl && !kioskNoticeHidden && !message && (
                <div onClick={() => setKioskNoticeHidden(true)} style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={kioskSettings.imageUrl} alt="notice" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
            )}

            <KioskInstallGuideModal isOpen={showKioskInstallGuide} onClose={() => setShowKioskInstallGuide(false)} />
            <InstructorQRModal isOpen={showInstructorQR} onClose={() => setShowInstructorQR(false)} />
            <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{ display: 'none' }} data-version={BUILD_VERSION}>{BUILD_VERSION}</div>
        </div>
    );
};

export default CheckInPage;

/**
 * [BUILD-FIX] Attach unminifiable property to component object to defeat tree-shaking
 * This guarantees Rollup will generate a new chunk hash, forcing Workbox to update!
 */
CheckInPage.__buildVersion = '2026.03.07.v1';
