import { useState, useEffect, useCallback } from 'react';
import { ClockCounterClockwise, Trash, Sparkle, CaretLeft, CaretRight, CalendarBlank } from '@phosphor-icons/react';
import { STUDIO_CONFIG, getBranchName, getBranchColor, getBranchThemeColor } from '../../../studioConfig';
import { guessClassTime, guessClassInfo } from '../../../utils/classUtils';
import { storageService } from '../../../services/storage';

// ─── Mini Calendar Popup ───
const MiniCalendar = ({ selectedDate, onSelect, onClose }) => {
    const sel = new Date(selectedDate + 'T00:00:00+09:00');
    const [viewYear, setViewYear] = useState(sel.getFullYear());
    const [viewMonth, setViewMonth] = useState(sel.getMonth());

    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startDay = new Date(viewYear, viewMonth, 1).getDay();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    const dates = [];
    for (let i = 0; i < startDay; i++) dates.push(null);
    for (let i = 1; i <= daysInMonth; i++) dates.push(i);

    const handleSelect = (day) => {
        if (!day) return;
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        // 미래 날짜 차단
        if (dateStr > todayStr) return;
        onSelect(dateStr);
        onClose();
    };

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    };

    return (
        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', zIndex: 100, marginTop: '8px' }}>
            {/* Backdrop */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }} onClick={onClose} />
            <div style={{
                background: 'var(--bg-surface, #1a1a2e)',
                border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                minWidth: '280px'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <button onClick={prevMonth} style={calNavBtn}><CaretLeft size={14} /></button>
                    <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{viewYear}년 {viewMonth + 1}월</span>
                    <button onClick={nextMonth} style={calNavBtn}><CaretRight size={14} /></button>
                </div>
                {/* Day names */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                    {dayNames.map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)', padding: '4px', fontWeight: 'bold' }}>{d}</div>
                    ))}
                </div>
                {/* Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                    {dates.map((day, i) => {
                        if (!day) return <div key={`e-${i}`} />;
                        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isSelected = dateStr === selectedDate;
                        const isToday = dateStr === todayStr;
                        const isFuture = dateStr > todayStr;
                        const isSunday = new Date(viewYear, viewMonth, day).getDay() === 0;
                        return (
                            <button
                                key={day}
                                onClick={() => handleSelect(day)}
                                disabled={isFuture}
                                style={{
                                    width: '36px', height: '36px',
                                    borderRadius: '50%',
                                    border: isToday ? '2px solid var(--primary-gold)' : 'none',
                                    background: isSelected ? 'var(--primary-gold)' : 'transparent',
                                    color: isSelected ? 'black' : isFuture ? 'rgba(255,255,255,0.15)' : isSunday ? '#ff6b6b' : 'var(--text-primary)',
                                    fontWeight: isSelected || isToday ? 'bold' : 'normal',
                                    fontSize: '0.85rem',
                                    cursor: isFuture ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.15s ease',
                                    margin: '0 auto'
                                }}
                                onMouseEnter={e => { if (!isFuture && !isSelected) e.currentTarget.style.background = 'rgba(212,175,55,0.15)'; }}
                                onMouseLeave={e => { if (!isFuture && !isSelected) e.currentTarget.style.background = 'transparent'; }}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
                {/* Today shortcut */}
                <button
                    onClick={() => { onSelect(todayStr); onClose(); }}
                    style={{
                        marginTop: '10px', width: '100%', padding: '6px',
                        background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)',
                        borderRadius: '6px', color: 'var(--primary-gold)', fontWeight: 'bold',
                        fontSize: '0.8rem', cursor: 'pointer'
                    }}
                >오늘로 이동</button>
            </div>
        </div>
    );
};

const calNavBtn = {
    background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%',
    width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--text-primary)'
};

// ─── Main Component ───
const LogsTab = ({ todayClasses, logs, currentLogPage, setCurrentLogPage, members = [], onMemberClick }) => {
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [selectedClassKey, setSelectedClassKey] = useState(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [historicalLogs, setHistoricalLogs] = useState([]);
    const [loadingHistorical, setLoadingHistorical] = useState(false);

    const isToday = selectedDate === todayStr;

    // 과거 날짜 선택 시 Firestore에서 데이터 가져오기
    const fetchHistoricalData = useCallback(async (dateStr) => {
        if (dateStr === todayStr) return;
        setLoadingHistorical(true);
        try {
            const data = await storageService.getAttendanceByDate(dateStr);
            setHistoricalLogs(data);
        } catch (e) {
            console.error('[LogsTab] Failed to fetch historical data:', e);
            setHistoricalLogs([]);
        } finally {
            setLoadingHistorical(false);
        }
    }, [todayStr]);

    useEffect(() => {
        if (!isToday) {
            fetchHistoricalData(selectedDate);
        }
        setSelectedClassKey(null);
        setCurrentLogPage(1);
    }, [selectedDate, isToday, fetchHistoricalData, setCurrentLogPage]);

    // 현재 표시할 로그 결정
    const activeLogs = (() => {
        if (isToday) {
            return logs.filter(l => {
                // [FIX] Use stored 'date' field first for robustness (avoids client locale/timezone issues)
                if (l.date) return l.date === todayStr;
                
                // Fallback: Parse timestamp if date field is missing (legacy)
                if (!l.timestamp) return false;
                const logDate = new Date(l.timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                return logDate === todayStr;
            });
        }
        return historicalLogs;
    })();

    // 수업별 요약 카드 생성 (오늘은 todayClasses prop, 과거는 활성 로그에서 집계)
    const classCards = (() => {
        if (isToday) return todayClasses;
        const groups = {};

        activeLogs.forEach(log => {
            const info = guessClassInfo(log);
            const classTime = info?.startTime || '00:00';
            const canonicalClassName = info?.className || log.className || '일반';
            const canonicalInstructor = info?.instructor || log.instructor || '선생님';

            const key = `${canonicalClassName}-${canonicalInstructor}-${log.branchId}-${classTime}`;
            
            if (!groups[key]) {
                groups[key] = {
                    className: canonicalClassName,
                    instructor: canonicalInstructor,
                    branchId: log.branchId,
                    classTime: classTime,
                    count: 0,
                    deniedCount: 0,
                    memberNames: [] 
                };
            }
            if (log.status === 'denied') groups[key].deniedCount++;
            else {
                groups[key].count++;
                // If it's a historical log, we might not have easy access to multiAttendedMemberIds here,
                // but we can at least show those tagged as multi-session in the log itself.
                if (log.memberName && (log.sessionCount > 1 || log.isMultiSession)) {
                    if (!groups[key].memberNames.includes(log.memberName)) {
                        groups[key].memberNames.push(log.memberName);
                    }
                }
            }
        });
        
        // [UX] Sort by classTime Descending (Latest First)
        return Object.values(groups).sort((a, b) => {
            if (!a.classTime) return 1;
            if (!b.classTime) return -1;
            return b.classTime.localeCompare(a.classTime);
        });
    })();

    const handleClassClick = (cls) => {
        const key = `${cls.className}-${cls.instructor}-${cls.branchId}-${cls.classTime || 'no-time'}`;
        // [UX] Toggle selection: if already selected, deselect (show all)
        setSelectedClassKey(prev => prev === key ? null : key);
        setCurrentLogPage(1);
    };

    const handleDateChange = (dateStr) => {
        setSelectedDate(dateStr);
    };

    const handlePrevDay = () => {
        const d = new Date(selectedDate + 'T00:00:00+09:00');
        d.setDate(d.getDate() - 1);
        setSelectedDate(d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }));
    };

    const handleNextDay = () => {
        const d = new Date(selectedDate + 'T00:00:00+09:00');
        d.setDate(d.getDate() + 1);
        const nextStr = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        if (nextStr <= todayStr) setSelectedDate(nextStr);
    };

    // 날짜 포맷: "2월 16일 (일)"
    const formatDisplayDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00+09:00');
        const m = d.getMonth() + 1;
        const day = d.getDate();
        const dayName = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
        return `${m}월 ${day}일 (${dayName})`;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* ─── Date Navigation ─── */}
            <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px',
                padding: '12px 0', position: 'relative'
            }}>
                <button onClick={handlePrevDay} style={dateNavBtn}><CaretLeft size={18} weight="bold" /></button>
                <button
                    onClick={() => setShowCalendar(v => !v)}
                    style={{
                        background: isToday ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.05)',
                        border: isToday ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        padding: '8px 20px',
                        color: isToday ? 'var(--primary-gold)' : 'var(--text-primary)',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <CalendarBlank size={18} />
                    {formatDisplayDate(selectedDate)}
                    {isToday && <span style={{ fontSize: '0.7rem', background: 'var(--primary-gold)', color: 'black', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>오늘</span>}
                </button>
                <button
                    onClick={handleNextDay}
                    disabled={selectedDate >= todayStr}
                    style={{ ...dateNavBtn, opacity: selectedDate >= todayStr ? 0.3 : 1, cursor: selectedDate >= todayStr ? 'not-allowed' : 'pointer' }}
                ><CaretRight size={18} weight="bold" /></button>

                {!isToday && (
                    <button
                        onClick={() => setSelectedDate(todayStr)}
                        style={{
                            background: 'var(--primary-gold)', color: 'black', border: 'none',
                            padding: '6px 14px', borderRadius: '8px', fontWeight: 'bold',
                            fontSize: '0.8rem', cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(212,175,55,0.3)'
                        }}
                    >오늘</button>
                )}

                {showCalendar && (
                    <MiniCalendar
                        selectedDate={selectedDate}
                        onSelect={handleDateChange}
                        onClose={() => setShowCalendar(false)}
                    />
                )}
            </div>

            {/* ─── Loading State ─── */}
            {loadingHistorical && (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                    <div style={{
                        width: '32px', height: '32px', border: '3px solid rgba(212,175,55,0.2)',
                        borderTop: '3px solid var(--primary-gold)', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
                    }} />
                    출석 데이터를 불러오는 중...
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/* ─── Class Summary Cards ─── */}
            {!loadingHistorical && classCards.length > 0 && (
                <div className="dashboard-card" style={{ border: '1px solid rgba(212,175,55,0.2)' }}>
                    <h3 className="card-label" style={{ marginBottom: '15px', color: 'var(--primary-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ClockCounterClockwise size={18} /> {isToday ? '오늘' : formatDisplayDate(selectedDate)} 수업별 출석 요약
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        {classCards.map((cls, idx) => {
                            const key = `${cls.className}-${cls.instructor}-${cls.branchId}-${cls.classTime || 'no-time'}`;
                            const isSelected = selectedClassKey === key;
                            return (
                                <div
                                    key={key}
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
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {cls.classTime && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--primary-gold)', fontWeight: 'bold' }}>
                                                    {cls.classTime}
                                                </div>
                                            )}
                                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: isSelected ? 'var(--primary-gold)' : 'inherit' }}>{cls.className}</div>
                                        </div>
                                        <span style={{
                                            fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px',
                                            background: `${getBranchColor(cls.branchId)}20`,
                                            color: getBranchThemeColor(cls.branchId),
                                            fontWeight: 'bold', border: `1px solid ${getBranchColor(cls.branchId)}33`
                                        }}>
                                            {getBranchName(cls.branchId)}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '8px' }}>{cls.instructor} 선생님</div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                                        <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary-gold)', lineHeight: 1 }}>{cls.count}</span>
                                        <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>명 참여</span>
                                        {cls.deniedCount > 0 && (
                                            <span style={{
                                                fontSize: '0.7rem', color: '#ff4d4f', background: 'rgba(255, 77, 79, 0.1)',
                                                padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255, 77, 79, 0.2)',
                                                fontWeight: 'bold', marginLeft: '6px'
                                            }}>
                                                ⛔ 거부 {cls.deniedCount}명
                                            </span>
                                        )}
                                    </div>
                                    {/* [NEW] Show multi-attendance member names */}
                                    {cls.memberNames?.length > 0 && (
                                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {cls.memberNames.map(name => (
                                                <span key={name} style={{
                                                    fontSize: '0.7rem', background: 'var(--primary-gold)', color: 'black',
                                                    padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold'
                                                }}>
                                                    {name}
                                                </span>
                                            ))}
                                            <span style={{ fontSize: '0.65rem', color: 'var(--primary-gold)', alignSelf: 'center', marginLeft: '2px' }}>
                                                (열정 🔥)
                                            </span>
                                        </div>
                                    )}
                                    {/* [UX] Removed "Filtering..." text as requested */}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ─── Empty State ─── */}
            {!loadingHistorical && classCards.length === 0 && activeLogs.length === 0 && (
                <div className="dashboard-card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                    <CalendarBlank size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '6px' }}>
                        {formatDisplayDate(selectedDate)}에 출석 기록이 없습니다.
                    </div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>
                        다른 날짜를 선택해보세요.
                    </div>
                </div>
            )}

            {/* ─── Activity Log List ─── */}
            {!loadingHistorical && (
                <div className="dashboard-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 className="card-label" style={{ margin: 0 }}>
                                {isToday ? '오늘 활동 로그' : `${formatDisplayDate(selectedDate)} 활동 로그`}
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                                {activeLogs.length}건
                            </span>
                            {selectedClassKey && (
                                <button
                                    onClick={() => setSelectedClassKey(null)}
                                    style={{
                                        background: 'var(--primary-gold)', color: 'black', border: 'none',
                                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem',
                                        fontWeight: 'bold', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                >
                                    <ClockCounterClockwise size={14} /> 필터 해제
                                </button>
                            )}
                        </div>

                    </div>
                    <div style={{ marginTop: '10px' }}>
                        {(() => {
                            const filteredLogs = (selectedClassKey
                                ? activeLogs.filter(l => {
                                    const ct = guessClassTime(l);
                                    return `${l.className || '일반'}-${l.instructor || '선생님'}-${l.branchId}-${ct || 'no-time'}` === selectedClassKey;
                                })
                                : activeLogs
                            ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                            const itemsPerPage = 15;
                            const startIndex = (currentLogPage - 1) * itemsPerPage;
                            const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);
                            const totalLogPages = Math.ceil(filteredLogs.length / itemsPerPage);

                            if (filteredLogs.length === 0) {
                                return <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>표시할 로그가 없습니다.</div>;
                            }

                            return (
                                <>
                                    {paginatedLogs.map((log, index) => (
                                        <div
                                            key={log.id || index}
                                            onClick={() => {
                                                if (log.memberId && onMemberClick) {
                                                    const member = members.find(m => m.id === log.memberId);
                                                    if (member) onMemberClick(member);
                                                }
                                            }}
                                            className="log-item"
                                            style={{
                                                display: 'flex', alignItems: 'center', padding: '12px',
                                                marginBottom: '6px', background: 'rgba(255,255,255,0.02)',
                                                borderRadius: '8px',
                                                cursor: log.memberId ? 'pointer' : 'default',
                                                transition: 'all 0.2s ease',
                                                borderLeft: `3px solid ${
                                                    log.status === 'denied' ? '#ff4d4f' :
                                                    log.type === 'checkin' ? 'var(--accent-success)' :
                                                    log.type === 'register' ? 'var(--primary-gold)' :
                                                    log.type === 'extend' ? '#3B82F6' :
                                                    'var(--text-secondary)'
                                                }`
                                            }}
                                            onMouseEnter={(e) => { if (log.memberId) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                            onMouseLeave={(e) => { if (log.memberId) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                                        >
                                            <div style={{ width: '60px', fontSize: '0.75rem', opacity: 0.6, textAlign: 'center' }}>
                                                {new Date(log.timestamp).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </div>
                                            <div style={{ flex: 1, paddingLeft: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 'bold' }}>{log.memberName || log.name || '알 수 없음'}</span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--primary-gold)', background: 'rgba(212,175,55,0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                                                        {log.className || '일반'}
                                                    </span>
                                                    <span className="badge" style={{
                                                        fontSize: '0.65rem', padding: '2px 6px',
                                                        background: `${getBranchColor(log.branchId)}20`,
                                                        color: getBranchThemeColor(log.branchId),
                                                        border: `1px solid ${getBranchColor(log.branchId)}33`,
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {getBranchName(log.branchId)}
                                                    </span>
                                                    {log.status === 'denied' && (
                                                        <span style={{
                                                            fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px',
                                                            background: 'rgba(255, 77, 79, 0.15)', color: '#ff4d4f',
                                                            border: '1px solid rgba(255, 77, 79, 0.3)', fontWeight: 'bold',
                                                            display: 'flex', alignItems: 'center', gap: '3px'
                                                        }}>
                                                            ⛔ 출석거부 ({log.denialReason === 'expired' ? '기간만료' : '횟수소진'})
                                                        </span>
                                                    )}
                                                    {(log.sessionCount > 1 || log.isMultiSession) && (
                                                        <span style={{
                                                            fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px',
                                                            background: 'var(--primary-gold)', color: 'black', fontWeight: 'bold',
                                                            display: 'flex', alignItems: 'center', gap: '3px'
                                                        }}>
                                                            <Sparkle size={10} weight="fill" />
                                                            {log.sessionCount || '2'}회차 Passion
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '2px', color: log.status === 'denied' ? '#ff4d4f' : 'inherit' }}>
                                                    {log.status === 'denied'
                                                        ? `출석 시도가 거부되었습니다 (${log.denialReason === 'expired' ? '기간만료' : '횟수소진'})`
                                                        : (log.action?.includes('출석') ? `${log.className || '일반'} 수업 참여 (${log.instructor || '관리자'} 선생님)` : log.action)
                                                    }
                                                </div>
                                            </div>
                                            {log.type === 'checkin' && isToday && (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (confirm('이 출석 기록을 삭제하시겠습니까?')) {
                                                            await storageService.deleteAttendance(log.id);
                                                        }
                                                    }}
                                                    style={{
                                                        background: 'none', border: 'none',
                                                        color: 'rgba(244, 63, 94, 0.5)', cursor: 'pointer', padding: '8px'
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
            )}
        </div>
    );
};

// ─── Styles ───
const dateNavBtn = {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '50%',
    width: '36px', height: '36px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    transition: 'all 0.2s ease'
};

export default LogsTab;
