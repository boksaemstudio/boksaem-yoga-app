const MeditationDebugOverlay = ({ 
    isVisible, 
    ttsState, 
    currentStep, 
    audioLevels, 
    currentText, 
    aiLatency 
}) => {
    if (!isVisible) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '60px',
            right: '10px',
            width: '300px',
            background: 'rgba(0, 0, 0, 0.85)',
            color: '#00ff00',
            fontFamily: 'monospace',
            fontSize: '10px',
            padding: '10px',
            borderRadius: '8px',
            zIndex: 10000,
            pointerEvents: 'none',
            border: '1px solid #333',
            backdropFilter: 'blur(4px)'
        }}>
            <h3 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #333', paddingBottom: '4px', color: '#fff' }}>
                🧘 Meditation Debugger
            </h3>

            <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#fff' }}>State:</strong> {currentStep}
            </div>

            <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#fff' }}>TTS Status:</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: '4px 8px', marginTop: '4px' }}>
                    <span>Speaking:</span>
                    <span style={{ color: ttsState.isSpeaking ? '#0f0' : '#888' }}>
                        {ttsState.isSpeaking ? 'YES' : 'NO'}
                    </span>
                    
                    <span>Engine:</span>
                    <span>{ttsState.engine || 'None'}</span>
                    
                    <span>Volume:</span>
                    <span>{Math.round(ttsState.volume * 100)}%</span>
                </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#fff' }}>Audio Mix:</strong>
                <div style={{ marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>BGM:</span>
                        <span>{Math.round(audioLevels.bgm * 100)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: '#333' }}>
                        <div style={{ width: `${audioLevels.bgm * 100}%`, height: '100%', background: '#4c9bfb' }} />
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', marginBottom: '2px' }}>
                        <span>Ambient:</span>
                        <span>{Math.round(audioLevels.ambient * 100)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: '#333' }}>
                        <div style={{ width: `${audioLevels.ambient * 100}%`, height: '100%', background: '#4cd964' }} />
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '8px', borderTop: '1px solid #333', paddingTop: '8px' }}>
                <strong style={{ color: '#fff' }}>Text Sync:</strong>
                <div style={{ 
                    maxHeight: '60px', 
                    overflowY: 'auto', 
                    background: 'rgba(255,255,255,0.1)', 
                    padding: '4px',
                    marginTop: '4px',
                    whiteSpace: 'pre-wrap',
                    color: ttsState.isSpeaking ? '#fff' : '#aaa'
                }}>
                    {currentText || '(No text)'}
                </div>
            </div>

            {aiLatency > 0 && (
                <div style={{ marginTop: '8px', color: aiLatency > 3000 ? '#ff4d4d' : '#4cd964' }}>
                    <strong>AI Latency:</strong> {(aiLatency / 1000).toFixed(2)}s
                </div>
            )}
        </div>
    );
};

export default MeditationDebugOverlay;
