import { useLanguageStore } from '../../stores/useLanguageStore';
import { Component } from 'react';

// [FIX] 클래스 컴포넌트에서는 React Hook을 사용할 수 없으므로
// useLanguageStore.getState().t 로 직접 접근
const getT = () => {
  try {
    return useLanguageStore.getState().t;
  } catch {
    return (key) => undefined;
  }
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }
  static getDerivedStateFromError(error) {
    // Chunk Load Error: Return error state to render fallback UI where user can manually reload
    return {
      hasError: true,
      error
    };
  }
  componentDidCatch(error, errorInfo) {
    if (!error?.message?.includes('Failed to fetch dynamically imported module')) {
      sessionStorage.removeItem('chunk_reload_time');
    }
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }
  render() {
    if (this.state.hasError) {
      const t = getT();
      // [ALWAYS-ON] 키오스크(/) 경로에서는 10초 후 자동 새로고침
      const isKiosk = window.location.pathname === '/';
      if (isKiosk) {
        const reloadCount = parseInt(sessionStorage.getItem('eb_reload_count') || '0');
        if (reloadCount < 3) {
          sessionStorage.setItem('eb_reload_count', String(reloadCount + 1));
          setTimeout(() => window.location.reload(), 10000);
          setTimeout(() => sessionStorage.removeItem('eb_reload_count'), 30000);
        }
        return <div className="eb-fallback">
                        <div>
                            <h1 className="eb-title">{t("g_4a3c78") || "⚠️ System Error"}</h1>
                            <p className="eb-subtitle">{t("g_c96347") || "Recovering automatically..."}</p>
                            <p className="eb-hint">
                                {reloadCount < 3 ? (t("g_ccd5c0") || "Auto-refreshing in 10 seconds") : (t("g_77178b") || "Auto-recovery attempts exceeded")}
                            </p>
                            <div style={{
              marginTop: '30px'
            }}>
                                <button onClick={() => window.location.reload()} className="eb-btn-primary">{t("g_9a702f") || "Refresh Now"}</button>
                            </div>
                        </div>
                    </div>;
      }
      const isChunkError = this.state.error?.message?.includes('Failed to fetch dynamically imported module') || this.state.error?.message?.includes('Importing a module script failed');
      if (isChunkError) {
        return <div className="eb-fallback-full" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          textAlign: 'center',
          background: 'var(--bg-dark)'
        }}>
                        <h1 className="eb-title" style={{
            color: 'var(--primary-gold)',
            marginBottom: '16px'
          }}>{t("g_2977ec") || "✨ Update Complete"}</h1>
                        <p style={{
            color: 'var(--text-secondary)',
            marginBottom: '30px',
            maxWidth: '400px',
            lineHeight: '1.5'
          }}>{t("g_fbbd6b") || "A new version has been deployed. Please reload to get the latest features."}<br />{t("g_367556") || "Tap the button below to restart the app."}</p>
                        <button onClick={async () => {
            sessionStorage.setItem('chunk_reload_time', Date.now().toString());
            try {
              if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                  await reg.unregister();
                }
              }
              if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
              }
            } catch (e) {
              console.error('Cache clear failed', e);
            }
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('t', Date.now().toString());
            window.location.href = currentUrl.toString();
          }} className="eb-btn-primary" style={{
            padding: '12px 24px',
            fontSize: '1rem'
          }}>{t("g_eacf78") || "Restart App (Apply Update)"}</button>
                    </div>;
      }
      return <div className="eb-fallback-full">
                    <h1 className="eb-title">{t("g_4a3c78") || "⚠️ System Error"}</h1>
                    <p style={{
          color: 'white',
          marginBottom: '10px'
        }}>{t("g_404971") || "Something went wrong while loading the application."}</p>

                    <div className="eb-error-box">
                        <h3 style={{
            margin: '0 0 10px 0'
          }}>{this.state.error && this.state.error.toString()}</h3>
                        <pre style={{
            fontSize: '0.8rem',
            opacity: 0.7,
            whiteSpace: 'pre-wrap'
          }}>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>

                    <div style={{
          display: 'flex',
          gap: '10px'
        }}>
                        <button onClick={() => window.location.reload()} className="eb-btn-primary">{t("g_b68cf3") || "Refresh (F5)"}</button>
                        <button onClick={() => window.location.href = '/'} className="eb-btn-ghost">{t("g_ff4936") || "Go to Home"}</button>
                    </div>
                </div>;
    }
    return this.props.children;
  }
}
export default ErrorBoundary;