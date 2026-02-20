import React from 'react';
import * as Icons from '@phosphor-icons/react';
import MemberScheduleCalendar from '../../MemberScheduleCalendar';

const ScheduleTab = ({
    t,
    scheduleView,
    setScheduleView,
    scheduleBranch,
    setScheduleBranch,
    STUDIO_CONFIG,
    validLogs,
    scheduleMonth,
    setScheduleMonth,
    images,
    timeTable1,
    timeTable2,
    setLightboxImage
}) => {
    const viewToggleStyle = {
        border: 'none',
        padding: '6px 16px',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        whiteSpace: 'nowrap'
    };

    return (
        <div className="fade-in">
            <div className="glass-panel" style={{ padding: '24px', background: 'rgba(15, 15, 15, 0.9)', minHeight: '400px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                <div style={{ marginBottom: '25px', textAlign: 'left' }}>
                    <h2 style={{ fontSize: '1.5rem', color: 'white', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>{t('scheduleTitle')}</h2>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--primary-gold)', opacity: 0.9, lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {t('scheduleSub')}
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px', display: 'flex', gap: '4px' }}>
                        <button onClick={() => setScheduleView('calendar')} style={{ ...viewToggleStyle, background: scheduleView === 'calendar' ? 'white' : 'transparent', color: scheduleView === 'calendar' ? 'black' : 'white', borderRadius: '8px' }}>{t('viewCalendar')}</button>
                        <button onClick={() => setScheduleView('image')} style={{ ...viewToggleStyle, background: scheduleView === 'image' ? 'white' : 'transparent', color: scheduleView === 'image' ? 'black' : 'white', borderRadius: '8px' }}>{t('viewWeekly')}</button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                    {STUDIO_CONFIG.BRANCHES.map(b => (
                        <button
                            key={b.id}
                            onClick={() => setScheduleBranch(b.id)}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                border: scheduleBranch === b.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                background: scheduleBranch === b.id ? 'var(--primary-gold)' : 'rgba(255,255,255,0.03)',
                                color: scheduleBranch === b.id ? 'black' : 'rgba(255,255,255,0.6)',
                                fontSize: '0.9rem',
                                transition: 'all 0.3s ease',
                                boxShadow: scheduleBranch === b.id ? '0 4px 15px rgba(212, 175, 55, 0.3)' : 'none'
                            }}
                        >
                            {t('branch' + (b.id === 'gwangheungchang' ? 'Gwangheungchang' : 'Mapo'))}
                        </button>
                    ))}
                </div>
                {scheduleView === 'calendar' ? (
                    <MemberScheduleCalendar branchId={scheduleBranch || 'gwangheungchang'} attendanceLogs={validLogs} />
                ) : (
                    (() => {
                        const now = new Date();
                        const currentYear = now.getFullYear();
                        const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
                        const currentKeyDate = `${currentYear}-${currentMonthStr}`;

                        const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                        const nextYear = nextDate.getFullYear();
                        const nextMonthStr = String(nextDate.getMonth() + 1).padStart(2, '0');
                        const nextKeyDate = `${nextYear}-${nextMonthStr}`;

                        const currentBranchId = scheduleBranch || 'gwangheungchang';

                        const currentKey = `timetable_${currentBranchId}_${currentKeyDate}`;
                        const nextKey = `timetable_${currentBranchId}_${nextKeyDate}`;
                        const oldKey = `timetable_${currentBranchId}`;

                        const hasNext = !!images[nextKey];
                        const activeMonth = scheduleMonth === 'next' && hasNext ? 'next' : 'current';
                        const displayImage = activeMonth === 'next' ? images[nextKey] : (images[currentKey] || images[oldKey] || (currentBranchId === 'gwangheungchang' ? timeTable1 : timeTable2));

                        return (
                            <div style={{ position: 'relative', width: '100%', borderRadius: '10px', overflow: 'hidden' }}>
                                {/* Month Navigation Overlay */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '10px',
                                    padding: '0 5px'
                                }}>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>
                                        {activeMonth === 'current' ? `${currentMonthStr}월 시간표` : `${nextMonthStr}월 시간표 (미리보기)`}
                                    </h3>

                                    {hasNext && (
                                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2px' }}>
                                            <button
                                                onClick={() => setScheduleMonth('current')}
                                                style={{
                                                    background: activeMonth === 'current' ? 'var(--primary-gold)' : 'transparent',
                                                    color: activeMonth === 'current' ? 'black' : 'rgba(255,255,255,0.6)',
                                                    border: 'none',
                                                    borderRadius: '20px',
                                                    padding: '4px 12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {currentMonthStr}월
                                            </button>
                                            <button
                                                onClick={() => setScheduleMonth('next')}
                                                style={{
                                                    background: activeMonth === 'next' ? 'var(--primary-gold)' : 'transparent',
                                                    color: activeMonth === 'next' ? 'black' : 'rgba(255,255,255,0.6)',
                                                    border: 'none',
                                                    borderRadius: '20px',
                                                    padding: '4px 12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {nextMonthStr}월 &gt;
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <img
                                    src={displayImage}
                                    style={{ width: '100%', display: 'block', borderRadius: '8px', cursor: 'pointer' }}
                                    alt="timetable"
                                    onClick={() => setLightboxImage(displayImage)}
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                />
                                <div style={{ display: 'none', height: '200px', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px' }}>{t('noTimetableImage')}</div>
                            </div>
                        );
                    })()
                )}
            </div>
        </div>
    );
};

export default ScheduleTab;
