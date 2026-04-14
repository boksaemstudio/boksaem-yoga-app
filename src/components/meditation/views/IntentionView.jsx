import { useLanguageStore } from '../../../stores/useLanguageStore';
import { AILoadingIndicator } from '../ui/AILoadingIndicator';
import { MeditationDebugOverlay } from '../MeditationDebugOverlay';

// [HOTFIX] Local ArrowLeft to prevent 'Ar' ReferenceError
const ArrowLeft = ({
  size = 24,
  color = "currentColor"
}) => <svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
        <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" />
    </svg>;
const X = ({
  size = 24,
  weight = "regular",
  color = "currentColor"
}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={color} viewBox="0 0 256 256">
        {weight === "bold" ? <path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"></path> : <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>}
    </svg>;
export const IntentionView = ({
  config,
  visualTheme,
  isDebugMode,
  ttsState,
  step,
  audioVolumes,
  aiMessage,
  aiLatency,
  isOptionsLoading,
  selectedCategory,
  setSelectedCategory,
  dynamicCategories,
  dynamicIntentions,
  setSelectedIntention,
  setStep,
  fetchAIQuestion,
  stopAllAudio,
  onClose,
  navigate,
  lastSpokenMessage,
  currentAIChat,
  handleDebugToggle
}) => {
  const t = useLanguageStore(s => s.t);
  // ✅ Meditative Loading Screen
  if (isOptionsLoading) {
    return <div style={{
      position: 'fixed',
      inset: 0,
      background: config.THEME?.BACKGROUND || '#0a0a0c',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden'
    }}>
                <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{
        transition: 'all 1s ease',
        opacity: 0.5
      }} />
                <div style={{
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
                    <MeditationDebugOverlay isVisible={isDebugMode} ttsState={ttsState} currentStep={step} audioLevels={audioVolumes} currentText={aiMessage} aiLatency={aiLatency} />
                    <AILoadingIndicator />
                </div>
            </div>;
  }

  // 2-1단계: 카테고리 미선택
  if (!selectedCategory) {
    return <div style={{
      position: 'fixed',
      inset: 0,
      background: config.THEME?.BACKGROUND || '#0a0a0c',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
                <div className={`soul-light-base soul-theme-${visualTheme} active`} style={{
        transition: 'all 1s ease',
        opacity: 0.4
      }} />
                <div style={{
        padding: '15px 20px',
        paddingTop: 'max(15px, env(safe-area-inset-top))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(20, 20, 20, 0.4)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        zIndex: 20
      }}>
                    <MeditationDebugOverlay isVisible={isDebugMode} ttsState={ttsState} currentStep={step} audioLevels={audioVolumes} currentText={lastSpokenMessage || aiMessage || currentAIChat?.message} aiLatency={aiLatency} />

                    <div onClick={handleDebugToggle} style={{
          cursor: 'pointer'
        }}>
                        <span style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'white'
          }}>{t('med_intent_title_today') || t("g_e4bed8") || "\uC624\uB298\uC758 \uBA85\uC0C1"}</span>
                    </div>
                    <button onClick={() => {
          stopAllAudio();
          if (onClose) onClose();else navigate(-1);
        }} style={{
          padding: '8px 16px',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.08)',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.9)',
          fontSize: '0.85rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
                        <span>{t('med_intent_btn_exit') || t("g_c0a38f") || "\uB098\uAC00\uAE30"}</span>
                        <X size={16} weight="bold" />
                    </button>
                </div>

                <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: '100px 20px 40px',
        zIndex: 10,
        overflowY: 'auto'
      }}>
                    <div style={{
          textAlign: 'center',
          marginBottom: '50px'
        }}>
                        <h2 style={{
            fontSize: '1.6rem',
            fontWeight: 600,
            color: config.THEME?.PRIMARY_COLOR || '#4c9bfb',
            marginBottom: '15px',
            lineHeight: 1.4
          }} dangerouslySetInnerHTML={{
            __html: t('med_intent_q1_html') || t("g_a12a8e") || "\uC9C0\uAE08 \uB2F9\uC2E0\uC758 \uB9C8\uC74C\uC740<br/>\uC5B4\uB514\uB97C \uD5A5\uD558\uACE0 \uC788\uB098\uC694?"
          }} />
                        <p style={{
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.5)'
          }}>{t('med_intent_desc1') || t("g_e36318") || "\uC624\uB298 \uBA85\uC0C1\uC758 \uD070 \uBC29\uD5A5\uC744 \uC120\uD0DD\uD574\uBCF4\uC138\uC694"}</p>
                    </div>

                    <div style={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
                        {dynamicCategories.map(category => <button key={category.id} onClick={() => setSelectedCategory(category)} style={{
            padding: '30px 25px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textAlign: 'left'
          }} onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(76, 155, 251, 0.15)';
            e.currentTarget.style.borderColor = config.THEME?.PRIMARY_COLOR || '#4c9bfb';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }} onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
                                <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
                                    <span style={{
                fontSize: '2rem',
                marginRight: '15px'
              }}>{category.emoji}</span>
                                    <div style={{
                flex: 1
              }}>
                                        <div style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  marginBottom: '5px'
                }}>{category.label}</div>
                                        <div style={{
                  fontSize: '0.85rem',
                  color: 'rgba(255,255,255,0.5)'
                }}>{category.description || category.subtitle}</div>
                                    </div>
                                </div>
                            </button>)}
                    </div>
                </div>
            </div>;
  }

  // 2-2단계
  const categoryIntentions = dynamicIntentions.filter(i => i.category === selectedCategory.id);
  return <div style={{
    position: 'fixed',
    inset: 0,
    background: config.THEME?.BACKGROUND || '#0a0a0c',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
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
        padding: '10px 15px',
        paddingTop: 'max(10px, env(safe-area-inset-top))',
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(20, 20, 20, 0.4)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        zIndex: 20
      }}>
                    <button onClick={() => setSelectedCategory(null)} style={{
          padding: '8px',
          border: 'none',
          background: 'none',
          cursor: 'pointer'
        }}><ArrowLeft size={22} color="white" /></button>
                    <div style={{
          marginLeft: '10px'
        }}><span style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'white'
          }}>{selectedCategory.label}</span></div>
                </div>

                <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px',
        overflowY: 'auto'
      }}>
                    <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
                        <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: config.THEME?.PRIMARY_COLOR || '#4c9bfb',
            marginBottom: '10px'
          }}>{t('med_intent_q2') || t("g_17beab") || "\uC870\uAE08 \uB354 \uAD6C\uCCB4\uC801\uC73C\uB85C \uB4E4\uC5EC\uB2E4\uBCFC\uAE4C\uC694?"}</h2>
                        <p style={{
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.6
          }}>{selectedCategory.description}</p>
                    </div>

                    <div style={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
                        {categoryIntentions.map(intention => <button key={intention.id} onClick={() => {
            setSelectedIntention(intention);
            setStep('diagnosis');
            fetchAIQuestion([], true);
          }} style={{
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            color: 'white',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textAlign: 'left'
          }}>
                                <div style={{
              display: 'flex',
              alignItems: 'center'
            }}>
                                    <span style={{
                marginRight: '12px',
                fontSize: '1.5rem'
              }}>{intention.emoji}</span>
                                    <div style={{
                flex: 1
              }}>
                                        <div style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.5)',
                  marginBottom: '5px'
                }}>{intention.tag}</div>
                                        <div style={{
                  fontSize: '0.95rem'
                }}>{intention.label}</div>
                                    </div>
                                </div>
                            </button>)}
                    </div>
                </div>
            </div>
        </div>;
};