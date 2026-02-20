import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons as PhosphorIcons } from '../../../components/CommonIcons';

const { X, Heartbeat, Brain, Sparkle } = PhosphorIcons;

export const FeedbackView = ({ 
    activeMode, 
    feedbackData, 
    formatTime, 
    timeLeft, 
    modeName, 
    onClose 
}) => {
    const navigate = useNavigate();
    const duration = activeMode?.id === 'breath' ? 3 * 60 : (activeMode?.id === 'calm' ? 7 * 60 : 15 * 60);
    const actualTime = duration - timeLeft;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: '#0a0a0c', zIndex: 4000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '20px', overflowY: 'auto'
        }}>
            <button onClick={onClose} style={{
                position: 'absolute', top: '20px', right: '20px',
                background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                width: '50px', height: '50px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}><X size={24} /></button>

            <div style={{
                background: 'linear-gradient(145deg, rgba(30,30,35,0.9), rgba(15,15,20,0.9))',
                borderRadius: '30px', padding: '40px', maxWidth: '600px', width: '100%',
                border: `1px solid ${activeMode?.color}40`,
                boxShadow: `0 20px 80px ${activeMode?.color}20`,
                animation: 'fadeIn 0.5s ease-out'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: `${activeMode?.color}20`, margin: '0 auto 20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: activeMode?.color
                    }}>
                        <Brain size={40} weight="light" />
                    </div>
                    <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 600, marginBottom: '10px' }}>
                        명상 수련 완료
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem' }}>
                        {modeName} • {Math.floor(actualTime / 60)}분 {actualTime % 60}초 수련
                    </p>
                </div>

                {feedbackData ? (
                    <div style={{ 
                        background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '25px',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <Heartbeat size={24} color={activeMode?.color} />
                            <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 500, margin: 0 }}>
                                복순이의 마음 관찰 일지
                            </h3>
                        </div>
                        <p style={{ 
                            color: 'rgba(255,255,255,0.9)', lineHeight: 1.8, fontSize: '1.1rem',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {feedbackData.message}
                        </p>
                        
                        {feedbackData.analysis && (
                            <div style={{ 
                                marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)',
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'
                            }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px' }}>
                                    <span style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '5px' }}>호흡 안정도</span>
                                    <span style={{ color: 'white', fontSize: '1.2rem', fontWeight: 600 }}>{feedbackData.analysis.stabilityScore}/100</span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px' }}>
                                    <span style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '5px' }}>에너지 변화</span>
                                    <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: 500 }}>{feedbackData.analysis.energyShift}</span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div className="breathing-circle" style={{ 
                            width: '40px', height: '40px', margin: '0 auto 20px',
                            background: activeMode?.color, borderRadius: '50%' 
                        }} />
                        <p style={{ color: 'rgba(255,255,255,0.6)' }}>명상 데이터를 분석하고 있습니다...</p>
                    </div>
                )}

                <button onClick={onClose} style={{
                    width: '100%', padding: '20px', marginTop: '30px',
                    background: activeMode?.color, border: 'none', borderRadius: '15px',
                    color: '#000', fontSize: '1.2rem', fontWeight: 600, cursor: 'pointer',
                    boxShadow: `0 10px 30px ${activeMode?.color}40`
                }}>
                    마음 챙김 마치고 돌아가기
                </button>
            </div>
        </div>
    );
};
