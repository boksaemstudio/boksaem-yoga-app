import { useLanguageStore } from '../../../stores/useLanguageStore';
import { MeditationDebugOverlay } from '../MeditationDebugOverlay';
import { SpeakerHigh } from '../../CommonIcons';
export const InitialPrepView = ({
  config,
  visualTheme,
  isDebugMode,
  ttsState,
  step,
  audioVolumes,
  aiMessage,
  aiLatency,
  setPrepSelections,
  setStep
}) => <div style={{
  position: 'fixed',
  inset: 0,
  background: config.THEME?.BACKGROUND || '#0a0a0c',
  zIndex: 9999,
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
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
            <MeditationDebugOverlay isVisible={isDebugMode} ttsState={ttsState} currentStep={step} audioLevels={audioVolumes} currentText={aiMessage} aiLatency={aiLatency} />
            <div style={{
      width: '100%',
      maxWidth: '350px',
      animation: 'fadeIn 0.5s ease',
      textAlign: 'center'
    }}>
                <div style={{
        marginBottom: '40px'
      }}>
                    <div style={{
          fontSize: '4rem',
          marginBottom: '20px'
        }}>🔕</div>
                    <h3 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'white',
          marginBottom: '10px'
        }}>{t('med_prep_s1_title') || t("g_ee2b05") || "\uC8FC\uBCC0\uC744 \uACE0\uC694\uD558\uAC8C"}</h3>
                    <p style={{
          color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.6,
          marginBottom: '20px'
        }} dangerouslySetInnerHTML={{
          __html: t('med_prep_s1_desc_html') || t("g_9c7b8c") || "\uBC29\uD574\uBC1B\uC9C0 \uC54A\uB3C4\uB85D <br/>\uAE30\uAE30\uB97C &apos;\uBB34\uC74C&apos; \uB610\uB294 &apos;\uBC29\uD574\uAE08\uC9C0&apos; \uBAA8\uB4DC\uB85C <br/>\uC124\uC815\uD574\uC8FC\uC168\uB098\uC694?"
        }} />
                    
                    <div style={{
          background: 'rgba(76, 155, 251, 0.1)',
          border: '1px solid rgba(76, 155, 251, 0.2)',
          borderRadius: '15px',
          padding: '15px',
          marginTop: '10px',
          textAlign: 'left',
          fontSize: '0.85rem'
        }}>
                        <div style={{
            color: config.THEME?.PRIMARY_COLOR || '#4c9bfb',
            fontWeight: 700,
            marginBottom: '5px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
                            <SpeakerHigh size={14} weight="fill" /> {t('med_prep_s1_alert_title') || t("g_12761e") || "\uC548\uC2EC\uD558\uC138\uC694"}
                        </div>
                        <div style={{
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.5
          }}>
                            {t('med_prep_s1_alert_desc') || t("g_73b7f2") || "&apos;\uBB34\uC74C&apos;\uC774\uB098 &apos;\uBC29\uD574\uAE08\uC9C0&apos; \uBAA8\uB4DC\uC5D0\uC11C\uB3C4 **\uBA85\uC0C1 \uAC00\uC774\uB4DC\uC640 \uBC30\uACBD\uC74C\uC740 \uC815\uC0C1\uC801\uC73C\uB85C \uB4E4\uB9BD\uB2C8\uB2E4.** \uC678\uBD80 \uC54C\uB9BC\uB9CC \uCC28\uB2E8\uB418\uB2C8 \uC548\uC2EC\uD558\uACE0 \uC124\uC815\uD574\uC8FC\uC138\uC694."}
                        </div>
                    </div>
                </div>
                <button onClick={() => {
        setPrepSelections(prev => ({
          ...prev,
          notified: true
        }));
        setStep('intention');
      }} style={{
        width: '100%',
        background: 'var(--primary-gold)',
        color: 'var(--text-on-primary)',
        padding: '18px',
        borderRadius: '20px',
        fontSize: '1.1rem',
        fontWeight: 800,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
                    {t('med_prep_btn_confirmed') || t("g_dd1786") || "\uD655\uC778\uD588\uC2B5\uB2C8\uB2E4"}
                </button>
            </div>
        </div>
    </div>;