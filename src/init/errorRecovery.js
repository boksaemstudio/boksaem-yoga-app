function handleFatalKioskError(errorObj) {
  const isKiosk = window.location.pathname === '/';
  if (!isKiosk) return;
  const errorMsg = String(errorObj?.message || errorObj || '');
  const isFatal = errorMsg.includes('ChunkLoadError') || errorMsg.includes('Failed to fetch') || errorMsg.includes('Loading chunk') || errorMsg.includes('dynamically imported module');
  if (isFatal) {
    const reloadCount = parseInt(sessionStorage.getItem('auto_reload_count') || '0');
    const lastReloadTime = parseInt(sessionStorage.getItem('auto_reload_time') || '0');
    const now = Date.now();
    // 마지막 리로드로부터 30초 이내면 카운트 유지, 아니면 리셋
    const effectiveCount = now - lastReloadTime < 30000 ? reloadCount : 0;
    if (effectiveCount < 2) {
      sessionStorage.setItem('auto_reload_count', String(effectiveCount + 1));
      sessionStorage.setItem('auto_reload_time', String(now));
      console.error(`[AlwaysOn] Fatal error on kiosk, auto-reloading in 10s... (attempt ${effectiveCount + 1}/2)`);
      setTimeout(() => window.location.reload(), 10000);
    } else {
      console.error('[AlwaysOn] Max reload attempts reached. Stopping auto-recovery.');
    }
  }
}
export function initErrorHandlers() {
  if (typeof window === 'undefined') return;
  window.addEventListener('unhandledrejection', event => {
    console.warn('[Global Safety] Unhandled Promise Rejection:', event.reason);
    handleFatalKioskError(event.reason);
  });
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('[Global Safety] Uncaught Error:', message, source, lineno);
    handleFatalKioskError(message);
    return false;
  };

  // 안정 창: 30초 무재부팅 시 카운터 초기화
  setTimeout(() => {
    sessionStorage.removeItem('auto_reload_count');
  }, 30000);
}