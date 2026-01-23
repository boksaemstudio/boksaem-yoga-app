import React, { useMemo } from 'react';
import { Warning, Sparkle, MoonStars, CaretRight } from '@phosphor-icons/react';

const AdminInsights = ({ members, briefing, currentBranch = 'all', filterType, onFilterSelect }) => {
    const stats = useMemo(() => {
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const today = new Date(todayStr);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const twoWeeksAgo = new Date(today);
        twoWeeksAgo.setDate(today.getDate() - 14);

        const filtered = (members || []).filter(m => currentBranch === 'all' || m.homeBranch === currentBranch);

        return {
            expiring: filtered.filter(m => {
                const end = m.endDate ? new Date(m.endDate) : null;
                return (end && end >= today && end <= nextWeek) || (m.credits <= 0);
            }),
            newReg: filtered.filter(m => m.regDate === todayStr),
            risk: filtered.filter(m => {
                const last = m.lastAttendance ? new Date(m.lastAttendance) : null;
                const join = new Date(m.regDate || m.createdAt);
                const compareDate = last || join;
                const isMembershipActive = m.credits > 0 && (!m.endDate || new Date(m.endDate) >= today);
                return isMembershipActive && compareDate < twoWeeksAgo;
            })
        };
    }, [members, currentBranch]);

    const getCardStyle = (type) => ({
        background: filterType === type ? 'rgba(212, 175, 55, 0.15)' : 'rgba(39, 39, 42, 0.6)',
        borderRadius: '12px',
        padding: '15px',
        border: filterType === type ? '1px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: filterType === type ? 'translateY(-2px)' : 'none',
        boxShadow: filterType === type ? '0 4px 12px rgba(212,175,55,0.2)' : 'none',
        ':hover': { transform: 'translateY(-2px)' }
    });

    return (
        <div className="fade-in" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkle weight="fill" color="var(--primary-gold)" /> 오늘의 인사이트
            </h3>

            {/* AI Briefing Card */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(0,0,0,0) 100%)',
                border: '1px solid var(--primary-gold)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'start',
                gap: '15px'
            }}>
                <div style={{ fontSize: '1.5rem' }}>🧙‍♂️</div>
                <div>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--primary-gold)', fontSize: '1rem' }}>AI 원장님의 브리핑</h4>
                    <p style={{ margin: 0, color: '#e4e4e7', whiteSpace: 'pre-line', lineHeight: '1.6', fontSize: '0.95rem' }}>
                        {briefing}
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>

                {/* Expiring Card */}
                <div
                    onClick={() => onFilterSelect && onFilterSelect('expiring_soon')}
                    className="insight-card"
                    style={getCardStyle('expiring_soon')}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>만료 예정 (7일)</span>
                        <Warning color="#f59e0b" size={20} />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white' }}>
                        {stats.expiring.length}<span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#71717a', marginLeft: '5px' }}>명</span>
                    </div>
                    {stats.expiring.length > 0 && (
                        <div style={{ fontSize: '0.8rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '5px 8px', borderRadius: '6px', width: 'fit-content' }}>
                            관리 필요
                        </div>
                    )}
                </div>

                {/* New Card */}
                <div
                    onClick={() => onFilterSelect && onFilterSelect('registration')}
                    className="insight-card"
                    style={getCardStyle('registration')}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>오늘의 신규</span>
                        <Sparkle color="#10b981" size={20} />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white' }}>
                        {stats.newReg.length}<span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#71717a', marginLeft: '5px' }}>명</span>
                    </div>
                    {stats.newReg.length > 0 && (
                        <div style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '5px 8px', borderRadius: '6px', width: 'fit-content' }}>
                            환영해주세요!
                        </div>
                    )}
                </div>

                {/* Risk Card */}
                <div
                    onClick={() => onFilterSelect && onFilterSelect('risk')}
                    className="insight-card"
                    style={getCardStyle('risk')}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>장기 미출석</span>
                        <MoonStars color="#a1a1aa" size={20} />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white' }}>
                        {stats.risk.length}<span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#71717a', marginLeft: '5px' }}>명</span>
                    </div>
                    {stats.risk.length > 0 && (
                        <div style={{ fontSize: '0.8rem', color: '#a1a1aa', background: 'rgba(255, 255, 255, 0.1)', padding: '5px 8px', borderRadius: '6px', width: 'fit-content' }}>
                            안부 인사
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AdminInsights;
