import { useLanguageStore } from '../../../stores/useLanguageStore';
import { useState, useEffect } from 'react';
import { useStudioConfig } from '../../../contexts/StudioContext';
import { Brain } from '../../../components/CommonIcons';
const AI_LOADING_MESSAGES = [
  { key: "g_68da3c", fallback: "\uB9C8\uC74C\uC744 \uC5F0\uACB0\uD558\uACE0 \uC788\uC5B4\uC694..." },
  { key: "g_6f2ccd", fallback: "\uAE4A\uC774 \uBD84\uC11D \uC911\uC785\uB2C8\uB2E4..." },
  { key: "g_5c80ae", fallback: "\uC624\uB298\uC758 \uB2F9\uC2E0\uC744 \uC774\uD574\uD558\uACE0 \uC788\uC5B4\uC694..." },
  { key: "g_641da3", fallback: "\uD638\uD761\uC5D0 \uC9D1\uC911\uD574 \uBCF4\uC138\uC694..." },
  { key: "g_c80a0c", fallback: "\uC7A0\uC2DC, \uACE0\uC694\uD568 \uC18D\uC5D0 \uBA38\uBB3C\uB7EC\uC694..." }
];
export const AILoadingIndicator = ({
  compact = false,
  message = null
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const [msgIndex, setMsgIndex] = useState(0);
  useEffect(() => {
    if (message) return; // Don't cycle if custom message provided
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % AI_LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [message]);
  const currentMsg = AI_LOADING_MESSAGES[msgIndex];
  const displayMessage = message || (t(currentMsg.key) || currentMsg.fallback);
  if (compact) {
    return <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 20px',
      borderRadius: '20px',
      background: 'rgba(var(--primary-rgb), 0.08)',
      border: '1px solid rgba(var(--primary-rgb), 0.15)'
    }}>
                <div className="ai-thinking-icon" style={{
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'
      }}>
                    <Brain size={24} weight="duotone" />
                </div>
                <span style={{
        color: 'rgba(255,255,255,0.8)',
        fontSize: '0.9rem'
      }}>{displayMessage}</span>
            </div>;
  }
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    padding: '40px'
  }}>
            {/* Rotating/Pulsing Icon */}
            <div className="ai-thinking-icon" style={{
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: 'rgba(var(--primary-rgb), 0.1)',
      border: '2px solid rgba(var(--primary-rgb), 0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)',
      boxShadow: '0 0 30px rgba(var(--primary-rgb), 0.2)'
    }}>
                <Brain size={40} weight="duotone" />
            </div>
            
            {/* Message */}
            <div style={{
      textAlign: 'center'
    }}>
                <div style={{
        color: 'rgba(255,255,255,0.9)',
        fontSize: '1.1rem',
        fontWeight: '500',
        marginBottom: '8px',
        transition: 'opacity 0.3s ease'
      }}>
                    {displayMessage}
                </div>
                <div style={{
        color: 'rgba(255,255,255,0.4)',
        fontSize: '0.85rem'
      }}>{t("g_c85116") || "AI\uAC00 \uC0DD\uAC01\uD558\uACE0 \uC788\uC5B4\uC694"}</div>
            </div>
        </div>;
};