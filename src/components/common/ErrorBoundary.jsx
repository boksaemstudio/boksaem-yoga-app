import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Chunk Load Error: Reload the page automatically once if a new deployment happened
        if (error?.message?.includes('Failed to fetch dynamically imported module') ||
            error?.message?.includes('Importing a module script failed')) {
            const isReloaded = sessionStorage.getItem('chunk_reload');
            if (!isReloaded) {
                sessionStorage.setItem('chunk_reload', 'true');
                window.location.reload();
                return { hasError: false };
            }
        }
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        if (!error?.message?.includes('Failed to fetch dynamically imported module')) {
            sessionStorage.removeItem('chunk_reload');
        }
        console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
        this.setState({ error, errorInfo });
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

                return (
                    <div className="eb-fallback">
                        <div>
                            <h1 className="eb-title">⚠️ 시스템 오류 발생</h1>
                            <p className="eb-subtitle">잠시 후 자동으로 복구됩니다...</p>
                            <p className="eb-hint">
                                {reloadCount < 3 ? '10초 후 자동 새로고침' : '자동 복구 시도 횟수 초과'}
                            </p>
                            <div style={{ marginTop: '30px' }}>
                                <button onClick={() => window.location.reload()} className="eb-btn-primary">
                                    지금 새로고침
                                </button>
                            </div>
                        </div>
                    </div>
                );
            }

            return (
                <div className="eb-fallback-full">
                    <h1 className="eb-title">⚠️ 시스템 오류 발생</h1>
                    <p style={{ color: 'white', marginBottom: '10px' }}>애플리케이션을 불러오는 중 문제가 발생했습니다.</p>

                    <div className="eb-error-box">
                        <h3 style={{ margin: '0 0 10px 0' }}>{this.state.error && this.state.error.toString()}</h3>
                        <pre style={{ fontSize: '0.8rem', opacity: 0.7, whiteSpace: 'pre-wrap' }}>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => window.location.reload()} className="eb-btn-primary">
                            새로고침 (F5)
                        </button>
                        <button onClick={() => window.location.href = '/'} className="eb-btn-ghost">
                            홈으로 이동
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
