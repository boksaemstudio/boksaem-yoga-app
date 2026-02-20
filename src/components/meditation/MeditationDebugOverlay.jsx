import React from 'react';

// 🛠️ Meditation Debug Overlay Component
export const MeditationDebugOverlay = ({ isVisible, ttsState, currentStep, audioLevels, currentText, aiLatency }) => {
    if (!isVisible) return null;

    return (
        <div style={{
            position: 'fixed', top: '80px', left: '20px', right: '20px',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0,255,255,0.3)', borderRadius: '15px',
            padding: '15px', color: '#00ffff', fontSize: '0.75rem', zIndex: 10000,
            fontFamily: 'monospace', pointerEvents: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid rgba(0,255,255,0.2)', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>[MEDITATION DEBUG MODE]</span>
                <span>Latency: {aiLatency}ms</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                    <div style={{ color: '#fff', marginBottom: '4px' }}>📡 AI & Step Status</div>
                    <div>Step: {currentStep}</div>
                    <div>TTS Engine: {ttsState.engine}</div>
                    <div>Speaking: {ttsState.isSpeaking ? 'YES' : 'NO'}</div>
                </div>
                <div>
                    <div style={{ color: '#fff', marginBottom: '4px' }}>🔊 Audio Levels</div>
                    <div>Voice: {Math.round(audioLevels.voice * 100)}%</div>
                    <div>Ambient: {Math.round(audioLevels.ambient * 100)}%</div>
                    <div>Binaural: {Math.round(audioLevels.binaural * 100)}%</div>
                </div>
            </div>

            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(0,255,255,0.1)' }}>
                <div style={{ color: '#fff', marginBottom: '4px' }}>📝 Raw TTS Text:</div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px', maxHeight: '60px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                    {currentText || 'No text currently processed'}
                </div>
            </div>
        </div>
    );
};
