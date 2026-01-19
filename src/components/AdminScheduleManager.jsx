import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { CaretLeft, CaretRight, Plus, Trash, X, Gear } from '@phosphor-icons/react';
import { getHolidayName } from '../utils/holidays';
import { ScheduleClassEditor, SettingsModal } from './ScheduleHelpers';
import { getTagColor } from '../utils/colors';

const ColorLegend = ({ branchId }) => {
    const items = [
        { label: '일반', color: '#FFFFFF', border: '#DDDDDD', branches: ['gwangheungchang', 'mapo'] },
        {
            label: branchId === 'gwangheungchang' ? '심화/마이솔' : '심화/마이솔/플라잉',
            color: 'rgba(255, 190, 118, 0.9)', // Orange
            border: 'rgba(255, 190, 118, 1)',
            branches: ['gwangheungchang', 'mapo']
        },
        { label: '키즈', color: 'rgba(255, 234, 167, 0.4)', border: 'rgba(255, 234, 167, 0.6)', branches: ['mapo'] },
        { label: '임산부', color: 'rgba(196, 252, 239, 0.9)', border: 'rgba(129, 236, 236, 1)', branches: ['mapo'] }, // Mint Green
        { label: '토요하타/별도등록', color: 'rgba(224, 86, 253, 0.7)', border: 'rgba(224, 86, 253, 0.9)', branches: ['mapo'] },
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
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [monthlyClasses, setMonthlyClasses] = useState({});
    const [selectedDate, setSelectedDate] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dayClasses, setDayClasses] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [classTypes, setClassTypes] = useState([]);
    const [classLevels, setClassLevels] = useState([]);
    // const [newInstructor, setNewInstructor] = useState('');
    // const [newClassType, setNewClassType] = useState('');

    useEffect(() => {
        loadMonthlyData();
        loadMasterData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchId, year, month]);

    const loadMonthlyData = async () => {
        setLoading(true);
        try {
            const data = await storageService.getMonthlyClasses(branchId, year, month);
            setMonthlyClasses(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadMasterData = async () => {
        const [instructorList, classTypeList, classLevelList] = await Promise.all([
            storageService.getInstructors(),
            storageService.getClassTypes(),
            storageService.getClassLevels()
        ]);
        setInstructors(instructorList);
        setClassTypes(classTypeList);
        setClassLevels(classLevelList);
    };

    const handleGenerate = async () => {
        const confirmMsg = '📅 ' + year + '년 ' + month + '월 스케줄 생성\n\n' +
            '업로드된 최신 시간표 이미지를 분석한 데이터를 바탕으로\n' +
            '이번 달 모든 날짜에 수업을 자동 배정합니다.\n\n' +
            '⚠️ 주의: 기존에 수정한 스케줄이 있다면 덮어씌워집니다.\n\n' +
            '진행하시겠습니까?';

        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const res = await storageService.generateMonthlySchedule(branchId, year, month);
            alert(res.message);
            await loadMonthlyData();
        } catch (error) {
            console.error("Error generating schedule:", error);
            alert("스케줄 생성 중 오류가 발생했습니다: " + error.message);
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

    const saveDayClasses = async () => {
        if (!selectedDate) return;
        setLoading(true);
        try {
            await storageService.updateDailyClasses(branchId, selectedDate, dayClasses);
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
                                    backgroundColor: date ? (isToday ? 'rgba(212,175,55,0.1)' : (holidayName ? 'rgba(255,71,87,0.05)' : 'var(--bg-card)')) : 'transparent',
                                    border: date ? (holidayName ? '1px solid rgba(255,71,87,0.3)' : '1px solid var(--border-color)') : 'none',
                                    borderRadius: '8px',
                                    padding: '6px',
                                    cursor: date ? 'pointer' : 'default',
                                    position: 'relative'
                                }}
                            >
                                {date && (
                                    <>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '4px', color: holidayName || isSunday ? '#ff4757' : 'var(--text-primary)' }}>
                                            {date.getDate()}
                                        </div>
                                        {holidayName && (
                                            <div style={{ fontSize: '0.65rem', color: '#ff4757', marginBottom: '4px', fontWeight: 'bold' }}>
                                                🎉 {holidayName}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {classes.map((cls, idx) => {
                                                const colors = getTagColor(cls.title, dateStr, cls.instructor);
                                                return (
                                                    <div key={idx} style={{
                                                        fontSize: '0.8rem', // Increased font size
                                                        padding: '4px 6px',
                                                        borderRadius: '6px',
                                                        backgroundColor: cls.status === 'cancelled' ? '#ff4757' : colors.bg,
                                                        color: cls.status === 'cancelled' ? 'white' : colors.text, // Ensure text contrast
                                                        border: cls.status === 'cancelled' ? 'none' : `1px solid ${colors.border}`,
                                                        textDecoration: cls.status === 'cancelled' ? 'line-through' : 'none',
                                                        fontWeight: '500',
                                                        display: 'flex',
                                                        flexDirection: 'column', // Stack vertically
                                                        gap: '2px', // Space between time/title and instructor
                                                        marginTop: '2px'
                                                    }}>
                                                        <span style={{ fontWeight: 'bold' }}>
                                                            {cls.time} {cls.title}
                                                        </span>
                                                        {(cls.instructor || cls.level) && (
                                                            <span style={{ fontSize: '0.85em', opacity: 0.95, display: 'block' }}>
                                                                {cls.level ? `Lv.${cls.level} ` : ''}{cls.instructor}
                                                            </span>
                                                        )}
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

    const copyToNextMonth = async () => {
        const nextMonthYear = month === 12 ? year + 1 : year;
        const nextMonthVal = month === 12 ? 1 : month + 1;

        const confirmMsg = `📅 ${year}년 ${month}월 패턴을 ${nextMonthYear}년 ${nextMonthVal}월로 복사\n\n` +
            `현재 표시된 달의 주간 수업 패턴을 분석하여\n` +
            `다음 달의 모든 날짜에 요일별로 동일하게 복사합니다.\n\n` +
            `다음 달의 기존 스케줄이 모두 덮어씌워집니다.\n` +
            `진행하시겠습니까?`;

        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const nextMonthDays = new Date(nextMonthYear, nextMonthVal, 0).getDate();
            const pattern = {};
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

            // 1. Identify pattern from the visible month (current state)
            const daysInCurrentMonth = new Date(year, month, 0).getDate();
            for (let i = 1; i <= daysInCurrentMonth; i++) {
                const d = new Date(year, month - 1, i);
                const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const dayName = dayNames[d.getDay()];
                if (monthlyClasses[dStr] && monthlyClasses[dStr].length > 0) {
                    pattern[dayName] = monthlyClasses[dStr];
                }
            }

            // 2. Prepare updates for the next month
            const updates = [];
            for (let i = 1; i <= nextMonthDays; i++) {
                const d = new Date(nextMonthYear, nextMonthVal - 1, i);
                const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const dayName = dayNames[d.getDay()];

                if (pattern[dayName]) {
                    updates.push({ date: dStr, classes: pattern[dayName] });
                }
            }

            if (updates.length > 0) {
                await storageService.batchUpdateDailyClasses(branchId, updates);
                alert(`${nextMonthYear}년 ${nextMonthVal}월로 패턴이 복사되었습니다.`);
                handleNextMonth();
            } else {
                alert('현재 달에 설정된 수업이 없습니다. 먼저 수업을 입력해주세요.');
            }
        } catch (err) {
            console.error(err);
            alert('오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', backgroundColor: 'var(--bg-surface)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={handlePrevMonth} style={navBtnStyle}><CaretLeft /></button>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{year}년 {month}월</h2>
                    <button onClick={handleNextMonth} style={navBtnStyle}><CaretRight /></button>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={handleGenerate} style={{ ...actionBtnStyle, backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                        📅 이미지 시간표 적용
                    </button>
                    <button onClick={copyToNextMonth} style={{ ...actionBtnStyle, backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                        🔄 다음달로 복사
                    </button>
                    <button onClick={() => setShowSettingsModal(true)} style={{ ...actionBtnStyle, backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                        <Gear size={18} /> 설정
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <ColorLegend branchId={branchId} />
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: '40px' }}>데이터 처리 중...</div> : renderCalendar()}

            {showEditModal && (
                <div style={modalOverlayStyle}>
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
                        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowEditModal(false)} style={{ ...actionBtnStyle, backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>취소</button>
                            <button onClick={saveDayClasses} style={actionBtnStyle}>이 날짜만 저장</button>
                        </div>
                    </div>
                </div>
            )
            }

            <SettingsModal
                show={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
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
const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
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
