import { useState, useEffect, useRef, useCallback } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';
import { storageService } from '../services/storage';
import { getKSTHour, getDaysRemaining, safeParseDate } from '../utils/dates';
import { logError } from '../services/modules/errorModule';
import { getStaticStandbyMessage } from '../utils/aiStandbyHelper';
import { AIMessages } from '../constants/aiMessages';
import { CHECKIN_CONFIG } from '../constants/CheckInConfig';
import { extractFaceDescriptor, findBestMatch, loadFacialModels } from '../services/facialService';
import { memberService } from '../services/memberService';

// Hooks
import { useAlwaysOnGuardian } from '../hooks/useAlwaysOnGuardian';
import { useAttendanceCamera } from '../hooks/useAttendanceCamera';
import { useNetworkMonitor } from '../hooks/useNetworkMonitor';
import { useTTS } from '../hooks/useTTS';
import { useNetwork } from '../contexts/NetworkContext';
import { usePWA } from '../hooks/usePWA';
import { useStudioConfig } from '../contexts/StudioContext';

// Components (Ultra-Modular)
import TopBar from '../components/checkin/TopBar';
import CheckInInfoSection from '../components/checkin/CheckInInfoSection';
import CheckInKeypadSection from '../components/checkin/CheckInKeypadSection';
import MessageOverlay from '../components/checkin/MessageOverlay';
import SelectionModal from '../components/checkin/SelectionModal';
import DuplicateConfirmModal from '../components/checkin/DuplicateConfirmModal';
import InstructorQRModal from '../components/InstructorQRModal';
import KioskInstallGuideModal from '../components/checkin/KioskInstallGuideModal';

const CheckInPage = () => {
    const { config } = useStudioConfig();
    const BUILD_VERSION = config.IDENTITY?.APP_VERSION;
    const logoWide = config.ASSETS?.LOGO?.WIDE || '/assets/logo_wide.webp';
    const rys200Logo = config.ASSETS?.LOGO?.RYS200 || '/assets/RYS200.webp';
    const branches = config.BRANCHES || [];

    const getBgForPeriod = (p) => {
        const bgKey = p.toUpperCase();
        return config.ASSETS?.BACKGROUNDS?.[bgKey] || config.ASSETS?.BACKGROUNDS?.NIGHT;
    };
    
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
    const [duplicateTimer, setDuplicateTimer] = useState(config.POLICIES?.SESSION_AUTO_CLOSE_SEC || 25);
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
    const [isOnline, setIsOnline] = useState(true);
    const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);

    // Refs
    const timerRef = useRef(null);
    const duplicateAutoCloseRef = useRef(null);
    const recentCheckInsRef = useRef([]);
    const autoUpdateRef = useRef({ pin, message, loading, showSelectionModal, showDuplicateConfirm });
    const lastDescriptorRef = useRef(null);
    const activeTaskIdRef = useRef(0); // [FACIAL] Track latest task ID to abort stale extractions
    const pinRef = useRef(pin); // [PERF] Keep track of latest pin for stable callbacks

    // Hooks Init
    const { needRefresh, updateServiceWorker } = usePWA();
    const { checkConnection } = useNetworkMonitor();
    const { setIsOnline: setNetworkStatus } = useNetwork(); // Renamed to avoid conflict with local state
    const { speak } = useTTS();
    const { videoRef, canvasRef, capturePhoto, uploadPhoto } = useAttendanceCamera(true);
    const language = CHECKIN_CONFIG.LOCALE;
    const qrCodeUrl = `${CHECKIN_CONFIG.ASSETS.QR_CODE_BASE_URL}?${CHECKIN_CONFIG.ASSETS.QR_CODE_PARAMS}&data=${encodeURIComponent(window.location.origin + '/member')}`;

    // Effects
    useEffect(() => { 
        autoUpdateRef.current = { pin, message, loading, showSelectionModal, showDuplicateConfirm }; 
        pinRef.current = pin;
    }, [pin, message, loading, showSelectionModal, showDuplicateConfirm]);
    
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

    // [FACIAL] Background load models to avoid lag later
    useEffect(() => {
        loadFacialModels().then(() => setFaceModelsLoaded(true));
    }, []);

    // [AUTO-UPDATE] Automatically reload when a new PWA version is detected
    // [SAFETY] Don't reload if user is interacting (typing PIN, modal open, or message shown)
    useEffect(() => {
        const isInteracting = pin.length > 0 || !!message || showSelectionModal || showDuplicateConfirm || showInstructorQR || showKioskInstallGuide;
        
        if (needRefresh && !isInteracting) {
            console.log('[PWA] New version detected, updating safely...');
            updateServiceWorker(true);
        }
    }, [needRefresh, updateServiceWorker, pin, message, showSelectionModal, showDuplicateConfirm, showInstructorQR, showKioskInstallGuide]);

    useEffect(() => {
        setBgImage(getBgForPeriod(period));
    }, [period]);

    // [FIX] Kiosk Notice Image Subscriber
    useEffect(() => {
        if (!isReady) return;
        
        let unsubscribeBranch = null;
        let unsubscribeAll = null;

        // 1. First listen to branch specific settings
        unsubscribeBranch = storageService.subscribeToKioskSettings(currentBranch, (branchData) => {
            if (branchData && branchData.active && branchData.imageUrl) {
                setKioskSettings(branchData);
                setKioskNoticeHidden(false);
            } else {
                // 2. If branch is off, listen to 'all' shared settings
                unsubscribeAll = storageService.subscribeToKioskSettings('all', (allData) => {
                    if (allData && allData.active && allData.imageUrl) {
                        setKioskSettings(allData);
                        setKioskNoticeHidden(false);
                    } else {
                        setKioskSettings({ active: false, imageUrl: null });
                    }
                });
            }
        });

        return () => {
            if (unsubscribeBranch) unsubscribeBranch();
            if (unsubscribeAll) unsubscribeAll();
        };
    }, [isReady, currentBranch]);

    // [FIX] Kiosk Notice Auto-Restore Timer (5 minutes)
    useEffect(() => {
        if (!kioskSettings?.active || !kioskNoticeHidden || message || showSelectionModal || showDuplicateConfirm) return;

        let idleTimer;
        const resetNoticeTimer = () => {
            clearTimeout(idleTimer);
            if (kioskNoticeHidden) {
                idleTimer = setTimeout(() => setKioskNoticeHidden(false), 5 * 60 * 1000); // 5 minutes
            }
        };

        resetNoticeTimer();
        window.addEventListener('touchstart', resetNoticeTimer, { passive: true });
        window.addEventListener('mousedown', resetNoticeTimer, { passive: true });
        window.addEventListener('keydown', resetNoticeTimer, { passive: true });

        return () => {
            clearTimeout(idleTimer);
            window.removeEventListener('touchstart', resetNoticeTimer);
            window.removeEventListener('mousedown', resetNoticeTimer);
            window.removeEventListener('keydown', resetNoticeTimer);
        };
    }, [kioskSettings?.active, kioskNoticeHidden, message, showSelectionModal, showDuplicateConfirm]);

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

    const showCheckInSuccess = async (res, isDup = false) => {
        const m = res.member;
        const credits = m.credits ?? 0;
        let daysLeft = 999;
        if (m.endDate) {
            const end = safeParseDate(m.endDate);
            const now = new Date(); now.setHours(0,0,0,0); end.setHours(0,0,0,0);
            daysLeft = Math.ceil((end - now) / 86400000);
        }

        let msg = "오늘의 수련이 시작됩니다.";
        if (isDup) { 
            msg = "반가워요! 이미 출석 확인이 완료되었습니다."; 
            speak("duplicate"); 
        }
        else if (daysLeft < 0) { 
            msg = "수련권 기간이 완료되었습니다. 선생님께서 안내를 도와드릴게요."; 
            speak("denied"); 
        }
        else if (credits < 0) { 
            msg = "수련 횟수가 모두 소진되었습니다. 선생님께서 안내를 도와드릴게요."; 
            speak("denied"); 
        }
        else if (credits === 0 || daysLeft === 0) { 
            msg = "오늘이 이번 수련권의 마지막 날이네요. 정성 가득한 수련 되세요!"; 
            speak("last_session"); 
        }
        else { speak("success"); }

        // [UX] Delay visual rendering slightly so the TTS audio can load and play in sync.
        await new Promise(r => setTimeout(r, 300));

        setMessage({ type: 'success', member: m, text: `${m.name}님`, subText: msg });
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => handleModalClose(() => setMessage(null)), CHECKIN_CONFIG.TIMEOUTS.SUCCESS_MODAL);

        storageService.getAIExperience(m.name, m.attendanceCount, '오늘', getKSTHour(), null, weather, credits, daysLeft, language, null, 'member', 'checkin')
            .then(ai => { if (ai?.message && !ai.isFallback) setAiEnhancedMsg(ai.message.replace(/나마스테[.]?\s*🙏?/gi, '').trim()); })
            .finally(() => setAiLoading(false));
    };

    const proceedWithCheckIn = async (p, isDup = false, memberIdToForce = null, facialTask = null) => {
        setLoading(true);
        try {
            // [FACIAL] Await descriptor if still in flight (max 1.5s timeout)
            if (facialTask && !lastDescriptorRef.current) {
                try {
                    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
                    await Promise.race([facialTask, timeout]);
                } catch (e) {
                    console.warn('[FACIAL] Extraction timed out or failed');
                }
            }

            let targetMemberId = memberIdToForce;
            let isFacialMatch = false;

            if (!targetMemberId) {
                let members = [];
                try {
                    members = await storageService.findMembersByPhone(p);
                } catch (lookupErr) {
                    console.error('[CheckInPage] findMembersByPhone failed:', lookupErr);
                    members = [];
                }
                
                if (members.length === 0) {
                    speak("error");
                    await new Promise(r => setTimeout(r, 300));
                    setMessage({ type: 'error', text: '회원 정보를 찾을 수 없습니다.' });
                    return;
                }
                if (members.length > 1) {
                    // [FACIAL] Try auto-resolution if models and current descriptor are ready
                    if (faceModelsLoaded && lastDescriptorRef.current) {
                        const bestMatch = findBestMatch(lastDescriptorRef.current, members);
                        if (bestMatch) {
                            console.log(`[FACIAL] Auto-resolved duplicate PIN to: ${bestMatch.name}`);
                            targetMemberId = bestMatch.id;
                            isFacialMatch = true;
                        }
                    }

                    if (!targetMemberId) {
                        setDuplicateMembers(members);
                        setIsDuplicateFlow(isDup);
                        setShowSelectionModal(true);
                        return;
                    }
                } else {
                    targetMemberId = members[0].id;
                }
            }

            const safeUUID = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            const currentEventId = safeUUID();
            const res = await storageService.checkInById(targetMemberId, currentBranch, isDup, currentEventId, isFacialMatch);
            if (res.success) {
                setIsOnline(!res.isOffline);
                if (res.attendanceStatus === 'denied') {
                    uploadPhoto(res.attendanceId, res.member?.name, 'denied');
                    speak("denied");
                    await new Promise(r => setTimeout(r, 300));
                    setMessage({ type: 'error', text: '기간 혹은 횟수가 만료되었습니다.' });
                } else {
                    recentCheckInsRef.current.push({ pin: p, timestamp: Date.now() });
                    uploadPhoto(res.attendanceId, res.member?.name, 'valid');
                    await showCheckInSuccess(res, isDup);

                    // [FACIAL] Background Data Collection
                    // If unique match and member lacks face data, save it silently
                    if (faceModelsLoaded && lastDescriptorRef.current && !res.member?.faceDescriptor) {
                        memberService.updateFaceDescriptor(targetMemberId, lastDescriptorRef.current);
                    }
                }
            } else {
                speak("error");
                await new Promise(r => setTimeout(r, 300));
                setMessage({ type: 'error', text: res.message });
            }
        } catch (e) {
            logError(e, { context: 'Kiosk', branch: currentBranch });
            console.error('[CheckInPage] proceedWithCheckIn error:', e);
            speak("error");
            setMessage({ type: 'error', text: '시스템 오류가 발생했습니다. 다시 시도해주세요.' });
        }
        finally { setLoading(false); }
    };

    const handleSubmit = useCallback((p) => {
        const pinCode = typeof p === 'string' ? p : pinRef.current; // [PERF] Use ref instead of state to prevent re-creation
        if (pinCode.length !== 4 || loading) return;
        
        // [FACIAL] Abort previous extraction and start new one with a unique ID
        const taskId = ++activeTaskIdRef.current;
        let facialTask = null;
        if (faceModelsLoaded && videoRef.current) {
            facialTask = extractFaceDescriptor(videoRef.current).then(desc => {
                if (taskId === activeTaskIdRef.current) {
                    lastDescriptorRef.current = desc;
                    return desc;
                }
                console.log(`[FACIAL] Aborting stale task ${taskId}`);
                return null;
            });
        }

        // [PERF] Delay heavy synchronous photo DOM access to not block keypad frame update
        setTimeout(() => capturePhoto(), 0);
        
        const isDup = recentCheckInsRef.current.some(e => e.pin === pinCode && (Date.now() - e.timestamp) < CHECKIN_CONFIG.TIMEOUTS.DUPLICATE_CHECK);
        if (isDup) {
            setPendingPin(pinCode);
            setShowDuplicateConfirm(true);
            setDuplicateTimer(config.POLICIES?.SESSION_AUTO_CLOSE_SEC || 25);
            if (duplicateAutoCloseRef.current) clearInterval(duplicateAutoCloseRef.current);
            duplicateAutoCloseRef.current = setInterval(() => setDuplicateTimer(v => v - 1), 1000);
        } else {
            proceedWithCheckIn(pinCode, false, null, facialTask);
        }
    }, [loading, currentBranch, config.POLICIES, faceModelsLoaded, capturePhoto]);

    const handleKeyPress = useCallback((n) => {
        if (pinRef.current.length === 0) { 
            checkConnection(); 
            // [PERF] Move Heavy Canvas Logic to the next tick to prevent keypad lag
            setTimeout(() => {
                capturePhoto();
                // [FACIAL] Proactive extraction: Start AI logic as soon as user starts typing, but defer to avoid freezing the first keystroke
                if (faceModelsLoaded && videoRef.current) {
                    const taskId = ++activeTaskIdRef.current;
                    extractFaceDescriptor(videoRef.current).then(desc => {
                        if (taskId === activeTaskIdRef.current) {
                            lastDescriptorRef.current = desc;
                        }
                    }).catch(() => {});
                }
            }, 50);
        }
        setPin(prev => {
            const next = prev + n;
            if (next.length === 4) handleSubmit(next);
            return next.length <= 4 ? next : prev;
        });
    }, [handleSubmit, checkConnection, faceModelsLoaded, capturePhoto]);

    const handleClear = useCallback(() => {
        setPin(p => p.slice(0, -1));
    }, []);

    const closeMessage = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        handleModalClose(() => setMessage(null));
    }, [handleModalClose]);

    // Guard & PWA
    useAlwaysOnGuardian(isReady);


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
                <CheckInKeypadSection pin={pin} loading={loading} isReady={isReady} loadingMessage={loadingMessage} keypadLocked={keypadLocked} showSelectionModal={showSelectionModal} message={message} handleKeyPress={handleKeyPress} handleClear={handleClear} handleSubmit={handleSubmit} />
            </div >

            <SelectionModal show={showSelectionModal} duplicateMembers={duplicateMembers} loading={loading} onClose={() => setShowSelectionModal(false)} onSelect={id => { setShowSelectionModal(false); proceedWithCheckIn(pin, isDuplicateFlow, id); }} />
            <MessageOverlay message={message} onClose={closeMessage} aiExperience={aiExperience} />
            <DuplicateConfirmModal show={showDuplicateConfirm} duplicateTimer={duplicateTimer} onCancel={() => { setShowDuplicateConfirm(false); setPin(''); }} onConfirm={() => { setShowDuplicateConfirm(false); proceedWithCheckIn(pendingPin, true); }} />
            
            {kioskSettings?.active && kioskSettings?.imageUrl && !kioskNoticeHidden && !message && (
                <div onClick={() => setKioskNoticeHidden(true)} style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <img src={kioskSettings.imageUrl} alt="notice" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    <div style={{ position: 'absolute', bottom: '6vh', background: 'rgba(0, 0, 0, 0.85)', color: 'white', padding: '16px 36px', borderRadius: '50px', fontSize: '1.6rem', fontWeight: 'bold', border: '3px solid rgba(212,175,55,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
                        <span style={{ fontSize: '2rem' }}>👆</span> 화면을 터치하면 출석부로 이동합니다
                    </div>
                </div>
            )}

            <KioskInstallGuideModal isOpen={showKioskInstallGuide} onClose={() => setShowKioskInstallGuide(false)} />
            <InstructorQRModal isOpen={showInstructorQR} onClose={() => setShowInstructorQR(false)} />
            <video ref={videoRef} autoPlay playsInline muted style={{ position: 'fixed', left: '0', top: '0', width: '1px', height: '1px', opacity: 0.01, zIndex: -100, pointerEvents: 'none' }} />
            <canvas ref={canvasRef} style={{ position: 'fixed', left: '0', top: '0', width: '1px', height: '1px', opacity: 0.01, zIndex: -100, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '2px', right: '8px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none', zIndex: 3001 }}>v{BUILD_VERSION}</div>
        </div>
    );
};

export default CheckInPage;

/**
 * [BUILD-FIX] Attach unminifiable property to component object to defeat tree-shaking
 * This guarantees Rollup will generate a new chunk hash, forcing Workbox to update!
 */
CheckInPage.__buildVersion = '2026.03.09.v1';
