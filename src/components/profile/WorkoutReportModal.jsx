import { useEffect, useState } from 'react';
import { getTranslatedClass } from '../../utils/classMapping';
import { useLanguageStore } from '../../stores/useLanguageStore';

const WorkoutReportModal = ({ log, onClose, t }) => {

    const [animationState, setAnimationState] = useState(false);

    useEffect(() => {
        // Trigger animations after mount
        const timer = setTimeout(() => setAnimationState(true), 100);
        return () => clearTimeout(timer);
    }, []);

    if (!log) return null;

    // Generate deterministic mock data based on log ID or timestamp
    const dateNum = new Date(log.timestamp).getDate();
    const mockCalories = 250 + (dateNum * 15 % 150);
    const mockAvgHR = 110 + (dateNum * 7 % 40);
    const mockMaxHR = mockAvgHR + 30 + (dateNum % 15);
    const mockDuration = 5 + (dateNum % 5); // 50~55 mins (mocked as 50+5)

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            zIndex: 100000, display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '20px', fontFamily: '"Pretendard", sans-serif'
        }} onClick={onClose}>
            <div style={{
                width: '100%', maxWidth: '380px',
                background: 'linear-gradient(145deg, #1c1c1e, #121214)',
                borderRadius: '24px', overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                transform: animationState ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                opacity: animationState ? 1 : 0,
                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 15px' }} />
                    <h2 style={{ fontSize: '1.4rem', color: 'white', margin: '0 0 5px 0' }}>{t('workoutReport') || '건강 리포트'}</h2>
                    <p style={{ color: 'var(--primary-gold)', fontSize: '0.9rem', margin: 0, fontWeight: 600 }}>
                        {log.className ? getTranslatedClass(log.className, t) : t('selfPractice')}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: '5px', margin: 0 }}>
                        {new Date(log.timestamp).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}
                    </p>
                </div>

                {/* Body */}
                <div style={{ padding: '30px 25px' }}>
                    
                    {/* Activity Rings Mock */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
                        <div style={{
                            width: '160px', height: '160px', borderRadius: '50%',
                            background: `conic-gradient(#ff0055 ${animationState ? mockCalories/5 : 0}%, transparent 0)`,
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            boxShadow: '0 0 20px rgba(255,0,85,0.2)',
                            transition: 'all 1.5s ease-out', position: 'relative'
                        }}>
                            <div style={{
                                width: '130px', height: '130px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #1a1a1c, #0d0d0f)',
                                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
                            }}>
                                <span style={{ color: '#ff0055', fontSize: '2rem', fontWeight: 800 }}>{mockCalories}</span>
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>KCAL</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '15px' }}>
                            <div style={{ color: '#00ffcc', fontSize: '1.5rem', fontWeight: 'bold' }}>{mockAvgHR} <span style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.5)'}}>BPM</span></div>
                            <div style={{ fontSize: '0.75rem', color: 'white', marginTop: '5px' }}>평균 심박수</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '15px' }}>
                            <div style={{ color: '#ffcc00', fontSize: '1.5rem', fontWeight: 'bold' }}>50 <span style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.5)'}}>MIN</span></div>
                            <div style={{ fontSize: '0.75rem', color: 'white', marginTop: '5px' }}>운동 시간</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '15px', gridColumn: '1 / -1' }}>
                            <div style={{ color: '#ff3366', fontSize: '1.5rem', fontWeight: 'bold' }}>{mockMaxHR} <span style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.5)'}}>BPM</span></div>
                            <div style={{ fontSize: '0.75rem', color: 'white', marginTop: '5px' }}>최고 심박수</div>
                        </div>
                    </div>
                    
                    <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                        Smartwatch Sync (Beta)
                    </div>
                </div>

                {/* Close Btn */}
                <button onClick={onClose} style={{
                    width: 'calc(100% - 40px)', margin: '0 20px 20px', padding: '15px',
                    borderRadius: '16px', border: 'none', background: 'var(--primary-gold)',
                    color: 'var(--text-on-primary)', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer'
                }}>
                    닫기
                </button>
            </div>
        </div>
    );
};

export default WorkoutReportModal;
