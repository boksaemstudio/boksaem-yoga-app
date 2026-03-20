function handleFatalKioskError(errorObj) {
  const isKiosk = window.location.pathname === '/';
  if (!isKiosk) return;

  const errorMsg = String(errorObj?.message || errorObj || '');
  const isFatal = errorMsg.includes('ChunkLoadError') || 
                  errorMsg.includes('Failed to fetch') ||
                  errorMsg.includes('Loading chunk') ||
                  errorMsg.includes('dynamically imported module');
  
  if (isFatal) {
    const reloadCount = parseInt(sessionStorage.getItem('auto_reload_count') || '0');
    if (reloadCount < 3) {
      sessionStorage.setItem('auto_reload_count', String(reloadCount + 1));
      console.error(`[AlwaysOn] Fatal error on kiosk, auto-reloading in 5s... (attempt ${reloadCount + 1}/3)`);
      setTimeout(() => window.location.reload(), 5000);
    } else {
      console.error('[AlwaysOn] Max reload attempts reached. Stopping auto-recovery.');
    }
  }
}

export function initErrorHandlers() {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
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
