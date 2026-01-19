import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { House, UserGear, User } from '@phosphor-icons/react';
import CheckInPage from './pages/CheckInPage';
import AdminDashboard from './pages/AdminDashboard';
import MemberProfile from './pages/MemberProfile';

const Navigation = () => {
  const location = useLocation();

  // 출석체크(키오스크) 화면 또는 관리자 모드(/admin)에서는 네비게이션을 숨깁니다.
  if (location.pathname === '/' || location.pathname === '/admin') {
    return null;
  }

  // 회원 정보 페이지에서도 일단 숨깁니다.
  if (location.pathname === '/member') {
    return null;
  }

  // 관리자 대시보드(/admin) 등 기타 페이지에서 보여줄 네비게이션
  return (
    <nav style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: 'var(--bg-surface)',
      padding: '8px 16px',
      borderRadius: 'var(--radius-full)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      display: 'flex',
      gap: '20px',
      zIndex: 100,
      border: '1px solid var(--border-color)'
    }}>
      <Link to="/" title="출석체크 키오스크로 이동" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
        <House size={24} />
        <span style={{ fontSize: '0.8rem' }}>출석체크</span>
      </Link>
      <Link to="/member" title="회원 정보 조회 페이지로 이동" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
        <User size={24} />
        <span style={{ fontSize: '0.8rem' }}>회원정보</span>
      </Link>
    </nav>
  );
};

import { storageService } from './services/storage';
import LoginPage from './pages/LoginPage';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RequireAuth = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading

  useEffect(() => {
    storageService.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });
  }, []);

  if (isAuthenticated === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-main)' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    // We use a small timeout or just render null to allow navigate to work
    // But better to just navigate here? 
    // Actually, navigate in render is bad. Use useEffect?
    // Let's just return Navigate component if we imported it, or simpler:
    // We can't navigate in render easily without <Navigate>.
    // Let's import Navigate from react-router-dom.
    return null; // The useEffect below handles navigation
  }

  return children;
};

// Start a separate component to handle redirection to avoid hook rules in conditional render
const AuthGuard = ({ children }) => {
  const [status, setStatus] = useState('loading'); // loading, authenticated, unauthenticated
  const navigate = useNavigate();

  useEffect(() => {
    storageService.onAuthStateChanged((user) => {
      if (user) {
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');
        navigate('/login', { replace: true });
      }
    });
  }, [navigate]);

  if (status === 'loading') {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)' }}>인증 확인 중...</div>;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return children;
};

function AppContent() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<CheckInPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <AuthGuard>
              <AdminDashboard />
            </AuthGuard>
          }
        />
        <Route path="/member" element={<MemberProfile />} />
      </Routes>
      <Navigation />
    </div>
  );
}

const App = () => {
  useEffect(() => {
    // Global Error Listener (for non-React errors)
    const handleError = (event) => {
      storageService.logError(event.error || new Error(event.message), { source: 'window.onerror' });
    };

    // Global Promise Rejection Listener (for async errors)
    const handleRejection = (event) => {
      storageService.logError(event.reason || new Error("Unhandled Rejection"), { source: 'unhandledrejection' });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
