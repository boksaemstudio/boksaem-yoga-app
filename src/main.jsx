import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'
import ErrorBoundary from './components/common/ErrorBoundary'

import { runGlobalAppInitialization } from './init';

// 1. 전역 앱 환경 초기화 (안티 핑거프린팅 폴리필, 에러 복구, 컨텍스트 메뉴 차단 등)
runGlobalAppInitialization();

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
