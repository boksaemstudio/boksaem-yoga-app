import { useState, useEffect } from 'react';
import { Icons } from '../CommonIcons';
import { getTranslatedClass } from '../../utils/classMapping';
import { getHolidayName } from '../../utils/holidays';


const AttendanceHistory = ({ logs, member, language, t, aiAnalysis, onDelete, logLimit, setLogLimit }) => {
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const [loadingMsg, setLoadingMsg] = useState(t('analysisPending'));

    // Rotating loading messages
    useEffect(() => {
        if (aiAnalysis) return;

        const messages = language === 'ko' ? [
            "호흡을 고르는 중...",
            "수련 기록을 읽는 중...",
            "회원님의 리듬을 파악하는 중...",
            "고요한 통찰을 준비 중입니다..."
        ] : [
            "Breathing in...",
            "Reading your flow...",
            "Connecting to your rhythm...",
            "Preparing insights..."
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
                    background: isToday ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255,255,255,0.02)',
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
                            {dayLogs.map((log, idx) => (
                                <div key={idx} style={{
                                    fontSize: '0.65rem',
                                    background: 'var(--primary-gold)',
                                    color: 'black',
                                    padding: '2px 4px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontWeight: 'bold',
                                    textAlign: 'center'
                                }}>
                                    {log.className ? getTranslatedClass(log.className, t) : t('selfPractice')}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return days;
    };

    return (
        <div className="fade-in">
            {/* Statistics / AI Analysis Panel */}
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', background: 'rgba(20, 20, 20, 0.9)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: 'var(--primary-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ✨ AI 수련 분석
                </h3>
                <div style={{
                    marginBottom: '15px',
                    padding: '12px 16px',
                    background: 'rgba(212, 175, 55, 0.1)',
                    borderRadius: '10px',
                    borderLeft: '3px solid var(--primary-gold)',
                }}>
                    <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.5', color: 'var(--primary-gold)', fontWeight: '700', wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }}>
                        {aiAnalysis ? aiAnalysis.message.replace(/\*\*/g, '') : loadingMsg}
                    </p>
                </div>
                {logs.length === 0 && (
                    <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>데이터가 부족합니다.</p>
                )}
            </div>

            <div className="glass-panel" style={{ padding: '20px', background: 'rgba(24, 24, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-gold)', margin: 0 }}>수련 이력</h3>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>총 {logs.length}회</span>
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
                            목록
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
                            달력
                        </button>
                    </div>
                </div>

                {viewMode === 'list' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {logs.map((log, idx) => {
                            const date = new Date(log.timestamp);
                            const isValidDate = !isNaN(date.getTime());

                            return (
                                <div key={log.id} style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--primary-gold)' }}>
                                            {isValidDate ? (
                                                <>
                                                    {new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : (language === 'en' ? 'en-US' : (language === 'ru' ? 'ru-RU' : (language === 'zh' ? 'zh-CN' : 'ja-JP'))), { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)} {date.toLocaleTimeString(language === 'ko' ? 'ko-KR' : (language === 'en' ? 'en-US' : (language === 'ru' ? 'ru-RU' : (language === 'zh' ? 'zh-CN' : 'ja-JP'))), { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                                </>
                                            ) : (
                                                <span>Invalid Date</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white' }}>
                                            {log.className || "자율 수련"}
                                            {log.instructor && `(${log.instructor})`}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.4, color: 'white' }}>
                                            {log.branchId === 'gwangheungchang' ? t('branchGwangheungchang') : (log.branchId === 'mapo' ? t('branchMapo') : log.branchId)} |
                                            {member.membershipType ? (t(`class_${member.membershipType}`) !== `class_${member.membershipType}` ? t(`class_${member.membershipType}`) : member.membershipType) : t('class_regular')}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ 
                                            fontSize: '0.8rem', 
                                            color: (member.endDate && new Date(log.timestamp) > new Date(member.endDate + 'T23:59:59')) ? '#ff4d4f' : 'var(--primary-gold)', 
                                            border: '1px solid currentColor', 
                                            padding: '2px 8px', 
                                            borderRadius: '10px' 
                                        }}>
                                            {(member.endDate && new Date(log.timestamp) > new Date(member.endDate + 'T23:59:59')) 
                                                ? "기간만료" 
                                                : `${logs.length - idx}회차`}
                                        </div>
                                        {onDelete && (
                                            <button
                                                onClick={() => onDelete(log.id)}
                                                style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex' }}
                                                title="출석 취소"
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
                                    border: '1px dashed rgba(212, 175, 55, 0.5)',
                                    borderRadius: '12px',
                                    marginTop: '10px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                ▿ {t('loadMoreAttendance') || '과거 수련 내역 더보기'} (10개 추가)
                            </button>
                        )}
                        {logs.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.3 }}>
                                {t('noAttendanceHistory') || '수련 기록이 없습니다.'}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Calendar View Implementation */
                    <div className="fade-in">
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                            <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem' }}>&lt;</button>
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>
                                {currentDate.getFullYear()}. {currentDate.getMonth() + 1}
                            </span>
                            <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem' }}>&gt;</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center', marginBottom: '10px' }}>
                            {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                                <div key={d} style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{d}</div>
                            ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                            {renderCalendar()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceHistory;
