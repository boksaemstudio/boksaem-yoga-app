import React from 'react';
import { ClockCounterClockwise } from '@phosphor-icons/react';
import { getBranchName } from '../../../studioConfig';

const LogsTab = ({ todayClasses, logs, currentLogPage, setCurrentLogPage }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Summary of Today's Classes */}
            {todayClasses.length > 0 && (
                <div className="dashboard-card" style={{ border: '1px solid rgba(212,175,55,0.2)' }}>
                    <h3 className="card-label" style={{ marginBottom: '15px', color: 'var(--primary-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ClockCounterClockwise size={18} /> 오늘 수업별 출석 요약
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        {todayClasses.map((cls, idx) => (
                            <div key={idx} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{cls.className}</div>
                                    <span style={{
                                        fontSize: '0.65rem',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: cls.branchId === 'gwangheungchang' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                        color: cls.branchId === 'gwangheungchang' ? 'var(--primary-gold)' : 'var(--text-secondary)',
                                        fontWeight: 'bold',
                                        border: `1px solid ${cls.branchId === 'gwangheungchang' ? 'rgba(212, 175, 55, 0.3)' : 'rgba(255, 255, 255, 0.15)'}`
                                    }}>
                                        {getBranchName(cls.branchId)}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '8px' }}>{cls.instructor} 강사님</div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                                    <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary-gold)', lineHeight: 1 }}>{cls.count}</span>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>명 참여</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="dashboard-card">
                <h3 className="card-label">최근 활동 로그</h3>
                <div style={{ marginTop: '10px' }}>
                    {(() => {
                        const itemsPerPage = 15;
                        const startIndex = (currentLogPage - 1) * itemsPerPage;
                        const paginatedLogs = logs.slice(startIndex, startIndex + itemsPerPage);
                        const totalLogPages = Math.ceil(logs.length / itemsPerPage);

                        return (
                            <>
                                {paginatedLogs.map((log, index) => (
                                    <div key={index} className="log-item" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '12px',
                                        marginBottom: '6px',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '8px',
                                        borderLeft: `3px solid ${log.type === 'checkin' ? 'var(--accent-success)' :
                                            log.type === 'register' ? 'var(--primary-gold)' :
                                                log.type === 'extend' ? '#3B82F6' :
                                                    'var(--text-secondary)'
                                            }`
                                    }}>
                                        <div style={{ width: '60px', fontSize: '0.75rem', opacity: 0.6, textAlign: 'center' }}>
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{ flex: 1, paddingLeft: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: 'bold' }}>{log.name || '알 수 없음'}</span>
                                                <span className="badge" style={{ fontSize: '0.65rem', padding: '2px 4px' }}>{getBranchName(log.branchId)}</span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '2px' }}>
                                                {log.action}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {totalLogPages > 1 && (
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
                                        <button disabled={currentLogPage === 1} onClick={() => setCurrentLogPage(p => p - 1)} className="action-btn sm">&lt;</button>
                                        <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>{currentLogPage} / {totalLogPages}</span>
                                        <button disabled={currentLogPage === totalLogPages} onClick={() => setCurrentLogPage(p => p + 1)} className="action-btn sm">&gt;</button>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

export default LogsTab;
