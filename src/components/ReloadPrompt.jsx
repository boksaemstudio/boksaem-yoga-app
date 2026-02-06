import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { WarningCircle, ArrowsClockwise, X } from '@phosphor-icons/react';

function ReloadPrompt() {
  const [closed, setClosed] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  if (closed || !needRefresh) return null;

  return (
    <div className="pwa-reload-toast">
      <div className="pwa-reload-content">
        <WarningCircle size={24} weight="fill" color="var(--primary-gold)" />
        <div className="pwa-reload-message">
          <span className="pwa-reload-title">새로운 버전이 있습니다</span>
          <span className="pwa-reload-subtitle">앱을 업데이트해주세요.</span>
        </div>
      </div>
      <button 
        className="pwa-reload-button" 
        onClick={() => updateServiceWorker(true)}
      >
        <ArrowsClockwise size={20} weight="bold" />
        <span>새로고침</span>
      </button>

      <style>{`
        .pwa-reload-toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(30, 30, 30, 0.95);
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          z-index: 9999;
          min-width: 320px;
          animation: slideUp 0.3s ease-out;
        }

        .pwa-reload-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .pwa-reload-message {
          display: flex;
          flex-direction: column;
        }

        .pwa-reload-title {
          color: white;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .pwa-reload-subtitle {
          color: #888;
          font-size: 0.8rem;
        }

        .pwa-reload-button {
          background: var(--primary-gold);
          color: black; 
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: transform 0.2s;
        }
        
        .pwa-reload-button:active {
          transform: scale(0.95);
        }

        @keyframes slideUp {
          from {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default ReloadPrompt;
