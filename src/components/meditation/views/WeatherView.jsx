import { useLanguageStore } from '../../../stores/useLanguageStore';
import { MeditationDebugOverlay } from '../MeditationDebugOverlay';
const ArrowLeft = ({
  size = 24,
  color = "currentColor"
}) => <svg width={size} height={size} viewBox="0 0 256 256" fill={color}><path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" /></svg>;
export const WeatherView = ({
  config,
  visualTheme,
  isDebugMode,
  ttsState,
  step,
  audioVolumes,
  aiMessage,
  aiLatency,
  setStep,
  handleWeatherSelect,
  WEATHER_OPTIONS
}) => <div style={{
  position: 'fixed',
  inset: 0,
  background: config.THEME?.BACKGROUND || '#0a0a0c',
  zIndex: 2000,
  display: 'flex',
  flexDirection: 'column',
  padding: '20px',
  overflow: 'hidden'
}}>
        <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{
    transition: 'all 1s ease',
    opacity: 0.4
  }} />
        <div style={{
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%'
  }}>
            <MeditationDebugOverlay isVisible={isDebugMode} ttsState={ttsState} currentStep={step} audioLevels={audioVolumes} currentText={aiMessage} aiLatency={aiLatency} />
            
            <div style={{
      display: 'flex',
      alignItems: 'center',
      marginBottom: '30px'
    }}>
                <button onClick={() => setStep('diagnosis')} style={{
        padding: '10px',
        color: 'white',
        background: 'none',
        border: 'none'
      }}>
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{
        flex: 1,
        textAlign: 'center',
        fontSize: '1.1rem',
        fontWeight: 600,
        color: 'rgba(255,255,255,0.5)',
        marginRight: '44px'
      }}>
                    {t('med_weather_title') || t("g_82c0c6") || "\uD658\uACBD \uAC10\uC9C0"}
                </h1>
            </div>

            <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: '40px'
    }}>
                <h2 style={{
        fontSize: '1.6rem',
        fontWeight: 700,
        color: 'white',
        marginBottom: '10px',
        textAlign: 'center'
      }}>
                    {t('med_weather_q1') || t("g_12fc5f") || "\uC9C0\uAE08 \uCC3D\uBC16\uC758 \uB0A0\uC528\uB294 \uC5B4\uB5A4\uAC00\uC694?"}
                </h2>
                <p style={{
        color: 'rgba(255,255,255,0.5)',
        marginBottom: '50px',
        textAlign: 'center',
        fontSize: '0.9rem'
      }}>
                    {t('med_weather_desc1') || t("g_68d8b5") || "\uB0A0\uC528\uC5D0 \uB530\uB77C \uB1CC\uC758 \uBC18\uC751 \uD328\uD134\uC774 \uB2EC\uB77C\uC9D1\uB2C8\uB2E4"}
                </p>

                <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px',
        width: '100%',
        maxWidth: '400px'
      }}>
                    {WEATHER_OPTIONS.map(option => <button key={option.id} onClick={() => handleWeatherSelect(option)} style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer'
        }}>
                            <option.icon size={36} color={option.color} weight="duotone" />
                            <span style={{
            color: 'white',
            fontSize: '1.1rem',
            marginTop: '5px'
          }}>{option.label}</span>
                        </button>)}
                </div>
            </div>
        </div>
    </div>;
export const DiagnosisManualView = ({
  config,
  visualTheme,
  isDebugMode,
  ttsState,
  step,
  audioVolumes,
  aiMessage,
  aiLatency,
  setStep,
  handleDiagnosisSelect,
  DIAGNOSIS_OPTIONS
}) => <div style={{
  position: 'fixed',
  inset: 0,
  background: config.THEME?.BACKGROUND || '#0a0a0c',
  zIndex: 2000,
  display: 'flex',
  flexDirection: 'column',
  padding: '20px',
  overflow: 'hidden'
}}>
        <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{
    transition: 'all 1s ease',
    opacity: 0.4
  }} />
        <div style={{
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%'
  }}>
            <MeditationDebugOverlay isVisible={isDebugMode} ttsState={ttsState} currentStep={step} audioLevels={audioVolumes} currentText={aiMessage} aiLatency={aiLatency} />
            <div style={{
      display: 'flex',
      alignItems: 'center',
      marginBottom: '30px'
    }}>
                <button onClick={() => setStep('diagnosis')} style={{
        padding: '10px',
        color: 'white',
        background: 'none',
        border: 'none'
      }}>
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{
        flex: 1,
        textAlign: 'center',
        fontSize: '1.1rem',
        fontWeight: 600,
        color: 'rgba(255,255,255,0.5)',
        marginRight: '44px'
      }}>
                    {t('med_diag_manual_title') || t("g_343ff0") || "\uBA85\uC0C1 \uC120\uD0DD"}
                </h1>
            </div>

            <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: '30px'
    }}>
                <p style={{
        color: 'rgba(255,255,255,0.6)',
        marginBottom: '25px',
        fontSize: '0.95rem'
      }}>
                    {t('med_diag_manual_desc') || t("g_08771e") || "\uC9C0\uAE08 \uB290\uAEF4\uC9C0\uB294 \uC0C1\uD0DC\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694"}
                </p>

                <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px',
        width: '100%',
        maxWidth: '400px'
      }}>
                    {DIAGNOSIS_OPTIONS.map(option => <button key={option.id} onClick={() => handleDiagnosisSelect(option)} style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '15px',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}>
                            <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: `${option.color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: option.color
          }}>
                                <option.icon size={28} weight="fill" />
                            </div>
                            <span style={{
            color: 'white',
            fontWeight: 600
          }}>{option.label}</span>
                        </button>)}
                </div>
            </div>
        </div>
    </div>;