import React, { useState, useEffect } from 'react';
import { BellRinging, User, Users, Clock, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';

const PushHistoryTab = () => {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            const data = await storageService.getPushHistory();
            setHistory(data);
            setIsLoading(false);
        };
        fetchHistory();
    }, []);

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '100px 0', opacity: 0.5 }}>로딩 중...</div>;
    }

    return (
        <div className="dashboard-card shadow-lg" style={{ background: 'rgba(25,25,25,0.7)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                    <h3 className="outfit-font" style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>알림 발송 기록</h3>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.5, fontSize: '0.85rem' }}>단체 및 개별 푸시 알림 발송 이력입니다.</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary-gold)' }}>{history.length}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>최근 발송 건수</div>
                </div>
            </div>

            <div className="card-list">
                {history.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
                        <BellRinging size={48} style={{ marginBottom: '15px' }} />
                        <p>발송 기록이 없습니다.</p>
                    </div>
                ) : (
                    history.map(item => (
                        <div key={item.id} className="glass-panel" style={{
                            marginBottom: '15px',
                            padding: '20px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '12px',
                            position: 'relative',
                            transition: 'all 0.2s ease'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: item.type === 'campaign' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                        color: item.type === 'campaign' ? 'var(--primary-gold)' : '#3B82F6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {item.type === 'campaign' ? <Users size={20} weight="fill" /> : <User size={20} weight="fill" />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', color: item.type === 'campaign' ? 'var(--primary-gold)' : '#3B82F6' }}>
                                            {item.type === 'campaign' ? '단체 발송' : `개별 발송 (${item.memberName})`}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={12} /> {new Date(item.displayDate).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {item.type === 'campaign' && (
                                        <span style={{
                                            fontSize: '0.65rem',
                                            padding: '2px 8px',
                                            borderRadius: '20px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            {item.totalTargets > 0 ? `${item.totalTargets}명` : '전체'}
                                        </span>
                                    )}
                                    <span style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.65rem',
                                        padding: '2px 8px',
                                        borderRadius: '20px',
                                        background: item.status === 'pending' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(40, 167, 69, 0.1)',
                                        color: item.status === 'pending' ? '#FFC107' : '#28A745',
                                        border: `1px solid ${item.status === 'pending' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(40, 167, 69, 0.2)'}`
                                    }}>
                                        {item.status === 'pending' ? <WarningCircle size={10} /> : <CheckCircle size={10} />}
                                        {item.status === 'pending' ? '전송 중' : '발송 완료'}
                                    </span>
                                </div>
                            </div>
                            <div style={{
                                fontSize: '0.9rem',
                                opacity: 0.9,
                                lineHeight: 1.6,
                                background: 'rgba(0,0,0,0.2)',
                                padding: '12px 15px',
                                borderRadius: '8px',
                                color: 'rgba(255,255,255,0.85)',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {item.body || item.content}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PushHistoryTab;
