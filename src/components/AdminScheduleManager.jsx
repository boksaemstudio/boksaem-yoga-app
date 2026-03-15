import { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { CaretLeft, CaretRight, Plus, Trash, X, Image as ImageIcon, UploadSimple, Gear, ClockCounterClockwise, Warning } from '@phosphor-icons/react';
// [Refactor] Purged static config. Logic moved to useStudioConfig context.
import { getHolidayName } from '../utils/holidays';
import { ScheduleClassEditor, SettingsModal } from './ScheduleHelpers';
import { getTagColor } from '../utils/colors';
import { useLanguageContext } from '../contexts/LanguageContext';
import { useStudioConfig } from '../contexts/StudioContext';
import * as bookingService from '../services/bookingService';

const ColorLegend = ({ branchId }) => {
    const { config } = useStudioConfig();
    // [STUDIO-AGNOSTIC] Pull from config or use a generic fallback
    const items = config.SCHEDULE_LEGEND || [
        { label: '일반', color: '#FFFFFF', border: '#DDDDDD', branches: (config.BRANCHES || []).map(b => b.id) },
        { 
            label: '특별/심화', 
            color: 'rgba(255, 190, 118, 0.9)', 
            border: 'rgba(255, 190, 118, 1)', 
            branches: (config.BRANCHES || []).map(b => b.id) 
        },
    ];

    const filteredItems = branchId
        ? items.filter(item => item.branches.includes(branchId))
        : items;

    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', justifyContent: 'flex-end' }}>
            {filteredItems.map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: item.color, border: `1px solid ${item.border}` }}></div>
                    <span style={{ fontWeight: '500' }}>{item.label}</span>
                </div>
            ))}
        </div>
    );
};

const AdminScheduleManager = ({ branchId }) => {
    const { config } = useStudioConfig();
    const { t } = useLanguageContext();
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [monthlyClasses, setMonthlyClasses] = useState({});
    const [scheduleStatus, setScheduleStatus] = useState('undefined'); // 'undefined' | 'saved'
    const [images, setImages] = useState({});
    const [selectedDate, setSelectedDate] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSettings, setShowSettings] = useState(false); // [Added] Internal state for settings
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [backupList, setBackupList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dayClasses, setDayClasses] = useState([]);
    const [monthlyBookings, setMonthlyBookings] = useState({}); // { '2026-03-16': [booking, ...], ... }
    const allowBooking = config?.POLICIES?.ALLOW_BOOKING;
    const [instructors, setInstructors] = useState([]);
    const [classTypes, setClassTypes] = useState([]);
    const [classLevels, setClassLevels] = useState([]);
    // const [newInstructor, setNewInstructor] = useState('');
    // const [newClassType, setNewClassType] = useState('');

    useEffect(() => {
        // [Critical Fix] Reset selection and modal when branch/month changes to prevent data pollution
        setShowEditModal(false);
        setSelectedDate(null);
        setDayClasses([]);
        setScheduleStatus('undefined'); // Reset status initially

        loadMonthlyData();
        loadMasterData();

        // [ROOT SOLUTION] 전방위 실시간 동기화 구독
        const unsub = storageService.subscribe(async (eventType) => {
            console.log(`[AdminScheduleManager] ${eventType} updated, syncing...`);
            if (eventType === 'images' || eventType === 'all') {
                const latestImages = await storageService.getImages();
                setImages(latestImages);
            }
            if (eventType === 'dailyClasses' || eventType === 'all') {
                loadMonthlyData();
            }
            if (eventType === 'settings' || eventType === 'all') {
                loadMasterData();
            }
        }, ['images', 'dailyClasses', 'settings']);

        return () => unsub();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchId, year, month]);

    const loadMonthlyData = async () => {
        setLoading(true);
        try {
            // 1. Check Status First
            const status = await storageService.getMonthlyScheduleStatus(branchId, year, month);
            setScheduleStatus(status.exists && status.isSaved ? 'saved' : 'undefined');

            // 2. Load Data if Saved
            if (status.exists && status.isSaved) {
                const data = await storageService.getMonthlyClasses(branchId, year, month);
                setMonthlyClasses(data);
            } else {
                setMonthlyClasses({});
            }

            // 3. Load Images for Reference (in Undefined View)
            const imgs = await storageService.getImages();
            setImages(imgs);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // [실시간] 월간 예약 데이터 구독
    useEffect(() => {
        if (!allowBooking) { setMonthlyBookings({}); return; }
        const unsub = bookingService.subscribeMonthBookings(branchId, year, month, (bookings) => {
            const byDate = {};
            bookings.forEach(b => {
                if (!byDate[b.date]) byDate[b.date] = [];
                byDate[b.date].push(b);
            });
            setMonthlyBookings(byDate);
        });
        return () => unsub();
    }, [year, month, branchId, allowBooking]);

    const loadMasterData = async () => {
        const [instructorList, classTypeList, classLevelList] = await Promise.all([
            storageService.getInstructors(config.DEFAULT_SCHEDULE_TEMPLATE),
            storageService.getClassTypes(config.DEFAULT_SCHEDULE_TEMPLATE),
            storageService.getClassLevels()
        ]);
        setInstructors(instructorList);
        setClassTypes(classTypeList);
        setClassLevels(classLevelList);
    };

    // [Removed handleCreate as per user request to only allow Copy]

    // [New] Clear/Reset Logic
    const handleReset = () => {
        setShowResetConfirm(true);
    };

    const confirmReset = async () => {
        setShowResetConfirm(false);
        setLoading(true);
        try {
            await storageService.deleteMonthlySchedule(branchId, year, month);
            alert('스케줄이 초기화되었습니다.\n(혹시 실수로 지웠다면 [백업 복원] 버튼으로 살릴 수 있습니다)');
            await loadMonthlyData(); // Refresh UI
        } catch (error) {
            console.error("Reset failed:", error);
            alert("초기화 중 오류가 발생했습니다: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenRestore = async () => {
        setLoading(true);
        try {
            const list = await storageService.getMonthlyBackups(branchId, year, month);
            setBackupList(list);
            setShowRestoreModal(true);
        } catch (e) {
            alert('백업 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleRestoreBackup = async (backupId) => {
        if (!window.confirm('선택한 이전 스케줄로 복원하시겠습니까?\n현재 시간표 내용이 덮어씌워집니다.')) return;
        
        setShowRestoreModal(false);
        setLoading(true);
        try {
            await storageService.restoreMonthlyBackup(branchId, year, month, backupId);
            alert('스케줄이 원상복구 되었습니다.');
            await loadMonthlyData();
        } catch (e) {
            console.error("Restore failed:", e);
            alert('복원 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // [New] Standard Schedule Creation
    const handleCreateStandard = async () => {
        const confirmMsg = `📅 ${year}년 ${month}월에 '표준 시간표(기본)'를 적용하시겠습니까?\n\n` +
            `기본 설정된 시간표 패턴으로 생성됩니다.`;

        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        try {
            // Uses createMonthlySchedule which falls back to DEFAULT_SCHEDULE_TEMPLATE
            const res = await storageService.createMonthlySchedule(branchId, year, month, config.DEFAULT_SCHEDULE_TEMPLATE);
            alert(res.message || "표준 시간표가 생성되었습니다.");
            await loadMonthlyData();
        } catch (error) {
            console.error("Error creating standard schedule:", error);
            alert("생성 중 오류가 발생했습니다: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => {
        if (month === 1) { setYear(year - 1); setMonth(12); }
        else setMonth(month - 1);
    };

    const handleNextMonth = () => {
        if (month === 12) { setYear(year + 1); setMonth(1); }
        else setMonth(month + 1);
    };

    const handleDateClick = (dateStr) => {
        setSelectedDate(dateStr);
        setDayClasses(monthlyClasses[dateStr] ? [...monthlyClasses[dateStr]] : []);
        setShowEditModal(true);
    };

    const saveDayClasses = async (applyToAll = false) => {
        if (!selectedDate) return;
        setLoading(true);
        try {
            // [NEW] Retroactive Attendance Update Logic
            let shouldUpdatePastAttendance = false;
            let oldClassesSnapshot = monthlyClasses[selectedDate] || [];
            
            // Check if there are changes in instructor or title compared to existing snapshot
            let hasRelevantChanges = false;
            dayClasses.forEach(newCls => {
                if (!newCls.time) return;
                const oldCls = oldClassesSnapshot.find(c => c.time === newCls.time);
                if (oldCls) {
                    const isTitleChanged = (oldCls.title || oldCls.className) !== (newCls.title || newCls.className);
                    const isInstChanged = oldCls.instructor !== newCls.instructor;
                    if (isTitleChanged || isInstChanged) {
                        hasRelevantChanges = true;
                    }
                }
            });

            if (hasRelevantChanges && !applyToAll) {
                // If this is a single day update, ask if they want to retroactively update attendance
                shouldUpdatePastAttendance = window.confirm(
                    `해당 날짜(${selectedDate})의 수업명이나 강사명이 변경되었습니다.\n\n` +
                    `이 변경 사항을 과거 출석 기록(이미 등록된 출석부)에도 일괄 적용하시겠습니까?\n` +
                    `(적용 시 강사앱 통계 등이 수정되며, 회원의 남은 횟수/기간은 변동되지 않아 안전합니다.)`
                );
            }

            if (applyToAll) {
                const targetDate = new Date(selectedDate);
                const targetDayIndex = targetDate.getDay();
                const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                const targetDayName = dayNames[targetDayIndex];

                // Find all matching weekdays in this month
                const datesToUpdate = [];
                const tempDate = new Date(year, month - 1, 1);
                while (tempDate.getMonth() === month - 1) {
                    if (tempDate.getDay() === targetDayIndex) {
                        // Skip if it's the selected date (handled by batch anyway, but just logically)
                        const dStr = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`;
                        datesToUpdate.push({ date: dStr, classes: dayClasses });
                    }
                    tempDate.setDate(tempDate.getDate() + 1);
                }

                if (!window.confirm(`이번 달의 모든 [${targetDayName}요일] (${datesToUpdate.length}일)을 동일하게 수정하시겠습니까?\n\n날짜: ${datesToUpdate.map(d => d.date.split('-')[2]).join(', ')}`)) {
                    setLoading(false);
                    return;
                }

                await storageService.batchUpdateDailyClasses(branchId, datesToUpdate);
                
                // [NEW] Retroactive Attendance Update for Batch
                if (shouldUpdatePastAttendance) {
                    for (const dateObj of datesToUpdate) {
                        const oldClassesForDate = monthlyClasses[dateObj.date] || [];
                        await storageService.updatePastAttendanceRecords(branchId, dateObj.date, oldClassesForDate, dateObj.classes);
                    }
                }
            } else {
                await storageService.updateDailyClasses(branchId, selectedDate, dayClasses);
                
                // [NEW] Retroactive Attendance Update for Single Day
                if (shouldUpdatePastAttendance) {
                    await storageService.updatePastAttendanceRecords(branchId, selectedDate, oldClassesSnapshot, dayClasses);
                }
            }

            setShowEditModal(false);
            await loadMonthlyData();
        } catch (error) {
            console.error("Error saving daily classes:", error);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // Calendar Grid Logic
    const renderCalendar = () => {
        const startDay = new Date(year, month - 1, 1).getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        const dates = [];

        // Empty slots
        for (let i = 0; i < startDay; i++) dates.push(null);
        // Days
        for (let i = 1; i <= daysInMonth; i++) dates.push(new Date(year, month - 1, i));

        return (
            <div style={{ overflowX: 'auto', paddingBottom: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', minWidth: '800px' }}>
                    {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                        <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', padding: '8px', color: 'var(--text-secondary)' }}>{d}</div>
                    ))}
                    {dates.map((date, i) => {
                        const dateStr = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : `empty-${i}`;
                        const classes = date ? monthlyClasses[dateStr] || [] : [];
                        const isToday = date && date.toDateString() === new Date().toDateString();
                        const holidayName = date ? getHolidayName(dateStr) : null;
                        const isSunday = date && date.getDay() === 0;

                        return (
                            <div
                                key={dateStr}
                                onClick={() => date && handleDateClick(dateStr)}
                                style={{
                                    minHeight: '100px',
                                    // [Refining] Holiday background removed to prevent confusion with cancelled status
                                    backgroundColor: date ? (isToday ? 'rgba(212,175,55,0.08)' : 'var(--bg-card)') : 'transparent',
                                    border: date ? (isToday ? '2px solid var(--primary-gold)' : '1px solid var(--border-color)') : 'none',
                                    boxShadow: isToday ? '0 0 15px rgba(212, 175, 55, 0.2)' : 'none',
                                    borderRadius: '8px',
                                    padding: '6px',
                                    cursor: date ? 'pointer' : 'default',
                                    position: 'relative',
                                    zIndex: isToday ? 2 : 1
                                }}
                            >
                                {date && (
                                    <>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '4px', color: holidayName || isSunday ? '#ff4757' : 'var(--text-primary)' }}>
                                            {date.getDate()}
                                        </div>
                                        {holidayName && (
                                            <div style={{ fontSize: '0.65rem', color: '#ff4757', marginBottom: '4px', fontWeight: 'bold' }}>
                                                🎉 {t(holidayName)}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {classes.map((cls, idx) => {
                                                const colors = getTagColor(cls.title, dateStr, cls.instructor);
                                                const isCancelled = cls.status === 'cancelled';
                                                return (
                                                    <div key={idx} style={{
                                                        fontSize: '0.8rem',
                                                        padding: '4px 6px',
                                                        borderRadius: '6px',
                                                        backgroundColor: colors.bg,
                                                        color: colors.text,
                                                        border: `1px solid ${colors.border}`,
                                                        fontWeight: '500',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '2px',
                                                        marginTop: '2px',
                                                        position: 'relative',
                                                        overflow: 'hidden',
                                                        // Red X diagonal lines for cancelled classes
                                                        ...(isCancelled && {
                                                            background: `
                                                                linear-gradient(to top right, transparent calc(50% - 1.5px), #ff4757 calc(50% - 1.5px), #ff4757 calc(50% + 1.5px), transparent calc(50% + 1.5px)),
                                                                linear-gradient(to top left, transparent calc(50% - 1.5px), #ff4757 calc(50% - 1.5px), #ff4757 calc(50% + 1.5px), transparent calc(50% + 1.5px)),
                                                                ${colors.bg}
                                                            `,
                                                            opacity: 0.7
                                                        })
                                                    }}>
                                                        <span style={{ fontWeight: 'bold' }}>
                                                            {cls.time} {cls.title}
                                                        </span>
                                                        {(cls.instructor || cls.level) && (
                                                            <span style={{ fontSize: '0.85em', opacity: 0.95, display: 'block' }}>
                                                                {cls.level ? `Lv.${cls.level} ` : ''}{cls.instructor}
                                                            </span>
                                                        )}
                                                        {allowBooking && (() => {
                                                            const dateBookings = monthlyBookings[dateStr] || [];
                                                            const clsBookings = dateBookings.filter(b => b.classIndex === idx && b.status !== 'cancelled');
                                                            const bookedCount = clsBookings.filter(b => b.status === 'booked').length;
                                                            const capacity = bookingService.getClassCapacity(cls, branchId, config);
                                                            if (bookedCount === 0) return null;
                                                            return (
                                                                <span style={{
                                                                    fontSize: '0.7em', fontWeight: 'bold',
                                                                    color: bookedCount >= capacity ? '#ff4757' : '#3B82F6',
                                                                    display: 'block'
                                                                }}>📋 {bookedCount}/{capacity}명</span>
                                                            );
                                                        })()}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const handleCopyPrevMonth = async () => {
        // Calculate previous month
        const d = new Date(year, month - 1, 1);
        d.setMonth(d.getMonth() - 1);
        const prevYear = d.getFullYear();
        const prevMonth = d.getMonth() + 1;

        if (!confirm(`${prevYear}년 ${prevMonth}월의 스케줄 패턴을 복사하여\n${year}년 ${month}월 스케줄을 생성하시겠습니까?\n\n(일요일과 토요일 일정도 순차적으로 복사됩니다.)`)) return;

        setLoading(true);
        try {
            await storageService.copyMonthlySchedule(branchId, prevYear, prevMonth, year, month);
            alert('이전 달 내용을 바탕으로 스케줄이 생성되었습니다.');
            await loadMonthlyData();
        } catch (e) {
            console.error(e);
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    const renderUndefinedView = () => {
        return (
            <div style={{ padding: '0px' }}>
                <div style={{
                    marginBottom: '20px',
                    padding: '24px',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                    textAlign: 'center'
                }}>
                    <div>
                        <h3 style={{ fontSize: '1.2rem', color: '#60A5FA', margin: '0 0 8px 0' }}>
                            {year}년 {month}월 일정이 비어 있습니다.
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
                            일일이 등록할 필요 없이, 지난 달 일정을 그대로 복사해서 편하게 시작하세요.
                        </p>
                    </div>

                    <button
                        onClick={handleCopyPrevMonth}
                        style={{
                            padding: '14px 32px',
                            fontSize: '1.05rem',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                            transition: 'all 0.2s'
                        }}
                    >
                        📥 지난달 스케줄 그대로 복사하기
                    </button>
                </div>

                {/* Always show the calendar grid below, even if empty */}
                {renderCalendar()}
            </div>
        );
    };

    return (
        <div style={{ padding: '20px', backgroundColor: 'var(--bg-surface)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={handlePrevMonth} style={navBtnStyle}><CaretLeft /></button>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {year}년 {month}월
                        {scheduleStatus === 'saved' ?
                            <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '20px', backgroundColor: '#10B981', color: 'white' }}>확정됨</span> :
                            <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '20px', backgroundColor: '#F59E0B', color: 'white' }}>미정</span>
                        }
                    </h2>
                    <button onClick={handleNextMonth} style={navBtnStyle}><CaretRight /></button>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={handleOpenRestore} style={{ ...actionBtnStyle, backgroundColor: '#6366F1', opacity: 0.9 }}>
                        <ClockCounterClockwise size={18} /> 백업 복원
                    </button>
                    <button onClick={() => setShowSettings(true)} style={{ ...actionBtnStyle, backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                        <Gear size={18} /> 설정
                    </button>
                    {scheduleStatus === 'saved' && (
                        <button onClick={handleReset} style={{ ...actionBtnStyle, backgroundColor: '#EF4444', opacity: 0.8 }}>
                            <Trash size={18} /> 초기화
                        </button>
                    )}
                </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <ColorLegend branchId={branchId} />
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: '40px' }}>데이터 처리 중...</div> : (
                scheduleStatus === 'saved' ? renderCalendar() : renderUndefinedView()
            )}
            {showEditModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(5px)' // Added blur for better concealment
                }}>
                    <div style={modalContentStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>{selectedDate} 수업 관리</h3>
                            <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={24} /></button>
                        </div>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                            {dayClasses.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>배정된 수업이 없습니다.</p>}
                            {dayClasses.map((cls, idx) => (
                                <ScheduleClassEditor
                                    key={idx}
                                    cls={cls}
                                    idx={idx}
                                    dayClasses={dayClasses}
                                    setDayClasses={setDayClasses}
                                    instructors={instructors}
                                    classTypes={classTypes}
                                    classLevels={classLevels}
                                />
                            ))}
                            <button
                                onClick={() => setDayClasses([...dayClasses, {
                                    time: '10:00',
                                    title: classTypes[0] || '하타',
                                    instructor: instructors[0] || '원장',
                                    status: 'normal',
                                    duration: 60,
                                    level: ''
                                }])}
                                style={{ ...actionBtnStyle, width: '100%', marginTop: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)' }}
                            >
                                <Plus size={18} /> 수업 추가
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button onClick={() => setShowEditModal(false)} style={{ ...actionBtnStyle, backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>취소</button>

                            <button onClick={() => saveDayClasses(true)} style={{ ...actionBtnStyle, backgroundColor: '#8B5CF6' }}>
                                📅 이 달의 모든 {new Date(selectedDate).toLocaleString('ko-KR', { weekday: 'short' })}요일 수정
                            </button>

                            <button onClick={() => saveDayClasses(false)} style={actionBtnStyle}>
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Reset Confirm Modal */}
            {showResetConfirm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)'
                }}>
                    <div style={{ ...modalContentStyle, maxWidth: '400px', textAlign: 'center' }}>
                        <Warning size={48} color="#EF4444" style={{ marginBottom: '16px' }} />
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.3rem' }}>스케줄 초기화</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
                            정말로 {year}년 {month}월 스케줄을 초기화하시겠습니까?<br/><br/>
                            모든 수업 데이터가 삭제되며, 상태가 [미정]으로 돌아갑니다.<br/>
                            <span style={{ fontSize: '0.85rem', color: '#6366F1', marginTop: '8px', display: 'block' }}>(초기화 직전 상태는 임시 백업됩니다)</span>
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button onClick={() => setShowResetConfirm(false)} style={{ ...actionBtnStyle, backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', flex: 1 }}>
                                취소
                            </button>
                            <button onClick={confirmReset} style={{ ...actionBtnStyle, backgroundColor: '#EF4444', flex: 1 }}>
                                네, 초기화합니다
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restore Backup Modal */}
            {showRestoreModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)'
                }}>
                    <div style={{ ...modalContentStyle, maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ClockCounterClockwise size={24} color="#6366F1" /> 백업에서 복원하기
                            </h3>
                            <button onClick={() => setShowRestoreModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={24} /></button>
                        </div>
                        
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
                            스케줄을 초기화할 때마다 가장 최근 2개의 스케줄이 자동으로 백업됩니다. 이전 상태로 되돌리려면 아래 목록에서 선택하세요.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                            {backupList.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '30px', backgroundColor: 'var(--bg-input)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                                    사용 가능한 백업이 없습니다.
                                </div>
                            ) : (
                                backupList.map((backup, idx) => {
                                    const date = new Date(backup.timestamp);
                                    let clsCount = 0;
                                    if(backup.classes) Object.values(backup.classes).forEach(day => clsCount += (day.classes?.length || 0));
                                    
                                    return (
                                        <div key={backup.id} style={{ 
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                            padding: '16px', backgroundColor: 'var(--bg-input)', borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                                    {date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}에 백업됨
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    총 {clsCount}개의 수업 데이터 포함
                                                    {idx === 0 && <span style={{ marginLeft: '8px', color: '#10B981', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>가장 최근</span>}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRestoreBackup(backup.id)}
                                                style={{ ...actionBtnStyle, backgroundColor: '#6366F1', padding: '8px 16px', fontSize: '0.9rem' }}
                                            >
                                                이 지점으로 복원
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            <SettingsModal
                show={showSettings}
                onClose={() => setShowSettings(false)}
                instructors={instructors}
                setInstructors={setInstructors}
                classTypes={classTypes}
                setClassTypes={setClassTypes}
                classLevels={classLevels}
                setClassLevels={setClassLevels}
            />
        </div >
    );
};

// Styles
const navBtnStyle = {
    background: 'none', border: '1px solid var(--border-color)', borderRadius: '50%', width: '32px', height: '32px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)'
};
const actionBtnStyle = {
    padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary-gold)', color: 'white',
    fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'
};

const modalContentStyle = {
    backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '700px',
    color: 'var(--text-primary)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
};
/*
const inputStyle = {
    padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: '0.9rem'
};
*/

export default AdminScheduleManager;
