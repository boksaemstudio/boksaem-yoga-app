import { useState, useEffect } from 'react';
import { Warning, ArrowClockwise, Trash } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';

const ErrorLogsTab = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await storageService.getErrorLogs(50);
            setLogs(data);
        } catch (error) {
            console.error('Failed to load error logs', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (logId) => {
        if (!confirm('이 에러 로그를 삭제하시겠습니까?')) return;

        try {
            await storageService.deleteErrorLog(logId);
            setLogs(logs.filter(log => log.id !== logId));
        } catch (error) {
            alert('삭제 실패: ' + error.message);
        }
    };

    const handleClearAll = async () => {
        if (!confirm(`모든 에러 로그 (${logs.length}건)를 삭제하시겠습니까?`)) return;

        try {
            setLoading(true);
            const result = await storageService.clearErrorLogs();
            if (result.success) {
                setLogs([]);
                alert(`${result.count}건의 에러 로그가 삭제되었습니다.`);
            }
        } catch (error) {
            alert('삭제 실패: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    return (
        <div className="dashboard-card" style={{ border: '1px solid rgba(244, 63, 94, 0.3)', background: 'rgba(20, 20, 20, 0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F43F5E', margin: 0 }}>
                    <Warning size={22} weight="fill" /> 서버 에러 로그 (표시: {logs.length}건 / 최대 50건)
                </h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {logs.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="action-btn"
                            style={{
                                background: 'rgba(244, 63, 94, 0.2)',
                                border: '1px solid #F43F5E',
                                color: '#F43F5E',
                                fontWeight: '800',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.85rem'
                            }}
                        >
                            <Trash size={18} weight="bold" /> 전체 삭제
                        </button>
                    )}
                    <button
                        onClick={loadLogs}
                        className="action-btn"
                        style={{
                            padding: '8px 12px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px'
                        }}
                    >
                        <ArrowClockwise size={18} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>로그 불러오는 중...</div>
            ) : logs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
                    <Check size={32} style={{ marginBottom: '10px', color: '#4CD964' }} />
                    <p>최근 발생한 에러가 없습니다. 시스템이 건강합니다! 🎉</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {logs.map(log => (
                        <div key={log.id} style={{
                            padding: '15px',
                            background: 'rgba(255,255,255,0.03)',
                            borderLeft: '3px solid #F43F5E',
                            borderRadius: '4px',
                            fontSize: '0.9rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', color: '#F43F5E' }}>{log.errorType || 'Error'}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>
                                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'No Date'}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(log.id)}
                                        style={{
                                            background: 'rgba(244, 63, 94, 0.2)',
                                            border: '1px solid rgba(244, 63, 94, 0.5)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            color: '#F43F5E',
                                            fontSize: '0.75rem',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => e.target.style.background = 'rgba(244, 63, 94, 0.3)'}
                                        onMouseOut={(e) => e.target.style.background = 'rgba(244, 63, 94, 0.2)'}
                                    >
                                        <Trash size={14} />
                                    </button>
                                </div>
                            </div>
                            <div style={{ marginBottom: '8px', color: '#FFF' }}>{log.message}</div>
                            {log.stack && (
                                <details style={{ cursor: 'pointer' }}>
                                    <summary style={{ opacity: 0.5, fontSize: '0.8rem' }}>스택 추적 보기</summary>
                                    <pre style={{
                                        marginTop: '10px',
                                        padding: '10px',
                                        background: 'rgba(0,0,0,0.5)',
                                        borderRadius: '4px',
                                        overflowX: 'auto',
                                        fontSize: '0.75rem',
                                        color: '#F43F5E'
                                    }}>
                                        {log.stack}
                                    </pre>
                                </details>
                            )}
                            <div style={{ marginTop: '8px', fontSize: '0.8rem', opacity: 0.5 }}>
                                User: {log.userId || 'Anonymous'} | UA: {log.userAgent}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Simple Check Icon for Empty State
const Check = ({ size, style }) => (
    <svg width={size} height={size} viewBox="0 0 256 256" style={style}>
        <path fill="currentColor" d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"></path>
    </svg>
);

export default ErrorLogsTab;
