import { useLanguageStore } from '../stores/useLanguageStore';
import { useState } from 'react';
import { Plus, X } from '@phosphor-icons/react';
import { storageService } from '../services/storage';
import { useStudioConfig } from '../contexts/StudioContext';
import { formatPhoneNumber } from '../utils/formatters';
const ScheduleClassEditor = ({
  cls,
  idx,
  dayClasses,
  setDayClasses,
  instructors,
  classTypes,
  classLevels
}) => {
  const t = useLanguageStore(s => s.t);
  const language = useLanguageStore(s => s.language);
  const selectStyle = {
    // fallback generic styles
    fontSize: '0.9rem',
    padding: '8px 30px 8px 8px',
    // right padding 30px for the custom caret
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-surface, #1e1e1e)',
    color: 'var(--text-primary, #ffffff)',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden'
    // appearance: 'none' is handled globally by default, so we remove appearance: 'auto'
  };

  // Parse time into hour and minute
  const [hour, minute] = (cls.time || '10:00').split(':');
  const updateTime = (newHour, newMinute) => {
    const newClasses = [...dayClasses];
    newClasses[idx].time = `${newHour}:${newMinute}`;
    setDayClasses(newClasses);
  };

  // Generate hour options (06-22)
  const hours = [];
  for (let h = 6; h <= 22; h++) {
    hours.push(String(h).padStart(2, '0'));
  }

  // Generate minute options (00, 10, 20, 30, 40, 50)
  const minutes = ['00', '10', '20', '30', '40', '50'];
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '10px',
    backgroundColor: 'var(--bg-input)',
    padding: '12px',
    borderRadius: '10px',
    width: '100%'
  }}>
            {/* Row 1: Time + Class Title */}
            <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        flexShrink: 0
      }}>
                    <select value={hour} onChange={e => updateTime(e.target.value, minute)} style={{
          ...selectStyle,
          width: '90px',
          paddingRight: '20px',
          fontWeight: '700'
        }}>
                        {hours.map(h => <option key={h} value={h}>{h}{t("g_a7762a") || "시"}</option>)}
                    </select>
                    <span style={{
          color: 'var(--text-secondary)',
          fontWeight: 'bold',
          margin: '0 1px'
        }}>:</span>
                    <select value={minute} onChange={e => updateTime(hour, e.target.value)} style={{
          ...selectStyle,
          width: '90px',
          paddingRight: '20px',
          fontWeight: '700'
        }}>
                        {minutes.map(m => <option key={m} value={m}>{m}{t("g_0b877b") || "분"}</option>)}
                    </select>
                </div>
                <select value={cls.title} onChange={e => {
        const newClasses = [...dayClasses];
        newClasses[idx].title = e.target.value;
        setDayClasses(newClasses);
      }} style={{
        ...selectStyle,
        flex: 2,
        minWidth: '140px',
        fontWeight: '600'
      }}>
                    {classTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                </select>
            </div>
            {/* Row 2: Instructor + Level + Status + Delete */}
            <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }}>
                <select value={cls.instructor || ''} onChange={e => {
        const newClasses = [...dayClasses];
        newClasses[idx].instructor = e.target.value;
        setDayClasses(newClasses);
      }} style={{
        ...selectStyle,
        flex: 1.5,
        minWidth: '100px'
      }}>
                    <option value="">{t("g_620be2") || "Instructor"}</option>
                    {cls.instructor && !instructors.some(i => (typeof i === 'string' ? i : i.name) === cls.instructor) && <option value={cls.instructor}>{t("g_363c34") || "미등록"}</option>}
                    {instructors.map(inst => {
          const name = typeof inst === 'string' ? inst : inst.name;
          return <option key={name} value={name}>{name}</option>;
        })}
                </select>
                {classLevels?.length > 0 && <select value={String(cls.level ?? '')} onChange={e => {
        const newClasses = [...dayClasses];
        newClasses[idx].level = e.target.value;
        setDayClasses(newClasses);
      }} style={{
        ...selectStyle,
        flex: 1,
        minWidth: '85px'
      }}>
                        <option value="">{t("g_453d0d") || "레벨"}</option>
                        {classLevels?.map(level => <option key={level} value={level}>Lv.{level}</option>)}
                    </select>}
                <select value={cls.status} onChange={e => {
        const newClasses = [...dayClasses];
        newClasses[idx].status = e.target.value;
        setDayClasses(newClasses);
      }} style={{
        ...selectStyle,
        flex: 1,
        minWidth: '80px'
      }}>
                    <option value="normal">{t("g_f6846c") || "정상"}</option>
                    <option value="cancelled">{t("g_f20e34") || "휴강"}</option>
                    <option value="changed">{t("g_ce0109") || "변경"}</option>
                </select>
                <button onClick={() => {
        const newClasses = dayClasses.filter((_, i) => i !== idx);
        setDayClasses(newClasses);
      }} style={{
        background: 'rgba(255,71,87,0.2)',
        border: '1px solid rgba(255,71,87,0.4)',
        borderRadius: '6px',
        color: '#ff6b6b',
        cursor: 'pointer',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
                    <X size={16} weight="bold" />
                </button>
            </div>
        </div>;
};
const SettingsModal = ({
  show,
  onClose,
  instructors,
  setInstructors,
  classTypes,
  setClassTypes,
  classLevels,
  setClassLevels
}) => {
  const t = useLanguageStore(s => s.t);
  const language = useLanguageStore(s => s.language);
  const {
    config
  } = useStudioConfig();
  const [newInstructor, setNewInstructor] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editPhone, setEditPhone] = useState('');
  const [newClassType, setNewClassType] = useState('');
  const [newClassLevel, setNewClassLevel] = useState('');
  const [hoveredTag, setHoveredTag] = useState(null);

  // Helper to normalize instructor data (support both string and object formats)
  const normalizeInstructor = inst => {
    if (typeof inst === 'string') return {
      name: inst,
      phone: ''
    };
    return {
      name: inst.name || '',
      phone: inst.phone || ''
    };
  };
  const normalizedInstructors = (instructors || []).map(normalizeInstructor);
  if (!show) return null;

  // Tag styles by section
  const getTagStyle = (type, id, hasPhone = false) => {
    const isHovered = hoveredTag === id;
    const baseStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 14px',
      borderRadius: '24px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      transform: isHovered ? 'translateY(-2px)' : 'none',
      boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
    };
    const themes = {
      instructor: {
        background: hasPhone ? 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.25) 0%, rgba(var(--primary-rgb), 0.15) 100%)' : 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.15) 0%, rgba(var(--primary-rgb), 0.08) 100%)',
        border: '1px solid rgba(var(--primary-rgb), 0.4)'
      },
      classType: {
        background: 'linear-gradient(135deg, rgba(0,206,201,0.15) 0%, rgba(0,206,201,0.08) 100%)',
        border: '1px solid rgba(0,206,201,0.4)'
      },
      level: {
        background: 'linear-gradient(135deg, rgba(155,89,182,0.15) 0%, rgba(155,89,182,0.08) 100%)',
        border: '1px solid rgba(155,89,182,0.4)'
      }
    };
    return {
      ...baseStyle,
      ...themes[type]
    };
  };
  return <div style={modalOverlayStyle}>
            <div style={improvedModalContentStyle}>
                {/* Header */}
                <div style={modalHeaderStyle}>
                    <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
                        <span style={{
            fontSize: '1.5rem'
          }}>⚙️</span>
                        <h3 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '600'
          }}>{t("g_d2e531") || "Instructor & 수업 종류 관리"}</h3>
                    </div>
                    <button onClick={onClose} style={closeButtonStyle} onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                        <X size={22} color="var(--text-secondary)" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div style={scrollContainerStyle}>
                    {/* Instructor 관리 섹션 */}
                    <div style={sectionCardStyle}>
                        <div style={sectionHeaderStyle}>
                            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
                                <span style={{
                fontSize: '1.2rem'
              }}>👩‍🏫</span>
                        <h4 style={{
                margin: 0,
                color: config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)',
                fontWeight: '600'
              }}>{t("g_d57caf") || "Instructor 목록"}</h4>
                                <span style={{
                background: 'rgba(var(--primary-rgb), 0.2)',
                color: config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>{normalizedInstructors.length}{t("g_5a62fd") || "people"}</span>
                            </div>
                        </div>
                        <p style={hintTextStyle}>{t("g_85525d") || "💡 Instructor을 클릭하면 전화번호를 편집할 수 있습니다"}</p>
                        <div style={inputRowStyle}>
                            <input type="text" value={newInstructor} onChange={e => setNewInstructor(e.target.value)} placeholder={t("g_c3c6fb") || "Instructor 이름"} style={{
              ...improvedInputStyle,
              flex: 1
            }} onKeyDown={e => e.key === 'Enter' && newInstructor.trim() && document.getElementById('add-instructor-btn')?.click()} />
                            <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder={t("g_9c73bc") || "전화번호 (선택)"} style={{
              ...improvedInputStyle,
              flex: 1
            }} />
                            <button id="add-instructor-btn" onClick={async () => {
              if (newInstructor.trim()) {
                try {
                  const updated = [...normalizedInstructors, {
                    name: newInstructor.trim(),
                    phone: newPhone.trim()
                  }];
                  await storageService.updateInstructors(updated);
                  setInstructors(updated);
                  setNewInstructor('');
                  setNewPhone('');
                } catch (e) {
                  console.error('Failed to add instructor:', e);
                  alert(t("g_99b155") || "Instructor 추가 실패");
                }
              }
            }} style={improvedActionBtnStyle}>
                                <Plus size={18} weight="bold" />{t("g_579429") || "Add"}</button>
                        </div>
                        <div style={tagContainerStyle}>
                            {normalizedInstructors.map((inst, idx) => <div key={inst.name} style={getTagStyle('instructor', `inst-${idx}`, !!inst.phone)} onMouseEnter={() => setHoveredTag(`inst-${idx}`)} onMouseLeave={() => setHoveredTag(null)}>
                                    {editingIdx === idx ? <>
                                            <span style={{
                  fontWeight: '600',
                  color: config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'
                }}>{inst.name}</span>
                                            <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder={t("g_9a1c3a") || "Phone"} style={{
                  ...improvedInputStyle,
                  width: '110px',
                  padding: '4px 10px',
                  fontSize: '0.85rem'
                }} autoFocus onKeyDown={e => e.key === 'Enter' && document.getElementById(`save-phone-${idx}`)?.click()} />
                                            <button id={`save-phone-${idx}`} onClick={async () => {
                  try {
                    const updated = [...normalizedInstructors];
                    updated[idx] = {
                      ...updated[idx],
                      phone: editPhone.trim()
                    };
                    await storageService.updateInstructors(updated);
                    setInstructors(updated);
                    setEditingIdx(null);
                  } catch (e) {
                    console.error('Failed to save phone:', e);
                    alert(t("g_41b08f") || "전화번호 저장 실패");
                  }
                }} style={{
                  background: `linear-gradient(135deg, ${config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'} 0%, #c9a227 100%)`,
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.85rem'
                }}>{t("g_1f1712") || "Save"}</button>
                                        </> : <>
                                            <span onClick={() => {
                  setEditingIdx(idx);
                  setEditPhone(inst.phone || '');
                }} style={{
                  fontWeight: '500'
                }} title={inst.phone ? `📞 ${formatPhoneNumber(inst.phone, language)}` : t("g_11685b") || "클릭하여 전화번호 입력"}>
                                                {inst.name}
                                                {inst.phone && <span style={{
                    fontSize: '0.75rem',
                    marginLeft: '6px',
                    opacity: 0.8
                  }}>📞</span>}
                                            </span>
                                            <button onClick={async e => {
                  e.stopPropagation();
                  if (window.confirm((t('confirm_delete_instructor') || `Delete instructor '${inst.name}'?`).replace('{name}', inst.name))) {
                    try {
                      const updated = normalizedInstructors.filter((_, i) => i !== idx);
                      await storageService.updateInstructors(updated);
                      setInstructors(updated);
                    } catch (e) {
                      console.error('Failed to delete instructor:', e);
                      alert(t("g_f3e768") || "Instructor 삭제 실패");
                    }
                  }
                }} style={deleteIconBtnStyle}>
                                                <X size={14} weight="bold" />
                                            </button>
                                        </>}
                                </div>)}
                        </div>
                    </div>

                    {/* 수업 종류 관리 섹션 */}
                    <div style={sectionCardStyle}>
                        <div style={sectionHeaderStyle}>
                            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
                                <span style={{
                fontSize: '1.2rem'
              }}>📚</span>
                                <h4 style={{
                margin: 0,
                color: '#00cec9',
                fontWeight: '600'
              }}>{t("g_abd084") || "수업 종류"}</h4>
                                <span style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600',
                background: 'rgba(0,206,201,0.2)',
                color: '#00cec9'
              }}>{classTypes.length}{t("g_11600c") || ""}</span>
                            </div>
                        </div>
                        <div style={inputRowStyle}>
                            <input type="text" value={newClassType} onChange={e => setNewClassType(e.target.value)} placeholder={t("g_9d77d9") || "수업 종류 입력"} style={{
              ...improvedInputStyle,
              flex: 1
            }} onKeyDown={e => e.key === 'Enter' && newClassType.trim() && document.getElementById('add-classtype-btn')?.click()} />
                            <button id="add-classtype-btn" onClick={async () => {
              if (newClassType.trim()) {
                try {
                  const updated = [...classTypes, newClassType.trim()];
                  await storageService.updateClassTypes(updated);
                  setClassTypes(updated);
                  setNewClassType('');
                } catch (e) {
                  console.error('Failed to add class type:', e);
                  alert(t("g_791b55") || "수업 종류 추가 실패");
                }
              }
            }} style={{
              ...improvedActionBtnStyle,
              background: '#00cec9'
            }}>
                                <Plus size={18} weight="bold" />{t("g_579429") || "Add"}</button>
                        </div>
                        <div style={tagContainerStyle}>
                            {classTypes.map((ct, idx) => <div key={ct} style={getTagStyle('classType', `ct-${idx}`)} onMouseEnter={() => setHoveredTag(`ct-${idx}`)} onMouseLeave={() => setHoveredTag(null)}>
                                    <span style={{
                fontWeight: '500'
              }}>{ct}</span>
                                    <button onClick={async () => {
                if (window.confirm((t('confirm_delete_class_type') || `Delete class type '${ct}'?`).replace('{name}', ct))) {
                  try {
                    const updated = classTypes.filter(c => c !== ct);
                    await storageService.updateClassTypes(updated);
                    setClassTypes(updated);
                  } catch (e) {
                    console.error('Failed to delete class type:', e);
                    alert(t("g_3aadfe") || "수업 종류 삭제 실패");
                  }
                }
              }} style={deleteIconBtnStyle}>
                                        <X size={14} weight="bold" />
                                    </button>
                                </div>)}
                        </div>
                    </div>

                    {/* 레벨 관리 섹션 */}
                    <div style={sectionCardStyle}>
                        <div style={sectionHeaderStyle}>
                            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
                                <span style={{
                fontSize: '1.2rem'
              }}>🎯</span>
                                <h4 style={{
                margin: 0,
                color: '#9b59b6',
                fontWeight: '600'
              }}>{t("g_7b61bb") || "수업 레벨"}</h4>
                                <span style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600',
                background: 'rgba(155,89,182,0.2)',
                color: '#9b59b6'
              }}>{classLevels?.length || 0}{t("g_11600c") || ""}</span>
                            </div>
                            <span style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)'
            }}>{t("g_7e6fdf") || "레벨이 있는 수업용"}</span>
                        </div>
                            <div style={inputRowStyle}>
                                <input type="text" value={newClassLevel} onChange={e => setNewClassLevel(e.target.value)} placeholder={t("g_7198ea") || "레벨 입력 (예: 0, 0.5, 1)"} style={{
              ...improvedInputStyle,
              flex: 1
            }} onKeyDown={e => e.key === 'Enter' && newClassLevel.trim() && document.getElementById('add-level-btn')?.click()} />
                                <button id="add-level-btn" onClick={async () => {
              const val = newClassLevel.trim();
              if (val) {
                if (classLevels?.includes(val)) {
                  alert(t("g_708764") || "이미 존재하는 레벨입니다.");
                  return;
                }
                try {
                  const updated = [...(classLevels || []), val].sort(); // Sort for better UX
                  await storageService.updateClassLevels(updated);
                  setClassLevels(updated);
                  setNewClassLevel('');
                } catch (e) {
                  console.error('Failed to add class level:', e);
                  alert(t("g_061d94") || "수업 레벨 추가 실패");
                }
              }
            }} style={{
              ...improvedActionBtnStyle,
              background: '#9b59b6',
              color: 'white'
            }}>
                                    <Plus size={18} weight="bold" />{t("g_579429") || "Add"}</button>
                            </div>
                        <div style={tagContainerStyle}>
                            {classLevels?.map((level, idx) => <div key={level} style={getTagStyle('level', `lv-${idx}`)} onMouseEnter={() => setHoveredTag(`lv-${idx}`)} onMouseLeave={() => setHoveredTag(null)}>
                                    <span style={{
                fontWeight: '600'
              }}>Lv.{level}</span>
                                    <button onClick={async () => {
                if (window.confirm((t('confirm_delete_level') || `Delete Lv.${level}?`).replace('{level}', level))) {
                  try {
                    const updated = classLevels.filter(l => l !== level);
                    await storageService.updateClassLevels(updated);
                    setClassLevels(updated);
                  } catch (e) {
                    console.error('Failed to delete class level:', e);
                    alert(t("g_aae70b") || "수업 레벨 삭제 실패");
                  }
                }
              }} style={deleteIconBtnStyle}>
                                        <X size={14} weight="bold" />
                                    </button>
                                </div>)}
                        </div>
                    </div>
                </div>
            </div>
        </div>;
};

// Styles
const inputStyle = {
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem'
};
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

// Improved styles
const improvedModalContentStyle = {
  backgroundColor: 'var(--bg-surface)',
  borderRadius: '20px',
  width: '90%',
  maxWidth: '780px',
  maxHeight: '85vh',
  color: 'var(--text-primary)',
  boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
  border: '1px solid rgba(255,255,255,0.1)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
};
const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)'
};
const closeButtonStyle = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '8px',
  transition: 'background 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};
const scrollContainerStyle = {
  padding: '20px 24px',
  overflowY: 'auto',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '20px'
};
const sectionCardStyle = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  padding: '20px'
};
const sectionHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px'
};
const hintTextStyle = {
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
  marginBottom: '14px',
  padding: '8px 12px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '8px',
  borderLeft: '3px solid var(--primary-gold)'
};
const inputRowStyle = {
  display: 'flex',
  gap: '10px',
  marginBottom: '16px'
};
const improvedInputStyle = {
  padding: '12px 16px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.15)',
  backgroundColor: 'rgba(0,0,0,0.2)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  transition: 'all 0.2s ease',
  outline: 'none'
};
const improvedActionBtnStyle = {
  padding: '12px 20px',
  borderRadius: '10px',
  border: 'none',
  background: 'var(--primary-gold)',
  color: 'var(--text-on-primary)',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
  fontSize: '0.95rem',
  textShadow: 'none'
};
const tagContainerStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px'
};
const deleteIconBtnStyle = {
  background: 'rgba(255,71,87,0.35)',
  border: '1px solid rgba(255,71,87,0.5)',
  color: '#ff6b6b',
  cursor: 'pointer',
  padding: '5px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease'
};
export { ScheduleClassEditor, SettingsModal };