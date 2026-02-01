import { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { CaretLeft, CaretRight, Plus, Trash, X, Image as ImageIcon, UploadSimple } from '@phosphor-icons/react';
import { getHolidayName } from '../utils/holidays';
import { ScheduleClassEditor, SettingsModal } from './ScheduleHelpers';
import { getTagColor } from '../utils/colors';
import { useLanguageContext } from '../context/LanguageContext';

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

const AdminScheduleManager = ({ branchId, showSettings, onShowSettings }) => {
    const { t } = useLanguageContext();
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [monthlyClasses, setMonthlyClasses] = useState({});
    const [scheduleStatus, setScheduleStatus] = useState('undefined'); // 'undefined' | 'saved'
    const [images, setImages] = useState({});
    const [selectedDate, setSelectedDate] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
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

        // [FIX] Subscribe to storage updates to keep images in sync
        const unsub = storageService.subscribe(async () => {
            const latestImages = await storageService.getImages();
            setImages(latestImages);
        });

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

    // [Removed handleCreate as per user request to only allow Copy]

    // [New] Clear/Reset Logic
    const handleReset = async () => {
        if (!window.confirm('⚠️ 정말로 이 달의 스케줄을 초기화하시겠습니까?\n\n모든 수업 데이터가 삭제되며, 상태가 [미정]으로 돌아갑니다.')) return;

        setLoading(true);
        try {
            await storageService.deleteMonthlySchedule(branchId, year, month);
            alert('스케줄이 초기화되었습니다.');
            await loadMonthlyData(); // Refresh UI
        } catch (error) {
            console.error("Reset failed:", error);
            alert("초기화 중 오류가 발생했습니다: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // [New] Standard Schedule Creation
    const handleCreateStandard = async () => {
        const confirmMsg = `📅 ${year}년 ${month}월에 '표준 시간표(기본)'를 적용하시겠습니까?\n\n` +
            `기본 설정된(1월 기준) 시간표 패턴으로 생성됩니다.`;

        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        try {
            // Uses createMonthlySchedule which falls back to DEFAULT_SCHEDULE_TEMPLATE
            const res = await storageService.createMonthlySchedule(branchId, year, month);
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
            } else {
                await storageService.updateDailyClasses(branchId, selectedDate, dayClasses);
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
                                    backgroundColor: date ? (isToday ? 'rgba(212,175,55,0.08)' : (holidayName ? 'rgba(255,71,87,0.05)' : 'var(--bg-card)')) : 'transparent',
                                    border: date ? (isToday ? '2px solid var(--primary-gold)' : (holidayName ? '1px solid rgba(255,71,87,0.3)' : '1px solid var(--border-color)')) : 'none',
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

    // [New] Image Upload Logic
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('파일 용량이 너무 큽니다. (최대 5MB)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1000;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Use high quality (0.8) to prevent text blur
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                const kbSize = Math.round(compressedBase64.length / 1024);
                const targetKey = `timetable_${branchId}_${year}-${String(month).padStart(2, '0')}`;


                // Optimistic Update
                const previousImage = images[targetKey];
                setImages(prev => ({ ...prev, [targetKey]: compressedBase64 }));

                // Async Save & Verify
                storageService.updateImage(targetKey, compressedBase64)
                    .then(async () => {
                        // [VERIFICATION] Explicitly check if it exists in DB
                        await storageService.getImages();
                        // Note: getImages returns cache from listener, which might be slightly delayed. 
                        // Let's rely on the promise resolution of updateImage which implies write complete.
                        alert(`${year}년 ${month}월 시간표가 저장되었습니다.\n(전송 크기: ${kbSize}KB)`);
                    })
                    .catch(err => {
                        console.error("Image upload failed:", err);
                        alert(`저장 실패: ${err.message}\n(크기: ${kbSize}KB)`);
                        setImages(prev => ({ ...prev, [targetKey]: previousImage }));
                    });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const renderUndefinedView = () => {
        // Priority: Specific Month Image -> Branch Default -> Global Default (if any)
        const specificKey = `timetable_${branchId}_${year}-${String(month).padStart(2, '0')}`;
        const fallbackKey = `timetable_${branchId}`;

        // Check if we have a specific image for this month
        const hasSpecificImage = !!images[specificKey];
        const imageUrl = images[specificKey] || images[fallbackKey];

        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
                        🟡 {year}년 {month}월 스케줄이 아직 생성되지 않았습니다.
                    </h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        이번 달에 적용할 주간 시간표 이미지를 등록하고, 스케줄을 생성해주세요.
                    </p>
                </div>

                <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto 30px' }}>
                    {imageUrl ? (
                        <img src={imageUrl} alt="Weekly Timetable" style={{ width: '100%', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', maxHeight: '400px', objectFit: 'contain' }} />
                    ) : (
                        <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)' }}>
                            <ImageIcon size={48} opacity={0.5} />
                        </div>
                    )}

                    {/* Floating Upload Button */}
                    <div style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                            id={`upload-schedule-${year}-${month}`}
                        />
                        <label
                            htmlFor={`upload-schedule-${year}-${month}`}
                            className="action-btn sm"
                            style={{
                                background: 'rgba(0,0,0,0.7)',
                                backdropFilter: 'blur(4px)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.2)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 12px'
                            }}
                        >
                            <UploadSimple size={16} />
                            {hasSpecificImage ? '이미지 변경' : '전용 이미지 업로드'}
                        </label>
                    </div>
                    {hasSpecificImage && (
                        <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#10B981', color: 'white', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                            {month}월 전용
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    {/* [User Request] Removed 'Create from Template' button to avoid confusion with Image Generation */}

                    <button
                        onClick={handleCreateStandard}
                        style={{
                            padding: '16px 25px',
                            fontSize: '1rem',
                            backgroundColor: '#4b5563', // Grey for standard
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                        }}
                    >
                        ✨ 표준 시간표 생성 (기본)
                    </button>

                    <button
                        onClick={async () => {
                            // Calculate previous month
                            const d = new Date(year, month - 1, 1);
                            d.setMonth(d.getMonth() - 1);
                            const prevYear = d.getFullYear();
                            const prevMonth = d.getMonth() + 1;

                            if (!confirm(`${prevYear}년 ${prevMonth}월의 스케줄 패턴을 복사하여\\n${year}년 ${month}월 스케줄을 생성하시겠습니까?`)) return;

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
                        }}
                        style={{
                            padding: '16px 40px',
                            fontSize: '1.1rem',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                        }}
                    >
                        📥 지난달 복사하여 생성
                    </button>
                </div>
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

            <SettingsModal
                show={showSettings}
                onClose={onShowSettings}
                instructors={instructors}
                setInstructors={setInstructors}
                classTypes={classTypes}
                setClassTypes={setClassTypes}
                classLevels={classLevels}
                setClassLevels={classLevels}
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
