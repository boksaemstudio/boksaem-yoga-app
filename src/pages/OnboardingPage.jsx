import { useLanguageStore } from '../stores/useLanguageStore';
import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Buildings, CheckCircle, ShieldCheck, ArrowRight, ArrowLeft, Spinner, Upload, MagicWand, Image as ImageIcon, CalendarBlank, ArrowsClockwise, EnvelopeSimple } from '@phosphor-icons/react';
import { studioRegistryService } from '../services/studioRegistryService';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { detectOnboardingLang, getOnboardingStrings } from '../i18n/onboardingI18n';
import ContactModal from '../components/common/ContactModal';
const OnboardingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // i18n: detect language
  const lang = useMemo(() => {
    const paramLang = searchParams.get('lang');
    if (paramLang) return paramLang;
    return detectOnboardingLang();
  }, [searchParams]);
  const t = useMemo(() => getOnboardingStrings(lang), [lang]);
  const [formData, setFormData] = useState({
    name: '',
    nameEnglish: '',
    ownerEmail: '',
    plan: 'basic',
    logoOption: 'ai',
    logoFile: null,
    logoPreviewUrl: null,
    scheduleFiles: [],
    language: lang // track which language the user signed up with
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdStudioId, setCreatedStudioId] = useState(null);
  const [aiColor, setAiColor] = useState('60a5fa');
  const handleRegenerateAiLogo = e => {
    if (e) e.stopPropagation();
    setAiColor(Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
  };
  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handlePrev = () => setStep(s => Math.max(s - 1, 0));
  const handleLogoUpload = e => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData({
        ...formData,
        logoFile: file,
        logoPreviewUrl: url,
        logoOption: 'upload'
      });
    }
  };
  const handleSubmit = async () => {
    setIsSubmitting(true);
    let finalLogoUrl = null;
    if (formData.logoOption === 'upload' && formData.logoFile) {
      try {
        const fileName = `onboarding_${Date.now()}_${formData.logoFile.name}`;
        const logoRef = ref(storage, `platform/onboarding_logos/${fileName}`);
        await uploadBytes(logoRef, formData.logoFile);
        finalLogoUrl = await getDownloadURL(logoRef);
      } catch (e) {
        console.error("Logo upload failed", e);
      }
    } else if (formData.logoOption === 'ai') {
      finalLogoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'Studio')}&background=${aiColor}&color=fff&size=512&rounded=true&font-size=0.4&bold=true`;
    }
    let finalScheduleUrls = [];
    if (formData.scheduleFiles && formData.scheduleFiles.length > 0) {
      for (let i = 0; i < formData.scheduleFiles.length; i++) {
        const f = formData.scheduleFiles[i];
        try {
          const fileName = `onboarding_${Date.now()}_schedule_${i}_${f.name}`;
          const scheduleRef = ref(storage, `platform/onboarding_schedules/${fileName}`);
          await uploadBytes(scheduleRef, f);
          const url = await getDownloadURL(scheduleRef);
          finalScheduleUrls.push(url);
        } catch (e) {
          console.error("Schedule upload failed", e);
        }
      }
    }
    const submitData = {
      ...formData
    };
    delete submitData.logoFile;
    delete submitData.logoPreviewUrl;
    delete submitData.scheduleFiles;
    if (finalLogoUrl) submitData.logoUrl = finalLogoUrl;
    if (finalScheduleUrls.length > 0) submitData.scheduleUrls = finalScheduleUrls;
    const result = await studioRegistryService.requestOnboarding(submitData);
    setIsSubmitting(false);
    if (result.success) {
      if (result.studioId) setCreatedStudioId(result.studioId);
      setStep(2);
    } else {
      alert(t.submitError(result.message));
    }
  };

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: lang === 'ja' ? "'Noto Sans JP', sans-serif" : "'Pretendard', 'Inter', sans-serif"
  };
  const cardStyle = {
    background: 'linear-gradient(145deg, rgba(30, 30, 60, 0.95), rgba(20, 20, 45, 0.98))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '24px',
    padding: '40px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
    position: 'relative',
    overflow: 'hidden'
  };
  const inputStyle = {
    width: '100%',
    padding: '16px',
    background: 'rgba(0,0,0,0.2)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: 'white',
    fontSize: '1.1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    marginBottom: '20px',
    boxSizing: 'border-box'
  };
  const buttonStyle = {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.2rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'transform 0.1s, opacity 0.2s',
    marginTop: '20px'
  };
  const navButtonStyle = {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    padding: '0',
    marginBottom: '24px'
  };
  const optionCardStyle = isSelected => ({
    padding: '20px',
    border: isSelected ? '2px solid #60a5fa' : '2px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    cursor: 'pointer',
    background: isSelected ? 'rgba(96, 165, 250, 0.1)' : 'rgba(0,0,0,0.2)',
    transition: 'all 0.2s'
  });

  // CTA button config based on language
  const renderCTA = () => {
    const t = useLanguageStore(s => s.t);
    if (t.ctaType === 'kakao') {
      return <a href={t.ctaUrl} target="_blank" rel="noopener noreferrer" style={{
        ...buttonStyle,
        background: '#FEE500',
        color: '#191919',
        marginTop: '12px',
        boxShadow: '0 4px 15px rgba(254, 229, 0, 0.2)',
        textDecoration: 'none'
      }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-5.52 0-10 3.58-10 8 0 2.85 1.83 5.34 4.54 6.8-.3 1.14-1.14 4.28-1.17 4.41-.03.11.04.22.14.22.06 0 .13-.02.18-.06 1.48-1.07 5.17-3.71 5.4-3.87.3.04.6.06.91.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z" /></svg>
                    {t.kakaoBtn}
                </a>;
    }
    if (t.ctaType === 'whatsapp') {
      return <a href={t.ctaUrl} target="_blank" rel="noopener noreferrer" style={{
        ...buttonStyle,
        background: '#25D366',
        color: '#fff',
        marginTop: '12px',
        boxShadow: '0 4px 15px rgba(37,211,102,0.2)',
        textDecoration: 'none'
      }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    {t.kakaoBtn}
                </a>;
    }
    if (t.ctaType === 'line') {
      return <a href={t.ctaUrl} target="_blank" rel="noopener noreferrer" style={{
        ...buttonStyle,
        background: '#06C755',
        color: '#fff',
        marginTop: '12px',
        boxShadow: '0 4px 15px rgba(6,199,85,0.2)',
        textDecoration: 'none'
      }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                    {t.kakaoBtn}
                </a>;
    }
    if (t.ctaType === 'email') {
      return <button onClick={() => setIsContactModalOpen(true)} style={{ ...buttonStyle, background: '#FBB117', color: '#000', marginTop: '12px', boxShadow: '0 4px 15px rgba(251, 177, 23, 0.2)' }}>
        <EnvelopeSimple weight="fill" /> {t.kakaoBtn || 'Contact Super Admin'}
      </button>;
    }
    return null;
  };
  const renderStepIndicator = () => {
    const t = useLanguageStore(s => s.t);
    const totalSteps = 2;
    const currentIdx = step - 1;
    if (step === 0 || step === 2) return null;
    return <div style={{
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      marginBottom: '32px'
    }}>
                {Array.from({
        length: totalSteps
      }).map((_, i) => <div key={i} style={{
        width: i === currentIdx ? '32px' : '8px',
        height: '8px',
        borderRadius: '4px',
        background: i <= currentIdx ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.15)',
        transition: 'all 0.3s'
      }} />)}
            </div>;
  };

  // Step 0: Landing
  if (step === 0) {
    return <div style={containerStyle}>
                <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
                <div style={cardStyle}>
                    <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
                        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}>
                            <img src="/assets/passflow_square_logo.png" alt="Logo" style={{
              height: '56px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }} />
                            <div style={{
              width: '220px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative'
            }}>
                                <img src="/assets/passflow_ai_logo_transparent.png" alt="PassFlow AI" style={{
                position: 'absolute',
                height: '160px',
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: 'none',
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
              }} />
                            </div>
                        </div>
                        <h1 style={{
            fontSize: '2rem',
            margin: '0 0 12px 0',
            fontWeight: '800'
          }}>{t.heroTitle}</h1>
                        <p style={{
            color: '#94a3b8',
            fontSize: '1.1rem',
            margin: 0,
            lineHeight: '1.5',
            whiteSpace: 'pre-line'
          }}>{t.heroDesc}</p>
                    </div>
                    <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginBottom: '32px'
        }}>
                        <div style={{
            display: 'flex',
            gap: '16px',
            background: 'rgba(255,255,255,0.03)',
            padding: '16px',
            borderRadius: '16px'
          }}>
                            <Buildings size={32} color="#60a5fa" weight="duotone" />
                            <div>
                                <h3 style={{
                margin: '0 0 4px 0',
                fontSize: '1rem'
              }}>{t.featureManage}</h3>
                                <p style={{
                margin: 0,
                fontSize: '0.85rem',
                color: '#94a3b8'
              }}>{t.featureManageDesc}</p>
                            </div>
                        </div>
                        <div style={{
            display: 'flex',
            gap: '16px',
            background: 'rgba(255,255,255,0.03)',
            padding: '16px',
            borderRadius: '16px'
          }}>
                            <ShieldCheck size={32} color="#34d399" weight="duotone" />
                            <div>
                                <h3 style={{
                margin: '0 0 4px 0',
                fontSize: '1rem'
              }}>{t.featureSecurity}</h3>
                                <p style={{
                margin: 0,
                fontSize: '0.85rem',
                color: '#94a3b8'
              }}>{t.featureSecurityDesc}</p>
                            </div>
                        </div>
                    </div>
                    <button style={buttonStyle} onClick={handleNext}>{t.startBtn} <ArrowRight size={20} weight="bold" /></button>
                    {renderCTA()}
                    <button onClick={() => navigate(t.homeUrl || '/')} style={{
          ...navButtonStyle,
          justifyContent: 'center',
          width: '100%',
          marginTop: '20px',
          marginBottom: 0
        }}>
                        {t.backToHome}
                    </button>
                </div>
            </div>;
  }

  // Step 1: Name + Email (combined for faster conversion)
  if (step === 1) {
    const canSubmit = formData.name.trim() && formData.ownerEmail.includes('@');
    return <div style={containerStyle}>
                <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
                <div style={cardStyle}>
                    <button style={navButtonStyle} onClick={handlePrev}><ArrowLeft size={16} /> {t.prevBtn}</button>
                    {renderStepIndicator()}
                    <h2 style={{
          fontSize: '1.6rem',
          marginBottom: '8px'
        }}>{t.nameTitle}</h2>
                    <p style={{
          color: '#94a3b8',
          marginBottom: '24px'
        }}>{t.nameDesc}</p>
                    <input style={inputStyle} placeholder={t.namePlaceholder} value={formData.name} onChange={e => setFormData({
          ...formData,
          name: e.target.value
        })} autoFocus />
                    <h2 style={{
          fontSize: '1.4rem',
          marginBottom: '8px',
          marginTop: '8px'
        }}>{t.emailTitle}</h2>
                    <p style={{
          color: '#94a3b8',
          marginBottom: '24px'
        }}>{t.emailDesc}</p>
                    <input type="email" style={inputStyle} placeholder={t.emailPlaceholder} value={formData.ownerEmail} onChange={e => setFormData({
          ...formData,
          ownerEmail: e.target.value
        })} />
                    <button style={{
          ...buttonStyle,
          opacity: canSubmit ? 1 : 0.5
        }} onClick={() => canSubmit && handleSubmit()} disabled={isSubmitting || !canSubmit}>
                        {isSubmitting ? <Spinner size={24} className="spin" /> : <><CheckCircle size={20} weight="bold" /> {t.submitBtn || t.nextBtn}</>}
                    </button>
                    {renderCTA()}
                </div>
            </div>;
  }

  // Step 2: Success — 즉시 접속 URL 안내
  if (step === 2) {
    const adminUrl = createdStudioId ? `https://passflowai.web.app/admin?studioId=${createdStudioId}` : 'https://passflowai.web.app/admin';
    return <div style={containerStyle}>
                <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
                <div style={cardStyle}>
                    <div style={{
          textAlign: 'center'
        }}>
                        <div style={{
            width: '80px',
            height: '80px',
            background: 'rgba(52, 211, 153, 0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
                            <CheckCircle size={48} color="#34d399" weight="fill" />
                        </div>
                        <h2 style={{
            fontSize: '1.8rem',
            margin: '0 0 16px 0'
          }}>{t.successTitle}</h2>
                        <p style={{
            color: '#94a3b8',
            lineHeight: '1.6',
            marginBottom: '24px',
            whiteSpace: 'pre-line'
          }}>
                            {t.successDesc(formData.ownerEmail)}
                        </p>

                        {/* 즉시 접속 안내 */}
                        {createdStudioId && <div style={{
            padding: '20px',
            borderRadius: '16px',
            background: 'rgba(74,222,128,0.08)',
            border: '1px solid rgba(74,222,128,0.2)',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
                                <div style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: '#4ade80',
              marginBottom: '12px'
            }}>
                                    🎉 {lang === 'ko' ? t("g_3c39b3") || t("g_3c39b3") || t("g_3c39b3") || "\uC2A4\uD29C\uB514\uC624\uAC00 \uC989\uC2DC \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4!" : 'Your studio is ready!'}
                                </div>
                                <div style={{
              fontSize: '0.85rem',
              color: '#94a3b8',
              marginBottom: '8px'
            }}>
                                    Studio ID: <strong style={{
                color: '#fff'
              }}>{createdStudioId}</strong>
                                </div>
                                <div style={{
              fontSize: '0.85rem',
              color: '#94a3b8',
              marginBottom: '4px'
            }}>
                                    {lang === 'ko' ? t("g_951da8") || t("g_951da8") || t("g_951da8") || "\u2705 2\uAC1C\uC6D4 \uBB34\uB8CC \uCCB4\uD5D8\uC774 \uC2DC\uC791\uB418\uC5C8\uC2B5\uB2C8\uB2E4" : '✅ Your 2-month free trial has started'}
                                </div>
                            </div>}

                        {/* 초기 세팅 가이드 */}
                        <div style={{
            textAlign: 'left',
            background: 'rgba(255,255,255,0.05)',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '24px'
          }}>
                            <h3 style={{
              fontSize: '1.1rem',
              margin: '0 0 20px 0',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
                                🚀 {t.setupGuideTitle}
                            </h3>
                            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              color: '#94a3b8',
              fontSize: '0.9rem',
              lineHeight: '1.6'
            }}>
                                <div style={{
                padding: '14px',
                background: 'rgba(96,165,250,0.06)',
                borderRadius: '12px',
                border: '1px solid rgba(96,165,250,0.1)'
              }}>
                                    <strong style={{
                  color: '#fff',
                  display: 'block',
                  marginBottom: '6px'
                }}>{t.setupScheduleLabel}</strong>
                                    {t.setupScheduleDesc}
                                </div>
                                <div style={{
                padding: '14px',
                background: 'rgba(74,222,128,0.06)',
                borderRadius: '12px',
                border: '1px solid rgba(74,222,128,0.1)'
              }}>
                                    <strong style={{
                  color: '#fff',
                  display: 'block',
                  marginBottom: '6px'
                }}>{t.setupMemberLabel}</strong>
                                    {t.setupMemberDesc}
                                </div>
                                <div style={{
                padding: '14px',
                background: 'rgba(251,191,36,0.06)',
                borderRadius: '12px',
                border: '1px solid rgba(251,191,36,0.1)'
              }}>
                                    <strong style={{
                  color: '#fff',
                  display: 'block',
                  marginBottom: '6px'
                }}>{t.setupPricingLabel}</strong>
                                    {t.setupPricingDesc}
                                </div>
                                <div style={{
                fontSize: '0.85rem',
                color: '#64748b',
                padding: '0 4px'
              }}>
                                    {t.setupLogoNote}
                                </div>
                            </div>
                        </div>

                        {createdStudioId && <a href={adminUrl} target="_blank" rel="noopener noreferrer" style={{
            ...buttonStyle,
            background: 'linear-gradient(135deg, #4ade80, #22c55e)',
            textDecoration: 'none',
            marginBottom: '12px'
          }}>
                                🚀 {lang === 'ko' ? t("g_1a2905") || t("g_1a2905") || t("g_1a2905") || "\uB0B4 \uC2A4\uD29C\uB514\uC624 \uBC14\uB85C \uC811\uC18D\uD558\uAE30" : 'Go to My Studio Now'}
                            </a>}
                        <button style={{
            ...buttonStyle,
            background: 'rgba(255,255,255,0.1)'
          }} onClick={() => navigate(t.homeUrl || '/')}>
                            {t.goHome}
                        </button>
                    </div>
                </div>
            </div>;
  }
  return null;
};
export default OnboardingPage;