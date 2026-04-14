import { useNavigate } from 'react-router-dom';
import { useStudioConfig } from '../../../contexts/StudioContext';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { X, Heartbeat, Brain, Sparkle } from '../../../components/CommonIcons';
export const FeedbackView = ({
  activeMode,
  feedbackData,
  formatTime,
  timeLeft,
  modeName,
  onClose
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const navigate = useNavigate();
  const duration = activeMode?.time || (activeMode?.id === 'breath' ? 3 * 60 : activeMode?.id === 'calm' ? 7 * 60 : 15 * 60);
  const actualTime = Math.max(0, duration - timeLeft);
  return <div style={{
    position: 'fixed',
    inset: 0,
    background: '#0a0a0c',
    zIndex: 4000,
    overflowY: 'auto',
    padding: '20px',
    WebkitOverflowScrolling: 'touch'
  }}>
            <div style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      margin: 'auto'
    }}>
            <button onClick={onClose} style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(255,255,255,0.1)',
        border: 'none',
        color: 'white',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }}><X size={24} /></button>

            <div style={{
        background: 'linear-gradient(145deg, rgba(30,30,35,0.9), rgba(15,15,20,0.9))',
        borderRadius: '30px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        border: `1px solid ${activeMode?.color}40`,
        boxShadow: `0 20px 80px ${activeMode?.color}20`,
        animation: 'fadeIn 0.5s ease-out'
      }}>
                <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
                    <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: `${activeMode?.color}20`,
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeMode?.color
          }}>
                        <Brain size={40} weight="light" />
                    </div>
                    <h2 style={{
            color: 'white',
            fontSize: '1.8rem',
            fontWeight: 600,
            marginBottom: '10px'
          }}>
                        {t('med_feedback_title') || t("g_d5a419") || t("g_d5a419") || t("g_d5a419") || t("g_d5a419") || t("g_d5a419") || "\uBA85\uC0C1 \uC218\uB828 \uC644\uB8CC"}
                    </h2>
                </div>

                {feedbackData ? <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '20px',
          padding: '25px',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
                        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '15px'
          }}>
                            <Heartbeat size={24} color={activeMode?.color || config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'} />
                            <h3 style={{
              color: 'white',
              fontSize: '1.2rem',
              fontWeight: 500,
              margin: 0
            }}>
                                {t('med_feedback_ai_log') || t("g_b2513d") || t("g_b2513d") || t("g_b2513d") || t("g_b2513d") || t("g_b2513d") || "AI\uC758 \uB9C8\uC74C \uAD00\uCC30 \uC77C\uC9C0"}
                            </h3>
                        </div>
                        
                        {/* ✅ [FIX 3] 관찰일지 출력 로직 개선: message 외에 feedbackPoints도 제대로 노출 */}
                        <div style={{
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.8,
            fontSize: '1.1rem',
            whiteSpace: 'pre-wrap',
            marginBottom: '20px'
          }}>
                            {feedbackData.message && <p style={{
              marginBottom: '15px'
            }}>{feedbackData.message}</p>}
                            {feedbackData.feedbackPoints && feedbackData.feedbackPoints.length > 0 ? <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
                                    {feedbackData.feedbackPoints.map((point, index) => <li key={index} style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}>
                                            <Sparkle size={18} color={activeMode?.color || config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'} style={{
                  marginTop: '4px',
                  flexShrink: 0
                }} />
                                            <span>{point}</span>
                                        </li>)}
                                </ul> : !feedbackData.message && <p style={{
              color: 'rgba(255,255,255,0.5)',
              fontStyle: 'italic'
            }}>{t('med_feedback_no_log') || t("g_dd4eb6") || t("g_dd4eb6") || t("g_dd4eb6") || t("g_dd4eb6") || t("g_dd4eb6") || "\uBA85\uC0C1 \uB370\uC774\uD130 \uBD84\uC11D \uB0B4\uC6A9\uC744 \uC694\uC57D\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."}</p>}
                        </div>
                        
                        {feedbackData.analysis && <div style={{
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px'
          }}>
                                <div style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '15px',
              borderRadius: '15px'
            }}>
                                    <span style={{
                display: 'block',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.85rem',
                marginBottom: '5px'
              }}>{t('med_feedback_stability') || t("g_6bbc46") || t("g_6bbc46") || t("g_6bbc46") || t("g_6bbc46") || t("g_6bbc46") || "\uD638\uD761 \uC548\uC815\uB3C4"}</span>
                                    <span style={{
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: 600
              }}>{feedbackData.analysis.stabilityScore}/100</span>
                                </div>
                                <div style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '15px',
              borderRadius: '15px'
            }}>
                                    <span style={{
                display: 'block',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.85rem',
                marginBottom: '5px'
              }}>{t('med_feedback_energy') || t("g_158512") || t("g_158512") || t("g_158512") || t("g_158512") || t("g_158512") || "\uC5D0\uB108\uC9C0 \uBCC0\uD654"}</span>
                                    <span style={{
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 500
              }}>{t(`med_energy_${feedbackData.analysis.energyShift}`) || feedbackData.analysis.energyShift}</span>
                                </div>
                            </div>}
                    </div> : <div style={{
          textAlign: 'center',
          padding: '40px 0'
        }}>
                        <div className="breathing-circle" style={{
            width: '40px',
            height: '40px',
            margin: '0 auto 20px',
            background: activeMode?.color,
            borderRadius: '50%'
          }} />
                        <p style={{
            color: 'rgba(255,255,255,0.6)'
          }}>{t('med_feedback_analyzing') || t("g_a399c4") || t("g_a399c4") || t("g_a399c4") || t("g_a399c4") || t("g_a399c4") || "\uBA85\uC0C1 \uB370\uC774\uD130\uB97C \uBD84\uC11D\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4..."}</p>
                    </div>}

                {/* ✅ [FIX 1] 버튼이 검은색 배경에 묻히지 않도록 기본 Fallback Color 적용 */}
                <button onClick={onClose} style={{
          width: '100%',
          padding: '20px',
          marginTop: '30px',
          background: activeMode?.color || config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)',
          border: 'none',
          borderRadius: '15px',
          color: 'var(--text-on-primary)',
          fontWeight: 800,
          fontSize: '1.2rem',
          cursor: 'pointer',
          boxShadow: `0 10px 30px ${activeMode?.color || config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'}40`
        }}>
                    {t('med_feedback_btn_close') || t("g_3a6f82") || t("g_3a6f82") || t("g_3a6f82") || t("g_3a6f82") || t("g_3a6f82") || "\uB9C8\uC74C \uCC59\uAE40 \uB9C8\uCE58\uACE0 \uB3CC\uC544\uAC00\uAE30"}
                </button>
            </div>
            </div>
        </div>;
};