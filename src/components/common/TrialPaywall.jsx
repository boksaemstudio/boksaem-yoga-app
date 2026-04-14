import { useLanguageStore } from '../../stores/useLanguageStore';
import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { resolveStudioId } from '../../utils/resolveStudioId';

/**
 * TrialPaywall — 2개월 무료 체험 만료 시 어드민 접근 차단
 * registry에서 trial 정보를 확인하고:
 *   - 만료 전: 상단 알림 배너 표시
 *   - 만료 후: 전체 차단 + PayPal 결제 유도
 */
const PAYPAL_PAYMENT_LINK = 'https://paypal.me/passflowai/69USD';
const TrialPaywall = ({
  children
}) => {
  const t = useLanguageStore(s => s.t);
  const [trialInfo, setTrialInfo] = useState(null); // { status, trialEndDate, plan }
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const checkTrial = async () => {
      try {
        const studioId = resolveStudioId();
        // 복샘요가, 쌍문요가 등 기존 스튜디오는 registry에 없을 수 있음 → 체험 차단 면제
        const registryRef = doc(db, 'platform/registry/studios', studioId);
        const snap = await getDoc(registryRef);
        if (snap.exists()) {
          const data = snap.data();
          setTrialInfo({
            status: data.status,
            trialEndDate: data.trialEndDate,
            plan: data.plan,
            name: data.name
          });
        } else {
          setTrialInfo(null); // 레지스트리에 없는 스튜디오 = 기존 운영 중 (면제)
        }
      } catch (e) {
        console.warn('[TrialPaywall] Registry check failed:', e);
        setTrialInfo(null);
      }
      setLoading(false);
    };
    checkTrial();
  }, []);
  useEffect(() => {
    if (!trialInfo || trialInfo.status === 'active' || loading) return;
    const now = new Date();
    const trialEnd = trialInfo.trialEndDate ? new Date(trialInfo.trialEndDate) : null;
    if (!trialEnd) return;
    const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

    // D-5 부터 매일 한 번씩 접속 시 알림
    if (daysLeft > 0 && daysLeft <= 5) {
      const todayStr = now.toLocaleDateString('sv-SE'); // YYYY-MM-DD
      const lastAlert = localStorage.getItem('lastTrialAlertDate');
      if (lastAlert !== todayStr) {
        // 약간의 지연을 주어 UI가 렌더링된 후 뜨도록 함
        setTimeout(() => {
          alert(`🚨 [안내] PassFlow AI 무료 체험 만료까지 ${daysLeft}일 남았습니다.\n서비스 중단을 막기 위해 연장을 진행해 주세요.`);
        }, 500);
        localStorage.setItem('lastTrialAlertDate', todayStr);
      }
    }
  }, [trialInfo, loading]);
  if (loading) return null;
  if (!trialInfo) return children; // 기존 스튜디오 → 차단 없음
  if (trialInfo.status === 'active') return children; // 결제 완료 → 차단 없음

  const now = new Date();
  const trialEnd = trialInfo.trialEndDate ? new Date(trialInfo.trialEndDate) : null;
  const daysLeft = trialEnd ? Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)) : 999;
  const isExpired = daysLeft <= 0;

  // 🔴 만료됨 → 전체 차단
  if (isExpired) {
    return <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
      color: '#f0f0f0',
      padding: '24px',
      textAlign: 'center'
    }}>
                <div style={{
        maxWidth: '480px',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: '24px',
        padding: '48px 32px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
      }}>
                    <div style={{
          fontSize: '3rem',
          marginBottom: '16px'
        }}>⏰</div>
                    <h2 style={{
          fontSize: '1.6rem',
          marginBottom: '12px',
          color: '#EF4444'
        }}>{t("g_78ebd4") || "\uBB34\uB8CC \uCCB4\uD5D8\uC774 \uC885\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4"}</h2>
                    <p style={{
          color: '#94a3b8',
          fontSize: '1rem',
          lineHeight: '1.6',
          marginBottom: '32px'
        }}>
                        {trialInfo.name || t("g_e54edb") || "\uC2A4\uD29C\uB514\uC624"}{t("g_a5feeb") || "\uC758 2\uAC1C\uC6D4 \uBB34\uB8CC \uCCB4\uD5D8 \uAE30\uAC04\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4."}<br />{t("g_40b83d") || "\uC5F0\uAC04 $69 (\uC57D 10\uB9CC\uC6D0) \uC73C\uB85C \uBAA8\uB4E0 \uAE30\uB2A5\uC744 \uACC4\uC18D \uC0AC\uC6A9\uD558\uC138\uC694."}</p>
                    
                    <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          textAlign: 'left',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
                        <div style={{
            fontSize: '0.9rem',
            color: '#94a3b8',
            marginBottom: '8px'
          }}>{t("g_6850eb") || "\uD83C\uDDF0\uD83C\uDDF7 \uAD6D\uB0B4 \uACC4\uC88C\uC774\uCCB4 (100,000\uC6D0)"}</div>
                        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.3)',
            padding: '12px',
            borderRadius: '8px'
          }}>
                            <div style={{
              fontSize: '1.05rem',
              fontWeight: 'bold',
              color: '#fff',
              letterSpacing: '0.5px'
            }}>{t("g_447d9f") || "MG\uC0C8\uB9C8\uC744 9003-2623-9687-7"}<div style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                marginTop: '4px',
                fontWeight: 'normal'
              }}>{t("g_c3220b") || "\uC608\uAE08\uC8FC: \uC1A1\uB300\uBBFC"}</div>
                            </div>
                            <button onClick={() => {
              navigator.clipboard.writeText('9003262396877');
              alert(t("g_59a092") || "\uACC4\uC88C\uBC88\uD638\uAC00 \uBCF5\uC0AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
            }} style={{
              background: 'var(--primary-gold)',
              color: '#000',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}>{t("g_6acf7a") || "\uBCF5\uC0AC"}</button>
                        </div>
                        <div style={{
            fontSize: '0.8rem',
            color: '#64748b',
            marginTop: '12px'
          }}>{t("g_fa7544") || "* \uC785\uAE08 \uD6C4"}<strong style={{
              color: '#94a3b8'
            }}>motionpt@gmail.com</strong>{t("g_b5dc5f") || "(\uB610\uB294 \uB3C4\uC785 \uBB38\uC758\uCC98)\uB85C \uC54C\uB824\uC8FC\uC2DC\uBA74 \uC989\uC2DC \uC11C\uBE44\uC2A4\uAC00 \uC5F0\uC7A5\uB429\uB2C8\uB2E4."}</div>
                    </div>

                    <a href={PAYPAL_PAYMENT_LINK} target="_blank" rel="noopener noreferrer" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '16px',
          background: 'linear-gradient(135deg, #0070ba, #1546a0)',
          color: '#fff',
          fontWeight: '800',
          fontSize: '1rem',
          borderRadius: '12px',
          textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(0,112,186,0.3)',
          transition: 'transform 0.2s',
          width: '100%'
        }}>{t("g_a43eb5") || "\uD83C\uDF0D \uD574\uC678 \uACB0\uC81C: PayPal ($69)"}</a>
                </div>
            </div>;
  }

  // 🟡 만료 임박 (14일 이내) → 배너 표시 + 기능 사용 허용
  const showBanner = daysLeft <= 14;
  return <>
            {showBanner && <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 9999,
      background: daysLeft <= 3 ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'linear-gradient(135deg, #F59E0B, #D97706)',
      color: '#fff',
      padding: '10px 16px',
      textAlign: 'center',
      fontSize: '0.9rem',
      fontWeight: '700',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      flexWrap: 'wrap'
    }}>
                    <span>{t("g_ee34df") || "\u23F0 \uBB34\uB8CC \uCCB4\uD5D8 D-"}{daysLeft}{t("g_c8540c") || "| \uC5F0\uAC04 $69\uB85C \uC5F0\uC7A5\uD558\uC138\uC694"}</span>
                    <a href={PAYPAL_PAYMENT_LINK} target="_blank" rel="noopener noreferrer" style={{
        padding: '6px 16px',
        background: 'rgba(0,0,0,0.3)',
        color: '#fff',
        borderRadius: '20px',
        textDecoration: 'none',
        fontWeight: '700',
        fontSize: '0.85rem',
        border: '1px solid rgba(255,255,255,0.3)'
      }}>{t("g_3d82d9") || "\uD83D\uDCB3 \uD398\uC774\uD314 \uC5F0\uC7A5"}</a>
                </div>}
            {children}
        </>;
};
export default TrialPaywall;