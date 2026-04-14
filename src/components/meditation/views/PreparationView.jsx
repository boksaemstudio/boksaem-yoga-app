import { useLanguageStore } from '../../../stores/useLanguageStore';
import { ArrowLeft, SpeakerHigh } from '@phosphor-icons/react';
import { MeditationDebugOverlay } from '../MeditationDebugOverlay';
export const PreparationView = ({
  config,
  visualTheme,
  isDebugMode,
  ttsState,
  step,
  audioVolumes,
  aiMessage,
  aiLatency,
  prepStep,
  setPrepStep,
  prepSelections,
  setPrepSelections,
  interactionType,
  startSession,
  activeMode,
  setStep
}) => {
  const t = useLanguageStore(s => s.t);
  const PREPARATION_GUIDES = {
    chair: {
      title: t('med_prep_chair_title') || t("g_1929a0") || "\uC758\uC790 \uBA85\uC0C1",
      desc: t('med_prep_chair_desc') || t("g_c027e9") || "\uD68C\uC0AC\uB098 \uC9D1\uC5D0\uC11C \uAC04\uD3B8\uD558\uAC8C",
      steps: [t('med_prep_chair_s1') || t("g_d556a8") || "\uC758\uC790 \uC55E\uCABD\uC5D0 \uAC78\uD130\uC549\uC544 \uD5C8\uB9AC\uB97C \uC138\uC6C1\uB2C8\uB2E4.", t('med_prep_chair_s2') || t("g_b61463") || "\uC591\uBC1C\uC740 \uC5B4\uAE68\uB108\uBE44\uB85C \uBC8C\uB824 \uC9C0\uBA74\uC5D0 \uB2FF\uAC8C \uD569\uB2C8\uB2E4.", t('med_prep_chair_s3') || t("g_f943cb") || "\uC190\uC740 \uD3B8\uC548\uD558\uAC8C \uBB34\uB98E \uC704\uC5D0 \uC62C\uB9BD\uB2C8\uB2E4."]
    },
    floor: {
      title: t('med_prep_floor_title') || t("g_5fb5e9") || "\uBC14\uB2E5 \uBA85\uC0C1",
      desc: t('med_prep_floor_desc') || t("g_339596") || "\uC870\uC6A9\uD558\uACE0 \uC548\uC815\uC801\uC778 \uACF5\uAC04\uC5D0\uC11C",
      steps: [t('med_prep_floor_s1') || t("g_d73482") || "\uAC00\uBD80\uC88C \uB610\uB294 \uD3B8\uD55C \uCC45\uC0C1\uB2E4\uB9AC\uB97C \uD569\uB2C8\uB2E4.", t('med_prep_floor_s2') || t("g_06213e") || "\uCFE0\uC158\uC744 \uD65C\uC6A9\uD574 \uBB34\uB98E\uC774 \uC5C9\uB369\uC774\uBCF4\uB2E4 \uB0AE\uAC8C \uD569\uB2C8\uB2E4.", t('med_prep_floor_s3') || t("g_b6aaa0") || "\uCC99\uCD94\uB97C \uACE7\uAC8C \uD3B4\uACE0 \uC815\uC218\uB9AC\uB97C \uD558\uB298\uB85C \uB2F9\uAE41\uB2C8\uB2E4."]
    },
    lying: {
      title: t('med_prep_lying_title') || t("g_9e714b") || "\uB204\uC6B4 \uBA85\uC0C1",
      desc: t('med_prep_lying_desc') || t("g_f7b44a") || "\uAE4A\uC740 \uC774\uC644\uACFC \uC218\uBA74\uC744 \uC704\uD574",
      steps: [t('med_prep_lying_s1') || t("g_215aa2") || "\uB4F1\uC744 \uB300\uACE0 \uD3B8\uC548\uD558\uAC8C \uB215\uC2B5\uB2C8\uB2E4.", t('med_prep_lying_s2') || t("g_cca7a6") || "\uB2E4\uB9AC\uB294 \uC5B4\uAE68 \uB108\uBE44\uB85C \uBC8C\uB9AC\uACE0 \uBC1C\uB05D\uC744 \uD22D \uB5A8\uC5B4\uB728\uB9BD\uB2C8\uB2E4.", t('med_prep_lying_s3') || t("g_fd40e4") || "\uD314\uC740 \uBAB8 \uC606\uC5D0 \uB450\uACE0 \uC190\uBC14\uB2E5\uC774 \uD558\uB298\uC744 \uD5A5\uD558\uAC8C \uD569\uB2C8\uB2E4."]
    }
  };
  return <div style={{
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
                {/* 🛠️ Debug Overlay */}
                <MeditationDebugOverlay isVisible={isDebugMode} ttsState={ttsState} currentStep={step} audioLevels={audioVolumes} currentText={aiMessage} aiLatency={aiLatency} />
                <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
                    <button onClick={() => setStep('interaction_select')} style={{
          padding: '10px',
          color: 'white',
          background: 'none',
          border: 'none'
        }}>
                        <ArrowLeft size={24} />
                    </button>
                    <div style={{
          flex: 1,
          textAlign: 'center'
        }}>
                        <div style={{
            fontSize: '0.8rem',
            color: 'var(--primary-gold)',
            fontWeight: 600
          }}>{t('med_prep_header', {
              step: prepStep
            }) || `준비 단계 (${prepStep}/3)`}</div>
                        <div style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'white'
          }}>{t('med_prep_title') || t("g_61bda6") || "\uBA85\uC0C1 \uC900\uBE44"}</div>
                    </div>
                    <div style={{
          width: '44px'
        }} />
                </div>

                <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '10px'
      }}>
                    {/* STEP 1: Notifications Off */}
                    {prepStep === 1 && <div style={{
          width: '100%',
          maxWidth: '350px',
          animation: 'fadeIn 0.5s ease'
        }}>
                            <div style={{
            textAlign: 'center',
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
              __html: t('med_prep_s1_desc_html') || t("g_229a69") || "\uBC29\uD574\uBC1B\uC9C0 \uC54A\uB3C4\uB85D <br/>\uAE30\uAE30\uB97C '\uBB34\uC74C' \uB610\uB294 '\uBC29\uD574\uAE08\uC9C0' \uBAA8\uB4DC\uB85C <br/>\uC124\uC815\uD574\uC8FC\uC168\uB098\uC694?"
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
                                        {t('med_prep_s1_alert_desc') || t("g_11f163") || "'\uBB34\uC74C'\uC774\uB098 '\uBC29\uD574\uAE08\uC9C0' \uBAA8\uB4DC\uC5D0\uC11C\uB3C4 **\uBA85\uC0C1 \uAC00\uC774\uB4DC\uC640 \uBC30\uACBD\uC74C\uC740 \uC815\uC0C1\uC801\uC73C\uB85C \uB4E4\uB9BD\uB2C8\uB2E4.** \uC678\uBD80 \uC54C\uB9BC\uB9CC \uCC28\uB2E8\uB418\uB2C8 \uC548\uC2EC\uD558\uACE0 \uC124\uC815\uD574\uC8FC\uC138\uC694."}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => {
            setPrepSelections({
              ...prepSelections,
              notified: true
            });
            setPrepStep(2);
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
          }}>{t('med_prep_btn_confirmed') || t("g_dd1786") || "\uD655\uC778\uD588\uC2B5\uB2C8\uB2E4"}</button>
                        </div>}

                    {/* STEP 3: Posture Guide */}
                    {prepStep === 3 && <div style={{
          width: '100%',
          maxWidth: '400px',
          animation: 'fadeIn 0.5s ease'
        }}>
                            <h3 style={{
            fontSize: '1.3rem',
            fontWeight: 700,
            color: 'white',
            marginBottom: '15px',
            textAlign: 'center'
          }}>{t('med_prep_s3_title') || t("g_ee438c") || "\uAC00\uC7A5 \uD3B8\uD55C \uC790\uC138\uB97C \uCC3E\uC544\uBCF4\uC138\uC694"}</h3>
                            <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '15px'
          }}>
                                {Object.entries(PREPARATION_GUIDES).map(([key, info]) => <button key={key} onClick={() => setPrepSelections({
              ...prepSelections,
              posture: key
            })} style={{
              flex: 1,
              padding: '10px 4px',
              borderRadius: '12px',
              fontSize: '0.8rem',
              background: prepSelections.posture === key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)',
              color: prepSelections.posture === key ? 'white' : 'rgba(255,255,255,0.4)',
              border: prepSelections.posture === key ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
              fontWeight: 600
            }}>{info.title}</button>)}
                            </div>
                            <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '24px',
            padding: '20px',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '20px',
            minHeight: '180px'
          }}>
                                <div style={{
              color: 'var(--primary-gold)',
              fontSize: '0.75rem',
              fontWeight: 700,
              marginBottom: '4px'
            }}>{PREPARATION_GUIDES[prepSelections.posture].desc}</div>
                                <div style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: 'white',
              marginBottom: '12px'
            }}>{t('med_prep_posture_format', {
                title: PREPARATION_GUIDES[prepSelections.posture].title
              }) || `${PREPARATION_GUIDES[prepSelections.posture].title} 자세`}</div>
                                <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
                                    {PREPARATION_GUIDES[prepSelections.posture].steps.map((s, i) => <div key={i} style={{
                display: 'flex',
                gap: '8px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '0.9rem',
                lineHeight: 1.4
              }}>
                                            <span style={{
                  color: 'var(--primary-gold)',
                  fontWeight: 800
                }}>{i + 1}</span>
                                            <span>{s}</span>
                                        </div>)}
                                </div>
                            </div>
                            <button onClick={() => setPrepStep(2)} style={{
            width: '100%',
            background: 'white',
            color: 'var(--text-on-primary)',
            padding: '18px',
            borderRadius: '20px',
            fontSize: '1.1rem',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            marginBottom: '15px'
          }}>{t('med_prep_btn_goto_device') || t("g_d0f6a0") || "\uAE30\uAE30 \uC704\uCE58 \uC124\uC815\uC73C\uB85C"}</button>
                        </div>}
                    
                    {/* STEP 2: Phone Placement */}
                    {prepStep === 2 && <div style={{
          width: '100%',
          maxWidth: '350px',
          animation: 'fadeIn 0.5s ease'
        }}>
                            <div style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}>
                                <div style={{
              fontSize: '4rem',
              marginBottom: '20px'
            }}>
                                    {interactionType === 'v3' ? '📏' : interactionType === 'v2' ? '👄' : '📱'}
                                </div>
                                <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'white',
              marginBottom: '10px'
            }}>{t('med_prep_s2_title') || t("g_e73ad0") || "\uD578\uB4DC\uD3F0 \uC704\uCE58 \uC124\uC815"}</h3>
                                <p style={{
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.6,
              fontSize: '1.1rem'
            }}>
                                    {interactionType === 'v3' ? t('med_prep_s2_cam') || t("g_e1011c") || "\uC804\uC2E0 \uCD2C\uC601\uC744 \uC704\uD574 \uD578\uB4DC\uD3F0\uC744 \uC57D 2m \uAC70\uB9AC\uC5D0 \uC138\uC6CC\uB450\uC138\uC694." : interactionType === 'v2' ? t('med_prep_s2_mic') || t("g_2d5c32") || "\uC228\uC18C\uB9AC \uAC10\uC9C0\uB97C \uC704\uD574 \uD578\uB4DC\uD3F0\uC744 \uC785 \uADFC\uCC98(30cm \uB0B4)\uC5D0 \uBE44\uC2A4\uB4EC\uD788 \uC138\uC6CC\uB450\uC138\uC694." : t('med_prep_s2_base') || t("g_f031e4") || "\uD578\uB4DC\uD3F0\uC744 \uC190\uC774 \uB2FF\uB294 \uD3B8\uD55C \uACF3\uC5D0 \uB450\uC138\uC694."}
                                </p>
                                {interactionType === 'v2' && <div style={{
              marginTop: '20px',
              padding: '12px',
              background: 'rgba(74, 222, 128, 0.1)',
              borderRadius: '12px',
              border: `1px solid ${config.THEME?.SUCCESS_COLOR || '#4ade80'}33`,
              fontSize: '0.85rem',
              color: config.THEME?.SUCCESS_COLOR || '#4ade80'
            }}>💡 <b>Tip:</b> {t('med_prep_s2_tip_mic') || t("g_522c83") || "\uB9C8\uC774\uD06C\uAC00 \uD3EC\uD568\uB41C \uC774\uC5B4\uD3F0\uC744 \uC0AC\uC6A9\uD558\uC2DC\uBA74 \uC228\uC18C\uB9AC\uB97C \uD6E8\uC52C \uB354 \uC815\uD655\uD558\uAC8C \uAC10\uC9C0\uD560 \uC218 \uC788\uC5B4\uC694."}</div>}
                            </div>
                            <button onClick={() => startSession(activeMode)} style={{
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
          }}>{t('med_prep_btn_ready') || t("g_37934e") || "\uC900\uBE44 \uC644\uB8CC (\uBA85\uC0C1 \uC2DC\uC791)"}</button>
                        </div>}
                </div>
            </div>
        </div>;
};