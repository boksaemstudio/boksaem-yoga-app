import { UserFocus } from '@phosphor-icons/react';
import { AttendanceHeatmap, RevenueTrend, MemberStatusPie } from '../charts/AdminCharts';
import { useStudioConfig } from '../../../contexts/StudioContext';

const StatsTab = ({ summary, stats, revenueTrend, memberStatusDist }) => {
    const { config } = useStudioConfig();
    const primaryColor = config.THEME?.PRIMARY_COLOR || '#D4AF37';
    // Format data for charts
    const heatmapData = stats.byTime.map(([time, count]) => ({ time, count }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* [NEW] Facial Data Status Highlight */}
            <div className="dashboard-card" style={{ border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <UserFocus size={20} weight="fill" color="#60A5FA" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>안면 전산화 완료 현황</span>
                    <div className="tooltip-container" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>i</div>
                        <div className="tooltip-text" style={{ width: '220px', left: 0, transform: 'translateX(0)', color: '#fff', fontSize: '0.8rem' }}>
                            전체 활성 회원 중에서 원활한 무인 출석을 위해 안면(얼굴) 데이터 등록을 완료한 회원의 비율입니다.
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: '800', color: primaryColor }}>{summary?.facialDataCount || 0}</span>
                    <span style={{ fontSize: '1rem', opacity: 0.6 }}>명의 회원이 등록되었습니다.</span>
                    <span style={{ marginLeft: 'auto', fontSize: '1.4rem', fontWeight: '900', color: '#60A5FA' }}>{summary?.facialDataRatio || 0}%</span>
                </div>
                <div style={{ marginTop: '12px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${summary?.facialDataRatio || 0}%`, height: '100%', background: '#60A5FA', transition: 'width 0.8s ease-out' }} />
                </div>
                {summary?.todayFacialMatchCount > 0 && (
                    <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8rem', color: '#34D399' }}>✨ 오늘 AI 자동 인식 출석</span>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#34D399' }}>{summary.todayFacialMatchCount}건</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '6px' }}>(전체 출석의 {summary.todayFacialRatio}%)</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Top Row: Legacy bars (Optional, maybe replace completely? Keeping for now as requested) */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div className="dashboard-card" style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <h3 className="card-label" style={{ margin: 0 }}>시간대별 이용 현황</h3>
                        <div className="tooltip-container" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>i</div>
                            <div className="tooltip-text" style={{ width: '220px', left: 0, transform: 'translateX(0)', color: '#fff', fontSize: '0.8rem' }}>
                                출석 로그 데이터를 기반으로 시간대별 총 이용 건수를 집계합니다.
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                        {stats.byTime.map(([time, count]) => (
                            <div key={time} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ width: '60px', color: 'var(--text-secondary)' }}>{time}</span>
                                <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${(count / Math.max(1, stats.byTime[0]?.[1])) * 100}%`, height: '100%', background: primaryColor }} />
                                </div>
                                <span style={{ width: '40px', textAlign: 'right', fontWeight: 'bold' }}>{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="dashboard-card" style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <h3 className="card-label" style={{ margin: 0 }}>수업별 인기 현황</h3>
                        <div className="tooltip-container" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>i</div>
                            <div className="tooltip-text" style={{ width: '220px', left: 'auto', right: 0, transform: 'translateX(0)', color: '#fff', fontSize: '0.8rem' }}>
                                출석 로그를 바탕으로 각 수업(종목)별 누적 참석 횟수를 보여줍니다.
                            </div>
                        </div>
                    </div>
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
