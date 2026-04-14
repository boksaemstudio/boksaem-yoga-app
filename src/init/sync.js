export function initBackgroundSync() {
  if (typeof document !== 'undefined') {
    let hiddenTime = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        hiddenTime = Date.now();
      } else if (document.visibilityState === 'visible') {
        const isKiosk = window.location.pathname === '/';
        if (!isKiosk && hiddenTime > 0) {
          const idleMs = Date.now() - hiddenTime;
          // 10분 이상 백그라운드 체류 시 최신 PWA 로드를 위해 리로드
          if (idleMs > 10 * 60 * 1000) {
            console.log('[Background-Sync] App was idle for >10m. Reloading to ensure latest version...');
            window.location.reload();
          }
        }
      }
    });
  }
}