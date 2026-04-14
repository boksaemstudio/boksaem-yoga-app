import { useLanguageStore } from '../../stores/useLanguageStore';
import { useState, useEffect } from 'react';
import { Bell, BellRinging, Share, SignOut, PlusSquare, UserFocus } from '@phosphor-icons/react';
import { getToken } from 'firebase/messaging';
import { messaging } from '../../firebase';
import { storageService } from '../../services/storage';
import { memberService } from '../../services/memberService';
import { useStudioConfig } from '../../contexts/StudioContext';
import { getKSTTotalMinutes } from '../../utils/dates';
import ImageLightbox from '../common/ImageLightbox';
const InstructorHome = ({
  instructorName,
  attendance,
  attendanceLoading,
  instructorClasses = []
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deviceOS, setDeviceOS] = useState('unknown');
  const [hidePwaGuide, setHidePwaGuide] = useState(localStorage.getItem('hide_pwa_guide_instructor') === 'true');
  const [lightboxImage, setLightboxImage] = useState(null);
  const [deletingFaceMemberId, setDeletingFaceMemberId] = useState(null);
  const isDemo = typeof window !== 'undefined' && (window.location.hostname.includes('passflowai') || window.location.hostname.includes('demo') || config?.STUDIO_ID === 'demo' || config?.STUDIO_ID === 'demo-yoga');
  const todayStr = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Seoul'
  });
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushEnabled(window.Notification.permission === 'granted');
    }
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDeviceOS('ios');
    } else if (/android/.test(ua)) {
      setDeviceOS('android');
    }
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(isInstalled);

    // [AUTO EXECUTIONS on load]
    // 1. Auto PWA Install Prompt
    const handleBeforeInstall = e => {
      e.preventDefault();
      if (isDemo) return;
      setDeferredPrompt(e);

      // 만약 사용자가 숨김 처리하지 않았고, 단독 앱으로 실행중이 아니라면 자동으로 설치 프롬프트를 띄움
      if (!hidePwaGuide && !isInstalled) {
        setTimeout(async () => {
          try {
            e.prompt();
            const {
              outcome
            } = await e.userChoice;
            if (outcome === 'accepted') setIsStandalone(true);
          } catch (err) {
            console.error("Auto PWA prompt failed", err);
          }
        }, 2000); // UI 안정화 후 2초 뒤 자동 실행
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 2. Auto Push Registration
    // 로그인 상태이고 알림 권한이 확실히 거절(denied)된 상태가 아니며 아직 부여되지 않았다면 자동 요청
    let tokenRefreshInterval;
    if (instructorName && typeof window !== 'undefined' && 'Notification' in window) {
      if (window.Notification.permission === 'default') {
        // 브라우저가 사용자에게 묻는 상태(default)일 경우 자동 트리거
        setTimeout(() => {
          handleEnablePush();
        }, 3000); // 3초 뒤 자연스럽게 권한 요청 팝업 띄움
      } else if (window.Notification.permission === 'granted') {
        // [ROOT FIX] serviceWorkerRegistration 필수 — 없으면 토큰 발급 자체 실패
        const refreshToken = async () => {
          try {
            const registration = await navigator.serviceWorker.ready;
            const token = await getToken(messaging, {
              vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
              serviceWorkerRegistration: registration
            });
            if (token) {
              await storageService.saveInstructorToken(token, instructorName);
              console.log('[InstructorHome] ✅ Token saved for:', instructorName, 'token:', token.substring(0, 20) + '...');
            } else {
              console.error('[InstructorHome] ❌ getToken returned null for:', instructorName);
            }
          } catch (e) {
            console.error('[InstructorHome] ❌ Token refresh FAILED for:', instructorName, e);
          }
        };
        setTimeout(refreshToken, 2000);
        tokenRefreshInterval = setInterval(refreshToken, 60 * 60 * 1000);
      }
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);
    };
  }, [instructorName, hidePwaGuide]);
  const handleEnablePush = async () => {
    setPushLoading(true);
    setPushMessage('');
    try {
      if (!('Notification' in window)) {
        setPushMessage((t("g_2d9077") || "\u274C \uC774 \uBE0C\uB77C\uC6B0\uC800\uB294 \uC54C\uB9BC\uC744 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. ") + (deviceOS === 'ios' ? t("g_be69b5") || "\uC544\uC774\uD3F0\uC740 '\uD648 \uD654\uBA74\uC5D0 \uCD94\uAC00'\uB97C \uD1B5\uD574 \uC571\uC744 \uC124\uCE58\uD574\uC57C \uC54C\uB9BC \uC124\uC815\uC774 \uAC00\uB2A5\uD569\uB2C8\uB2E4." : t("g_759086") || "\uD06C\uB86C \uB4F1 \uCD5C\uC2E0 \uBE0C\uB77C\uC6B0\uC800\uB97C \uC0AC\uC6A9\uD574 \uC8FC\uC138\uC694."));
        return;
      }
      const permission = await window.Notification.requestPermission();
      if (permission === 'granted') {
        // [ROOT FIX] serviceWorkerRegistration 필수
        const registration = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration
        });
        if (token) {
          await storageService.saveInstructorToken(token, instructorName);
          setPushEnabled(true);
          setPushMessage(t("g_7a9efe") || "\u2705 \uC54C\uB9BC\uC774 \uD65C\uC131\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4!");
          console.log('[InstructorHome] ✅ Push enabled for:', instructorName, 'token:', token.substring(0, 20) + '...');
        } else {
          setPushMessage(t("g_9f214f") || "\u274C \uD1A0\uD070\uC744 \uAC00\uC838\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        }
      } else if (permission === 'denied') {
        setPushMessage(t("g_5fdb6b") || "\u274C \uC54C\uB9BC\uC774 \uCC28\uB2E8\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uBE0C\uB77C\uC6B0\uC800 \uC124\uC815\uC5D0\uC11C \uD5C8\uC6A9\uD574\uC8FC\uC138\uC694.");
      }
    } catch (e) {
      console.error('Push setup failed:', e);
      setPushMessage((t("g_c59205") || "\u274C \uC54C\uB9BC \uC124\uC815 \uC2E4\uD328: ") + e.message);
    } finally {
      setPushLoading(false);
    }
  };
  const handleDisablePush = () => {
    setPushMessage(t("g_69531a") || "\u2139\uFE0F \uBE0C\uB77C\uC6B0\uC800 \uC124\uC815\uC5D0\uC11C \uC54C\uB9BC\uC744 \uB04C \uC218 \uC788\uC2B5\uB2C8\uB2E4.\n\uC0AC\uC774\uD2B8 \uC124\uC815 > \uC54C\uB9BC > \uCC28\uB2E8");
  };
  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const {
          outcome
        } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
      } catch (error) {
        console.error("Manual PWA prompt failed", error);
      }
    } else {
      // Manual Guide
      if (deviceOS === 'ios') {
        setPushMessage(t("g_f8cdf6") || "\u2139\uFE0F \uC544\uC774\uD3F0: Safari \uD558\uB2E8 \uACF5\uC720(\u2191) \uD074\uB9AD > \"\uD648 \uD654\uBA74\uC5D0 \uCD94\uAC00\"");
      } else if (deviceOS === 'android') {
        setPushMessage(t("g_73c178") || "\u2139\uFE0F \uC548\uB4DC\uB85C\uC774\uB4DC: \uBE0C\uB77C\uC6B0\uC800 \uBA54\uB274(\u22EE) \uD074\uB9AD > \"\uC571 \uC124\uCE58\" \uB610\uB294 \"\uD648 \uD654\uBA74\uC5D0 \uCD94\uAC00\"");
      } else {
        setPushMessage(t("g_f8b7a8") || "\u2139\uFE0F \uBE0C\uB77C\uC6B0\uC800 \uBA54\uB274\uC5D0\uC11C \"\uC571 \uC124\uCE58\"\uB97C \uCC3E\uC544\uC8FC\uC138\uC694.");
      }
    }
  };
  const handleHidePwaGuide = () => {
    setHidePwaGuide(true);
    localStorage.setItem('hide_pwa_guide_instructor', 'true');
  };

  // [STUDIO-AGNOSTIC] Split attendance by branch dynamically
  const attendanceByBranch = (config.BRANCHES || []).reduce((acc, branch) => {
    acc[branch.id] = attendance.filter(r => r.branchId === branch.id || r.branchName === branch.name);
    return acc;
  }, {});
  const renderAttendanceList = (list, title, color, branchId) => {

    const branchClasses = instructorClasses.filter(c => c.branchId === branchId);

    // Hide only if both attendance AND classes are empty
    if (list.length === 0 && branchClasses.length === 0) return null;
    const currentMinutes = getKSTTotalMinutes();
    const getStatus = (timeStr, duration = 60) => {
      const [h, m] = timeStr.split(':').map(Number);
      const start = h * 60 + m;
      const end = start + duration;
      if (currentMinutes < start) return {
        label: t("g_72cd53") || "\uC608\uC815",
        color: '#FFD93D'
      };
      if (currentMinutes >= start && currentMinutes < end) return {
        label: t("g_df4a7e") || "\uC9C4\uD589 \uC911",
        color: '#4CAF50'
      };
      return {
        label: t("g_36b7d7") || "\uC885\uB8CC",
        color: 'gray'
      };
    };
    return <div style={{
      marginTop: '16px',
      background: 'rgba(255,255,255,0.02)',
      padding: '16px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
                <h4 style={{
        margin: '0 0 12px',
        fontSize: '0.95rem',
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
                    <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
                        <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: color
          }} />
                        {title}
                    </div>
                    <span style={{
          opacity: 0.6,
          fontSize: '0.8rem',
          fontWeight: 'normal'
        }}>{t("g_97dfc6") || "\uCD1D"}{list.length}{t("g_46b3c1") || "\uBA85 \uCD9C\uC11D"}</span>
                </h4>

                {/* 오늘 수업 목록 */}
                <div style={{
        marginBottom: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
                    {branchClasses.map((cls, idx) => {
          const status = getStatus(cls.time, cls.duration);
          return <div key={idx} style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            border: `1px solid ${status.color}44`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
                                <span style={{
              color: status.color,
              fontWeight: 'bold'
            }}>• {status.label}</span>
                                <span style={{
              color: 'white'
            }}>{cls.time} {cls.title}</span>
                            </div>;
        })}
                </div>

                {/* 출석 명단 */}
                {list.length > 0 ? <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
                        {list.map((record, idx) => <div key={record.id || idx} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '6px',
          borderLeft: `2px solid ${color}`
        }}>
                                {/* 사진 썸네일 */}
                                <div onClick={e => {
            if (record.photoUrl) {
              e.stopPropagation();
              setLightboxImage(record.photoUrl);
            }
          }} style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            flexShrink: 0,
            marginRight: '10px',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: record.photoUrl ? 'pointer' : 'default',
            border: record.photoUrl ? '2px solid rgba(var(--primary-rgb), 0.4)' : '2px solid rgba(255,255,255,0.1)'
          }}>
                                    {record.photoUrl ? <img src={record.photoUrl} alt="" style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }} /> : <span style={{
              fontSize: '0.75rem',
              fontWeight: 'bold',
              color: 'rgba(255,255,255,0.4)'
            }}>
                                            {(record.memberName || '?').charAt(0)}
                                        </span>}
                                </div>
                                <div style={{
            flex: 1
          }}>
                                    <div style={{
              fontWeight: 'bold',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
                                        {record.memberName}
                                        {(() => {
                const isNew = (record.regDate || record.startDate) && (() => {
                  const start = new Date(record.regDate || record.startDate);
                  const now = new Date();
                  const diff = (now - start) / (1000 * 60 * 60 * 24);
                  // [REVISION] Joined within 30 days AND total sessions <= 3 (requested)
                  return diff <= 30 && (record.cumulativeCount || 1) <= 3;
                })();
                if (isNew) return <span style={{
                  fontSize: '0.65rem',
                  background: '#ff4757',
                  color: 'white',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 'bold'
                }}>{t("g_5a601c") || "\uC2E0\uADDC"}</span>;
                return null;
              })()}
                                        {record.facialMatched && <span style={{
                fontSize: '0.65rem',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60A5FA',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                                                <UserFocus size={10} weight="fill" />{t("g_ae8632") || "\uC548\uBA74\uC77C\uCE58"}</span>}
                                        {/* 안면인식 등록 상태 뱃지 */}
                                        {(() => {
                const memberData = record.memberId ? memberService.getMemberById(record.memberId) : null;
                if (!memberData) return null;
                return memberData.hasFaceDescriptor ? <span onClick={e => {
                  e.stopPropagation();
                  if (deletingFaceMemberId) return;
                  if (!confirm(`${record.memberName}님의 안면 인식 데이터를 삭제하시겠습니까?\n\n삭제 후 키오스크에서 다시 등록할 수 있습니다.`)) return;
                  setDeletingFaceMemberId(record.memberId);
                  memberService.deleteFaceDescriptor(record.memberId).then(result => {
                    if (result.success) {
                      alert(t("g_c801e1") || "\uC548\uBA74 \uC778\uC2DD \uB370\uC774\uD130\uAC00 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
                    } else {
                      alert((t("g_51acf1") || "\uC0AD\uC81C \uC2E4\uD328: ") + (result.error || t("g_053d5f") || "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"));
                    }
                  }).catch(() => alert(t("g_54e78b") || "\uC0AD\uC81C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.")).finally(() => setDeletingFaceMemberId(null));
                }} style={{
                  fontSize: '0.65rem',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#818CF8',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  cursor: 'pointer',
                  opacity: deletingFaceMemberId === record.memberId ? 0.5 : 1
                }} title={t("g_899a75") || "\uD074\uB9AD\uD558\uC5EC \uC548\uBA74 \uB370\uC774\uD130 \uC0AD\uC81C"}>{t("g_b6f5d5") || "\uD83E\uDDE0 \uC548\uBA74\uB4F1\uB85D \u2715"}</span> : null;
              })()}
                                    </div>
                                    <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              gap: '8px',
              marginTop: '2px'
            }}>
                                        <span>{record.className}</span>
                                        {(record.credits !== undefined || record.endDate) && <span style={{
                color: 'var(--primary-gold)',
                opacity: 0.9
              }}>
                                                {record.credits !== undefined && `${record.credits}회 `}
                                                {record.endDate && `/ ~${record.endDate.slice(2)}`}
                                            </span>}
                                    </div>
                                </div>
                                <div style={{
            color: 'var(--primary-gold)',
            fontWeight: 'bold',
            fontSize: '0.85rem'
          }}>
                                    {record.timestamp ? new Date(record.timestamp).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }) : ''}
                                </div>
                            </div>)}
                    </div> : <div style={{
        fontSize: '0.8rem',
        color: 'rgba(255,255,255,0.3)',
        padding: '8px',
        textAlign: 'center',
        border: '1px dashed rgba(255,255,255,0.1)',
        borderRadius: '6px'
      }}>{t("g_240ef3") || "\uCD9C\uC11D \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4"}</div>}
            </div>;
  };
  return <div style={{
    padding: '16px'
  }}>

            {/* Attendance */}
            <div style={{
      background: 'var(--bg-surface)',
      padding: '20px',
      borderRadius: '12px',
      marginBottom: '16px'
    }}>
                <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
                    <h3 style={{
          margin: 0,
          fontSize: '1rem'
        }}>{t("g_904625") || "\uD83D\uDCCB \uC624\uB298 \uB098\uC758 \uC218\uC5C5 \uCD9C\uC11D \uD604\uD669"}</h3>
                    <span style={{
          fontSize: '0.8rem',
          color: 'var(--text-secondary)'
        }}>{todayStr} ({attendance.length}{t("g_df355c") || "\uBA85)"}</span>
                </div>
                
                {attendanceLoading ? <div style={{
        textAlign: 'center',
        color: 'var(--text-secondary)',
        padding: '20px'
      }}>{t("g_06057f") || "\uB85C\uB529 \uC911..."}</div> : <>
                        {attendance.length === 0 && instructorClasses.length === 0 ? <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'var(--text-secondary)',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          marginTop: '10px',
          border: '1px dashed rgba(255,255,255,0.1)'
        }}>
                                <div style={{
            fontSize: '2rem',
            marginBottom: '12px'
          }}>☕</div>
                                <div style={{
            fontSize: '0.95rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '4px'
          }}>{t("g_c7ecc2") || "\uC624\uB298\uC740 \uC218\uC5C5 \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4"}</div>
                                <div style={{
            fontSize: '0.85rem',
            opacity: 0.7
          }}>{t("g_922fd2") || "\uD3B8\uC548\uD55C \uD734\uC2DD\uACFC \uCDA9\uC804\uC758 \uC2DC\uAC04 \uB418\uC2DC\uAE38 \uBC14\uB78D\uB2C8\uB2E4!"}</div>
                            </div> : (config.BRANCHES || []).map(branch => renderAttendanceList(attendanceByBranch[branch.id] || [], config.BRANCHES?.length > 1 ? branch.name : t("g_3430e8") || "\uCD9C\uC11D \uD604\uD669", branch.color, branch.id))}
                    </>}
            </div>

            {/* Push Notification */}
            <div style={{
      background: 'var(--bg-surface)',
      padding: '20px',
      borderRadius: '12px',
      marginBottom: '16px'
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
      }}>
                    {pushEnabled ? <BellRinging size={24} color="var(--primary-gold)" weight="fill" /> : <Bell size={24} color="var(--text-secondary)" />}
                    <div style={{
          flex: 1
        }}>
                        <h3 style={{
            margin: 0,
            fontSize: '1rem'
          }}>{t("g_03bd79") || "\uB098\uC758 \uC218\uC5C5 \uCD9C\uC11D\uD68C\uC6D0 \uC54C\uB9BC"}</h3>
                        <div style={{
            margin: '2px 0 0',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>{t("g_0a7c39") || "\uD68C\uC6D0 \uCD9C\uC11D \uC2DC \uC54C\uB9BC \uBC1B\uAE30"}</div>
                    </div>
                    {/* Toggle Switch */}
                    <div onClick={() => pushEnabled ? handleDisablePush() : handleEnablePush()} style={{
          width: '50px',
          height: '28px',
          borderRadius: '14px',
          background: pushEnabled ? '#4CAF50' : 'rgba(255,255,255,0.15)',
          position: 'relative',
          cursor: pushLoading ? 'wait' : 'pointer',
          transition: 'background 0.3s ease',
          flexShrink: 0,
          opacity: pushLoading ? 0.5 : 1
        }}>
                        <div style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'white',
            position: 'absolute',
            top: '3px',
            left: pushEnabled ? '25px' : '3px',
            transition: 'left 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }} />
                    </div>
                </div>
                
                {pushEnabled ? <div style={{
        textAlign: 'center',
        background: 'rgba(76, 175, 80, 0.1)',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid rgba(76, 175, 80, 0.3)'
      }}>
                        <BellRinging size={28} weight="fill" color="#4CAF50" style={{
          marginBottom: '8px'
        }} />
                        <div style={{
          color: '#4CAF50',
          fontWeight: 'bold',
          fontSize: '1rem',
          marginBottom: '4px'
        }}>{t("g_1cf93b") || "\uC54C\uB9BC \uC124\uC815\uC774 \uCF1C\uC838 \uC788\uC2B5\uB2C8\uB2E4"}</div>
                        <div style={{
          color: 'var(--text-secondary)',
          fontSize: '0.8rem'
        }}>{t("g_d1ef65") || "\uD1A0\uAE00\uC744 \uB20C\uB7EC \uC54C\uB9BC\uC744 \uB04C \uC218 \uC788\uC2B5\uB2C8\uB2E4."}</div>
                    </div> : <button onClick={handleEnablePush} disabled={pushLoading} style={{
        width: '100%',
        padding: '14px',
        borderRadius: '10px',
        border: 'none',
        background: pushLoading ? 'var(--bg-input)' : 'var(--primary-gold)',
        color: pushLoading ? 'var(--text-secondary)' : 'black',
        fontWeight: 'bold',
        fontSize: '1.05rem',
        cursor: pushLoading ? 'wait' : 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        boxShadow: pushLoading ? 'none' : '0 4px 12px rgba(var(--primary-rgb), 0.2)'
      }}>
                        {pushLoading ? <>
                                <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTop: '2px solid var(--text-secondary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />{t("g_22f510") || "\uC124\uC815 \uC911... \uD31D\uC5C5\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694"}</> : t("g_94714a") || "\uD83D\uDD14 \uC54C\uB9BC \uAD8C\uD55C \uD5C8\uC6A9\uD558\uAE30"}
                    </button>}
                
                {pushMessage && <div style={{
        marginTop: '12px',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '0.85rem',
        textAlign: 'center',
        background: pushMessage.includes('✅') ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.05)',
        color: pushMessage.includes('✅') ? '#4CAF50' : 'var(--text-primary)',
        border: pushMessage.includes('✅') ? '1px solid rgba(76, 175, 80, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
        whiteSpace: 'pre-line',
        lineHeight: 1.5
      }}>
                        {pushMessage}
                    </div>}
            </div>

            {/* PWA Install Guide */}
            {!isDemo && !isStandalone && !hidePwaGuide && <div style={{
      position: 'relative',
      background: 'var(--bg-surface)',
      padding: '20px',
      borderRadius: '12px',
      marginBottom: '16px',
      border: deviceOS === 'ios' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(var(--primary-rgb), 0.3)'
    }}>
                    <button onClick={handleHidePwaGuide} style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        background: 'none',
        border: 'none',
        color: 'var(--text-secondary)',
        fontSize: '1.2rem',
        padding: '4px',
        cursor: 'pointer'
      }}>
                        ✕
                    </button>
                    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
        paddingRight: '20px'
      }}>
                        <div style={{
          background: deviceOS === 'ios' ? '#3B82F6' : 'var(--primary-gold)',
          borderRadius: '10px',
          padding: '10px',
          display: 'flex'
        }}>
                            {deviceOS === 'ios' ? <Share size={24} color="white" weight="bold" /> : <SignOut size={24} color="black" style={{
            transform: 'rotate(-90deg)'
          }} />}
                        </div>
                        <div>
                            <h3 style={{
            margin: 0,
            fontSize: '1.05rem',
            color: 'white'
          }}>{t("g_ef6889") || "\uD654\uBA74\uC5D0 \uC571 \uBCF4\uAD00\uD558\uAE30"}</h3>
                            <div style={{
            margin: '4px 0 0',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
                                {deviceOS === 'ios' ? t("g_2a915f") || "\uC0AC\uD30C\uB9AC(Safari)\uC5D0\uC11C \uD648 \uD654\uBA74\uC5D0 \uCD94\uAC00\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." : t("g_97ccf6") || "\uD558\uB2E8\uC758 \uBC84\uD2BC\uC744 \uB204\uB974\uAC70\uB098 \uC124\uCE58 \uD31D\uC5C5\uC744 \uD655\uC778\uD558\uC138\uC694."}
                            </div>
                        </div>
                    </div>
                    
                    {deviceOS === 'ios' ? <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        padding: '16px',
        borderRadius: '8px',
        marginTop: '10px'
      }}>
                             <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px',
          fontSize: '0.95rem'
        }}>
                                <span style={{
            background: '#3B82F6',
            color: 'white',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}>1</span>
                                <span style={{
            color: '#e0e0e0'
          }}>{t("g_556228") || "\uD558\uB2E8"}<Share size={18} weight="bold" style={{
              verticalAlign: 'middle',
              margin: '0 2px'
            }} /> <strong>{t("g_9e553a") || "\uACF5\uC720 \uBC84\uD2BC"}</strong>{t("g_3630e7") || "\uC744 \uD074\uB9AD\uD558\uC138\uC694."}</span>
                             </div>
                             <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.95rem'
        }}>
                                <span style={{
            background: '#3B82F6',
            color: 'white',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}>2</span>
                                <span style={{
            color: '#e0e0e0'
          }}><PlusSquare size={18} weight="bold" style={{
              verticalAlign: 'middle',
              margin: '0 2px'
            }} /> <strong>{t("g_e1557e") || "\uD648 \uD654\uBA74\uC5D0 \uCD94\uAC00"}</strong>{t("g_866e97") || "\uB97C \uC120\uD0DD\uD558\uC138\uC694."}</span>
                             </div>
                        </div> : <button onClick={handleInstallPWA} style={{
        width: '100%',
        padding: '14px',
        borderRadius: '10px',
        border: 'none',
        background: 'var(--primary-gold)',
        color: 'var(--text-on-primary)',
        fontWeight: 'bold',
        fontSize: '1rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
      }}>
                            <SignOut size={20} style={{
          transform: 'rotate(-90deg)'
        }} />{t("g_7aad57") || "\uD3F0\uC5D0 \uC571 \uC124\uCE58\uD558\uAE30"}</button>}
                </div>}



            {lightboxImage && <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
        </div>;
};
export default InstructorHome;