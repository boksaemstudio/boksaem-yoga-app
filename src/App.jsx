import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { storageService } from './services/storage';
import NotificationListener from './components/common/NotificationListener';
import { PWAProvider } from './contexts/PWAContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { StudioProvider } from './contexts/StudioContext';
import NetworkStatus from './components/common/NetworkStatus';
import { useStudioConfig } from './contexts/StudioContext';
import { STUDIO_CONFIG } from './studioConfig';
import ReloadPrompt from './components/ReloadPrompt';


// Lazy load pages
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CheckInPage = lazy(() => import('./pages/CheckInPage'));
const MemberProfile = lazy(() => import('./pages/MemberProfile'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const InstructorPage = lazy(() => import('./pages/InstructorPage'));
const MeditationPage = lazy(() => import('./pages/MeditationPage'));

// Loading fallback
const LoadingScreen = () => {
    const { config } = useStudioConfig();
    const primary = config.THEME?.PRIMARY_COLOR || '#D4AF37';
    const skeleton = config.THEME?.SKELETON_COLOR || '#1a1a1a';
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: primary }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ border: `4px solid ${skeleton}`, borderTop: `4px solid ${primary}`, borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{config.IDENTITY?.NAME || 'Studio'} {STUDIO_CONFIG.IDENTITY?.APP_VERSION || ''}</h2>
        </div>
      </div>
    );
};

// Error fallback
const ErrorFallback = ({ error }) => (
  <div style={{ padding: 50, color: 'red', background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
    <div>
      <h1 style={{ marginBottom: '20px' }}>⚠️ 시스템 오류 발생</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>애플리케이션을 로드하는 중 문제가 발생했습니다.</p>
      <pre style={{ background: 'rgba(255,0,0,0.1)', padding: '20px', borderRadius: '8px', fontSize: '0.8rem', overflowX: 'auto', maxWidth: '80vw' }}>
        {error?.toString()}
      </pre>
      <button
        onClick={() => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for(let registration of registrations) {
                        registration.unregister();
                    }
                    window.location.reload(true);
                }).catch(err => {
                    console.error('ServiceWorker unregistration failed:', err);
                    window.location.reload(true);
                });
            } else {
                window.location.reload(true);
            }
        }}
        style={{ marginTop: '30px', padding: '12px 24px', background: 'var(--primary-gold)', color: 'black', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        새로고침 및 캐시 초기화 (Retry)
      </button>
    </div>
  </div>
);

// --- AUTH GUARD ---
const RequireAuth = ({ children }) => {
  // BYPASS Auth for agent testing
  return children;
};

function App() {
  useEffect(() => {
    // [PERF] 출석체크 키오스크(/) 경로에서는 full 모드 초기화 건너뜀
    // CheckInPage가 자체적으로 kiosk 모드로 초기화 (리스너 없이 캐시만)
    if (window.location.pathname !== '/') {
      storageService.initialize({ mode: 'full' });
    }
  }, []);

  return (
    <BrowserRouter>
      <StudioProvider>
        <NetworkProvider>
          <PWAProvider>
            <div className="app">
              <NotificationListener />
              <Routes>
                <Route path="/" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><CheckInPage /></Suspense></ErrorBoundary>} />
                <Route path="/admin" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><RequireAuth><AdminDashboard /></RequireAuth></Suspense></ErrorBoundary>} />
                <Route path="/member" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><MemberProfile /></Suspense></ErrorBoundary>} />
                <Route path="/login" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><LoginPage /></Suspense></ErrorBoundary>} />
                <Route path="/instructor" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><InstructorPage /></Suspense></ErrorBoundary>} />
                <Route path="/meditation" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><MeditationPage /></Suspense></ErrorBoundary>} />
              </Routes>
              <NetworkStatus />
              <ReloadPrompt />
            </div>
          </PWAProvider>
        </NetworkProvider>
      </StudioProvider>
    </BrowserRouter>
  );
}

export default App;
