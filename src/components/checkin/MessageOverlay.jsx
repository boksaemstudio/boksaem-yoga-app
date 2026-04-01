import { memo } from 'react';
import SuccessDetails from './SuccessDetails';

/**
 * [ULTRA-MODULAR] MessageOverlay Component
 * Displays success/error messages and handles automatic closing.
 */
const MessageOverlay = memo(({ message, onClose, aiExperience }) => {
    if (!message) return null;

    return (
        <div
            className="modal-overlay"
            style={{
                zIndex: 2500,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(8px)',
                animation: 'fadeIn 0.3s ease-out',
                cursor: 'pointer' // [UX] Whole overlay is clickable
            }}
            onClick={onClose}
        >
            <div
                className={`message-box ${message.type}`}
                style={{
                    maxWidth: '900px',
                    width: '92%',
                    height: 'auto',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 'clamp(30px, 4vh, 60px)',
                    borderRadius: '40px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    overflow: 'hidden',
                    border: message.type === 'error' ? '2px solid rgba(255, 107, 107, 0.4)' : '1px solid rgba(255,255,255,0.1)'
                }}
                onClick={(e) => e.stopPropagation()} // Box 내부 클릭시 닫히지 않음 (버튼 사용 유도)
            >
                <div className="message-content" style={{ textAlign: 'center' }}>
                    <div className="message-text" style={{ 
                        fontSize: 'clamp(2.2rem, 6vh, 4rem)', 
                        fontWeight: '900', 
                        marginBottom: '20px',
                        letterSpacing: '-1.5px',
                        color: message.type === 'error' ? '#FF6B6B' : 'inherit'
                    }}>
                        {message.text}
                    </div>
                    
                    {message.subText && (
                        <div className="message-subtext" style={{ 
                            marginBottom: '40px', 
                            whiteSpace: 'pre-wrap', 
                            lineHeight: '1.4',
                            fontSize: 'clamp(1.2rem, 3vh, 1.8rem)',
                            opacity: 0.9
                        }}>
                            {message.subText}
                        </div>
                    )}

                    {/* [AI] Personalized Feedback */}
                    {message.type === 'success' && aiExperience?.subMessage && (
                        <div className="ai-sub-message" style={{
                            marginTop: '10px',
                            padding: '24px',
                            background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.15), rgba(var(--primary-rgb), 0.05))',
                            borderRadius: '24px',
                            borderLeft: '6px solid var(--primary-gold)',
                            fontSize: '1.5rem',
                            color: 'rgba(255,255,255,0.95)',
                            fontStyle: 'italic',
                            lineHeight: 1.6,
                            animation: 'slideUp 0.6s ease-out',
                            textAlign: 'left',
                            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
                        }}>
                            "{aiExperience.subMessage}"
                        </div>
                    )}

                    {/* [SUCCESS DETAILS] Grid for credits and days remaining */}
                    {message.type === 'success' && (
                        <SuccessDetails 
                            member={message.member} 
                            onClose={onClose} 
                        />
                    )}
                    
                    {message.type !== 'success' && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
                            style={{
                                marginTop: '20px',
                                background: 'rgba(255,255,255,0.15)',
                                border: '2px solid rgba(255,255,255,0.25)',
                                color: 'white',
                                padding: 'clamp(15px, 2.5vh, 25px) clamp(40px, 5vw, 100px)',
                                borderRadius: '24px',
                                fontSize: 'clamp(1.4rem, 3vh, 2rem)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                width: '100%', // Jumbo Button
                                transition: 'all 0.2s ease',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                            }}
                        >
                            닫기
                        </button>
                    )}

                    <div style={{ marginTop: '35px', opacity: 0.6, fontSize: '1.2rem', fontWeight: 500 }}>
                        화면을 터치하면 출석 화면으로 돌아갑니다
                    </div>
                </div>
            </div>
        </div>
    );
});

MessageOverlay.displayName = 'MessageOverlay';

export default MessageOverlay;
