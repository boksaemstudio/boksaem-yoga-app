import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'
import ErrorBoundary from './components/common/ErrorBoundary'

import { runGlobalAppInitialization } from './init';

// 1. 전역 앱 환경 초기화 (안티 핑거프린팅 폴리필, 에러 복구, 컨텍스트 메뉴 차단 등)
runGlobalAppInitialization();

// [FIX] 배포 후 SW 캐시 불일치로 모듈 로드 실패 시 자동 복구
// "Failed to fetch dynamically imported module" 에러를 감지하면
// SW 캐시를 무효화하고 새로고침하여 최신 코드를 로드합니다.
window.addEventListener('error', (e) => {
  if (e.message && (e.message.includes('Failed to fetch dynamically imported module') || e.message.includes('Importing a module script failed'))) {
    console.warn('[RECOVERY] Stale chunk detected, clearing SW cache and reloading...');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
        caches.keys().then(keys => {
          Promise.all(keys.map(k => caches.delete(k))).then(() => {
            window.location.reload();
          });
        });
      });
    } else {
      window.location.reload();
    }
  }
});
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason.message && (e.reason.message.includes('Failed to fetch dynamically imported module') || e.reason.message.includes('Importing a module script failed'))) {
    console.warn('[RECOVERY] Stale chunk rejection detected, clearing SW cache and reloading...');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
        caches.keys().then(keys => {
          Promise.all(keys.map(k => caches.delete(k))).then(() => {
            window.location.reload();
          });
        });
      });
    } else {
      window.location.reload();
    }
  }
});

try {
  const root = ReactDOM.createRoot(document.getElementById('root'));

  root.render(
    <StrictMode>
      <ErrorBoundary>
          <App />
      </ErrorBoundary>
    </StrictMode>,
  );

  /* 
   * [PWA CONFLICT REMOVED] 
   * Manual SW registration removed because it conflicts with vite-plugin-pwa (ReloadPrompt.jsx).
   * The plugin handles registration and updates properly.
   */
} catch (fatalError) {
  console.error("❌ Fatal Application Error:", fatalError);
  document.getElementById('root').innerHTML = `
    <div style="padding: 20px; color: red; background: #1a1a1a; height: 100vh;">
      <h1>Critical Error</h1>
      <p>Application failed to start.</p>
      <pre>${fatalError.toString()}</pre>
    </div>
  `;
}
