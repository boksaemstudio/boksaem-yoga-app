import React, { useState } from 'react';
import { useStudioConfig } from '../../contexts/StudioContext';
import { getMembershipLabel } from '../../utils/membershipLabels';
import { toKSTDateString } from '../../utils/dates';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';

const MembershipInfo = ({ member, daysRemaining, logs = [], t }) => {
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
                <span style={{ background: 'var(--primary-gold)', color: 'var(--text-on-primary)', padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold' }}>
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

            {/* [NEW] 수강권 소진율 프로그레스 바 — 기간 대비 수강 페이스 */}
            {(() => {
                // 무제한/TBD/날짜없음 → 표시하지 않음
                if (!member.startDate || !member.endDate || member.endDate === 'unlimited' || member.endDate === 'TBD' || member.credits > 200) return null;
                
                const startMs = new Date(member.startDate).getTime();
                const endMs = new Date(member.endDate).getTime();
                const nowMs = Date.now();
                const totalPeriod = endMs - startMs;
                
                if (totalPeriod <= 0 || isNaN(startMs) || isNaN(endMs)) return null;
                
                // 기간 소진율 (0~100%)
                const timePassed = Math.max(0, Math.min(nowMs - startMs, totalPeriod));
                const timeRatio = Math.round((timePassed / totalPeriod) * 100);
                
                // 횟수 소진율 (0~100%)
                const attendanceCount = member.attendanceCount || 0;
                const remainingCredits = Number(member.credits || 0);
                const totalCredits = attendanceCount + remainingCredits;
                
                if (totalCredits <= 0) return null;
                
                const usageRatio = Math.round((attendanceCount / totalCredits) * 100);
                
                // 페이스 판정
                const diff = usageRatio - timeRatio;
                let paceStatus, paceColor, paceEmoji, paceMessage;
                
                if (diff >= 10) {
                    paceStatus = '빠름'; paceColor = '#10b981'; paceEmoji = '🔥';
                    paceMessage = '열심히 하고 계세요! 이 페이스로 꾸준히!';
                } else if (diff >= -5) {
                    paceStatus = '적절'; paceColor = 'var(--primary-gold)'; paceEmoji = '✨';
                    paceMessage = '완벽한 페이스예요! 꾸준함이 건강의 비결!';
                } else if (diff >= -20) {
                    paceStatus = '조금 느림'; paceColor = '#F59E0B'; paceEmoji = '💪';
                    paceMessage = '조금 더 분발하면 수강권을 알차게 쓸 수 있어요!';
                } else {
                    paceStatus = '느림'; paceColor = '#EF4444'; paceEmoji = '🧘‍♀️';
                    paceMessage = '수련하러 오세요! 남은 기간에 아직 충분히 할 수 있어요!';
                }

                return (
                    <div style={{ 
                        marginTop: '16px', padding: '16px 18px', borderRadius: '14px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>수강 페이스</span>
                                <span style={{ 
                                    fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px',
                                    background: `${paceColor}20`, color: paceColor, fontWeight: '700'
                                }}>
                                    {paceEmoji} {paceStatus}
                                </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                                {attendanceCount}회 사용 / {totalCredits}회 중
                            </span>
                        </div>
                        
                        {/* Double Progress Bar */}
                        <div style={{ position: 'relative', marginBottom: '6px' }}>
                            {/* 기간 소진 바 (회색 배경) */}
                            <div style={{ 
                                height: '20px', borderRadius: '10px', 
                                background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative'
                            }}>
                                {/* 기간 마커 (세로선) */}
                                <div style={{ 
                                    position: 'absolute', left: `${timeRatio}%`, top: 0, bottom: 0,
                                    width: '2px', background: 'rgba(255, 255, 255, 0.5)',
                                    zIndex: 2, transition: 'left 0.5s ease'
                                }} />
                                {/* 횟수 소진 바 */}
                                <div style={{ 
                                    height: '100%', borderRadius: '10px',
                                    width: `${usageRatio}%`,
                                    background: `linear-gradient(90deg, ${paceColor}80, ${paceColor})`,
                                    transition: 'width 0.5s ease',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {usageRatio > 15 && (
                                        <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                            {usageRatio}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Legend */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#71717a' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <span style={{ width: '8px', height: '3px', background: paceColor, borderRadius: '2px', display: 'inline-block' }} />
                                    수강 {usageRatio}%
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <span style={{ width: '8px', height: '8px', borderLeft: '2px solid rgba(255,255,255,0.5)', display: 'inline-block' }} />
                                    기간 {timeRatio}%
                                </span>
                            </div>
                            <span>잔여 {remainingCredits}회</span>
                        </div>
                        
                        {/* AI Motivation Comment */}
                        <div style={{ 
                            marginTop: '10px', padding: '8px 12px', borderRadius: '8px',
                            background: `${paceColor}08`, border: `1px dashed ${paceColor}30`,
                            fontSize: '0.78rem', color: paceColor, fontWeight: '500'
                        }}>
                            {paceEmoji} {paceMessage}
                        </div>
                    </div>
                );
            })()}

            {/* 근면성실도 — 출석 로그 기반 평가 */}
            {(() => {
                if (!logs || logs.length < 3) return null; // 데이터 부족 시 미표시

                const now = Date.now();
                const DAY = 86400000;
                const WEEK = 7 * DAY;

                // 출석 날짜 파싱 (고유 날짜만)
                const attendDates = [...new Set(logs.map(l => {
                    const ts = l.timestamp || l.date;
                    if (!ts) return null;
                    const d = typeof ts === 'string' ? new Date(ts) : (ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts));
                    if (isNaN(d.getTime())) return null;
                    return toKSTDateString(d);
                }).filter(Boolean))].sort();

                if (attendDates.length < 3) return null;

                const dates = attendDates.map(d => new Date(d).getTime());
                const oldestDate = dates[0];
                const totalWeeks = Math.max(1, Math.ceil((now - oldestDate) / WEEK));

                // 1. 주당 평균 출석 (0~7)
                const weeklyAvg = Math.min(7, attendDates.length / totalWeeks);
                const weeklyScore = Math.min(100, Math.round((weeklyAvg / 3) * 100)); // 주 3회 = 100%

                // 2. 규칙성 (출석 간격 일관성, 표준편차 기반)
                const gaps = [];
                for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i - 1]) / DAY);
                const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 7;
                const variance = gaps.length > 0 ? gaps.reduce((a, g) => a + Math.pow(g - avgGap, 2), 0) / gaps.length : 100;
                const stdDev = Math.sqrt(variance);
                const regularityScore = Math.round(Math.max(0, Math.min(100, 100 - stdDev * 10)));

                // 3. 꾸준함 (최근 4주 중 출석한 주 수)
                const recentWeeks = [0, 0, 0, 0];
                attendDates.forEach(d => {
                    const dMs = new Date(d).getTime();
                    const weeksAgo = Math.floor((now - dMs) / WEEK);
                    if (weeksAgo >= 0 && weeksAgo < 4) recentWeeks[weeksAgo] = 1;
                });
                const consistencyScore = Math.round((recentWeeks.reduce((a, b) => a + b, 0) / 4) * 100);

                // 4. 최근 활력 (최근 2주 출석 빈도)
                const twoWeeksAgo = toKSTDateString(new Date(now - 14 * DAY));
                const recentCount = attendDates.filter(d => d >= twoWeeksAgo).length;
                const vitalityScore = Math.min(100, Math.round((recentCount / 6) * 100)); // 2주에 6회 = 100%

                // 종합 등급
                const totalScore = Math.round((weeklyScore * 0.3 + regularityScore * 0.25 + consistencyScore * 0.25 + vitalityScore * 0.2));
                let grade, gradeColor, gradeEmoji, gradeMsg;
                if (totalScore >= 85) { grade = 'S'; gradeColor = '#10b981'; gradeEmoji = '🏆'; gradeMsg = '완벽한 근면성실! 당신은 요가 마스터 🧘'; }
                else if (totalScore >= 70) { grade = 'A'; gradeColor = '#3B82F6'; gradeEmoji = '⭐'; gradeMsg = '훌륭해요! 꾸준함이 빛나는 수련자'; }
                else if (totalScore >= 50) { grade = 'B'; gradeColor = 'var(--primary-gold)'; gradeEmoji = '💫'; gradeMsg = '좋은 페이스! 조금만 더 규칙적으로'; }
                else if (totalScore >= 30) { grade = 'C'; gradeColor = '#F59E0B'; gradeEmoji = '💪'; gradeMsg = '가능성이 있어요! 습관을 만들어보세요'; }
                else { grade = 'D'; gradeColor = '#EF4444'; gradeEmoji = '🌱'; gradeMsg = '다시 시작해봐요! 작은 한 걸음부터'; }

                const indicators = [
                    { label: '주간 출석', score: weeklyScore, desc: `주 ${weeklyAvg.toFixed(1)}회` },
                    { label: '규칙성', score: regularityScore, desc: stdDev < 2 ? '매우 규칙적' : stdDev < 4 ? '규칙적' : '불규칙' },
                    { label: '꾸준함', score: consistencyScore, desc: `최근 4주 중 ${recentWeeks.reduce((a, b) => a + b, 0)}주 출석` },
                    { label: '최근 활력', score: vitalityScore, desc: `최근 2주 ${recentCount}회` }
                ];

                return (
                    <div style={{
                        marginTop: '16px', padding: '16px 18px', borderRadius: '14px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>근면성실도</span>
                                <span style={{
                                    fontSize: '1rem', padding: '2px 10px', borderRadius: '6px',
                                    background: `${gradeColor}20`, color: gradeColor, fontWeight: '800',
                                    border: `1px solid ${gradeColor}40`
                                }}>
                                    {gradeEmoji} {grade}
                                </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#71717a' }}>{totalScore}점 / 100</span>
                        </div>

                        {/* 지표 바 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {indicators.map((ind, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#a1a1aa', width: '60px', flexShrink: 0, textAlign: 'right' }}>{ind.label}</span>
                                    <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${ind.score}%`, height: '100%', borderRadius: '4px',
                                            background: ind.score >= 70 ? `linear-gradient(90deg, ${gradeColor}80, ${gradeColor})` : ind.score >= 40 ? 'linear-gradient(90deg, #F59E0B80, #F59E0B)' : 'linear-gradient(90deg, #EF444480, #EF4444)',
                                            transition: 'width 0.6s ease'
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '0.65rem', color: '#71717a', width: '80px', flexShrink: 0, textAlign: 'left' }}>{ind.desc}</span>
                                </div>
                            ))}
                        </div>

                        {/* 격려 메시지 */}
                        <div style={{
                            marginTop: '12px', padding: '8px 12px', borderRadius: '8px',
                            background: `${gradeColor}08`, border: `1px dashed ${gradeColor}30`,
                            fontSize: '0.78rem', color: gradeColor, fontWeight: '500'
                        }}>
                            {gradeEmoji} {gradeMsg}
                        </div>
                    </div>
                );
            })()}

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

