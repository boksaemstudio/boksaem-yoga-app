import { useState, useEffect, useMemo } from 'react';
import { storageService } from '../../services/storage';
import { getMonthlyClasses } from '../../services/scheduleService';
import { isHoliday, getHolidayName } from '../../utils/holidays';
import { useStudioConfig } from '../../contexts/StudioContext';
import * as bookingService from '../../services/bookingService';

const navBtnStyle = {
    background: 'var(--bg-input)', border: 'none', color: 'var(--text-primary)', width: '36px', height: '36px',
    borderRadius: '50%', cursor: 'pointer', fontSize: '1rem'
};

const InstructorSchedule = ({ instructorName }) => {
    const { config } = useStudioConfig();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [monthlyData, setMonthlyData] = useState({});
    const [selectedDate, setSelectedDate] = useState(null);
    const [dateAttendance, setDateAttendance] = useState([]);
    const [expandedClassKey, setExpandedClassKey] = useState(null); // time_title
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [dayBookings, setDayBookings] = useState([]);
    const [monthlyBookingCounts, setMonthlyBookingCounts] = useState({}); // { '2026-03-16': 3, ... }
    const allowBooking = config?.POLICIES?.ALLOW_BOOKING;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    // [STUDIO-AGNOSTIC] Pull from Config
    const branches = config.BRANCHES || [];

    useEffect(() => {
        const loadData = async () => {
            try {
                const promises = branches.map(b => getMonthlyClasses(b.id, year, month));
                const results = await Promise.all(promises);
                
                const merged = {};
                
                results.forEach((data, idx) => {
                    const branch = branches[idx];
                    Object.entries(data).forEach(([date, classes]) => {
                        if (!merged[date]) merged[date] = [];
                        const classesWithBranch = classes.map(cls => ({
                            ...cls,
                            branchId: branch.id,
                            branchName: branch.name,
                            branchColor: branch.color
                        }));
                        merged[date] = [...merged[date], ...classesWithBranch];
                    });
                });
                
                setMonthlyData(merged);
            } catch (error) {
                console.error('[InstructorSchedule] Failed to load data:', error);
            }
        };
        loadData();
    }, [year, month, branches]);

    useEffect(() => {
        if (!selectedDate) return;
        
        setLoadingAttendance(true);
        let isInitialLoad = true;

        // [FIX] 수동 조회가 아닌 실시간 소켓으로 전환하여 관리자 삭제 등 즉시 반영
        const unsubscribe = storageService.subscribeAttendance(selectedDate, null, (records) => {
            console.log(`[DEBUG] Real-time attendance updated for ${selectedDate}:`, records?.length || 0, 'records');
            setDateAttendance(records || []);
            
            if (isInitialLoad) {
                setLoadingAttendance(false);
                isInitialLoad = false;
            }
        });

        // 5초 타임아웃 — 구독 에러 시 무한 로딩 방지
        const timeout = setTimeout(() => {
            if (isInitialLoad) {
                setLoadingAttendance(false);
                isInitialLoad = false;
            }
        }, 5000);

        setExpandedClassKey(null); // Reset expansion on date change
        
        return () => {
            if (unsubscribe) unsubscribe();
            clearTimeout(timeout);
        };
    }, [selectedDate]);

    // [실시간] 예약 데이터 구독
    useEffect(() => {
        if (!selectedDate || !allowBooking || branches.length === 0) { setDayBookings([]); return; }
        const unsubs = branches.map(branch =>
            bookingService.subscribeDayBookings(selectedDate, branch.id, (bookings) => {
                setDayBookings(prev => {
                    // 다른 branch의 기존 예약 유지 + 이 branch의 예약 교체
                    const otherBranch = prev.filter(b => b.branchId !== branch.id);
                    return [...otherBranch, ...bookings];
                });
            })
        );
        return () => unsubs.forEach(u => u());
    }, [selectedDate, allowBooking, branches]);

    // [실시간] 월간 예약 수 요약 구독
    useEffect(() => {
        if (!allowBooking || branches.length === 0) { setMonthlyBookingCounts({}); return; }
        const unsubs = branches.map(branch =>
            bookingService.subscribeMonthBookings(branch.id, year, month, (bookings) => {
                setMonthlyBookingCounts(prev => {
                    // 이 branch의 카운트만 재계산
                    const updated = { ...prev };
                    // 이전에 이 branch에서 추가된 날짜 카운트 초기화
                    Object.keys(updated).forEach(d => {
                        if (updated[d] !== undefined) updated[d] = 0;
                    });
                    bookings.forEach(b => {
                        if (b.status === 'booked' || b.status === 'waitlisted') {
                            updated[b.date] = (updated[b.date] || 0) + 1;
                        }
                    });
                    return updated;
                });
            })
        );
        return () => unsubs.forEach(u => u());
    }, [year, month, allowBooking, branches]);

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    const getBranchStatus = (dateStr) => {
        const classes = monthlyData[dateStr] || [];
        const myClasses = classes.filter(cls => 
            cls.instructor === instructorName && 
            cls.status !== 'cancelled'
        );
        const status = {};
        branches.forEach(b => {
            status[`has_${b.id}`] = myClasses.some(cls => cls.branchId === b.id || cls.branchName === b.name);
        });
        return {
            ...status,
            hasAny: myClasses.length > 0
        };
    };

    const renderCalendar = () => {
        const cells = [];
        for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`empty-${i}`} style={{ padding: '8px' }}></div>);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const branchStatus = getBranchStatus(dateStr);
            const isToday = dateStr === new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            const dayOfWeek = new Date(year, month - 1, d).getDay();
            const isRedDay = dayOfWeek === 0 || isHoliday(dateStr);
            const isBlueDay = dayOfWeek === 6 && !isRedDay;
            const holidayName = getHolidayName(dateStr);
            let borderStyle = 'none';
            let borderColor = undefined;

            // [STUDIO-AGNOSTIC] Improved border logic for multiple branches
            const activeBranches = branches.filter(b => branchStatus[`has_${b.id}`]);
            if (activeBranches.length > 1) {
                borderStyle = '2px solid';
                borderColor = `${activeBranches[0].color} ${activeBranches[1].color} ${activeBranches[1].color} ${activeBranches[0].color}`;
            } else if (activeBranches.length === 1) {
                borderStyle = `2px solid ${activeBranches[0].color}`;
            }
            
            // [DEBUG] Log if border is applied unexpectedly
            if (branchStatus.hasAny && !monthlyData[dateStr]?.length) {
                 console.warn(`[Calendar] Border applied but no classes found for ${dateStr}?`);
            }

            // Text Color Logic
            let textColor = 'var(--text-primary)';
            if (isSelected) {
                textColor = 'black';
            } else if (isRedDay) {
                textColor = '#ff4757';
            } else if (isBlueDay) {
                textColor = '#4a90e2';
            }

            // Holiday Name Mapping
            const holidayMap = {
                'holiday_new_year': '신정',
                'holiday_lunar_new_year': '설날',
                'holiday_samiljeol': '삼일절',
                'holiday_childrens_day': '어린이날',
                'holiday_buddha': '석가탄신일',
                'holiday_memorial': '현충일',
                'holiday_liberation': '광복절',
                'holiday_chuseok': '추석',
                'holiday_foundation': '개천절',
                'holiday_hangul': '한글날',
                'holiday_christmas': '크리스마스',
                'holiday_election': '선거일',
                'holiday_arbor_day': '식목일'
            };

            cells.push(
                <div
                    key={d}
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                        padding: '4px', textAlign: 'center', cursor: 'pointer', borderRadius: '8px',
                        background: isSelected ? 'var(--primary-gold)' : isToday ? 'rgba(var(--primary-rgb), 0.15)' : 'transparent',
                        color: textColor,
                        border: borderStyle,
                        borderColor: borderColor !== 'transparent' ? borderColor : undefined,
                        fontWeight: branchStatus.hasAny ? 'bold' : 'normal',
                        transition: 'all 0.2s',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '52px' // Increased slightly to fit holiday name
                    }}
                >
                    <span style={{ position: 'relative', zIndex: 1, fontSize: '1rem' }}>{d}</span>
                    {holidayName && (
                        <span style={{ 
                            fontSize: '0.6rem', 
                            marginTop: '2px', 
                            color: isSelected ? 'black' : '#ff4757',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            maxWidth: '100%',
                            textOverflow: 'ellipsis'
                        }}>
                            {holidayMap[holidayName] || holidayName}
                        </span>
                    )}
                    {allowBooking && monthlyBookingCounts[dateStr] > 0 && (
                        <span style={{
                            fontSize: '0.6rem',
                            color: isSelected ? 'black' : '#3B82F6',
                            fontWeight: 'bold',
                            marginTop: '1px'
                        }}>
                            📋{monthlyBookingCounts[dateStr]}
                        </span>
                    )}
                </div>
            );
        }
        return cells;
    };

    const selectedClasses = selectedDate ? (monthlyData[selectedDate] || []) : [];
    selectedClasses.sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));

    return (
        <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button onClick={() => setCurrentDate(new Date(year, month - 2, 1))} style={navBtnStyle}>◀</button>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{year}년 {month}월</h2>
                <button onClick={() => setCurrentDate(new Date(year, month, 1))} style={navBtnStyle}>▶</button>
            </div>

            {/* 🗓️ Guide Text */}
            <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', animation: 'fadeIn 1s ease' }}>
                👇 날짜를 터치하면 상세 시간표를 확인할 수 있어요
            </div>

            {/* Branch Legend (다중 지점일 때만 노출) */}
            {branches.length > 1 && (
                <div style={{ 
                    marginBottom: '20px', 
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '10px', textAlign: 'center' }}>
                        📅 지점별 일정 확인
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
                        {branches.map(b => (
                            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ 
                                    width: '24px', 
                                    height: '24px', 
                                    borderRadius: '6px', 
                                    background: 'transparent',
                                    border: `3px solid ${b.color}`,
                                    boxShadow: `0 0 10px ${b.color}33`
                                }} />
                                <span style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold' }}>{b.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0' }}>
                {dayNames.map(day => (
                    <div key={day} style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '4px 0' }}>{day}</div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '20px' }}>
                {renderCalendar()}
            </div>

            {selectedDate && (
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px' }}>
                    <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>{selectedDate} 수업</h3>
                    {selectedClasses.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>수업이 없습니다</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {selectedClasses.map((cls, idx) => {
                                const isCancelled = cls.status === 'cancelled';
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            if (!isCancelled && cls.instructor === instructorName) {
                                                const key = `${cls.time}_${cls.title}`;
                                                setExpandedClassKey(expandedClassKey === key ? null : key);
                                            }
                                        }}
                                        style={{
                                            padding: '12px', borderRadius: '8px',
                                            background: isCancelled ? 'rgba(255, 71, 87, 0.1)' : cls.instructor === instructorName ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-input)',
                                            borderLeft: `4px solid ${isCancelled ? '#ff4757' : (cls.branchColor || 'var(--primary-gold)')}`,
                                            position: 'relative',
                                            opacity: isCancelled ? 0.7 : 1,
                                            cursor: (!isCancelled && cls.instructor === instructorName) ? 'pointer' : 'default',
                                            ...(expandedClassKey === `${cls.time}_${cls.title}` ? {
                                                borderTop: `1px solid ${cls.branchColor}`,
                                                borderRight: `1px solid ${cls.branchColor}`,
                                                borderBottom: `1px solid ${cls.branchColor}`
                                            } : {})
                                        }}
                                    >
                                        <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px' }}>
                                            {isCancelled && (
                                                <div style={{ 
                                                    fontSize: '0.75rem', 
                                                    color: '#ff4757', 
                                                    fontWeight: 'bold', 
                                                    border: '1px solid #ff4757', 
                                                    padding: '2px 6px', 
                                                    borderRadius: '4px',
                                                    background: 'rgba(255, 71, 87, 0.1)' 
                                                }}>
                                                    휴강
                                                </div>
                                            )}
                                            {branches.length > 1 && (
                                                <div style={{ 
                                                    fontSize: '0.75rem', 
                                                    color: cls.branchColor, 
                                                    fontWeight: 'bold', 
                                                    border: `1px solid ${cls.branchColor}`, 
                                                    padding: '2px 6px', 
                                                    borderRadius: '4px' 
                                                }}>
                                                    {cls.branchName}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', textDecoration: isCancelled ? 'line-through' : 'none' }}>{cls.time}</span>
                                            {cls.instructor === instructorName && !isCancelled && <span style={{ fontSize: '0.75rem', background: 'var(--primary-gold)', color: 'var(--text-on-primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>내 수업</span>}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '0.95rem', textDecoration: isCancelled ? 'line-through' : 'none', color: isCancelled ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{cls.title}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {/* 예약/출석 인원 뱃지 */}
                                                {allowBooking && !isCancelled && (() => {
                                                    const clsBookings = dayBookings.filter(b => b.classIndex === idx && b.branchId === cls.branchId);
                                                    const bookedCount = clsBookings.filter(b => b.status === 'booked' || b.status === 'attended').length;
                                                    const capacity = bookingService.getClassCapacity(cls, cls.branchId, config);
                                                    if (bookedCount === 0 && capacity > 0) return null;
                                                    return (
                                                        <span style={{
                                                            fontSize: '0.7rem', fontWeight: 'bold',
                                                            padding: '2px 8px', borderRadius: '10px',
                                                            background: bookedCount >= capacity ? 'rgba(255,71,87,0.15)' : 'rgba(var(--primary-rgb), 0.15)',
                                                            color: bookedCount >= capacity ? '#ff4757' : 'var(--primary-gold)',
                                                            border: `1px solid ${bookedCount >= capacity ? 'rgba(255,71,87,0.3)' : 'rgba(var(--primary-rgb), 0.3)'}`
                                                        }}>예약 {bookedCount}/{capacity}</span>
                                                    );
                                                })()}
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: isCancelled ? '0' : '60px' }}>{cls.instructor}</span>
                                            </div>
                                        </div>

                                        {/* Attendee List Expansion */}
                                        {expandedClassKey === `${cls.time}_${cls.title}` && (
                                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                {/* 예약자 명단 */}
                                                {allowBooking && (() => {
                                                    const clsBookings = dayBookings.filter(b => b.classIndex === idx && b.branchId === cls.branchId && b.status !== 'cancelled');
                                                    if (clsBookings.length === 0) return null;
                                                    return (
                                                        <div style={{ marginBottom: '10px' }}>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--primary-gold)', marginBottom: '6px', fontWeight: 'bold' }}>📋 예약 명단</div>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                {clsBookings.map(b => (
                                                                    <span key={b.id} style={{
                                                                        padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem',
                                                                        background: b.status === 'attended' ? 'rgba(46,213,115,0.1)' : b.status === 'noshow' ? 'rgba(255,71,87,0.1)' : b.status === 'waitlisted' ? 'rgba(243,156,18,0.1)' : 'rgba(var(--primary-rgb), 0.08)',
                                                                        color: b.status === 'attended' ? '#2ed573' : b.status === 'noshow' ? '#ff4757' : b.status === 'waitlisted' ? '#f39c12' : 'var(--text-secondary)',
                                                                        border: `1px solid ${b.status === 'attended' ? 'rgba(46,213,115,0.2)' : b.status === 'noshow' ? 'rgba(255,71,87,0.2)' : b.status === 'waitlisted' ? 'rgba(243,156,18,0.2)' : 'rgba(var(--primary-rgb), 0.15)'}`
                                                                    }}>
                                                                        {b.status === 'attended' ? '✅' : b.status === 'noshow' ? '❌' : b.status === 'waitlisted' ? '⏳' : '📋'} {b.memberName}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                                <div style={{ fontSize: '0.8rem', color: 'var(--primary-gold)', marginBottom: '8px', fontWeight: 'bold' }}>👥 출석 명단</div>
                                                {loadingAttendance ? (
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>조회 중...</div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {(() => {
                                                            const filtered = dateAttendance.filter(a => {
                                                                // [FIX] Primary: Match by classTime + branchId (most reliable)
                                                                // Secondary: Match by className (fallback)
                                                                const attClass = (a.className || '자율수련').trim();
                                                                const clsClass = (cls.title || '자율수련').trim();
                                                                const attInst = (a.instructor || '').trim();
                                                                const clsInst = (cls.instructor || '').trim();
                                                                
                                                                // Branch matching
                                                                const matchBranch = !a.branchId || !cls.branchId || a.branchId === cls.branchId;
                                                                if (!matchBranch) return false;
                                                                
                                                                // Strategy 1: classTime exact match (most reliable)
                                                                if (a.classTime && cls.time) {
                                                                    const matchTime = a.classTime === cls.time;
                                                                    if (matchTime) return true;
                                                                }
                                                                
                                                                // Strategy 2: className match (flexible - includes or equals)
                                                                const matchClassExact = attClass === clsClass;
                                                                const matchClassFuzzy = attClass.includes(clsClass) || clsClass.includes(attClass);
                                                                const matchInst = attInst === clsInst || !attInst || attInst === '미지정';
                                                                
                                                                return (matchClassExact || matchClassFuzzy) && matchInst;
                                                            });
                                                            
                                                            return filtered.length === 0 ? (
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>출석 회원이 없습니다</div>
                                                            ) : (
                                                                filtered.map((att, aidx) => (
                                                                    <div key={att.id || aidx} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '4px' }}>
                                                                        <span style={{ fontSize: '0.85rem' }}>{att.memberName}</span>
                                                                        <span style={{ fontSize: '0.8rem', color: 'var(--primary-gold)' }}>
                                                                            {att.timestamp ? new Date(att.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                                                                        </span>
                                                                    </div>
                                                                ))
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default InstructorSchedule;
