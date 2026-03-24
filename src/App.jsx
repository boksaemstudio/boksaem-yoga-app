import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ErrorBoundary from './components/common/ErrorBoundary';
import { storageService } from './services/storage';
import NotificationListener from './components/common/NotificationListener';
import { PWAProvider } from './contexts/PWAContext';

import { StudioProvider } from './contexts/StudioContext';
import NetworkStatus from './components/common/NetworkStatus';
import { useStudioConfig } from './contexts/StudioContext';
import ReloadPrompt from './components/ReloadPrompt';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { attendanceService } from './services/attendanceService';


// Lazy load pages
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CheckInPage = lazy(() => import('./pages/CheckInPage'));
const MemberProfile = lazy(() => import('./pages/MemberProfile'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const InstructorPage = lazy(() => import('./pages/InstructorPage'));
const MeditationPage = lazy(() => import('./pages/MeditationPage'));
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));

// Loading fallback
const LoadingScreen = () => {
    const { config } = useStudioConfig();
    const primary = config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)';
    const skeleton = config.THEME?.SKELETON_COLOR || '#1a1a1a';
    
    return (
      <div className="global-loading-screen" style={{ color: primary }}>
        <div className="global-loading-content">
          <div className="loading-spinner" style={{ border: `4px solid ${skeleton}`, borderTop: `4px solid ${primary}` }}></div>
          <h2 className="global-loading-title">{config.IDENTITY?.NAME || 'Studio'}</h2>
        </div>
      </div>
    );
};

// Error fallback
const ErrorFallback = ({ error }) => (
  <div className="global-error-fallback">
    <div className="global-error-content">
      <h1 className="global-error-title">⚠️ 시스템 오류 발생</h1>
      <p className="global-error-desc">애플리케이션을 로드하는 중 문제가 발생했습니다.</p>
      <pre className="global-error-pre">
        {error?.toString()}
      </pre>
      <button
        className="global-error-btn"
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
      >
        새로고침 및 캐시 초기화 (Retry)
      </button>
    </div>
  </div>
);

// --- AUTH GUARD ---
const RequireAuth = ({ children }) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsAuthed(!!user);
      setAuthChecked(true);
      if (!user) navigate('/login', { replace: true });
    });
    return () => unsub();
  }, [navigate]);

  if (!authChecked) return <div className="auth-checking">인증 확인 중...</div>;
  if (!isAuthed) return null;
  return children;
};

function App() {
  // 네트워크 상태 트리거 마운트 (이벤트 콜러 역할)
  const isOnline = useNetworkStatus();

  useEffect(() => {
    // [PERF] 출석체크 키오스크(/) 경로에서는 full 모드 초기화 건너뜀
    // CheckInPage가 자체적으로 kiosk 모드로 초기화 (리스너 없이 캐시만)
    if (window.location.pathname !== '/') {
      storageService.initialize({ mode: 'full' });
    }

    // 온라인 복구 시 오프라인 큐 동기화 리스너 등록
    const handleSyncTrigger = async () => {
        if (navigator.onLine) {
            console.log('[App] Network restored. Triggering offline queue sync...');
            await attendanceService.syncPendingCheckins();
        }
    };

    window.addEventListener('SYNC_OFFLINE_QUEUE', handleSyncTrigger);
    
    // 앱이 처음 시작될 때도 큐가 남아있고 온라인이면 즉시 동기화
    if (navigator.onLine) {
        handleSyncTrigger();
    }

    return () => window.removeEventListener('SYNC_OFFLINE_QUEUE', handleSyncTrigger);
  }, []);

  return (
    <BrowserRouter>
      <StudioProvider>
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
                <Route path="/super-admin" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><RequireAuth><SuperAdminPage /></RequireAuth></Suspense></ErrorBoundary>} />
                <Route path="/privacy" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><PrivacyPolicyPage /></Suspense></ErrorBoundary>} />
              </Routes>
              <NetworkStatus />
              <ReloadPrompt />
            </div>
          </PWAProvider>
      </StudioProvider>
    </BrowserRouter>
  );
}

export default App;
