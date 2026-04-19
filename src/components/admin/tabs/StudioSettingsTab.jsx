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
      alert(t("g_62088d") || "설정이 저장되었습니다.");
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`설정 저장 실패: ${error.message || t("g_5e9f6b") || "Unknown error"}`);
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
  }}>{t("g_9d062e")}</div>;

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
                    {t("g_7d1c83")}
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
                        <ArrowsClockwise size={16} /> {t("g_423c41")}
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
                        <FloppyDisk size={20} weight="bold" /> {isSaving ? t("g_5d6870") || "저장 중..." : t("g_ca06af") || "변경사항 저장"}
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
                    {t("g_d1d7dc")}
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
                        {localConfig.IDENTITY?.LOGO_URL ? <img src={localConfig.IDENTITY.LOGO_URL} alt={t("g_0d69c1")} style={{
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
          }}>{t("g_f66ec0")}</div>
                        <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
            marginBottom: '10px'
          }}>{t("g_35dcc1")}</div>
                        <input ref={logoInputRef} type="file" accept="image/*" style={{
            display: 'none'
          }} onChange={async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              alert(t("g_666e3f") || "파일 크기는 2MB 이하여야 합니다.");
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
              alert(t("g_c0037d") || "로고가 업로드되었습니다. 저장 버튼을 눌러 적용하세요.");
            } catch (err) {
              console.error('[Settings] Logo upload error:', err);
              alert((t("g_24fcc4") || "로고 업로드 실패: ") + err.message);
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
                            {logoUploading ? t("g_1e5a82") || "업로드 중..." : t("g_49501b") || "로고 변경"}
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
                        <label>{t("g_6bb4e0")}</label>
                        <input type="text" className="styled-input" value={localConfig.IDENTITY?.NAME || ''} onChange={e => handleChange('IDENTITY.NAME', e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>{t("g_8b9074")}</label>
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
                            <Globe size={14} /> {t("g_3f39c8")}
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
                                    <input type="text" placeholder={t("g_bd59bc")} className="styled-input" style={{
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
                                        {t("g_30e15a")}
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
                                {t("g_c0b8e6")}
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
                    {t("g_afdd89")}
                </h3>

                {/* ── 2-1. Member 홀딩 ── */}
                <div style={featureCardStyle}>
                    <div style={featureHeaderStyle}>
                        <div>
                            <div style={{
              fontWeight: 'bold',
              fontSize: '0.95rem',
              color: 'var(--text-primary)',
              marginBottom: '4px'
            }}>{t("g_dd577e")}</div>
                            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)'
            }}>{t("g_826d4e")}</div>
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
          }}>{t("g_2d63cd")}</div>
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
              }}>{t("g_6e96bd")}</div>
                                        <Stepper value={rule.durationMonths || 1} onChange={v => {
                const rules = [...(localConfig.POLICIES?.HOLD_RULES || [])];
                rules[rIdx] = {
                  ...rules[rIdx],
                  durationMonths: v
                };
                handleChange('POLICIES.HOLD_RULES', rules);
              }} unit={t("g_f667f2")} />
                                    </div>
                                    <div style={{
              flex: 1,
              minWidth: '90px'
            }}>
                                        <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t("g_036f61")}</div>
                                        <Stepper value={rule.maxCount || 1} onChange={v => {
                const rules = [...(localConfig.POLICIES?.HOLD_RULES || [])];
                rules[rIdx] = {
                  ...rules[rIdx],
                  maxCount: v
                };
                handleChange('POLICIES.HOLD_RULES', rules);
              }} unit={t("g_8a602f")} />
                                    </div>
                                    <div style={{
              flex: 1,
              minWidth: '90px'
            }}>
                                        <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t("g_cc5401")}</div>
                                        <Stepper value={rule.maxWeeks || 1} onChange={v => {
                const rules = [...(localConfig.POLICIES?.HOLD_RULES || [])];
                rules[rIdx] = {
                  ...rules[rIdx],
                  maxWeeks: v
                };
                handleChange('POLICIES.HOLD_RULES', rules);
              }} unit={t("g_c826a1")} />
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
            }} title={t("g_30e15a")}>✕</button>
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
          }}>{t("g_77f49c")}</button>
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
            }}>{t("g_91dc8d")}</div>
                            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)'
            }}>{t("g_8040ba")}</div>
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
              label: t("g_bdd037") || "전체 기간",
              desc: t("g_5d073b") || "등록 기간 내 자유롭게 사용",
              icon: '📊'
            }, {
              value: 'weekly',
              label: t("g_2d882c") || "주간 단위",
              desc: t("g_305889") || "주 N회 제한 (예: 주 3회)",
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
              }}>{t("g_3b87ec")}</div>
                                    <select value={localConfig.POLICIES?.CREDIT_RULES?.weeklyResetDay ?? 1} onChange={e => handleChange('POLICIES.CREDIT_RULES', {
                ...(localConfig.POLICIES?.CREDIT_RULES || {}),
                weeklyResetDay: parseInt(e.target.value)
              })} className="styled-input" style={{
                padding: '6px 10px',
                fontSize: '0.85rem',
                maxWidth: '120px'
              }}>
                                        <option value={1}>{t("g_678771")}</option>
                                        <option value={2}>{t("g_bff43d")}</option>
                                        <option value={3}>{t("g_f36964")}</option>
                                        <option value={4}>{t("g_c9b38a")}</option>
                                        <option value={5}>{t("g_4def5d")}</option>
                                        <option value={6}>{t("g_463453")}</option>
                                        <option value={0}>{t("g_90963b")}</option>
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
              }}>{t("g_3eae1b")}</div>
                                    <select value={localConfig.POLICIES?.CREDIT_RULES?.weeklyLimitSource || 'plan'} onChange={e => handleChange('POLICIES.CREDIT_RULES', {
                ...(localConfig.POLICIES?.CREDIT_RULES || {}),
                weeklyLimitSource: e.target.value
              })} className="styled-input" style={{
                padding: '6px 10px',
                fontSize: '0.85rem',
                maxWidth: '160px'
              }}>
                                        <option value="plan">{t("g_43ac91")}</option>
                                        <option value="member">{t("g_24ab8c")}</option>
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
                            💡 {(localConfig.POLICIES?.CREDIT_RULES?.mode || 'total') === 'total' ? t("g_bccf3c") || "현재 방식: 등록된 총 횟수에서 출석할 때마다 1회씩 차감됩니다." : t("g_53f0e0") || "주간 방식: 요금제의 주당 횟수(예:  12회 → 주 3회)를 초과하면 출석이 제한됩니다. 총 잔여 횟수도 함께 차감됩니다."}
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
            }}>{t("g_10bbe7")}</div>
                            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)'
            }}>{t("g_6c79e2")}</div>
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
                                {t("g_b62689")}
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
              }}>{t("g_facb40")}</div>
                                    <div style={{
                fontSize: '0.7rem',
                color: 'var(--text-tertiary)',
                marginBottom: '8px'
              }}>{t("g_181f85")}</div>
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
                  }}>{t("g_8106b9")}</span>
                                                <Stepper value={bookingRules.defaultCapacity || 15} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                    ...bookingRules,
                    defaultCapacity: v
                  })} unit={t("g_7b3c6e")} />
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
                  }} unit={t("g_7b3c6e")} />
                                                </div>)}
                                        </div> : <Stepper value={bookingRules.defaultCapacity || 15} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                ...bookingRules,
                defaultCapacity: v
              })} unit={t("g_7b3c6e")} />}
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
              }}>{t("g_eb1f56")}</div>
                                    <Stepper value={bookingRules.windowDays || 7} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                ...bookingRules,
                windowDays: v
              })} unit={t("g_e85b9f")} />
                                </div>
                                <div style={{
              flex: 1,
              minWidth: '120px'
            }}>
                                    <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t("g_aab855")}</div>
                                    <Stepper value={bookingRules.deadlineHours || 1} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                ...bookingRules,
                deadlineHours: v
              })} unit={t("g_c61da2")} />
                                </div>
                                <div style={{
              flex: 1,
              minWidth: '120px'
            }}>
                                    <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t("g_db2cb6")}</div>
                                    <Stepper value={bookingRules.cancelDeadlineHours || 3} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                ...bookingRules,
                cancelDeadlineHours: v
              })} unit={t("g_c61da2")} />
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
              }}>{t("g_881b7c")}</div>
                                    <Stepper value={bookingRules.maxActiveBookings || 3} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                ...bookingRules,
                maxActiveBookings: v
              })} unit={t("g_230561")} />
                                </div>
                                <div style={{
              flex: 1,
              minWidth: '120px'
            }}>
                                    <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t("g_2fa84f")}</div>
                                    <Stepper value={bookingRules.maxDailyBookings || 2} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                ...bookingRules,
                maxDailyBookings: v
              })} unit={t("g_230561")} />
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
              }}>{t("g_cb635d")}</div>
                                    <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                marginBottom: '6px'
              }}>{t("g_6c2495")}</div>
                                    <Stepper value={bookingRules.noshowCreditDeduct || 1} onChange={v => handleChange('POLICIES.BOOKING_RULES', {
                ...bookingRules,
                noshowCreditDeduct: v
              })} min={0} unit={t("g_19082f")} />
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
              }}>{t("g_1912bb")}</div>
                                    <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)'
              }}>{t("g_9cca75")}</div>
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
            }}>{t("g_2c47b5")}</div>
                            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)'
            }}>{t("g_73a95a")}</div>
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
              }}>{t("g_8f8e8a")}</div>
                                    <div style={{
                fontSize: '0.72rem',
                color: 'var(--text-tertiary)'
              }}>
                                        {(localConfig.POLICIES?.CAMERA_SIZE || 'large') === 'large' ? t("g_60335b") || "로고 아래 큰 프리뷰" : t("g_7eec2d") || "QR 코드 옆 작은 프리뷰"}
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
              }}>{size === 'large' ? t("g_69d753") || "크게" : t("g_2247a8") || "작게"}</button>)}
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
              }}>{t("g_f6e7fa")}</div>
                                    <div style={{
                fontSize: '0.72rem',
                color: 'var(--text-tertiary)'
              }}>{t("g_d5c6da")}</div>
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
                        <MapPin size={20} weight="fill" color="var(--primary-theme-color)" /> {t("g_bd50b5")}
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
            if (window.confirm((t('confirm_delete_branch') || `Delete branch "${branch.name}"?\n\n⚠️ Warning: Attendance, revenue, and schedule records linked to this branch may lose their branch data.\n\nThis action cannot be undone.`).replace('{name}', branch.name))) {
              const newBranches = localConfig.BRANCHES.filter((_, i) => i !== index);
              handleChange('BRANCHES', newBranches);
            }
          }}>
                                        {t("g_30e15a")}
                                    </button>}
                            </div>)}
                        <button className="action-btn sm" style={{
          alignSelf: 'flex-start',
          background: 'rgba(255,255,255,0.05)',
          color: 'var(--text-secondary)',
          border: '1px dashed var(--border-color)'
        }} onClick={() => {
          const name = prompt(t("g_c2102b") || "새 지점 이름을 입력하세요:");
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
                            {t("g_9ea7c1")}
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
                            {t("g_76bbb9")}
                        </div>
                        <div>{t("g_daf020")}</div>
                        <div>{t("g_5a984e")}</div>
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
                    {t("g_b36e99")}
                </h3>
                <p style={{
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        marginBottom: '20px'
      }}>
                    {t("g_a86849")}
                </p>
                <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
                    {[{
          label: t("g_61a1eb") || "관리자앱",
          path: '/admin',
          icon: '⚙️',
          desc: t("g_a58c21") || "스튜디오 관리"
        }, {
          label: t("g_82042e") || "강사앱",
          path: '/instructor',
          icon: '🧘',
          desc: t("g_bbe121") || "출석 확인 & 일정"
        }, {
          label: t("g_68fa36") || "Member앱",
          path: '/member',
          icon: '📱',
          desc: t("g_4318a0") || "출석 & 수업 정보"
        }, {
          label: t("g_17c4d8") || "출석체크앱",
          path: '/checkin',
          icon: '✅',
          desc: t("g_b9b504") || "키오스크/태블릿"
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
            }} onClick={() => window.open(fullUrl, '_blank')} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} title={t("g_baac83")}>
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
                btn.textContent = (t("g_a1d762") || "✓ 복사됨!");
                setTimeout(() => {
                  btn.textContent = (t("g_404b75") || "URL 복사");
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
            }}>{t("g_290145")}</button>
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
                    {t("g_46db58")}
                </a>
            </div>
            <div style={{
      height: '200px'
    }} />
        </div>;
};
export default StudioSettingsTab;