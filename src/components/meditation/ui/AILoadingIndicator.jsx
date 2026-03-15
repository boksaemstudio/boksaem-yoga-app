import { useState, useEffect } from 'react';
import { useStudioConfig } from '../../../contexts/StudioContext';
import { Brain } from '../../../components/CommonIcons';

const AI_LOADING_MESSAGES = [
    "마음을 연결하고 있어요...",
    "깊이 분석 중입니다...",
    "오늘의 당신을 이해하고 있어요...",
    "호흡에 집중해 보세요...",
    "잠시, 고요함 속에 머물러요..."
];

export const AILoadingIndicator = ({ compact = false, message = null }) => {
    const { config } = useStudioConfig();
    const [msgIndex, setMsgIndex] = useState(0);
    
    useEffect(() => {
        if (message) return; // Don't cycle if custom message provided
        const interval = setInterval(() => {
            setMsgIndex(prev => (prev + 1) % AI_LOADING_MESSAGES.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [message]);

    const displayMessage = message || AI_LOADING_MESSAGES[msgIndex];
    
    if (compact) {
        return (
            <div style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', 
                padding: '12px 20px', borderRadius: '20px',
                background: 'rgba(var(--primary-rgb), 0.08)',
                border: '1px solid rgba(var(--primary-rgb), 0.15)'
            }}>
                <div className="ai-thinking-icon" style={{ 
                    width: '28px', height: '28px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'
                }}>
                    <Brain size={24} weight="duotone" />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>{displayMessage}</span>
            </div>
        );
    }
    
    return (
        <div style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', 
            justifyContent: 'center', gap: '24px', padding: '40px'
        }}>
            {/* Rotating/Pulsing Icon */}
            <div className="ai-thinking-icon" style={{ 
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'rgba(var(--primary-rgb), 0.1)',
                border: '2px solid rgba(var(--primary-rgb), 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)',
                boxShadow: '0 0 30px rgba(var(--primary-rgb), 0.2)'
            }}>
                <Brain size={40} weight="duotone" />
            </div>
            
            {/* Message */}
            <div style={{ textAlign: 'center' }}>
                <div style={{ 
                    color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', fontWeight: '500',
                    marginBottom: '8px', transition: 'opacity 0.3s ease'
                }}>
                    {displayMessage}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                    AI가 생각하고 있어요
                </div>
            </div>
        </div>
    );
};
