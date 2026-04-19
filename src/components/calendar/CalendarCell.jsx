import { memo } from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import { getHolidayName } from '../../utils/holidays';
import { getTagColor } from '../../utils/colors';
import { getTranslatedClass } from '../../utils/classMapping';

export const CalendarCell = memo(({
    date,
    monthlyClasses,
    attendanceLogs,
    branchId,
    todayKST,
    t,
    language,
    allowBooking,
    myBookings,
    config,
    onClassClick
  }) => {
    if (!date) {
      return <div style={{ minHeight: '85px' }} />;
    }
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const classes = monthlyClasses[dateStr] || [];
    const isToday = dateStr === todayKST;
  
    // Check if a class is bookable (considers date + time + deadline)
    const rules = config?.POLICIES?.BOOKING_RULES || {};
    const deadlineHours = rules.deadlineHours || 1;
    const isClassBookable = cls => {
      if (dateStr > todayKST) return true; // 미래 날짜 → 가능
      if (dateStr < todayKST) return false; // 과거 날짜 → 불가
      // 오늘: 수업 시작 시간 - 마감시간까지만 예약 가능
      if (!cls?.time) return false;
      const [h, m] = cls.time.split(':').map(Number);
      const now = new Date();
      const nowKST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
      const classMinutes = h * 60 + (m || 0);
      const currentMinutes = nowKST.getHours() * 60 + nowKST.getMinutes();
      return currentMinutes < classMinutes - deadlineHours * 60;
    };
    
    const dailyLogs = attendanceLogs.filter(log => {
      if (!log.timestamp) return false;
      const d = new Date(log.timestamp);
      if (isNaN(d.getTime())) return false;
      const logKST = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
      return logKST === dateStr && log.branchId === branchId;
    });
    
    const consumedLogIds = new Set();
    const matchedClasses = classes.map(cls => {
      if (cls.status === 'cancelled') return { ...cls, matchCount: 0 };
      const [clsH, clsM] = cls.time.split(':').map(Number);
      const clsTotalMins = clsH * 60 + clsM;
      const matches = dailyLogs.filter(log => {
        if (consumedLogIds.has(log.id)) return false;
        const nameMatch = log.className && (cls.title.includes(log.className) || log.className.includes(cls.title));
        if (!nameMatch) return false;
        const logDate = new Date(log.timestamp);
        const logTotalMins = logDate.getHours() * 60 + logDate.getMinutes();
        const diff = Math.abs(clsTotalMins - logTotalMins);
        return diff <= 120;
      });
      matches.forEach(m => consumedLogIds.add(m.id));
      return { ...cls, matchCount: matches.length };
    });
    
    const unmatchedLogs = dailyLogs.filter(log => !consumedLogIds.has(log.id));
    const holidayName = getHolidayName(dateStr);
    const isAttended = dailyLogs.length > 0;
    const isAllCancelled = classes.length > 0 && classes.every(cls => cls.status === 'cancelled');
    
    return (
        <div style={{
            minHeight: '85px',
            backgroundColor: isToday ? 'rgba(var(--primary-rgb), 0.15)' : holidayName ? 'rgba(255,71,87,0.08)' : 'rgba(255,255,255,0.02)',
            border: isAttended ? '2px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            padding: '8px',
            position: 'relative',
            opacity: isAllCancelled ? 0.4 : 1,
            transition: 'transform 0.2s ease'
        }}>
            <div style={{
                fontSize: '0.85rem',
                fontWeight: '800',
                marginBottom: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                color: holidayName ? '#ff4757' : date.getDay() === 0 ? '#ff4757' : date.getDay() === 6 ? '#54a0ff' : 'white'
            }}>
                {date.getDate()}
                {isAttended && <CheckCircle size={16} weight="fill" color="var(--primary-gold)" />}
            </div>
            {holidayName && <div style={{ fontSize: '0.65rem', color: '#ff6b81', marginBottom: '4px', fontWeight: 'bold' }}>
                🎉 {t(holidayName)}
            </div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {matchedClasses.map((cls, idx) => {
                    const colors = getTagColor(cls.title, dateStr, cls.instructor);
                    const isMatched = cls.matchCount > 0;
                    // 예약 상태 확인
                    const myBooking = allowBooking && myBookings.find(b => b.date === dateStr && b.classIndex === idx && (b.status === 'booked' || b.status === 'waitlisted'));
                    return (
                        <div key={idx} style={{
                            fontSize: '0.8rem',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            backgroundColor: cls.status === 'cancelled' ? 'rgba(255, 71, 87, 0.15)' : cls.status === 'changed' ? 'rgba(255, 165, 2, 0.15)' : colors.bg,
                            color: cls.status === 'cancelled' ? '#ff6b81' : cls.status === 'changed' ? '#ffa502' : colors.text,
                            border: myBooking ? '2px solid var(--primary-gold)' : isMatched ? '2px solid #3498db' : cls.status === 'cancelled' ? 'none' : `1px solid ${colors.border}`,
                            textDecoration: cls.status === 'cancelled' ? 'line-through' : 'none',
                            fontWeight: isMatched ? 'bold' : 'normal',
                            boxShadow: myBooking ? '0 0 8px rgba(var(--primary-rgb), 0.4)' : isMatched ? '0 0 8px rgba(52, 152, 219, 0.5)' : 'none',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            marginBottom: '2px',
                            cursor: allowBooking && isClassBookable(cls) && cls.status !== 'cancelled' ? 'pointer' : 'default'
                        }} onClick={() => {
                            if (allowBooking && isClassBookable(cls) && cls.status !== 'cancelled') {
                                onClassClick(dateStr, idx, cls, myBooking);
                            }
                        }}>
                            {myBooking && <div style={{ position: 'absolute', right: '3px', top: '3px', fontSize: '0.6rem', fontWeight: 900, color: myBooking.status === 'waitlisted' ? '#f39c12' : 'var(--primary-gold)', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', padding: '1px 3px' }}>
                                {myBooking.status === 'waitlisted' ? t("g_df72a8") || "Waitlist" : t("g_17f4b4") || "Booking"}
                            </div>}
                            {isMatched && !myBooking && <div style={{ position: 'absolute', right: '4px', top: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                {cls.matchCount > 1 && <span style={{ fontSize: '0.7rem', color: '#3498db', fontWeight: '900' }}>x{cls.matchCount}</span>}
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3498db' }} />
                            </div>}
                            <span style={{ fontWeight: '600', lineHeight: '1.2' }}>{cls.time} {getTranslatedClass(cls.title, t)}</span>
                            {(cls.instructor || cls.level) && <span style={{ fontSize: '0.85em', opacity: 0.9, lineHeight: '1.2', display: 'block' }}>
                                {cls.level ? `Lv.${cls.level} ` : ''}{cls.instructor}
                            </span>}
                        </div>
                    );
                })}
  
                {unmatchedLogs.map((log, idx) => (
                    <div key={`auto-${idx}`} style={{ fontSize: '0.75rem', padding: '3px 6px', borderRadius: '6px', backgroundColor: 'rgba(52, 152, 219, 0.1)', color: '#3498db', border: '2px solid #3498db', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.6rem' }}>●</span>
                        {new Date(log.timestamp).toLocaleTimeString(language === 'ko' ? 'ko-KR' : language, { hour: '2-digit', minute: '2-digit', hour12: false })}
                        {' '}{log.className === (t("g_dd529d") || "Self Practice") || log.className === (t("g_380d11") || "Open Practice") ? t('auto_practice') : getTranslatedClass(log.className, t)}
                    </div>
                ))}
            </div>
        </div>
    );
});
CalendarCell.displayName = 'CalendarCell';
