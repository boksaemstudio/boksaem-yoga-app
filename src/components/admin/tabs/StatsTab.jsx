import React from 'react';

const StatsTab = ({ stats }) => {
    return (
        <>
            <div className="dashboard-card">
                <h3 className="card-label">시간대별 이용 현황</h3>
                <div style={{ marginTop: '10px' }}>
                    {stats.byTime.map(([time, count]) => (
                        <div key={time} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ width: '60px', color: 'var(--text-secondary)' }}>{time}</span>
                            <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${(count / Math.max(1, stats.byTime[0]?.[1])) * 100}%`, height: '100%', background: 'var(--primary-gold)' }} />
                            </div>
                            <span style={{ width: '40px', textAlign: 'right', fontWeight: 'bold' }}>{count}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="dashboard-card">
                <h3 className="card-label">수업별 인기 현황</h3>
                <div style={{ marginTop: '10px' }}>
                    {stats.bySubject.map(([subject, count]) => (
                        <div key={subject} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ width: '100px', color: 'var(--text-secondary)' }}>{subject}</span>
                            <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${(count / Math.max(1, stats.bySubject[0]?.[1])) * 100}%`, height: '100%', background: 'var(--accent-success)' }} />
                            </div>
                            <span style={{ width: '40px', textAlign: 'right', fontWeight: 'bold' }}>{count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default StatsTab;
