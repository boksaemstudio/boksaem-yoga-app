import React from 'react';
import { ClockCounterClockwise } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';

const SalesHistoryTab = ({ memberId, member }) => {
    const [history, setHistory] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                // Fetch without orderBy to avoid composite index requirement
                const data = await storageService.getSalesHistory(memberId);
                // Sort in memory by timestamp descending
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
        fetchHistory();
    }, [memberId]);

    // Derived active membership info
    const isActive = member && member.endDate && new Date(member.endDate) >= new Date();
    const isExpired = member && member.endDate && new Date(member.endDate) < new Date();

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: '#52525b' }}>
                <p>불러오는 중...</p>
            </div>
        );
    }

    return (
        <div>
            {/* 1. Current Membership Status (Virtual Record) */}
            {member && (
                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '10px' }}>현재 이용권 정보</h4>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(0,0,0,0) 100%)',
                        padding: '15px',
                        borderRadius: '10px',
                        border: '1px solid var(--primary-gold)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: 'var(--primary-gold)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    {member.subject || member.membershipType || '회원권'}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                                    {member.membershipType === 'general' ? '일반' :
                                        member.membershipType === 'advanced' ? '심화' :
                                            member.membershipType === 'kids' ? '키즈' :
                                                member.membershipType === 'pregnant' ? '임산부' :
                                                    member.membershipType === 'saturday' ? '토요하타' : member.membershipType}
                                </span>
                            </div>
                            <span style={{
                                color: isActive ? '#10b981' : (isExpired ? '#ef4444' : '#a1a1aa'),
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                padding: '4px 10px',
                                background: isActive ? 'rgba(16,185,129,0.1)' : (isExpired ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)'),
                                borderRadius: '12px',
                                border: `1px solid ${isActive ? 'rgba(16,185,129,0.2)' : (isExpired ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)')}`
                            }}>
                                {isActive ? '이용 중' : (isExpired ? '만료됨' : '미보유')}
                            </span>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                            fontSize: '0.9rem',
                            color: '#e4e4e7',
                            marginBottom: '10px',
                            background: 'rgba(0,0,0,0.2)',
                            padding: '10px',
                            borderRadius: '8px'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>시작일</span>
                                <span style={{ fontWeight: '600' }}>{member.startDate || '-'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                                <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>종료일</span>
                                <span style={{ fontWeight: '600' }}>{member.endDate || '-'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>이용권 상세</span>
                                <span style={{ fontWeight: '600' }}>
                                    {/* Try to infer type from credits or name if implicit */}
                                    {member.credits >= 9000 ? '무제한 기간권' : `${member.credits}회권`}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                                <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>현재 잔여</span>
                                <span style={{ fontWeight: '600', color: 'var(--primary-gold)' }}>
                                    {member.credits >= 9000 ? '무제한' : `${member.credits}회`}
                                </span>
                            </div>
                        </div>

                        {member.regDate && (
                            <div style={{ fontSize: '0.8rem', color: '#52525b', textAlign: 'right' }}>
                                최초 등록일: {member.regDate}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '10px' }}>상세 결제 내역</h4>

            {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#52525b', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                    <ClockCounterClockwise size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <p>추가 결제 이력이 없습니다.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {history.map((item) => (
                        <div key={item.id} style={{
                            background: 'rgba(255,255,255,0.05)',
                            padding: '15px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'white', fontWeight: 'bold' }}>{item.item}</span>
                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>{item.amount.toLocaleString()}원</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: '#a1a1aa' }}>{item.paymentMethod === 'card' ? '카드' : item.paymentMethod === 'cash' ? '현금' : '이체'}</span>
                                <span style={{ color: '#a1a1aa' }}>{new Date(item.timestamp || item.date).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SalesHistoryTab;
