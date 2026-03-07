// [Global Event Guard]
// Prevent browser context menu (long-press menu) specifically for Kiosk/Tablet experience
// This ensures that "Download/Share/Print" menu never appears on any part of the app.
if (typeof window !== 'undefined') {
  window.addEventListener('contextmenu', (e) => {
    // [EXCEPTION] Allow context menu on inputs if needed for text editing (optional)
    // if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    e.preventDefault();
  }, { passive: false });
}

import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'
import ErrorBoundary from './components/ErrorBoundary'
import { LanguageProvider } from './context/LanguageContext'
import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

// [URGENT UX/DATA FIX] Polyfill for Incognito anti-fingerprinting breaking sv-SE date format
// Browsers like Chrome in Incognito mode override locales to en-US. This breaks our "YYYY-MM-DD" expectations.
const originalToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function(locale, options) {
  if (locale === 'sv-SE') {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = formatter.formatToParts(this);
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const d = parts.find(p => p.type === 'day')?.value;
      if (y && m && d) return `${y}-${m}-${d}`;
    } catch (e) {
      console.warn("Date polyfill error:", e);
    }
  }
  return originalToLocaleDateString.call(this, locale, options);
};

// [PERF] Critical Server Warm-up: 앱 시작 즉시 서버 깨우기 (Render 전 실행)
// 사용자 경험을 위해 UI 렌더링을 기다리지 않고 병렬로 실행
if (typeof window !== 'undefined') {
  const warmUpServers = async () => {
    try {
      console.log('🔥 [Warm-up] Sending signals to Cloud Functions...');
      // 1. Check-in Core
      httpsCallable(functions, 'checkInMemberV2Call')({ ping: true }).catch(() => {});
      // 2. AI Mediation Engine
      httpsCallable(functions, 'generateMeditationGuidance')({ type: 'warmup' }).catch(() => {});
    } catch (e) {
      console.debug('Warm-up signal failed (harmless):', e);
    }
  };
  warmUpServers();
}

// [Agent Admin Mode] Enable ONLY in development via URL parameter (?agent_admin=true) or localStorage
if (import.meta.env.DEV && typeof window !== 'undefined' && (window.location.search.includes('agent_admin=true') || localStorage.getItem('agent_admin_mode') === 'true')) {
  window.__AGENT_ADMIN_MODE__ = true;
  console.log('🚀 Agent Admin Mode Enabled: Confirmation dialogs will be auto-processed.');

  // Global mocks for common dialogs
  window.confirm = (msg) => {
    console.log('[Agent Mode] Auto-confirming:', msg);
    return true;
  };

  window.prompt = (msg, defaultVal) => {
    console.log('[Agent Mode] Auto-prompting:', msg);
    if (msg.includes('마이그레이션')) return '마이그레이션';
    if (msg.includes('삭제')) return '삭제';
    return defaultVal || '확인';
  };

  window.alert = (msg) => {
    console.log('[Agent Mode] Auto-alerting (Suppressed):', msg);
  };
}

try {
  const root = ReactDOM.createRoot(document.getElementById('root'));

  root.render(
    <StrictMode>
      <ErrorBoundary>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ErrorBoundary>
    </StrictMode>,
  );


  // [SAFETY] Global Async Error Handler - Enhanced with auto-recovery for kiosk
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Global Safety] Unhandled Promise Rejection:', event.reason);
    
    // [ALWAYS-ON] 키오스크(/) 경로에서 치명적 에러 시 자동 복구
    const isKiosk = window.location.pathname === '/';
    const errorMsg = String(event.reason?.message || event.reason || '');
    const isFatal = errorMsg.includes('ChunkLoadError') || 
                    errorMsg.includes('Failed to fetch') ||
                    errorMsg.includes('Loading chunk') ||
                    errorMsg.includes('dynamically imported module');
    
    if (isKiosk && isFatal) {
      const reloadCount = parseInt(sessionStorage.getItem('auto_reload_count') || '0');
      if (reloadCount < 3) {
        sessionStorage.setItem('auto_reload_count', String(reloadCount + 1));
        console.error('[AlwaysOn] Fatal error on kiosk, auto-reloading in 5s... (attempt ' + (reloadCount + 1) + '/3)');
        setTimeout(() => window.location.reload(), 5000);
      } else {
        console.error('[AlwaysOn] Max reload attempts reached. Stopping auto-recovery.');
      }
    }
  });

  // [ALWAYS-ON] Global Sync Error Handler
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('[Global Safety] Uncaught Error:', message, source, lineno);
    
    const isKiosk = window.location.pathname === '/';
    const errorMsg = String(message || '');
    const isFatal = errorMsg.includes('ChunkLoadError') || 
                    errorMsg.includes('Failed to fetch dynamically imported module') ||
                    errorMsg.includes('Loading chunk');
                    
    if (isKiosk && isFatal) {
      const reloadCount = parseInt(sessionStorage.getItem('auto_reload_count') || '0');
      if (reloadCount < 3) {
        sessionStorage.setItem('auto_reload_count', String(reloadCount + 1));
        console.error('[AlwaysOn] Fatal sync error on kiosk, auto-reloading in 5s...');
        setTimeout(() => window.location.reload(), 5000);
      }
    }
    return false; // Don't suppress default error reporting
  };

  // [ALWAYS-ON] Reset reload counter after successful boot (30s stability window)
  setTimeout(() => {
    sessionStorage.removeItem('auto_reload_count');
  }, 30000);

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
      <p>애플리케이션을 시작할 수 없습니다.</p>
      <pre>${fatalError.toString()}</pre>
    </div>
  `;
}
