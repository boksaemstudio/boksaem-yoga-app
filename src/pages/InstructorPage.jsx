import { useState, useEffect } from 'react';
import { CalendarBlank, Bell, BellRinging, List, SignOut, User, Phone, Gear } from '@phosphor-icons/react';
import { storageService } from '../services/storage';
import { getMonthlyClasses } from '../services/scheduleService';
import { STUDIO_CONFIG } from '../studioConfig';
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
                const data = await storageService.getNotices();
                setNotices(data || []);
            } catch (e) {
                console.error('Failed to load notices:', e);
            } finally {
                setLoading(false);
            }
        };
        loadNotices();
    }, []);

    if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>로딩 중...</div>;

    return (
        <div style={{ padding: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>공지사항</h2>
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
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{notice.content}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// === Attendance Tab ===
const InstructorAttendance = ({ instructorName, branchId }) => {
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        const loadAttendance = async () => {
            try {
                // Get today's attendance records
                const data = await storageService.getAttendanceByDate(todayStr, branchId);
                // Filter for this instructor's classes
                const myAttendance = (data || []).filter(a => a.instructor === instructorName);
                setAttendance(myAttendance);
            } catch (e) {
                console.error('Failed to load attendance:', e);
            } finally {
                setLoading(false);
            }
        };
        loadAttendance();
        
        // Refresh every 30 seconds
        const interval = setInterval(loadAttendance, 30000);
        return () => clearInterval(interval);
    }, [instructorName, branchId, todayStr]);

    if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>로딩 중...</div>;

    return (
        <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>오늘 출석현황</h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{todayStr}</span>
            </div>
            
            {attendance.length === 0 ? (
                <div style={{ background: 'var(--bg-surface)', padding: '30px', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>오늘 내 수업에 출석한 회원이 없습니다</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {attendance.map((record, idx) => (
                        <div key={record.id || idx} style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{record.memberName}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{record.className}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ color: 'var(--primary-gold)', fontWeight: 'bold' }}>{record.timestamp?.split('T')[1]?.slice(0, 5) || ''}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                💡 30초마다 자동으로 새로고침됩니다
            </div>
        </div>
    );
};

// === Settings Tab with Push Notification ===
const InstructorSettings = ({ instructorName }) => {
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);
    const [pushMessage, setPushMessage] = useState('');

    useEffect(() => {
        // Check if push is already enabled
        const checkPushStatus = async () => {
            if ('Notification' in window) {
                setPushEnabled(Notification.permission === 'granted');
            }
        };
        checkPushStatus();
    }, []);

    const handleEnablePush = async () => {
        setPushLoading(true);
        setPushMessage('');
        
        try {
            // Request notification permission
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                // Get FCM token
                const token = await getToken(messaging, {
                    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
                });
                
                if (token) {
                    // Save token with instructor role
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

    return (
        <div style={{ padding: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>설정</h2>
            
            {/* Push Notification Section */}
            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    {pushEnabled ? <BellRinging size={28} color="var(--primary-gold)" weight="fill" /> : <Bell size={28} color="var(--text-secondary)" />}
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>출석 알림</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            회원이 내 수업에 출석하면 알림을 받습니다
                        </p>
                    </div>
                </div>
                
                {pushEnabled ? (
                    <div style={{ padding: '12px', background: 'rgba(76, 175, 80, 0.2)', borderRadius: '8px', color: '#4CAF50', textAlign: 'center' }}>
                        ✓ 알림이 활성화되어 있습니다
                    </div>
                ) : (
                    <button
                        onClick={handleEnablePush}
                        disabled={pushLoading}
                        style={{
                            width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                            background: pushLoading ? 'var(--bg-input)' : 'var(--primary-gold)',
                            color: pushLoading ? 'var(--text-secondary)' : 'black',
                            fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        <BellRinging size={20} />
                        {pushLoading ? '설정 중...' : '알림 허용하기'}
                    </button>
                )}
                
                {pushMessage && (
                    <p style={{ marginTop: '12px', fontSize: '0.9rem', textAlign: 'center', color: pushMessage.includes('✅') ? '#4CAF50' : '#ff4757' }}>
                        {pushMessage}
                    </p>
                )}
            </div>

            {/* Add to Home Screen Section */}
            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <Gear size={28} color="var(--text-secondary)" />
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>홈 화면에 추가</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            앱처럼 빠르게 접속할 수 있어요
                        </p>
                    </div>
                </div>
                
                <div style={{ 
                    background: 'rgba(212, 175, 55, 0.1)', 
                    borderRadius: '10px', 
                    padding: '16px',
                    fontSize: '0.85rem',
                    lineHeight: 1.8,
                    color: 'var(--text-secondary)'
                }}>
                    <div style={{ marginBottom: '12px' }}>
                        <strong style={{ color: 'var(--primary-gold)' }}>📱 iPhone/iPad:</strong><br/>
                        Safari에서 <span style={{ color: 'white' }}>공유 버튼 ↑</span> → &quot;홈 화면에 추가&quot;
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                        <strong style={{ color: 'var(--primary-gold)' }}>🤖 Android:</strong><br/>
                        Chrome 메뉴 (⋮) → &quot;홈 화면에 추가&quot;
                    </div>
                    <div>
                        <strong style={{ color: 'var(--primary-gold)' }}>💻 PC:</strong><br/>
                        Chrome 주소창 오른쪽 설치 아이콘 클릭
                    </div>
                </div>
            </div>

            {/* Logged in info */}
            <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    로그인: <span style={{ color: 'var(--primary-gold)' }}>{instructorName}</span> 선생님
                </p>
            </div>
        </div>
    );
};

const InstructorPage = () => {
    const [instructorName, setInstructorName] = useState(localStorage.getItem('instructorName') || '');
    const [instructors, setInstructors] = useState([]);
    const [activeTab, setActiveTab] = useState('schedule');
    const [branchId, setBranchId] = useState('gwangheungchang');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadInstructors = async () => {
            try {
                const insts = await storageService.getInstructors();
                setInstructors(insts || []);
            } catch (e) {
                console.error('Failed to load instructors:', e);
            } finally {
                setLoading(false);
            }
        };
        loadInstructors();
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
            <div style={{ background: 'rgba(20, 20, 25, 0.9)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', position: 'relative', zIndex: 1, backdropFilter: 'blur(10px)' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-gold)' }}>복샘요가 강사</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{instructorName} 선생님</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                        style={{ background: 'var(--bg-input)', border: 'none', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem' }}
                    >
                        {STUDIO_CONFIG.BRANCHES.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <SignOut size={24} color="var(--text-secondary)" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'schedule' && <InstructorSchedule instructorName={instructorName} branchId={branchId} />}
            {activeTab === 'attendance' && <InstructorAttendance instructorName={instructorName} branchId={branchId} />}
            {activeTab === 'notices' && <InstructorNotices />}
            {activeTab === 'settings' && <InstructorSettings instructorName={instructorName} />}

            {/* Bottom Navigation */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-surface)',
                display: 'flex', justifyContent: 'space-around', padding: '12px 0', borderTop: '1px solid var(--border-color)'
            }}>
                <TabButton icon={<CalendarBlank size={24} />} label="시간표" active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} />
                <TabButton icon={<List size={24} />} label="출석현황" active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} />
                <TabButton icon={<Bell size={24} />} label="공지" active={activeTab === 'notices'} onClick={() => setActiveTab('notices')} />
                <TabButton icon={<Gear size={24} />} label="설정" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
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
