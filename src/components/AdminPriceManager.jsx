import { useLanguageStore } from '../stores/useLanguageStore';
import { useState, useEffect, useRef } from 'react';
import { PencilLine, Trash, X, Plus, ArrowClockwise } from '@phosphor-icons/react';
import { storageService } from '../services/storage';
import { useStudioConfig } from '../contexts/StudioContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
const AdminPriceManager = () => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const branches = config.BRANCHES || [];
  const getBranchName = id => branches.find(b => b.id === id)?.name || id;
  const [pricing, setPricing] = useState({});
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategoryKey, setEditingCategoryKey] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const optionsEndRef = useRef(null);
  const scrollToBottom = () => {
    if (optionsEndRef.current) {
      optionsEndRef.current.scrollIntoView({
        behavior: "smooth"
      });
    }
  };
  useEffect(() => {
    if (showEditModal && editingCategory?.options?.length > 0) {
      // Check if deeper comparison needed, but simple length check helps for "add" action
      // actually better to trigger explicitly on add
    }
  }, [editingCategory, showEditModal]);
  useEffect(() => {
    loadPricing();

    // [NEW] 실시간 설정 동기화 구독
    const unsubscribe = storageService.subscribe(() => {
      console.log('[AdminPriceManager] Settings updated, refreshing pricing...');
      loadPricing();
    }, ['settings']);
    return () => unsubscribe();
  }, []);
  const loadPricing = async () => {
    setLoading(true);
    const data = await storageService.getPricing();
    // Ensure data is deep cloned to avoid reference issues
    setPricing(JSON.parse(JSON.stringify(data)));
    setLoading(false);
  };
  const handleEditCategory = key => {
    setEditingCategoryKey(key);
    setEditingCategory(JSON.parse(JSON.stringify(pricing[key])));
    setShowEditModal(true);
  };
  const handleDeleteCategory = async key => {
    if (!confirm(t("g_829fa8") || t("g_829fa8") || t("g_829fa8") || t("g_829fa8") || t("g_829fa8") || "\uC815\uB9D0 \uC774 \uD68C\uC6D0\uAD8C \uC885\uB958\uB97C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) return;
    const newPricing = {
      ...pricing
    };
    delete newPricing[key];
    const success = await storageService.savePricing(newPricing);
    if (success) {
      setPricing(newPricing);
      alert(t("g_ac356e") || t("g_ac356e") || t("g_ac356e") || t("g_ac356e") || t("g_ac356e") || "\uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
    } else {
      alert(t("g_12ba3c") || t("g_12ba3c") || t("g_12ba3c") || t("g_12ba3c") || t("g_12ba3c") || "\uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
    }
  };
  const handleAddNewCategory = () => {
    const newKey = `custom_${Date.now()}`;
    setEditingCategoryKey(newKey);
    setEditingCategory({
      label: t("g_5c54c2") || t("g_5c54c2") || t("g_5c54c2") || t("g_5c54c2") || t("g_5c54c2") || "\uC0C8 \uD68C\uC6D0\uAD8C",
      branches: (config.BRANCHES || []).map(b => b.id),
      options: [] // Empty options initially
    });
    setShowEditModal(true);
  };
  const handleSaveCategory = async () => {
    if (!editingCategory.label) return alert(t("g_5eebe0") || t("g_5eebe0") || t("g_5eebe0") || t("g_5eebe0") || t("g_5eebe0") || "\uD68C\uC6D0\uAD8C \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694.");
    setIsSubmitting(true);
    const newPricing = {
      ...pricing,
      [editingCategoryKey]: editingCategory
    };
    try {
      const success = await storageService.savePricing(newPricing);
      if (success) {
        setPricing(newPricing);
        setShowEditModal(false);
        alert(t("g_0c47ff") || t("g_0c47ff") || t("g_0c47ff") || t("g_0c47ff") || t("g_0c47ff") || "\uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      } else {
        alert(t("g_5f3ec4") || t("g_5f3ec4") || t("g_5f3ec4") || t("g_5f3ec4") || t("g_5f3ec4") || "\uC800\uC7A5 \uC2E4\uD328");
      }
    } catch (e) {
      console.error(e);
      alert(t("g_5eeba8") || t("g_5eeba8") || t("g_5eeba8") || t("g_5eeba8") || t("g_5eeba8") || "\uC624\uB958 \uBC1C\uC0DD");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Modal Field Handlers (below) ---

  const updateCategoryField = (field, value) => {
    setEditingCategory(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const toggleBranch = branchId => {
    setEditingCategory(prev => {
      const branches = prev.branches || [];
      if (branches.includes(branchId)) {
        return {
          ...prev,
          branches: branches.filter(b => b !== branchId)
        };
      } else {
        return {
          ...prev,
          branches: [...branches, branchId]
        };
      }
    });
  };
  const addOption = () => {
    setEditingCategory(prev => ({
      ...prev,
      options: [...prev.options, {
        id: `opt_${Date.now()}`,
        label: '',
        basePrice: 0,
        credits: 0,
        months: 1,
        type: 'subscription'
      }]
    }));
    // Scroll after render
    setTimeout(scrollToBottom, 50);
  };
  const removeOption = idx => {
    setEditingCategory(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx)
    }));
  };
  const updateOption = (idx, field, value) => {
    setEditingCategory(prev => {
      const newOptions = [...prev.options];
      newOptions[idx] = {
        ...newOptions[idx],
        [field]: value
      };
      return {
        ...prev,
        options: newOptions
      };
    });
  };
  if (loading) return <div style={{
    padding: '20px',
    color: 'var(--text-secondary)'
  }}>{t("g_978e5f") || t("g_978e5f") || t("g_978e5f") || t("g_978e5f") || t("g_978e5f") || "\uAC00\uACA9\uD45C \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911..."}</div>;
  return <div style={{
    paddingBottom: '80px'
  }}>
            <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      flexWrap: 'wrap',
      gap: '15px'
    }}>
                <h3 className="section-title" style={{
        margin: 0
      }}>{t("g_3e5cc8") || t("g_3e5cc8") || t("g_3e5cc8") || t("g_3e5cc8") || t("g_3e5cc8") || "\uAC00\uACA9\uD45C \uAD00\uB9AC"}</h3>
                <div style={{
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
                    <button onClick={handleAddNewCategory} className="action-btn" style={{
          width: 'auto',
          padding: '10px 24px',
          flexShrink: 0,
          background: `linear-gradient(135deg, var(--primary-gold) 0%, ${config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'} 100%)`,
          color: 'var(--text-on-primary)',
          fontWeight: '800',
          fontSize: '0.95rem',
          border: 'none',
          boxShadow: `0 4px 15px ${config.THEME?.SKELETON_COLOR || 'rgba(var(--primary-rgb), 0.4)'}`,
          borderRadius: '30px',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }} onMouseOver={e => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          e.currentTarget.style.boxShadow = `0 6px 20px ${config.THEME?.SKELETON_COLOR || 'rgba(var(--primary-rgb), 0.6)'}`;
        }} onMouseOut={e => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = `0 4px 15px ${config.THEME?.SKELETON_COLOR || 'rgba(var(--primary-rgb), 0.4)'}`;
        }}>
                        <Plus size={20} weight="black" />{t("g_85c000") || t("g_85c000") || t("g_85c000") || t("g_85c000") || t("g_85c000") || "\uC0C8 \uAC00\uACA9\uD45C \uCD94\uAC00"}</button>
                </div>

                {/* 가격표 초기 데이터 세팅 버튼 */}
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
                    <div className="tooltip-container" style={{
          display: 'inline-flex',
          cursor: 'pointer'
        }}>
                        <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 'bold'
          }}>i</div>
                        <div className="tooltip-text" style={{
            width: '280px',
            left: 'auto',
            right: 0,
            transform: 'translateX(0)',
            textAlign: 'left',
            zIndex: 10
          }}>
                            <strong>{t("g_148a0a") || t("g_148a0a") || t("g_148a0a") || t("g_148a0a") || t("g_148a0a") || "\uB370\uC774\uD130 \uCD08\uAE30\uD654\uB780?"}</strong><br />{t("g_1da33e") || t("g_1da33e") || t("g_1da33e") || t("g_1da33e") || t("g_1da33e") || "\uAE30\uC874\uC5D0 \uCD94\uAC00/\uC218\uC815\uD55C \uAC00\uACA9\uD45C\uB97C \uC9C0\uC6B0\uACE0, \uD328\uC2A4\uD50C\uB85C\uC6B0 Ai \uC81C\uACF5"}<strong>{t("g_15bdd6") || t("g_15bdd6") || t("g_15bdd6") || t("g_15bdd6") || t("g_15bdd6") || "\uD45C\uC900 \uAC00\uACA9\uD45C \uD15C\uD50C\uB9BF(\uC2EC\uD654, \uC77C\uBC18, \uD558\uD0C0\uC778\uD150\uC2DC\uBE0C, \uD0A4\uC988\uD50C\uB77C\uC789)"}</strong>{t("g_363775") || t("g_363775") || t("g_363775") || t("g_363775") || t("g_363775") || "\uC73C\uB85C \uB418\uB3CC\uB9BD\uB2C8\uB2E4."}<br /><span style={{
              fontSize: '0.85em',
              color: '#ff6b6b'
            }}>{t("g_885cb4") || t("g_885cb4") || t("g_885cb4") || t("g_885cb4") || t("g_885cb4") || "* \uC608: \uC77C\uBC18 1\uD68C\uAD8C 25,000\uC6D0, \uC2EC\uD654 1\uD68C\uAD8C 35,000\uC6D0 \uB4F1 \uC2A4\uD29C\uB514\uC624 \uD3C9\uADE0 \uC2DC\uC138 \uAE30\uC900"}</span>
                        </div>
                    </div>
                    <button onClick={async () => {
          if (!confirm(t("g_1d285f") || t("g_1d285f") || t("g_1d285f") || t("g_1d285f") || t("g_1d285f") || "\uAC00\uACA9\uD45C\uB97C \uCD08\uAE30 \uB370\uC774\uD130\uB85C \uBCF5\uC6D0\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n(\uAE30\uC874 \uAC00\uACA9\uD45C\uAC00 \uBAA8\uB450 \uC0AD\uC81C\uB418\uACE0 \uAE30\uBCF8\uAC12\uC73C\uB85C \uB36E\uC5B4\uC50C\uC6CC\uC9D1\uB2C8\uB2E4)")) return;
          try {
            const restore = httpsCallable(functions, 'restorePricingV2');
            const res = await restore();
            if (res.data.success) {
              alert(`✅ ${res.data.message}`);
              const data = await storageService.getPricing();
              setPricing(data);
            } else {
              alert((t("g_196e12") || t("g_196e12") || t("g_196e12") || t("g_196e12") || t("g_196e12") || "\uC2E4\uD328: ") + (res.data.error || t("g_053d5f") || t("g_053d5f") || t("g_053d5f") || t("g_053d5f") || t("g_053d5f") || "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"));
            }
          } catch (e) {
            console.error(e);
            alert((t("g_90252d") || t("g_90252d") || t("g_90252d") || t("g_90252d") || t("g_90252d") || "\uC624\uB958: ") + e.message);
          }
        }} style={{
          padding: '6px 12px',
          background: 'transparent',
          color: 'rgba(255,255,255,0.4)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '6px',
          fontWeight: '500',
          fontSize: '0.75rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.2s ease'
        }} onMouseOver={e => {
          e.currentTarget.style.color = '#ff6b6b';
          e.currentTarget.style.borderColor = 'rgba(255, 107, 107, 0.4)';
          e.currentTarget.style.background = 'rgba(255, 107, 107, 0.05)';
        }} onMouseOut={e => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
          e.currentTarget.style.background = 'transparent';
        }}>
                        <ArrowClockwise size={14} />{t("g_bcaec8") || t("g_bcaec8") || t("g_bcaec8") || t("g_bcaec8") || t("g_bcaec8") || "\uAC00\uACA9\uD45C \uCD08\uAE30\uD654"}</button>
                </div>
            </div>

            <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px'
    }}>
                {pricing && Object.entries(pricing).filter(([key]) => key !== '_meta').sort((a, b) => (b[1]?.options?.length || 0) - (a[1]?.options?.length || 0)).map(([key, category]) => <div key={key} className="dashboard-card" style={{
        position: 'relative'
      }}>
                        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '15px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '10px'
        }}>
                            <div>
                                <h4 style={{
              margin: '0 0 5px 0',
              color: 'var(--primary-gold)',
              fontSize: '1.2rem'
            }}>{category?.label || t("g_14a171") || t("g_14a171") || t("g_14a171") || t("g_14a171") || t("g_14a171") || "\uC774\uB984 \uC5C6\uC74C"}</h4>
                                <div style={{
              display: 'flex',
              gap: '5px'
            }}>
                                    {category?.branches && category.branches.map(b => <span key={b} style={{
                fontSize: '0.7rem',
                padding: '2px 6px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px'
              }}>
                                            {getBranchName(b)}
                                        </span>)}
                                </div>
                            </div>
                            <div style={{
            display: 'flex',
            gap: '8px'
          }}>
                                <button onClick={() => handleEditCategory(key)} style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}>
                                    <PencilLine size={20} />
                                </button>
                                <button onClick={() => handleDeleteCategory(key)} style={{
              background: 'none',
              border: 'none',
              color: '#ff6b6b',
              cursor: 'pointer'
            }}>
                                    <Trash size={20} />
                                </button>
                            </div>
                        </div>

                        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
                            {category?.options && category.options.map((opt, idx) => <div key={idx} style={{
            padding: '10px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '8px'
          }}>
                                    <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.9rem',
              marginBottom: opt.discount3 || opt.discount6 ? '6px' : 0
            }}>
                                        <span>{opt?.label || t("g_92cffb") || t("g_92cffb") || t("g_92cffb") || t("g_92cffb") || t("g_92cffb") || "\uC635\uC158\uBA85 \uC5C6\uC74C"}</span>
                                        <span style={{
                fontWeight: 'bold'
              }}>{opt?.basePrice?.toLocaleString() || 0}{t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || "\uC6D0"}</span>
                                    </div>
                                    {(opt.discount3 || opt.discount6) && <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '4px',
              fontSize: '0.72rem'
            }}>
                                            {opt.discount3 && <span style={{
                color: '#10B981'
              }}>{t("g_95fd0b") || t("g_95fd0b") || t("g_95fd0b") || t("g_95fd0b") || t("g_95fd0b") || "3\uAC1C\uC6D4"}{opt.discount3.toLocaleString()}{t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || "\uC6D0"}{opt.cashDiscount3 && <span style={{
                  color: '#f59e0b'
                }}>{t("g_788fe8") || t("g_788fe8") || t("g_788fe8") || t("g_788fe8") || t("g_788fe8") || "(\uD604\uAE08"}{opt.cashDiscount3.toLocaleString()})</span>}
                                                </span>}
                                            {opt.discount6 && <span style={{
                color: '#10B981'
              }}>{t("g_2b3997") || t("g_2b3997") || t("g_2b3997") || t("g_2b3997") || t("g_2b3997") || "6\uAC1C\uC6D4"}{opt.discount6.toLocaleString()}{t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || "\uC6D0"}{opt.cashDiscount6 && <span style={{
                  color: '#f59e0b'
                }}>{t("g_788fe8") || t("g_788fe8") || t("g_788fe8") || t("g_788fe8") || t("g_788fe8") || "(\uD604\uAE08"}{opt.cashDiscount6.toLocaleString()})</span>}
                                                </span>}
                                        </div>}
                                </div>)}
                        </div>
                    </div>)}
            </div>

            {/* Edit Modal */}
            {showEditModal && editingCategory && <div className="modal-overlay">
                    <div className="modal-content" style={{
        maxWidth: '800px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
                        <div className="modal-header">
                            <h3>{t("g_abe0ac") || t("g_abe0ac") || t("g_abe0ac") || t("g_abe0ac") || t("g_abe0ac") || "\uD68C\uC6D0\uAD8C \uC218\uC815"}</h3>
                            <button onClick={() => setShowEditModal(false)} className="close-btn"><X size={24} /></button>
                        </div>
                        <div className="modal-body" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
                            {/* Basic Info */}
                            <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: '15px',
            alignItems: 'center'
          }}>
                                <label>{t("g_2cd0c9") || t("g_2cd0c9") || t("g_2cd0c9") || t("g_2cd0c9") || t("g_2cd0c9") || "\uD68C\uC6D0\uAD8C \uC774\uB984"}</label>
                                <input type="text" className="styled-input" value={editingCategory.label} onChange={e => updateCategoryField('label', e.target.value)} />

                                <label>{t("g_9b6a5b") || t("g_9b6a5b") || t("g_9b6a5b") || t("g_9b6a5b") || t("g_9b6a5b") || "\uC801\uC6A9 \uC9C0\uC810"}</label>
                                <div style={{
              display: 'flex',
              gap: '10px'
            }}>
                                    {(config.BRANCHES || []).map(b => <div key={b.id} onClick={() => toggleBranch(b.id)} style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: `1px solid ${editingCategory.branches.includes(b.id) ? 'var(--primary-gold)' : 'rgba(255,255,255,0.2)'}`,
                background: editingCategory.branches.includes(b.id) ? config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)' : 'transparent',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}>
                                            {b.name}
                                        </div>)}
                                </div>
                            </div>

                            <hr style={{
            borderColor: 'rgba(255,255,255,0.1)',
            margin: '0'
          }} />

                            {/* Options List */}
                            <div>
                                <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
                                    <h4 style={{
                margin: 0
              }}>{t("g_252058") || t("g_252058") || t("g_252058") || t("g_252058") || t("g_252058") || "\uC138\uBD80 \uC635\uC158 (\uAE30\uAC04/\uD69F\uC218)"}</h4>
                                    <button onClick={addOption} className="action-btn sm" style={{
                background: 'rgba(255,255,255,0.1)'
              }}>{t("g_517e97") || t("g_517e97") || t("g_517e97") || t("g_517e97") || t("g_517e97") || "+ \uC635\uC158 \uCD94\uAC00"}</button>
                                </div>
                                <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
                                    {editingCategory.options.map((opt, idx) => <div key={idx} style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)',
                position: 'relative'
              }}>
                                            <button onClick={() => removeOption(idx)} style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#ff6b6b',
                  cursor: 'pointer'
                }}>
                                                <X size={18} />
                                            </button>

                                            <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '10px'
                }}>
                                                <div>
                                                    <label style={{
                      fontSize: '0.8rem',
                      opacity: 0.7
                    }}>{t("g_2904f9") || t("g_2904f9") || t("g_2904f9") || t("g_2904f9") || t("g_2904f9") || "\uD45C\uC2DC \uC774\uB984"}</label>
                                                    <input type="text" className="styled-input" value={opt.label} placeholder={t("g_807c8f") || t("g_807c8f") || t("g_807c8f") || t("g_807c8f") || t("g_807c8f") || "\uC608: 1\uAC1C\uC6D4 (\uC8FC2\uD68C)"} onChange={e => updateOption(idx, 'label', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label style={{
                      fontSize: '0.8rem',
                      opacity: 0.7
                    }}>{t("g_36df67") || t("g_36df67") || t("g_36df67") || t("g_36df67") || t("g_36df67") || "\uAE30\uBCF8 \uAC00\uACA9"}</label>
                                                    <input type="number" className="styled-input" value={opt.basePrice} onChange={e => updateOption(idx, 'basePrice', parseInt(e.target.value) || 0)} />
                                                </div>
                                                <div>
                                                    <label style={{
                      fontSize: '0.8rem',
                      opacity: 0.7
                    }}>{t("g_ed5b1c") || t("g_ed5b1c") || t("g_ed5b1c") || t("g_ed5b1c") || t("g_ed5b1c") || "\uD69F\uC218 (\uBB34\uC81C\uD55C=9999)"}</label>
                                                    <input type="number" className="styled-input" value={opt.credits} onChange={e => updateOption(idx, 'credits', parseInt(e.target.value) || 0)} />
                                                </div>
                                                <div>
                                                    <label style={{
                      fontSize: '0.8rem',
                      opacity: 0.7
                    }}>{t("g_075200") || t("g_075200") || t("g_075200") || t("g_075200") || t("g_075200") || "\uC720\uD6A8 \uAE30\uAC04(\uAC1C\uC6D4)"}</label>
                                                    <input type="number" className="styled-input" value={opt.months} onChange={e => updateOption(idx, 'months', parseInt(e.target.value) || 1)} />
                                                </div>
                                                <div>
                                                    <label style={{
                      fontSize: '0.8rem',
                      opacity: 0.7
                    }}>{t("g_d38ee7") || t("g_d38ee7") || t("g_d38ee7") || t("g_d38ee7") || t("g_d38ee7") || "\uC720\uD615"}</label>
                                                    <select className="styled-select" value={opt.type} onChange={e => updateOption(idx, 'type', e.target.value)}>
                                                        <option value="subscription">{t("g_dad01a") || t("g_dad01a") || t("g_dad01a") || t("g_dad01a") || t("g_dad01a") || "\uAE30\uAC04\uC81C(\uC6D4)"}</option>
                                                        <option value="ticket">{t("g_584068") || t("g_584068") || t("g_584068") || t("g_584068") || t("g_584068") || "\uD69F\uC218\uAD8C"}</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Advanced Pricing (Multi-month discounts) - Only for subscriptions */}
                                            {opt.type === 'subscription' && <div style={{
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  gap: '15px'
                }}>
                                                    <div style={{
                    flex: 1
                  }}>
                                                        <label style={{
                      fontSize: '0.75rem',
                      opacity: 0.6
                    }}>{t("g_97aa68") || t("g_97aa68") || t("g_97aa68") || t("g_97aa68") || t("g_97aa68") || "3\uAC1C\uC6D4 \uD560\uC778\uAC00 (\uC120\uD0DD)"}</label>
                                                        <input type="number" className="styled-input" style={{
                      fontSize: '0.9rem',
                      padding: '6px'
                    }} value={opt.discount3 || ''} placeholder={t("g_3c915d") || t("g_3c915d") || t("g_3c915d") || t("g_3c915d") || t("g_3c915d") || "\uBE44\uC5B4\uC788\uC73C\uBA74 \uAE30\uBCF8\uAC12x3"} onChange={e => updateOption(idx, 'discount3', e.target.value ? parseInt(e.target.value) : undefined)} />
                                                    </div>
                                                    <div style={{
                    flex: 1
                  }}>
                                                        <label style={{
                      fontSize: '0.75rem',
                      opacity: 0.6
                    }}>{t("g_13365a") || t("g_13365a") || t("g_13365a") || t("g_13365a") || t("g_13365a") || "6\uAC1C\uC6D4 \uD560\uC778\uAC00 (\uC120\uD0DD)"}</label>
                                                        <input type="number" className="styled-input" style={{
                      fontSize: '0.9rem',
                      padding: '6px'
                    }} value={opt.discount6 || ''} placeholder={t("g_56cb36") || t("g_56cb36") || t("g_56cb36") || t("g_56cb36") || t("g_56cb36") || "\uBE44\uC5B4\uC788\uC73C\uBA74 \uAE30\uBCF8\uAC12x6"} onChange={e => updateOption(idx, 'discount6', e.target.value ? parseInt(e.target.value) : undefined)} />
                                                    </div>
                                                </div>}

                                            {/* [NEW] 현금/이체 전용 가격 설정 */}
                                            <div style={{
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(245, 158, 11, 0.15)',
                  background: 'rgba(245, 158, 11, 0.03)',
                  borderRadius: '6px',
                  padding: '10px'
                }}>
                                                <div style={{
                    fontSize: '0.75rem',
                    color: '#f59e0b',
                    fontWeight: 'bold',
                    marginBottom: '8px'
                  }}>{t("g_807ae3") || t("g_807ae3") || t("g_807ae3") || t("g_807ae3") || t("g_807ae3") || "\uD83D\uDCB0 \uD604\uAE08/\uC774\uCCB4 \uAC00\uACA9 (\uC120\uD0DD)"}</div>
                                                <div style={{
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}>
                                                    <div style={{
                      flex: 1,
                      minWidth: '100px'
                    }}>
                                                        <label style={{
                        fontSize: '0.7rem',
                        opacity: 0.6
                      }}>{t("g_120051") || t("g_120051") || t("g_120051") || t("g_120051") || t("g_120051") || "\uD604\uAE08 \uACE0\uC815\uAC00"}</label>
                                                        <input type="number" className="styled-input" style={{
                        fontSize: '0.85rem',
                        padding: '6px'
                      }} value={opt.cashPrice ?? ''} placeholder={t("g_ce3ca9") || t("g_ce3ca9") || t("g_ce3ca9") || t("g_ce3ca9") || t("g_ce3ca9") || "\uBBF8\uC124\uC815 \uC2DC \uC790\uB3D9\uD560\uC778"} onChange={e => updateOption(idx, 'cashPrice', e.target.value ? parseInt(e.target.value) : undefined)} />
                                                    </div>
                                                    {opt.type === 'subscription' && <>
                                                            <div style={{
                        flex: 1,
                        minWidth: '100px'
                      }}>
                                                                <label style={{
                          fontSize: '0.7rem',
                          opacity: 0.6
                        }}>{t("g_1913a6") || t("g_1913a6") || t("g_1913a6") || t("g_1913a6") || t("g_1913a6") || "\uD604\uAE08 3\uAC1C\uC6D4"}</label>
                                                                <input type="number" className="styled-input" style={{
                          fontSize: '0.85rem',
                          padding: '6px'
                        }} value={opt.cashDiscount3 ?? ''} placeholder={t("g_508b3b") || t("g_508b3b") || t("g_508b3b") || t("g_508b3b") || t("g_508b3b") || "\uBBF8\uC124\uC815 \uC2DC \uCE74\uB4DC\uAC00 \uC801\uC6A9"} onChange={e => updateOption(idx, 'cashDiscount3', e.target.value ? parseInt(e.target.value) : undefined)} />
                                                            </div>
                                                            <div style={{
                        flex: 1,
                        minWidth: '100px'
                      }}>
                                                                <label style={{
                          fontSize: '0.7rem',
                          opacity: 0.6
                        }}>{t("g_41efde") || t("g_41efde") || t("g_41efde") || t("g_41efde") || t("g_41efde") || "\uD604\uAE08 6\uAC1C\uC6D4"}</label>
                                                                <input type="number" className="styled-input" style={{
                          fontSize: '0.85rem',
                          padding: '6px'
                        }} value={opt.cashDiscount6 ?? ''} placeholder={t("g_508b3b") || t("g_508b3b") || t("g_508b3b") || t("g_508b3b") || t("g_508b3b") || "\uBBF8\uC124\uC815 \uC2DC \uCE74\uB4DC\uAC00 \uC801\uC6A9"} onChange={e => updateOption(idx, 'cashDiscount6', e.target.value ? parseInt(e.target.value) : undefined)} />
                                                            </div>
                                                        </>}
                                                </div>
                                                <div style={{
                    fontSize: '0.65rem',
                    color: 'rgba(245,158,11,0.5)',
                    marginTop: '6px'
                  }}>{t("g_9e053c") || t("g_9e053c") || t("g_9e053c") || t("g_9e053c") || t("g_9e053c") || "* \uBE44\uC5B4\uC788\uC73C\uBA74 \uCE74\uB4DC \uAC00\uACA9\uC758 5% \uD560\uC778(3\uAC1C\uC6D4 \uC774\uC0C1) \uC790\uB3D9 \uC801\uC6A9"}</div>
                                            </div>
                                        </div>)}
                                    <div ref={optionsEndRef} />
                                </div>
                            </div>

                            <button onClick={handleSaveCategory} className="action-btn primary" disabled={isSubmitting} style={{
            width: '100%',
            marginTop: '10px'
          }}>
                                {isSubmitting ? t("g_923cf9") || t("g_923cf9") || t("g_923cf9") || t("g_923cf9") || t("g_923cf9") || "\uC800\uC7A5 \uC911..." : t("g_a265cd") || t("g_a265cd") || t("g_a265cd") || t("g_a265cd") || t("g_a265cd") || "\uC800\uC7A5\uD558\uAE30"}
                            </button>
                        </div>
                    </div>
                </div>}
        </div>;
};
export default AdminPriceManager;