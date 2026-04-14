import { useState, useRef } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { X, PaperPlaneTilt, Calendar } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';
import { getCurrentStudioId } from '../../../utils/resolveStudioId';
const SMS_ENABLED_STUDIOS = ['boksaem-yoga'];
const DEMO_STUDIOS = ['demo-yoga'];
const KAKAO_PASSFLOW_URL = 'http://pf.kakao.com/_zDxiMX/chat';
const SEND_MODES = [{
  id: 'push_only',
  labelKey: 'g_a03713',
  labelFallback: "\uC571 \uD478\uC2DC\uB9CC",
  descKey: 'g_667dd4',
  descFallback: "\uBB34\uB8CC",
  icon: '📱',
  color: '#10b981'
}, {
  id: 'push_first',
  labelKey: 'g_3bd88d',
  labelFallback: "\uD478\uC2DC \uC6B0\uC120",
  descKey: 'g_ef5af5',
  descFallback: "\uD478\uC2DC \uC2E4\uD328 \uC2DC SMS",
  icon: '📱➡📩',
  color: 'var(--primary-gold)'
}, {
  id: 'sms_only',
  labelKey: 'g_d4f540',
  labelFallback: "SMS/LMS\uB9CC",
  descKey: 'g_b812d5',
  descFallback: "\uBB38\uC790 \uBE44\uC6A9 \uBC1C\uC0DD",
  icon: '📩',
  color: '#3B82F6'
}];
const BulkMessageModal = ({
  isOpen,
  onClose,
  selectedMemberIds,
  memberCount
}) => {
  const t = useLanguageStore(s => s.t);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [sendMode, setSendMode] = useState('push_first');
  const scheduleInputRef = useRef(null);
  if (!isOpen) return null;
  const studioId = getCurrentStudioId();
  const isSmsAvailable = SMS_ENABLED_STUDIOS.includes(studioId);
  const isDemo = DEMO_STUDIOS.includes(studioId);
  const templates = [t("g_ef461d") || "[\uC77C\uAD04\uC5F0\uC7A5] \uD734\uBB34\uB85C \uC778\uD574 \uC804 \uD68C\uC6D0 \uC218\uAC15 \uAE30\uAC04\uC774 O\uC77C \uC5F0\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", t("g_e6da62") || "[\uC784\uC2DC\uD734\uBB34] O\uC6D4 O\uC77C~O\uC77C \uD734\uBB34 \uC548\uB0B4\uB4DC\uB9BD\uB2C8\uB2E4. \uC591\uD574 \uBD80\uD0C1\uB4DC\uB9BD\uB2C8\uB2E4 \uD83D\uDE4F", t("g_2a6202") || "[\uBA85\uC808\uC778\uC0AC] \uC990\uAC70\uC6B4 \uBA85\uC808 \uBCF4\uB0B4\uC138\uC694! \uC5F0\uD734 \uAE30\uAC04 \uC218\uAC15\uAD8C\uC774 \uC790\uB3D9 \uC5F0\uC7A5\uB429\uB2C8\uB2E4.", t("g_3408a5") || "[\uC218\uC5C5\uBCC0\uACBD] \uB2E4\uC74C \uC8FC \uC218\uC5C5 \uC2DC\uAC04\uD45C\uAC00 \uBCC0\uACBD\uB429\uB2C8\uB2E4. \uD655\uC778 \uBD80\uD0C1\uB4DC\uB9BD\uB2C8\uB2E4.", t("g_65c3e6") || "[\uC774\uBCA4\uD2B8] \uCE5C\uAD6C \uCD94\uCC9C \uC774\uBCA4\uD2B8! \uD568\uAED8 \uB4F1\uB85D \uC2DC \uD560\uC778 \uD61C\uD0DD\uC744 \uB4DC\uB9BD\uB2C8\uB2E4 \uD83C\uDF81"];
  const calculateCost = msg => {
    let bytes = 0;
    for (let i = 0; i < msg.length; i++) {
      const code = msg.charCodeAt(i);
      bytes += code >> 7 ? 2 : 1;
    }
    const isLMS = bytes > 90;
    // Push is free, SMS costs apply only for sms_only/push_first fallback
    const costPerMsg = sendMode === 'push_only' ? 0 : isLMS ? 25 : 8.4;
    return {
      bytes,
      isLMS,
      costPerMsg,
      totalCost: costPerMsg * memberCount
    };
  };
  const costInfo = calculateCost(message);
  const handleSend = async () => {
    if (!message.trim()) return;
    if (isScheduled && !scheduledTime) {
      alert(t("g_e94562") || "\uC608\uC57D \uC2DC\uAC04\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.");
      return;
    }
    const isDemoSite = window.location.hostname.includes('passflow-demo') || localStorage.getItem('lastStudioId') === 'demo-yoga';
    if (isDemoSite) {
      alert(t("g_233984") || "\uB370\uBAA8 \uD658\uACBD\uC5D0\uC11C\uB294 \uBA54\uC2DC\uC9C0 \uBC1C\uC1A1 \uAE30\uB2A5\uC774 \uC81C\uD55C\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.");
      return;
    }
    const modeLabel = (() => { const m = SEND_MODES.find(m => m.id === sendMode); return m ? (t(m.labelKey) || m.labelFallback) : sendMode; })();
    const costText = sendMode === 'push_only' ? t("g_667dd4") || "\uBB34\uB8CC" : `약 ${costInfo.totalCost.toLocaleString()}원`;
    if (!confirm(`${memberCount}명에게 ${modeLabel} 방식으로 전송하시겠습니까?\n예상 비용: ${costText}`)) {
      return;
    }
    setSending(true);
    try {
      await storageService.sendBulkMessages(selectedMemberIds, message, isScheduled ? scheduledTime : null, sendMode);
      alert(isScheduled ? t("g_ad7a29") || "\uC608\uC57D \uBC1C\uC1A1\uC774 \uC124\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4." : t("g_45b945") || "\uC804\uC1A1\uC774 \uC2DC\uC791\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      onClose();
      setMessage('');
      setIsScheduled(false);
      setScheduledTime('');
      setSendMode('push_first');
    } catch (error) {
      console.error("Bulk send failed:", error);
      alert((t("g_0bfa3d") || "\uC804\uC1A1 \uC2E4\uD328: ") + error.message);
    } finally {
      setSending(false);
    }
  };

  // [UX] Auto-open picker when scheduled is checked
  const handleScheduleToggle = e => {
    const checked = e.target.checked;
    setIsScheduled(checked);
    if (checked) {
      setTimeout(() => {
        try {
          if (scheduleInputRef.current) scheduleInputRef.current.showPicker();
        } catch (err) {
          console.log('showPicker not supported', err);
        }
      }, 100);
    }
  };
  return <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(5px)'
  }}>
            <div className="fade-in" style={{
      background: '#1d1d2b',
      width: '90%',
      maxWidth: '500px',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.1)',
      padding: '24px',
      color: 'white',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
    }}>
                <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
                    <h3 style={{
          margin: 0,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
                        <PaperPlaneTilt weight="fill" color="var(--primary-gold)" />
                        {t('단체 메시지 전송')}
                    </h3>
                    <button onClick={onClose} disabled={sending} style={{
          background: 'none',
          border: 'none',
          color: '#a1a1aa',
          cursor: sending ? 'wait' : 'pointer',
          opacity: sending ? 0.3 : 1
        }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{
        marginBottom: '16px',
        color: '#e4e4e7',
        fontSize: '0.95rem'
      }}>
                    <span style={{
          color: 'var(--primary-gold)',
          fontWeight: 'bold'
        }}>{memberCount}{t("g_7b3c6e") || "\uBA85"}</span>{t('의 회원에게 메시지를 보냅니다.')}
                </div>

                {/* [NEW] Send Mode Selection — 3-way button group */}
                <div style={{
        marginBottom: '16px'
      }}>
                    <label style={{
          display: 'block',
          marginBottom: '6px',
          fontSize: '0.85rem',
          color: '#a1a1aa'
        }}>{t('전송 방식')}</label>
                    <div style={{
          display: 'flex',
          gap: '6px'
        }}>
                        {SEND_MODES.map(mode => {
            const isSmsMode = mode.id !== 'push_only';
            const smsBlocked = isSmsMode && !isSmsAvailable && !isDemo;
            return <button key={mode.id} onClick={() => {
              if (smsBlocked) {
                if (window.confirm(t("g_37f52d") || "\uBC1C\uC2E0\uC790 \uBC88\uD638\uAC00 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.\n\nSMS \uBC1C\uC1A1\uC744 \uC704\uD574\uC11C\uB294 \uBC1C\uC2E0\uC790 \uBC88\uD638 \uB4F1\uB85D\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.\n\uD328\uC2A4\uD50C\uB85C\uC6B0 \uCE74\uCE74\uC624\uD1A1\uC73C\uB85C \uBB38\uC758\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) {
                  window.open(KAKAO_PASSFLOW_URL, '_blank');
                }
                return;
              }
              setSendMode(mode.id);
            }} style={{
              flex: 1,
              padding: '10px 6px',
              borderRadius: '10px',
              border: sendMode === mode.id ? `2px solid ${mode.color}` : '1px solid rgba(255,255,255,0.1)',
              background: smsBlocked ? 'rgba(255,255,255,0.02)' : sendMode === mode.id ? `${mode.color}15` : 'rgba(255,255,255,0.03)',
              color: smsBlocked ? '#52525b' : sendMode === mode.id ? mode.color : '#a1a1aa',
              cursor: smsBlocked ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
              fontWeight: sendMode === mode.id ? '700' : '500',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              transition: 'all 0.15s ease',
              opacity: smsBlocked ? 0.5 : 1
            }}>
                                <span style={{
                fontSize: '1.1rem'
              }}>{mode.icon}</span>
                                <span>{t(mode.labelKey) || mode.labelFallback}</span>
                                <span style={{
                fontSize: '0.7rem',
                opacity: 0.7
              }}>
                                    {smsBlocked ? t("g_860baf") || "\uB4F1\uB85D \uD544\uC694" : isDemo && isSmsMode ? t("g_15a959") || "\uC2DC\uBBAC\uB808\uC774\uC158" : t(mode.descKey) || mode.descFallback}
                                </span>
                            </button>;
          })}
                    </div>
                </div>

                <div style={{
        background: 'rgba(255,255,255,0.05)',
        padding: '15px',
        borderRadius: '12px',
        marginBottom: '16px'
      }}>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t('전송할 내용을 입력하세요...')} style={{
          width: '100%',
          height: '120px',
          background: 'transparent',
          border: 'none',
          color: 'white',
          fontSize: '1rem',
          resize: 'none',
          outline: 'none'
        }} />
                    
                    {/* Cost & SMS/LMS Info Bar */}
                    <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '10px',
          marginTop: '10px',
          fontSize: '0.8rem',
          color: '#a1a1aa'
        }}>
                        {sendMode === 'push_only' ? <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%'
          }}>
                                <span>{message.length}{t("g_4e19f2") || "\uC790"}</span>
                                <span style={{
              color: '#10b981',
              fontWeight: '600'
            }}>{t('📱 앱 푸시 • 무료')}</span>
                            </div> : <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            alignItems: 'center'
          }}>
                                <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
                                    <span style={{
                background: costInfo.isLMS ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: costInfo.isLMS ? '#f59e0b' : '#10b981',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: '700',
                fontSize: '0.7rem'
              }}>
                                        {costInfo.isLMS ? 'LMS' : 'SMS'}
                                    </span>
                                    <span>{message.length}{t("g_95b65e") || "\uC790 \u2022"}{costInfo.bytes}/{costInfo.isLMS ? 2000 : 90} bytes</span>
                                </div>
                                <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: costInfo.isLMS ? '#f59e0b' : '#10b981',
              fontWeight: '600'
            }}>
                                    <span>{t("g_6ae50a") || "\uAC74\uB2F9"}{costInfo.costPerMsg}{t("g_771dc3") || "\uC6D0"}</span>
                                    <span style={{
                opacity: 0.6
              }}>×</span>
                                    <span>{memberCount}{t("g_7b3c6e") || "\uBA85"}</span>
                                    <span style={{
                opacity: 0.6
              }}>=</span>
                                    <span style={{
                fontWeight: '700'
              }}>{t("g_773765") || "\uC57D"}{costInfo.totalCost.toLocaleString()}{t("g_771dc3") || "\uC6D0"}</span>
                                </div>
                            </div>}
                    </div>
                </div>

                {/* Scheduling */}
                <div style={{
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(0,0,0,0.2)',
        padding: '12px',
        borderRadius: '8px'
      }}>
                    <input type="checkbox" id="bulkSchedule" checked={isScheduled} onChange={handleScheduleToggle} style={{
          accentColor: 'var(--primary-gold)',
          width: '16px',
          height: '16px',
          cursor: 'pointer'
        }} />
                    <label htmlFor="bulkSchedule" style={{
          color: '#e4e4e7',
          fontSize: '0.9rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
                        <Calendar size={16} /> {t('예약 발송')}
                    </label>
                    {isScheduled && <input ref={scheduleInputRef} type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} onClick={() => {
          try {
            if (scheduleInputRef.current) scheduleInputRef.current.showPicker();
          } catch (e) {/* ignore */}
        }} style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '6px',
          padding: '6px 8px',
          color: 'white',
          fontSize: '0.9rem',
          marginLeft: 'auto',
          cursor: 'pointer'
        }} />}
                </div>

                {/* Templates (Quick Text) */}
                <div style={{
        marginBottom: '25px'
      }}>
                    <p style={{
          color: '#a1a1aa',
          fontSize: '0.85rem',
          marginBottom: '8px'
        }}>{t('자주 쓰는 문구')}</p>
                    <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
                        {templates.map((t, i) => <button key={i} onClick={() => setMessage(t)} style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '6px 12px',
            color: '#e4e4e7',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}>
                                {t.length > 15 ? t.substring(0, 15) + '...' : t}
                            </button>)}
                    </div>
                </div>

                <button onClick={handleSend} disabled={sending || !message.trim()} style={{
        width: '100%',
        background: sending ? '#52525b' : 'var(--primary-gold)',
        color: sending ? '#d4d4d8' : 'var(--text-on-primary)',
        border: 'none',
        borderRadius: '12px',
        padding: '14px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: sending ? 'wait' : 'pointer',
        boxShadow: sending ? 'none' : '0 4px 12px rgba(var(--primary-rgb), 0.3)'
      }}>
                    {sending ? t("g_499898") || "\uC804\uC1A1 \uC911..." : isScheduled ? t("g_bdfc4c") || "\uC608\uC57D \uBC1C\uC1A1\uD558\uAE30" : t("g_9760b2") || "\uC804\uC1A1\uD558\uAE30"}
                </button>
            </div>
        </div>;
};
export default BulkMessageModal;