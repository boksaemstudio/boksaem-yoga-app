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
      alert(`예약 실패: ${e.message || t("g_5e9f6b") || "알 수 없는 오류"}`);
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
      alert(t("g_c99a30") || "취소 처리 중 오류가 발생했습니다");
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
                    {[t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')].map(d => <div key={d} style={{
          textAlign: 'center',
          fontWeight: 'bold',
          padding: '8px',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.8rem'
        }}>{d}</div>)}
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

// ─── 예약 확인 모달 ───
const BookingModal = ({
  info,
  config,
  branchId,
  bookingLoading,
  onBook,
  onCancel,
  onClose,
  t
}) => {
  const {
    classInfo,
    dateStr,
    booking
  } = info;
  const capacity = bookingService.getClassCapacity(classInfo, branchId, config);
  const [classBookings, setClassBookings] = useState([]);
  useEffect(() => {
    bookingService.getClassBookings(dateStr, info.classIndex, branchId).then(setClassBookings);
  }, [dateStr, info.classIndex, branchId]);
  const confirmedCount = classBookings.filter(b => b.status === 'booked' || b.status === 'attended').length;
  const isFull = confirmedCount >= capacity;
  const isBooked = booking && (booking.status === 'booked' || booking.status === 'waitlisted');
  const isWaitlisted = booking?.status === 'waitlisted';
  const rules = config?.POLICIES?.BOOKING_RULES || {};
  return <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.2s ease-out'
  }} onClick={onClose}>
            <div style={{
      background: 'rgba(30,30,30,0.98)',
      borderRadius: '20px',
      padding: '28px',
      maxWidth: '340px',
      width: '90%',
      border: '1px solid rgba(var(--primary-rgb), 0.3)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
    }} onClick={e => e.stopPropagation()}>
                {/* 수업 정보 */}
                <div style={{
        marginBottom: '20px'
      }}>
                    <div style={{
          fontSize: '0.7rem',
          color: 'var(--primary-gold)',
          fontWeight: 'bold',
          marginBottom: '4px'
        }}>
                        {dateStr} {classInfo?.time || ''}
                    </div>
                    <h3 style={{
          margin: '0 0 6px 0',
          fontSize: '1.2rem',
          color: 'white',
          fontWeight: 800
        }}>
                        {classInfo?.title || classInfo?.name || t("g_550350") || "수업"}
                    </h3>
                    {classInfo?.instructor && <div style={{
          fontSize: '0.85rem',
          color: 'rgba(255,255,255,0.6)'
        }}>
                            👤 {classInfo.instructor}
                        </div>}
                </div>

                {/* 정원 현황 바 */}
                <div style={{
        marginBottom: '18px'
      }}>
                    <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '6px',
          fontSize: '0.75rem'
        }}>
                        <span style={{
            color: 'rgba(255,255,255,0.5)'
          }}>{t("g_f91285") || "정원"}</span>
                        <span style={{
            color: isFull ? '#ff6b6b' : 'var(--primary-gold)',
            fontWeight: 'bold'
          }}>
                            {confirmedCount} / {capacity}{t("g_5a62fd") || "명"}</span>
                    </div>
                    <div style={{
          height: '6px',
          borderRadius: '3px',
          background: 'rgba(255,255,255,0.1)',
          overflow: 'hidden'
        }}>
                        <div style={{
            height: '100%',
            borderRadius: '3px',
            width: `${Math.min(confirmedCount / capacity * 100, 100)}%`,
            background: isFull ? 'linear-gradient(90deg, #ff6b6b, #ee5a24)' : 'linear-gradient(90deg, var(--primary-gold), #f0c040)',
            transition: 'width 0.3s ease'
          }} />
                    </div>
                </div>

                {/* 버튼 */}
                <div style={{
        display: 'flex',
        gap: '10px'
      }}>
                    <button onClick={onClose} style={{
          flex: 1,
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'transparent',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>{t("g_94b7db") || "닫기"}</button>
                    
                    {isBooked ? <button onClick={onCancel} disabled={bookingLoading} style={{
          flex: 2,
          padding: '12px',
          borderRadius: '12px',
          border: 'none',
          background: '#ff6b6b',
          color: 'white',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          cursor: bookingLoading ? 'wait' : 'pointer',
          opacity: bookingLoading ? 0.5 : 1
        }}>{bookingLoading ? t("g_e6e1a2") || "처리 중..." : isWaitlisted ? t("g_afcbc1") || "대기 취소" : t("g_7f40dc") || "예약 취소"}</button> : <button onClick={onBook} disabled={bookingLoading} style={{
          flex: 2,
          padding: '12px',
          borderRadius: '12px',
          border: 'none',
          background: isFull ? rules.enableWaitlist ? 'linear-gradient(135deg, #f39c12, #e67e22)' : 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--primary-gold), #c9a02e)',
          color: isFull && !rules.enableWaitlist ? 'rgba(255,255,255,0.3)' : isFull ? 'white' : 'black',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          cursor: isFull && !rules.enableWaitlist ? 'not-allowed' : bookingLoading ? 'wait' : 'pointer',
          opacity: bookingLoading ? 0.5 : 1
        }}>{bookingLoading ? t("g_e6e1a2") || "처리 중..." : isFull ? rules.enableWaitlist ? t("g_78841d") || "대기 등록" : t("g_27a026") || "정원 마감" : t("g_379fdd") || "예약하기"}</button>}
                </div>
            </div>
        </div>;
};

// Extract CalendarCell as a memoized component
const CalendarCell = memo(({
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
    return <div style={{
      minHeight: '85px'
    }} />;
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
    const nowKST = new Date(now.toLocaleString('en-US', {
      timeZone: 'Asia/Seoul'
    }));
    const classMinutes = h * 60 + (m || 0);
    const currentMinutes = nowKST.getHours() * 60 + nowKST.getMinutes();
    return currentMinutes < classMinutes - deadlineHours * 60;
  };
  const dailyLogs = attendanceLogs.filter(log => {
    if (!log.timestamp) return false;
    const d = new Date(log.timestamp);
    if (isNaN(d.getTime())) return false;
    const logKST = d.toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Seoul'
    });
    return logKST === dateStr && log.branchId === branchId;
  });
  const consumedLogIds = new Set();
  const matchedClasses = classes.map(cls => {
    if (cls.status === 'cancelled') return {
      ...cls,
      matchCount: 0
    };
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
    return {
      ...cls,
      matchCount: matches.length
    };
  });
  const unmatchedLogs = dailyLogs.filter(log => !consumedLogIds.has(log.id));
  const holidayName = getHolidayName(dateStr);
  const isAttended = dailyLogs.length > 0;
  const isAllCancelled = classes.length > 0 && classes.every(cls => cls.status === 'cancelled');
  return <div style={{
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
            {holidayName && <div style={{
      fontSize: '0.65rem',
      color: '#ff6b81',
      marginBottom: '4px',
      fontWeight: 'bold'
    }}>
                    🎉 {t(holidayName)}
                </div>}
            <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }}>
                {matchedClasses.map((cls, idx) => {
        const colors = getTagColor(cls.title, dateStr, cls.instructor);
        const isMatched = cls.matchCount > 0;

        // 예약 상태 확인
        const myBooking = allowBooking && myBookings.find(b => b.date === dateStr && b.classIndex === idx && (b.status === 'booked' || b.status === 'waitlisted'));
        return <div key={idx} style={{
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
                            {/* 예약 상태 아이콘 */}
                            {myBooking && <div style={{
            position: 'absolute',
            right: '3px',
            top: '3px',
            fontSize: '0.6rem',
            fontWeight: 900,
            color: myBooking.status === 'waitlisted' ? '#f39c12' : 'var(--primary-gold)',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '4px',
            padding: '1px 3px'
          }}>
                                    {myBooking.status === 'waitlisted' ? t("g_df72a8") || "대기" : t("g_17f4b4") || "예약"}
                                </div>}
                            {isMatched && !myBooking && <div style={{
            position: 'absolute',
            right: '4px',
            top: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}>
                                    {cls.matchCount > 1 && <span style={{
              fontSize: '0.7rem',
              color: '#3498db',
              fontWeight: '900'
            }}>
                                            x{cls.matchCount}
                                        </span>}
                                    <div style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: '#3498db'
            }} />
                                </div>}
                            <span style={{
            fontWeight: '600',
            lineHeight: '1.2'
          }}>{cls.time} {getTranslatedClass(cls.title, t)}</span>
                            {(cls.instructor || cls.level) && <span style={{
            fontSize: '0.85em',
            opacity: 0.9,
            lineHeight: '1.2',
            display: 'block'
          }}>
                                    {cls.level ? `Lv.${cls.level} ` : ''}{cls.instructor}
                                </span>}
                        </div>;
      })}

                {/* Autonomous Practice (자율수련) or Unmatched Attendance */}
                {unmatchedLogs.map((log, idx) => <div key={`auto-${idx}`} style={{
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
                        <span style={{
          fontSize: '0.6rem'
        }}>●</span>
                        {new Date(log.timestamp).toLocaleTimeString(language === 'ko' ? 'ko-KR' : language, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })}
                        {' '}{log.className === (t("g_dd529d") || "자율수련") || log.className === (t("g_380d11") || "자율수업") ? t('auto_practice') : getTranslatedClass(log.className, t)}
                    </div>)}

                {classes.length === 0 && !isAllCancelled && <span style={{
        fontSize: '0.7rem',
        color: 'rgba(255,255,255,0.2)'
      }}></span>}
            </div>
        </div>;
});
CalendarCell.displayName = 'CalendarCell';

// Extract ColorLegend as a memoized component
const ColorLegend = memo(({
  t,
  allowBooking
}) => <div style={{
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  marginBottom: '15px',
  padding: '10px',
  background: 'rgba(255,255,255,0.02)',
  borderRadius: '10px'
}}>
        <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.7)'
  }}>
            <div style={{
      width: '12px',
      height: '12px',
      borderRadius: '3px',
      background: 'rgba(255, 255, 255, 1)',
      border: '1px solid #dcdcdc'
    }}></div> {t('legend_regular')}
        </div>
        <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.7)'
  }}>
            <div style={{
      width: '12px',
      height: '12px',
      borderRadius: '3px',
      background: 'rgba(196, 252, 239, 0.9)',
      border: '1px solid rgba(129, 236, 236, 1)'
    }}></div> {t('legend_pregnancy')}
        </div>
        <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.7)'
  }}>
            <div style={{
      width: '12px',
      height: '12px',
      borderRadius: '3px',
      background: 'rgba(255, 190, 118, 0.9)',
      border: '1px solid rgba(255, 190, 118, 1)'
    }}></div> {t('legend_intensive')}
        </div>
        <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.7)'
  }}>
            <div style={{
      width: '12px',
      height: '12px',
      borderRadius: '3px',
      background: 'rgba(224, 86, 253, 0.7)',
      border: '1px solid rgba(224, 86, 253, 0.9)'
    }}></div> {t('legend_saturday')}
        </div>
        <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.7)'
  }}>
            <div style={{
      width: '12px',
      height: '12px',
      borderRadius: '3px',
      border: '2px solid #3498db'
    }}></div> {t('legend_my_practice')}
        </div>
        {allowBooking && <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.7)'
  }}>
                <div style={{
      width: '12px',
      height: '12px',
      borderRadius: '3px',
      border: '2px solid var(--primary-gold)',
      background: 'rgba(var(--primary-rgb), 0.15)'
    }}></div>{t("g_1dbb24") || "내 예약"}</div>}
    </div>);
ColorLegend.displayName = 'ColorLegend';

// Extract StatsSection as a memoized component
const StatsSection = memo(({
  stats,
  t
}) => <div style={{
  marginTop: '24px',
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderRadius: '12px',
  padding: '16px'
}}>
        <h4 style={{
    margin: '0 0 12px 0',
    fontSize: '1rem',
    color: 'var(--primary-gold)'
  }}>{t('stats_title')}</h4>
        <div style={{
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  }}>
            {Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([subject, count]) => {
      const colors = getTagColor(subject);
      const translatedSubject = getTranslatedClass(subject, t);
      return <div key={subject} style={{
        padding: '6px 12px',
        borderRadius: '20px',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        fontSize: '0.9rem',
        color: colors.text
      }}>
                        {translatedSubject} <span style={{
          fontWeight: 'bold'
        }}>{count}{t('times')}</span>
                    </div>;
    })}
            {Object.keys(stats).length === 0 && <span style={{
      color: 'rgba(255,255,255,0.5)',
      fontSize: '0.9rem'
    }}>{t('stats_empty')}</span>}
        </div>
    </div>);
StatsSection.displayName = 'StatsSection';
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