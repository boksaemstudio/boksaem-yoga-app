import { useLanguageStore } from '../../../stores/useLanguageStore';
import React from 'react';
import { MeditationDebugOverlay } from '../MeditationDebugOverlay';
import { VolumeControlPanel } from '../ui/VolumeControlPanel';
import { X, Play, Pause, SpeakerHigh, SpeakerSlash, Microphone, LockKey } from '../../CommonIcons';
const TypewriterText = ({
  text,
  speed = 40
}) => {
    const [displayedText, setDisplayedText] = React.useState('');
  React.useEffect(() => {
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
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [text, speed]);
  return <span>{displayedText || '...'}</span>;
};
export const ActiveSessionView = ({
  config,
  visualTheme,
  isDebugMode,
  ttsState,
  step,
  audioVolumes,
  aiMessage,
  aiLatency,
  interactionType,
  isPlaying,
  formatTime,
  timeLeft,
  micVolume,
  ttcEnabled,
  permissionError,
  completeSession,
  togglePlay,
  showVolumePanel,
  setShowVolumePanel,
  soundEnabled,
  setSoundEnabled,
  setAudioVolumes,
  currentAudioRef,
  updateAmbientVolume,
  updateBinauralVolume,
  videoRef,
  canvasRef,
  activeMode,
  showVolumeHint
}) => {
    const t = useLanguageStore(s => s.t);
    return <div style={{
    position: 'fixed',
    inset: 0,
    background: config.THEME?.BACKGROUND || '#0a0a0c',
    zIndex: 3000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  }}>
            {interactionType === 'v3' && <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 1,
      opacity: 0.6
    }}>
                    <video ref={videoRef} autoPlay playsInline muted style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: 'scaleX(-1)'
      }} />
                    <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        transform: 'scaleX(-1)',
        pointerEvents: 'none'
      }} />
                    <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '280px',
        height: '350px',
        border: '1px solid rgba(255, 215, 0, 0.3)',
        borderRadius: '120px',
        boxShadow: '0 0 80px rgba(255, 215, 0, 0.1) inset'
      }} />
                </div>}

            <div className={`soul-light-base soul-theme-${visualTheme} ${isPlaying && interactionType !== 'v2' ? 'active' : ''}`} style={{
      transform: interactionType === 'v2' && isPlaying ? `translate(-50%, -50%) scale(${1 + Math.min(micVolume, 0.5)})` : undefined,
      transition: interactionType === 'v2' ? 'transform 0.1s ease-out' : 'all 1s ease',
      zIndex: 0
    }} />

            <div style={{
      zIndex: 10,
      textAlign: 'center',
      width: '100%',
      padding: '20px',
      maxWidth: '600px'
    }}>
                <div style={{
        marginBottom: '20px',
        minHeight: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
                    <p style={{
          color: 'white',
          fontSize: '1.2rem',
          fontWeight: 500,
          lineHeight: 1.6,
          opacity: isPlaying ? 1 : 0.5,
          transition: 'opacity 1s ease',
          textShadow: '0 4px 20px rgba(0,0,0,0.8)',
          background: interactionType === 'v3' ? 'rgba(0,0,0,0.6)' : 'transparent',
          padding: interactionType === 'v3' ? '15px' : '0',
          borderRadius: '15px',
          wordBreak: 'keep-all'
        }}>
                        {isPlaying ? <TypewriterText text={aiMessage} speed={50} /> : aiMessage}
                    </p>
                </div>

                <div style={{
        fontSize: '4.5rem',
        fontWeight: 200,
        color: 'white',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-2px',
        textShadow: '0 0 30px rgba(255,255,255,0.3)',
        marginBottom: '10px'
      }}>
                    {formatTime(timeLeft)}
                </div>

                {interactionType === 'v2' && <div style={{
        marginTop: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        animation: 'fadeIn 0.5s ease'
      }}>
                        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: micVolume > 0.1 ? config.THEME?.SUCCESS_COLOR || '#4ade80' : 'rgba(255,255,255,0.3)',
          transition: 'color 0.2s'
        }}>
                            <Microphone size={20} weight={micVolume > 0.1 ? "fill" : "regular"} style={{
            transform: `scale(${1 + Math.min(micVolume, 0.5)})`
          }} />
                            <span style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            letterSpacing: '1px'
          }}>BREATH LEVEL</span>
                        </div>
                        <div style={{
          width: '120px',
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          overflow: 'hidden',
          boxShadow: '0 0 10px rgba(0,0,0,0.5)'
        }}>
                            <div style={{
            height: '100%',
            width: `${Math.min(micVolume * 100, 100)}%`,
            background: `linear-gradient(90deg, ${config.THEME?.SUCCESS_COLOR || '#4ade80'}, #32ff7e)`,
            transition: 'width 0.1s ease-out',
            boxShadow: '0 0 10px rgba(74, 222, 128, 0.5)'
          }} />
                        </div>
                        {micVolume > 0.1 && <span style={{
          fontSize: '0.7rem',
          color: config.THEME?.SUCCESS_COLOR || '#4ade80',
          animation: 'pulse 1s infinite'
        }}>{t('med_session_detecting') || t("g_9bc1af") || "\uAC10\uC9C0 \uC911..."}</span>}
                    </div>}

                <div style={{
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
                    {ttcEnabled ? <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          color: 'var(--primary-gold)',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          animation: 'pulse 2s infinite'
        }}>
                            <SpeakerHigh size={16} weight="fill" /> {t('med_session_voice_on') || t("g_ba3b35") || "\uC74C\uC131 \uC548\uB0B4\uAC00 \uC9C4\uD589 \uC911\uC785\uB2C8\uB2E4"}
                        </div> : (interactionType === 'v2' || interactionType === 'v3') && <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.75rem'
        }}>
                                <LockKey size={12} weight="fill" color={config.THEME?.SUCCESS_COLOR || "#4ade80"} /> {t('med_session_data_local') || t("g_538401") || "\uB370\uC774\uD130\uB294 \uAE30\uAE30 \uB0B4\uC5D0\uC11C\uB9CC \uCC98\uB9AC\uB429\uB2C8\uB2E4"}
                            </div>}
                </div>
                
                {permissionError && <div style={{
        marginTop: '20px',
        padding: '10px',
        background: `${config.THEME?.DANGER_COLOR || '#ff6b6b'}33`,
        color: config.THEME?.DANGER_COLOR || '#ff6b6b',
        borderRadius: '8px',
        fontSize: '0.9rem'
      }}>
                        ⚠️ {permissionError}
                    </div>}
            </div>

            <div style={{
      position: 'absolute',
      bottom: '60px',
      display: 'flex',
      alignItems: 'center',
      gap: '40px',
      zIndex: 20
    }}>
                <button onClick={() => completeSession()} style={{
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        border: 'none',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }}>
                    <X size={28} />
                </button>

                <button onClick={togglePlay} style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: activeMode?.color || 'var(--primary-gold)',
        border: 'none',
        color: 'var(--text-on-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 0 30px ${activeMode?.color}60`,
        cursor: 'pointer'
      }}>
                    {isPlaying ? <Pause size={32} weight="fill" /> : <Play size={32} weight="fill" />}
                </button>

                <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px'
      }}>
                    <button onClick={() => setShowVolumePanel(!showVolumePanel)} style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: showVolumePanel ? 'rgba(var(--primary-rgb), 0.3)' : 'rgba(255,255,255,0.1)',
          border: 'none',
          color: soundEnabled ? 'white' : 'rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}>
                        {soundEnabled ? <SpeakerHigh size={28} /> : <SpeakerSlash size={28} />}
                    </button>
                    <span style={{
          fontSize: '0.65rem',
          color: 'rgba(255,255,255,0.5)',
          fontWeight: '600'
        }}>{t('med_session_volume') || t("g_62cc79") || "\uC18C\uB9AC \uC870\uC808"}</span>
                </div>
            </div>

            <VolumeControlPanel showVolumePanel={showVolumePanel} setShowVolumePanel={setShowVolumePanel} audioVolumes={audioVolumes} setAudioVolumes={setAudioVolumes} currentAudioRef={currentAudioRef} updateAmbientVolume={updateAmbientVolume} updateBinauralVolume={updateBinauralVolume} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} />

            {showVolumeHint && !showVolumePanel && <div style={{
      position: 'absolute',
      bottom: '190px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(var(--primary-rgb), 0.2)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(var(--primary-rgb), 0.3)',
      borderRadius: '20px',
      padding: '8px 16px',
      color: 'rgba(255,255,255,0.8)',
      fontSize: '0.75rem',
      whiteSpace: 'nowrap',
      animation: 'fadeIn 0.5s ease-out',
      pointerEvents: 'none'
    }}>
                    {t('med_session_volume_hint') || t("g_8e9116") || "\uD83D\uDD0A \uC2A4\uD53C\uCEE4 \uC544\uC774\uCF58\uC744 \uB20C\uB7EC \uBCFC\uB968\uC744 \uC870\uC808\uD558\uC138\uC694"}
                </div>}

            <MeditationDebugOverlay isVisible={isDebugMode} ttsState={ttsState} currentStep={step} audioLevels={audioVolumes} currentText={aiMessage} aiLatency={aiLatency} />

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes breathe { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.5); opacity: 0.8; } }
                @keyframes breathe-inner { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.3); opacity: 0.4; } }
                @keyframes float { 0% { transform: rotate(0deg) scale(1) translate(0, 0); } 33% { transform: rotate(120deg) scale(1.1) translate(20px, -20px); } 66% { transform: rotate(240deg) scale(0.9) translate(-20px, 20px); } 100% { transform: rotate(360deg) scale(1) translate(0, 0); } }
                @keyframes float-rev { 0% { transform: rotate(0deg) scale(1.1) translate(0, 0); } 50% { transform: rotate(-180deg) scale(0.9) translate(30px, 30px); } 100% { transform: rotate(-360deg) scale(1.1) translate(0, 0); } }
                .breathing-circle.animate { animation: breathe 8s infinite ease-in-out; }
                .breathing-circle-inner.animate-inner { animation: breathe-inner 8s infinite ease-in-out; }
                .floating-circle.animate-float { animation: float 20s infinite linear; }
                .floating-circle-rev.animate-float-rev { animation: float-rev 25s infinite linear; }
                .paused { animation-play-state: paused !important; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>;
};