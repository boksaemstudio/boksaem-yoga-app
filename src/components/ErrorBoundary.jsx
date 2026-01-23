import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Chunk Load Error: Reload the page automatically once if a new deployment happened
        if (error?.message?.includes('Failed to fetch dynamically imported module') ||
            error?.message?.includes('Importing a module script failed')) {

            // Check if we already tried reloading to avoid infinite loops
            const isReloaded = sessionStorage.getItem('chunk_reload');
            if (!isReloaded) {
                sessionStorage.setItem('chunk_reload', 'true');
                window.location.reload();
                return { hasError: false }; // Technically we reload, but valid return
            }
        }

        // UI 업데이트를 위해 다음 렌더링에서 폴백 UI가 보이도록 상태를 업데이트 합니다.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Clear reload flag if it wasn't a chunk error or if we showed the error UI
        if (!error?.message?.includes('Failed to fetch dynamically imported module')) {
            sessionStorage.removeItem('chunk_reload');
        }

        // 에러 리포팅 서비스에 에러를 기록할 수도 있습니다.
        console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // 폴백 UI를 커스텀하여 렌더링할 수 있습니다.
            return (
                <div style={{ padding: '40px', color: '#ff6b6b', background: '#121212', height: '100vh', overflow: 'auto', fontFamily: 'monospace' }}>
                    <h1 style={{ marginBottom: '20px' }}>⚠️ 시스템 오류 발생</h1>
                    <p style={{ color: 'white', marginBottom: '10px' }}>관리자 페이지 로딩 중 문제가 발생했습니다.</p>

                    <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>{this.state.error && this.state.error.toString()}</h3>
                        <pre style={{ fontSize: '0.8rem', opacity: 0.7, whiteSpace: 'pre-wrap' }}>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => window.location.reload()}
                            style={{ padding: '12px 24px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            새로고침 (F5)
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer' }}
                        >
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
