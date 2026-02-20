import React from 'react';
import { AILoadingIndicator } from './AILoadingIndicator';
import { Icons as PhosphorIcons } from '../../../components/CommonIcons';

const { Microphone, LockKey } = PhosphorIcons;

export const ChatDialog = ({
    chatHistory,
    currentAIChat,
    isAILoading,
    chatEndRef,
    stopAllAudio,
    handleChatResponse,
    manualInput,
    setManualInput,
    handleManualSubmit,
    isAnalyzing,
    onStartMeditation
}) => {
    return (
        <div style={{
            position: 'absolute', bottom: '0', left: '0', right: '0',
            background: 'linear-gradient(to top, rgba(10,10,12,0.95) 40%, rgba(10,10,12,0.8) 80%, transparent)',
            display: 'flex', flexDirection: 'column', zIndex: 100,
            paddingTop: '60px'
        }}>
            {/* 2. Messages Area */}
            <div className="no-scrollbar" style={{ 
                flex: 1, overflowY: 'auto', padding: '0 20px 20px', 
                display: 'flex', flexDirection: 'column', gap: '16px' 
            }}>
                {chatHistory.map((chat, idx) => (
                    <div key={idx} style={{
                        alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '80vw', opacity: 0.9, lineHeight: '1.5',
                        display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '8px'
                    }}>
                        {chat.role === 'model' && (
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0
                            }}>
                                <img src="/pwa-192x192.png" alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display='none'; e.target.parentNode.innerText='🧘‍♀️'; }} />
                            </div>
                        )}
                        <div style={{
                            background: chat.role === 'user' ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                            color: chat.role === 'user' ? 'var(--primary-gold)' : 'white',
                            padding: '12px 18px',
                            borderRadius: chat.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            border: chat.role === 'user' ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.1)',
                            fontSize: '0.95rem'
                        }}>{chat.content}</div>
                    </div>
                ))}
                
                {/* AI Response Area */}
                {currentAIChat && !isAILoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0
                        }}>
                            <img src="/pwa-192x192.png" alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display='none'; e.target.parentNode.innerText='🧘‍♀️'; }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '6px' }}>
                            <div style={{
                                background: 'rgba(255,255,255,0.08)', color: 'white', padding: '14px 18px',
                                borderRadius: '4px 18px 18px 18px', maxWidth: '75vw', fontSize: '1.0rem', lineHeight: '1.6',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)'
                            }}>{currentAIChat.message || currentAIChat.question || "오늘 하루는 어떠셨나요?"}</div>
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                )}

                {isAILoading && (
                    <div style={{ alignSelf: 'center', marginTop: '10px' }}>
                        <AILoadingIndicator compact={true} message={chatHistory.length === 0 ? "AI 복순이가 당신의 마음을 듣고 있어요..." : null} />
                    </div>
                )}
                <div ref={chatEndRef} style={{ height: '2px', width: '100%' }} />
            </div>

            {/* 3. Bottom Options & Input */}
            <div style={{
                background: '#1a1a1d', borderTop: '1px solid rgba(255,255,255,0.1)',
                padding: '15px', paddingBottom: 'calc(15px + env(safe-area-inset-bottom))',
                display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 20
            }}>
                {/* 시작 버튼 한정 */}
                {!isAILoading && currentAIChat?.isFinalAnalysis && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.5s ease' }}>
                        <button onClick={onStartMeditation} style={{
                            width: '100%', background: 'var(--primary-gold)', color: 'black',
                            padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: '0 10px 20px rgba(212,175,55,0.3)'
                        }}>🧘 명상 시작하기</button>
                        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                            당신에게 맞는 명상을 준비했어요
                        </p>
                    </div>
                )}

                {/* 대화 선택지 버튼 */}
                {!isAILoading && currentAIChat?.options?.length > 0 && !currentAIChat?.isFinalAnalysis && (
                    <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none', justifyContent: 'flex-start' }}>
                        {currentAIChat.options.map((opt, i) => (
                            <button key={i} onClick={() => { stopAllAudio(); handleChatResponse(opt); }}
                                style={{
                                    flex: '0 0 auto', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                                    padding: '10px 18px', borderRadius: '18px', color: 'rgba(255,255,255,0.9)', 
                                    fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(5px)'
                                }}>{opt}</button>
                        ))}
                    </div>
                )}

                {/* 입력창 (마이크/텍스트) */}
                {!currentAIChat?.isFinalAnalysis && !currentAIChat?.isTransition && !isAnalyzing && (
                    <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'stretch', height: '52px' }}>
                        {/* Audio Mock Record Button */}
                        <button type="button" style={{
                            width: '52px', borderRadius: '16px', border: 'none',
                            background: 'rgba(255,255,255,0.05)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <Microphone size={24} weight="fill" />
                        </button>

                        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input 
                                type="text"
                                value={manualInput}
                                onChange={e => setManualInput(e.target.value)}
                                placeholder="직접 마음 상태를 입력하세요..."
                                disabled={isAILoading}
                                style={{
                                    width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '16px', color: 'white', padding: '0 45px 0 15px', fontSize: '0.95rem'
                                }}
                            />
                            {isAILoading && <LockKey size={18} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', right: '15px' }} />}
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
