import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        loadLogs();
    }, []);

    return (
        <div className="dashboard-card" style={{ border: '1px solid rgba(244, 63, 94, 0.3)', background: 'rgba(20, 20, 20, 0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F43F5E' }}>
                    <Warning size={20} /> 서버 에러 로그 (최근 50건)
                </h3>
                <button onClick={loadLogs} className="action-btn sm">
                    <ArrowClockwise size={16} /> 새로고침
                </button>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ fontWeight: 'bold', color: '#F43F5E' }}>{log.errorType || 'Error'}</span>
                                <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>
                                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'No Date'}
                                </span>
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
