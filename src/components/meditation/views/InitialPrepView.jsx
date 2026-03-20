import React from 'react';
import { MeditationDebugOverlay } from '../MeditationDebugOverlay';
import { SpeakerHigh } from '../../CommonIcons';

export const InitialPrepView = ({
    config, visualTheme, isDebugMode, ttsState, step, audioVolumes, aiMessage, aiLatency,
    setPrepSelections, setStep
}) => (
    <div style={{ position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 9999, display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden' }}>
        <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <MeditationDebugOverlay isVisible={isDebugMode} ttsState={ttsState} currentStep={step} audioLevels={audioVolumes} currentText={aiMessage} aiLatency={aiLatency} />
            <div style={{ width: '100%', maxWidth: '350px', animation: 'fadeIn 0.5s ease', textAlign: 'center' }}>
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔕</div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '10px' }}>주변을 고요하게</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
                        방해받지 않도록 <br/>기기를 &apos;무음&apos; 또는 &apos;방해금지&apos; 모드로 <br/>설정해주셨나요?
                    </p>
                    
                    <div style={{ background: 'rgba(76, 155, 251, 0.1)', border: '1px solid rgba(76, 155, 251, 0.2)', borderRadius: '15px', padding: '15px', marginTop: '10px', textAlign: 'left', fontSize: '0.85rem' }}>
                        <div style={{ color: config.THEME?.PRIMARY_COLOR || '#4c9bfb', fontWeight: 700, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <SpeakerHigh size={14} weight="fill" /> 안심하세요
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                            &apos;무음&apos;이나 &apos;방해금지&apos; 모드에서도 **명상 가이드와 배경음은 정상적으로 들립니다.** 외부 알림만 차단되니 안심하고 설정해주세요.
                        </div>
                    </div>
                </div>
                <button onClick={() => { setPrepSelections(prev => ({...prev, notified: true})); setStep('intention'); }}
                    style={{ width: '100%', background: 'var(--primary-gold)', color: 'black', padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    확인했습니다
                </button>
            </div>
        </div>
    </div>
);
