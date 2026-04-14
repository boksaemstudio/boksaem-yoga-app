import { useState, useEffect, useRef, useCallback } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';
import { storageService } from '../services/storage';
import { getKSTHour, safeParseDate } from '../utils/dates';
import { isMemberActive } from '../utils/adminCalculations';
import { useLanguageStore } from '../stores/useLanguageStore';
import { getStaticStandbyMessage } from '../utils/aiStandbyHelper';
import { AIMessages } from '../constants/aiMessages';
import { CHECKIN_CONFIG } from '../constants/CheckInConfig';
import { extractFaceDescriptor } from '../services/facialService';
import { memberService } from '../services/memberService';

// Hooks
import { useAlwaysOnGuardian } from '../hooks/useAlwaysOnGuardian';
import { useAttendanceCamera } from '../hooks/useAttendanceCamera';
import { useNetworkMonitor } from '../hooks/useNetworkMonitor';
import { useTTS } from '../hooks/useTTS';
import { useFacialRecognition } from '../hooks/useFacialRecognition';
import { useKioskNotice } from '../hooks/useKioskNotice';
import { useProximityReturn } from '../hooks/useProximityReturn';
import { usePWA } from '../hooks/usePWA';
import { useStudioConfig } from '../contexts/StudioContext';

// Components (Ultra-Modular)
import TopBar from '../components/checkin/TopBar';
import { subscribeMonthlyClasses } from '../services/scheduleService';
import CheckInInfoSection from '../components/checkin/CheckInInfoSection';
import CheckInKeypadSection from '../components/checkin/CheckInKeypadSection';
import MessageOverlay from '../components/checkin/MessageOverlay';
import SelectionModal from '../components/checkin/SelectionModal';
import DuplicateConfirmModal from '../components/checkin/DuplicateConfirmModal';
import InstructorQRModal from '../components/InstructorQRModal';
import KioskInstallGuideModal from '../components/checkin/KioskInstallGuideModal';
import FaceRegistrationModal from '../components/checkin/FaceRegistrationModal';
const CheckInPage = () => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const {
    speak
  } = useTTS();
  const logoWide = config.ASSETS?.LOGO?.WIDE || '/assets/passflow_logo.png';
  // [SaaS] 키오스크 로고: 관리자앱 키오스크 탭에서 설정한 로고 배열 우선
  // 없으면 가로형 로고(WIDE) fallback — IDENTITY.LOGO_URL은 흰배경 정사각형이라 키오스크 검은 배경에 안 어울림
  const kioskLogos = (() => {
    const logos = (config.KIOSK?.LOGOS || []).filter(Boolean);
    if (logos.length > 0) return logos;
    // fallback: 설정 메뉴의 스튜디오 로고 -> 가로형 로고
    const fallback = config.IDENTITY?.LOGO_URL || logoWide;
    return fallback ? [fallback] : [];
  })();
  const branches = config.BRANCHES || [];
  // [FIX] FACE_RECOGNITION_ENABLED만으로 얼굴 인식 활성화 (SHOW_CAMERA_PREVIEW는 프리뷰 표시만 제어)
  const faceRecognitionEnabled = config.POLICIES?.FACE_RECOGNITION_ENABLED === true;
  const getBgForPeriod = p => {
    const bgKey = p.toUpperCase();
    return config.ASSETS?.BACKGROUNDS?.[bgKey] || config.ASSETS?.BACKGROUNDS?.NIGHT;
  };

  // States
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentBranch, setCurrentBranch] = useState(() => {
    const saved = storageService.getKioskBranch();
    if (saved) return saved;
    if (branches.length === 1) {
      storageService.setKioskBranch(branches[0].id);
      return branches[0].id;
    }
    return null;
  });
  const [duplicateMembers, setDuplicateMembers] = useState([]);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [weather, setWeather] = useState(null);
  const [aiExperience, setAiExperience] = useState(null);
  const [aiEnhancedMsg, setAiEnhancedMsg] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showInstructorQR, setShowInstructorQR] = useState(false);
  const [keypadLocked, setKeypadLocked] = useState(false);
  const [showFaceRegModal, setShowFaceRegModal] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [showKioskInstallGuide, setShowKioskInstallGuide] = useState(false);
  const [pendingPin, setPendingPin] = useState(null);
  const [duplicateTimer, setDuplicateTimer] = useState(config.POLICIES?.SESSION_AUTO_CLOSE_SEC || 25);
  const [isDuplicateFlow, setIsDuplicateFlow] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(t('checkin_verifying') || t("g_a03db7") || "\uCD9C\uC11D \uD655\uC778 \uC911...");
  // [안면인식 확인 모달] 중신뢰 매칭 시 "OO회원님 맞나요?" 표시
  const [faceConfirmMember, setFaceConfirmMember] = useState(null);
  const [period, setPeriod] = useState(() => {
    const h = getKSTHour();
    if (h >= 6 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 21) return 'evening';
    return 'night';
  });
  const [bgImage, setBgImage] = useState(null);
  const [monthlyClasses, setMonthlyClasses] = useState({});
  const [isOperatingHours, setIsOperatingHours] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Refs
  const timerRef = useRef(null);
  const duplicateAutoCloseRef = useRef(null);
  const recentCheckInsRef = useRef([]);
  const autoUpdateRef = useRef({
    isIdle: true,
    pin: ''
  });
  const pinRef = useRef(pin);
  const warmupTriggered = useRef(false);

  // Custom Hooks
  const pwaContext = usePWA();
  const {
    checkConnection
  } = useNetworkMonitor();
  const {
    kioskSettings,
    rawKioskSettings,
    kioskNoticeHidden,
    setKioskNoticeHidden
  } = useKioskNotice({
    isReady,
    currentBranch,
    message,
    showSelectionModal,
    showDuplicateConfirm
  });

  // ── Kiosk Operating Hours (Auto Sleep/Wake) ──
  useEffect(() => {
    const checkOperatingHours = () => {
      if (!rawKioskSettings?.autoOnOff) {
        if (!isOperatingHours) setIsOperatingHours(true);
        return;
      }
      const now = new Date();
      // Create time string 'HH:mm' handling 24-hr layout properly
      let h = now.getHours();
      let m = now.getMinutes();
      const currentString = `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}`;
      const start = rawKioskSettings.autoOnTime || '06:00';
      const end = rawKioskSettings.autoOffTime || '23:00';
      let isOp = true;
      if (start < end) {
        isOp = currentString >= start && currentString < end;
      } else {
        isOp = currentString >= start || currentString < end; // Cross midnight
      }
      // Update state only if changed to avoid unnecessary re-renders
      setIsOperatingHours(prev => {
        if (prev !== isOp) return isOp;
        return prev;
      });
    };
    checkOperatingHours();
    const interval = setInterval(checkOperatingHours, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [rawKioskSettings?.autoOnOff, rawKioskSettings?.autoOnTime, rawKioskSettings?.autoOffTime, isOperatingHours]);
  const photoEnabled = (config.POLICIES?.PHOTO_ENABLED === true || faceRecognitionEnabled === true) && isOperatingHours;
  const {
    videoRef,
    canvasRef,
    capturePhoto,
    uploadPhoto,
    stream: cameraStream
  } = useAttendanceCamera(photoEnabled);
  const {
    faceModelsLoaded,
    isScanning,
    faceVideoRef,
    lastDescriptorRef,
    activeTaskIdRef,
    findBestMatch
  } = useFacialRecognition({
    enabled: faceRecognitionEnabled && isOperatingHours,
    autoUpdateRef,
    attendanceVideoRef: videoRef,
    // 사진 캡처용 카메라 공유
    proceedWithCheckIn: useCallback((pin, isDup, memberId, task) => {
      proceedWithCheckIn(pin, isDup, memberId, task);
    }, [])
  });

  // 근접 감지: 공지 화면 표시 중 + 옵션 ON이면 카메라로 얼굴 감지 → 자동 전환 (운영 시간일 때만)
  const isNoticeVisible = !!(kioskSettings?.active && kioskSettings?.imageUrl && !kioskNoticeHidden && !message) && isOperatingHours;
  useProximityReturn({
    enabled: !!kioskSettings?.proximityReturn && isOperatingHours,
    isNoticeVisible,
    videoRef: faceVideoRef,
    onPersonDetected: useCallback(() => setKioskNoticeHidden(true), [setKioskNoticeHidden])
  });
  const language = CHECKIN_CONFIG.LOCALE;
  const qrCodeUrl = `${CHECKIN_CONFIG.ASSETS.QR_CODE_BASE_URL}?${CHECKIN_CONFIG.ASSETS.QR_CODE_PARAMS}&data=${encodeURIComponent(window.location.origin + '/member')}`;
  const warmupFunctions = useCallback(() => {
    if (warmupTriggered.current) return;
    warmupTriggered.current = true;
    import('firebase/functions').then(({
      httpsCallable
    }) => {
      import('../firebase').then(({
        functions
      }) => {
        const checkInCall = httpsCallable(functions, 'checkInMemberV2Call');
        checkInCall({
          ping: true
        }).catch(() => {});
        const loginCall = httpsCallable(functions, 'memberLoginV2Call');
        loginCall({
          ping: true
        }).catch(() => {});
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  // ── Effects ──
  useEffect(() => {
    // [근본 수정] 키오스크가 유휴 상태인지 하나의 boolean으로 통합 판단
    // 어떤 모달/오버레이/로딩이든 하나라도 활성이면 isIdle = false
    const isIdle = !message && !loading && !showSelectionModal && !showDuplicateConfirm && !showFaceRegModal && !showInstructorQR && !showKioskInstallGuide;
    autoUpdateRef.current = {
      isIdle,
      pin
    };
    pinRef.current = pin;
  }, [pin, message, loading, showSelectionModal, showDuplicateConfirm, showFaceRegModal, showInstructorQR, showKioskInstallGuide]);
  useEffect(() => {
    const init = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {}
      await storageService.initialize({
        mode: 'kiosk'
      });
      setIsReady(true);
      fetchWeatherAndAI();
    };
    init();
    const vh = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    vh();
    window.addEventListener('resize', vh);
    let unsubClasses = () => {};
    if (currentBranch) {
      const todayCurrent = new Date();
      unsubClasses = subscribeMonthlyClasses(currentBranch, todayCurrent.getFullYear(), todayCurrent.getMonth() + 1, data => setMonthlyClasses(data || {}));
    }
    return () => {
      unsubClasses();
      window.removeEventListener('resize', vh);
    };
  }, []);

  // [PWA] 키오스크 앱 홈화면 설치 유도 자동 팝업 - 제거 (터치 안해도 갑자기 뜨는 버그 원인)
  useEffect(() => {
    // 자동 팝업을 제거하여 화면을 방해하지 않도록 함 (QR 코드 클릭 시에만 수동으로 뜸)
  }, [isReady, pwaContext.isStandalone]);
  useEffect(() => {
    setBgImage(getBgForPeriod(period));
  }, [period]);

  // ── Business Logic ──
  const loadAIExperience = async (name = "\uBC29\uBB38 \uD68C\uC6D0", credits = null, days = null, w = null) => {
    const isStandby = name === (t("g_403daa") || "\uBC29\uBB38 \uD68C\uC6D0");
    try {
      const h = getKSTHour();
      if (h < CHECKIN_CONFIG.SERVICE_HOURS.AI_READY_START || h >= CHECKIN_CONFIG.SERVICE_HOURS.AI_READY_END) {
        setAiExperience({
          message: AIMessages.FALLBACK_MESSAGE_OUTSIDE_BUSINESS_HOURS,
          isFallback: true
        });
        return;
      }
      const info = await storageService.getCurrentClass(currentBranch);
      const title = info?.title || t("g_2b3da3") || "\uC790\uC728\uC218\uB828";
      if (isStandby) {
        const staticMsg = getStaticStandbyMessage(h, w?.weathercode || '0', title);
        setAiExperience({
          message: staticMsg,
          isFallback: true
        });
        setAiLoading(true);
        storageService.getAIExperience(name, 0, t("g_e1e8a7") || "\uC624\uB298", h, title, w, null, null, language, null, 'visitor', 'checkin').then(res => {
          if (res?.message && !res.isFallback) setAiEnhancedMsg(res.message.replace(/나마스테[.]?\s*🙏?/gi, '').trim());
        }).finally(() => setAiLoading(false));
      } else {
        const exp = await storageService.getAIExperience(name, 0, t("g_e1e8a7") || "\uC624\uB298", h, title, w, credits, days, language, null, 'member', 'checkin');
        if (exp) setAiExperience({
          ...exp,
          message: exp.message.replace(/나마스테[.]?\s*🙏?/gi, '').trim()
        });
      }
    } catch (e) {}
  };
  const fetchWeatherAndAI = async () => {
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current_weather=true');
      const d = await r.json();
      setWeather(d.current_weather);
      loadAIExperience(t("g_403daa") || "\uBC29\uBB38 \uD68C\uC6D0", null, null, d.current_weather);
    } catch (e) {
      loadAIExperience();
    }
  };
  const handleModalClose = useCallback(action => {
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
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      daysLeft = Math.ceil((end - now) / 86400000);
    }
    let msg = t('checkin_success');
    let isConsecutive = false;
    let isExtra = false;
    if (res.isDuplicate) {
      isExtra = true;
    } else if (res.sessionCount && res.sessionCount > 1) {
      isExtra = isDup;
      isConsecutive = !isDup;
    }
    if (isExtra) {
      msg = t('checkin_extra');
      speak("success_extra");
    } else if (isConsecutive) {
      msg = t('checkin_consecutive');
      speak("success_consecutive");
    } else if (daysLeft < 0) {
      msg = t('checkin_expired_contact_teacher');
      speak("denied");
    } else if (credits < 0) {
      msg = t('checkin_credits_empty_contact_teacher');
      speak("denied");
    } else if (credits === 0 || daysLeft === 0) {
      msg = t('checkin_last_session');
      speak("last_session");
    } else {
      speak("success");
    }
    await new Promise(r => setTimeout(r, 100));
    setMessage({
      type: 'success',
      member: m,
      text: `${m.name}${t('nim')}`,
      subText: msg
    });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => handleModalClose(() => setMessage(null)), CHECKIN_CONFIG.TIMEOUTS.SUCCESS_MODAL);
    setAiEnhancedMsg(t('checkin_ai_peaceful') || t("g_224835") || "\uC624\uB298\uB3C4 \uD3C9\uC628\uD55C \uC694\uAC00 \uC548\uB0B4\uD574 \uB4DC\uB9B4\uAC8C\uC694. \uB098\uB9C8\uC2A4\uD14C \uD83D\uDE4F");
    setAiLoading(false);
  };
  const proceedWithCheckIn = async (p, isDup = false, memberIdToForce = null, facialTask = null, needConfirm = false, duplicateConfirmMethod = null) => {
    // [안면인식 확인 모달] 중신뢰 매칭이면 확인 모달 먼저 표시
    if (needConfirm && memberIdToForce) {
      try {
        const members = await storageService.getMemberById(memberIdToForce);
        if (members) {
          setFaceConfirmMember({
            id: memberIdToForce,
            name: members.name || t("g_6745df") || "\uD68C\uC6D0"
          });
          return;
        }
      } catch (_e) {/* fallthrough to PIN */}
      return;
    }
    setLoading(true);
    recentCheckInsRef.current.push({
      pin: p,
      timestamp: Date.now()
    });
    try {
      if (facialTask && !lastDescriptorRef.current) {
        try {
          const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
          await Promise.race([facialTask, timeout]);
        } catch (e) {}
      }
      let targetMemberId = memberIdToForce;
      let isFacialMatch = false;
      if (!targetMemberId) {
        let members = [];
        try {
          members = await storageService.findMembersByPhone(p);
        } catch (lookupErr) {
          members = [];
        }
        if (members.length === 0) {
          speak("error");
          await new Promise(r => setTimeout(r, 300));
          setMessage({
            type: 'error',
            text: t('checkin_member_not_found') || '😔 등록되지 않은 번호입니다',
            subText: t('checkin_member_not_found_sub') || '입력하신 전화번호 뒤 4자리와\n일치하는 회원을 찾을 수 없습니다.\n\n번호를 다시 확인해 주세요.'
          });
          return;
        }
        if (members.length > 1) {
          // [FIX] 비활성 회원 제외 (수강권 만료/횟수 소진)
          const activeMembers = members.filter(m => isMemberActive(m));
          const candidateMembers = activeMembers.length > 0 ? activeMembers : members;
          if (candidateMembers.length === 1) {
            // 활성 회원이 1명뿐이면 바로 선택
            targetMemberId = candidateMembers[0].id;
          } else if (candidateMembers.length > 1) {
            // [FIX] 전원 안면 데이터가 있을 때만 자동 판단
            const allHaveFace = candidateMembers.every(m => m.faceDescriptors && m.faceDescriptors.length > 0 || m.faceDescriptor);
            if (allHaveFace && faceRecognitionEnabled && faceModelsLoaded && lastDescriptorRef.current) {
              const bestMatch = findBestMatch(lastDescriptorRef.current, candidateMembers);
              if (bestMatch) {
                const {
                  euclideanDistance
                } = await import('../services/facialService');
                let secondBestDist = 999;
                const bestDesc = bestMatch.faceDescriptors?.[0] ? new Float32Array(bestMatch.faceDescriptors[0]) : bestMatch.faceDescriptor ? new Float32Array(Object.values(bestMatch.faceDescriptor)) : null;
                const bestDist = bestDesc ? euclideanDistance(lastDescriptorRef.current, bestDesc) : 999;
                for (const m of candidateMembers) {
                  if (m.id === bestMatch.id) continue;
                  const desc = m.faceDescriptors?.[0] ? new Float32Array(m.faceDescriptors[0]) : m.faceDescriptor ? new Float32Array(Object.values(m.faceDescriptor)) : null;
                  if (desc) {
                    const d = euclideanDistance(lastDescriptorRef.current, desc);
                    if (d < secondBestDist) secondBestDist = d;
                  }
                }
                const gap = secondBestDist - bestDist;
                // [강화] 극히 높은 신뢰도(dist<0.30 + gap>0.20)일 때만 자동 선택
                // 그 외에는 반드시 선택 모달 표시
                if (bestDist < 0.30 && gap > 0.20) {
                  targetMemberId = bestMatch.id;
                  isFacialMatch = true;
                }
              }
            }
            // 자동 판단 못 했으면 → 선택 모달
            if (!targetMemberId) {
              setDuplicateMembers(candidateMembers);
              setIsDuplicateFlow(isDup);
              setShowSelectionModal(true);
              return;
            }
          }
        } else {
          targetMemberId = members[0].id;
        }
      }
      const safeUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      const source = memberIdToForce && !p ? 'facial' : 'pin';
      const res = await storageService.checkInById(targetMemberId, currentBranch, isDup, safeUUID(), isFacialMatch, source, duplicateConfirmMethod);
      if (res.success) {
        setIsOnline(!res.isOffline);
        if (res.attendanceStatus === 'denied') {
          uploadPhoto(res.attendanceId, res.member?.name, 'denied');
          speak("denied");
          await new Promise(r => setTimeout(r, 300));
          setMessage({
            type: 'error',
            text: t('checkin_expired') || '⏳ 수강권이 만료되었습니다',
            subText: t('checkin_expired_sub') || '수강 기간이 지났거나 횟수가 소진되었습니다.\n\n프론트에 문의해 주세요.'
          });
        } else {
          // [FIX] 오프라인 출석이면 사진 URL을 pending_attendance에 저장
          if (res.isOffline) {
            uploadPhoto(null, res.member?.name, 'offline-pending').then(url => {
              if (url) {
                import('firebase/firestore').then(({
                  getDocs,
                  query,
                  where,
                  updateDoc
                }) => {
                  import('../utils/tenantDb').then(({
                    tenantDb
                  }) => {
                    getDocs(query(tenantDb.collection('pending_attendance'), where('memberId', '==', targetMemberId), where('date', '==', new Date().toLocaleDateString('sv-SE', {
                      timeZone: 'Asia/Seoul'
                    })))).then(snap => {
                      if (!snap.empty) {
                        updateDoc(snap.docs[snap.docs.length - 1].ref, {
                          photoUrl: url
                        });
                        console.log('[PHOTO] ✅ Photo URL saved to pending_attendance for offline sync');
                      }
                    }).catch(() => {});
                  });
                });
              }
            });
          } else {
            uploadPhoto(res.attendanceId, res.member?.name, 'valid');
          }
          await showCheckInSuccess(res, isDup);
          if (faceRecognitionEnabled && faceModelsLoaded && lastDescriptorRef.current) {
            memberService.updateFaceDescriptor(targetMemberId, lastDescriptorRef.current);
          }
        }
      } else {
        speak("error");
        await new Promise(r => setTimeout(r, 300));
         setMessage({
          type: 'error',
          text: res.message || t('checkin_failed') || '❌ 출석 처리 실패',
          subText: t('checkin_failed_sub') || '일시적인 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.'
        });
      }
    } catch (e) {
      storageService.logError(e, {
        context: 'Kiosk',
        branch: currentBranch
      });
      speak("error");
      setMessage({
        type: 'error',
        text: t('checkin_system_error') || '⚠️ 시스템 오류',
        subText: t('checkin_system_error_sub') || '일시적인 시스템 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = useCallback(p => {
    const pinCode = typeof p === 'string' ? p : pinRef.current;
    if (pinCode.length !== 4 || loading) return;
    const taskId = ++activeTaskIdRef.current;
    let facialTask = null;
    if (faceRecognitionEnabled && faceModelsLoaded && videoRef.current) {
      facialTask = extractFaceDescriptor(videoRef.current).then(desc => {
        if (taskId === activeTaskIdRef.current) {
          lastDescriptorRef.current = desc;
          return desc;
        }
        return null;
      });
    }
    setTimeout(() => capturePhoto(), 0);
    const duplicateThresholdMs = 300000; // 5분 (백엔드 차단 시간과 동일)
    const isDup = recentCheckInsRef.current.some(e => e.pin === pinCode && Date.now() - e.timestamp < duplicateThresholdMs);
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
  const handleKeyPress = useCallback(n => {
    setPin(prev => {
      const next = prev + n;
      return next.length <= 4 ? next : prev;
    });
    if (pinRef.current.length === 0) {
      setTimeout(() => {
        checkConnection();
        warmupFunctions();
      }, 50);
      setTimeout(() => capturePhoto(), 300);
    }
    const nextLength = pinRef.current.length + 1;
    if (nextLength === 4) {
      const finalPin = pinRef.current + n;
      setTimeout(() => handleSubmit(finalPin), 80);
    }
  }, [handleSubmit, checkConnection, faceModelsLoaded, capturePhoto, warmupFunctions]);
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
  useAlwaysOnGuardian(isReady);
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
      proceedWithCheckIn(pendingPin, true, null, null, false, 'auto_timer');
    }
  }, [duplicateTimer, showDuplicateConfirm, pendingPin]);

  // ── Render ──
  return <div className="checkin-wrapper" style={{
    position: 'relative',
    width: '100%',
    height: 'calc(var(--vh, 1vh) * 100)',
    minHeight: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    background: '#000'
  }}>
            <div className="bg-container" style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0
    }}>
                <img src={bgImage} alt="bg" style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      }} />
                <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.5)'
      }} />
            </div>

            <TopBar weather={weather} currentBranch={currentBranch} branches={branches} handleBranchChange={c => {
      setCurrentBranch(c);
      storageService.setKioskBranch(c);
    }} toggleFullscreen={() => {
      try {
        const el = document.documentElement;
        const isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
        if (!isFs) {
          (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || (() => {})).call(el);
        } else {
          (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || (() => {})).call(document);
        }
      } catch (e) {
        console.warn('[Fullscreen] Not supported:', e.message);
      }
    }} language="ko" onInstructorClick={() => setShowInstructorQR(true)} />

            <div className="checkin-content" style={{
      zIndex: 5,
      flex: 1,
      display: 'flex',
      gap: '2vh',
      padding: '3vh 3vw 5vh',
      width: '100%',
      alignItems: 'stretch',
      overflow: 'hidden'
    }}>
                <CheckInInfoSection pin={pin} loading={loading} aiExperience={aiExperience} aiEnhancedMsg={aiEnhancedMsg} aiLoading={aiLoading} kioskLogos={kioskLogos} qrCodeUrl={qrCodeUrl} handleQRInteraction={() => setShowKioskInstallGuide(true)} onCameraTouch={() => setShowFaceRegModal(true)} faceRecognitionEnabled={faceRecognitionEnabled} isScanning={isScanning} cameraVideoRef={faceVideoRef} cameraStream={cameraStream} attendanceVideoRef={videoRef} />
                <CheckInKeypadSection pin={pin} loading={loading} isReady={isReady} loadingMessage={loadingMessage} keypadLocked={keypadLocked} showSelectionModal={showSelectionModal} message={message} handleKeyPress={handleKeyPress} handleClear={handleClear} handleSubmit={handleSubmit} />
            </div>

            <SelectionModal show={showSelectionModal} duplicateMembers={duplicateMembers} loading={loading} onClose={() => {
      setShowSelectionModal(false);
      setPin('');
    }} onSelect={id => {
      setShowSelectionModal(false);
      proceedWithCheckIn(pin, isDuplicateFlow, id);
    }} />
            <MessageOverlay message={message} onClose={closeMessage} aiExperience={aiExperience} />
            <DuplicateConfirmModal show={showDuplicateConfirm} duplicateTimer={duplicateTimer} onCancel={() => {
      setShowDuplicateConfirm(false);
      setPin('');
    }} onConfirm={() => {
      setShowDuplicateConfirm(false);
      proceedWithCheckIn(pendingPin, true, null, null, false, 'button_confirm');
    }} />
            
            {/* ── 운영 시간 외 절전 모드 화면 ── */}
            {!isOperatingHours && <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#666'
    }}>
                    <span style={{
        fontSize: '10rem',
        opacity: 0.1,
        marginBottom: '20px'
      }}>🌙</span>
                    <h1 style={{
        fontSize: '2rem',
        fontWeight: 'bold'
      }}>{t('checkin_closed_title')}</h1>
                    <p style={{
        marginTop: '10px',
        opacity: 0.6
      }}>{t('checkin_closed_sub')}</p>
                </div>}

            {kioskSettings?.active && kioskSettings?.imageUrl && !kioskNoticeHidden && !message && isOperatingHours && <div onClick={() => setKioskNoticeHidden(true)} style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#000',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }}>
                    {kioskSettings.mediaType === 'video' || kioskSettings.imageUrl.match(/notice_video\.|\.mp4|\.webm|\.mov/i) ? <video src={kioskSettings.imageUrl} autoPlay loop muted playsInline style={{
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain'
      }} /> : <img src={kioskSettings.imageUrl} alt="notice" style={{
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain'
      }} />}
                    {kioskSettings.showTouchGuide !== false && <div style={{
        position: 'absolute',
        bottom: '6vh',
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '16px 36px',
        borderRadius: '50px',
        fontSize: '1.6rem',
        fontWeight: 'bold',
        border: '3px solid rgba(var(--primary-rgb), 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        pointerEvents: 'none'
      }}>
                            <span style={{
          fontSize: '2rem'
        }}>👆</span> {t('checkin_touch_to_start')}
                        </div>}
                </div>}

            {/* ── 안면인식 확인 모달: "OO회원님 맞나요?" ── */}
            {faceConfirmMember && <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 3500,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
                    <div style={{
        background: 'rgba(30,30,40,0.95)',
        borderRadius: '24px',
        padding: '40px 48px',
        textAlign: 'center',
        maxWidth: '420px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
                        <div style={{
          fontSize: '4rem',
          marginBottom: '16px'
        }}>🧘</div>
                        <h2 style={{
          fontSize: '1.8rem',
          fontWeight: '800',
          color: 'white',
          marginBottom: '12px'
        }}>
                            {faceConfirmMember.name}{t('nim')}
                        </h2>
                        <p style={{
          fontSize: '1.2rem',
          color: 'rgba(255,255,255,0.7)',
          marginBottom: '32px'
        }}>
                            {t('checkin_confirm_question')}
                        </p>
                        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center'
        }}>
                            <button onClick={() => {
            setFaceConfirmMember(null);
            speak("info");
          }} style={{
            flex: 1,
            padding: '16px 24px',
            borderRadius: '14px',
            fontSize: '1.2rem',
            fontWeight: '700',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer'
          }}>
                                {t('no')}
                            </button>
                            <button onClick={() => {
            const memberId = faceConfirmMember.id;
            setFaceConfirmMember(null);
            proceedWithCheckIn(null, false, memberId, null);
          }} style={{
            flex: 1,
            padding: '16px 24px',
            borderRadius: '14px',
            fontSize: '1.2rem',
            fontWeight: '700',
            background: 'var(--primary-theme-color, #D4AF37)',
            color: 'black',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(212,175,55,0.4)'
          }}>
                                {t('yes_thats_me')}
                            </button>
                        </div>
                        <p style={{
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.3)',
          marginTop: '20px'
        }}>
                            {t('checkin_pin_alternative')}
                        </p>
                    </div>
                </div>}

            <KioskInstallGuideModal isOpen={showKioskInstallGuide} onClose={() => setShowKioskInstallGuide(false)} />
            <InstructorQRModal isOpen={showInstructorQR} onClose={() => setShowInstructorQR(false)} />
            <FaceRegistrationModal isOpen={showFaceRegModal} onClose={() => setShowFaceRegModal(false)} videoRef={faceVideoRef} modelsAlreadyLoaded={faceModelsLoaded} />
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{
      position: 'fixed',
      bottom: '8px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '0.55rem',
      color: 'rgba(255,255,255,0.15)',
      textDecoration: 'none',
      zIndex: 5,
      letterSpacing: '0.5px'
    }}>{t('privacy_policy')}</a>
            <video ref={videoRef} autoPlay playsInline muted style={{
      position: 'fixed',
      left: '0',
      top: '0',
      width: '1px',
      height: '1px',
      opacity: 0.01,
      zIndex: -100,
      pointerEvents: 'none'
    }} />
            <video ref={faceVideoRef} autoPlay playsInline muted style={{
      position: 'fixed',
      left: '-9999px',
      width: '1px',
      height: '1px',
      opacity: 0.01,
      zIndex: -100,
      pointerEvents: 'none'
    }} />
            <canvas ref={canvasRef} style={{
      position: 'fixed',
      left: '0',
      top: '0',
      width: '1px',
      height: '1px',
      opacity: 0.01,
      zIndex: -100,
      pointerEvents: 'none'
    }} />
        </div>;
};
export default CheckInPage;

/**
 * [BUILD-FIX] Attach unminifiable property to component object to defeat tree-shaking
 * This guarantees Rollup will generate a new chunk hash, forcing Workbox to update!
 */
CheckInPage.__buildVersion = `2026.03.20.${Date.now()}`;