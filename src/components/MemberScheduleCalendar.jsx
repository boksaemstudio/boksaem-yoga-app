import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { storageService } from '../services/storage';
import { CaretLeft, CaretRight, CheckCircle } from '@phosphor-icons/react';
import { getHolidayName } from '../utils/holidays';
import { getTagColor } from '../utils/colors';
import { useLanguage } from '../hooks/useLanguage';
import { useAttendanceStats } from '../hooks/useAttendanceStats';
import { getTodayKST } from '../utils/dates';
import { getTranslatedClass } from '../utils/classMapping';

const MemberScheduleCalendar = ({ branchId, attendanceLogs = [] }) => {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [monthlyClasses, setMonthlyClasses] = useState({});
    const [loading, setLoading] = useState(false);
    const { t, language } = useLanguage(); // Use hook

    // Use custom hook for stats calculation (memoized)
    const stats = useAttendanceStats(attendanceLogs);
    const { byClass } = stats;

    // Memoize loadMonthlyData function
    const loadMonthlyData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await storageService.getMonthlyClasses(branchId, year, month);
            setMonthlyClasses(data || {});
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [branchId, year, month]);

    useEffect(() => {
        loadMonthlyData();
    }, [loadMonthlyData]);

    const scrollRef = React.useRef(null);
    const [isDown, setIsDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handlePrevMonth = useCallback(() => {
        if (month === 1) {
            setYear(year - 1);
            setMonth(12);
        } else {
            setMonth(month - 1);
        }
    }, [month, year]);

    const handleNextMonth = useCallback(() => {
        if (month === 12) {
            setYear(year + 1);
            setMonth(1);
        } else {
            setMonth(month + 1);
        }
    }, [month, year]);

    const handleMouseDown = useCallback((e) => {
        setIsDown(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    }, []);

    const handleMouseLeave = useCallback(() => setIsDown(false), []);
    const handleMouseUp = useCallback(() => setIsDown(false), []);

    const handleMouseMove = useCallback((e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    }, [isDown, startX, scrollLeft]);

    // Memoize calendar dates calculation
    const calendarDates = useMemo(() => {
        const startDay = new Date(year, month - 1, 1).getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        const dates = [];

        // Add empty slots for the beginning of the month
        for (let i = 0; i < startDay; i++) {
            dates.push(null);
        }

        // Add dates for the month
        for (let d = 1; d <= daysInMonth; d++) {
            dates.push(new Date(year, month - 1, d));
        }

        return dates;
    }, [year, month]);

    const renderCalendar = () => {
        const todayKST = getTodayKST();

        return (
            <div
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                style={{
                    overflowX: 'auto',
                    paddingBottom: '12px',
                    cursor: isDown ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', minWidth: '600px' }}>
                    {[t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')].map(d => (
                        <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', padding: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{d}</div>
                    ))}
                    {calendarDates.map((date, i) => (
                        <CalendarCell
                            key={date ? date.toISOString() : `empty-${i}`}
                            date={date}
                            monthlyClasses={monthlyClasses}
                            attendanceLogs={attendanceLogs}
                            branchId={branchId}
                            todayKST={todayKST}
                            t={t} // Pass t
                            language={language} // Pass language
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={handlePrevMonth} style={navBtnStyle}><CaretLeft /></button>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>
                    {new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : (language === 'en' ? 'en-US' : (language === 'ru' ? 'ru-RU' : (language === 'zh' ? 'zh-CN' : 'ja-JP'))), { year: 'numeric', month: 'long' }).format(new Date(year, month - 1))}
                </h3>
                <button onClick={handleNextMonth} style={navBtnStyle}><CaretRight /></button>
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>{t('loading')}</div> : (
                <>
                    {/* Color Legend */}
                    <ColorLegend t={t} />
                    {renderCalendar()}
                </>
            )}

            {/* My Stats Section */}
            <StatsSection stats={byClass} t={t} />
        </div>
    );
};

// Extract CalendarCell as a memoized component
const CalendarCell = React.memo(({ date, monthlyClasses, attendanceLogs, branchId, todayKST, t, language }) => {
    if (!date) {
        return <div style={{ minHeight: '85px' }} />;
    }

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const classes = monthlyClasses[dateStr] || [];
    const isToday = dateStr === todayKST;

    // Check attendance (filter by branchId)
    const isAttended = attendanceLogs.some(log => {
        if (!log.timestamp) return false;
        const logKST = new Date(log.timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        return logKST === dateStr && log.branchId === branchId;
    });

    // Check if holiday
    const holidayName = getHolidayName(dateStr);

    // Check if holiday/all cancelled
    const isAllCancelled = classes.length > 0 && classes.every(c => c.status === 'cancelled');

    return (
        <div
            style={{
                minHeight: '85px',
                backgroundColor: isToday ? 'rgba(212,175,55,0.15)' : (holidayName ? 'rgba(255,71,87,0.08)' : 'rgba(255,255,255,0.02)'),
                border: isAttended ? '2px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '8px',
                position: 'relative',
                opacity: isAllCancelled ? 0.4 : 1,
                transition: 'transform 0.2s ease'
            }}
        >
            <div style={{ fontSize: '0.85rem', fontWeight: '800', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', color: holidayName ? '#ff4757' : (date.getDay() === 0 ? '#ff4757' : (date.getDay() === 6 ? '#54a0ff' : 'white')) }}>
                {date.getDate()}
                {isAttended && <CheckCircle size={16} weight="fill" color="var(--primary-gold)" />}
            </div>
            {holidayName && (
                <div style={{ fontSize: '0.65rem', color: '#ff6b81', marginBottom: '4px', fontWeight: 'bold' }}>
                    🎉 {t(holidayName)}
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {/* Scheduled Classes */}
                {classes.map((cls, idx) => {
                    const colors = getTagColor(cls.title, dateStr, cls.instructor);
                    // Find if this specific class was attended (filter by branchId)
                    const attendedClass = attendanceLogs.find(log => {
                        if (!log.timestamp) return false;
                        const logDate = new Date(log.timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                        if (logDate !== dateStr) return false;
                        if (log.branchId !== branchId) return false;
                        return log.className && (cls.title.includes(log.className) || log.className.includes(cls.title));
                    });

                    return (
                        <div key={idx} style={{
                            fontSize: '0.8rem',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            backgroundColor: cls.status === 'cancelled' ? 'rgba(255, 71, 87, 0.15)' :
                                cls.status === 'changed' ? 'rgba(255, 165, 2, 0.15)' : colors.bg,
                            color: cls.status === 'cancelled' ? '#ff6b81' :
                                cls.status === 'changed' ? '#ffa502' : colors.text,
                            border: attendedClass ? '2px solid #3498db' : (cls.status === 'cancelled' ? 'none' : `1px solid ${colors.border}`),
                            textDecoration: cls.status === 'cancelled' ? 'line-through' : 'none',
                            fontWeight: attendedClass ? 'bold' : 'normal',
                            boxShadow: attendedClass ? '0 0 8px rgba(52, 152, 219, 0.5)' : 'none',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            marginBottom: '2px'
                        }}>
                            {attendedClass && <div style={{ position: 'absolute', right: '4px', top: '8px', width: '4px', height: '4px', borderRadius: '50%', background: '#3498db' }} />}
                            <span style={{ fontWeight: '600', lineHeight: '1.2' }}>{cls.time} {getTranslatedClass(cls.title, t)}</span>
                            {(cls.instructor || cls.level) && (
                                <span style={{ fontSize: '0.85em', opacity: 0.9, lineHeight: '1.2', display: 'block' }}>
                                    {cls.level ? `Lv.${cls.level} ` : ''}{cls.instructor}
                                </span>
                            )}
                        </div>
                    );
                })}

                {/* Autonomous Practice (자율수련) or Unmatched Attendance */}
                {attendanceLogs
                    .filter(log => {
                        const logDate = new Date(log.timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                        if (logDate !== dateStr) return false;
                        if (log.branchId !== branchId) return false;
                        const matched = classes.some(cls => log.className && (cls.title.includes(log.className) || log.className.includes(cls.title)));
                        return !matched || log.className === '자율수련' || log.className === '자율수업';
                    })
                    .map((log, idx) => (
                        <div key={`auto-${idx}`} style={{
                            fontSize: '0.75rem',
                            padding: '3px 6px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            color: '#3498db',
                            border: '2px solid #3498db',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <span style={{ fontSize: '0.6rem' }}>●</span>
                            <span style={{ fontSize: '0.6rem' }}>●</span>
                            {new Date(log.timestamp).toLocaleTimeString(language === 'ko' ? 'ko-KR' : language, { hour: '2-digit', minute: '2-digit', hour12: false })}
                            {' '}{t('auto_practice')}
                        </div>
                    ))
                }

                {classes.length === 0 && !isAllCancelled && (
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}></span>
                )}
            </div>
        </div>
    );
});

CalendarCell.displayName = 'CalendarCell';

// Extract ColorLegend as a memoized component
const ColorLegend = React.memo(({ t }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(255, 255, 255, 1)', border: '1px solid #dcdcdc' }}></div> {t('legend_regular')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(196, 252, 239, 0.9)', border: '1px solid rgba(129, 236, 236, 1)' }}></div> {t('legend_pregnancy')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(255, 190, 118, 0.9)', border: '1px solid rgba(255, 190, 118, 1)' }}></div> {t('legend_intensive')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(224, 86, 253, 0.7)', border: '1px solid rgba(224, 86, 253, 0.9)' }}></div> {t('legend_saturday')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px solid #3498db' }}></div> {t('legend_my_practice')}
        </div>
    </div>
));

ColorLegend.displayName = 'ColorLegend';

// Extract StatsSection as a memoized component
const StatsSection = React.memo(({ stats, t }) => (
    <div style={{ marginTop: '24px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--primary-gold)' }}>{t('stats_title')}</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([subject, count]) => {
                const colors = getTagColor(subject);
                const translatedSubject = getTranslatedClass(subject, t);
                return (
                    <div key={subject} style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        backgroundColor: colors.bg,
                        border: `1px solid ${colors.border}`,
                        fontSize: '0.9rem',
                        color: colors.text
                    }}>
                        {translatedSubject} <span style={{ fontWeight: 'bold' }}>{count}{t('times')}</span>
                    </div>
                );
            })}
            {Object.keys(stats).length === 0 && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{t('stats_empty')}</span>}
        </div>
    </div>
));

StatsSection.displayName = 'StatsSection';

const navBtnStyle = {
    background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '32px', height: '32px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white'
};

export default MemberScheduleCalendar;
