import { useLanguageStore } from '../../stores/useLanguageStore';
import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { resolveStudioId } from '../../utils/resolveStudioId';

/**
 * TrialPaywall — 2개 무료 체험 만료 시 어드민 접근 차단
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
        }}>{t("g_752c68") || "무료 체험이 종료되었습니다"}</h2>
                    <p style={{
          color: '#94a3b8',
          fontSize: '1rem',
          lineHeight: '1.6',
          marginBottom: '32px'
        }}>
                        {trialInfo.name || t("g_2bec30") || "스튜디오"}{t("g_dc947e") || "의 2개 무료 체험 기간이 만료되었습니다."}<br />{t("g_190abc") || "연간 $69 (약 10만원) 으로 모든 기능을 계속 사용하세요."}</p>
                    
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
          }}>{t("g_412424") || "🇰🇷 국내 계좌이체 (100,000원)"}</div>
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
            }}>{t("g_fc521b") || "MG새마을 9003-2623-9687-7"}<div style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                marginTop: '4px',
                fontWeight: 'normal'
              }}>{t("g_41ceca") || "예금주: 송대민"}</div>
                            </div>
                            <button onClick={() => {
              navigator.clipboard.writeText('9003262396877');
              alert(t("g_30d293") || "계좌번호가 복사되었습니다.");
            }} style={{
              background: 'var(--primary-gold)',
              color: '#000',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}>{t("g_a55b1e") || "복사"}</button>
                        </div>
                        <div style={{
            fontSize: '0.8rem',
            color: '#64748b',
            marginTop: '12px'
          }}>{t("g_4ed5f4") || "* 입금 후"}<strong style={{
              color: '#94a3b8'
            }}>motionpt@gmail.com</strong>{t("g_c3bb7e") || "(또는 도입 문의처)로 알려주시면 즉시 서비스가 연장됩니다."}</div>
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
        }}>{t("g_53bcaa") || "🌍 해외 결제: PayPal ($69)"}</a>
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
                    <span>{t("g_642f63") || "⏰ 무료 체험 D-"}{daysLeft}{t("g_b5c560") || "| 연간 $69로 연장하세요"}</span>
                    <a href={PAYPAL_PAYMENT_LINK} target="_blank" rel="noopener noreferrer" style={{
        padding: '6px 16px',
        background: 'rgba(0,0,0,0.3)',
        color: '#fff',
        borderRadius: '20px',
        textDecoration: 'none',
        fontWeight: '700',
        fontSize: '0.85rem',
        border: '1px solid rgba(255,255,255,0.3)'
      }}>{t("g_3b6150") || "💳 페이팔 연장"}</a>
                </div>}
            {children}
        </>;
};
export default TrialPaywall;