import React, { memo } from 'react';
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
                animation: 'fadeIn 0.3s ease-out'
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
                    padding: '40px',
                    borderRadius: '32px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()} // Box 내부 클릭시 닫히지 않음 (버튼 사용 유도)
            >
                <div className="message-content" style={{ textAlign: 'center' }}>
                    <div className="message-text" style={{ 
                        fontSize: 'clamp(2rem, 5vh, 3.2rem)', 
                        fontWeight: '900', 
                        marginBottom: '20px',
                        letterSpacing: '-1px'
                    }}>
                        {message.text}
                    </div>
                    
                    {message.subText && (
                        <div className="message-subtext" style={{ 
                            marginBottom: '30px', 
                            whiteSpace: 'pre-wrap', 
                            lineHeight: '1.4'
                        }}>
                            {message.subText}
                        </div>
                    )}

                    {/* [AI] Personalized Feedback */}
                    {message.type === 'success' && aiExperience?.subMessage && (
                        <div className="ai-sub-message" style={{
                            marginTop: '10px',
                            padding: '20px',
                            background: 'rgba(212,175,55,0.1)',
                            borderRadius: '20px',
                            borderLeft: '5px solid var(--primary-gold)',
                            fontSize: '1.4rem',
                            color: 'rgba(255,255,255,0.95)',
                            fontStyle: 'italic',
                            lineHeight: 1.5,
                            animation: 'slideUp 0.6s ease-out',
                            textAlign: 'left'
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
                            onClick={onClose}
                            style={{
                                marginTop: '30px',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: 'white',
                                padding: '12px 30px',
                                borderRadius: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            닫기
                        </button>
                    )}

                    <div style={{ marginTop: '25px', opacity: 0.5, fontSize: '1rem' }}>
                        바깥 영역을 터치하면 출석 화면으로 돌아갑니다
                    </div>
                </div>
            </div>
        </div>
    );
});

MessageOverlay.displayName = 'MessageOverlay';

export default MessageOverlay;
