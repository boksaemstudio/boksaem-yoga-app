import React, { useState, useEffect } from 'react';
import { Bell, BellSlash, CheckCircle, Warning, Info } from '@phosphor-icons/react';
import { storageService } from '../../services/storage';

const PushNotificationSettings = ({ memberId }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reregistering, setReregistering] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        setLoading(true);
        try {
            const pushStatus = await storageService.checkPushNotificationStatus();
            setStatus(pushStatus);
            setMessage(pushStatus.message);
        } catch (error) {
            console.error('Push status check failed:', error);
            setMessage('푸시 알림 상태를 확인할 수 없습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleReregister = async () => {
        if (!memberId) {
            alert('회원 정보가 없습니다.');
            return;
        }

        setReregistering(true);
        setMessage('푸시 알림을 재설정하는 중...');

        try {
            const result = await storageService.reregisterPushToken(memberId);

            if (result.success) {
                setMessage(result.message);
                // 상태 새로고침
                await checkStatus();
            } else {
                setMessage(result.message);
            }
        } catch (error) {
            console.error('Reregistration failed:', error);
            setMessage(`재설정 실패: ${error.message}`);
        } finally {
            setReregistering(false);
        }
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingText}>푸시 알림 상태 확인 중...</div>
            </div>
        );
    }

    const getStatusIcon = () => {
        if (!status) return <Info size={24} color="#a1a1aa" />;
        if (!status.supported) return <BellSlash size={24} color="#ef4444" />;
        if (status.permission === 'denied') return <Warning size={24} color="#f59e0b" />;
        if (status.hasToken) return <CheckCircle size={24} color="#10b981" weight="fill" />;
        return <Bell size={24} color="#6b7280" />;
    };

    const getStatusColor = () => {
        if (!status || !status.supported) return '#ef4444';
        if (status.permission === 'denied') return '#f59e0b';
        if (status.hasToken) return '#10b981';
        return '#6b7280';
    };

    const needsAction = status && status.supported && (!status.hasToken || status.permission !== 'granted');

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.iconWrapper}>
                    {getStatusIcon()}
                </div>
                <div style={styles.headerText}>
                    <h3 style={styles.title}>푸시 알림 설정</h3>
                    <p style={{ ...styles.subtitle, color: getStatusColor() }}>
                        {message}
                    </p>
                </div>
            </div>

            {/* 상세 정보 */}
            {status && status.supported && (
                <div style={styles.detailsContainer}>
                    <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>브라우저 지원:</span>
                        <span style={status.supported ? styles.detailSuccess : styles.detailError}>
                            {status.supported ? '✓ 지원됨' : '✗ 미지원'}
                        </span>
                    </div>
                    <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>알림 권한:</span>
                        <span style={
                            status.permission === 'granted' ? styles.detailSuccess :
                                status.permission === 'denied' ? styles.detailError :
                                    styles.detailWarning
                        }>
                            {status.permission === 'granted' ? '✓ 허용됨' :
                                status.permission === 'denied' ? '✗ 차단됨' :
                                    '○ 미설정'}
                        </span>
                    </div>
                    <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Service Worker:</span>
                        <span style={status.serviceWorker ? styles.detailSuccess : styles.detailError}>
                            {status.serviceWorker ? '✓ 활성화' : '✗ 비활성화'}
                        </span>
                    </div>
                    <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>푸시 토큰:</span>
                        <span style={status.hasToken ? styles.detailSuccess : styles.detailError}>
                            {status.hasToken ? '✓ 등록됨' : '✗ 미등록'}
                        </span>
                    </div>
                </div>
            )}

            {/* 조치 필요 시 버튼 및 안내 */}
            {needsAction && (
                <div style={styles.actionContainer}>
                    <div style={styles.infoBox}>
                        <Info size={18} color="#3b82f6" style={{ flexShrink: 0 }} />
                        <div style={styles.infoText}>
                            {status.permission === 'denied' ? (
                                <span>
                                    브라우저 설정에서 알림을 허용해주세요:<br />
                                    <strong>1.</strong> 주소창 왼쪽의 자물쇠(🔒) 아이콘 클릭<br />
                                    <strong>2.</strong> 알림 → 허용으로 변경<br />
                                    <strong>3.</strong> 페이지 새로고침 후 아래 버튼 클릭
                                </span>
                            ) : (
                                <span>
                                    푸시 알림을 받으려면 아래 버튼을 눌러 설정을 완료해주세요.
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleReregister}
                        disabled={reregistering || status.permission === 'denied'}
                        style={{
                            ...styles.button,
                            ...(reregistering || status.permission === 'denied' ? styles.buttonDisabled : {})
                        }}
                    >
                        {reregistering ? (
                            <>
                                <div style={styles.spinner}></div>
                                재설정 중...
                            </>
                        ) : (
                            <>
                                <Bell size={18} style={{ marginRight: '8px' }} />
                                푸시 알림 재설정하기
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* 성공 상태 */}
            {status && status.hasToken && status.permission === 'granted' && (
                <div style={styles.successBox}>
                    <CheckCircle size={20} color="#10b981" weight="fill" />
                    <span style={styles.successText}>
                        푸시 알림이 정상적으로 설정되어 있습니다.
                    </span>
                </div>
            )}

            {/* 재설정 버튼 (문제가 있을 때만) */}
            {status && status.hasToken && status.permission === 'granted' && (
                <button
                    onClick={handleReregister}
                    disabled={reregistering}
                    style={styles.secondaryButton}
                >
                    <Bell size={16} style={{ marginRight: '6px' }} />
                    재설정
                </button>
            )}
        </div>
    );
};

const styles = {
    container: {
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
    },
    header: {
        display: 'flex',
        alignItems: 'flex-start',
        marginBottom: '16px',
        gap: '12px'
    },
    iconWrapper: {
        flexShrink: 0,
        marginTop: '2px'
    },
    headerText: {
        flex: 1
    },
    title: {
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: 'white',
        margin: '0 0 6px 0'
    },
    subtitle: {
        fontSize: '0.9rem',
        margin: 0
    },
    loadingText: {
        color: '#9ca3af',
        fontSize: '0.95rem',
        textAlign: 'center',
        padding: '20px 0'
    },
    detailsContainer: {
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '16px'
    },
    detailItem: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        fontSize: '0.85rem'
    },
    detailLabel: {
        color: '#9ca3af'
    },
    detailSuccess: {
        color: '#10b981',
        fontWeight: '500'
    },
    detailError: {
        color: '#ef4444',
        fontWeight: '500'
    },
    detailWarning: {
        color: '#f59e0b',
        fontWeight: '500'
    },
    actionContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    infoBox: {
        display: 'flex',
        gap: '10px',
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '0.85rem',
        lineHeight: '1.5',
        color: '#bfdbfe'
    },
    infoText: {
        flex: 1
    },
    button: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--primary-gold, #D4AF37)',
        color: 'black',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 20px',
        fontSize: '0.95rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    buttonDisabled: {
        background: '#52525b',
        color: '#a1a1aa',
        cursor: 'not-allowed'
    },
    spinner: {
        width: '16px',
        height: '16px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTop: '2px solid white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginRight: '8px'
    },
    successBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '8px',
        padding: '10px 12px',
        marginBottom: '12px'
    },
    successText: {
        fontSize: '0.9rem',
        color: '#6ee7b7'
    },
    secondaryButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: '#9ca3af',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '6px',
        padding: '8px 16px',
        fontSize: '0.85rem',
        cursor: 'pointer',
        transition: 'all 0.2s'
    }
};

export default PushNotificationSettings;
