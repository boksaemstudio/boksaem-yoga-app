import { useLanguageStore } from './stores/useLanguageStore';
import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ErrorBoundary from './components/common/ErrorBoundary';
import { storageService } from './services/storage';
import NotificationListener from './components/common/NotificationListener';
import { PWAProvider } from './contexts/PWAContext';
import KakaoFloatingButton from './components/common/KakaoFloatingButton';
import { StudioProvider } from './contexts/StudioContext';
import NetworkStatus from './components/common/NetworkStatus';
import { useStudioConfig } from './contexts/StudioContext';
import ReloadPrompt from './components/ReloadPrompt';
import { auth } from './firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
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
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const AuthActionPage = lazy(() => import('./pages/AuthActionPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'));

// i18n helper for loading/error screens
const getLang = () => new URLSearchParams(window.location.search).get('lang') || 'ko';
const loadingTexts = {
  ko: {
    error: t("g_4a3c78") || t("g_4a3c78") || t("g_4a3c78") || "\u26A0\uFE0F \uC2DC\uC2A4\uD15C \uC624\uB958 \uBC1C\uC0DD",
    errorDesc: t("g_30a896") || t("g_30a896") || t("g_30a896") || "\uC560\uD50C\uB9AC\uCF00\uC774\uC158\uC744 \uB85C\uB4DC\uD558\uB294 \uC911 \uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
    retry: t("g_40d1a4") || t("g_40d1a4") || t("g_40d1a4") || "\uC0C8\uB85C\uACE0\uCE68 \uBC0F \uCE90\uC2DC \uCD08\uAE30\uD654",
    authCheck: t("g_67843b") || t("g_67843b") || t("g_67843b") || "\uC778\uC99D \uD655\uC778 \uC911...",
    permCheck: t("g_11eed3") || t("g_11eed3") || t("g_11eed3") || "\uAD8C\uD55C \uD655\uC778 \uC911...",
    accessDenied: t("g_ab52c5") || t("g_ab52c5") || t("g_ab52c5") || "\uD83D\uDD12 \uC811\uADFC \uAD8C\uD55C \uC5C6\uC74C",
    accessDeniedDesc: t("g_b37f72") || t("g_b37f72") || t("g_b37f72") || "\uC774 \uC5C5\uC7A5\uC758 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
    logoutBtn: t("g_9ab19a") || t("g_9ab19a") || t("g_9ab19a") || "\uB85C\uADF8\uC544\uC6C3",
    superAdmin: t("g_2115ca") || t("g_2115ca") || t("g_2115ca") || "\uD83D\uDC51 \uC288\uD37C\uC5B4\uB4DC\uBBFC \uC804\uC6A9",
    superAdminDesc: t("g_da41da") || t("g_da41da") || t("g_da41da") || "\uC774 \uD398\uC774\uC9C0\uB294 \uD50C\uB7AB\uD3FC \uAD00\uB9AC\uC790\uB9CC \uC811\uADFC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
    adminLogin: t("g_7cc44b") || t("g_7cc44b") || t("g_7cc44b") || "\uAD00\uB9AC\uC790 \uACC4\uC815 \uB85C\uADF8\uC778",
    goHome: t("g_ff4936") || t("g_ff4936") || t("g_ff4936") || "\uD648\uC73C\uB85C \uC774\uB3D9",
    demoSite: t("g_f2f16f") || t("g_f2f16f") || t("g_f2f16f") || "\uD83C\uDFAF \uB370\uBAA8 \uC0AC\uC774\uD2B8",
    demoDesc: t("g_048429") || t("g_048429") || t("g_048429") || "\uB370\uBAA8 \uC0AC\uC774\uD2B8\uC5D0 \uC811\uC18D\uD569\uB2C8\uB2E4.",
    demoAccess: t("g_dd9d7b") || t("g_dd9d7b") || t("g_dd9d7b") || "\uB370\uBAA8 \uC811\uC18D\uD558\uAE30",
    demoPreparing: t("g_208ef9") || t("g_208ef9") || t("g_208ef9") || "\uB370\uBAA8 \uC0AC\uC774\uD2B8 \uC900\uBE44 \uC911..."
  },
  en: {
    error: '⚠️ System Error',
    errorDesc: 'An error occurred while loading the application.',
    retry: 'Retry & Clear Cache',
    authCheck: 'Checking authentication...',
    permCheck: 'Checking permissions...',
    accessDenied: '🔒 Access Denied',
    accessDeniedDesc: 'You don\'t have admin access to this studio.',
    logoutBtn: 'Logout',
    superAdmin: '👑 Super Admin Only',
    superAdminDesc: 'This page is only accessible to platform administrators.',
    adminLogin: 'Login as Admin',
    goHome: 'Go Home',
    demoSite: '🎯 Demo Site',
    demoDesc: 'Accessing the demo site.',
    demoAccess: 'Access Demo',
    demoPreparing: 'Preparing demo site...'
  },
  ja: {
    error: '⚠️ システムエラー',
    errorDesc: 'アプリの読み込み中にエラーが発生しました。',
    retry: 'リロード＆キャッシュクリア',
    authCheck: '認証確認中...',
    permCheck: '権限確認中...',
    accessDenied: '🔒 アクセス拒否',
    accessDeniedDesc: '管理者権限がありません。',
    logoutBtn: 'ログアウト',
    superAdmin: '👑 スーパー管理者専用',
    superAdminDesc: 'このページはプラットフォーム管理者専用です。',
    adminLogin: '管理者ログイン',
    goHome: 'ホームへ',
    demoSite: '🎯 デモサイト',
    demoDesc: 'デモサイトに接続します。',
    demoAccess: 'デモにアクセス',
    demoPreparing: 'デモ準備中...'
  },
  ru: {
    error: '⚠️ Системная ошибка',
    errorDesc: 'Произошла ошибка при загрузке приложения.',
    retry: 'Обновить и очистить кэш',
    authCheck: 'Проверка аутентификации...',
    permCheck: 'Проверка прав...',
    accessDenied: '🔒 Доступ запрещён',
    accessDeniedDesc: 'У вас нет прав администратора.',
    logoutBtn: 'Выйти',
    superAdmin: '👑 Только для супер-админа',
    superAdminDesc: 'Эта страница доступна только администраторам платформы.',
    adminLogin: 'Войти как админ',
    goHome: 'На главную',
    demoSite: '🎯 Демо',
    demoDesc: 'Подключение к демо.',
    demoAccess: 'Войти в демо',
    demoPreparing: 'Подготовка демо...'
  },
  zh: {
    error: '⚠️ 系统错误',
    errorDesc: '加载应用程序时发生错误。',
    retry: '刷新并清除缓存',
    authCheck: '验证中...',
    permCheck: '检查权限...',
    accessDenied: '🔒 访问被拒绝',
    accessDeniedDesc: '您没有管理员权限。',
    logoutBtn: '登出',
    superAdmin: '👑 超级管理员专属',
    superAdminDesc: '此页面仅限平台管理员访问。',
    adminLogin: '管理员登录',
    goHome: '返回首页',
    demoSite: '🎯 演示站点',
    demoDesc: '正在访问演示站点。',
    demoAccess: '进入演示',
    demoPreparing: '正在准备演示...'
  }
};
const lt = () => loadingTexts[getLang()] || loadingTexts.en;

// Loading fallback
const LoadingScreen = () => {
  const t = useLanguageStore(s => s.t);
  const { config } = useStudioConfig();
  const primary = config?.THEME?.PRIMARY_COLOR || 'var(--primary-gold)';
  const skeleton = config?.THEME?.SKELETON_COLOR || '#1a1a1a';
  
  return (
    <div className="global-loading-screen" style={{ color: primary }}>
        <div className="global-loading-content">
          <div className="loading-spinner" style={{
            border: `4px solid ${skeleton}`,
            borderTop: `4px solid ${primary}`
          }}></div>
          <h2 className="global-loading-title" style={{ marginTop: '16px', fontSize: '1rem', color: 'var(--text-secondary)' }}>
            {t('loading') || 'Loading...'}
          </h2>
        </div>
    </div>
  );
};

// Error fallback
const ErrorFallback = ({
  error
}) => {
  const t = lt();
  return <div className="global-error-fallback">
    <div className="global-error-content">
      <h1 className="global-error-title">{t.error}</h1>
      <p className="global-error-desc">{t.errorDesc}</p>
      <pre className="global-error-pre">
        {error?.toString()}
      </pre>
      <button className="global-error-btn" onClick={() => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
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
      }}>
        {t.retry}
      </button>
    </div>
  </div>;
};

// --- AUTH GUARD ---
const RequireAuth = ({
  children
}) => {
  const t = useLanguageStore(s => s.t);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setIsAuthed(!!user);
      setAuthChecked(true);
      if (!user) navigate('/login', {
        replace: true
      });
    });
    return () => unsub();
  }, [navigate]);
  if (!authChecked) return <div className="auth-checking">{lt().authCheck}</div>;
  if (!isAuthed) return null;
  return children;
};

// --- ADMIN GUARD (claims.role === admin/superadmin + studioId 일치) ---
import { getCurrentStudioId } from './utils/resolveStudioId';
const RequireAdmin = ({
  children
}) => {
  const t = useLanguageStore(s => s.t);
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    // [DEMO] 데모사이트는 로그인 없이 접근 가능 (정확히 'passflowai' 또는 'passflowai' 매칭)
    const isDemoSite = window.location.hostname.includes('passflow') || window.location.hostname.includes('passflowai') || localStorage.getItem('lastStudioId') === 'demo-yoga';
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        if (isDemoSite) {
          // 데모 사이트: 자동 익명 인증 후 접근 허용
          try {
            await signInAnonymously(auth);
            // onAuthStateChanged가 다시 호출됨
          } catch (e) {
            console.warn('[Demo] Anonymous auth failed, granting access anyway');
            setAllowed(true);
            setChecked(true);
          }
          return;
        }
        navigate('/login', {
          replace: true
        });
        return;
      }

      // [DEMO] 데모 사이트: 모든 사용자(익명 포함) 접근 허용
      if (isDemoSite) {
        setAllowed(true);
        setChecked(true);
        return;
      }
      try {
        const tokenResult = await user.getIdTokenResult();
        const claims = tokenResult.claims;
        const role = claims.role;

        // 슈퍼어드민은 모든 업장 접근 가능
        if (role === 'superadmin') {
          setAllowed(true);
          setChecked(true);
          return;
        }

        // 일반 어드민은 studioId 일치 필요
        if (role === 'admin') {
          const currentStudioId = getCurrentStudioId();
          if (claims.studioId === currentStudioId) {
            setAllowed(true);
            setChecked(true);
            return;
          }
        }

        // [SECURITY] claims 미설정 사용자 → 접근 차단 (마이그레이션 기간 종료)
        if (!role) {
          console.warn('[Auth] ❌ No admin claims for', user.email, '- ACCESS DENIED');
          setAllowed(false);
          setChecked(true);
          return;
        }
        setAllowed(false);
        setChecked(true);
      } catch (e) {
        console.error('[Auth] Claims check failed:', e);
        setAllowed(false);
        setChecked(true);
      }
    });
    return () => unsub();
  }, [navigate]);
  if (!checked) return <div className="auth-checking">{lt().permCheck}</div>;
  if (!allowed) {
    // [DEMO] 접근 거부 시에도 데모 사이트면 (혹은 데모 스튜디오면) 캐시 지우고 자동 새로고침
    const isDemoFallback = window.location.hostname.includes('passflow') || localStorage.getItem('lastStudioId') === 'demo-yoga';
    if (isDemoFallback) {
      const reloadKey = 'demo-cache-cleared';
      if (!sessionStorage.getItem(reloadKey)) {
        // 1회만 캐시 지우고 새로고침
        sessionStorage.setItem(reloadKey, '1');
        if ('caches' in window) {
          caches.keys().then(names => names.forEach(name => caches.delete(name)));
        }
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
        }
        setTimeout(() => window.location.reload(), 500);
        return <div className="auth-checking">{lt().demoPreparing}</div>;
      }
      // 새로고침 후에도 여전히 차단이면 → 수동 버튼
      return <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#08080A',
        color: '#f0f0f0'
      }}>
          <div style={{
          textAlign: 'center',
          padding: '40px'
        }}>
            <h2 style={{
            color: 'var(--primary-gold)',
            marginBottom: '16px'
          }}>{lt().demoSite}</h2>
            <p style={{
            color: '#888',
            marginBottom: '20px'
          }}>{lt().demoDesc}</p>
            <button onClick={() => {
            sessionStorage.removeItem(reloadKey);
            auth.signOut().then(() => window.location.reload());
          }} style={{
            padding: '12px 30px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}>{lt().demoAccess}</button>
          </div>
        </div>;
    }
    return <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#08080A',
      color: '#f0f0f0'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px'
      }}>
        <h2 style={{
          color: '#EF4444',
          marginBottom: '16px'
        }}>{lt().accessDenied}</h2>
        <p style={{
          color: '#888'
        }}>{lt().accessDeniedDesc}</p>
        <button onClick={() => {
          auth.signOut();
          navigate('/login');
        }} style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: '#3B82F6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}>{lt().logoutBtn}</button>
      </div>
    </div>;
  }
  return children;
};

// --- SUPER ADMIN GUARD (claims.role === superadmin 전용) ---
const RequireSuperAdmin = ({
  children
}) => {
  const t = useLanguageStore(s => s.t);
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        navigate('/login', {
          replace: true
        });
        return;
      }
      try {
        const tokenResult = await user.getIdTokenResult();
        const role = tokenResult.claims.role;

        // [SECURITY] claims 미설정 사용자 → 슈퍼어드민 접근 완전 차단
        // 익명 로그인이면 슈퍼어드민일 수 없으므로 로그인 페이지로 보내기
        if (user.isAnonymous) {
          navigate('/login', {
            replace: true
          });
          return;
        }

        // [SECURITY] claims 미설정 사용자 → 슈퍼어드민 접근 완전 차단
        if (!role) {
          console.warn('[Auth] ❌ No superadmin claims for', user.email, '- ACCESS DENIED');
          setAllowed(false);
          setChecked(true);
          return;
        }

        // Remove domain block logic so user can access super admin from their own domain

        setAllowed(role === 'superadmin');
        setChecked(true);
      } catch (e) {
        console.error('[Auth] SuperAdmin check failed:', e);
        setAllowed(false);
        setChecked(true);
      }
    });
    return () => unsub();
  }, [navigate]);
  if (!checked) return <div className="auth-checking">{lt().permCheck}</div>;
  if (!allowed) return <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#08080A',
    color: '#f0f0f0'
  }}>
      <div style={{
      textAlign: 'center',
      padding: '40px'
    }}>
        <h2 style={{
        color: '#EF4444',
        marginBottom: '16px'
      }}>{lt().superAdmin}</h2>
        <p style={{
        color: '#888'
      }}>{lt().superAdminDesc}</p>
        <div style={{
        display: 'flex',
        gap: '10px',
        justifyContent: 'center',
        marginTop: '20px'
      }}>
          <button onClick={() => {
          auth.signOut().then(() => navigate('/login'));
        }} style={{
          padding: '10px 20px',
          background: '#3B82F6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}>{lt().adminLogin}</button>
          <button onClick={() => {
          auth.signOut().then(() => window.location.href = '/');
        }} style={{
          padding: '10px 20px',
          background: '#333',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}>{lt().goHome}</button>
        </div>
      </div>
    </div>;
  return children;
};

// --- ROOT ROUTE GUARD (도메인에 따라 랜딩페이지 vs 출석키오스크 분기) ---
const RootRoute = () => {
  const t = useLanguageStore(s => s.t);
  // [SaaS] 플랫폼 도메인에서는 랜딩페이지로, 그 외(각 스튜디오 도메인)에서는 키오스크로
  const isPlatform = window.location.hostname === 'passflowai.web.app';
  if (isPlatform) {
    if (window.location.pathname === '/') window.location.href = '/home';
    return null;
  }
  return <CheckInPage />;
};

// [FIX] Force hard reload to break Service Worker hijacking for static HTML files
const HardReload = ({
  target
}) => {
  const t = useLanguageStore(s => s.t);
  useEffect(() => {
    window.location.replace(target);
  }, [target]);
  return <div className="auth-checking">Redirecting...</div>;
};
function App() {
  const t = useLanguageStore(s => s.t);
  // 네트워크 상태 트리거 마운트 (이벤트 콜러 역할)
  const isOnline = useNetworkStatus();
  useEffect(() => {
    // [PERF] 출석체크 키오스크(/) 경로에서는 full 모드 초기화 건너뜀
    // CheckInPage가 자체적으로 kiosk 모드로 초기화 (리스너 없이 캐시만)
    if (window.location.pathname !== '/') {
      storageService.initialize({
        mode: 'full'
      });
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
  return <BrowserRouter>
      <StudioProvider>
          <PWAProvider>
            <div className="app">
              <NotificationListener />
              <Routes>
                <Route path="/" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><RootRoute /></Suspense></ErrorBoundary>} />
                <Route path="/checkin" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><CheckInPage /></Suspense></ErrorBoundary>} />
                <Route path="/admin" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><RequireAdmin><AdminDashboard /></RequireAdmin></Suspense></ErrorBoundary>} />
                <Route path="/member" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><MemberProfile /></Suspense></ErrorBoundary>} />
                <Route path="/login" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><LoginPage /></Suspense></ErrorBoundary>} />
                <Route path="/onboarding" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><OnboardingPage /></Suspense></ErrorBoundary>} />
                <Route path="/instructor" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><InstructorPage /></Suspense></ErrorBoundary>} />
                <Route path="/meditation" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><MeditationPage /></Suspense></ErrorBoundary>} />
                <Route path="/super-admin" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><RequireSuperAdmin><SuperAdminPage /></RequireSuperAdmin></Suspense></ErrorBoundary>} />
                <Route path="/auth/action" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><AuthActionPage /></Suspense></ErrorBoundary>} />
                <Route path="/privacy" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><PrivacyPolicyPage /></Suspense></ErrorBoundary>} />
                <Route path="/features" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><FeaturesPage /></Suspense></ErrorBoundary>} />
                <Route path="/features.html" element={<HardReload target="/features" />} />
                <Route path="/home" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><LandingPage /></Suspense></ErrorBoundary>} />
                <Route path="/home.html" element={<HardReload target="/home" />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <NetworkStatus />
              <ReloadPrompt />
              {(window.location.hostname.includes('passflowai') || window.location.hostname === 'localhost') && <KakaoFloatingButton />}
            </div>
          </PWAProvider>
      </StudioProvider>
    </BrowserRouter>;
}
export default App;