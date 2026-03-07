import { useState, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

function ReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[SW] Registered');
      if (r) {
        // 1. Check immediately on load
        r.update();

        // 2. Check every 10 minutes
        setInterval(() => {
          console.log('[SW] Checking for SW update (Interval)...');
          r.update();
        }, 10 * 60 * 1000);

        // 3. Check when window comes back to foreground
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('[SW] Checking for SW update (Visibility)...');
                r.update();
            }
        });
      }
    },
    onRegisterError(error) {
      console.log('[SW] registration error', error);
    },
  });

  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (!needRefresh || isUpdatingRef.current) return;

    const path = window.location.pathname;
    const isKiosk = path === '/';

    const triggerUpdate = async (reason) => {
      if (isUpdatingRef.current) return;
      isUpdatingRef.current = true;
      console.log(`[SW-Update] Auto-applying update logic triggered by: ${reason}`);
      
      try {
        await updateServiceWorker(true);
        // Fallback reload if SW doesn't take over
        setTimeout(() => window.location.reload(), 3000);
      } catch (err) {
        console.error('[SW-Update] Failed, forcing reload:', err);
        window.location.reload();
      }
    };

    console.log(`[SW-Update] ${isKiosk ? 'Kiosk' : 'Normal'} mode detected. Waiting for idle or visibility change...`);

    // [FIX] Kiosk: 30s idle, Normal: 3m idle
    const idleTime = isKiosk ? 30 * 1000 : 3 * 60 * 1000;
    
    // 1. Idle Detection
    let idleTimer;
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => triggerUpdate(`Idle Timeout (${idleTime}ms)`), idleTime);
    };

    // [FIX] Listen to touch, mouse, and keyboard to prevent reloading while user is active
    window.addEventListener('touchstart', resetIdleTimer, { passive: true });
    window.addEventListener('mousedown', resetIdleTimer, { passive: true });
    window.addEventListener('keydown', resetIdleTimer, { passive: true });
    
    // Start the timer
    resetIdleTimer();

    // 2. Visibility Change (앱 밖으로 나갔다가 돌아왔을 때 즉시 업데이트)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
         triggerUpdate('Returned to Foreground');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
      window.removeEventListener('mousedown', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [needRefresh, updateServiceWorker]);

  // 프롬프트 UI는 이제 아예 렌더링하지 않음 (완전 자동)
  return null;
}

export default ReloadPrompt;
