import { useState, useEffect, useMemo } from 'react';
import { CalendarBlank, Bell, BellRinging, House, SignOut, User, Phone } from '@phosphor-icons/react';
import { storageService } from '../services/storage';
import { getMonthlyClasses } from '../services/scheduleService';
import { isHoliday, getHolidayName } from '../utils/holidays';
import { getToken } from 'firebase/messaging';
import { messaging } from '../firebase';
import CosmicParticles from '../components/common/CosmicParticles';

// === Helper for Default Greeting ===
const getDefaultGreeting = (name, h, day) => {
    const timeGreeting = h < 12 ? '좋은 아침이에요' : h < 17 ? '오늘도 좋은 오후예요' : '수고하셨어요';
    const dayContext = day === '월' ? '새로운 한 주의 시작!' : 
                      day === '금' ? '즐거운 금요일!' : 
                      (day === '토' || day === '일') ? '행복한 주말!' : '';
    return `${name} 선생님, ${timeGreeting} 🧘‍♀️ ${dayContext}`;
};

// === Instructor Login Component ===
const InstructorLogin = ({ onLogin, instructors }) => {
    const [name, setName] = useState('');
    const [phoneLast4, setPhoneLast4] = useState('');
    const [error, setError] = useState('');

    const handleLogin = () => {
        const instructor = instructors.find(inst => {
            const instName = typeof inst === 'string' ? inst : inst.name;
            const instPhone = typeof inst === 'string' ? '' : (inst.phone || '');
            return instName === name && instPhone.slice(-4) === phoneLast4;
        });

        if (instructor) {
            const instName = typeof instructor === 'string' ? instructor : instructor.name;
            localStorage.setItem('instructorName', instName);
            onLogin(instName);
        } else {
            setError('이름 또는 전화번호가 일치하지 않습니다');
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', zIndex: 1 }}>
            <div style={{ background: 'rgba(20, 20, 25, 0.95)', padding: '40px', borderRadius: '20px', maxWidth: '400px', width: '100%', textAlign: 'center', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                {/* Logo */}
                <img 
                    src="/logo_circle.png" 
                    alt="복샘요가" 
                    style={{ width: '70px', height: '70px', marginBottom: '16px', filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.5))' }} 
                />
                <h1 style={{ color: 'var(--primary-gold)', marginBottom: '8px', fontSize: '1.8rem' }}>복샘요가 강사</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>강사 전용 앱입니다</p>

                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-input)', padding: '12px 16px', borderRadius: '10px', marginBottom: '12px' }}>
                        <User size={20} color="var(--text-secondary)" />
                        <select
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
                        >
                            <option value="">선생님 선택</option>
                            {instructors.map(inst => {
                                const instName = typeof inst === 'string' ? inst : inst.name;
                                return <option key={instName} value={instName}>{instName}</option>;
                            })}
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-input)', padding: '12px 16px', borderRadius: '10px' }}>
                        <Phone size={20} color="var(--text-secondary)" />
                        <input
                            type="tel"
                            value={phoneLast4}
                            onChange={(e) => setPhoneLast4(e.target.value.slice(0, 4))}
                            placeholder="전화번호 뒤 4자리"
                            maxLength={4}
                            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
                        />
                    </div>
                </div>

                {error && <p style={{ color: '#ff4757', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</p>}

                <button
                    onClick={handleLogin}
                    disabled={!name || phoneLast4.length !== 4}
                    style={{
                        width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                        background: name && phoneLast4.length === 4 ? 'var(--primary-gold)' : 'var(--bg-input)',
                        color: name && phoneLast4.length === 4 ? 'black' : 'var(--text-secondary)',
                        fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer'
                    }}
                >
                    로그인
                </button>
            </div>
        </div>
    );
};

// === Instructor Schedule Tab ===
const InstructorSchedule = ({ instructorName }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [monthlyData, setMonthlyData] = useState({});
    const [selectedDate, setSelectedDate] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    // Defined branches to fetch
    const branches = useMemo(() => [
        { id: 'gwangheungchang', name: '광흥창점', color: 'var(--primary-gold)' },
        { id: 'mapo', name: '마포점', color: '#FF6B6B' } // Using Coral for Mapo distinct color
    ], []);

    useEffect(() => {
        const loadData = async () => {
            const promises = branches.map(b => getMonthlyClasses(b.id, year, month));
            const results = await Promise.all(promises);
            
            const merged = {};
            
            results.forEach((data, idx) => {
                const branch = branches[idx];
                Object.entries(data).forEach(([date, classes]) => {
                    if (!merged[date]) merged[date] = [];
                    // Add branch info to each class
                    const classesWithBranch = classes.map(cls => ({
                        ...cls,
                        branchName: branch.name,
                        branchColor: branch.color
                    }));
                    merged[date] = [...merged[date], ...classesWithBranch];
                });
            });
            
            setMonthlyData(merged);
        };
        loadData();
    }, [year, month, branches]);

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    const getBranchStatus = (dateStr) => {
        const classes = monthlyData[dateStr] || [];
        const myClasses = classes.filter(cls => 
            cls.instructor === instructorName && 
            cls.status !== 'cancelled' // Exclude cancelled classes from visual indicators
        );
        return {
            hasGhc: myClasses.some(cls => cls.branchName === '광흥창점' || cls.branchId === 'gwangheungchang'),
            hasMapo: myClasses.some(cls => cls.branchName === '마포점' || cls.branchId === 'mapo'),
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
            const { hasGhc, hasMapo } = getBranchStatus(dateStr);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            
            // Calculate day of week (0: Sun, 6: Sat)
            const dayOfWeek = new Date(year, month - 1, d).getDay();
            const isRedDay = dayOfWeek === 0 || isHoliday(dateStr);
            const isBlueDay = dayOfWeek === 6 && !isRedDay; // Holiday takes precedence over Saturday
            
            const holidayName = getHolidayName(dateStr);

            let borderStyle = 'none';
            let borderColor = undefined;

            if (hasGhc && hasMapo) {
                borderStyle = '2px solid';
                borderColor = 'var(--primary-gold) #FF6B6B #FF6B6B var(--primary-gold)'; // Top-Left Gold, Bottom-Right Red
            } else if (hasGhc) {
                borderStyle = '2px solid var(--primary-gold)';
            } else if (hasMapo) {
                borderStyle = '2px solid #FF6B6B';
            }
            
            // [DEBUG] Log if border is applied unexpectedly
            if ((hasGhc || hasMapo) && !monthlyData[dateStr]?.length) {
                 console.warn(`[Calendar] Border applied but no classes found for ${dateStr}? GHC:${hasGhc}, MAPO:${hasMapo}`);
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
                        background: isSelected ? 'var(--primary-gold)' : isToday ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                        color: textColor,
                        border: borderStyle,
                        borderColor: borderColor !== 'transparent' ? borderColor : undefined,
                        fontWeight: (hasGhc || hasMapo) ? 'bold' : 'normal',
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
                </div>
            );
        }
        return cells;
    };

    const selectedClasses = selectedDate ? (monthlyData[selectedDate] || []) : [];
    selectedClasses.sort((a, b) => a.time.localeCompare(b.time));

    return (
        <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button onClick={() => setCurrentDate(new Date(year, month - 2, 1))} style={navBtnStyle}>◀</button>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{year}년 {month}월</h2>
                <button onClick={() => setCurrentDate(new Date(year, month, 1))} style={navBtnStyle}>▶</button>
            </div>

            {/* Branch Legend */}
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '6px', 
                            background: 'transparent',
                            border: '3px solid var(--primary-gold)',
                            boxShadow: '0 0 10px rgba(212, 175, 55, 0.2)'
                        }} />
                        <span style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold' }}>광흥창점</span>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255, 255, 255, 0.2)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '6px', 
                            background: 'transparent',
                            border: '3px solid #FF6B6B',
                            boxShadow: '0 0 10px rgba(255, 107, 107, 0.2)'
                        }} />
                        <span style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold' }}>마포점</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                {dayNames.map(day => (
                    <div key={day} style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '8px' }}>{day}</div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '20px' }}>
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
                                        style={{
                                            padding: '12px', borderRadius: '8px',
                                            background: isCancelled ? 'rgba(255, 71, 87, 0.1)' : cls.instructor === instructorName ? 'rgba(212, 175, 55, 0.1)' : 'var(--bg-input)',
                                            borderLeft: `4px solid ${isCancelled ? '#ff4757' : (cls.branchColor || 'var(--primary-gold)')}`,
                                            position: 'relative',
                                            opacity: isCancelled ? 0.7 : 1
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
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', textDecoration: isCancelled ? 'line-through' : 'none' }}>{cls.time}</span>
                                            {cls.instructor === instructorName && !isCancelled && <span style={{ fontSize: '0.75rem', background: 'var(--primary-gold)', color: 'black', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>ME</span>}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '0.95rem', textDecoration: isCancelled ? 'line-through' : 'none', color: isCancelled ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{cls.title}</div>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: isCancelled ? '0' : '60px' }}>{cls.instructor}</span>
                                        </div>
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

// === Notices Tab ===
const InstructorNotices = () => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadNotices = async () => {
            try {
                const data = await storageService.loadNotices();
                setNotices(data || []);
            } catch (e) {
                console.error('Failed to load notices:', e);
            } finally {
                setLoading(false);
            }
        };
        loadNotices();

        const unsubscribe = storageService.subscribe(() => {
            setNotices(storageService.getNotices() || []);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>로딩 중...</div>;

    return (
        <div style={{ padding: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>공지</h2>
            {notices.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>공지사항이 없습니다</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {notices.map((notice, idx) => (
                        <div key={notice.id || idx} style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>{notice.title}</h3>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{notice.createdAt?.split('T')[0] || ''}</span>
                            </div>
                            {(notice.image || notice.imageUrl) && (
                                <img 
                                    src={notice.image || notice.imageUrl} 
                                    alt={notice.title} 
                                    style={{ width: '100%', borderRadius: '8px', marginBottom: '12px', cursor: 'pointer' }}
                                    onClick={() => window.open(notice.image || notice.imageUrl, '_blank')}
                                />
                            )}
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{notice.content}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// === Home Tab ===
const InstructorHome = ({ instructorName, attendance, attendanceLoading, instructorClasses = [] }) => {
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);
    const [pushMessage, setPushMessage] = useState('');
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [deviceOS, setDeviceOS] = useState('unknown');
    
    // [NEW] Smart Logic Debug State
    const [currentMatch, setCurrentMatch] = useState(null);
    
    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if ('Notification' in window) {
            setPushEnabled(Notification.permission === 'granted');
        }

        const ua = navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) {
            setDeviceOS('ios');
        } else if (/android/.test(ua)) {
            setDeviceOS('android');
        }

        const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                           window.navigator.standalone === true;
        setIsStandalone(isInstalled);

        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    // [PERF] checkLogic moved to parent InstructorPage for unified interval
    // getCurrentClass result is passed via props or context if needed
    // For now, we keep a local effect that runs once + on attendance change
    useEffect(() => {
        const checkLogic = async () => {
            const branchId = 'mapo'; 
            const match = await storageService.getCurrentClass(branchId, instructorName);
            
            if (!match) {
                 const match2 = await storageService.getCurrentClass('gwangheungchang', instructorName);
                 if (match2) setCurrentMatch({ ...match2, branch: '광흥창점' });
                 else setCurrentMatch(null);
            } else {
                 setCurrentMatch({ ...match, branch: '마포점' });
            }
        };
        checkLogic();
        // [PERF] Removed separate 30s interval - now synced with attendance refresh
    }, [attendance]); // Re-check when attendance updates

    const handleEnablePush = async () => {
        setPushLoading(true);
        setPushMessage('');
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const token = await getToken(messaging, {
                    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
                });
                if (token) {
                    await storageService.saveInstructorToken(token, instructorName);
                    setPushEnabled(true);
                    setPushMessage('✅ 알림이 활성화되었습니다!');
                } else {
                    setPushMessage('❌ 토큰을 가져올 수 없습니다.');
                }
            } else if (permission === 'denied') {
                setPushMessage('❌ 알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.');
            }
        } catch (e) {
            console.error('Push setup failed:', e);
            setPushMessage('❌ 알림 설정 실패: ' + e.message);
        } finally {
            setPushLoading(false);
        }
    };

    const handleDisablePush = () => {
        setPushMessage('ℹ️ 브라우저 설정에서 알림을 끌 수 있습니다.\n사이트 설정 > 알림 > 차단');
    };

    const handleInstallPWA = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setIsStandalone(true);
            setDeferredPrompt(null);
        }
    };

    // Split attendance by branch
    const ghcAttendance = attendance.filter(r => r.branchName === '광흥창점' || r.branchId === 'gwangheungchang');
    const mapoAttendance = attendance.filter(r => r.branchName === '마포점' || r.branchId === 'mapo');

    const renderAttendanceList = (list, title, color, branchId) => {
        const branchClasses = instructorClasses.filter(c => c.branchId === branchId);
        
        // Hide only if both attendance AND classes are empty
        if (list.length === 0 && branchClasses.length === 0) return null;
        
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const getStatus = (timeStr, duration = 60) => {
            const [h, m] = timeStr.split(':').map(Number);
            const start = h * 60 + m;
            const end = start + duration;
            if (currentMinutes < start) return { label: '예정', color: '#FFD93D' };
            if (currentMinutes >= start && currentMinutes < end) return { label: '진행 중', color: '#4CAF50' };
            return { label: '종료', color: 'gray' };
        };

        return (
            <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: color, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                        {title}
                    </div>
                    <span style={{ opacity: 0.6, fontSize: '0.8rem', fontWeight: 'normal' }}>총 {list.length}명 출석</span>
                </h4>

                {/* 오늘 수업 목록 */}
                <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {branchClasses.map((cls, idx) => {
                        const status = getStatus(cls.time, cls.duration);
                        return (
                            <div key={idx} style={{ 
                                background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '6px',
                                fontSize: '0.75rem', border: `1px solid ${status.color}44`, display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                <span style={{ color: status.color, fontWeight: 'bold' }}>• {status.label}</span>
                                <span style={{ color: 'white' }}>{cls.time} {cls.title}</span>
                            </div>
                        );
                    })}
                </div>

                {/* 출석 명단 */}
                {list.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {list.map((record, idx) => (
                            <div key={record.id || idx} style={{ 
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px',
                                borderLeft: `2px solid ${color}`
                            }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{record.memberName}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{record.className}</div>
                                </div>
                                <div style={{ color: 'var(--primary-gold)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                    {record.timestamp?.split('T')[1]?.slice(0, 5) || ''}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', padding: '8px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px' }}>
                        출석 데이터가 없습니다
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: '16px' }}>
            {/* Logic Status Monitor */}
            <div style={{ 
                background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.9), rgba(20, 20, 30, 0.95))', 
                border: '2px solid var(--primary-gold)', 
                boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)', // Soft gold glow
                padding: '16px', 
                borderRadius: '16px', // Slightly more rounded
                marginBottom: '16px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ // Subtle shine effect overlay
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%)',
                    pointerEvents: 'none',
                    transform: 'translate(0, 0)'
                }} />
                <h3 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🕒 현재 출석 매칭 시스템
                </h3>
                {currentMatch ? (
                    <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary-gold)', marginBottom: '4px' }}>
                            {currentMatch.instructor} 선생님 ({currentMatch.branch})
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'white' }}>{currentMatch.title}</div>
                        {currentMatch.debugReason && (
                            <div style={{ fontSize: '0.85rem', color: '#4CAF50', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ opacity: 0.8 }}>상태:</span>
                                <span style={{ fontWeight: 'bold' }}>{currentMatch.debugReason}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>현재 진행/대기 중인 수업 없음</div>
                        <div style={{ fontSize: '0.8rem', color: 'gray', marginTop: '4px' }}>자율수련 모드로 동작 중</div>
                    </div>
                )}
            </div>

            {/* Attendance */}
            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>📋 나의 오늘 출석현황</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{todayStr} ({attendance.length}명)</span>
                </div>
                
                {attendanceLoading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>로딩 중...</div>
                ) : (
                    <>
                        {renderAttendanceList(ghcAttendance, '광흥창점', 'var(--primary-gold)', 'gwangheungchang')}
                        {renderAttendanceList(mapoAttendance, '마포점', '#FF6B6B', 'mapo')}
                    </>
                )}
            </div>

            {/* Push Notification */}
            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    {pushEnabled ? <BellRinging size={24} color="var(--primary-gold)" weight="fill" /> : <Bell size={24} color="var(--text-secondary)" />}
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>나의 수업 출석회원 알림</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            회원 출석 시 알림 받기
                        </p>
                    </div>
                </div>
                
                {pushEnabled ? (
                    <button onClick={handleDisablePush} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <BellRinging size={18} weight="fill" /> 알림 ON
                    </button>
                ) : (
                    <button onClick={handleEnablePush} disabled={pushLoading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: pushLoading ? 'var(--bg-input)' : 'var(--primary-gold)', color: pushLoading ? 'var(--text-secondary)' : 'black', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>
                        {pushLoading ? '설정 중...' : '🔔 알림 허용하기'}
                    </button>
                )}
                
                {pushMessage && (
                    <p style={{ marginTop: '8px', fontSize: '0.85rem', textAlign: 'center', color: pushMessage.includes('✅') ? '#4CAF50' : 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{pushMessage}</p>
                )}
            </div>

            {/* PWA Install */}
            {!isStandalone && (deviceOS === 'ios' || deviceOS === 'android') && (
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>📲 홈 화면에 추가</h3>
                    {deviceOS === 'android' && deferredPrompt ? (
                        <button onClick={handleInstallPWA} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--primary-gold)', color: 'black', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>
                            홈 화면에 설치하기
                        </button>
                    ) : (
                        <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            {deviceOS === 'ios' ? 'Safari 공유 버튼 ↑ → "홈 화면에 추가"' : 'Chrome 메뉴 ⋮ → "홈 화면에 추가"'}
                        </div>
                    )}
                </div>
            )}

            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '8px' }}>
                {instructorName} 선생님으로 로그인됨
            </div>
        </div>
    );
};

// === Main Page ===
const InstructorPage = () => {
    const [instructorName, setInstructorName] = useState(localStorage.getItem('instructorName') || '');
    const [instructors, setInstructors] = useState([]);
    const [activeTab, setActiveTab] = useState('home');
    const [loading, setLoading] = useState(true);

    // AI Greeting State (Global)
    const [aiGreeting, setAiGreeting] = useState('');
    
    // Attendance State (Global)
    const [attendance, setAttendance] = useState([]);
    const [instructorClasses, setInstructorClasses] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(true);
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const hour = new Date().getHours();

    const branches = useMemo(() => [
        { id: 'gwangheungchang', name: '광흥창점' },
        { id: 'mapo', name: '마포점' }
    ], []);

    // Load Instructors
    useEffect(() => {
        const loadInstructors = async () => {
            try {
                const insts = await storageService.getInstructors();
                if (insts && insts.length > 0) {
                    setInstructors(insts);
                }
            } catch (e) {
                console.error('Failed to load instructors:', e);
            } finally {
                setLoading(false);
            }
        };
        loadInstructors();
    }, []);

    // Load Attendance (Global) - [PERF] Single 30s interval for all refreshes
    useEffect(() => {
        if (!instructorName) return;

        const loadAttendance = async () => {
            try {
                const attendancePromises = branches.map(b => storageService.getAttendanceByDate(todayStr, b.id));
                const classPromises = branches.map(b => storageService.getDailyClasses(b.id, instructorName));
                
                const [attendanceResults, classResults] = await Promise.all([
                    Promise.all(attendancePromises),
                    Promise.all(classPromises)
                ]);
                
                let allAttendance = [];
                attendanceResults.forEach((data, idx) => {
                    const branchName = branches[idx].name;
                    const branchId = branches[idx].id;
                    const branchRecords = (data || []).map(r => ({ ...r, branchName, branchId }));
                    allAttendance = [...allAttendance, ...branchRecords];
                });

                let allMyClasses = [];
                classResults.forEach((data, idx) => {
                    const branchName = branches[idx].name;
                    const branchId = branches[idx].id;
                    const branchClasses = (data || []).map(c => ({ ...c, branchName, branchId }));
                    allMyClasses = [...allMyClasses, ...branchClasses];
                });

                const myAttendance = allAttendance.filter(a => a.instructor === instructorName);
                myAttendance.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                setAttendance(myAttendance);
                setInstructorClasses(allMyClasses);
            } catch (e) {
                console.error('Failed to load attendance:', e);
            } finally {
                setAttendanceLoading(false);
            }
        };
        
        console.time('[Instructor] Initial Load');
        loadAttendance().then(() => console.timeEnd('[Instructor] Initial Load'));

        // [PERF] Single unified interval (was 2 separate intervals)
        const interval = setInterval(loadAttendance, 30000);
        return () => clearInterval(interval);
    }, [instructorName, todayStr, branches]);

    // Initialize AI Greeting (Instant + Fetch)
    useEffect(() => {
        if (!instructorName) return;

        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()];
        
        // 1. Try Cache First for instant display
        const cacheKey = `ai_greeting_${instructorName}_${todayStr}_${hour}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            setAiGreeting(cached);
        } else {
            // If no cache, set default instant message (to avoid "Loading...")
            setAiGreeting(getDefaultGreeting(instructorName, hour, dayOfWeek));
        }

        // 2. Fetch fresh AI message in background (only if we have meaningful attendance data or no cache)
        const fetchAI = async () => {
            if (attendanceLoading) return; // Wait for attendance count
            
            try {
                // If we have cache and it's fresh enough (e.g. same session), maybe skip?
                // For now, always re-fetch to be fresh with attendance count changes.
                // But to avoid flickering, only update if different? 
                // Let's just fetch and update logic.
                
                const result = await storageService.getAIExperience(
                    instructorName,
                    attendance.length,
                    dayOfWeek,
                    hour,
                    null, null, null, null, 'ko', null, 'instructor'
                );
                
                const greetingText = typeof result === 'string' 
                    ? result 
                    : (result?.message || getDefaultGreeting(instructorName, hour, dayOfWeek, attendance.length));
                
                setAiGreeting(greetingText);
                localStorage.setItem(cacheKey, greetingText);
            } catch (e) {
                console.error('AI greeting background fetch failed:', e);
            }
        };

        if (!attendanceLoading) {
            fetchAI();
        }

    }, [instructorName, attendance.length, attendanceLoading, hour, todayStr]);

    const handleLogout = () => {
        localStorage.removeItem('instructorName');
        setInstructorName('');
        setAiGreeting('');
        setAttendance([]);
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100dvh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--primary-gold)' }}>로딩 중...</div>
            </div>
        );
    }

    if (!instructorName) {
        return (
            <>
                <CosmicParticles />
                <InstructorLogin onLogin={setInstructorName} instructors={instructors} />
            </>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'transparent', paddingBottom: '80px', position: 'relative' }}>
            <CosmicParticles />
            
            {/* Header */}
            <div style={{ background: 'rgba(20, 20, 25, 0.95)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', position: 'relative', zIndex: 2 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary-gold)' }}>복샘요가 강사</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{instructorName} 선생님</p>
                </div>
                <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <SignOut size={24} color="var(--text-secondary)" />
                </button>
            </div>

            {/* AI Greeting (Top of Content) */}
            <div style={{ 
                position: 'relative', zIndex: 1,
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)', 
                padding: '16px 20px', 
                borderBottom: '1px solid rgba(212, 175, 55, 0.1)'
            }}>
                <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.5, color: 'var(--text-primary)', textAlign: 'center', fontStyle: 'italic' }}>
                    &quot;{aiGreeting}&quot;
                </p>
            </div>

            {/* Content Area */}
            <div style={{ position: 'relative', zIndex: 1, minHeight: 'calc(100vh - 220px)' }}>
                {activeTab === 'home' && <InstructorHome instructorName={instructorName} attendance={attendance} attendanceLoading={attendanceLoading} instructorClasses={instructorClasses} />}
                {activeTab === 'schedule' && <InstructorSchedule instructorName={instructorName} />}
                {activeTab === 'notices' && <InstructorNotices />}
            </div>

            {/* Bottom Navigation */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-surface)',
                display: 'flex', justifyContent: 'space-around', padding: '8px 0', borderTop: '1px solid var(--border-color)',
                zIndex: 10
            }}>
                <TabButton icon={<House size={24} />} label="홈" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                <TabButton icon={<CalendarBlank size={24} />} label="시간표" active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} />
                <TabButton icon={<Bell size={24} />} label="공지" active={activeTab === 'notices'} onClick={() => setActiveTab('notices')} />
            </div>
        </div>
    );
};

const TabButton = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        style={{
            background: 'none', 
            border: 'none', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '4px',
            color: active ? 'var(--primary-gold)' : 'var(--text-secondary)', 
            cursor: 'pointer',
            padding: '12px 20px',
            minWidth: '64px',
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            transition: 'transform 0.1s, opacity 0.1s'
        }}
    >
        {icon}
        <span style={{ fontSize: '0.75rem' }}>{label}</span>
    </button>
);

const navBtnStyle = {
    background: 'var(--bg-input)', border: 'none', color: 'var(--text-primary)', width: '36px', height: '36px',
    borderRadius: '50%', cursor: 'pointer', fontSize: '1rem'
};

export default InstructorPage;
