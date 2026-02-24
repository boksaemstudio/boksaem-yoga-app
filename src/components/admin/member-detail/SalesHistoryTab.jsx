import { useState, useEffect } from 'react';
import { ClockCounterClockwise, Trash } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';

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

const SalesHistoryTab = ({ memberId, member }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);

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
        fetchHistory();
    }, [memberId]);

    const handleDelete = async (salesId, itemName) => {
        if (!confirm(`"${itemName}" 결제 내역을 삭제하시겠습니까?\n\n⚠️ 삭제된 내역은 복구할 수 없습니다.`)) return;

        try {
            setDeleting(salesId);
            await storageService.deleteSalesRecord(salesId);
            // 목록에서 즉시 제거
            setHistory(prev => prev.filter(h => h.id !== salesId));
        } catch (e) {
            alert('삭제 중 오류가 발생했습니다: ' + e.message);
        } finally {
            setDeleting(null);
        }
    };

    // Derived active membership info
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const isPending = member && member.startDate && member.startDate > todayStr;
    const isActive = !isPending && member && member.endDate && new Date(member.endDate) >= new Date();
    const isExpired = !isPending && member && member.endDate && new Date(member.endDate) < new Date();

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: '#52525b' }}>
                <p>불러오는 중...</p>
            </div>
        );
    }

    return (
        <div>
            {/* 1. Current Membership Status */}
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
                                <span style={{ color: 'var(--primary-gold)', fontWeight: 'bold', fontSize: '1.1rem' }}>
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
                                fontSize: '0.9rem',
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
                            marginBottom: '10px',
                            background: 'rgba(0,0,0,0.2)',
                            padding: '10px',
                            borderRadius: '8px'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>시작일</span>
                                <span style={{ fontWeight: '600' }}>{member.startDate || '-'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>종료일</span>
                                <span style={{ fontWeight: '600' }}>{member.endDate || '-'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                                <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>잔여 횟수</span>
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
                            background: 'rgba(255,255,255,0.05)',
                            padding: '15px',
                            borderRadius: '10px',
                            border: isItemActive ? '1px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: 'white', fontWeight: 'bold' }}>
                                        {item.item ? `${getMembershipLabel(item.item.split(' ')[0])} ${item.item.split(' ').slice(1).join(' ')}` : '결제 항목'}
                                    </span>
                                    {isItemActive && <span style={{ fontSize: '0.7rem', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--primary-gold)', border: '1px solid rgba(212, 175, 55, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>현재 이용 중</span>}
                                    {isItemUpcoming && <span style={{ fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>대기 중 (선등록)</span>}
                                </div>
                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>{(item.amount || 0).toLocaleString()}원</span>
                            </div>

                            {/* [NEW] 등록 기간 표시 */}
                            {item.startDate && item.endDate && (
                                <div style={{ fontSize: '0.8rem', color: '#71717a', marginBottom: '6px' }}>
                                    📅 {item.startDate} ~ {item.endDate}
                                </div>
                            )}



                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                <span style={{ color: '#a1a1aa' }}>
                                    {item.paymentMethod === 'card' ? '카드' : item.paymentMethod === 'cash' ? '현금' : item.paymentMethod === 'none' ? '' : '이체'}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ color: '#a1a1aa' }}>{new Date(item.timestamp || item.date).toLocaleDateString()}</span>
                                    <button
                                        onClick={() => handleDelete(item.id, item.item || '결제 내역')}
                                        disabled={deleting === item.id}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            color: '#ef4444',
                                            borderRadius: '6px',
                                            padding: '4px 8px',
                                            cursor: deleting === item.id ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '0.75rem',
                                            opacity: deleting === item.id ? 0.5 : 1
                                        }}
                                    >
                                        <Trash size={14} />
                                        {deleting === item.id ? '삭제중...' : '삭제'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SalesHistoryTab;
