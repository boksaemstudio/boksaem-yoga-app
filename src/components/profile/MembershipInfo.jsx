import React, { useState } from 'react';
import { useStudioConfig } from '../../contexts/StudioContext';
import { getMembershipLabel } from '../../utils/membershipLabels';
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




    const handleApplyHold = async () => {
        if (!member.id || holdDays <= 0) return;
        setHoldLoading(true);
        try {
            const applyHold = httpsCallable(functions, 'applyMemberHoldCall');
            const result = await applyHold({ memberId: member.id, holdDays });
            if (result.data.success) {
                alert(result.data.message || t('holdApplied'));
                setShowHoldModal(false);
                window.location.reload(); // 상태 새로고침
            } else {
                alert(result.data.message || t('holdFailed'));
            }
        } catch (e) {
            console.error('Hold apply failed:', e);
            alert(e.message || t('holdError'));
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
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, color: 'white' }}>{member.displayName || member.name} {t('nim')}</h1>
                <span style={{ background: 'var(--primary-gold)', color: 'black', padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {(config.BRANCHES || []).find(b => b.id === member.homeBranch)?.name || member.homeBranch}
                </span>
                {member.hasFaceDescriptor && (
                    <span style={{ 
                        background: 'rgba(99, 102, 241, 0.15)', 
                        color: '#818CF8', 
                        padding: '3px 10px', 
                        borderRadius: '5px', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        💠 AI 출석 등록
                    </span>
                )}
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
                        {t('holdingStatus')}
                    </span>
                )}
                <span style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem' }}>{member.phone}</span>
                <img src={config.ASSETS?.LOGO?.RYS200} alt="RYS200" style={{ height: '49px', width: 'auto', marginLeft: 'auto', filter: 'brightness(0) invert(1)' }} />
            </div>
            {/* [NEW] 안면인식 안심 문구 */}
            {member.hasFaceDescriptor && (
                <div style={{ 
                    marginBottom: '12px',
                    padding: '10px 14px', 
                    background: 'rgba(99, 102, 241, 0.06)', 
                    borderRadius: '10px',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    display: 'flex', alignItems: 'flex-start', gap: '10px'
                }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🔒</span>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>
                        <span style={{ color: '#818CF8', fontWeight: 'bold' }}>AI 출석 안내</span> — 
                        회원님의 사진은 <b style={{ color: 'rgba(255,255,255,0.85)' }}>저장되지 않습니다.</b> 얼굴 특징이 128차원 숫자(벡터)로 변환되어 안전하게 보관되며, 원본 이미지는 즉시 삭제됩니다. 숫자 데이터로는 얼굴을 복원할 수 없습니다.
                    </div>
                </div>
            )}

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
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fb923c', marginBottom: '4px' }}>{t('holdPauseTitle')}</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                                {t('holdElapsed', { start: holdInfo.startDate, elapsed: holdInfo.elapsed, requested: holdInfo.requested })}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{t('holdAutoRelease')}</div>
                            <div style={{ fontSize: '0.7rem', color: '#fb923c' }}>{t('holdExtended', { days: holdInfo.elapsed })}</div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px', color: 'white' }}>{t('currentMembership')}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--primary-gold)' }}>
                        {getMembershipLabel(member.membershipType, config)} ({member.subject || t('ticket')})
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
                            if (member.endDate === 'TBD') return t('endDateTBD');
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
                        {isHolding ? t('daysLeftHolding') : (member.endDate ? (daysRemaining >= 0 ? `D-${daysRemaining}` : t('expired')) : '-')}
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
                    {t('holdBtnLabel')}
                    <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                        | {t('holdRemaining', { n: (matchedRule.maxCount || 1) - usedHoldCount })}
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
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', marginBottom: '8px', textAlign: 'center' }}>{t('holdModalTitle')}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: '24px' }}>
                            {t('holdModalDesc', { weeks: matchedRule.maxWeeks, count: matchedRule.maxCount })}
                        </p>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '8px', display: 'block' }}>{t('holdSelectPeriod')}</label>
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
                                        {t('holdWeekDays', { w: days / 7, d: days })}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ padding: '12px 16px', background: 'rgba(251, 146, 60, 0.08)', borderRadius: '12px', marginBottom: '20px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                            • {t('holdNoteAuto')}<br/>
                            • {t('holdNoteExtend')}
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={() => setShowHoldModal(false)}
                                style={{
                                    flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
                                    color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', cursor: 'pointer'
                                }}
                            >{t('cancel')}</button>
                            <button 
                                onClick={handleApplyHold}
                                disabled={holdLoading}
                                style={{
                                    flex: 1, padding: '14px', background: '#fb923c',
                                    border: 'none', borderRadius: '14px',
                                    color: 'white', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer',
                                    opacity: holdLoading ? 0.5 : 1
                                }}
                            >{holdLoading ? t('processing') : t('holdStartBtn', { days: holdDays })}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(MembershipInfo);

