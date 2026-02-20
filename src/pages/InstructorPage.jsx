import { useState, useEffect, useMemo, useRef } from 'react';
import { CalendarBlank, Bell, House, SignOut } from '@phosphor-icons/react';
import { storageService } from '../services/storage';
import { getKSTHour } from '../utils/dates';
import CosmicParticles from '../components/common/CosmicParticles';

import InstructorLogin from '../components/instructor/InstructorLogin';
import InstructorSchedule from '../components/instructor/InstructorSchedule';
import InstructorNotices from '../components/instructor/InstructorNotices';
import InstructorHome from '../components/instructor/InstructorHome';

// === Helper for Default Greeting ===
const getDefaultGreeting = (name, h, day) => {
    const timeGreeting = h < 12 ? '좋은 아침이에요' : h < 17 ? '오늘도 좋은 오후예요' : '수고하셨어요';
    const dayContext = day === '월' ? '새로운 한 주의 시작!' : 
                      day === '금' ? '즐거운 금요일!' : 
                      (day === '토' || day === '일') ? '행복한 주말!' : '';
    return `${name} 선생님, ${timeGreeting} 🧘‍♀️ ${dayContext}`;
};

// === Main Page ===
const InstructorPage = () => {
    const [instructorName, setInstructorName] = useState(localStorage.getItem('instructorName') || '');
    const [instructors, setInstructors] = useState([]);
    const [activeTab, setActiveTab] = useState('home');
    const [loading, setLoading] = useState(true);
    
    // Subscription Cleanup Ref
    const unsubscribesRef = useRef([]);

    // AI Greeting State (Global)
    const [aiGreeting, setAiGreeting] = useState('');
    const [aiGreetingLoading, setAiGreetingLoading] = useState(false); // [AI] 로딩 애니메이션
    const [aiEnhancedGreeting, setAiEnhancedGreeting] = useState(null); // [AI] AI 보강 메시지
    
    // Attendance State (Global)
    const [attendance, setAttendance] = useState([]);
    const [instructorClasses, setInstructorClasses] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(true);
    const todayStr = useMemo(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }), []);
    const hour = getKSTHour();

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

    // Load Attendance & Schedule in Real-time
    useEffect(() => {
        if (!instructorName) return;

        // 1. Initial Load for Classes & Attendance (Baseline)
        const loadInitialData = async () => {
            try {
                // Fetch Classes (Static for the day)
                const classPromises = branches.map(b => storageService.getDailyClasses(b.id, instructorName));
                
                // Fetch Attendance (Baseline)
                const attendancePromises = branches.map(b => storageService.getAttendanceByDate(todayStr, b.id));

                const [classResults, attendanceResults] = await Promise.all([
                    Promise.all(classPromises),
                    Promise.all(attendancePromises)
                ]);
                
                // Process Classes
                let allMyClasses = [];
                classResults.forEach((data, idx) => {
                    const branchName = branches[idx].name;
                    const branchId = branches[idx].id;
                    const branchClasses = (data || []).map(c => ({ ...c, branchName, branchId }));
                    allMyClasses = [...allMyClasses, ...branchClasses];
                });
                setInstructorClasses(allMyClasses);

                // Process Attendance Baseline
                let allBaselineAttendance = [];
                attendanceResults.forEach((data, idx) => {
                    const branchName = branches[idx].name;
                    const branchId = branches[idx].id;
                    
                    const myBranchClasses = allMyClasses.filter(c => c.branchId === branchId);
                    const myClassTitles = new Set(myBranchClasses.map(c => c.title));

                    console.log(`[InstructorPage] Branch: ${branchId}, Fetched: ${data?.length} logs`);
                    
                    const branchRecords = (data || [])
                        .filter(r => {
                            // Relaxed Filtering Logic
                            const recordInstructor = r.instructor ? r.instructor.trim() : '';
                            const currentInstructor = instructorName.trim();
                            
                            const isExactMatch = recordInstructor === currentInstructor;
                            const isUndesignated = recordInstructor === '미지정' || !recordInstructor;
                            const isClassMatch = myClassTitles.has(r.className);

                            // Debug logging for unmatched but potential candidates
                            if (isUndesignated && isClassMatch) {
                                console.log('[InstructorPage] Included Undesignated:', r);
                            }

                            return isExactMatch || (isUndesignated && isClassMatch);
                        })
                        .map(r => ({ ...r, branchName, branchId }));
                    allBaselineAttendance = [...allBaselineAttendance, ...branchRecords];
                });
                
                allBaselineAttendance.forEach(a => a._ts = new Date(a.timestamp).getTime());
                setAttendance(allBaselineAttendance.sort((a, b) => b._ts - a._ts));
                setAttendanceLoading(false); // Initial load done

                // 2. Real-time Subscription (Moved inside to access allMyClasses)
                const newUnsubscribes = branches.map(branch => {
                    return storageService.subscribeAttendance(todayStr, branch.id, (records) => {
                        setAttendance(prev => {
                            const otherBranches = prev.filter(r => r.branchId !== branch.id);
                            const branchName = branch.name;
                            const branchId = branch.id;
                            
                            // Re-filter with the known classes
                            const myBranchClasses = allMyClasses.filter(c => c.branchId === branchId);
                            const myClassTitles = new Set(myBranchClasses.map(c => c.title));

                            const branchRecords = (records || [])
                                .filter(r => {
                                    const recordInstructor = r.instructor ? r.instructor.trim() : '';
                                    const currentInstructor = instructorName.trim();
                                    
                                    const isExactMatch = recordInstructor === currentInstructor;
                                    const isUndesignated = recordInstructor === '미지정' || !recordInstructor;
                                    const isClassMatch = myClassTitles.has(r.className);
                                    
                                    return isExactMatch || (isUndesignated && isClassMatch);
                                })
                                .map(r => ({ ...r, branchName, branchId }));
                            
                            const merged = [...otherBranches, ...branchRecords];
                            merged.sort((a, b) => {
                                const ta = a._ts || (a._ts = new Date(a.timestamp).getTime());
                                const tb = b._ts || (b._ts = new Date(b.timestamp).getTime());
                                return tb - ta;
                            });
                            return merged;
                        });
                    });
                });
                unsubscribesRef.current = newUnsubscribes;

            } catch (e) {
                console.error('Failed to load initial data:', e);
                setAttendanceLoading(false);
            }
        };

        loadInitialData();

        // Cleanup function
        return () => {
             if (unsubscribesRef.current) {
                unsubscribesRef.current.forEach(unsub => unsub());
             }
        };
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

        // 2. Fetch fresh AI message in background
        const fetchAI = async () => {
            if (attendanceLoading) return;
            
            setAiGreetingLoading(true); // [AI] 로딩 시작
            try {
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
                
                // [AI] AI 메시지가 기존과 다르면 보강 메시지로 추가 표시
                if (greetingText && greetingText !== aiGreeting && !result?.isFallback) {
                    setAiEnhancedGreeting(greetingText);
                } else {
                    setAiGreeting(greetingText);
                }
                localStorage.setItem(cacheKey, greetingText);
            } catch (e) {
                console.error('AI greeting background fetch failed:', e);
            } finally {
                setAiGreetingLoading(false); // [AI] 로딩 종료
            }
        };

        if (!attendanceLoading && !cached) {
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
                    <h1 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary-gold)' }}>복샘요가 선생님</h1>
                    <div style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{instructorName} 선생님</div>
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
                <div style={{ margin: 0, fontSize: '1rem', lineHeight: 1.5, color: 'var(--text-primary)', textAlign: 'center', fontStyle: 'italic' }}>
                    &quot;{aiGreeting}&quot;
                </div>
                {/* [AI] 보강 메시지 - 기존 인사말 아래 추가 */}
                {aiEnhancedGreeting && (
                    <div style={{
                        marginTop: '10px',
                        padding: '10px 14px',
                        background: 'rgba(212,175,55,0.08)',
                        border: '1px solid rgba(212,175,55,0.2)',
                        borderRadius: '12px',
                        animation: 'slideUp 0.6s ease-out',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '1rem', flexShrink: 0 }}>✨</span>
                        <span style={{
                            fontSize: '0.9rem',
                            color: 'rgba(255,255,255,0.85)',
                            lineHeight: 1.5,
                            fontWeight: 400,
                            fontStyle: 'italic',
                            wordBreak: 'keep-all'
                        }}>
                            {aiEnhancedGreeting}
                        </span>
                    </div>
                )}
                {/* [AI] 로딩 인디케이터 */}
                {aiGreetingLoading && (
                    <div style={{
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <div className="ai-thinking-icon" style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 256 256" fill="var(--primary-gold)">
                                <path d="M200,48H136V16a8,8,0,0,0-16,0V48H56A32,32,0,0,0,24,80v96a32,32,0,0,0,32,32h80v32a8,8,0,0,0,16,0V208h48a32,32,0,0,0,32-32V80A32,32,0,0,0,200,48ZM172,168H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Zm0-48H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Z"/>
                            </svg>
                        </div>
                        <span style={{
                            color: 'rgba(212,175,55,0.7)',
                            fontSize: '0.8rem',
                            fontWeight: 400,
                            animation: 'pulse 1.5s ease-in-out infinite'
                        }}>
                            AI가 오늘의 인사를 준비하고 있어요
                        </span>
                        <div style={{ display: 'flex', gap: '3px' }}>
                            {[0, 1, 2].map(i => (
                                <div key={i} style={{
                                    width: '4px', height: '4px',
                                    borderRadius: '50%',
                                    background: 'var(--primary-gold)',
                                    opacity: 0.6,
                                    animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
                                }} />
                            ))}
                        </div>
                    </div>
                )}
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
