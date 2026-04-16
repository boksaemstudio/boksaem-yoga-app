import React from 'react';
import { Icons } from '../CommonIcons';
const AISection = ({
  aiExperience,
  weatherData,
  greetingVisible,
  t,
  getTraditionalYogaMessage
}) => {
  // [FIX] Clean up AI messages that sound like system errors or negative states
  const getCleanMessage = () => {
    const raw = aiExperience?.message || getTraditionalYogaMessage();

    // Block list for system-like or depressing messages
    const blockList = [t("g_4727c6") || "\uC218\uB828 \uAE30\uB85D\uC774 \uC77C\uC2DC \uC911\uB2E8\uB418\uC5C8\uC2B5\uB2C8\uB2E4", t("g_bc913b") || "\uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4", t("g_8ebcf3") || "\uB370\uC774\uD130\uAC00 \uBD80\uC871\uD569\uB2C8\uB2E4", t("g_6fee74") || "\uBD84\uC11D \uC911\uC785\uB2C8\uB2E4", t("g_3951e7") || "\uC2DC\uC2A4\uD15C \uC810\uAC80"];
    if (blockList.some(term => raw.includes(term))) {
      return getTraditionalYogaMessage();
    }
    return raw;
  };
  const isMultiSession = aiExperience?.isMultiSession || false;
  const sessionCount = aiExperience?.sessionCount || 1;
  return <div style={{
    marginBottom: '20px',
    position: 'relative'
  }}>
            <div style={{
      position: 'absolute',
      inset: '-10px',
      background: aiExperience?.colorTone || 'rgba(var(--primary-rgb), 0.1)',
      opacity: 1,
      // Increased for better look
      borderRadius: '15px',
      zIndex: -1
    }} />
            {/* Weather and Greeting Area */}
            <div style={{
      marginBottom: '20px'
    }}>
                <div style={{
        fontSize: '0.85rem',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
                    <Icons.CloudSun size={18} weight="duotone" color="var(--primary-gold)" />
                    <span style={{
          letterSpacing: '0.02em',
          fontWeight: 500
        }}>{weatherData ? `${t('weather_' + weatherData.key)} (${weatherData.temp}°C)` : aiExperience?.weather || ''}</span>
                </div>

                <div className={`welcome-container ${greetingVisible ? 'fade-in' : 'fade-out'}`} style={{
        minHeight: '3.6rem'
      }}>
                    <h1 style={{
          fontSize: '1.4rem',
          fontWeight: '800',
          lineHeight: '1.45',
          margin: '0 auto',
          // Center align block
          color: 'white',
          wordBreak: 'keep-all',
          letterSpacing: '-0.02em',
          textAlign: 'center' // [FIX] Center text as requested
        }}>
                        {getCleanMessage()}
                    </h1>

                    {/* [DESIGN REBIRTH] AI Context Log -> Yoga Insight Card */}
                    {aiExperience?.contextLog && ![t("g_179052") || "\uACF5\uBC31 \uBC1C\uC0DD", t("g_75a591") || "\uACF5\uBC31\uBC1C\uC0DD", t("g_c542d2") || "\uB370\uC774\uD130 \uBD80\uC871", "No data", t("g_0daea1") || "\uAE30\uB85D \uC5C6\uC74C", t("g_6c4c42") || "\uD734\uC2DD\uC73C\uB85C \uAE30\uB85D\uB428", t("g_3a3717") || "\uD734\uC2DD \uC0C1\uD0DC", t("g_920e33") || "\uD734\uC2DD \uBC1C\uC0DD"].some(term => aiExperience.contextLog.includes(term)) && <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(var(--primary-rgb), 0.2)',
          borderLeft: '4px solid var(--primary-gold)',
          borderRadius: '8px 16px 16px 8px',
          fontSize: '0.88rem',
          color: 'rgba(255,255,255,0.85)',
          textAlign: 'left',
          lineHeight: '1.7',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.5s ease-out'
        }}>
                                <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
                                    <div style={{
              fontSize: '0.7rem',
              color: 'var(--primary-gold)',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
                                        ✨ {t('todayWisdom')}
                                    </div>
                                    {isMultiSession && <div style={{
              background: 'var(--primary-gold)',
              color: 'var(--text-on-primary)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '0.65rem',
              fontWeight: '800'
            }}>
                                            {t('sessionComplete', {
                n: sessionCount
              })}
                                        </div>}
                                </div>
                                <div style={{
            whiteSpace: 'pre-wrap'
          }}>
                                    {aiExperience.contextLog}
                                </div>
                            </div>}

                </div>
            </div>
        </div>;
};
export default React.memo(AISection);