
import { AttendanceHeatmap, RevenueTrend, MemberStatusPie } from '../charts/AdminCharts';

const StatsTab = ({ stats, revenueTrend, memberStatusDist }) => {
    // Format data for charts
    const heatmapData = stats.byTime.map(([time, count]) => ({ time, count }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Row: Legacy bars (Optional, maybe replace completely? Keeping for now as requested) */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div className="dashboard-card" style={{ flex: 1, minWidth: '300px' }}>
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
                <div className="dashboard-card" style={{ flex: 1, minWidth: '300px' }}>
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
            </div>

            {/* Middle Row: Charts */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div className="dashboard-card" style={{ flex: 1, minWidth: '300px' }}>
                    <AttendanceHeatmap data={heatmapData} />
                </div>
                <div className="dashboard-card" style={{ flex: 1, minWidth: '300px' }}>
                    <MemberStatusPie data={memberStatusDist} />
                </div>
            </div>

            {/* Bottom Row: Revenue */}
            <div className="dashboard-card">
                <RevenueTrend data={revenueTrend} />
            </div>
        </div>
    );
};

export default StatsTab;
