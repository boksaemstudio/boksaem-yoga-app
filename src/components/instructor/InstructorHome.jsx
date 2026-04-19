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
        setPushMessage((t("g_46b103") || "❌ 이 브라우저는 알림을 지원하지 않습니다. ") + (deviceOS === 'ios' ? t("g_a8e020") || "아이폰은 '홈 화면에 추가'를 통해 앱을 설치해야 알림 설정이 가능합니다." : t("g_490419") || "크롬 등 최신 브라우저를 사용해 주세요."));
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
          setPushMessage(t("g_cfc84b") || "✅ 알림이 활성화되었습니다!");
          console.log('[InstructorHome] ✅ Push enabled for:', instructorName, 'token:', token.substring(0, 20) + '...');
        } else {
          setPushMessage(t("g_7b5319") || "❌ 토큰을 가져올 수 없습니다.");
        }
      } else if (permission === 'denied') {
        setPushMessage(t("g_4cee70") || "❌ 알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.");
      }
    } catch (e) {
      console.error('Push setup failed:', e);
      setPushMessage((t("g_63f731") || "❌ 알림 설정 실패: ") + e.message);
    } finally {
      setPushLoading(false);
    }
  };
  const handleDisablePush = () => {
    setPushMessage(t("g_9cbaec") || "ℹ️ 브라우저 설정에서 알림을 끌 수 있습니다.\n사이트 설정 > 알림 > 차단");
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
        setPushMessage(t("g_6bc54d") || "ℹ️ 아이폰: Safari 하단 공유(↑) 클릭 > \"홈 화면에 추가\"");
      } else if (deviceOS === 'android') {
        setPushMessage(t("g_a80316") || "ℹ️ 안드로이드: 브라우저 메뉴(⋮) 클릭 > \"앱 설치\" 또는 \"홈 화면에 추가\"");
      } else {
        setPushMessage(t("g_b4df3f") || "ℹ️ 브라우저 메뉴에서 \"앱 설치\"를 찾아주세요.");
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
        label: t("g_7ba954") || "예정",
        color: '#FFD93D'
      };
      if (currentMinutes >= start && currentMinutes < end) return {
        label: t("g_7890ca") || "진행 중",
        color: '#4CAF50'
      };
      return {
        label: t("g_cafdc6") || "종료",
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
        }}>{t("g_10d96e") || "총"}{list.length}{t("g_3c5525") || "명 출석"}</span>
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
                }}>{t("g_884009") || "New"}</span>;
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
                                                <UserFocus size={10} weight="fill" />{t("g_d4edf3") || "안면일치"}</span>}
                                        {/* 안면인식 등록 상태 뱃지 */}
                                        {(() => {
                const memberData = record.memberId ? memberService.getMemberById(record.memberId) : null;
                if (!memberData) return null;
                return memberData.hasFaceDescriptor ? <span onClick={e => {
                  e.stopPropagation();
                  if (deletingFaceMemberId) return;
                  if (isDemo) {
                    alert(t('demo_readonly') || "데모 환경에서는 안면 데이터를 삭제할 수 없습니다.");
                    return;
                  }
                  if (!confirm((t('confirm_delete_face_data') || `Delete facial recognition data for ${record.memberName}?\n\nThey can re-register at the kiosk.`).replace('{name}', record.memberName))) return;
                  setDeletingFaceMemberId(record.memberId);
                  memberService.deleteFaceDescriptor(record.memberId).then(result => {
                    if (result.success) {
                      alert(t("g_fc6a3e") || "안면 인식 데이터가 삭제되었습니다.");
                    } else {
                      alert((t("g_6bafa7") || "Delete failed: ") + (result.error || t("g_5e9f6b") || "Unknown error"));
                    }
                  }).catch(() => alert(t("g_b4d561") || "삭제 중 오류가 발생했습니다.")).finally(() => setDeletingFaceMemberId(null));
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
                }} title={t("g_2ffd1a") || "클릭하여 안면 데이터 삭제"}>{t("g_5b426c") || "🧠 안면등록 ✕"}</span> : null;
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
      }}>{t("g_ef43c1") || "출석 데이터가 없습니다"}</div>}
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
        }}>{t("g_873180") || "📋 오늘 나의 수업 출석 현황"}</h3>
                    <span style={{
          fontSize: '0.8rem',
          color: 'var(--text-secondary)'
        }}>{todayStr} ({attendance.length}{t("g_8038a0") || "people"})</span>
                </div>
                
                {attendanceLoading ? <div style={{
        textAlign: 'center',
        color: 'var(--text-secondary)',
        padding: '20px'
      }}>{t("g_06e61b") || "로딩 중..."}</div> : <>
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
          }}>{t("g_802f1e") || "오늘은 수업 일정이 없습니다"}</div>
                                <div style={{
            fontSize: '0.85rem',
            opacity: 0.7
          }}>{t("g_3fd487") || "편안한 휴식과 충전의 시간 되시길 바랍니다!"}</div>
                            </div> : (config.BRANCHES || []).map(branch => renderAttendanceList(attendanceByBranch[branch.id] || [], config.BRANCHES?.length > 1 ? branch.name : t("g_294547") || "출석 현황", branch.color, branch.id))}
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
          }}>{t("g_7feae3") || "나의 수업 출석Member 알림"}</h3>
                        <div style={{
            margin: '2px 0 0',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>{t("g_b995aa") || "Member 출석 시 알림 받기"}</div>
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
        }}>{t("g_c476cd") || "알림 설정이 켜져 있습니다"}</div>
                        <div style={{
          color: 'var(--text-secondary)',
          fontSize: '0.8rem'
        }}>{t("g_ed87c8") || "토글을 눌러 알림을 끌 수 있습니다."}</div>
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
          }} />{t("g_f0af9d") || "설정 중... 팝업을 확인해주세요"}</> : t("g_0caaa7") || "🔔 알림 권한 허용하기"}
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
          }}>{t("g_b92f83") || "화면에 앱 보관하기"}</h3>
                            <div style={{
            margin: '4px 0 0',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
                                {deviceOS === 'ios' ? t("g_489f35") || "사파리(Safari)에서 홈 화면에 추가할 수 있습니다." : t("g_157492") || "하단의 버튼을 누르거나 설치 팝업을 확인하세요."}
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
          }}>{t("g_b84f07") || "하단"}<Share size={18} weight="bold" style={{
              verticalAlign: 'middle',
              margin: '0 2px'
            }} /> <strong>{t("g_bbf57b") || "공유 버튼"}</strong>{t("g_064378") || "을 클릭하세요."}</span>
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
            }} /> <strong>{t("g_100222") || "홈 화면에 추가"}</strong>{t("g_5f09f8") || "를 선택하세요."}</span>
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
        }} />{t("g_caa253") || "폰에 앱 설치하기"}</button>}
                </div>}



            {lightboxImage && <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
        </div>;
};
export default InstructorHome;