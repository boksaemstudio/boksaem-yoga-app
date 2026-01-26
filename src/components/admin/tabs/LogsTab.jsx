import React, { useState } from 'react';
import { ClockCounterClockwise, Trash, Sparkle } from '@phosphor-icons/react';
import { getBranchName } from '../../../studioConfig';
import { storageService } from '../../../services/storage';

const LogsTab = ({ todayClasses, logs, currentLogPage, setCurrentLogPage, members = [], onMemberClick }) => {
    const [selectedClassKey, setSelectedClassKey] = useState(null);

    const handleClassClick = (cls) => {
        const key = `${cls.className}-${cls.instructor}-${cls.branchId}`;
        setSelectedClassKey(prev => prev === key ? null : key);
        setCurrentLogPage(1); // Reset page on filter change
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Summary of Today's Classes */}
            {todayClasses.length > 0 && (
                <div className="dashboard-card" style={{ border: '1px solid rgba(212,175,55,0.2)' }}>
                    <h3 className="card-label" style={{ marginBottom: '15px', color: 'var(--primary-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ClockCounterClockwise size={18} /> 오늘 수업별 출석 요약
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        {todayClasses.map((cls, idx) => {
                            const key = `${cls.className}-${cls.instructor}-${cls.branchId}`;
                            const isSelected = selectedClassKey === key;
                            return (
                                <div
                                    key={idx}
                                    onClick={() => handleClassClick(cls)}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: isSelected ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                                        border: isSelected ? '1px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.05)',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isSelected ? '0 0 15px rgba(212,175,55,0.2)' : 'none'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: isSelected ? 'var(--primary-gold)' : 'inherit' }}>{cls.className}</div>
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
                                    {isSelected && (
                                        <div style={{ position: 'absolute', bottom: '-8px', right: '10px', fontSize: '0.6rem', color: 'var(--primary-gold)', background: 'var(--bg-card)', padding: '0 4px' }}>필터링 중</div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            <div className="dashboard-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 className="card-label" style={{ margin: 0 }}>최근 활동 로그</h3>
                        {selectedClassKey && (
                            <button
                                onClick={() => setSelectedClassKey(null)}
                                style={{ background: 'var(--primary-gold)', color: 'black', border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                필터 해제 (전체 보기)
                            </button>
                        )}
                    </div>
                    {logs.length > 0 && (
                        <button
                            onClick={async () => {
                                const res = await storageService.clearAllAttendance();
                                if (res.success) alert(`${res.count}건의 기록이 삭제되었습니다.`);
                            }}
                            className="action-btn sm"
                            style={{ color: '#F43F5E', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)' }}
                        >
                            <Trash size={14} /> 전체 기록 삭제
                        </button>
                    )}
                </div>
                <div style={{ marginTop: '10px' }}>
                    {(() => {
                        const filteredLogs = selectedClassKey
                            ? logs.filter(l => `${l.className || '일반'}-${l.instructor || '선생님'}-${l.branchId}` === selectedClassKey)
                            : logs;

                        const itemsPerPage = 15;
                        const startIndex = (currentLogPage - 1) * itemsPerPage;
                        const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);
                        const totalLogPages = Math.ceil(filteredLogs.length / itemsPerPage);

                        return (
                            <>
                                {paginatedLogs.map((log, index) => (
                                    <div
                                        key={index}
                                        onClick={() => {
                                            if (log.memberId && onMemberClick) {
                                                const member = members.find(m => m.id === log.memberId);
                                                if (member) onMemberClick(member);
                                            }
                                        }}
                                        className="log-item"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '12px',
                                            marginBottom: '6px',
                                            background: 'rgba(255,255,255,0.02)',
                                            borderRadius: '8px',
                                            cursor: log.memberId ? 'pointer' : 'default',
                                            transition: 'all 0.2s ease',
                                            borderLeft: `3px solid ${log.type === 'checkin' ? 'var(--accent-success)' :
                                                log.type === 'register' ? 'var(--primary-gold)' :
                                                    log.type === 'extend' ? '#3B82F6' :
                                                        'var(--text-secondary)'
                                                }`
                                        }}
                                        onMouseEnter={(e) => { if (log.memberId) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                        onMouseLeave={(e) => { if (log.memberId) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                                    >
                                        <div style={{ width: '60px', fontSize: '0.75rem', opacity: 0.6, textAlign: 'center' }}>
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{ flex: 1, paddingLeft: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: 'bold' }}>{log.memberName || log.name || '알 수 없음'}</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--primary-gold)', background: 'rgba(212,175,55,0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                                                    {log.className || '일반'}
                                                </span>
                                                <span className="badge" style={{ fontSize: '0.65rem', padding: '2px 4px' }}>{getBranchName(log.branchId)}</span>

                                                {/* [NEW] Passion Badge for Multi-session */}
                                                {(log.sessionCount > 1 || log.isMultiSession) && (
                                                    <span style={{
                                                        fontSize: '0.65rem',
                                                        padding: '1px 6px',
                                                        borderRadius: '10px',
                                                        background: 'var(--primary-gold)',
                                                        color: 'black',
                                                        fontWeight: 'bold',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '3px'
                                                    }}>
                                                        <Sparkle size={10} weight="fill" />
                                                        {log.sessionCount || '2'}회차 Passion
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '2px' }}>
                                                {log.action?.includes('출석') ? `${log.className || '일반'} 수업 참여 (${log.instructor || '관리자'} 강사님)` : log.action}
                                            </div>
                                        </div>
                                        {log.type === 'checkin' && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (confirm('이 출석 기록을 삭제하시겠습니까?')) {
                                                        await storageService.deleteAttendance(log.id);
                                                    }
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'rgba(244, 63, 94, 0.5)',
                                                    cursor: 'pointer',
                                                    padding: '8px'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.color = '#F43F5E'}
                                                onMouseOut={(e) => e.currentTarget.style.color = 'rgba(244, 63, 94, 0.5)'}
                                            >
                                                <Trash size={16} />
                                            </button>
                                        )}
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
