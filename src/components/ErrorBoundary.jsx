import React from 'react';
import { storageService } from '../services/storage';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to our custom storage service
        storageService.logError(error, {
            componentStack: errorInfo.componentStack,
            source: 'ErrorBoundary'
        });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div style={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#121212',
                    color: '#ffffff',
                    fontFamily: 'sans-serif',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <h1 style={{ marginBottom: '20px', color: '#ff6b6b' }}>잠시 문제가 발생했습니다.</h1>
                    <p style={{ marginBottom: '40px', color: '#aaaaaa', maxWidth: '400px' }}>
                        앱 실행 중 예기치 않은 오류가 감지되었습니다.<br />
                        오류 내용은 개발자에게 자동으로 보고되었습니다.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '12px 24px',
                            fontSize: '1rem',
                            backgroundColor: '#4e54c8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                        }}
                    >
                        앱 새로고침
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
