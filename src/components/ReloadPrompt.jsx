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

    if (isKiosk) {
      // 키오스크는 발견 즉시 업데이트 (약간의 안정성 딜레이 후)
      console.log(`[SW-Update] Kiosk mode detected. Forcing update in 3s...`);
      const timer = setTimeout(() => triggerUpdate('Kiosk Force'), 3000);
      return () => clearTimeout(timer);
    } else {
      // 일반 모드 (관리자/회원/강사): 방해 금지를 위해 영리하게 업데이트 처리
      console.log(`[SW-Update] Normal mode detected. Waiting for idle or visibility change...`);

      // 1. Idle Detection (3분 터치 없음)
      let idleTimer;
      const resetIdleTimer = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => triggerUpdate('Idle Timeout (3m)'), 3 * 60 * 1000);
      };

      window.addEventListener('touchstart', resetIdleTimer, { passive: true });
      window.addEventListener('click', resetIdleTimer, { passive: true });
      resetIdleTimer();

      // 2. Visibility Change (앱 밖으로 나갔다가 돌아왔을 때)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
           triggerUpdate('Returned to Foreground');
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearTimeout(idleTimer);
        window.removeEventListener('touchstart', resetIdleTimer);
        window.removeEventListener('click', resetIdleTimer);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [needRefresh, updateServiceWorker]);

  // 프롬프트 UI는 이제 아예 렌더링하지 않음 (완전 자동)
  return null;
}

export default ReloadPrompt;
