import { useState, useEffect } from 'react';
import { storageService } from '../../services/storage';
import { ClockCounterClockwise } from '@phosphor-icons/react';

const MEMBERSHIP_TYPE_LABELS = {
    'general': '일반',
    'advanced': '심화',
    'intensive': '심화',
    'kids': '키즈',
    'pregnant': '임산부',
    'saturday': '토요하타',
};

const getMembershipLabel = (type) => {
    if (!type) return '회원권';
    const lowerType = type.toLowerCase();
    return MEMBERSHIP_TYPE_LABELS[lowerType] || type;
};

const MemberSalesHistory = ({ memberId, member }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const data = await storageService.getSalesHistory(memberId);
            const sorted = [...data].sort((a, b) => {
                const timeA = new Date(a.timestamp || a.date).getTime();
                const timeB = new Date(b.timestamp || b.date).getTime();
                return timeB - timeA;
            });
            setHistory(sorted);
        } catch (e) {
            console.error('Failed to fetch sales history:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (memberId) {
            fetchHistory();
        }
    }, [memberId]);

    // Derived active membership info
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const isPending = member && member.startDate && member.startDate > todayStr;
    const isActive = !isPending && member && member.endDate && new Date(member.endDate) >= new Date();
    const isExpired = !isPending && member && member.endDate && new Date(member.endDate) < new Date();

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.5)' }}>
                <p>결제 내역을 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '20px' }}>
            {/* 1. Current/Upcoming Membership Status */}
            {member && (
                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', marginBottom: '12px', fontWeight: 'bold', marginLeft: '4px' }}>나의 이용권 상태</h4>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.1) 0%, rgba(255,255,255,0.02) 100%)',
                        padding: '16px',
                        borderRadius: '20px',
                        border: '1px solid rgba(var(--primary-rgb), 0.3)',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: 'var(--primary-gold)', fontWeight: 'bold', fontSize: '1.15rem' }}>
                                    {(() => {
                                        // Find matching sales record for current membership period
                                        const matchingSale = history.find(h => h.startDate === member.startDate && h.endDate === member.endDate);
                                        if (matchingSale && matchingSale.item) {
                                            return `${getMembershipLabel(matchingSale.item.split(' ')[0])} ${matchingSale.item.split(' ').slice(1).join(' ')}`;
                                        }
                                        return getMembershipLabel(member.membershipType);
                                    })()}
                                </span>
                            </div>
                            <span style={{
                                color: isPending ? '#38bdf8' : (isActive ? '#10b981' : (isExpired ? '#ef4444' : '#a1a1aa')),
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                padding: '4px 10px',
                                background: isPending ? 'rgba(56,189,248,0.1)' : (isActive ? 'rgba(16,185,129,0.1)' : (isExpired ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)')),
                                borderRadius: '12px',
                                border: `1px solid ${isPending ? 'rgba(56,189,248,0.3)' : (isActive ? 'rgba(16,185,129,0.2)' : (isExpired ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)'))}`
                            }}>
                                {isPending ? '대기 중 (선등록)' : (isActive ? '이용 중' : (isExpired ? '만료됨' : '미보유'))}
                            </span>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: '10px',
                            fontSize: '0.9rem',
                            color: '#e4e4e7',
                            marginBottom: '6px',
                            background: 'rgba(0,0,0,0.3)',
                            padding: '12px',
                            borderRadius: '12px'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>시작일</span>
                                <span style={{ fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>{member.startDate || '-'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>종료일</span>
                                <span style={{ fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>{member.endDate || '-'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>잔여 횟수</span>
                                <span style={{ fontWeight: '600', color: 'var(--primary-gold)' }}>
                                    {member.credits >= 9000 ? '무제한' : `${member.credits}회`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <h4 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', marginBottom: '12px', fontWeight: 'bold', marginLeft: '4px' }}>결제 및 수강권 구매 내역</h4>

            {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <ClockCounterClockwise size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>결제 이력이 없습니다.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {history.map((item) => {
                        const itemStart = item.startDate ? new Date(`${item.startDate}T00:00:00+09:00`).getTime() : null;
                        const itemEnd = item.endDate ? new Date(`${item.endDate}T23:59:59+09:00`).getTime() : null;
                        const now = new Date().getTime();
                        let isItemActive = false;
                        let isItemUpcoming = false;

                        if (itemStart && itemEnd) {
                            if (now >= itemStart && now <= itemEnd) {
                                isItemActive = true;
                            } else if (now < itemStart) {
                                isItemUpcoming = true;
                            }
                        }

                        return (
                            <div key={item.id} style={{
                                background: 'rgba(255,255,255,0.04)',
                                padding: '16px',
                                borderRadius: '16px',
                                border: isItemActive ? '1px solid rgba(var(--primary-rgb), 0.4)' : (isItemUpcoming ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255,255,255,0.08)'),
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>
                                            {item.item ? `${getMembershipLabel(item.item.split(' ')[0])} ${item.item.split(' ').slice(1).join(' ')}` : '결제 항목'}
                                        </span>
                                        {isItemActive && <span style={{ fontSize: '0.7rem', background: 'rgba(var(--primary-rgb), 0.15)', color: 'var(--primary-gold)', border: '1px solid rgba(var(--primary-rgb), 0.3)', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>현재 이용 중</span>}
                                        {isItemUpcoming && <span style={{ fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>선등록 (대기)</span>}
                                    </div>
                                    <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.05rem' }}>{(item.amount || 0).toLocaleString()}원</span>
                                </div>

                                {/* 기간 표시 */}
                                {item.startDate && item.endDate && (
                                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ opacity: 0.8 }}>📅</span> {item.startDate} ~ {item.endDate}
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                                        {item.paymentMethod === 'card' ? '카드결제' : item.paymentMethod === 'cash' ? '현금결제' : item.paymentMethod === 'none' ? '기타 결제' : '계좌이체'}
                                    </span>
                                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        {new Date(item.timestamp || item.date).toLocaleDateString()} 결제
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MemberSalesHistory;
