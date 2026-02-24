import React, { useContext, useEffect, useState } from 'react';
import { PWAContext } from '../../context/PWAContextDef';
import { DownloadSimple } from '@phosphor-icons/react';

const InstallBanner = ({ onManualInstallClick }) => {
    const { isStandalone, deviceOS, installApp } = useContext(PWAContext) || {};
    const [isVisible, setIsVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // 이미 PWA로 설치되어 있거나, 사용자가 닫은 적이 있으면 렌더링하지 않음
        const hasDismissed = localStorage.getItem('hide_install_banner') === 'true';
        setDismissed(hasDismissed);

        if (!isStandalone && !hasDismissed) {
            // 초기 렌더링 시 깜빡임 방지용 약간의 딜레이
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [isStandalone]);

    if (!isVisible || isStandalone || dismissed) return null;

    const handleInstallClick = async () => {
        if (deviceOS === 'android') {
            const installed = await installApp();
            // 기본 설치 프롬프트가 안 뜨는 경우 예비용 모달 오픈
            if (!installed && onManualInstallClick) {
                onManualInstallClick();
            }
        } else {
            // iOS는 항상 수동 가이드 모달
            if (onManualInstallClick) {
                onManualInstallClick();
            }
        }
    };

    const handleDismiss = (e) => {
        e.stopPropagation();
        setIsVisible(false);
        localStorage.setItem('hide_install_banner', 'true');
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '80px', // 네비게이션 바 바로 위
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
            animation: 'slideUpBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
            width: 'calc(100% - 40px)',
            maxWidth: '350px'
        }}>
            <div 
                style={{
                    background: 'rgba(20, 20, 25, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '24px',
                    padding: '12px 18px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    cursor: 'pointer'
                }}
                onClick={handleInstallClick}
            >
                <div style={{
                    width: '36px', height: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary-gold), #b8860b)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#000',
                    flexShrink: 0
                }}>
                    <DownloadSimple size={20} weight="bold" />
                </div>
                
                <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>
                        앱 설치하고 1초 접속 ⚡️
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                        터치해서 홈 화면에 바로 추가하세요
                    </p>
                </div>

                <button
                    onClick={handleDismiss}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.4)',
                        padding: '8px',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        lineHeight: 1
                    }}
                >
                    &times;
                </button>
            </div>
            <style>{`
                @keyframes slideUpBounce {
                    0% { transform: translate(-50%, 100px); opacity: 0; }
                    100% { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default InstallBanner;
