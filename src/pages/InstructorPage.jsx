import { useState, useEffect, useMemo, useRef } from 'react';
import { CaretLeft, CaretRight, User, SignOut, DotsThreeVertical, List, X, House, Calendar, ChatCircleText, Table, UsersFour, ChartBar, Bell, BellSlash, SpinnerGap, CalendarBlank } from '@phosphor-icons/react';
import { useStudioConfig } from '../contexts/StudioContext';
import { storageService } from '../services/storage';
import { getKSTHour, getKSTDayOfWeek } from '../utils/dates';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import CosmicParticles from '../components/common/CosmicParticles';

import InstructorLogin from '../components/instructor/InstructorLogin';
import InstructorSchedule from '../components/instructor/InstructorSchedule';
import InstructorNotices from '../components/instructor/InstructorNotices';
import InstructorHome from '../components/instructor/InstructorHome';
import InstallGuideModal from '../components/InstallGuideModal';
import InstallBanner from '../components/common/InstallBanner';

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
    const { config } = useStudioConfig();
    const [instructorName, setInstructorName] = useState(localStorage.getItem('instructorName') || '');
    const [instructors, setInstructors] = useState([]);
    const [activeTab, setActiveTab] = useState('home');
    const [loading, setLoading] = useState(true);
    
    // Subscription Cleanup Ref
    const unsubscribesRef = useRef([]);
    const lastAiFetchArgs = useRef(''); // [FIX] AI 중복 호출 방지용 상태 추적

    // AI Greeting State (Global)
    const [aiGreeting, setAiGreeting] = useState('');
    const [aiGreetingLoading, setAiGreetingLoading] = useState(false); // [AI] 로딩 애니메이션
    const [aiEnhancedGreeting, setAiEnhancedGreeting] = useState(null); // [AI] AI 보강 메시지
    const [showInstallGuide, setShowInstallGuide] = useState(false); // [PWA] Install Guide
    const [pushEnabled, setPushEnabled] = useState('Notification' in window && Notification.permission === 'granted');
    const [pushLoading, setPushLoading] = useState(false);
    
    // Attendance State (Global)
    const [attendance, setAttendance] = useState([]);
    const [instructorClasses, setInstructorClasses] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(true);
    const todayStr = useMemo(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }), []);
    const hour = getKSTHour();

    const branches = config.BRANCHES || [];

    // Load Instructors
    useEffect(() => {
        const loadInstructors = async () => {
            try {
                const insts = await storageService.getInstructors();
                if (insts && insts.length > 0) {
                    setInstructors(insts);
                    
                    // [DEMO] 데모 사이트 첫 진입 시 실제 등록된 첫 번째 강사로 자동 로그인 (근본적 해결)
                    const isDemoSite = window.location.hostname.includes('passflow-demo');
                    if (isDemoSite && !localStorage.getItem('instructorName') && !sessionStorage.getItem('demoLogout')) {
                        const firstInst = typeof insts[0] === 'string' ? insts[0] : insts[0].name;
                        localStorage.setItem('instructorName', firstInst);
                        setInstructorName(firstInst);
                    }
                }
            } catch (e) {
                console.error('Failed to load instructors:', e);
            } finally {
                setLoading(false);
            }
        };
        loadInstructors();
    }, []);

    // [Deep Link] Parse 'tab' from URL to auto-navigate
    useEffect(() => {
        const handleLocationChange = () => {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            
            if (tab && ['home', 'schedule', 'notices'].includes(tab)) {
                console.log(`[InstructorPage] Navigating to tab: ${tab}`);
                setActiveTab(tab);
                
                // Clear the query param after use so browser reload returns to home
                setTimeout(() => {
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, '', newUrl);
                }, 500);
            }
        };

        // Initial check
        handleLocationChange();

        // Listen for history changes
        window.addEventListener('popstate', handleLocationChange);

        // [FIX] 이벤트 기반 deep link 감지 (setInterval 폴링 제거 → 성능 개선)
        window.addEventListener('hashchange', handleLocationChange);

        return () => {
            window.removeEventListener('popstate', handleLocationChange);
            window.removeEventListener('hashchange', handleLocationChange);
        };
    }, []);

    // [PWA] Install Guide State is handled via InstallBanner component now.

    // [PUSH] Auto-register push token — Auth가 준비된 후에만 실행
    useEffect(() => {
        if (!instructorName) return;
        
        // [ROOT FIX] onAuthStateChanged로 Auth 준비 확인 후 push 등록
        // setTimeout 3초 hack 제거 → auth 이벤트 기반으로 확실하게
        const unsubAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) return; // Auth 아직 안 됨 — 기다림
            
            try {
                if ('Notification' in window && Notification.permission === 'granted') {
                    console.log(`[InstructorPage] Auth ready (${user.uid}), registering push for: ${instructorName}`);
                    await storageService.requestInstructorPushPermission(instructorName);
                }
            } catch (e) {
                console.error('[InstructorPage] Push registration failed:', e);
            }
            
            // 한 번만 실행 후 리스너 정리
            unsubAuth();
        });
        
        return () => unsubAuth();
    }, [instructorName]);

    // Load Attendance & Schedule in Real-time
    useEffect(() => {
        if (!instructorName) return;

        // 1. Initial Load for Classes & Attendance (Baseline)
        const loadInitialData = async () => {
            try {
                // Fetch Classes (Static for the day)
                const classPromises = branches.map(b => storageService.getDailyClasses(b.id, instructorName, todayStr));
                
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

    // Initialize AI Greeting (Instant + Background Fetch)
    // [FIX] 의존성에서 attendance.length 제거 → 깜빡임 방지
    useEffect(() => {
        if (!instructorName) return;

        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][getKSTDayOfWeek()];
        
        // 1. Try Cache First for instant display
        const cacheKey = `ai_greeting_${instructorName}_${todayStr}_${hour}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            setAiGreeting(cached);
            // 캐시가 있으면 AI 재호출하지 않음 → 깜빡임 완전 방지
            return;
        }
        
        // If no cache, set default instant message
        const defaultMsg = getDefaultGreeting(instructorName, hour, dayOfWeek);
        setAiGreeting(defaultMsg);

        // 2. Fetch fresh AI message in background (한 번만)
        const fetchAI = async () => {
            const currentArgs = `${instructorName}_${hour}_${todayStr}`;
            if (lastAiFetchArgs.current === currentArgs) return;
            lastAiFetchArgs.current = currentArgs;
            
            setAiGreetingLoading(true);
            try {
                const result = await storageService.getAIExperience(
                    instructorName,
                    0, // attendance count는 AI에 꼭 필요하지 않음
                    dayOfWeek,
                    hour,
                    null, null, null, null, 'ko', null, 'instructor'
                );
                
                const greetingText = typeof result === 'string' 
                    ? result 
                    : (result?.message || defaultMsg);
                
                // [FIX] 직접 aiGreeting을 교체 (aiEnhancedGreeting 대신) → 깜빡임 방지
                if (greetingText && !result?.isFallback) {
                    setAiGreeting(greetingText);
                }
                localStorage.setItem(cacheKey, greetingText);
            } catch (e) {
                console.error('AI greeting background fetch failed:', e);
            } finally {
                setAiGreetingLoading(false);
            }
        };

        // 약간의 딜레이 후 AI 호출 (초기 렌더 안정화)
        const timer = setTimeout(fetchAI, 1000);
        return () => clearTimeout(timer);

    }, [instructorName, hour, todayStr]); // [FIX] attendance.length, attendanceLoading 제거

    const handleLogout = () => {
        if (window.confirm('로그아웃 하시겠습니까?')) {
            localStorage.removeItem('instructorName');
            sessionStorage.setItem('demoLogout', 'true'); // 로그아웃 시 다시 자동 로그인 방지
            setInstructorName('');
            setAiGreeting('');
            setAttendance([]);
        }
    };

    const handlePushToggle = async () => {
        setPushLoading(true);
        try {
            if (pushEnabled) {
                await storageService.deletePushToken('instructor');
                setPushEnabled(false);
            } else {
                const result = await storageService.requestInstructorPushPermission(instructorName);
                setPushEnabled(result);
            }
        } catch (e) {
            console.error('[InstructorPage] Push toggle failed:', e);
        } finally {
            setPushLoading(false);
        }
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
                    <h1 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary-gold)' }}>{config.IDENTITY?.NAME || 'Studio'} 선생님</h1>
                    <div style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{instructorName} 선생님</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={handlePushToggle}
                        disabled={pushLoading}
                        style={{
                            background: pushEnabled ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.05)',
                            border: pushEnabled ? '1px solid rgba(var(--primary-rgb), 0.3)' : '1px solid rgba(255,255,255,0.1)',
                            color: pushEnabled ? 'var(--primary-gold)' : 'var(--text-secondary)',
                            cursor: pushLoading ? 'wait' : 'pointer',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            opacity: pushLoading ? 0.6 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        {pushLoading ? (
                            <><SpinnerGap size={16} style={{ animation: 'spin 0.6s linear infinite' }} /> 설정 중</>
                        ) : pushEnabled ? (
                            <><Bell size={16} weight="fill" /> 알림ON</>
                        ) : (
                            <><BellSlash size={16} /> 알림OFF</>
                        )}
                    </button>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <SignOut size={24} color="var(--text-secondary)" />
                    </button>
                </div>
            </div>

            {/* AI Greeting (Top of Content) */}
            <div style={{ 
                position: 'relative', zIndex: 1,
                background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.15) 0%, rgba(var(--primary-rgb), 0.05) 100%)', 
                padding: '16px 20px', 
                borderBottom: '1px solid rgba(var(--primary-rgb), 0.1)'
            }}>
                <div style={{ margin: 0, fontSize: '1rem', lineHeight: 1.5, color: 'var(--text-primary)', textAlign: 'center', fontStyle: 'italic' }}>
                    &quot;{aiGreeting}&quot;
                </div>
                {/* [AI] 보강 메시지 - 기존 인사말 아래 추가 */}
                {aiEnhancedGreeting && (
                    <div style={{
                        marginTop: '10px',
                        padding: '10px 14px',
                        background: 'rgba(var(--primary-rgb), 0.08)',
                        border: '1px solid rgba(var(--primary-rgb), 0.2)',
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
                            color: 'rgba(var(--primary-rgb), 0.7)',
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
                <TabButton icon={<CalendarBlank size={24} />} label={config?.POLICIES?.ALLOW_BOOKING ? "시간표/예약현황" : "시간표"} active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} />
                <TabButton icon={<Bell size={24} />} label="공지" active={activeTab === 'notices'} onClick={() => setActiveTab('notices')} />
            </div>

            <InstallBanner onManualInstallClick={() => setShowInstallGuide(true)} />
            <InstallGuideModal isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />
            <div style={{ textAlign: 'center', padding: '16px 0 80px', position: 'relative', zIndex: 1 }}>
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>개인정보처리방침</a>
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
