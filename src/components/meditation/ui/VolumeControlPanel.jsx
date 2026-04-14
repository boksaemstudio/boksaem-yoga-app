import { X } from '../../../components/CommonIcons';
import { useLanguageStore } from '../../../stores/useLanguageStore';
export const VolumeControlPanel = ({
  showVolumePanel,
  setShowVolumePanel,
  audioVolumes,
  setAudioVolumes,
  currentAudioRef,
  updateAmbientVolume,
  updateBinauralVolume,
  soundEnabled,
  setSoundEnabled
}) => {
  const t = useLanguageStore(s => s.t);
  if (!showVolumePanel) return null;
  return <div style={{
    position: 'absolute',
    bottom: '180px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '280px',
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '20px',
    zIndex: 30,
    border: '1px solid rgba(255,255,255,0.15)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    animation: 'fadeIn 0.3s ease'
  }}>
            <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px'
    }}>
                <span style={{
        color: 'var(--primary-gold)',
        fontSize: '0.85rem',
        fontWeight: 700
      }}>🎛️ {t('med_vol_title') || t("g_fcdc5c") || "\uBCFC\uB968 \uC870\uC808"}</span>
                <button onClick={() => setShowVolumePanel(false)} style={{
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.5)',
        cursor: 'pointer',
        padding: '4px'
      }}>
                    <X size={18} />
                </button>
            </div>
            
            {/* Voice Volume */}
            <div style={{
      marginBottom: '12px'
    }}>
                <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '6px'
      }}>
                    <span style={{
          fontSize: '0.8rem',
          color: 'rgba(255,255,255,0.7)'
        }}>🗣️ {t('med_vol_voice') || t("g_b2579d") || "\uC74C\uC131 \uC548\uB0B4"}</span>
                    <span style={{
          fontSize: '0.75rem',
          color: 'var(--primary-gold)'
        }}>{Math.round(audioVolumes.voice * 100)}%</span>
                </div>
                <input type="range" min="0" max="100" value={Math.round(audioVolumes.voice * 100)} onChange={e => {
        const val = parseInt(e.target.value) / 100;
        setAudioVolumes(prev => ({
          ...prev,
          voice: val
        }));
        if (currentAudioRef.current) currentAudioRef.current.volume = val;
      }} style={{
        width: '100%',
        accentColor: 'var(--primary-gold)',
        height: '4px'
      }} />
            </div>
            
            {/* Ambient Volume */}
            <div style={{
      marginBottom: '12px'
    }}>
                <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '6px'
      }}>
                    <span style={{
          fontSize: '0.8rem',
          color: 'rgba(255,255,255,0.7)'
        }}>🌊 {t('med_vol_ambient') || t("g_afa4f9") || "\uD658\uACBD\uC74C"}</span>
                    <span style={{
          fontSize: '0.75rem',
          color: 'var(--primary-gold)'
        }}>{Math.round(audioVolumes.ambient * 100)}%</span>
                </div>
                <input type="range" min="0" max="100" value={Math.round(audioVolumes.ambient * 100)} onChange={e => {
        const val = parseInt(e.target.value) / 100;
        setAudioVolumes(prev => ({
          ...prev,
          ambient: val
        }));
        updateAmbientVolume(val);
      }} style={{
        width: '100%',
        accentColor: '#4ade80',
        height: '4px'
      }} />
            </div>
            
            {/* Binaural Volume */}
            <div>
                <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '6px'
      }}>
                    <span style={{
          fontSize: '0.8rem',
          color: 'rgba(255,255,255,0.7)'
        }}>🎵 {t('med_vol_frequency') || t("g_7f6b67") || "\uC8FC\uD30C\uC218"}</span>
                    <span style={{
          fontSize: '0.75rem',
          color: 'var(--primary-gold)'
        }}>{Math.round(audioVolumes.binaural * 100)}%</span>
                </div>
                <input type="range" min="0" max="100" value={Math.round(audioVolumes.binaural * 100)} onChange={e => {
        const val = parseInt(e.target.value) / 100;
        setAudioVolumes(prev => ({
          ...prev,
          binaural: val
        }));
        updateBinauralVolume(val);
      }} style={{
        width: '100%',
        accentColor: '#a29bfe',
        height: '4px'
      }} />
            </div>
            
            {/* Mute All Toggle */}
            <button onClick={() => {
      setSoundEnabled(!soundEnabled);
      if (soundEnabled) {
        // Mute all
        updateAmbientVolume(0);
        updateBinauralVolume(0);
      } else {
        // Restore
        updateAmbientVolume(audioVolumes.ambient);
        updateBinauralVolume(audioVolumes.binaural);
      }
    }} style={{
      marginTop: '12px',
      width: '100%',
      padding: '10px',
      borderRadius: '12px',
      background: soundEnabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,0,0,0.15)',
      border: '1px solid rgba(255,255,255,0.1)',
      color: soundEnabled ? 'rgba(255,255,255,0.7)' : '#ff6b6b',
      fontSize: '0.8rem',
      cursor: 'pointer',
      fontWeight: 600
    }}>{soundEnabled ? t('med_vol_mute') || t("g_ad866f") || "\uD83D\uDD07 \uC804\uCCB4 \uC74C\uC18C\uAC70" : t('med_vol_unmute') || t("g_1f048d") || "\uD83D\uDD0A \uC18C\uB9AC \uCF1C\uAE30"}</button>
        </div>;
};