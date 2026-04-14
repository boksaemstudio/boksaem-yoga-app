import { useState, useEffect, useRef } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { useStudioConfig } from '../../../contexts/StudioContext';
import { Gear, MapPin, FloppyDisk, ArrowsClockwise, Image as ImageIcon, Globe } from '@phosphor-icons/react';
import { storage } from '../../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { tenantStoragePath } from '../../../utils/tenantStorage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { getCurrentStudioId } from '../../../utils/resolveStudioId';
const StudioSettingsTab = () => {
  const t = useLanguageStore(s => s.t);
  const {
    config,
    updateConfig,
    refreshConfig,
    loading
  } = useStudioConfig();
  const [localConfig, setLocalConfig] = useState(config);
  const [isSaving, setIsSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef(null);
  useEffect(() => {
    if (config && Object.keys(config).length > 0) {
      const currentConfig = JSON.parse(JSON.stringify(config));

      // [TEMPORARY FIX] Auto-remove 'te' branch if exists
      if (currentConfig.BRANCHES && currentConfig.BRANCHES.some(b => b.id === 'te')) {
        currentConfig.BRANCHES = currentConfig.BRANCHES.filter(b => b.id !== 'te');
        updateConfig({
          BRANCHES: currentConfig.BRANCHES
        }).then(() => {
          console.log("'te' branch auto-removed.");
        });
      }
      setLocalConfig(currentConfig);
    }
  }, [config]);
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Firestore는 undefined 값을 거부 — JSON 순환으로 정리
      const cleanConfig = JSON.parse(JSON.stringify(localConfig));
      await updateConfig(cleanConfig);

      // [Registry 동기화] 슈퍼어드민 화면 관제탑에 로고 즉시 보고
      if (cleanConfig.IDENTITY?.LOGO_URL) {
        try {
          const sid = getCurrentStudioId();
          await updateDoc(doc(db, 'platform/registry/studios', sid), {
            logoUrl: cleanConfig.IDENTITY.LOGO_URL
          });
        } catch (e) {
          console.log('Registry sync skipped', e);
        }
      }
      alert(t("g_a7a03e") || t("g_a7a03e") || t("g_a7a03e") || t("g_a7a03e") || t("g_a7a03e") || "\uC124\uC815\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`설정 저장 실패: ${error.message || t("g_053d5f") || t("g_053d5f") || t("g_053d5f") || t("g_053d5f") || t("g_053d5f") || "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"}`);
    } finally {
      setIsSaving(false);
    }
  };
  const handleChange = (path, value) => {
    const newConfig = {
      ...localConfig
    };
    const parts = path.split('.');
    let current = newConfig;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    setLocalConfig(newConfig);
  };
  if (loading && !localConfig.IDENTITY) return <div style={{
    padding: '40px',
    textAlign: 'center'
  }}>{t('설정 로드 중...')}</div>;

  // 재사용: 토글 스위치 컴포넌트
  const ToggleSwitch = ({
    checked,
    onChange
  }) => <label style={{
    position: 'relative',
    display: 'inline-block',
    width: '50px',
    height: '26px',
    cursor: 'pointer',
    flexShrink: 0
  }}>
            <input type="checkbox" checked={checked} onChange={onChange} style={{
      opacity: 0,
      width: 0,
      height: 0
    }} />
            <span style={{
      position: 'absolute',
      cursor: 'pointer',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: checked ? 'var(--primary-theme-color)' : 'rgba(255,255,255,0.1)',
      transition: '0.3s',
      borderRadius: '26px',
      border: `1px solid ${checked ? 'var(--primary-theme-color)' : 'rgba(255,255,255,0.2)'}`
    }}>
                <span style={{
        position: 'absolute',
        height: '20px',
        width: '20px',
        left: checked ? '26px' : '3px',
        bottom: '2px',
        backgroundColor: 'white',
        transition: '0.3s',
        borderRadius: '50%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }} />
            </span>
        </label>;

  // 재사용: ＋/－ 스텝퍼 컴포넌트
  const Stepper = ({
    value,
    onChange,
    min = 1,
    unit = ''
  }) => <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }}>
            <button onClick={() => onChange(Math.max(min, value - 1))} style={{
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.15)',
      background: 'rgba(255,255,255,0.05)',
      color: 'white',
      fontSize: '1.1rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>−</button>
            <span style={{
      minWidth: '28px',
      textAlign: 'center',
      fontSize: '1rem',
      fontWeight: 'bold',
      color: 'white'
    }}>{value}</span>
            <button onClick={() => onChange(value + 1)} style={{
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.15)',
      background: 'rgba(255,255,255,0.05)',
      color: 'white',
      fontSize: '1.1rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>+</button>
            {unit && <span style={{
      fontSize: '0.75rem',
      color: 'var(--text-tertiary)'
    }}>{unit}</span>}
        </div>;

  // 재사용: 기능 카드 스타일 (홀딩/예약 공통)
  const featureCardStyle = {
    marginTop: '16px',
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid var(--border-color)'
  };
  const featureHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  };
  const bookingRules = localConfig.POLICIES?.BOOKING_RULES || {};
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    maxWidth: '900px',
    margin: '0 auto'
  }}>
            <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
                <h2 style={{
        fontSize: '1.5rem',
        fontWeight: '800',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
                    <Gear size={32} weight="fill" color="var(--primary-theme-color)" />
                    {t('우리 스튜디오 설정')}
                </h2>
                <div style={{
        display: 'flex',
        gap: '10px'
      }}>
                    <button onClick={refreshConfig} className="action-btn sm" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255,255,255,0.05)',
          color: 'var(--text-secondary)',
          border: 'none'
        }}>
                        <ArrowsClockwise size={16} /> {t('새로고침')}
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="action-btn sm primary" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--primary-theme-color)',
          color: 'var(--text-on-primary)',
          padding: '8px 20px',
          fontWeight: 'bold',
          boxShadow: '0 4px 15px var(--primary-theme-skeleton)'
        }}>
                        <FloppyDisk size={20} weight="bold" /> {isSaving ? t("g_923cf9") || t("g_923cf9") || t("g_923cf9") || t("g_923cf9") || t("g_923cf9") || "\uC800\uC7A5 \uC911..." : t("g_94fe17") || t("g_94fe17") || t("g_94fe17") || t("g_94fe17") || t("g_94fe17") || "\uBCC0\uACBD\uC0AC\uD56D \uC800\uC7A5"}
                    </button>
                </div>
            </div>

            {/* ─── 1. 우리 요가원 ─── */}
            <div className="dashboard-card">
                <h3 className="card-label" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '20px'
      }}>
                    {t('🏠 우리 스튜디오')}
                </h3>

                {/* 로고 업로드 */}
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '24px',
        padding: '16px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
                    <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid var(--primary-gold)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.3)'
        }}>
                        {localConfig.IDENTITY?.LOGO_URL ? <img src={localConfig.IDENTITY.LOGO_URL} alt={t('로고')} style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }} /> : <ImageIcon size={32} color="white" />}
                    </div>
                    <div style={{
          flex: 1
        }}>
                        <div style={{
            fontWeight: 'bold',
            color: 'var(--text-primary)',
            marginBottom: '6px',
            fontSize: '0.95rem'
          }}>{t('스튜디오 로고')}</div>
                        <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
            marginBottom: '10px'
          }}>{t('회원 앱과 알림에 표시돼요')}</div>
                        <input ref={logoInputRef} type="file" accept="image/*" style={{
            display: 'none'
          }} onChange={async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              alert(t("g_d8837c") || t("g_d8837c") || t("g_d8837c") || t("g_d8837c") || t("g_d8837c") || "\uD30C\uC77C \uD06C\uAE30\uB294 2MB \uC774\uD558\uC5EC\uC57C \uD569\uB2C8\uB2E4.");
              return;
            }
            setLogoUploading(true);
            try {
              const logoRef = ref(storage, tenantStoragePath(`logo_${Date.now()}.${file.name.split('.').pop()}`));
              await uploadBytes(logoRef, file, {
                contentType: file.type
              });
              const url = await getDownloadURL(logoRef);
              handleChange('IDENTITY.LOGO_URL', url);
              alert(t("g_3069d4") || t("g_3069d4") || t("g_3069d4") || t("g_3069d4") || t("g_3069d4") || "\uB85C\uACE0\uAC00 \uC5C5\uB85C\uB4DC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC800\uC7A5 \uBC84\uD2BC\uC744 \uB20C\uB7EC \uC801\uC6A9\uD558\uC138\uC694.");
            } catch (err) {
              console.error('[Settings] Logo upload error:', err);
              alert((t("g_d53a3f") || t("g_d53a3f") || t("g_d53a3f") || t("g_d53a3f") || t("g_d53a3f") || "\uB85C\uACE0 \uC5C5\uB85C\uB4DC \uC2E4\uD328: ") + err.message);
            } finally {
              setLogoUploading(false);
            }
          }} />
                        <button onClick={() => logoInputRef.current?.click()} disabled={logoUploading} className="action-btn sm" style={{
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            fontSize: '0.8rem'
          }}>
                            <ImageIcon size={14} weight="bold" style={{
              marginRight: '4px'
            }} />
                            {logoUploading ? t("g_0a4de7") || t("g_0a4de7") || t("g_0a4de7") || t("g_0a4de7") || t("g_0a4de7") || "\uC5C5\uB85C\uB4DC \uC911..." : t("g_5f76bd") || t("g_5f76bd") || t("g_5f76bd") || t("g_5f76bd") || t("g_5f76bd") || "\uB85C\uACE0 \uBCC0\uACBD"}
                        </button>
                    </div>
                </div>

                {/* 기본 정보 */}
                <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px'
      }}>
                    <div className="input-group">
                        <label>{t('스튜디오 이름')}</label>
                        <input type="text" className="styled-input" value={localConfig.IDENTITY?.NAME || ''} onChange={e => handleChange('IDENTITY.NAME', e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>{t('한 줄 소개')}</label>
                        <input type="text" className="styled-input" value={localConfig.IDENTITY?.SLOGAN || ''} onChange={e => handleChange('IDENTITY.SLOGAN', e.target.value)} />
                    </div>
                    <div className="input-group" style={{
          gridColumn: '1 / -1'
        }}>
                        <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '12px'
          }}>
                            <Globe size={14} /> {t('외부 링크 관리 (SNS, 블로그 등)')}
                        </label>
                        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
                            {(localConfig.IDENTITY?.SOCIAL_LINKS || []).map((link, idx) => <div key={idx} style={{
              display: 'flex',
              gap: '10px'
            }}>
                                    <input type="text" placeholder={t('이름 (예: 인스타그램)')} className="styled-input" style={{
                flex: 1,
                minWidth: '120px'
              }} value={link.label || ''} onChange={e => {
                const newLinks = [...(localConfig.IDENTITY.SOCIAL_LINKS || [])];
                newLinks[idx] = {
                  ...newLinks[idx],
                  label: e.target.value
                };
                handleChange('IDENTITY.SOCIAL_LINKS', newLinks);
              }} />
                                    <input type="url" placeholder="URL (https://...)" className="styled-input" style={{
                flex: 2
              }} value={link.url || ''} onChange={e => {
                const newLinks = [...(localConfig.IDENTITY.SOCIAL_LINKS || [])];
                newLinks[idx] = {
                  ...newLinks[idx],
                  url: e.target.value
                };
                handleChange('IDENTITY.SOCIAL_LINKS', newLinks);
              }} />
                                    <button className="action-btn sm" style={{
                background: 'rgba(255,100,100,0.1)',
                color: '#ff6666',
                border: '1px solid rgba(255,100,100,0.2)'
              }} onClick={() => {
                const newLinks = [...(localConfig.IDENTITY.SOCIAL_LINKS || [])];
                newLinks.splice(idx, 1);
                handleChange('IDENTITY.SOCIAL_LINKS', newLinks);
              }}>
                                        {t('삭제')}
                                    </button>
                                </div>)}
                            <button className="action-btn sm" style={{
              alignSelf: 'flex-start',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-secondary)',
              border: '1px dashed var(--border-color)',
              marginTop: '4px'
            }} onClick={() => {
              const newLinks = [...(localConfig.IDENTITY?.SOCIAL_LINKS || []), {
                label: '',
                url: ''
              }];
              handleChange('IDENTITY.SOCIAL_LINKS', newLinks);
            }}>
                                {t('+ 링크 추가')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── 2. 운영 규칙 ─── */}
            <div className="dashboard-card">
                <h3 className="card-label" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '20px'
      }}>
                    {t('📋 운영 규칙')}
                </h3>

                {/* ── 2-1. 회원 홀딩 ── */}
                <div style={featureCardStyle}>
                    <div style={featureHeaderStyle}>
                        <div>
                            <div style={{
              fontWeight: 'bold',
              fontSize: '0.95rem',
              color: 'var(--text-primary)',
              marginBottom: '4px'
            }}>{t('⏸️ 회원 홀딩 (일시정지)')}</div>
                            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)'
            }}>{t('회원이 앱에서 수강권을 일시정지할 수 있습니다')}</div>
                        </div>
                        <ToggleSwitch checked={localConfig.POLICIES?.ALLOW_SELF_HOLD || false} onChange={e => handleChange('POLICIES.ALLOW_SELF_HOLD', e.target.checked)} />
                    </div>

                    {localConfig.POLICIES?.ALLOW_SELF_HOLD && <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
                            <div style={{
            fontSize: '0.8rem',
            fontWeight: 'bold',
            color: 'var(--text-secondary)',
            marginBottom: '4px'
          }}>{t('홀딩 규칙 (수강권별)')}</div>
                            {(localConfig.POLICIES?.HOLD_RULES || []).map((rule, rIdx) => <div key={rIdx} style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.03)',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap'
          }}>
                                    <div style={{
              flex: 1,
              minWidth: '90px'
            }}>
                                        <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t('수강 기간')}</div>
                                        <Stepper value={rule.durationMonths || 1} onChange={v => {
                const rules = [...(localConfig.POLICIES?.HOLD_RULES || [])];
                rules[rIdx] = {
                  ...rules[rIdx],
                  durationMonths: v
                };
                handleChange('POLICIES.HOLD_RULES', rules);
              }} unit={t('개월')} />
                                    </div>
                                    <div style={{
              flex: 1,
              minWidth: '90px'
            }}>
                                        <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t('최대 횟수')}</div>
                                        <Stepper value={rule.maxCount || 1} onChange={v => {
                const rules = [...(localConfig.POLICIES?.HOLD_RULES || [])];
                rules[rIdx] = {
                  ...rules[rIdx],
                  maxCount: v
                };
                handleChange('POLICIES.HOLD_RULES', rules);
              }} unit={t('회')} />
                                    </div>
                                    <div style={{
              flex: 1,
              minWidth: '90px'
            }}>
                                        <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t('1회 최대')}</div>
                                        <Stepper value={rule.maxWeeks || 1} onChange={v => {
                const rules = [...(localConfig.POLICIES?.HOLD_RULES || [])];
                rules[rIdx] = {
                  ...rules[rIdx],
                  maxWeeks: v
                };
                handleChange('POLICIES.HOLD_RULES', rules);
              }} unit={t('주')} />
                                    </div>
                                    <button onClick={() => {
              const rules = [...(localConfig.POLICIES?.HOLD_RULES || [])];
              rules.splice(rIdx, 1);
              handleChange('POLICIES.HOLD_RULES', rules);
            }} style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '1.1rem',
              padding: '4px 8px',
              alignSelf: 'flex-start',
              marginTop: '16px'
            }} title={t('삭제')}>✕</button>
                                </div>)}
                            <button className="action-btn sm" style={{
            alignSelf: 'flex-start',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-secondary)',
            border: '1px dashed var(--border-color)',
            fontSize: '0.8rem'
          }} onClick={() => {
            const rules = [...(localConfig.POLICIES?.HOLD_RULES || []), {
              durationMonths: 3,
              maxCount: 1,
              maxWeeks: 2
            }];
            handleChange('POLICIES.HOLD_RULES', rules);
          }}>{t('+ 규칙 추가')}</button>
                        </div>}
                </div>

                {/* ── 2-2. 수강 방식 (Credit Policy) ── */}
                <div style={featureCardStyle}>
                    <div style={featureHeaderStyle}>
                        <div>
                            <div style={{
              fontWeight: 'bold',
              fontSize: '0.95rem',
              color: 'var(--text-primary)',
              marginBottom: '4px'
            }}>{t('🔢 수강 횟수 관리 방식')}</div>
                            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)'
            }}>{t('회원의 수강 횟수를 전체 기간/주간/일간 단위로 관리합니다')}</div>
                        </div>
                    </div>

                    <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
                        {/* 모드 선택 */}
                        <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
                            {[{
              value: 'total',
              label: t("g_1e62f2") || t("g_1e62f2") || t("g_1e62f2") || t("g_1e62f2") || t("g_1e62f2") || "\uC804\uCCB4 \uAE30\uAC04",
              desc: t("g_12d88c") || t("g_12d88c") || t("g_12d88c") || t("g_12d88c") || t("g_12d88c") || "\uB4F1\uB85D \uAE30\uAC04 \uB0B4 \uC790\uC720\uB86D\uAC8C \uC0AC\uC6A9",
              icon: '📊'
            }, {
              value: 'weekly',
              label: t("g_d8654b") || t("g_d8654b") || t("g_d8654b") || t("g_d8654b") || t("g_d8654b") || "\uC8FC\uAC04 \uB2E8\uC704",
              desc: t("g_e486be") || t("g_e486be") || t("g_e486be") || t("g_e486be") || t("g_e486be") || "\uC8FC N\uD68C \uC81C\uD55C (\uC608: \uC8FC 3\uD68C)",
              icon: '📅'
            }].map(opt => <button key={opt.value} onClick={() => handleChange('POLICIES.CREDIT_RULES', {
              ...(localConfig.POLICIES?.CREDIT_RULES || {}),
              mode: opt.value
            })} style={{
              flex: 1,
              minWidth: '150px',
              padding: '16px 14px',
              borderRadius: '10px',
              cursor: 'pointer',
              textAlign: 'left',
              border: `2px solid ${(localConfig.POLICIES?.CREDIT_RULES?.mode || 'total') === opt.value ? 'var(--primary-theme-color)' : 'rgba(255,255,255,0.08)'}`,
              background: (localConfig.POLICIES?.CREDIT_RULES?.mode || 'total') === opt.value ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s'
            }}>
                                    <div style={{
                fontSize: '1.2rem',
                marginBottom: '6px'
              }}>{opt.icon}</div>
                                    <div style={{
                fontWeight: 'bold',
                fontSize: '0.9rem',
                color: (localConfig.POLICIES?.CREDIT_RULES?.mode || 'total') === opt.value ? 'var(--primary-theme-color)' : 'var(--text-primary)',
                marginBottom: '4px'
              }}>{opt.label}</div>
                                    <div style={{
                fontSize: '0.7rem',
                color: 'var(--text-tertiary)'
              }}>{opt.desc}</div>
                                </button>)}
                        </div>

                        {/* 주간 모드 세부 설정 */}
                        {localConfig.POLICIES?.CREDIT_RULES?.mode === 'weekly' && <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
            background: 'rgba(255,255,255,0.03)',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap'
          }}>
                                <div style={{
              flex: 1,
              minWidth: '140px'
            }}>
                                    <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t('주간 리셋 요일')}</div>
                                    <select value={localConfig.POLICIES?.CREDIT_RULES?.weeklyResetDay ?? 1} onChange={e => handleChange('POLICIES.CREDIT_RULES', {
                ...(localConfig.POLICIES?.CREDIT_RULES || {}),
                weeklyResetDay: parseInt(e.target.value)
              })} className="styled-input" style={{
                padding: '6px 10px',
                fontSize: '0.85rem',
                maxWidth: '120px'
              }}>
                                        <option value={1}>{t('월요일')}</option>
                                        <option value={2}>{t('화요일')}</option>
                                        <option value={3}>{t('수요일')}</option>
                                        <option value={4}>{t('목요일')}</option>
                                        <option value={5}>{t('금요일')}</option>
                                        <option value={6}>{t('토요일')}</option>
                                        <option value={0}>{t('일요일')}</option>
                                    </select>
                                </div>
                                <div style={{
              flex: 1,
              minWidth: '140px'
            }}>
                                    <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t('주간 한도 기준')}</div>
                                    <select value={localConfig.POLICIES?.CREDIT_RULES?.weeklyLimitSource || 'plan'} onChange={e => handleChange('POLICIES.CREDIT_RULES', {
                ...(localConfig.POLICIES?.CREDIT_RULES || {}),
                weeklyLimitSource: e.target.value
              })} className="styled-input" style={{
                padding: '6px 10px',
                fontSize: '0.85rem',
                maxWidth: '160px'
              }}>
                                        <option value="plan">{t('요금제 자동 계산')}</option>
                                        <option value="member">{t('회원별 수동 설정')}</option>
                                    </select>
                                </div>
                            </div>}


                        {/* 안내 메시지 */}
                        <div style={{
            fontSize: '0.72rem',
            color: 'var(--text-tertiary)',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
                            💡 {(localConfig.POLICIES?.CREDIT_RULES?.mode || 'total') === 'total' ? t("g_a28bb6") || t("g_a28bb6") || t("g_a28bb6") || t("g_a28bb6") || t("g_a28bb6") || "\uD604\uC7AC \uBC29\uC2DD: \uB4F1\uB85D\uB41C \uCD1D \uD69F\uC218\uC5D0\uC11C \uCD9C\uC11D\uD560 \uB54C\uB9C8\uB2E4 1\uD68C\uC529 \uCC28\uAC10\uB429\uB2C8\uB2E4." : t("g_5dead3") || t("g_5dead3") || t("g_5dead3") || t("g_5dead3") || t("g_5dead3") || "\uC8FC\uAC04 \uBC29\uC2DD: \uC694\uAE08\uC81C\uC758 \uC8FC\uB2F9 \uD69F\uC218(\uC608: \uC6D4 12\uD68C \u2192 \uC8FC 3\uD68C)\uB97C \uCD08\uACFC\uD558\uBA74 \uCD9C\uC11D\uC774 \uC81C\uD55C\uB429\uB2C8\uB2E4. \uCD1D \uC794\uC5EC \uD69F\uC218\uB3C4 \uD568\uAED8 \uCC28\uAC10\uB429\uB2C8\uB2E4."}
                        </div>
                    </div>
                </div>
                <div style={featureCardStyle}>
                    <div style={featureHeaderStyle}>
                        <div>
                            <div style={{
              fontWeight: 'bold',
              fontSize: '0.95rem',
              color: 'var(--text-primary)',
              marginBottom: '4px'
            }}>{t('📅 수업 예약')}</div>
                            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)'
            }}>{t('회원이 앱에서 수업을 미리 예약할 수 있습니다')}</div>
                        </div>
                        <ToggleSwitch checked={localConfig.POLICIES?.ALLOW_BOOKING || false} onChange={e => handleChange('POLICIES.ALLOW_BOOKING', e.target.checked)} />
                    </div>

                    {localConfig.POLICIES?.ALLOW_BOOKING && <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
                            {/* 예약 없이 직접 출석 안내 */}
                            <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
                                {t('💡 예약 기능을 켜도, 예약 없이 직접 오는 회원은 기존처럼 출석 가능합니다. 다만 정원이 찬 수업은 워크인이 제한될 수 있습니다.')}
                            </div>

                            {/* 정원 */}
                            <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
            background: 'rgba(255,255,255,0.03)',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap'
          }}>
                                <div style={{
              flex: 1,
              minWidth: '140px'
            }}>
                                    <div style={{
                fontSize: '0.8rem',
                fontWeight: 'bold',
                color: 'var(--text-secondary)',
                marginBottom: '4px'
              }}>{t('수업당 최대 인원')}</div>
                                    <div style={{
                fontSize: '0.7rem',
                color: 'var(--text-tertiary)',
                marginBottom: '8px'
              }}>{t('시간표에서 수업별로 따로 정할 수도 있습니다')}</div>
                                    {(localConfig.BRANCHES?.length || 0) >= 2 ? <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                                            <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                                                <span style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-tertiary)',
                    minWidth: '50px'
                  }}>{t('기본값')}</span>
                                                <Stepper value={bookingRules.defaultCapacity || 15} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                    ...bookingRules,
                    defaultCapacity: v
                  })} unit={t('명')} />
                                            </div>
                                            {localConfig.BRANCHES.map(branch => <div key={branch.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                                                    <span style={{
                    fontSize: '0.7rem',
                    color: 'var(--primary-theme-color)',
                    minWidth: '50px',
                    fontWeight: 'bold'
                  }}>{branch.name}</span>
                                                    <Stepper value={(bookingRules.branchCapacity || {})[branch.id] || bookingRules.defaultCapacity || 15} onChange={v => {
                    const bc = {
                      ...(bookingRules.branchCapacity || {})
                    };
                    bc[branch.id] = v;
                    handleChange('POLICIES.BOOKING_RULES', {
                      ...bookingRules,
                      branchCapacity: bc
                    });
                  }} unit={t('명')} />
                                                </div>)}
                                        </div> : <Stepper value={bookingRules.defaultCapacity || 15} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                ...bookingRules,
                defaultCapacity: v
              })} unit={t('명')} />}
                                </div>
                            </div>

                            {/* 예약 시간 규칙 */}
                            <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
            background: 'rgba(255,255,255,0.03)',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap'
          }}>
                                <div style={{
              flex: 1,
              minWidth: '120px'
            }}>
                                    <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t('예약 가능 기간')}</div>
                                    <Stepper value={bookingRules.windowDays || 7} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                ...bookingRules,
                windowDays: v
              })} unit={t('일 전부터')} />
                                </div>
                                <div style={{
              flex: 1,
              minWidth: '120px'
            }}>
                                    <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t('예약 마감')}</div>
                                    <Stepper value={bookingRules.deadlineHours || 1} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                ...bookingRules,
                deadlineHours: v
              })} unit={t('시간 전')} />
                                </div>
                                <div style={{
              flex: 1,
              minWidth: '120px'
            }}>
                                    <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t('취소 마감')}</div>
                                    <Stepper value={bookingRules.cancelDeadlineHours || 3} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                ...bookingRules,
                cancelDeadlineHours: v
              })} unit={t('시간 전')} />
                                </div>
                            </div>

                            {/* 예약 제한 */}
                            <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
            background: 'rgba(255,255,255,0.03)',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap'
          }}>
                                <div style={{
              flex: 1,
              minWidth: '120px'
            }}>
                                    <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t('동시 예약 한도')}</div>
                                    <Stepper value={bookingRules.maxActiveBookings || 3} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                ...bookingRules,
                maxActiveBookings: v
              })} unit={t('건')} />
                                </div>
                                <div style={{
              flex: 1,
              minWidth: '120px'
            }}>
                                    <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t('하루 최대 예약')}</div>
                                    <Stepper value={bookingRules.maxDailyBookings || 2} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                ...bookingRules,
                maxDailyBookings: v
              })} unit={t('건')} />
                                </div>
                            </div>

                            {/* 노쇼 규칙 */}
                            <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
            background: 'rgba(255,255,255,0.03)',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap'
          }}>
                                <div style={{
              flex: 1,
              minWidth: '140px'
            }}>
                                    <div style={{
                fontSize: '0.8rem',
                fontWeight: 'bold',
                color: 'var(--text-secondary)',
                marginBottom: '8px'
              }}>{t('노쇼 (예약 후 미출석)')}</div>
                                    <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t('미출석 시 횟수 차감')}</div>
                                    <Stepper value={bookingRules.noshowCreditDeduct || 1} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                ...bookingRules,
                noshowCreditDeduct: v
              })} min={0} unit={t('회 차감')} />
                                </div>
                            </div>

                            {/* 대기열 */}
                            <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.03)',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
                                <div>
                                    <div style={{
                fontSize: '0.8rem',
                fontWeight: 'bold',
                color: 'var(--text-secondary)',
                marginBottom: '4px'
              }}>{t('대기열')}</div>
                                    <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)'
              }}>{t('정원 초과 시 대기 → 취소 발생 시 자동 예약 + 알림')}</div>
                                </div>
                                <ToggleSwitch checked={bookingRules.enableWaitlist !== false} onChange={e => handleChange('POLICIES.BOOKING_RULES', {
              ...bookingRules,
              enableWaitlist: e.target.checked
            })} />
                            </div>
                        </div>}
                </div>

                {/* ── 2-3. 출석 화면 카메라 ── */}
                <div style={featureCardStyle}>
                    <div style={featureHeaderStyle}>
                        <div>
                            <div style={{
              fontWeight: 'bold',
              fontSize: '0.95rem',
              color: 'var(--text-primary)',
              marginBottom: '4px'
            }}>{t('📷 출석 화면 카메라')}</div>
                            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)'
            }}>{t('출석체크 화면에 카메라 영상을 표시합니다')}</div>
                        </div>
                        <ToggleSwitch checked={localConfig.POLICIES?.SHOW_CAMERA_PREVIEW || false} onChange={e => handleChange('POLICIES.SHOW_CAMERA_PREVIEW', e.target.checked)} />
                    </div>

                    {/* 하위 옵션: 카메라 크기 + 안면인식 (카메라 ON일 때만 표시) */}
                    {localConfig.POLICIES?.SHOW_CAMERA_PREVIEW && <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          paddingLeft: '20px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
                            {/* 카메라 크기 */}
                            <div style={featureHeaderStyle}>
                                <div>
                                    <div style={{
                fontWeight: 'bold',
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}>{t('📐 프리뷰 크기')}</div>
                                    <div style={{
                fontSize: '0.72rem',
                color: 'var(--text-tertiary)'
              }}>
                                        {(localConfig.POLICIES?.CAMERA_SIZE || 'large') === 'large' ? t("g_7fc733") || t("g_7fc733") || t("g_7fc733") || t("g_7fc733") || t("g_7fc733") || "\uB85C\uACE0 \uC544\uB798 \uD070 \uD504\uB9AC\uBDF0" : t("g_f2a964") || t("g_f2a964") || t("g_f2a964") || t("g_f2a964") || t("g_f2a964") || "QR \uCF54\uB4DC \uC606 \uC791\uC740 \uD504\uB9AC\uBDF0"}
                                    </div>
                                </div>
                                <div style={{
              display: 'flex',
              gap: '4px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              padding: '2px'
            }}>
                                    {['large', 'small'].map(size => <button key={size} onClick={() => handleChange('POLICIES.CAMERA_SIZE', size)} style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                transition: 'all 0.2s',
                background: (localConfig.POLICIES?.CAMERA_SIZE || 'large') === size ? 'var(--primary-gold)' : 'transparent',
                color: (localConfig.POLICIES?.CAMERA_SIZE || 'large') === size ? 'black' : 'var(--text-tertiary)'
              }}>{size === 'large' ? t("g_49f9df") || t("g_49f9df") || t("g_49f9df") || t("g_49f9df") || t("g_49f9df") || "\uD06C\uAC8C" : t("g_f10e03") || t("g_f10e03") || t("g_f10e03") || t("g_f10e03") || t("g_f10e03") || "\uC791\uAC8C"}</button>)}
                                </div>
                            </div>
                            {/* 안면인식 자동 출석 */}
                            <div style={featureHeaderStyle}>
                                <div>
                                    <div style={{
                fontWeight: 'bold',
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}>{t('🧠 안면인식 자동 출석')}</div>
                                    <div style={{
                fontSize: '0.72rem',
                color: 'var(--text-tertiary)'
              }}>{t('등록된 회원의 얼굴을 인식하면 자동으로 출석 처리합니다')}</div>
                                </div>
                                <ToggleSwitch checked={localConfig.POLICIES?.FACE_RECOGNITION_ENABLED || false} onChange={e => handleChange('POLICIES.FACE_RECOGNITION_ENABLED', e.target.checked)} />
                            </div>
                        </div>}
                </div>
            </div>

            {/* ─── 3. 지점 관리 (다중 지점일 때만 노출) ─── */}
            {localConfig.BRANCHES?.length > 1 && <div className="dashboard-card">
                    <h3 className="card-label" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '20px'
      }}>
                        <MapPin size={20} weight="fill" color="var(--primary-theme-color)" /> {t('지점 관리')}
                    </h3>
                    <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
                        {localConfig.BRANCHES?.map((branch, index) => <div key={branch.id} style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.03)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
                                <div style={{
            flex: 1
          }}>
                                    <input type="text" className="styled-input sm" style={{
              background: 'none',
              border: 'none',
              fontWeight: 'bold',
              padding: '4px 0',
              color: 'var(--text-primary)'
            }} value={branch.name} onChange={e => {
              const newBranches = [...localConfig.BRANCHES];
              newBranches[index].name = e.target.value;
              handleChange('BRANCHES', newBranches);
            }} />
                                </div>
                                {localConfig.BRANCHES.length > 2 && <button className="action-btn sm" style={{
            background: 'rgba(239,68,68,0.1)',
            color: '#EF4444',
            border: '1px solid rgba(239,68,68,0.3)',
            fontSize: '0.75rem'
          }} onClick={() => {
            if (window.confirm(`"${branch.name}" 지점을 삭제하시겠습니까?\n\n⚠️ 주의: 해당 지점에 등록된 회원의 출석/매출/시간표 기록에서 지점 정보가 사라질 수 있습니다.\n\n이 작업은 되돌릴 수 없습니다.`)) {
              const newBranches = localConfig.BRANCHES.filter((_, i) => i !== index);
              handleChange('BRANCHES', newBranches);
            }
          }}>
                                        {t('삭제')}
                                    </button>}
                            </div>)}
                        <button className="action-btn sm" style={{
          alignSelf: 'flex-start',
          background: 'rgba(255,255,255,0.05)',
          color: 'var(--text-secondary)',
          border: '1px dashed var(--border-color)'
        }} onClick={() => {
          const name = prompt(t("g_e9f13e") || t("g_e9f13e") || t("g_e9f13e") || t("g_e9f13e") || t("g_e9f13e") || "\uC0C8 \uC9C0\uC810 \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694:");
          if (name) {
            const id = name.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase() || `branch_${Date.now()}`;
            const autoId = id.replace(/[가-힣]+/g, () => `branch_${Date.now()}`);
            const finalId = /^[a-z]/.test(autoId) ? autoId : `branch_${Date.now()}`;
            const newBranches = [...(localConfig.BRANCHES || []), {
              id: finalId,
              name,
              color: 'var(--primary-gold)'
            }];
            handleChange('BRANCHES', newBranches);
          }
        }}>
                            {t('+ 지점 추가')}
                        </button>
                    </div>
                    {/* ⚠️ 지점 관리 주의사항 */}
                    <div style={{
        marginTop: '16px',
        padding: '12px 14px',
        borderRadius: '10px',
        background: 'rgba(245, 158, 11, 0.06)',
        border: '1px solid rgba(245, 158, 11, 0.15)',
        fontSize: '0.78rem',
        color: '#a1a1aa',
        lineHeight: '1.6'
      }}>
                        <div style={{
          fontWeight: '700',
          color: '#F59E0B',
          marginBottom: '6px',
          fontSize: '0.8rem'
        }}>
                            {t('⚠️ 지점 관리 주의사항')}
                        </div>
                        <div>{t('• 지점을 삭제하면, 해당 지점의 출석/매출/시간표 기록에서 지점 정보가 사라질 수 있습니다.')}</div>
                        <div>{t('• 기존 회원의 소속 지점이 삭제된 경우, "전체" 보기에는 포함되지만 지점별 필터링이 불가합니다.')}</div>
                    </div>
                </div>}
            



            {/* ━━━━━━━━━━ 앱 URL 및 QR 코드 ━━━━━━━━━━ */}
            <div className="dashboard-card" style={{
      marginTop: '24px'
    }}>
                <h3 className="card-label" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '20px'
      }}>
                    <Globe size={24} weight="fill" color="var(--primary-gold)" />
                    {t('앱 URL 및 QR 코드')}
                </h3>
                <p style={{
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        marginBottom: '20px'
      }}>
                    {t('각 앱의 URL을 복사하거나 QR 코드를 공유할 수 있습니다.')}
                </p>
                <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
                    {[{
          label: t("g_7ea89f") || t("g_7ea89f") || t("g_7ea89f") || t("g_7ea89f") || t("g_7ea89f") || "\uAD00\uB9AC\uC790\uC571",
          path: '/admin',
          icon: '⚙️',
          desc: t("g_0498a8") || t("g_0498a8") || t("g_0498a8") || t("g_0498a8") || t("g_0498a8") || "\uC2A4\uD29C\uB514\uC624 \uAD00\uB9AC"
        }, {
          label: t("g_9fe899") || t("g_9fe899") || t("g_9fe899") || t("g_9fe899") || t("g_9fe899") || "\uAC15\uC0AC\uC571",
          path: '/instructor',
          icon: '🧘',
          desc: t("g_84cc80") || t("g_84cc80") || t("g_84cc80") || t("g_84cc80") || t("g_84cc80") || "\uCD9C\uC11D \uD655\uC778 & \uC77C\uC815"
        }, {
          label: t("g_1943ed") || t("g_1943ed") || t("g_1943ed") || t("g_1943ed") || t("g_1943ed") || "\uD68C\uC6D0\uC571",
          path: '/member',
          icon: '📱',
          desc: t("g_7c29ca") || t("g_7c29ca") || t("g_7c29ca") || t("g_7c29ca") || t("g_7c29ca") || "\uCD9C\uC11D & \uC218\uC5C5 \uC815\uBCF4"
        }, {
          label: t("g_5bccb5") || t("g_5bccb5") || t("g_5bccb5") || t("g_5bccb5") || t("g_5bccb5") || "\uCD9C\uC11D\uCCB4\uD06C\uC571",
          path: '/checkin',
          icon: '✅',
          desc: t("g_064937") || t("g_064937") || t("g_064937") || t("g_064937") || t("g_064937") || "\uD0A4\uC624\uC2A4\uD06C/\uD0DC\uBE14\uB9BF"
        }].map(app => {
          const sid = getCurrentStudioId();
          // [SaaS] 스튜디오별 전용 도메인 매핑 — 올바른 URL 생성
          const studioOriginMap = {
            'boksaem-yoga': 'https://boksaem-yoga.web.app',
            'demo-yoga': 'https://passflowai.web.app',
            'ssangmun-yoga': 'https://ssangmunyoga.web.app'
          };
          const origin = studioOriginMap[sid] || 'https://passflowai.web.app';
          const needsParam = !studioOriginMap[sid]; // 전용 도메인 없으면 ?studio= 필요
          const fullUrl = needsParam ? `${origin}${app.path}?studio=${sid}` : `${origin}${app.path}`;
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&format=png&data=${encodeURIComponent(fullUrl)}`;
          return <div key={app.path} style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            textAlign: 'center'
          }}>
                                <div style={{
              fontSize: '2rem'
            }}>{app.icon}</div>
                                <div>
                                    <div style={{
                fontWeight: 'bold',
                fontSize: '1.1rem',
                marginBottom: '4px'
              }}>{app.label}</div>
                                    <div style={{
                fontSize: '0.8rem',
                color: 'var(--text-tertiary)'
              }}>{app.desc}</div>
                                </div>
                                <div style={{
              background: 'white',
              padding: '8px',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }} onClick={() => window.open(fullUrl, '_blank')} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} title={t('클릭하여 새 탭에서 열기')}>
                                    <img src={qrUrl} alt={`${app.label} QR`} style={{
                width: '120px',
                height: '120px',
                display: 'block'
              }} />
                                </div>
                                <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)',
              wordBreak: 'break-all',
              background: 'rgba(0,0,0,0.2)',
              padding: '8px 12px',
              borderRadius: '8px',
              width: '100%'
            }}>
                                    {fullUrl}
                                </div>
                                <button onClick={() => {
              navigator.clipboard.writeText(fullUrl);
              const btn = document.getElementById(`copy-btn-${app.path}`);
              if (btn) {
                btn.textContent = t("g_d6557c") || t("g_d6557c") || t("g_d6557c") || t("g_d6557c") || t("g_d6557c") || "\u2713 \uBCF5\uC0AC\uB428!";
                setTimeout(() => {
                  btn.textContent = t("g_290145") || t("g_290145") || t("g_290145") || t("g_290145") || t("g_290145") || "URL \uBCF5\uC0AC";
                }, 2000);
              }
            }} id={`copy-btn-${app.path}`} style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              background: 'var(--primary-gold)',
              color: 'var(--text-on-primary)',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}>{t('URL 복사')}</button>
                            </div>;
        })}
                </div>
            </div>

            {/* 개인정보처리방침 */}
            <div style={{
      textAlign: 'center',
      padding: '20px 0'
    }}>
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{
        fontSize: '0.8rem',
        color: 'var(--text-tertiary)',
        textDecoration: 'none'
      }}>
                    {t('🔒 개인정보처리방침')}
                </a>
            </div>
            <div style={{
      height: '200px'
    }} />
        </div>;
};
export default StudioSettingsTab;