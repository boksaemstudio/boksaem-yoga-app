import { useLanguageStore } from '../../../stores/useLanguageStore';
import { useState, useEffect, useRef } from 'react';
import { storageService } from '../../../services/storage';
import { onSnapshot, query, where, orderBy, limit as firestoreLimit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { tenantDb } from '../../../utils/tenantDb';
import { getCurrentStudioId } from '../../../utils/resolveStudioId';

// [SaaS] SMS 발송이 가능한 스튜디오 목록 (알리고 발신자 번호 등록 완료)
const SMS_ENABLED_STUDIOS = ['boksaem-yoga'];
const DEMO_STUDIOS = ['demo-yoga'];
const KAKAO_PASSFLOW_URL = 'http://pf.kakao.com/_zDxiMX/chat';
const SEND_MODES = [{
  id: 'push_only',
  label: t("g_a03713") || t("g_a03713") || t("g_a03713") || t("g_a03713") || t("g_a03713") || "\uC571 \uD478\uC2DC\uB9CC",
  desc: t("g_667dd4") || t("g_667dd4") || t("g_667dd4") || t("g_667dd4") || t("g_667dd4") || "\uBB34\uB8CC",
  icon: '📱',
  color: '#10b981'
}, {
  id: 'push_first',
  label: t("g_3bd88d") || t("g_3bd88d") || t("g_3bd88d") || t("g_3bd88d") || t("g_3bd88d") || "\uD478\uC2DC \uC6B0\uC120",
  desc: t("g_ef5af5") || t("g_ef5af5") || t("g_ef5af5") || t("g_ef5af5") || t("g_ef5af5") || "\uD478\uC2DC \uC2E4\uD328 \uC2DC SMS",
  icon: '📱➡📩',
  color: 'var(--primary-gold)'
}, {
  id: 'sms_only',
  label: t("g_d4f540") || t("g_d4f540") || t("g_d4f540") || t("g_d4f540") || t("g_d4f540") || "SMS/LMS\uB9CC",
  desc: t("g_b812d5") || t("g_b812d5") || t("g_b812d5") || t("g_b812d5") || t("g_b812d5") || "\uBB38\uC790 \uBE44\uC6A9 \uBC1C\uC0DD",
  icon: '📩',
  color: '#3B82F6'
}];
const MessagesTab = ({
  memberId,
  member,
  prefillMessage,
  onPrefillConsumed
}) => {
  const t = useLanguageStore(s => s.t);
  const isUnlimited = member && (member.credits >= 999999 || member.endDate === 'unlimited');
  const [attendanceSmsEnabled, setAttendanceSmsEnabled] = useState(member?.attendanceSmsEnabled || false);
  const [smsSaving, setSmsSaving] = useState(false);
  // [SaaS] SMS 가용 여부
  const studioId = getCurrentStudioId();
  const isSmsAvailable = SMS_ENABLED_STUDIOS.includes(studioId);
  const isDemo = DEMO_STUDIOS.includes(studioId);
  const handleToggleAttendanceSms = async () => {
    const newVal = !attendanceSmsEnabled;
    setSmsSaving(true);
    try {
      const memberRef = doc(tenantDb.collection('members'), memberId);
      await updateDoc(memberRef, {
        attendanceSmsEnabled: newVal
      });
      setAttendanceSmsEnabled(newVal);
    } catch (err) {
      console.error('[MessagesTab] Toggle SMS failed:', err);
      alert(t("g_34f3da") || t("g_34f3da") || t("g_34f3da") || t("g_34f3da") || t("g_34f3da") || "\uC124\uC815 \uC800\uC7A5 \uC2E4\uD328");
    } finally {
      setSmsSaving(false);
    }
  };
  const [message, setMessage] = useState('');

  // 변경 내역 자동 채우기 (회원정보 저장 후 메시지 탭 이동 시)
  useEffect(() => {
    if (prefillMessage) {
      setMessage(prefillMessage);
      setSendMode('push_first');
      onPrefillConsumed?.();
    }
  }, [prefillMessage]);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [msgLimit, setMsgLimit] = useState(10);
  const [notices, setNotices] = useState([]);
  const [sendMode, setSendMode] = useState('push_first');

  // [NEW] Scheduled Sending State
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const scheduleInputRef = useRef(null);

  // [UX] Auto-open picker when scheduled is checked
  const handleScheduleToggle = e => {
    const checked = e.target.checked;
    setIsScheduled(checked);
    if (checked) {
      setTimeout(() => {
        try {
          if (scheduleInputRef.current) scheduleInputRef.current.showPicker();
        } catch (e) {
          // ignore
        }
      }, 100);
    }
  };

  // [REAL-TIME] Individual Message History Listener
  useEffect(() => {
    if (!memberId) return;
    console.log(`[MessagesTab] Subscribing to messages for member: ${memberId}`);
    const q = query(tenantDb.collection('messages'), where("memberId", "==", memberId), orderBy("timestamp", "desc"), firestoreLimit(msgLimit));
    const unsub = onSnapshot(q, snap => {
      const logs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'individual'
      }));
      // [FIX] Sort client-side
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setHistory(logs);
    }, err => {
      console.error("[MessagesTab] History listener error:", err);
    });
    return () => unsub();
  }, [memberId, msgLimit]);

  // [NEW] Load Notice/Campaign Push History
  useEffect(() => {
    const loadNotices = async () => {
      try {
        const q = query(tenantDb.collection('push_history'), where('type', 'in', ['campaign', 'notice']), orderBy('createdAt', 'desc'), firestoreLimit(20));
        const snapshot = await getDocs(q);
        const noticeList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'notice',
          timestamp: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
        }));
        setNotices(noticeList);
      } catch (err) {
        console.error('[MessagesTab] Failed to load notices:', err);
      }
    };
    loadNotices();
  }, []);
  const handleSend = async () => {
    if (!message.trim() || !memberId) return;
    const isDemoSite = window.location.hostname.includes('passflow') || localStorage.getItem('lastStudioId') === 'demo-yoga';
    if (isDemoSite) {
      alert(t("g_233984") || t("g_233984") || t("g_233984") || t("g_233984") || t("g_233984") || "\uB370\uBAA8 \uD658\uACBD\uC5D0\uC11C\uB294 \uBA54\uC2DC\uC9C0 \uBC1C\uC1A1 \uAE30\uB2A5\uC774 \uC81C\uD55C\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.");
      return;
    }
    setSending(true);
    try {
      await storageService.addMessage(memberId, message, isScheduled ? new Date(scheduledTime).toISOString() : null, sendMode);
      const sentMsg = message;
      setMessage('');
      setIsScheduled(false);
      setScheduledTime('');
      // [UX FIX] 전송 성공 피드백
      alert(isScheduled ? t("g_7b34d9") || t("g_7b34d9") || t("g_7b34d9") || t("g_7b34d9") || t("g_7b34d9") || "\uBA54\uC2DC\uC9C0\uAC00 \uC608\uC57D\uB418\uC5C8\uC2B5\uB2C8\uB2E4." : t("g_a91940") || t("g_a91940") || t("g_a91940") || t("g_a91940") || t("g_a91940") || "\u2705 \uBA54\uC2DC\uC9C0\uAC00 \uC804\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
    } catch (error) {
      console.error("Message send failed:", error);
      alert(t("g_1b63d2") || t("g_1b63d2") || t("g_1b63d2") || t("g_1b63d2") || t("g_1b63d2") || "\u274C \uBC1C\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uB124\uD2B8\uC6CC\uD06C \uC0C1\uD0DC\uB97C \uD655\uC778\uD574\uC8FC\uC138\uC694.");
    } finally {
      setSending(false);
    }
  };
  const templates = [t("g_8dd155") || t("g_8dd155") || t("g_8dd155") || t("g_8dd155") || t("g_8dd155") || "\uD68C\uC6D0\uB2D8, \uC7AC\uB4F1\uB85D \uAE30\uAC04\uC785\uB2C8\uB2E4. \uD655\uC778 \uBD80\uD0C1\uB4DC\uB824\uC694! \uD83E\uDDD8\u200D\u2640\uFE0F", t("g_c6fabf") || t("g_c6fabf") || t("g_c6fabf") || t("g_c6fabf") || t("g_c6fabf") || "\uC624\uB79C\uB9CC\uC774\uB124\uC694! \uC218\uB828\uD558\uB7EC \uC624\uC138\uC694 \u2728", t("g_ec880c") || t("g_ec880c") || t("g_ec880c") || t("g_ec880c") || t("g_ec880c") || "\uC218\uAC15\uAD8C\uC774 \uACE7 \uB9CC\uB8CC\uB429\uB2C8\uB2E4. \uC7AC\uB4F1\uB85D\uC744 \uC548\uB0B4\uB4DC\uB824\uC694!", t("g_35659d") || t("g_35659d") || t("g_35659d") || t("g_35659d") || t("g_35659d") || "\uC794\uC5EC \uD69F\uC218\uAC00 \uC5BC\uB9C8 \uB0A8\uC9C0 \uC54A\uC558\uC5B4\uC694. \uD655\uC778\uD574\uC8FC\uC138\uC694!"];
  return <div className="fade-in" style={{
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  }}>
            {/* 출석 알림 설정 */}
            <div style={{
      background: 'rgba(255,255,255,0.05)',
      padding: '14px 16px',
      borderRadius: '12px',
      marginBottom: '16px',
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
                <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
                    <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
                        <span style={{
            fontSize: '1rem'
          }}>📲</span>
                        <span style={{
            fontSize: '0.85rem',
            color: 'white',
            fontWeight: '700'
          }}>{t("g_27d6aa") || t("g_27d6aa") || t("g_27d6aa") || t("g_27d6aa") || t("g_27d6aa") || "\uCD9C\uC11D \uC54C\uB9BC \uC124\uC815"}</span>
                    </div>
                </div>
                {/* 앱 푸시 안내 */}
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 10px',
        borderRadius: '8px',
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.15)',
        marginBottom: '8px'
      }}>
                    <span style={{
          fontSize: '0.8rem'
        }}>📱</span>
                    <span style={{
          fontSize: '0.78rem',
          color: '#10b981'
        }}>{t("g_7b6eff") || t("g_7b6eff") || t("g_7b6eff") || t("g_7b6eff") || t("g_7b6eff") || "\uC571 \uD478\uC2DC \uC54C\uB9BC: \uCD9C\uC11D \uC2DC \uC790\uB3D9 \uC804\uC1A1 (\uC794\uC5EC \uD69F\uC218 \xB7 \uAE30\uAC04 \uC815\uBCF4 \uD3EC\uD568, \uBB34\uB8CC)"}</span>
                </div>
                {/* SMS 옵션 — 출석 시 자동 / 지금 보내기 */}
                {!isUnlimited ? <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
                        {/* 자동 보내기 토글 */}
                        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderRadius: '8px',
          background: attendanceSmsEnabled ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${attendanceSmsEnabled ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.08)'}`
        }}>
                            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
                                <span style={{
              fontSize: '0.8rem'
            }}>📩</span>
                                <div>
                                    <div style={{
                fontSize: '0.78rem',
                color: attendanceSmsEnabled ? '#3B82F6' : '#a1a1aa',
                fontWeight: attendanceSmsEnabled ? '700' : '500'
              }}>{t("g_d51359") || t("g_d51359") || t("g_d51359") || t("g_d51359") || t("g_d51359") || "\uCD9C\uC11D \uC2DC \uC790\uB3D9 SMS \uBC1C\uC1A1"}</div>
                                    <div style={{
                fontSize: '0.68rem',
                color: '#71717a',
                marginTop: '2px'
              }}>{t("g_0fdaf2") || t("g_0fdaf2") || t("g_0fdaf2") || t("g_0fdaf2") || t("g_0fdaf2") || "\u26A0\uFE0F \uAC74\uB2F9 8.4\uC6D0 \uBE44\uC6A9 \uBC1C\uC0DD \u2022 \uC794\uC5EC\uD69F\uC218 \xB7 \uAE30\uAC04 \xB7 \uB9CC\uB8CC\uC77C"}</div>
                                </div>
                            </div>
                            <button onClick={handleToggleAttendanceSms} disabled={smsSaving} style={{
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            border: 'none',
            background: attendanceSmsEnabled ? '#3B82F6' : 'rgba(255,255,255,0.15)',
            cursor: smsSaving ? 'not-allowed' : 'pointer',
            position: 'relative',
            transition: 'background 0.2s'
          }}>
                                <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '3px',
              left: attendanceSmsEnabled ? '22px' : '4px',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }} />
                            </button>
                        </div>
                        {/* 지금 보내기 버튼 */}
                        <button onClick={() => {
          setSendMode('sms_only');
          const name = member?.name || t("g_6745df") || t("g_6745df") || t("g_6745df") || t("g_6745df") || t("g_6745df") || "\uD68C\uC6D0";
          const credits = member?.credits;
          const endDate = member?.endDate;
          const count = member?.attendanceCount || 0;
          const parts = [`${name} 회원님 출석 현황 안내`];
          if (credits !== undefined && credits < 999999) parts.push(`잔여 ${credits}회`);
          if (endDate && endDate !== 'TBD' && endDate !== 'unlimited') {
            const today = new Date();
            const end = new Date(endDate);
            const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
            parts.push(`기간: ~${endDate.slice(5)} (${diff >= 0 ? diff + (t("g_020489") || t("g_020489") || t("g_020489") || t("g_020489") || t("g_020489") || "\uC77C \uB0A8\uC74C") : t("g_0c9d60") || t("g_0c9d60") || t("g_0c9d60") || t("g_0c9d60") || t("g_0c9d60") || "\uB9CC\uB8CC"})`);
          }
          if (count > 0) parts.push(`누적 ${count}회 출석`);
          setMessage(parts.join('\n'));
        }} style={{
          padding: '8px 10px',
          borderRadius: '8px',
          cursor: 'pointer',
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.25)',
          color: '#3B82F6',
          fontSize: '0.78rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          transition: 'all 0.15s'
        }}>{t("g_085c7f") || t("g_085c7f") || t("g_085c7f") || t("g_085c7f") || t("g_085c7f") || "\uD83D\uDCE4 \uC9C0\uAE08 SMS\uB85C \uC794\uC5EC \uC815\uBCF4 \uBCF4\uB0B4\uAE30"}<span style={{
            fontSize: '0.65rem',
            fontWeight: '500',
            opacity: 0.7
          }}>{t("g_b91a7a") || t("g_b91a7a") || t("g_b91a7a") || t("g_b91a7a") || t("g_b91a7a") || "(\uAC74\uB2F9 8.4\uC6D0)"}</span>
                        </button>
                    </div> : <div style={{
        padding: '8px 10px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: '0.78rem',
        color: '#71717a'
      }}>{t("g_7cac01") || t("g_7cac01") || t("g_7cac01") || t("g_7cac01") || t("g_7cac01") || "\uD83D\uDCE9 SMS \uC54C\uB9BC: \uBB34\uC81C\uD55C \uD68C\uC6D0\uC740 \uBCF4\uB0B4\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4 (\uC794\uC5EC \uD69F\uC218 \uC815\uBCF4 \uC5C6\uC74C)"}</div>}
            </div>

            {/* Input Area */}
            <div style={{
      background: 'rgba(255,255,255,0.05)',
      padding: '15px',
      borderRadius: '12px',
      marginBottom: '20px'
    }}>
                
                {/* [NEW] Send Mode Selection — 3-way radio */}
                <div style={{
        marginBottom: '12px'
      }}>
                    <label style={{
          display: 'block',
          marginBottom: '6px',
          fontSize: '0.8rem',
          color: '#a1a1aa'
        }}>{t("g_519b69") || t("g_519b69") || t("g_519b69") || t("g_519b69") || t("g_519b69") || "\uC804\uC1A1 \uBC29\uC2DD"}</label>
                    <div style={{
          display: 'flex',
          gap: '6px'
        }}>
                        {SEND_MODES.map(mode => {
            const isSmsMode = mode.id !== 'push_only';
            const smsBlocked = isSmsMode && !isSmsAvailable && !isDemo;
            return <button key={mode.id} onClick={() => {
              if (smsBlocked) {
                if (window.confirm(t("g_37f52d") || t("g_37f52d") || t("g_37f52d") || t("g_37f52d") || t("g_37f52d") || "\uBC1C\uC2E0\uC790 \uBC88\uD638\uAC00 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.\n\nSMS \uBC1C\uC1A1\uC744 \uC704\uD574\uC11C\uB294 \uBC1C\uC2E0\uC790 \uBC88\uD638 \uB4F1\uB85D\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.\n\uD328\uC2A4\uD50C\uB85C\uC6B0 \uCE74\uCE74\uC624\uD1A1\uC73C\uB85C \uBB38\uC758\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) {
                  window.open(KAKAO_PASSFLOW_URL, '_blank');
                }
                return;
              }
              setSendMode(mode.id);
            }} style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: '8px',
              border: sendMode === mode.id ? `2px solid ${mode.color}` : '1px solid rgba(255,255,255,0.1)',
              background: smsBlocked ? 'rgba(255,255,255,0.02)' : sendMode === mode.id ? `${mode.color}15` : 'rgba(255,255,255,0.03)',
              color: smsBlocked ? '#52525b' : sendMode === mode.id ? mode.color : '#a1a1aa',
              cursor: smsBlocked ? 'not-allowed' : 'pointer',
              fontSize: '0.75rem',
              fontWeight: sendMode === mode.id ? '700' : '500',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s ease',
              opacity: smsBlocked ? 0.5 : 1
            }}>
                                <span style={{
                fontSize: '1rem'
              }}>{mode.icon}</span>
                                <span>{mode.label}</span>
                                <span style={{
                fontSize: '0.65rem',
                opacity: 0.7
              }}>
                                    {smsBlocked ? t("g_860baf") || t("g_860baf") || t("g_860baf") || t("g_860baf") || t("g_860baf") || "\uB4F1\uB85D \uD544\uC694" : isDemo && isSmsMode ? t("g_15a959") || t("g_15a959") || t("g_15a959") || t("g_15a959") || t("g_15a959") || "\uC2DC\uBBAC\uB808\uC774\uC158" : mode.desc}
                                </span>
                            </button>;
          })}
                    </div>
                </div>

                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t("g_397d40") || t("g_397d40") || t("g_397d40") || t("g_397d40") || t("g_397d40") || "\uD68C\uC6D0\uC5D0\uAC8C \uBCF4\uB0BC \uBA54\uC2DC\uC9C0\uB97C \uC785\uB825\uD558\uC138\uC694..."} style={{
        width: '100%',
        height: '80px',
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
        fontSize: '0.8rem',
        color: '#a1a1aa',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '8px',
        marginBottom: '8px'
      }}>
                    {(() => {
          let bytes = 0;
          for (let i = 0; i < message.length; i++) {
            const code = message.charCodeAt(i);
            bytes += code >> 7 ? 2 : 1;
          }
          const isLMS = bytes > 90;
          const smsCost = 8.4;
          const lmsCost = 25;
          const cost = sendMode === 'push_only' ? 0 : isLMS ? lmsCost : smsCost;
          const maxBytes = isLMS ? 2000 : 90;
          return sendMode === 'push_only' ? <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%'
          }}>
                                <span>{message.length}{t("g_4e19f2") || t("g_4e19f2") || t("g_4e19f2") || t("g_4e19f2") || t("g_4e19f2") || "\uC790"}</span>
                                <span style={{
              color: '#10b981',
              fontWeight: '600'
            }}>{t("g_fd4d48") || t("g_fd4d48") || t("g_fd4d48") || t("g_fd4d48") || t("g_fd4d48") || "\uD83D\uDCF1 \uC571 \uD478\uC2DC \u2022 \uBB34\uB8CC"}</span>
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
                background: isLMS ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isLMS ? '#f59e0b' : '#10b981',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: '700',
                fontSize: '0.7rem'
              }}>
                                        {isLMS ? 'LMS' : 'SMS'}
                                    </span>
                                    <span>{message.length}{t("g_95b65e") || t("g_95b65e") || t("g_95b65e") || t("g_95b65e") || t("g_95b65e") || "\uC790 \u2022"}{bytes}/{maxBytes} bytes</span>
                                </div>
                                <span style={{
              color: isLMS ? '#f59e0b' : '#10b981',
              fontWeight: '600'
            }}>{t("g_6ae50a") || t("g_6ae50a") || t("g_6ae50a") || t("g_6ae50a") || t("g_6ae50a") || "\uAC74\uB2F9"}{cost}{t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || "\uC6D0"}{sendMode === 'push_first' ? t("g_4a6315") || t("g_4a6315") || t("g_4a6315") || t("g_4a6315") || t("g_4a6315") || " (\uD478\uC2DC \uC2E4\uD328 \uC2DC)" : ''}
                                </span>
                            </div>;
        })()}
                </div>

                {/* Scheduling UI */}
                <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '0px'
      }}>
                    <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
                        <input type="checkbox" id="scheduleCheck" checked={isScheduled} onChange={handleScheduleToggle} style={{
            accentColor: 'var(--primary-gold)',
            width: '16px',
            height: '16px',
            cursor: 'pointer'
          }} />
                        <label htmlFor="scheduleCheck" style={{
            color: '#e4e4e7',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}>{t("g_13cdea") || t("g_13cdea") || t("g_13cdea") || t("g_13cdea") || t("g_13cdea") || "\u23F0 \uC608\uC57D \uBC1C\uC1A1"}</label>
                        
                        {isScheduled && <input ref={scheduleInputRef} type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} onClick={() => {
            try {
              if (scheduleInputRef.current) scheduleInputRef.current.showPicker();
            } catch (e) {
              // ignore
            }
          }} style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            padding: '4px 8px',
            color: 'white',
            marginLeft: '8px',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }} />}
                    </div>
                
                    <button onClick={handleSend} disabled={sending || !message.trim()} style={{
          background: sending || !message.trim() ? '#52525b' : 'var(--primary-gold)',
          color: sending || !message.trim() ? '#71717a' : 'var(--text-on-primary)',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 20px',
          fontWeight: 'bold',
          cursor: sending || !message.trim() ? 'not-allowed' : 'pointer',
          opacity: sending || !message.trim() ? 0.5 : 1,
          transition: 'all 0.2s'
        }}>
                        {sending ? t("g_a8d064") || t("g_a8d064") || t("g_a8d064") || t("g_a8d064") || t("g_a8d064") || "\uCC98\uB9AC \uC911..." : isScheduled ? t("g_afba01") || t("g_afba01") || t("g_afba01") || t("g_afba01") || t("g_afba01") || "\uC608\uC57D \uD558\uAE30" : t("g_4092d0") || t("g_4092d0") || t("g_4092d0") || t("g_4092d0") || t("g_4092d0") || "\uC804\uC1A1 \uD558\uAE30"}
                    </button>
                </div>
            </div>

            {/* Templates */}
            <div style={{
      marginBottom: '25px'
    }}>
                <p style={{
        color: '#a1a1aa',
        fontSize: '0.85rem',
        marginBottom: '8px'
      }}>{t("g_45b4c9") || t("g_45b4c9") || t("g_45b4c9") || t("g_45b4c9") || t("g_45b4c9") || "\uC790\uC8FC \uC4F0\uB294 \uBB38\uAD6C (\uBE44\uC6A9 \uC808\uC57D \uD83D\uDCA1)"}</p>
                <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
                    {templates.map((t, i) => <button key={i} onClick={() => setMessage(t)} style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '8px 12px',
          color: '#e4e4e7',
          fontSize: '0.85rem',
          cursor: 'pointer',
          textAlign: 'left'
        }}>
                            {t}
                        </button>)}
                </div>
            </div>

            {/* History */}
            <div style={{
      flex: 1,
      overflowY: 'auto'
    }}>
                <h4 style={{
        color: 'var(--primary-gold)',
        fontSize: '0.95rem',
        marginBottom: '10px'
      }}>{t("g_02b8e5") || t("g_02b8e5") || t("g_02b8e5") || t("g_02b8e5") || t("g_02b8e5") || "\uBC1C\uC1A1 \uC774\uB825 (\uAC1C\uBCC4 + \uACF5\uC9C0)"}</h4>
                {(() => {
        // Merge and sort messages and notices
        const combined = [...history, ...notices];
        combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return combined.length === 0 ? <p style={{
          color: '#52525b',
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '0.9rem'
        }}>{t("g_6c6ff6") || t("g_6c6ff6") || t("g_6c6ff6") || t("g_6c6ff6") || t("g_6c6ff6") || "\uBC1C\uC1A1\uB41C \uBA54\uC2DC\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."}</p> : <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
                            {combined.map(log => <div key={log.id} style={{
            background: log.type === 'notice' ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(0,0,0,0.3)',
            padding: '12px',
            borderRadius: '8px',
            border: log.type === 'notice' ? '1px solid rgba(var(--primary-rgb), 0.2)' : 'none'
          }}>
                                    <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '5px',
              alignItems: 'center'
            }}>
                                        <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                                            <span style={{
                  fontSize: '0.7rem',
                  color: log.type === 'notice' ? 'var(--primary-gold)' : '#3B82F6',
                  fontWeight: '700',
                  padding: '2px 6px',
                  background: log.type === 'notice' ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  borderRadius: '4px'
                }}>
                                                {log.type === 'notice' ? t("g_0b1a0f") || t("g_0b1a0f") || t("g_0b1a0f") || t("g_0b1a0f") || t("g_0b1a0f") || "\uACF5\uC9C0" : t("g_d79a15") || t("g_d79a15") || t("g_d79a15") || t("g_d79a15") || t("g_d79a15") || "\uAC1C\uBCC4"}
                                            </span>
                                            {/* Send Mode Badge */}
                                            {log.sendMode && <span style={{
                  fontSize: '0.65rem',
                  color: '#a1a1aa',
                  padding: '1px 4px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '3px'
                }}>
                                                    {log.sendMode === 'push_only' ? t("g_152365") || t("g_152365") || t("g_152365") || t("g_152365") || t("g_152365") || "\uD83D\uDCF1\uD478\uC2DC" : log.sendMode === 'sms_only' ? '📩SMS' : '📱➡📩'}
                                                </span>}
                                            <span style={{
                  fontSize: '0.8rem',
                  color: '#a1a1aa'
                }}>
                                                {log.timestamp ? new Date(log.timestamp).toLocaleString('ko-KR', {
                    timeZone: 'Asia/Seoul'
                  }) : t("g_499898") || t("g_499898") || t("g_499898") || t("g_499898") || t("g_499898") || "\uC804\uC1A1 \uC911..."}
                                            </span>
                                        </div>
                                        {log.type === 'individual' && <div style={{
                display: 'flex',
                gap: '6px',
                alignItems: 'center'
              }}>
                                                {/* Push Status */}
                                                {log.pushStatus && (log.pushStatus.sent ? <span style={{
                  fontSize: '0.75rem',
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>{t("g_d0553a") || t("g_d0553a") || t("g_d0553a") || t("g_d0553a") || t("g_d0553a") || "\uC571\uD478\uC2DC \uC131\uACF5"}</span> : <span style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  background: 'rgba(107, 114, 128, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>{t("g_f88594") || t("g_f88594") || t("g_f88594") || t("g_f88594") || t("g_f88594") || "\uC571\uD478\uC2DC \uC2E4\uD328"}</span>)}
                                                
                                                {/* SMS Status — 앱 푸시만 모드에서는 숨기기 */}
                                                {log.sendMode !== 'push_only' && (() => {
                  const st = log.smsStatus || log.solapiStatus;
                  if (!st) return null;
                  return st.sent ? <span style={{
                    fontSize: '0.75rem',
                    color: '#3B82F6',
                    background: 'rgba(59, 130, 246, 0.1)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>{t("g_0346ad") || t("g_0346ad") || t("g_0346ad") || t("g_0346ad") || t("g_0346ad") || "\uBB38\uC790 \uC131\uACF5"}</span> : <span style={{
                    fontSize: '0.75rem',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }} title={st.error || t("g_053d5f") || t("g_053d5f") || t("g_053d5f") || t("g_053d5f") || t("g_053d5f") || "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"}>{t("g_8fe81a") || t("g_8fe81a") || t("g_8fe81a") || t("g_8fe81a") || t("g_8fe81a") || "\uBB38\uC790 \uC2E4\uD328"}</span>;
                })()}
                                            </div>}
                                    </div>
                                    <div style={{
              color: 'white',
              fontSize: '0.9rem'
            }}>{log.content || log.body}</div>
                                </div>)}

                            {/* Pagination: Load More */}
                            {history.length >= msgLimit && <button onClick={() => setMsgLimit(prev => prev + 10)} style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(255,255,255,0.05)',
            color: '#a1a1aa',
            border: '1px dashed rgba(255,255,255,0.2)',
            borderRadius: '8px',
            marginTop: '5px',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}>{t("g_e509ec") || t("g_e509ec") || t("g_e509ec") || t("g_e509ec") || t("g_e509ec") || "\u25BF \uC774\uC804 \uBA54\uC2DC\uC9C0 \uB354\uBCF4\uAE30 (10\uAC1C \uCD94\uAC00)"}</button>}
                        </div>;
      })()}
            </div>
        </div>;
};
export default MessagesTab;