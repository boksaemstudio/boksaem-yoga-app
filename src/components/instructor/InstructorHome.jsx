import { useState, useEffect } from 'react';
import { Bell, BellRinging, Share, SignOut, PlusSquare } from '@phosphor-icons/react';
import { getToken } from 'firebase/messaging';
import { messaging } from '../../firebase';
import { storageService } from '../../services/storage';
import { getKSTTotalMinutes } from '../../utils/dates';

const InstructorHome = ({ instructorName, attendance, attendanceLoading, instructorClasses = [] }) => {
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);
    const [pushMessage, setPushMessage] = useState('');
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [deviceOS, setDeviceOS] = useState('unknown');
    
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPushEnabled(window.Notification.permission === 'granted');
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


    const handleEnablePush = async () => {
        setPushLoading(true);
        setPushMessage('');
        try {
            if (!('Notification' in window)) {
                setPushMessage('❌ 이 브라우저는 알림을 지원하지 않습니다. ' + 
                    (deviceOS === 'ios' ? "아이폰은 '홈 화면에 추가'를 통해 앱을 설치해야 알림 설정이 가능합니다." : "크롬 등 최신 브라우저를 사용해 주세요."));
                return;
            }

            const permission = await window.Notification.requestPermission();
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
        } else {
            // Manual Guide
            if (deviceOS === 'ios') {
                setPushMessage('ℹ️ 아이폰 설치 방법: Safari 하단 공유 버튼(↑) 클릭 > "홈 화면에 추가"를 눌러주세요.');
            } else if (deviceOS === 'android') {
                setPushMessage('ℹ️ 안드로이드 설치 방법: 브라우저 우측 상단 메뉴(⋮) 클릭 > "홈 화면에 추가" 혹은 "앱 설치"를 눌러주세요.');
            } else {
                setPushMessage('ℹ️ 브라우저 메뉴에서 "홈 화면에 추가"를 선택하여 앱을 설치하실 수 있습니다.');
            }
        }
    };

    // Split attendance by branch
    const ghcAttendance = attendance.filter(r => r.branchName === '광흥창점' || r.branchId === 'gwangheungchang');
    const mapoAttendance = attendance.filter(r => r.branchName === '마포점' || r.branchId === 'mapo');

    const renderAttendanceList = (list, title, color, branchId) => {
        const branchClasses = instructorClasses.filter(c => c.branchId === branchId);
        
        // Hide only if both attendance AND classes are empty
        if (list.length === 0 && branchClasses.length === 0) return null;
        
        const currentMinutes = getKSTTotalMinutes();

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
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {record.memberName}
                                        {(() => {
                                            // 신규 배지: startDate가 최근 14일 이내인 경우
                                            const isNew = record.startDate && (() => {
                                                const start = new Date(record.startDate);
                                                const now = new Date();
                                                const diff = (now - start) / (1000 * 60 * 60 * 24);
                                                return diff <= 14;
                                            })();
                                            if (isNew) return (
                                                <span style={{ fontSize: '0.65rem', background: '#ff4757', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>신규</span>
                                            );
                                            return null;
                                        })()}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                                        <span>{record.className}</span>
                                        {(record.credits !== undefined || record.endDate) && (
                                            <span style={{ color: 'var(--primary-gold)', opacity: 0.9 }}>
                                                {record.credits !== undefined && `${record.credits}회 `}
                                                {record.endDate && `/ ~${record.endDate.slice(2)}`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ color: 'var(--primary-gold)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                    {record.timestamp ? new Date(record.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
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
                        {ghcAttendance.length === 0 && mapoAttendance.length === 0 && instructorClasses.length === 0 ? (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '40px 20px', 
                                color: 'var(--text-secondary)',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '12px',
                                marginTop: '10px',
                                border: '1px dashed rgba(255,255,255,0.1)'
                            }}>
                                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>☕</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>오늘은 수업 일정이 없습니다</div>
                                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>편안한 휴식과 충전의 시간 되시길 바랍니다!</div>
                            </div>
                        ) : (
                            <>
                                {renderAttendanceList(ghcAttendance, '광흥창점', 'var(--primary-gold)', 'gwangheungchang')}
                                {renderAttendanceList(mapoAttendance, '마포점', '#3B82F6', 'mapo')}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Push Notification */}
            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    {pushEnabled ? <BellRinging size={24} color="var(--primary-gold)" weight="fill" /> : <Bell size={24} color="var(--text-secondary)" />}
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>나의 수업 출석회원 알림</h3>
                        <div style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            회원 출석 시 알림 받기
                        </div>
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
                    <div style={{ marginTop: '8px', fontSize: '0.85rem', textAlign: 'center', color: pushMessage.includes('✅') ? '#4CAF50' : 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{pushMessage}</div>
                )}
            </div>

            {/* PWA Install Guide */}
            {!isStandalone && (
                <div style={{ 
                    background: 'var(--bg-surface)', 
                    padding: '20px', 
                    borderRadius: '12px', 
                    marginBottom: '16px', 
                    border: deviceOS === 'ios' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(212, 175, 55, 0.3)', 
                    boxShadow: deviceOS === 'ios' ? '0 0 15px rgba(59, 130, 246, 0.1)' : '0 0 15px rgba(212, 175, 55, 0.1)' 
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ 
                            background: deviceOS === 'ios' ? '#3B82F6' : 'var(--primary-gold)', 
                            borderRadius: '10px', 
                            padding: '8px', 
                            display: 'flex' 
                        }}>
                            {deviceOS === 'ios' ? (
                                <Share size={24} color="white" weight="bold" />
                            ) : (
                                <SignOut size={24} color="black" style={{ transform: 'rotate(-90deg)' }} />
                            )}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>
                                {deviceOS === 'ios' ? '아이폰에 앱 설치하기' : '홈 화면에 앱 설치하기'}
                            </h3>
                            <div style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {deviceOS === 'ios' ? '사파리(Safari)에서 홈 화면에 추가하세요' : '앱처럼 편하게 아이콘으로 접속하세요'}
                            </div>
                        </div>
                    </div>
                    
                    {deviceOS === 'ios' ? (
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '8px', marginTop: '10px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem' }}>
                                <span style={{ background: '#3B82F6', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>1</span>
                                <span style={{ color: '#e0e0e0' }}>하단 <Share size={16} weight="bold" style={{ verticalAlign: 'middle', margin: '0 2px' }} /> <strong>공유 버튼</strong> 클릭</span>
                             </div>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                <span style={{ background: '#3B82F6', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>2</span>
                                <span style={{ color: '#e0e0e0' }}><PlusSquare size={16} weight="bold" style={{ verticalAlign: 'middle', margin: '0 2px' }} /> <strong>홈 화면에 추가</strong> 선택</span>
                             </div>
                        </div>
                    ) : (
                        <button 
                            onClick={handleInstallPWA} 
                            style={{ 
                                width: '100%', padding: '14px', borderRadius: '10px', border: 'none', 
                                background: 'var(--primary-gold)', color: 'black', fontWeight: 'bold', 
                                fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', 
                                justifyContent: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                            }}
                        >
                            <SignOut size={20} style={{ transform: 'rotate(-90deg)' }} /> 폰에 앱 설치하기
                        </button>
                    )}
                </div>
            )}

            <div style={{ textAlign: 'center', fontSize: '0.75rem', opacity: 0.6, color: 'var(--text-secondary)', padding: '20px 8px' }}>
                <div style={{ marginBottom: '4px', fontSize: '0.85rem' }}>{instructorName} 선생님으로 로그인됨</div>
                <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                     <span>v2026.02.19.2 | Date: {todayStr}</span>
                     <span>User: [{instructorName}] ({instructorName.trim().length})</span>
                     <span>Classes: {instructorClasses.length} / Att: {attendance.length}</span>
                </div>
            </div>
        </div>
    );
};

export default InstructorHome;
