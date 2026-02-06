import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { storageService } from './services/storage';

// Lazy load pages
// Lazy load pages
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CheckInPage = lazy(() => import('./pages/CheckInPage'));
const MemberProfile = lazy(() => import('./pages/MemberProfile'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const InstructorPage = lazy(() => import('./pages/InstructorPage'));

// Loading fallback
const LoadingScreen = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: '#D4AF37' }}>
    <div style={{ textAlign: 'center' }}>
      <div className="loading-spinner" style={{ border: '4px solid rgba(212, 175, 55, 0.1)', borderTop: '4px solid var(--primary-gold)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>복샘요가 로딩 중...</h2>
    </div>
  </div>
);

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
        onClick={() => window.location.reload()}
        style={{ marginTop: '30px', padding: '12px 24px', background: 'var(--primary-gold)', color: 'black', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        새로고침 시도
      </button>
    </div>
  </div>
);

// --- AUTH GUARD ---
const RequireAuth = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = storageService.onAuthStateChanged((currentUser) => {
      // For Admin, only allow non-anonymous users
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

import NotificationListener from './components/common/NotificationListener';
import ReloadPrompt from './components/ReloadPrompt';
import { PWAProvider } from './context/PWAContext';

function App() {
  useEffect(() => {
    // Initialize storage service with real-time listeners for Admin/Mobile apps
    storageService.initialize({ mode: 'full' });
  }, []);

  return (
    <BrowserRouter>
      <PWAProvider>
        <div className="app">
          <NotificationListener />
          <ReloadPrompt />
          <Routes>
            <Route
              path="/"
              element={
                <ErrorBoundary fallback={<ErrorFallback />}>
                  <Suspense fallback={<LoadingScreen />}>
                    <CheckInPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/admin"
              element={
                <ErrorBoundary fallback={<ErrorFallback />}>
                  <Suspense fallback={<LoadingScreen />}>
                    <RequireAuth>
                      <AdminDashboard />
                    </RequireAuth>
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/member"
              element={
                <ErrorBoundary fallback={<ErrorFallback />}>
                  <Suspense fallback={<LoadingScreen />}>
                    <MemberProfile />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/login"
              element={
                <ErrorBoundary fallback={<ErrorFallback />}>
                  <Suspense fallback={<LoadingScreen />}>
                    <LoginPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/instructor"
              element={
                <ErrorBoundary fallback={<ErrorFallback />}>
                  <Suspense fallback={<LoadingScreen />}>
                    <InstructorPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
          </Routes>
        </div>
      </PWAProvider>
    </BrowserRouter>
  );
}

export default App;
