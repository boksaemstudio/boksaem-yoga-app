import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { storageService } from '../services/storage';
import { CaretLeft, CaretRight, CheckCircle } from '@phosphor-icons/react';
import { getHolidayName } from '../utils/holidays';
import { getTagColor } from '../utils/colors';
import { useLanguage } from '../hooks/useLanguage';
import { useAttendanceStats } from '../hooks/useAttendanceStats';
import { getTodayKST } from '../utils/dates';
import { getTranslatedClass } from '../utils/classMapping';
import { useStudioConfig } from '../contexts/StudioContext';
import * as bookingService from '../services/bookingService';
const MemberScheduleCalendar = ({
  branchId,
  attendanceLogs = [],
  memberId,
  memberName
}) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [monthlyClasses, setMonthlyClasses] = useState({});
  const [loading, setLoading] = useState(false);
  const {
    t,
    language
  } = useLanguage();
  const {
    config
  } = useStudioConfig();
  const allowBooking = config?.POLICIES?.ALLOW_BOOKING && !!memberId;

  // Booking modal state
  const [bookingModal, setBookingModal] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [myBookings, setMyBookings] = useState([]);

  // Use custom hook for stats calculation (memoized)
  const stats = useAttendanceStats(attendanceLogs);
  const {
    byClass
  } = stats;

  // Load member's bookings
  useEffect(() => {
    if (!memberId || !allowBooking) return;
    const unsub = bookingService.subscribeMemberBookings(memberId, bookings => {
      setMyBookings(bookings);
    });
    return () => unsub();
  }, [memberId, allowBooking]);

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
  const scrollRef = useRef(null);
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
  const handleMouseDown = useCallback(e => {
    setIsDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  }, []);
  const handleMouseLeave = useCallback(() => setIsDown(false), []);
  const handleMouseUp = useCallback(() => setIsDown(false), []);
  const handleMouseMove = useCallback(e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  }, [isDown, startX, scrollLeft]);

  // Handle booking action
  const handleBookClass = async (dateStr, classIndex, classInfo) => {
    setBookingLoading(true);
    try {
      const validation = await bookingService.validateBooking(memberId, dateStr, classIndex, branchId, config);
      if (!validation.ok) {
        alert(validation.reason);
        setBookingLoading(false);
        return;
      }
      const result = await bookingService.createBooking(memberId, memberName, dateStr, classIndex, classInfo, branchId, config);
      if (result.ok) {
        setBookingModal(null);
        // myBookings will update via real-time subscription
      } else {
        alert(result.reason);
      }
    } catch (e) {
      console.error('[Booking] Error:', e);
      alert(`예약 실패: ${e.message || t("g_5e9f6b") || "Unknown error"}`);
    }
    setBookingLoading(false);
  };
  const handleCancelBooking = async (dateStr, classIndex) => {
    setBookingLoading(true);
    try {
      const result = await bookingService.cancelBooking(dateStr, classIndex, memberId, branchId, config);
      if (result.ok) {
        setBookingModal(null);
      } else {
        alert(result.reason);
      }
    } catch (e) {
      console.error('[Booking] Cancel Error:', e);
      alert(t("g_c99a30") || "Error processing cancellation");
    }
    setBookingLoading(false);
  };

  // Memoize calendar dates calculation
  const calendarDates = useMemo(() => {
    const startDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const dates = [];
    for (let i = 0; i < startDay; i++) dates.push(null);
    for (let d = 1; d <= daysInMonth; d++) dates.push(new Date(year, month - 1, d));
    return dates;
  }, [year, month]);
  const renderCalendar = () => {
    const todayKST = getTodayKST();
    return <div ref={scrollRef} onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} style={{
      overflowX: 'auto',
      paddingBottom: '12px',
      cursor: isDown ? 'grabbing' : 'grab',
      userSelect: 'none',
      WebkitOverflowScrolling: 'touch'
    }}>
                <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '4px',
        minWidth: '600px'
      }}>
                    {(() => {
                      const localeMap = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', ru: 'ru-RU', es: 'es-ES', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE', vi: 'vi-VN', th: 'th-TH' };
                      const currentLocale = localeMap[language] || 'en-US';
                      const weekdayFormatter = new Intl.DateTimeFormat(currentLocale, { weekday: 'short' });
                      const dayNames = Array.from({length: 7}, (_, i) => weekdayFormatter.format(new Date(1970, 0, 4 + i)));
                      return dayNames.map(d => <div key={d} style={{
                        textAlign: 'center',
                        fontWeight: 'bold',
                        padding: '8px',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.8rem'
                      }}>{d}</div>);
                    })()}
                    {calendarDates.map((date, i) => <CalendarCell key={date ? date.toISOString() : `empty-${i}`} date={date} monthlyClasses={monthlyClasses} attendanceLogs={attendanceLogs} branchId={branchId} todayKST={todayKST} t={t} language={language} allowBooking={allowBooking} myBookings={myBookings} config={config} onClassClick={(dateStr, classIndex, classInfo, booking) => {
          if (!allowBooking) return;
          setBookingModal({
            dateStr,
            classIndex,
            classInfo,
            booking
          });
        }} />)}
                </div>
            </div>;
  };
  return <div>
            <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    }}>
                <button onClick={handlePrevMonth} style={navBtnStyle}><CaretLeft /></button>
                <h3 style={{
        margin: 0,
        fontSize: '1.2rem',
        color: 'white'
      }}>
                    {(() => {
          try {
            const date = new Date(year, month - 1);
            if (isNaN(date.getTime())) return `${year}.${month}`;
            return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : language === 'en' ? 'en-US' : language === 'ru' ? 'ru-RU' : language === 'zh' ? 'zh-CN' : 'ja-JP', {
              year: 'numeric',
              month: 'long'
            }).format(date);
          } catch {
            return `${year}.${month}`;
          }
        })()}
                </h3>
                <button onClick={handleNextMonth} style={navBtnStyle}><CaretRight /></button>
            </div>

            {loading ? <div style={{
      textAlign: 'center',
      padding: '40px',
      color: 'rgba(255,255,255,0.5)'
    }}>{t('loading')}</div> : <>
                    <ColorLegend t={t} allowBooking={allowBooking} />
                    {renderCalendar()}
                </>}

            {/* My Stats Section */}
            <StatsSection stats={byClass} t={t} />

            {/* 예약 확인 모달 */}
            {bookingModal && <BookingModal info={bookingModal} config={config} branchId={branchId} bookingLoading={bookingLoading} onBook={() => handleBookClass(bookingModal.dateStr, bookingModal.classIndex, bookingModal.classInfo)} onCancel={() => handleCancelBooking(bookingModal.dateStr, bookingModal.classIndex)} onClose={() => setBookingModal(null)} t={t} />}
        </div>;
};

import { CalendarCell } from './calendar/CalendarCell';
import { BookingModal } from './calendar/BookingModal';
import { ColorLegend, StatsSection } from './calendar/CalendarWidgets';

const navBtnStyle = {
  background: 'none',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '50%',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'white'
};
export default MemberScheduleCalendar;