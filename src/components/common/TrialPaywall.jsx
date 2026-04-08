import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { resolveStudioId } from '../../utils/resolveStudioId';

/**
 * TrialPaywall — 2개월 무료 체험 만료 시 어드민 접근 차단
 * registry에서 trial 정보를 확인하고:
 *   - 만료 전: 상단 알림 배너 표시
 *   - 만료 후: 전체 차단 + Stripe 결제 유도
 */
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/TODO_REPLACE_WITH_REAL_LINK'; // TODO: 실제 Stripe link로 교체

const TrialPaywall = ({ children }) => {
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

    if (loading) return null;
    if (!trialInfo) return children; // 기존 스튜디오 → 차단 없음
    if (trialInfo.status === 'active') return children; // 결제 완료 → 차단 없음

    const now = new Date();
    const trialEnd = trialInfo.trialEndDate ? new Date(trialInfo.trialEndDate) : null;
    const daysLeft = trialEnd ? Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)) : 999;
    const isExpired = daysLeft <= 0;

    // 🔴 만료됨 → 전체 차단
    if (isExpired) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
                color: '#f0f0f0', padding: '24px', textAlign: 'center'
            }}>
                <div style={{
                    maxWidth: '480px', background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(20px)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '24px', padding: '48px 32px',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏰</div>
                    <h2 style={{ fontSize: '1.6rem', marginBottom: '12px', color: '#EF4444' }}>
                        무료 체험이 종료되었습니다
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: '1.6', marginBottom: '32px' }}>
                        {trialInfo.name || '스튜디오'}의 2개월 무료 체험 기간이 만료되었습니다.<br/>
                        연간 $69 (약 10만원) 으로 모든 기능을 계속 사용하세요.
                    </p>
                    <a href={STRIPE_PAYMENT_LINK} target="_blank" rel="noopener noreferrer" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '16px 32px', background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                        color: '#000', fontWeight: '800', fontSize: '1.1rem',
                        borderRadius: '12px', textDecoration: 'none',
                        boxShadow: '0 4px 20px rgba(74,222,128,0.3)',
                        transition: 'transform 0.2s'
                    }}>
                        💳 연간 플랜 결제하기 ($69/year)
                    </a>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '16px' }}>
                        문의: motionpt@gmail.com
                    </p>
                </div>
            </div>
        );
    }

    // 🟡 만료 임박 (14일 이내) → 배너 표시 + 기능 사용 허용
    const showBanner = daysLeft <= 14;

    return (
        <>
            {showBanner && (
                <div style={{
                    position: 'sticky', top: 0, zIndex: 9999,
                    background: daysLeft <= 3
                        ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                        : 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#fff', padding: '10px 16px',
                    textAlign: 'center', fontSize: '0.9rem', fontWeight: '700',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                    flexWrap: 'wrap'
                }}>
                    <span>⏰ 무료 체험 D-{daysLeft} | 연간 $69로 연장하세요</span>
                    <a href={STRIPE_PAYMENT_LINK} target="_blank" rel="noopener noreferrer" style={{
                        padding: '6px 16px', background: 'rgba(0,0,0,0.3)',
                        color: '#fff', borderRadius: '20px', textDecoration: 'none',
                        fontWeight: '700', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                        💳 결제하기
                    </a>
                </div>
            )}
            {children}
        </>
    );
};

export default TrialPaywall;
