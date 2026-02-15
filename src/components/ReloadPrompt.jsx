import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { WarningCircle, ArrowsClockwise } from '@phosphor-icons/react';

function ReloadPrompt() {
  const [closed] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
      if (r) {
        // 1. Check immediately on load
        r.update();

        // 2. Check every 10 minutes (stabilized from 1min)
        setInterval(() => {
          console.log('Checking for SW update (Interval)...');
          r.update();
        }, 10 * 60 * 1000);

        // 3. Check when window comes back to foreground
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('Checking for SW update (Visibility)...');
                r.update();
            }
        });
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  if (closed || !needRefresh) return null;

  // [ALWAYS-ON] 키오스크(/) 경로에서는 자동으로 SW 업데이트 적용
  const isKiosk = window.location.pathname === '/';
  if (isKiosk && needRefresh) {
    console.log('[AlwaysOn] Kiosk mode: Auto-applying SW update...');
    // 약간의 딜레이 후 자동 업데이트 (렌더링 안정성)
    setTimeout(async () => {
      try {
        await updateServiceWorker(true);
      } catch {
        window.location.reload();
      }
    }, 3000);
    return null; // 키오스크에서는 프롬프트 표시하지 않음
  }

  const handleRefresh = async () => {
    console.log('ReloadPrompt: Refresh requested by user.');
    
    // Set a flag to detect if we just reloaded and it failed
    sessionStorage.setItem('sw_update_attempt', 'true');

    try {
      await updateServiceWorker(true);
      console.log('ReloadPrompt: updateServiceWorker called.');
      
      // Fallback: If page doesn't reload within 3 seconds, force it.
      // Increased from 1s to 3s to allow SW enough time to activate.
      setTimeout(() => {
         console.warn('ReloadPrompt: Timeout waiting for controller change, forcing reload.');
         window.location.reload();
      }, 3000);
    } catch (err) {
      console.error('ReloadPrompt: Failed to update service worker:', err);
      // Force reload on error
      window.location.reload();
    }
  };

  // Check for update loop on mount
  if (needRefresh) {
    const lastAttempt = sessionStorage.getItem('sw_update_attempt');
    if (lastAttempt) {
        console.warn('ReloadPrompt: Detected probable update loop. Unregistering SW to recover.');
        sessionStorage.removeItem('sw_update_attempt');
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (const registration of registrations) {
                    registration.unregister();
                }
                window.location.reload();
            });
        }
        return null; // Don't show the prompt while we nuke it
    }
  }

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
        onClick={handleRefresh}
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
