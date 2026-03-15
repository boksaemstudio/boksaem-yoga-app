import { useState } from 'react';
import { useStudioConfig } from '../../contexts/StudioContext';
import { Icons } from '../CommonIcons';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';

const MembershipInfo = ({ member, daysRemaining, t }) => {
    const { config } = useStudioConfig();
    const [showHoldModal, setShowHoldModal] = useState(false);
    const [holdDays, setHoldDays] = useState(7);
    const [holdLoading, setHoldLoading] = useState(false);

    const allowSelfHold = config.POLICIES?.ALLOW_SELF_HOLD || false;
    let holdRules = config.POLICIES?.HOLD_RULES || [];

    // [옵션B] duration이 명시적으로 있는 회원만 홀딩 가능
    const memberDuration = member.duration || 0;

    // duration이 없으면 홀딩 불가
    let matchedRule = null;
    if (memberDuration > 0 && holdRules.length > 0) {
        // 정확한 매칭 → 없으면 작거나 같은 것 중 최대
        matchedRule = holdRules.find(r => r.durationMonths === memberDuration);
        if (!matchedRule) {
            const eligible = holdRules.filter(r => r.durationMonths <= memberDuration).sort((a, b) => b.durationMonths - a.durationMonths);
            matchedRule = eligible[0] || null;
        }
    }

    const isHolding = member.holdStatus === 'holding';
    const holdHistory = member.holdHistory || [];
    const usedHoldCount = holdHistory.filter(h => !h.cancelledAt).length;
    const canHold = allowSelfHold && matchedRule && !isHolding && usedHoldCount < (matchedRule.maxCount || 1);

    // [DEBUG] 홀딩 디버그 로그
    console.log('[MembershipInfo] Hold Debug:', {
        allowSelfHold,
        holdRulesCount: holdRules.length,
        memberDuration,
        matchedRule: matchedRule ? `${matchedRule.durationMonths}mo` : 'NONE',
        isHolding,
        usedHoldCount,
        canHold,
        configPolicies: config.POLICIES
    });

    const handleApplyHold = async () => {
        if (!member.id || holdDays <= 0) return;
        setHoldLoading(true);
        try {
            const applyHold = httpsCallable(functions, 'applyMemberHoldCall');
            const result = await applyHold({ memberId: member.id, holdDays });
            if (result.data.success) {
                alert(result.data.message || '홀딩이 적용되었습니다.');
                setShowHoldModal(false);
                window.location.reload(); // 상태 새로고침
            } else {
                alert(result.data.message || '홀딩 적용에 실패했습니다.');
            }
        } catch (e) {
            console.error('Hold apply failed:', e);
            alert(e.message || '홀딩 처리 중 오류가 발생했습니다.');
        } finally {
            setHoldLoading(false);
        }
    };

    // 홀딩 중일 때 예상 종료일 계산
    const getHoldEndInfo = () => {
        if (!isHolding || !member.holdStartDate) return null;
        const start = new Date(member.holdStartDate);
        const today = new Date();
        const elapsed = Math.max(1, Math.round((today - start) / (1000 * 60 * 60 * 24)));
        const requested = member.holdRequestedDays || 14;
        return { elapsed, requested, startDate: member.holdStartDate };
    };

    const holdInfo = getHoldEndInfo();

    return (
        <div style={{ padding: '0 0 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, color: 'white' }}>{member.displayName || member.name} 님</h1>
                <span style={{ background: 'var(--primary-gold)', color: 'black', padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {(config.BRANCHES || []).find(b => b.id === member.homeBranch)?.name || member.homeBranch}
                </span>
                {isHolding && (
                    <span style={{ 
                        background: 'rgba(251, 146, 60, 0.2)', 
                        color: '#fb923c', 
                        padding: '3px 10px', 
                        borderRadius: '5px', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold',
                        border: '1px solid rgba(251, 146, 60, 0.3)',
                        animation: 'pulse 2s infinite'
                    }}>
                        ⏸️ 홀딩 중
                    </span>
                )}
                <span style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem' }}>{member.phone}</span>
                <img src={config.ASSETS?.LOGO?.RYS200} alt="RYS200" style={{ height: '49px', width: 'auto', marginLeft: 'auto', filter: 'brightness(0) invert(1)' }} />
            </div>

            {/* 홀딩 중일 때 상태 표시 */}
            {isHolding && holdInfo && (
                <div style={{ 
                    padding: '16px 20px', 
                    background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(251, 146, 60, 0.05))', 
                    borderRadius: '16px', 
                    border: '1px solid rgba(251, 146, 60, 0.2)', 
                    marginBottom: '16px' 
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fb923c', marginBottom: '4px' }}>⏸️ 수강권 일시정지 중</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                                {holdInfo.startDate}부터 {holdInfo.elapsed}일 경과 (신청: {holdInfo.requested}일)
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>출석 시 자동 해제</div>
                            <div style={{ fontSize: '0.7rem', color: '#fb923c' }}>마감일이 {holdInfo.elapsed}일 연장됩니다</div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px', color: 'white' }}>{t('currentMembership')}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--primary-gold)' }}>
                        {t(`class_${member.membershipType}`) !== `class_${member.membershipType}` ? t(`class_${member.membershipType}`) : (member.membershipType || t('class_regular'))} ({member.subject || t('ticket')})
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px', color: 'white' }}>{t('remainingCredits')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{member.credits > 200 ? t('unlimited') : `${member.credits}${t('times')}`}</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px', color: 'white' }}>{t('expiryDate')}</div>
                    <div style={{ fontSize: '1rem', color: 'white' }}>
                        {(() => {
                            if (!member.endDate || member.endDate === 'unlimited') return t('unlimited');
                            if (member.endDate === 'TBD') return '첫 출석 시 확정';
                            const date = new Date(member.endDate);
                            if (isNaN(date.getTime())) return member.endDate;
                            try {
                                return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
                            } catch {
                                return member.endDate;
                            }
                        })()}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px', color: 'white' }}>{t('daysLeft')}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: isHolding ? '#fb923c' : 'white' }}>
                        {isHolding ? '⏸️ 정지' : (member.endDate ? (daysRemaining >= 0 ? `D-${daysRemaining}` : t('expired')) : '-')}
                    </div>
                </div>
            </div>

            {/* 홀딩하기 버튼 */}
            {canHold && (
                <button 
                    onClick={() => setShowHoldModal(true)}
                    style={{
                        width: '100%', marginTop: '16px', padding: '14px',
                        background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(251, 146, 60, 0.05))',
                        border: '1px solid rgba(251, 146, 60, 0.3)', borderRadius: '14px',
                        color: '#fb923c', fontSize: '0.9rem', fontWeight: 'bold',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.3s ease'
                    }}
                >
                    ⏸️ 수강권 일시정지 (홀딩)
                    <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                        | 남은 횟수: {(matchedRule.maxCount || 1) - usedHoldCount}회
                    </span>
                </button>
            )}

            {/* 홀딩 모달 */}
            {showHoldModal && matchedRule && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 99999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }}
                onClick={(e) => { if (e.target === e.currentTarget) setShowHoldModal(false); }}
                >
                    <div style={{
                        background: 'linear-gradient(145deg, #1a1a1a, #111)',
                        borderRadius: '24px', padding: '30px', maxWidth: '380px', width: '100%',
                        border: '1px solid rgba(251, 146, 60, 0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', marginBottom: '8px', textAlign: 'center' }}>⏸️ 수강권 일시정지</h3>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: '24px' }}>
                            최대 {matchedRule.maxWeeks}주 · {matchedRule.maxCount}회 가능
                        </p>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '8px', display: 'block' }}>홀딩 기간 선택</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {Array.from({ length: matchedRule.maxWeeks || 2 }, (_, i) => (i + 1) * 7).map(days => (
                                    <button
                                        key={days}
                                        onClick={() => setHoldDays(days)}
                                        style={{
                                            flex: 1, minWidth: '80px', padding: '12px 16px',
                                            background: holdDays === days ? 'rgba(251, 146, 60, 0.2)' : 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${holdDays === days ? '#fb923c' : 'rgba(255,255,255,0.1)'}`,
                                            borderRadius: '12px', color: holdDays === days ? '#fb923c' : 'rgba(255,255,255,0.6)',
                                            cursor: 'pointer', fontSize: '0.9rem', fontWeight: holdDays === days ? 'bold' : 'normal',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {days / 7}주 ({days}일)
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ padding: '12px 16px', background: 'rgba(251, 146, 60, 0.08)', borderRadius: '12px', marginBottom: '20px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                            • 다음 출석(체크인) 시 홀딩이 자동 해제됩니다.<br/>
                            • 해제 시 실제 쉰 일수만큼 마감일이 연장됩니다.
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={() => setShowHoldModal(false)}
                                style={{
                                    flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
                                    color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', cursor: 'pointer'
                                }}
                            >취소</button>
                            <button 
                                onClick={handleApplyHold}
                                disabled={holdLoading}
                                style={{
                                    flex: 1, padding: '14px', background: '#fb923c',
                                    border: 'none', borderRadius: '14px',
                                    color: 'white', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer',
                                    opacity: holdLoading ? 0.5 : 1
                                }}
                            >{holdLoading ? '처리 중...' : `${holdDays}일 홀딩 시작`}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MembershipInfo;

