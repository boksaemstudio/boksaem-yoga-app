
import { Icons } from '../CommonIcons';

const PWAInstallPrompts = ({ isInStandaloneMode, isInAppBrowser, isIOS, installPrompt, handleInstallClick, t }) => {
    if (isInStandaloneMode || isInAppBrowser) {
        if (isInAppBrowser) {
            return (
                <div className="glass-panel" style={{
                    padding: '16px',
                    marginTop: '20px',
                    background: 'rgba(255, 165, 2, 0.1)',
                    border: '1px solid rgba(255, 165, 2, 0.3)'
                }}>
                    <p style={{ margin: 0, color: '#ffa502', fontSize: '0.85rem', lineHeight: '1.5' }}>
                        {t('inAppBrowserWarning')}
                    </p>
                </div>
            );
        }
        return null;
    }

    return (
        <div className="glass-panel" style={{
            padding: '16px',
            marginTop: '20px',
            background: 'rgba(20, 20, 20, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'none'
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ background: 'rgba(212, 175, 55, 0.08)', padding: '8px', borderRadius: '8px' }}>
                    <Icons.DownloadSimple size={20} color="rgba(212, 175, 55, 0.7)" weight="regular" />
                </div>
                <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', color: 'rgba(212, 175, 55, 0.8)', fontSize: '0.9rem', fontWeight: '600' }}>
                        {t('installApp')}
                    </h4>
                    <p style={{ margin: '0 0 12px 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', lineHeight: '1.5' }}>
                        {isIOS ? t('installDescIOS') : t('installDescAndroid')}
                    </p>

                    {isIOS ? (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: '500' }}>
                                <span style={{ background: 'rgba(212, 175, 55, 0.3)', color: 'white', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>1</span>
                                하단 <Icons.Export size={16} weight="bold" style={{ color: '#007AFF' }} /> 공유 버튼 클릭
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: '500' }}>
                                <span style={{ background: 'rgba(212, 175, 55, 0.3)', color: 'white', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>2</span>
                                &apos;홈 화면에 추가&apos; 선택
                            </div>
                        </div>
                    ) : (
                        installPrompt ? (
                            <button
                                onClick={handleInstallClick}
                                style={{
                                    background: 'rgba(212, 175, 55, 0.2)',
                                    color: 'var(--primary-gold)',
                                    border: '1px solid rgba(212, 175, 55, 0.3)',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    width: '100%'
                                }}
                            >
                                {t('installBtn')}
                            </button>
                        ) : (
                            <p style={{ fontSize: '0.7rem', color: 'rgba(212, 175, 55, 0.6)', background: 'rgba(212, 175, 55, 0.03)', padding: '6px', borderRadius: '6px', textAlign: 'center', margin: 0 }}>
                                {t('appInstallGuide')}
                            </p>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default PWAInstallPrompts;
