import React from 'react';
import { ArrowLeft, SpeakerHigh } from '@phosphor-icons/react';
import { MeditationDebugOverlay } from '../MeditationDebugOverlay';

export const PreparationView = ({
    config, visualTheme, isDebugMode, ttsState, step, audioVolumes, aiMessage, aiLatency,
    prepStep, setPrepStep, prepSelections, setPrepSelections, interactionType, startSession, activeMode, setStep
}) => {
    const PREPARATION_GUIDES = {
        chair: {
            title: "의자 명상", desc: "회사나 집에서 간편하게",
            steps: ["의자 앞쪽에 걸터앉아 허리를 세웁니다.", "양발은 어깨너비로 벌려 지면에 닿게 합니다.", "손은 편안하게 무릎 위에 올립니다."]
        },
        floor: {
            title: "바닥 명상", desc: "조용하고 안정적인 공간에서",
            steps: ["가부좌 또는 편한 책상다리를 합니다.", "쿠션을 활용해 무릎이 엉덩이보다 낮게 합니다.", "척추를 곧게 펴고 정수리를 하늘로 당깁니다."]
        },
        lying: {
            title: "누운 명상", desc: "깊은 이완과 수면을 위해",
            steps: ["등을 대고 편안하게 눕습니다.", "다리는 어깨 너비로 벌리고 발끝을 툭 떨어뜨립니다.", "팔은 몸 옆에 두고 손바닥이 하늘을 향하게 합니다."]
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 2000,
            display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden'
        }}>
            <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                {/* 🛠️ Debug Overlay */}
                <MeditationDebugOverlay 
                    isVisible={isDebugMode}
                    ttsState={ttsState}
                    currentStep={step}
                    audioLevels={audioVolumes}
                    currentText={aiMessage}
                    aiLatency={aiLatency}
                />
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                    <button onClick={() => setStep('interaction_select')} style={{ padding: '10px', color: 'white', background: 'none', border: 'none' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary-gold)', fontWeight: 600 }}>준비 단계 ({prepStep}/3)</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>명상 준비</div>
                    </div>
                    <div style={{ width: '44px' }} />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '10px' }}>
                    {/* STEP 1: Notifications Off */}
                    {prepStep === 1 && (
                        <div style={{ width: '100%', maxWidth: '350px', animation: 'fadeIn 0.5s ease' }}>
                            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔕</div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '10px' }}>주변을 고요하게</h3>
                                <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
                                    방해받지 않도록 <br/>기기를 '무음' 또는 '방해금지' 모드로 <br/>설정해주셨나요?
                                </p>
                                <div style={{ 
                                    background: 'rgba(76, 155, 251, 0.1)', 
                                    border: '1px solid rgba(76, 155, 251, 0.2)',
                                    borderRadius: '15px', padding: '15px', marginTop: '10px',
                                    textAlign: 'left', fontSize: '0.85rem'
                                }}>
                                    <div style={{ color: config.THEME?.PRIMARY_COLOR || '#4c9bfb', fontWeight: 700, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <SpeakerHigh size={14} weight="fill" /> 안심하세요
                                    </div>
                                    <div style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                                        '무음'이나 '방해금지' 모드에서도 **명상 가이드와 배경음은 정상적으로 들립니다.** 외부 알림만 차단되니 안심하고 설정해주세요.
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => { setPrepSelections({...prepSelections, notified: true}); setPrepStep(2); }}
                                style={{
                                    width: '100%', background: 'var(--primary-gold)', color: 'var(--text-on-primary)',
                                    padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, border: 'none',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>확인했습니다</button>
                        </div>
                    )}

                    {/* STEP 3: Posture Guide */}
                    {prepStep === 3 && (
                        <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeIn 0.5s ease' }}>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'white', marginBottom: '15px', textAlign: 'center' }}>가장 편한 자세를 찾아보세요</h3>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                                {Object.entries(PREPARATION_GUIDES).map(([key, info]) => (
                                    <button key={key} onClick={() => setPrepSelections({...prepSelections, posture: key})}
                                        style={{
                                            flex: 1, padding: '10px 4px', borderRadius: '12px', fontSize: '0.8rem',
                                            background: prepSelections.posture === key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)',
                                            color: prepSelections.posture === key ? 'white' : 'rgba(255,255,255,0.4)',
                                            border: prepSelections.posture === key ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                                            fontWeight: 600
                                        }}>{info.title}</button>
                                ))}
                            </div>
                            <div style={{ 
                                background: 'rgba(255,255,255,0.05)', borderRadius: '24px', padding: '20px',
                                border: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px', minHeight: '180px'
                            }}>
                                <div style={{ color: 'var(--primary-gold)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>{PREPARATION_GUIDES[prepSelections.posture].desc}</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', marginBottom: '12px' }}>{PREPARATION_GUIDES[prepSelections.posture].title} 자세</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {PREPARATION_GUIDES[prepSelections.posture].steps.map((s, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '8px', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: 1.4 }}>
                                            <span style={{ color: 'var(--primary-gold)', fontWeight: 800 }}>{i+1}</span>
                                            <span>{s}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => setPrepStep(2)} 
                                style={{
                                    width: '100%', background: 'white', color: 'var(--text-on-primary)',
                                    padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, border: 'none',
                                    cursor: 'pointer', marginBottom: '15px'
                                }}>기기 위치 설정으로</button>
                        </div>
                    )}
                    
                    {/* STEP 2: Phone Placement */}
                    {prepStep === 2 && (
                        <div style={{ width: '100%', maxWidth: '350px', animation: 'fadeIn 0.5s ease' }}>
                            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>
                                    {interactionType === 'v3' ? '📏' : (interactionType === 'v2' ? '👄' : '📱')}
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '10px' }}>핸드폰 위치 설정</h3>
                                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, fontSize: '1.1rem' }}>
                                    {interactionType === 'v3' ? "전신 촬영을 위해 핸드폰을 약 2m 거리에 세워두세요." : (interactionType === 'v2' ? "숨소리 감지를 위해 핸드폰을 입 근처(30cm 내)에 비스듬히 세워두세요." : "핸드폰을 손이 닿는 편한 곳에 두세요.")}
                                </p>
                                {interactionType === 'v2' && (
                                    <div style={{ 
                                        marginTop: '20px', padding: '12px', background: 'rgba(74, 222, 128, 0.1)', 
                                        borderRadius: '12px', border: `1px solid ${config.THEME?.SUCCESS_COLOR || '#4ade80'}33`, fontSize: '0.85rem', color: config.THEME?.SUCCESS_COLOR || '#4ade80'
                                    }}>💡 <b>Tip:</b> 마이크가 포함된 이어폰을 사용하시면 숨소리를 훨씬 더 정확하게 감지할 수 있어요.</div>
                                )}
                            </div>
                            <button onClick={() => startSession(activeMode)}
                                style={{
                                    width: '100%', background: 'var(--primary-gold)', color: 'var(--text-on-primary)',
                                    padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, border: 'none',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>준비 완료 (명상 시작)</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
