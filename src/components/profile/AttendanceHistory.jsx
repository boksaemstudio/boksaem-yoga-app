import { useState, useEffect } from 'react';
import { Icons } from '../CommonIcons';
import { getTranslatedClass } from '../../utils/classMapping';
import { getHolidayName } from '../../utils/holidays';
import { useStudioConfig } from '../../contexts/StudioContext';
import { getMembershipLabel } from '../../utils/membershipLabels';
import WorkoutReportModal from './WorkoutReportModal';
import { useLanguageStore } from '../../stores/useLanguageStore';

const AttendanceHistory = ({ logs, member, language, t, aiAnalysis, onDelete, isSubmitting, logLimit, setLogLimit }) => {

    const { config } = useStudioConfig();
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedReportLog, setSelectedReportLog] = useState(null);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const [loadingMsg, setLoadingMsg] = useState(t('analysisPending'));

    // Rotating loading messages
    useEffect(() => {
        if (aiAnalysis) return;

        const messages = [
            t('loadMsg1'),
            t('loadMsg2'),
            t('loadMsg3'),
            t('loadMsg4')
        ];


        let i = 0;
        const interval = setInterval(() => {
            setLoadingMsg(messages[i]);
            i = (i + 1) % messages.length;
        }, 2000);

        return () => clearInterval(interval);
    }, [aiAnalysis, language]);

    const changeMonth = (delta) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} style={{ height: '80px', background: 'transparent' }} />);
        }

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayLogs = logs.filter(log => {
                const logDate = new Date(log.timestamp);
                return logDate.getFullYear() === year &&
                    logDate.getMonth() === month &&
                    logDate.getDate() === day;
            });

            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            const holidayKey = getHolidayName(dateStr);
            const isSunday = new Date(year, month, day).getDay() === 0;
            const isRedDay = isSunday || holidayKey;

            days.push(
                <div key={day} style={{
                    height: '80px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '6px',
                    position: 'relative',
                    background: isToday ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <div style={{
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        color: isToday ? 'var(--primary-gold)' : (isRedDay ? '#ff6b6b' : 'rgba(255,255,255,0.7)'),
                        marginBottom: '4px'
                    }}>
                        {day}
                    </div>
                    {/* Holiday Label */}
                    {getHolidayName(dateStr) && (
                        <div style={{ fontSize: '0.6rem', color: '#ff6b6b', marginBottom: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                            {t(getHolidayName(dateStr))}
                        </div>
                    )}
                    {dayLogs.length > 0 && (
                        <div style={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            overflow: 'hidden'
                        }}>
                            {dayLogs.map((log, idx) => {
                                const isExpired = isExpiredLog(log);
                                const branchConfig = config.BRANCHES?.find(b => b.id === log.branchId);
                                const badgeColor = isExpired ? '#ff4d4f' : (branchConfig ? branchConfig.color : 'var(--primary-gold)');
                                return (
                                    <div key={idx} style={{
                                        fontSize: '0.65rem',
                                        background: badgeColor,
                                        color: isExpired ? 'white' : 'black',
                                        padding: '2px 4px',
                                        borderRadius: '4px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        opacity: isExpired ? 0.8 : 1
                                    }}>
                                        {isExpired ? '⛔' : ''}{log.className ? getTranslatedClass(log.className, t) : t('selfPractice')}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        return days;
    };

    const isExpiredLog = (log) => {
        // [FIX] 강제로 시간이나 기간을 계산하여 UI에서 결과를 변조하지 않습니다.
        // 오직 데이터베이스에 명확히 명시된 상태(출석거부)만을 기준으로 렌더링합니다.
        return log.status === 'denied';
    };

    const validLogs = logs.filter(log => !isExpiredLog(log));
    const expiredLogsCount = logs.length - validLogs.length;

    return (
        <div className="fade-in">
            {/* Statistics / AI Analysis Panel */}
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', background: 'rgba(20, 20, 20, 0.9)', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: 'var(--primary-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {t('aiPracticeAnalysis')}
                </h3>
                <div style={{
                    marginBottom: '15px',
                    padding: '12px 16px',
                    background: 'rgba(var(--primary-rgb), 0.1)',
                    borderRadius: '10px',
                    borderLeft: '3px solid var(--primary-gold)',
                }}>
                    <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.5', color: 'var(--primary-gold)', fontWeight: '700', wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }}>
                        {aiAnalysis ? aiAnalysis.message.replace(/\*\*/g, '') : loadingMsg}
                    </p>
                </div>
                {logs.length === 0 && (
                    <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>{t('notEnoughData')}</p>
                )}
            </div>

            <div className="glass-panel" style={{ padding: '20px', background: 'rgba(24, 24, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-gold)', margin: 0 }}>{t('practiceHistory')}</h3>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                            {t('normalCount', { n: validLogs.length })} 
                            {expiredLogsCount > 0 && <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>({t('expiredCancelCount', { n: expiredLogsCount })})</span>}
                        </span>
                    </div>

                    {/* View Toggle */}
                    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '2px', display: 'flex' }}>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                background: viewMode === 'list' ? 'var(--primary-gold)' : 'transparent',
                                color: viewMode === 'list' ? 'black' : 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold'
                            }}
                        >
                            {t('listView')}
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            style={{
                                background: viewMode === 'calendar' ? 'var(--primary-gold)' : 'transparent',
                                color: viewMode === 'calendar' ? 'black' : 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold'
                            }}
                        >
                            {t('calendarView')}
                        </button>
                    </div>
                </div>

                {viewMode === 'list' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {logs.map((log, idx) => {
                            const date = new Date(log.timestamp);
                            const isValidDate = !isNaN(date.getTime());
                            const isExpired = isExpiredLog(log);
                            
                            // Calculate proper index for valid logs
                            // Assuming logs are sorted descending (latest first)
                            // We want: Total Valid - (Count of valid logs before this one)
                            // Simpler: filter validLogs, find index of this log in validLogs?
                            // Performance: simple filter is fine for small lists
                            
                            let displayBadge = t('selfPractice');
                            let badgeColor = "var(--primary-gold)";
                            
                            if (isExpired) {
                                if (log.status === 'denied') {
                                     displayBadge = log.denialReason === 'no_credits' ? t('deniedNoCredits') : t('deniedExpired');
                                } else {
                                     displayBadge = t('deniedExpired'); // Legacy fallback
                                }
                                badgeColor = "#ff4d4f";
                            } else {
                                // Find index in validLogs
                                const validIndex = validLogs.findIndex(l => l.id === log.id);
                                // Assuming logs are descending, the count is validLogs.length - validIndex
                                displayBadge = t('sessionN', { n: validLogs.length - validIndex });
                            }

                            return (
                                <div key={log.id} style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: isExpired ? '#ff4d4f' : 'var(--primary-gold)' }}>
                                            {isValidDate ? (
                                                <>
                                                    {new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : (language === 'en' ? 'en-US' : (language === 'ru' ? 'ru-RU' : (language === 'zh' ? 'zh-CN' : 'ja-JP'))), { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)} {date.toLocaleTimeString(language === 'ko' ? 'ko-KR' : (language === 'en' ? 'en-US' : (language === 'ru' ? 'ru-RU' : (language === 'zh' ? 'zh-CN' : 'ja-JP'))), { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                                </>
                                            ) : (
                                                <span>Invalid Date</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: isExpired ? '#rgba(255,255,255,0.5)' : 'white', textDecoration: isExpired ? 'line-through' : 'none' }}>
                                            {log.className || t('selfPractice')}
                                            {log.instructor && `(${log.instructor})`}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.4, color: 'white' }}>
                                            {(config.BRANCHES?.find(b => b.id === log.branchId)?.name || log.branchId)} |
                                            {getMembershipLabel(member.membershipType, config)}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {localStorage.getItem('watchSync') === 'true' && !isExpired && (
                                            <button
                                                onClick={() => setSelectedReportLog(log)}
                                                style={{
                                                    background: 'rgba(0, 255, 204, 0.1)',
                                                    border: '1px solid rgba(0, 255, 204, 0.3)',
                                                    color: '#00ffcc',
                                                    borderRadius: '8px',
                                                    padding: '4px 8px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                ⌚ 리포트
                                            </button>
                                        )}
                                        <div style={{ 
                                            fontSize: '0.8rem', 
                                            color: badgeColor, 
                                            border: '1px solid currentColor', 
                                            padding: '2px 8px', 
                                            borderRadius: '10px' 
                                        }}>
                                            {displayBadge}
                                        </div>
                                        {onDelete && (
                                            <button
                                                onClick={() => onDelete(log.id)}
                                                disabled={isSubmitting}
                                                style={{ background: isSubmitting ? 'rgba(100,100,100,0.2)' : 'rgba(239, 68, 68, 0.2)', color: isSubmitting ? '#888' : '#ef4444', border: 'none', borderRadius: '6px', padding: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', opacity: isSubmitting ? 0.4 : 1, transition: 'opacity 0.2s' }}
                                                title={t('cancelAttendance')}
                                            >
                                                <Icons.Trash size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Pagination: Load More Button */}
                        {setLogLimit && logs.length >= logLimit && (
                            <button
                                onClick={() => setLogLimit(prev => prev + 10)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'var(--primary-gold)',
                                    border: '1px dashed rgba(var(--primary-rgb), 0.5)',
                                    borderRadius: '12px',
                                    marginTop: '10px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                ▿ {t('loadMoreAttendance')} {t('loadMoreN')}
                            </button>
                        )}
                        {logs.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.3 }}>
                                {t('noAttendanceHistory')}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Calendar View Implementation */
                    <div className="fade-in">
                        {/* Legend for Branches */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '15px' }}>
                            {(config.BRANCHES || []).map(branch => (
                                <div key={branch.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: branch.color }}></div>
                                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>{branch.name}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                            <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem' }}>&lt;</button>
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>
                                {currentDate.getFullYear()}. {currentDate.getMonth() + 1}
                            </span>
                            <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem' }}>&gt;</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center', marginBottom: '10px' }}>
                            {[t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')].map(d => (
                                <div key={d} style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{d}</div>
                            ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                            {renderCalendar()}
                        </div>
                    </div>
                )}
            </div>

            {/* Health Report Modal */}
            {selectedReportLog && (
                <WorkoutReportModal 
                    log={selectedReportLog} 
                    onClose={() => setSelectedReportLog(null)} 
                    t={t} 
                />
            )}
        </div>
    );
};

export default AttendanceHistory;
