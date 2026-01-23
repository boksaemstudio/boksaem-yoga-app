import React from 'react';
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
            padding: '24px',
            marginTop: '25px',
            background: 'linear-gradient(135deg, #1a1a1c, #0d0d0f)',
            border: '1px solid var(--primary-gold)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'var(--primary-gold)', opacity: 0.05, borderRadius: '50%' }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '10px', borderRadius: '12px' }}>
                    <Icons.DownloadSimple size={32} color="var(--primary-gold)" weight="bold" />
                </div>
                <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 6px 0', color: 'var(--primary-gold)', fontSize: '1.2rem', fontWeight: '800' }}>
                        {t('installApp')}
                    </h4>
                    <p style={{ margin: '0 0 16px 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                        {isIOS ? t('installDescIOS') : t('installDescAndroid')}
                    </p>

                    {isIOS ? (
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>
                                <span style={{ background: 'var(--primary-gold)', color: 'black', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>1</span>
                                하단 <Icons.Export size={20} weight="bold" style={{ color: '#007AFF' }} /> 공유 버튼 클릭
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>
                                <span style={{ background: 'var(--primary-gold)', color: 'black', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>2</span>
                                '홈 화면에 추가' 선택
                            </div>
                        </div>
                    ) : (
                        installPrompt ? (
                            <button
                                onClick={handleInstallClick}
                                style={{
                                    background: 'var(--primary-gold)',
                                    color: 'black',
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    fontWeight: '800',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    width: '100%',
                                    boxShadow: '0 5px 15px rgba(212, 175, 55, 0.3)'
                                }}
                            >
                                {t('installBtn')}
                            </button>
                        ) : (
                            <p style={{ fontSize: '0.8rem', color: 'var(--primary-gold)', opacity: 0.8, background: 'rgba(212, 175, 55, 0.05)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
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
