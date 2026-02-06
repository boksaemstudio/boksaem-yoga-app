import { useState, useEffect } from 'react';
import { CalendarBlank, Bell, BellRinging, House, SignOut, User, Phone } from '@phosphor-icons/react';
import { storageService } from '../services/storage';
import { getMonthlyClasses } from '../services/scheduleService';
import { getToken } from 'firebase/messaging';
import { messaging } from '../firebase';
import CosmicParticles from '../components/common/CosmicParticles';

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
            <div style={{ background: 'rgba(20, 20, 25, 0.85)', padding: '40px', borderRadius: '20px', maxWidth: '400px', width: '100%', textAlign: 'center', backdropFilter: 'blur(15px)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
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
const InstructorSchedule = ({ instructorName, branchId }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [monthlyData, setMonthlyData] = useState({});
    const [selectedDate, setSelectedDate] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    useEffect(() => {
        const loadData = async () => {
            const data = await getMonthlyClasses(branchId, year, month);
            setMonthlyData(data);
        };
        loadData();
    }, [branchId, year, month]);

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    const hasMyClass = (dateStr) => {
        const classes = monthlyData[dateStr] || [];
        return classes.some(cls => cls.instructor === instructorName);
    };

    const renderCalendar = () => {
        const cells = [];
        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`empty-${i}`} style={{ padding: '8px' }}></div>);
        }
        // Day cells
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const hasClass = hasMyClass(dateStr);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            cells.push(
                <div
                    key={d}
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                        padding: '8px', textAlign: 'center', cursor: 'pointer', borderRadius: '8px',
                        background: isSelected ? 'var(--primary-gold)' : isToday ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                        color: isSelected ? 'black' : 'var(--text-primary)',
                        border: hasClass ? '2px solid var(--primary-gold)' : '2px solid transparent',
                        fontWeight: hasClass ? 'bold' : 'normal',
                        transition: 'all 0.2s'
                    }}
                >
                    {d}
                </div>
            );
        }
        return cells;
    };

    const selectedClasses = selectedDate ? (monthlyData[selectedDate] || []) : [];

    return (
        <div style={{ padding: '16px' }}>
            {/* Month Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button onClick={() => setCurrentDate(new Date(year, month - 2, 1))} style={navBtnStyle}>◀</button>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{year}년 {month}월</h2>
                <button onClick={() => setCurrentDate(new Date(year, month, 1))} style={navBtnStyle}>▶</button>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>🟡 내 수업 있는 날</span>
            </div>

            {/* Day Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                {dayNames.map(day => (
                    <div key={day} style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '8px' }}>{day}</div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '20px' }}>
                {renderCalendar()}
            </div>

            {/* Selected Day Classes */}
            {selectedDate && (
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px' }}>
                    <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>{selectedDate} 수업</h3>
                    {selectedClasses.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>수업이 없습니다</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {selectedClasses.map((cls, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        padding: '12px', borderRadius: '8px',
                                        background: cls.instructor === instructorName ? 'rgba(212, 175, 55, 0.2)' : 'var(--bg-input)',
                                        border: cls.instructor === instructorName ? '1px solid var(--primary-gold)' : '1px solid transparent'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold' }}>{cls.time}</span>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cls.instructor}</span>
                                    </div>
                                    <div style={{ marginTop: '4px' }}>{cls.title}</div>
                                </div>
                            ))}
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
                // First try to load with fallback to Firestore if cache is empty
                const data = await storageService.loadNotices();
                setNotices(data || []);
            } catch (e) {
                console.error('Failed to load notices:', e);
            } finally {
                setLoading(false);
            }
        };
        loadNotices();

        // Subscribe to real-time changes
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

// === Home Tab - 설정 + 출석현황 + AI 인사말 통합 ===
const InstructorHome = ({ instructorName, branchId }) => {
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);
    const [pushMessage, setPushMessage] = useState('');
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [deviceOS, setDeviceOS] = useState('unknown');
    const [attendance, setAttendance] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(true);
    const [aiGreeting, setAiGreeting] = useState('');
    const [greetingLoading, setGreetingLoading] = useState(true);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();

    useEffect(() => {
        // Check push status
        if ('Notification' in window) {
            setPushEnabled(Notification.permission === 'granted');
        }

        // Detect device OS
        const ua = navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) {
            setDeviceOS('ios');
        } else if (/android/.test(ua)) {
            setDeviceOS('android');
        }

        // Check if installed as PWA
        const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                           window.navigator.standalone === true;
        setIsStandalone(isInstalled);

        // Capture beforeinstallprompt for Android
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    // Load attendance
    useEffect(() => {
        const loadAttendance = async () => {
            try {
                const data = await storageService.getAttendanceByDate(todayStr, branchId);
                const myAttendance = (data || []).filter(a => a.instructor === instructorName);
                setAttendance(myAttendance);
            } catch (e) {
                console.error('Failed to load attendance:', e);
            } finally {
                setAttendanceLoading(false);
            }
        };
        loadAttendance();

        const unsubscribe = storageService.subscribe(() => {
            const data = storageService.getAttendance();
            const todayAttendance = data.filter(a => a.date === todayStr && a.branchId === branchId);
            const myAttendance = todayAttendance.filter(a => a.instructor === instructorName);
            setAttendance(myAttendance);
        });

        const interval = setInterval(loadAttendance, 30000);
        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [instructorName, branchId, todayStr]);

    // Load AI greeting
    useEffect(() => {
        const loadAIGreeting = async () => {
            try {
                const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()];
                
                // Get AI greeting for instructor
                const result = await storageService.getAIExperience(
                    instructorName,
                    attendance.length,
                    dayOfWeek,
                    hour,
                    null,
                    null,
                    null,
                    null,
                    'ko',
                    null,
                    'instructor'
                );
                
                // result is an object with { message, bgTheme, colorTone }
                const greetingText = typeof result === 'string' 
                    ? result 
                    : (result?.message || getDefaultGreeting(instructorName, hour, dayOfWeek, attendance.length));
                setAiGreeting(greetingText);
            } catch (e) {
                console.error('AI greeting failed:', e);
                const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()];
                setAiGreeting(getDefaultGreeting(instructorName, hour, dayOfWeek, attendance.length));
            } finally {
                setGreetingLoading(false);
            }
        };
        
        if (!attendanceLoading) {
            loadAIGreeting();
        }
    }, [instructorName, attendance.length, attendanceLoading, hour]);

    const getDefaultGreeting = (name, h, day) => {
        const timeGreeting = h < 12 ? '좋은 아침이에요' : h < 17 ? '오늘도 좋은 오후예요' : '수고하셨어요';
        const dayContext = day === '월' ? '새로운 한 주의 시작!' : 
                          day === '금' ? '즐거운 금요일!' : 
                          (day === '토' || day === '일') ? '행복한 주말!' : '';
        return `${name} 선생님, ${timeGreeting}! 🧘‍♀️${dayContext ? ' ' + dayContext : ''}`;
    };

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

    // Apply Instructor Manifest
    useEffect(() => {
        const link = document.querySelector("link[rel~='manifest']");
        if (link) {
            link.href = '/manifest-instructor.json';
            // Force browser to re-read manifest (sometimes needed)
            link.content = '/manifest-instructor.json';
        }
        return () => {
            if (link) {
                link.href = '/manifest.json';
            }
        };
    }, []);

    const handleInstallPWA = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsStandalone(true);
            }
            setDeferredPrompt(null);
        }
    };

    return (
        <div style={{ padding: '16px' }}>
            {/* AI Greeting Section */}
            <div style={{ 
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)', 
                padding: '20px', 
                borderRadius: '16px', 
                marginBottom: '20px',
                border: '1px solid rgba(212, 175, 55, 0.2)'
            }}>
                {greetingLoading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>✨ 인사말 준비중...</div>
                ) : (
                    <p style={{ 
                        margin: 0, 
                        fontSize: '1.1rem', 
                        lineHeight: 1.6,
                        color: 'var(--text-primary)',
                        textAlign: 'center'
                    }}>
                        {aiGreeting}
                    </p>
                )}
            </div>

            {/* Today's Attendance Section */}
            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>📋 오늘 출석현황</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{todayStr}</span>
                </div>
                
                {attendanceLoading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>로딩 중...</div>
                ) : attendance.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        오늘 내 수업에 출석한 회원이 없습니다
                    </div>
                ) : (
                    <>
                        <div style={{ 
                            background: 'rgba(212, 175, 55, 0.1)', 
                            padding: '12px', 
                            borderRadius: '8px', 
                            marginBottom: '12px',
                            textAlign: 'center'
                        }}>
                            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-gold)' }}>{attendance.length}</span>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>명 출석</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                            {attendance.map((record, idx) => (
                                <div key={record.id || idx} style={{ 
                                    background: 'rgba(255,255,255,0.03)', 
                                    padding: '10px 14px', 
                                    borderRadius: '8px', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center' 
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{record.memberName}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{record.className}</div>
                                    </div>
                                    <div style={{ color: 'var(--primary-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        {record.timestamp?.split('T')[1]?.slice(0, 5) || ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Push Notification Section */}
            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    {pushEnabled ? <BellRinging size={24} color="var(--primary-gold)" weight="fill" /> : <Bell size={24} color="var(--text-secondary)" />}
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>출석 알림</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            회원 출석 시 알림 받기
                        </p>
                    </div>
                </div>
                
                {pushEnabled ? (
                    <button
                        onClick={handleDisablePush}
                        style={{
                            width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
                            background: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50',
                            fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        <BellRinging size={18} weight="fill" />
                        알림 ON
                    </button>
                ) : (
                    <button
                        onClick={handleEnablePush}
                        disabled={pushLoading}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                            background: pushLoading ? 'var(--bg-input)' : 'var(--primary-gold)',
                            color: pushLoading ? 'var(--text-secondary)' : 'black',
                            fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer'
                        }}
                    >
                        {pushLoading ? '설정 중...' : '🔔 알림 허용하기'}
                    </button>
                )}
                
                {pushMessage && (
                    <p style={{ marginTop: '8px', fontSize: '0.85rem', textAlign: 'center', color: pushMessage.includes('✅') ? '#4CAF50' : 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                        {pushMessage}
                    </p>
                )}
            </div>

            {/* PWA Install Section - Only on mobile and not installed */}
            {!isStandalone && (deviceOS === 'ios' || deviceOS === 'android') && (
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>📲 홈 화면에 추가</h3>
                    
                    {deviceOS === 'android' && deferredPrompt ? (
                        <button
                            onClick={handleInstallPWA}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                                background: 'var(--primary-gold)', color: 'black',
                                fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer'
                            }}
                        >
                            홈 화면에 설치하기
                        </button>
                    ) : (
                        <div style={{ 
                            background: 'rgba(212, 175, 55, 0.1)', 
                            padding: '12px', 
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            textAlign: 'center'
                        }}>
                            {deviceOS === 'ios' 
                                ? 'Safari 공유 버튼 ↑ → "홈 화면에 추가"'
                                : 'Chrome 메뉴 ⋮ → "홈 화면에 추가"'}
                        </div>
                    )}
                </div>
            )}

            {/* Login info */}
            <div style={{ 
                textAlign: 'center', 
                fontSize: '0.85rem', 
                color: 'var(--text-secondary)',
                padding: '8px'
            }}>
                {instructorName} 선생님으로 로그인됨
            </div>
        </div>
    );
};


const InstructorPage = () => {
    const [instructorName, setInstructorName] = useState(localStorage.getItem('instructorName') || '');
    const [instructors, setInstructors] = useState([]);
    const [activeTab, setActiveTab] = useState('home');
    const [branchId] = useState('gwangheungchang');
    const [loading, setLoading] = useState(true);

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

        // Subscribe to any changes in settings/instructors
        const unsubscribe = storageService.subscribe(async () => {
            const insts = await storageService.getInstructors();
            setInstructors(insts || []);
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('instructorName');
        setInstructorName('');
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <div style={{ background: 'rgba(20, 20, 25, 0.9)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', position: 'relative', zIndex: 2, backdropFilter: 'blur(10px)' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-gold)' }}>복샘요가 강사</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{instructorName} 선생님</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <SignOut size={24} color="var(--text-secondary)" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div style={{ position: 'relative', zIndex: 1, minHeight: 'calc(100vh - 160px)' }}>
                {activeTab === 'home' && <InstructorHome instructorName={instructorName} branchId={branchId} />}
                {activeTab === 'schedule' && <InstructorSchedule instructorName={instructorName} branchId={branchId} />}
                {activeTab === 'notices' && <InstructorNotices />}
            </div>

            {/* Bottom Navigation */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-surface)',
                display: 'flex', justifyContent: 'space-around', padding: '12px 0', borderTop: '1px solid var(--border-color)'
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
            background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            color: active ? 'var(--primary-gold)' : 'var(--text-secondary)', cursor: 'pointer'
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
