import { memo, useState, useEffect } from 'react';
import SuccessDetails from './SuccessDetails';
import { useLanguageStore } from '../../stores/useLanguageStore';

/**
 * [ULTRA-MODULAR] MessageOverlay Component
 * Displays success/error messages with countdown timer and auto-close.
 */
const AUTO_CLOSE_SECONDS = 15; // 에러 모달 자동 닫힘 시간

const MessageOverlay = memo(({
  message,
  onClose,
  aiExperience
}) => {
  const t = useLanguageStore(s => s.t);
  const AUTO_CLOSE_SECONDS = message?.type === 'success' ? 8 : 15;
  const [countdown, setCountdown] = useState(AUTO_CLOSE_SECONDS);

  // Auto-close countdown for all messages (error and success)
  useEffect(() => {
    if (!message) return;
    setCountdown(AUTO_CLOSE_SECONDS);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [message, onClose, AUTO_CLOSE_SECONDS]);

  if (!message) return null;

  const isError = message.type === 'error';
  const isSuccess = message.type === 'success';

  return <div className="modal-overlay" style={{
    zIndex: 2500,
    background: 'rgba(0,0,0,0.88)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(12px)',
    animation: 'fadeIn 0.3s ease-out',
    cursor: 'pointer'
  }} onClick={onClose}>
    <div className={`message-box ${message.type}`} style={{
      maxWidth: '900px',
      width: '92%',
      height: 'auto',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      padding: 'clamp(30px, 4vh, 60px)',
      borderRadius: '40px',
      boxShadow: isError
        ? '0 25px 60px -12px rgba(255, 50, 50, 0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
        : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      position: 'relative',
      overflow: 'hidden',
      border: isError ? '2px solid rgba(255, 107, 107, 0.4)' : '1px solid rgba(255,255,255,0.1)'
    }} onClick={e => e.stopPropagation()}>

      {/* Countdown Progress Bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
        borderTopLeftRadius: '40px',
        borderTopRightRadius: '40px'
      }}>
        <div style={{
          height: '100%',
          width: `${(countdown / AUTO_CLOSE_SECONDS) * 100}%`,
          background: isError ? 'linear-gradient(90deg, #FF6B6B, #ff4444)' : 'linear-gradient(90deg, var(--primary-gold), #FFF)',
          transition: 'width 1s linear',
          borderRadius: '4px'
        }} />
      </div>

      <div className="message-content" style={{
        textAlign: 'center'
      }}>
        {/* Error Icon */}
        {isError && <div style={{
          fontSize: 'clamp(3rem, 8vh, 5rem)',
          marginBottom: '16px',
          animation: 'bounceIn 0.5s ease-out'
        }}>
          {message.text?.includes((t("g_36009e") || "만료")) || message.text?.includes('⏳') ? '⏳' :
           message.text?.includes((t("g_155e2c") || "시스템")) || message.text?.includes('⚠') ? '⚠️' :
           message.text?.includes((t("g_732fe3") || "실패")) || message.text?.includes('❌') ? '❌' : '😔'}
        </div>}

        {/* Title Text */}
        <div className="message-text" style={{
          fontSize: isError ? 'clamp(1.8rem, 5vh, 3rem)' : 'clamp(2.2rem, 6vh, 4rem)',
          fontWeight: '900',
          marginBottom: isError ? '16px' : '20px',
          letterSpacing: '-1.5px',
          color: isError ? '#FF6B6B' : 'inherit',
          lineHeight: 1.2
        }}>
          {message.text}
        </div>
        
        {/* Sub Text (Description) */}
        {message.subText && <div className="message-subtext" style={{
          marginBottom: '30px',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.5',
          fontSize: isError ? 'clamp(1rem, 2.5vh, 1.5rem)' : 'clamp(1.2rem, 3vh, 1.8rem)',
          opacity: 0.85,
          color: isError ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.9)'
        }}>
          {message.subText}
        </div>}

        {/* [AI] Personalized Feedback */}
        {isSuccess && aiExperience?.subMessage && <div className="ai-sub-message" style={{
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
        </div>}

        {/* [SUCCESS DETAILS] Grid for credits and days remaining */}
        {isSuccess && <SuccessDetails member={message.member} onClose={onClose} countdown={countdown} />}
        
        {/* Close Button with Countdown */}
        {!isSuccess && <button onClick={e => {
          e.stopPropagation();
          onClose();
        }} onTouchEnd={e => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }} style={{
          marginTop: '24px',
          background: isError
            ? 'linear-gradient(145deg, rgba(255,107,107,0.2), rgba(255,60,60,0.1))'
            : 'rgba(255,255,255,0.15)',
          border: isError
            ? '2px solid rgba(255,107,107,0.4)'
            : '2px solid rgba(255,255,255,0.25)',
          color: 'white',
          padding: 'clamp(15px, 2.5vh, 25px) clamp(40px, 5vw, 100px)',
          borderRadius: '24px',
          fontSize: 'clamp(1.4rem, 3vh, 2rem)',
          fontWeight: 'bold',
          cursor: 'pointer',
          width: '100%',
          transition: 'all 0.2s ease',
          boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}>
          {t('kiosk_overlay_close') || t("g_218e2a") || "Close"}
          {/* Countdown Badge */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            fontSize: '0.9rem',
            fontWeight: '800',
            fontFamily: 'var(--font-mono, monospace)',
            opacity: 0.8
          }}>
            {countdown}
          </span>
        </button>}

        <div style={{
          marginTop: '28px',
          opacity: 0.5,
          fontSize: '1.1rem',
          fontWeight: 500
        }}>
          {t('kiosk_overlay_touch_to_return') || t("g_bbcb03") || "Tap anywhere to return to the check-in screen"}
        </div>
      </div>
    </div>
  </div>;
});
MessageOverlay.displayName = 'MessageOverlay';
export default MessageOverlay;