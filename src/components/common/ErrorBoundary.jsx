import { useLanguageStore } from '../../stores/useLanguageStore';
import { Component } from 'react';
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
                            <h1 className="eb-title">{t("g_4a3c78") || t("g_4a3c78") || t("g_4a3c78") || t("g_4a3c78") || t("g_4a3c78") || "\u26A0\uFE0F \uC2DC\uC2A4\uD15C \uC624\uB958 \uBC1C\uC0DD"}</h1>
                            <p className="eb-subtitle">{t("g_c96347") || t("g_c96347") || t("g_c96347") || t("g_c96347") || t("g_c96347") || "\uC7A0\uC2DC \uD6C4 \uC790\uB3D9\uC73C\uB85C \uBCF5\uAD6C\uB429\uB2C8\uB2E4..."}</p>
                            <p className="eb-hint">
                                {reloadCount < 3 ? t("g_ccd5c0") || t("g_ccd5c0") || t("g_ccd5c0") || t("g_ccd5c0") || t("g_ccd5c0") || "10\uCD08 \uD6C4 \uC790\uB3D9 \uC0C8\uB85C\uACE0\uCE68" : t("g_77178b") || t("g_77178b") || t("g_77178b") || t("g_77178b") || t("g_77178b") || "\uC790\uB3D9 \uBCF5\uAD6C \uC2DC\uB3C4 \uD69F\uC218 \uCD08\uACFC"}
                            </p>
                            <div style={{
              marginTop: '30px'
            }}>
                                <button onClick={() => window.location.reload()} className="eb-btn-primary">{t("g_9a702f") || t("g_9a702f") || t("g_9a702f") || t("g_9a702f") || t("g_9a702f") || "\uC9C0\uAE08 \uC0C8\uB85C\uACE0\uCE68"}</button>
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
          }}>{t("g_2977ec") || t("g_2977ec") || t("g_2977ec") || t("g_2977ec") || t("g_2977ec") || "\u2728 \uC5C5\uB370\uC774\uD2B8\uAC00 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4"}</h1>
                        <p style={{
            color: 'var(--text-secondary)',
            marginBottom: '30px',
            maxWidth: '400px',
            lineHeight: '1.5'
          }}>{t("g_fbbd6b") || t("g_fbbd6b") || t("g_fbbd6b") || t("g_fbbd6b") || t("g_fbbd6b") || "\uC0C8\uB85C\uC6B4 \uAE30\uB2A5\uC774 \uBC30\uD3EC\uB418\uC5B4 \uCD5C\uC2E0 \uBC84\uC804\uC744 \uBD88\uB7EC\uC640\uC57C \uD569\uB2C8\uB2E4."}<br />{t("g_367556") || t("g_367556") || t("g_367556") || t("g_367556") || t("g_367556") || "\uC544\uB798 \uBC84\uD2BC\uC744 \uB20C\uB7EC \uC571\uC744 \uC7AC\uC2DC\uC791\uD574\uC8FC\uC138\uC694."}</p>
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
          }}>{t("g_eacf78") || t("g_eacf78") || t("g_eacf78") || t("g_eacf78") || t("g_eacf78") || "\uC571 \uC7AC\uC2DC\uC791 (\uC5C5\uB370\uC774\uD2B8 \uC801\uC6A9)"}</button>
                    </div>;
      }
      return <div className="eb-fallback-full">
                    <h1 className="eb-title">{t("g_4a3c78") || t("g_4a3c78") || t("g_4a3c78") || t("g_4a3c78") || t("g_4a3c78") || "\u26A0\uFE0F \uC2DC\uC2A4\uD15C \uC624\uB958 \uBC1C\uC0DD"}</h1>
                    <p style={{
          color: 'white',
          marginBottom: '10px'
        }}>{t("g_404971") || t("g_404971") || t("g_404971") || t("g_404971") || t("g_404971") || "\uC560\uD50C\uB9AC\uCF00\uC774\uC158\uC744 \uBD88\uB7EC\uC624\uB294 \uC911 \uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."}</p>

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
                        <button onClick={() => window.location.reload()} className="eb-btn-primary">{t("g_b68cf3") || t("g_b68cf3") || t("g_b68cf3") || t("g_b68cf3") || t("g_b68cf3") || "\uC0C8\uB85C\uACE0\uCE68 (F5)"}</button>
                        <button onClick={() => window.location.href = '/'} className="eb-btn-ghost">{t("g_ff4936") || t("g_ff4936") || t("g_ff4936") || t("g_ff4936") || t("g_ff4936") || "\uD648\uC73C\uB85C \uC774\uB3D9"}</button>
                    </div>
                </div>;
    }
    return this.props.children;
  }
}
export default ErrorBoundary;