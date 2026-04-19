import { useLanguageStore } from '../../stores/useLanguageStore';
import { useState, useEffect } from 'react';
import { Bell, BellSlash, CheckCircle, Warning, Info } from '@phosphor-icons/react';
import { storageService } from '../../services/storage';
import { useStudioConfig } from '../../contexts/StudioContext';
const PushNotificationSettings = ({
  memberId
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
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
      setMessage(t("g_f77585") || "\uD478\uC2DC \uC54C\uB9BC \uC0C1\uD0DC\uB97C \uD655\uC778\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    } finally {
      setLoading(false);
    }
  };
  const handleReregister = async () => {
    if (!memberId) {
      alert(t("g_a324ad") || "\uD68C\uC6D0 \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
      return;
    }
    setReregistering(true);
    setMessage(t("g_7ec0c4") || "\uD478\uC2DC \uC54C\uB9BC\uC744 \uC7AC\uC124\uC815\uD558\uB294 \uC911...");
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
      setMessage(`${t("reset_failed") || "Reset Failed"}: ${error.message}`);
    } finally {
      setReregistering(false);
    }
  };
  if (loading) {
    return <div style={styles.container}>
                <div style={styles.loadingText}>{t("g_e2f0dc") || "\uD478\uC2DC \uC54C\uB9BC \uC0C1\uD0DC \uD655\uC778 \uC911..."}</div>
            </div>;
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
  return <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.iconWrapper}>
                    {getStatusIcon()}
                </div>
                <div style={styles.headerText}>
                    <h3 style={styles.title}>{t("g_e2739a") || "\uD478\uC2DC \uC54C\uB9BC \uC124\uC815"}</h3>
                    <p style={{
          ...styles.subtitle,
          color: getStatusColor()
        }}>
                        {message}
                    </p>
                </div>
            </div>

            {/* 상세 정보 */}
            {status && status.supported && <div style={styles.detailsContainer}>
                    <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>{t("g_f5c404") || "\uBE0C\uB77C\uC6B0\uC800 \uC9C0\uC6D0:"}</span>
                        <span style={status.supported ? styles.detailSuccess : styles.detailError}>
                            {status.supported ? t("g_673cbb") || "\u2713 \uC9C0\uC6D0\uB428" : t("g_424c5e") || "\u2717 \uBBF8\uC9C0\uC6D0"}
                        </span>
                    </div>
                    <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>{t("g_62a4fa") || "\uC54C\uB9BC \uAD8C\uD55C:"}</span>
                        <span style={status.permission === 'granted' ? styles.detailSuccess : status.permission === 'denied' ? styles.detailError : styles.detailWarning}>
                            {status.permission === 'granted' ? t("g_e9eefe") || "\u2713 \uD5C8\uC6A9\uB428" : status.permission === 'denied' ? t("g_773bf7") || "\u2717 \uCC28\uB2E8\uB428" : t("g_aa002b") || "\u25CB \uBBF8\uC124\uC815"}
                        </span>
                    </div>
                    <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Service Worker:</span>
                        <span style={status.serviceWorker ? styles.detailSuccess : styles.detailError}>
                            {status.serviceWorker ? t("g_d6a0d7") || "\u2713 \uD65C\uC131\uD654" : t("g_b06352") || "\u2717 \uBE44\uD65C\uC131\uD654"}
                        </span>
                    </div>
                    <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>{t("g_00a7be") || "\uD478\uC2DC \uD1A0\uD070:"}</span>
                        <span style={status.hasToken ? styles.detailSuccess : styles.detailError}>
                            {status.hasToken ? t("g_7d4a6e") || "\u2713 \uB4F1\uB85D\uB428" : t("g_171a52") || "\u2717 \uBBF8\uB4F1\uB85D"}
                        </span>
                    </div>
                </div>}

            {/* 조치 필요 시 버튼 및 안내 */}
            {needsAction && <div style={styles.actionContainer}>
                    <div style={styles.infoBox}>
                        <Info size={18} color="#3b82f6" style={{
          flexShrink: 0
        }} />
                        <div style={styles.infoText}>
                            {status.permission === 'denied' ? <span>{t("g_b8b24a") || "\uBE0C\uB77C\uC6B0\uC800 \uC124\uC815\uC5D0\uC11C \uC54C\uB9BC\uC744 \uD5C8\uC6A9\uD574\uC8FC\uC138\uC694:"}<br />
                                    <strong>1.</strong>{t("g_92dc2f") || "\uC8FC\uC18C\uCC3D \uC67C\uCABD\uC758 \uC790\uBB3C\uC1E0(\uD83D\uDD12) \uC544\uC774\uCF58 \uD074\uB9AD"}<br />
                                    <strong>2.</strong>{t("g_996454") || "\uC54C\uB9BC \u2192 \uD5C8\uC6A9\uC73C\uB85C \uBCC0\uACBD"}<br />
                                    <strong>3.</strong>{t("g_d24ae5") || "\uD398\uC774\uC9C0 \uC0C8\uB85C\uACE0\uCE68 \uD6C4 \uC544\uB798 \uBC84\uD2BC \uD074\uB9AD"}</span> : <span>{t("g_32c087") || "\uD478\uC2DC \uC54C\uB9BC\uC744 \uBC1B\uC73C\uB824\uBA74 \uC544\uB798 \uBC84\uD2BC\uC744 \uB20C\uB7EC \uC124\uC815\uC744 \uC644\uB8CC\uD574\uC8FC\uC138\uC694."}</span>}
                        </div>
                    </div>

                    <button onClick={handleReregister} disabled={reregistering || status.permission === 'denied'} style={{
        ...styles.button,
        background: config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)',
        ...(reregistering || status.permission === 'denied' ? styles.buttonDisabled : {})
      }}>
                        {reregistering ? <>
                                <div style={styles.spinner}></div>{t("g_5868a8") || "\uC7AC\uC124\uC815 \uC911..."}</> : <>
                                <Bell size={18} style={{
            marginRight: '8px'
          }} />{t("g_ddca5b") || "\uD478\uC2DC \uC54C\uB9BC \uC7AC\uC124\uC815\uD558\uAE30"}</>}
                    </button>
                </div>}

            {/* 성공 상태 */}
            {status && status.hasToken && status.permission === 'granted' && <div style={styles.successBox}>
                    <CheckCircle size={20} color="#10b981" weight="fill" />
                    <span style={styles.successText}>{t("g_74db6c") || "\uD478\uC2DC \uC54C\uB9BC\uC774 \uC815\uC0C1\uC801\uC73C\uB85C \uC124\uC815\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4."}</span>
                </div>}

            {/* 재설정 버튼 (문제가 있을 때만) */}
            {status && status.hasToken && status.permission === 'granted' && <button onClick={handleReregister} disabled={reregistering} style={styles.secondaryButton}>
                    <Bell size={16} style={{
        marginRight: '6px'
      }} />{t("g_cb3f23") || "\uC7AC\uC124\uC815"}</button>}
        </div>;
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
    color: 'var(--text-on-primary)',
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