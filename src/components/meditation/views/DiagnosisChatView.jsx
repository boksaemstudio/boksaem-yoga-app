import { useState, useEffect } from 'react';
import { MeditationDebugOverlay } from '../MeditationDebugOverlay';
import { AILoadingIndicator } from '../ui/AILoadingIndicator';
import { SpeakerHigh } from '../../CommonIcons';

// Local Arrow Helpers
const ArrowLeft = ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill={color}><path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" /></svg>
);
const ArrowUp = ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill={color}><path d="M213.66,122.34a8,8,0,0,1-11.32,0L136,56v152a8,8,0,0,1-16,0V56L53.66,122.34a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,213.66,122.34Z"></path></svg>
);
const User = ({ size = 24, weight = "regular" }) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor">
        <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z" />
    </svg>
);

const TypewriterText = ({ text, speed = 40 }) => {
    const [displayedText, setDisplayedText] = useState('');
    
    useEffect(() => {
        setDisplayedText('');
        if (!text) return;
        
        let index = 0;
        let isCancelled = false;
        
        const interval = setInterval(() => {
            if (isCancelled) return;
            setDisplayedText(text.slice(0, index + 1));
            index++;
            if (index >= text.length) clearInterval(interval);
        }, speed);
        
        return () => { isCancelled = true; clearInterval(interval); };
    }, [text, speed]);
    
    return <span>{displayedText || '...'}</span>;
};


export const DiagnosisChatView = ({
    config, visualTheme, isDebugMode, ttsState, step, audioVolumes, aiMessage, aiLatency,
    isAILoading, setIsAILoading, currentAIChat, chatHistory, setChatHistory, manualInput, setManualInput,
    isAnalyzing, finishAnalysis, stopAllAudio, onClose, navigate, handleDebugToggle, ttcEnabled,
    handleChatResponse, handleManualSubmit, chatEndRef,
    setSelectedDiagnosis, setActiveMode, setTimeLeft, setInteractionType, setStep,
    DIAGNOSIS_OPTIONS, SELECTED_DIAGNOSIS_FALLBACK, MEDITATION_MODES
}) => {
    return (
        <div style={{ position: 'fixed', inset: 0, background: config.THEME?.BACKGROUND || '#0a0a0c', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{ transition: 'all 1s ease', opacity: 0.4 }} />
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                <MeditationDebugOverlay isVisible={isDebugMode} ttsState={ttsState} currentStep={step} audioLevels={audioVolumes} currentText={aiMessage} aiLatency={aiLatency} />
                
                <div style={{ padding: '10px 15px', paddingTop: 'max(10px, env(safe-area-inset-top))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(20, 20, 20, 0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', zIndex: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button onClick={() => { stopAllAudio(); if(onClose) onClose(); else navigate(-1); }} style={{ padding: '8px', border: 'none', background: 'none', cursor: 'pointer' }}>
                            <ArrowLeft size={22} color="white" />
                        </button>
                        <div onClick={handleDebugToggle} style={{ marginLeft: '10px', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>{config.AI_CONFIG?.NAME || 'AI'} (마음 챙김이)</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <SpeakerHigh size={12} color={ttcEnabled ? (config.THEME?.SUCCESS_COLOR || "#4caf50") : "#666"} weight="fill" />
                                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                                    {isAnalyzing ? <span className="blinking-text">분석 중...</span> : isAILoading ? '생각하는 중...' : '음성 대화 중'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {!isAnalyzing && (
                        <button onClick={() => finishAnalysis(true)}
                            style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(76, 155, 251, 0.2)', border: `1px solid ${config.THEME?.PRIMARY_COLOR || '#4c9bfb'}`, color: config.THEME?.PRIMARY_COLOR || '#4c9bfb', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>
                            바로 시작
                        </button>
                    )}
                </div>

                <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px 15px', paddingBottom: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>
                        {new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}
                    </div>

                    {chatHistory.filter(msg => !msg.content.startsWith('[System]:')).map((msg, idx) => {
                        const isMe = msg.role === 'user';
                        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return (
                            <div key={idx} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: '8px' }}>
                                {!isMe && <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, fontSize: '1.2rem' }}>🧘‍♀️</div>}
                                <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '6px' }}>
                                    <div style={{ background: isMe ? `linear-gradient(135deg, ${config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'}, #f1c40f)` : 'rgba(255,255,255,0.08)', color: isMe ? '#000' : '#fff', padding: '12px 16px', borderRadius: isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px', maxWidth: '75vw', fontSize: '0.95rem', lineHeight: '1.6', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', wordBreak: 'keep-all', border: isMe ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>{msg.content}</div>
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2px', minWidth: '55px', textAlign: isMe ? 'right' : 'left' }}>{timeStr}</span>
                                </div>
                            </div>
                        );
                    })}

                    {currentAIChat && !isAILoading && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', gap: '8px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, color: 'var(--primary-gold)' }}><User size={24} weight="fill" /></div>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '6px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.08)', color: 'white', padding: '14px 18px', borderRadius: '4px 18px 18px 18px', maxWidth: '75vw', fontSize: '1.0rem', lineHeight: '1.6', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}><TypewriterText text={currentAIChat.message || currentAIChat.question || "오늘 하루는 어떠셨나요?"} speed={40} /></div>
                                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    )}

                    {isAILoading && (
                        <div style={{ alignSelf: 'center', marginTop: '10px' }}>
                            <AILoadingIndicator compact={true} message={chatHistory.length === 0 ? `AI ${config.AI_CONFIG?.NAME || 'AI'}가 당신의 마음을 듣고 있어요...` : null} />
                        </div>
                    )}
                    <div ref={chatEndRef} style={{ height: '2px', width: '100%' }} />
                </div>

                <div style={{ background: config.THEME?.SURFACE || '#1a1a1d', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '15px', paddingBottom: 'calc(15px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 20 }}>
                    {!isAILoading && currentAIChat?.isFinalAnalysis && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.5s ease' }}>
                            <button onClick={() => {
                                stopAllAudio();
                                const diag = DIAGNOSIS_OPTIONS.find(o => o.id === currentAIChat?.mappedDiagnosis) || SELECTED_DIAGNOSIS_FALLBACK;
                                setSelectedDiagnosis(diag);
                                const defaultMode = MEDITATION_MODES.find(m => m.id === diag?.prescription?.modeId) || MEDITATION_MODES[1];
                                setActiveMode(defaultMode);
                                setTimeLeft(defaultMode.time);
                                setInteractionType(diag?.prescription?.type || 'v1');
                                setStep('interaction_select');
                            }} style={{ width: '100%', background: 'var(--primary-gold)', color: 'var(--text-on-primary)', padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.3)' }}>
                                🧘 명상 시작하기
                            </button>
                            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>당신에게 맞는 명상을 준비했어요</p>
                        </div>
                    )}

                    {!isAILoading && currentAIChat?.options?.length > 0 && !currentAIChat?.isFinalAnalysis && (
                        <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none', justifyContent: 'flex-start' }}>
                            {currentAIChat.options.map((opt, i) => (
                                <button key={i} onClick={() => { stopAllAudio(); handleChatResponse(opt); }} style={{ flex: '0 0 auto', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '10px 18px', borderRadius: '18px', color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(5px)' }}>{opt}</button>
                            ))}
                        </div>
                    )}

                    {!currentAIChat?.isFinalAnalysis && !currentAIChat?.isTransition && !isAnalyzing && (
                        <form onSubmit={(e) => { try { handleManualSubmit(e); } catch (err) { setIsAILoading(false); } }} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '28px', padding: '6px 6px 6px 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <input type="text" value={manualInput} onChange={(e) => setManualInput(e.target.value)} disabled={isAILoading} autoFocus placeholder={isAILoading ? "답변을 기다리는 중..." : "직접 입력하기..."} style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '1rem', outline: 'none' }} />
                            <button type="submit" disabled={!manualInput.trim() || isAILoading} style={{ background: manualInput.trim() ? 'var(--primary-gold)' : 'rgba(255,255,255,0.1)', color: manualInput.trim() ? 'black' : 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ArrowUp size={24} color="currentColor" /></button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
