import { MeditationDebugOverlay } from '../MeditationDebugOverlay';

// Local Icons
const Brain = ({ size = 24, weight = "regular" }) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor">
        <path d="M176,16A48,48,0,0,0,131,52.42,48,48,0,0,0,80,16a72,72,0,0,0-72,72c0,42.76,33.56,80.32,80,103.5v16.5A16,16,0,0,0,104,224h48a16,16,0,0,0,16-16v-16.5c46.44-23.18,80-60.74,80-103.5A72,72,0,0,0,176,16ZM104,208v-6a45.69,45.69,0,0,0,48,0v6ZM156.44,188A61.64,61.64,0,0,1,128,206.56,61.64,61.64,0,0,1,99.56,188c-42.33-21.78-75.56-55.88-75.56-100a56,56,0,0,1,112,0,8,8,0,0,0,16,0,56,56,0,0,1,112,0C232,132.12,198.77,166.22,156.44,188ZM64,88a8,8,0,0,1,16,0,40,40,0,0,0,40,40,8,8,0,0,1,0,16,56.06,56.06,0,0,1-56-56Zm144,0a56.06,56.06,0,0,1-56,56,8,8,0,0,1,0-16,40,40,0,0,0,40-40,8,8,0,0,1,16,0Z" />
    </svg>
);
const Wind = ({ size = 24, weight = "regular" }) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor"><path d="M184,184a32,32,0,0,1-32,32H40a8,8,0,0,1,0-16H152a16,16,0,0,0,0-32H24a8,8,0,0,1,0-16H152A32,32,0,0,1,184,184Zm32-88a32,32,0,0,0-32-32H56a8,8,0,0,0,0,16H184a16,16,0,0,1,0,32H88a8,8,0,0,0,0,16H184A32,32,0,0,0,216,96ZM120,136H32a8,8,0,0,0,0,16h88a24,24,0,0,1,0,48H96a8,8,0,0,0,0,16h24a40,40,0,0,0,0-80Z" /></svg>
);
const Microphone = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor"><path d="M128,176a48.05,48.05,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.05,48.05,0,0,0,128,176Zm-32-112a32,32,0,0,1,64,0v64a32,32,0,0,1-64,0ZM200,128a8,8,0,0,1-16,0,56,56,0,0,0-112,0,8,8,0,0,1-16,0,72.08,72.08,0,0,1,64-71.46V232a8,8,0,0,1-16,0,8,8,0,0,1,16,0v-24h16v24h8V206.54A72.08,72.08,0,0,1,200,128Z" /></svg>
);
const VideoCamera = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor"><path d="M246,70.58A8,8,0,0,0,237.6,71L200,92.51V88a24,24,0,0,0-24-24H24A24,24,0,0,0,0,88v80a24,24,0,0,0,24,24H176a24,24,0,0,0,24-24v-4.51l37.6,21.49A8,8,0,0,0,248,176V80A8,8,0,0,0,246,70.58ZM184,168a8,8,0,0,1-8,8H24a8,8,0,0,1-8-8V88a8,8,0,0,1,8-8H176a8,8,0,0,1,8,8Zm48-1.54L200,148.16V107.84l32-18.3Z" /></svg>
);
const Sparkle = ({ size = 24, weight = "regular" }) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor"><path d="M228.31,114.34l-66.25-22.09L139.9,25.66a16,16,0,0,0-30.73-1L87.53,91.8,21.92,113.88a16,16,0,0,0,2.37,30.3l65.84,20L112.55,230a16,16,0,0,0,30.9,0l22.42-65.84,65.84-20.08a16,16,0,0,0-3.4-30Z" /></svg>
);
const Play = ({ size = 24, weight = "regular" }) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor"><path d="M232.4,114.49,88.32,26.35a16,16,0,0,0-24.32,13.51V216.14a16,16,0,0,0,24.32,13.51l144.08-88.14a16,16,0,0,0,0-27Z" /></svg>
);

const ICON_MAP = { Wind, Sparkle, Microphone, VideoCamera }; // Expanded inline for self-containment

export const PrescriptionWizardView = ({
    config, visualTheme, isDebugMode, ttsState, step, audioVolumes, aiMessage, aiLatency,
    currentAIChat, prescriptionReason, setStep, INTERACTION_TYPES, MEDITATION_MODES, activeMode, setActiveMode, setTimeLeft,
    selectedDiagnosis, weatherContext, PREP_DIAGNOSIS_FALLBACK, setInteractionType, fetchAIPrescription, setPrepStep,
    selectedAmbient, setSelectedAmbient, AMBIENT_SOUNDS, interactionType, startFromPrescription, handleReturnToChat,
    stopAllAudio, navigate, onClose
}) => {
    
    // 1-a. Prescription Summary (New AI Analysis View)
    if (step === 'prescription_summary') {
        const summary = currentAIChat?.analysisSummary || prescriptionReason || "당신의 마음 상태를 깊이 들여다보았습니다.";
        return (
            <div style={{ position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 2000, display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden' }}>
                <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ marginBottom: '30px', color: 'var(--primary-gold)', textAlign: 'center' }}>
                        <Brain size={60} weight="fill" />
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginTop: '20px' }}>AI 마음 분석</h2>
                    </div>
                    
                    <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(255,255,255,0.08)', borderRadius: '24px', padding: '30px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                        <p style={{ color: 'white', fontSize: '1.15rem', lineHeight: 1.7, textAlign: 'center', wordBreak: 'keep-all' }}>
                            &quot;{summary}&quot;
                        </p>
                    </div>

                    <button onClick={() => setStep('interaction_select')}
                        style={{ width: '100%', maxWidth: '300px', background: 'var(--primary-gold)', color: 'var(--text-on-primary)', padding: '20px', borderRadius: '20px', fontSize: '1.2rem', fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.3)' }}>
                        명상 모드 선택하기
                    </button>
                </div>
            </div>
        );
    }

    // 1-b. Interaction Selection (New Dedicated View)
    if (step === 'interaction_select') {
        return (
            <div style={{ position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 2000, display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden' }}>
                <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                    <div style={{ padding: '20px 0', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white' }}>어떤 명상을 원하시나요?</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>나에게 가장 필요한 모드를 선택하세요</p>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'center', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                        {Object.values(INTERACTION_TYPES).map(t => (
                            <button key={t.id} onClick={() => {
                                setInteractionType(t.id);
                                const modeToUse = activeMode || MEDITATION_MODES.find(m => m.id === selectedDiagnosis?.prescription.modeId) || MEDITATION_MODES[1];
                                setActiveMode(modeToUse);
                                setTimeLeft(modeToUse.time);
                                fetchAIPrescription(selectedDiagnosis?.id || 'stress', weatherContext?.id || 'sun', modeToUse.id, t.id, "");
                            }}
                                style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '25px', background: interactionType === t.id ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.05)', border: interactionType === t.id ? '1px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', color: 'white', textAlign: 'left', cursor: 'pointer', transition: 'all 0.3s' }}>

                                <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'rgba(var(--primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-gold)' }}>
                                    {t.id === 'v1' ? <Wind size={28} /> : t.id === 'v2' ? <Microphone size={28} /> : <VideoCamera size={28} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px' }}>{t.label}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{t.desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* ✅ Restored Time & Ambient Options */}
                    <div style={{ padding: '0 20px', marginTop: '30px', maxWidth: '400px', margin: '30px auto 0 auto', width: '100%' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '10px' }}>⏱️ 명상 시간</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {MEDITATION_MODES.map(m => (
                                    <button key={m.id} onClick={() => { setActiveMode(m); setTimeLeft(m.time); }}
                                        style={{ flex: 1, padding: '12px 8px', borderRadius: '14px', fontSize: '0.9rem', background: (activeMode && activeMode.id === m.id) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', color: (activeMode && activeMode.id === m.id) ? 'white' : 'rgba(255,255,255,0.6)', border: (activeMode && activeMode.id === m.id) ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}>{m.label.split(' ')[0]}</button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '10px' }}>🎵 자연음 배경 (켜기/끄기)</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {AMBIENT_SOUNDS.map(a => (
                                    <button key={a.id} onClick={() => setSelectedAmbient(a.id)}
                                        style={{ padding: '8px 16px', borderRadius: '16px', fontSize: '0.85rem', background: selectedAmbient === a.id ? `${a.color}30` : 'rgba(255,255,255,0.05)', color: selectedAmbient === a.id ? a.color : 'rgba(255,255,255,0.5)', border: selectedAmbient === a.id ? `1px solid ${a.color}50` : '1px solid transparent', fontWeight: 600, cursor: 'pointer' }}>{a.label}</button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: '40px' }}>
                            <button onClick={() => {
                                setStep('preparation');
                                setPrepStep(3);
                            }}
                                disabled={!interactionType}
                                style={{ width: '100%', background: interactionType ? 'var(--primary-gold)' : 'rgba(255,255,255,0.1)', color: interactionType ? 'var(--text-on-primary)' : 'rgba(255,255,255,0.3)', padding: '18px', borderRadius: '18px', fontSize: '1.2rem', fontWeight: 800, border: 'none', cursor: interactionType ? 'pointer' : 'not-allowed', boxShadow: interactionType ? '0 10px 20px rgba(var(--primary-rgb), 0.3)' : 'none', transition: 'all 0.3s' }}>
                                {interactionType ? '명상 준비하기' : '원하시는 명상을 선택해주세요'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Prescription View
    if (step === 'prescription' && selectedDiagnosis && activeMode) {
        const ModeIcon = ICON_MAP[activeMode.iconName] || ICON_MAP.Wind;
        
        return (
            <div style={{ position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 2000, display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden' }}>
                <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflowY: 'auto' }} className="no-scrollbar">
                    <MeditationDebugOverlay isVisible={isDebugMode} ttsState={ttsState} currentStep={step} audioLevels={audioVolumes} currentText={aiMessage} aiLatency={aiLatency} />
                    <div style={{ marginTop: '20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingBottom: '40px' }}>
                        <div style={{ marginBottom: '20px', color: 'var(--primary-gold)' }}><Sparkle size={48} weight="fill" /></div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', marginBottom: '20px', textAlign: 'center' }}>
                            명상 전문 AI 처방
                        </h2>

                        <div style={{ width: '100%', maxWidth: '350px', background: 'rgba(255,255,255,0.08)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
                                 <div style={{ color: 'var(--primary-gold)', fontWeight: 700, marginBottom: '8px', fontSize: '0.85rem' }}>📋 AI 심리 분석 결과</div>
                                <div>{currentAIChat?.isFinalAnalysis ? (currentAIChat.analysisSummary || prescriptionReason) : prescriptionReason}</div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '5px 0' }} />

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: `${activeMode.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: activeMode.color }}>
                                    <ModeIcon size={32} weight="duotone" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--primary-gold)', fontWeight: 600, marginBottom: '2px' }}>✨ AI 강력 추천</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{activeMode.label}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                                        {interactionType === 'v1' && '온몸 이완 가이드'}
                                        {interactionType === 'v2' && '호흡 몰입'}
                                        {interactionType === 'v3' && '자세 교정'}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: '10px' }}>
                                 <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '10px' }}>옵션 변경하기</div>
                                
                                <div style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
                                    {MEDITATION_MODES.map(m => (
                                        <button key={m.id} onClick={() => { setActiveMode(m); setTimeLeft(m.time); }}
                                            style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.75rem', background: activeMode.id === m.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', color: activeMode.id === m.id ? 'white' : 'rgba(255,255,255,0.6)', border: activeMode.id === m.id ? '1px solid rgba(255,255,255,0.3)' : 'none', fontWeight: 600 }}>{m.label.split(' ')[0]}</button>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {Object.values(INTERACTION_TYPES).map(t => (
                                        <button key={t.id} onClick={() => setInteractionType(t.id)}
                                            style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.75rem', background: interactionType === t.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', color: interactionType === t.id ? 'white' : 'rgba(255,255,255,0.6)', border: interactionType === t.id ? '1px solid rgba(255,255,255,0.3)' : 'none', fontWeight: 600 }}>{t.id === 'v1' ? '바디스캔' : t.id === 'v2' ? '호흡' : '자세'}</button>
                                    ))}
                                </div>

                                <div style={{ marginTop: '15px' }}>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '8px' }}>🎵 배경음</div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {AMBIENT_SOUNDS.map(a => (
                                            <button key={a.id} onClick={() => setSelectedAmbient(a.id)}
                                                style={{ padding: '6px 12px', borderRadius: '12px', fontSize: '0.7rem', background: selectedAmbient === a.id ? `${a.color}30` : 'rgba(255,255,255,0.05)', color: selectedAmbient === a.id ? a.color : 'rgba(255,255,255,0.5)', border: selectedAmbient === a.id ? `1px solid ${a.color}50` : '1px solid transparent', fontWeight: 600, cursor: 'pointer' }}>{a.label}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ width: '100%', maxWidth: '350px', marginTop: '30px' }}>
                            <button onClick={startFromPrescription} style={{ width: '100%', background: 'var(--primary-gold)', color: 'var(--text-on-primary)', padding: '16px', borderRadius: '18px', fontSize: '1.1rem', fontWeight: 800, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.3)' }}><Play size={24} weight="fill" /> 시작하기</button>
                            <button onClick={handleReturnToChat} style={{ marginTop: '15px', width: '100%', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}>다시 선택 (대화로 돌아가기)</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    return null;
};
