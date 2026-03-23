import { useState, useEffect, useMemo } from 'react';
import { CalendarCheck, UserCircle, Clock, ArrowsClockwise, Users } from '@phosphor-icons/react';
import { useStudioConfig } from '../../../contexts/StudioContext';
import * as bookingService from '../../../services/bookingService';
import { getTodayKST } from '../../../utils/dates';
import { storageService } from '../../../services/storage';

/**
 * 📋 관리자 예약 현황 탭
 * - 오늘/날짜별 예약 현황
 * - 수업별 예약자 목록 + 정원 바
 * - 예약/대기/노쇼/출석 상태 표시
 */
const BookingsTab = ({ currentBranch }) => {
    const { config } = useStudioConfig();
    const [selectedDate, setSelectedDate] = useState(getTodayKST());
    const [dayBookings, setDayBookings] = useState([]);
    const [dailyClasses, setDailyClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    const branchId = currentBranch === 'all' ? (config.BRANCHES?.[0]?.id || '') : currentBranch;
    const rules = config?.POLICIES?.BOOKING_RULES || {};

    // 날짜의 수업 로드 (수업 목록은 변경 빈도 낮으므로 일회성)
    useEffect(() => {
        const loadClasses = async () => {
            setLoading(true);
            try {
                const [year, month] = selectedDate.split('-').map(Number);
                const monthData = await storageService.getMonthlyClasses(branchId, year, month);
                const classes = monthData?.[selectedDate] || [];
                setDailyClasses(classes);
            } catch (e) {
                console.error('[BookingsTab] Class load error:', e);
            }
            setLoading(false);
        };
        loadClasses();
    }, [selectedDate, branchId]);

    // [실시간] 선택된 날짜의 예약 구독
    useEffect(() => {
        const unsub = bookingService.subscribeDayBookings(selectedDate, branchId, (bookings) => {
            setDayBookings(bookings);
        });
        return () => unsub();
    }, [selectedDate, branchId]);

    // 관리자 예약 취소
    const handleCancelBooking = async (booking) => {
        if (!window.confirm(`${booking.memberName}님의 예약을 취소하시겠습니까?`)) return;
        try {
            await bookingService.cancelBooking(booking.date, booking.classIndex, booking.memberId, branchId, config);
            alert('예약이 취소되었습니다.');
            // 실시간 구독이므로 별도 새로고침 불필요
        } catch (e) {
            alert('취소 실패: ' + e.message);
        }
    };

    const [monthlyBookingCounts, setMonthlyBookingCounts] = useState({}); // { '2026-03-16': 3, ... }

    // 수업별 예약 그룹핑
    const classBookingGroups = useMemo(() => {
        return dailyClasses.map((cls, idx) => {
            const capacity = bookingService.getClassCapacity(cls, branchId, config);
            const classBookings = dayBookings.filter(b => b.classIndex === idx);
            const booked = classBookings.filter(b => b.status === 'booked');
            const waitlisted = classBookings.filter(b => b.status === 'waitlisted');
            const attended = classBookings.filter(b => b.status === 'attended');
            const noshow = classBookings.filter(b => b.status === 'noshow');
            const cancelled = classBookings.filter(b => b.status === 'cancelled');

            return {
                cls, idx, capacity,
                booked, waitlisted, attended, noshow, cancelled,
                totalActive: booked.length + attended.length,
                allBookings: classBookings.filter(b => b.status !== 'cancelled')
            };
        });
    }, [dailyClasses, dayBookings, branchId, config]);

    // 월간 예약 수 로드
    const calYear = parseInt(selectedDate.split('-')[0]);
    const calMonth = parseInt(selectedDate.split('-')[1]);

    // [실시간] 월간 예약 구독
    useEffect(() => {
        const unsub = bookingService.subscribeMonthBookings(branchId, calYear, calMonth, (bookings) => {
            const counts = {};
            bookings.forEach(b => {
                if (b.status !== 'cancelled') {
                    counts[b.date] = (counts[b.date] || 0) + 1;
                }
            });
            setMonthlyBookingCounts(counts);
        });
        return () => unsub();
    }, [calYear, calMonth, branchId]);

    // 날짜 이동
    const moveDate = (days) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        // [FIX] toISOString().split('T')[0]은 UTC 기준. KST 자정~09시에 전날 반환됨
        setSelectedDate(d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }));
    };

    const moveMonth = (dir) => {
        const d = new Date(calYear, calMonth - 1 + dir, 1);
        setSelectedDate(d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }));
    };

    const isToday = selectedDate === getTodayKST();

    // 통계
    const totalBooked = dayBookings.filter(b => b.status === 'booked').length;
    const totalAttended = dayBookings.filter(b => b.status === 'attended').length;
    const totalNoshow = dayBookings.filter(b => b.status === 'noshow').length;
    const totalWaitlisted = dayBookings.filter(b => b.status === 'waitlisted').length;

    // 달력 렌더링
    const renderMiniCalendar = () => {
        const daysInMonth = new Date(calYear, calMonth, 0).getDate();
        const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const cells = [];

        for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const isTodayCell = dateStr === getTodayKST();
            const count = monthlyBookingCounts[dateStr] || 0;
            const isSunday = new Date(calYear, calMonth - 1, d).getDay() === 0;

            cells.push(
                <div key={d} onClick={() => setSelectedDate(dateStr)} style={{
                    padding: '4px 2px', textAlign: 'center', cursor: 'pointer', borderRadius: '6px',
                    background: isSelected ? 'var(--primary-gold)' : isTodayCell ? 'rgba(var(--primary-rgb), 0.15)' : 'transparent',
                    color: isSelected ? 'black' : isSunday ? '#ff4757' : 'white',
                    fontWeight: isSelected || count > 0 ? 'bold' : 'normal',
                    fontSize: '0.8rem', transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '38px', justifyContent: 'center'
                }}>
                    <span>{d}</span>
                    {count > 0 && (
                        <span style={{
                            fontSize: '0.55rem', fontWeight: 'bold',
                            color: isSelected ? 'black' : '#3B82F6',
                            marginTop: '1px'
                        }}>📋{count}</span>
                    )}
                </div>
            );
        }

        return (
            <div className="dashboard-card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <button onClick={() => moveMonth(-1)} style={dateBtnStyle}>◀</button>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'white' }}>{calYear}년 {calMonth}월</span>
                    <button onClick={() => moveMonth(1)} style={dateBtnStyle}>▶</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
                    {dayNames.map(d => (
                        <div key={d} style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', padding: '4px 0', fontWeight: 'bold' }}>{d}</div>
                    ))}
                    {cells}
                </div>
                {!isToday && (
                    <div style={{ textAlign: 'center', marginTop: '6px' }}>
                        <button onClick={() => setSelectedDate(getTodayKST())} style={{ background: 'none', border: 'none', color: 'var(--primary-gold)', fontSize: '0.7rem', cursor: 'pointer' }}>
                            오늘로 돌아가기
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 달력 */}
            {renderMiniCalendar()}

            {/* 선택된 날짜 헤더 */}
            <div className="dashboard-card" style={{ padding: '12px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => moveDate(-1)} style={dateBtnStyle}>◀</button>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                    </div>
                    <button onClick={() => moveDate(1)} style={dateBtnStyle}>▶</button>
                </div>
            </div>

            {/* 요약 통계 카드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <StatCard label="예약" value={totalBooked} color="var(--primary-gold)" />
                <StatCard label="출석" value={totalAttended} color="#2ed573" />
                <StatCard label="노쇼" value={totalNoshow} color="#ff4757" />
                <StatCard label="대기" value={totalWaitlisted} color="#f39c12" />
            </div>

            {/* 수업별 예약 현황 */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>로딩 중...</div>
            ) : dailyClasses.length === 0 ? (
                <div className="dashboard-card" style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                    이 날짜에 등록된 수업이 없습니다
                </div>
            ) : (
                classBookingGroups.map((group) => (
                    <ClassBookingCard key={group.idx} group={group} rules={rules} onCancel={handleCancelBooking} />
                ))
            )}
        </div>
    );
};

// ─── 통계 카드 ───
const StatCard = ({ label, value, color }) => (
    <div className="dashboard-card" style={{ padding: '14px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 900, color }}>{value}</div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{label}</div>
    </div>
);

// ─── 수업별 예약 카드 ───
const ClassBookingCard = ({ group, rules, onCancel }) => {
    const [expanded, setExpanded] = useState(false);
    const { cls, capacity, booked, waitlisted, attended, noshow, totalActive, allBookings } = group;
    const isCancelled = cls.status === 'cancelled';
    const fillRate = capacity > 0 ? Math.min((totalActive / capacity) * 100, 100) : 0;

    return (
        <div className="dashboard-card" style={{
            padding: '16px 20px',
            opacity: isCancelled ? 0.4 : 1,
            cursor: 'pointer'
        }} onClick={() => !isCancelled && setExpanded(!expanded)}>
            {/* 수업 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: expanded ? '12px' : 0 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--primary-gold)', fontWeight: 'bold' }}>{cls.time}</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>
                            {isCancelled ? <s>{cls.title}</s> : cls.title}
                        </span>
                    </div>
                    {cls.instructor && (
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>👤 {cls.instructor}</div>
                    )}
                </div>
                
                {/* 정원 + 우측 */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: fillRate >= 100 ? '#ff4757' : 'var(--primary-gold)' }}>
                        {totalActive}/{capacity}명
                    </div>
                    {/* 미니 정원바 */}
                    <div style={{ width: '60px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', marginTop: '4px' }}>
                        <div style={{
                            height: '100%', borderRadius: '2px',
                            width: `${fillRate}%`,
                            background: fillRate >= 100 ? '#ff4757' : 'var(--primary-gold)',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                    {waitlisted.length > 0 && (
                        <div style={{ fontSize: '0.65rem', color: '#f39c12', marginTop: '2px' }}>대기 {waitlisted.length}명</div>
                    )}
                </div>
            </div>

            {/* 펼침: 예약자 명단 */}
            {expanded && !isCancelled && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                    {allBookings.length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '10px' }}>
                            예약자 없음
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {/* 상태별 그룹 표시 */}
                            {attended.length > 0 && (
                                <BookingGroup label="✅ 출석" members={attended} color="#2ed573" />
                            )}
                            {booked.length > 0 && (
                                <BookingGroup label="📋 예약" members={booked} color="var(--primary-gold)" onCancel={onCancel} />
                            )}
                            {waitlisted.length > 0 && (
                                <BookingGroup label="⏳ 대기" members={waitlisted} color="#f39c12" onCancel={onCancel} />
                            )}
                            {noshow.length > 0 && (
                                <BookingGroup label="❌ 노쇼" members={noshow} color="#ff4757" />
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── 예약 상태 그룹 ───
const BookingGroup = ({ label, members, color, onCancel }) => (
    <div>
        <div style={{ fontSize: '0.7rem', color, fontWeight: 'bold', marginBottom: '4px' }}>{label} ({members.length})</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {members.map(m => (
                <div key={m.id} style={{
                    padding: '4px 10px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}20`,
                    fontSize: '0.78rem', color: 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                    <UserCircle size={14} weight="fill" color={color} />
                    {m.memberName}
                    {m.waitlistPosition && (
                        <span style={{ fontSize: '0.6rem', color: '#f39c12' }}>#{m.waitlistPosition}</span>
                    )}
                    {onCancel && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onCancel(m); }}
                            style={{
                                background: 'rgba(255,71,87,0.15)', border: '1px solid rgba(255,71,87,0.3)',
                                borderRadius: '4px', padding: '1px 5px', cursor: 'pointer',
                                fontSize: '0.6rem', color: '#ff4757', marginLeft: '4px'
                            }}
                        >취소</button>
                    )}
                </div>
            ))}
        </div>
    </div>
);

const dateBtnStyle = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', color: 'white',
    fontSize: '0.9rem', fontWeight: 'bold'
};

export default BookingsTab;
