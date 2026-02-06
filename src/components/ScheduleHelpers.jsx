import { useState } from 'react';
import { Plus, X } from '@phosphor-icons/react';
import { storageService } from '../services/storage';

const ScheduleClassEditor = ({ cls, idx, dayClasses, setDayClasses, instructors, classTypes, classLevels }) => {
    const editorInputStyle = { ...inputStyle, fontSize: '0.85rem', padding: '6px' };
    
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

    return (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center', backgroundColor: 'var(--bg-input)', padding: '8px', borderRadius: '8px', minWidth: '550px', flexWrap: 'wrap' }}>
            {/* Time Selection: Hour + Minute dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <select
                    value={hour}
                    onChange={(e) => updateTime(e.target.value, minute)}
                    style={{ ...editorInputStyle, width: '60px', textAlign: 'center', fontWeight: '600' }}
                >
                    {hours.map(h => (
                        <option key={h} value={h}>{h}시</option>
                    ))}
                </select>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>:</span>
                <select
                    value={minute}
                    onChange={(e) => updateTime(hour, e.target.value)}
                    style={{ ...editorInputStyle, width: '60px', textAlign: 'center', fontWeight: '600' }}
                >
                    {minutes.map(m => (
                        <option key={m} value={m}>{m}분</option>
                    ))}
                </select>
            </div>
            <select
                value={cls.title}
                onChange={(e) => {
                    const newClasses = [...dayClasses];
                    newClasses[idx].title = e.target.value;
                    setDayClasses(newClasses);
                }}
                style={{ ...editorInputStyle, flex: 2, minWidth: '100px' }}
            >
                {classTypes.map(ct => (
                    <option key={ct} value={ct}>{ct}</option>
                ))}
            </select>
            <select
                value={cls.instructor || ''}
                onChange={(e) => {
                    const newClasses = [...dayClasses];
                    newClasses[idx].instructor = e.target.value;
                    setDayClasses(newClasses);
                }}
                style={{ ...editorInputStyle, width: '85px' }}
            >
                <option value="">선생님</option>
                {/* [UX Fix] Show current value even if not in list */}
                {cls.instructor && !instructors.some(i => (typeof i === 'string' ? i : i.name) === cls.instructor) && (
                    <option value={cls.instructor}>미등록</option>
                )}
                {instructors.map(inst => {
                    const name = typeof inst === 'string' ? inst : inst.name;
                    return <option key={name} value={name}>{name}</option>;
                })}
            </select>
            {(cls.title?.includes('플라잉') || cls.title?.includes('키즈')) && (
                <select
                    value={String(cls.level ?? '')}
                    onChange={(e) => {
                        const newClasses = [...dayClasses];
                        newClasses[idx].level = e.target.value;
                        setDayClasses(newClasses);
                    }}
                    style={{ ...editorInputStyle, width: '70px' }}
                >
                    <option value="">레벨</option>
                    {classLevels?.map(level => (
                        <option key={level} value={level}>Lv.{level}</option>
                    ))}
                </select>
            )}
            <select
                value={cls.status}
                onChange={(e) => {
                    const newClasses = [...dayClasses];
                    newClasses[idx].status = e.target.value;
                    setDayClasses(newClasses);
                }}
                style={{ ...editorInputStyle, width: '70px' }}
            >
                <option value="normal">정상</option>
                <option value="cancelled">휴강</option>
                <option value="changed">변경</option>
            </select>
            <button
                onClick={() => {
                    const newClasses = dayClasses.filter((_, i) => i !== idx);
                    setDayClasses(newClasses);
                }}
                style={{ background: 'rgba(255,71,87,0.2)', border: '1px solid rgba(255,71,87,0.4)', borderRadius: '6px', color: '#ff6b6b', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <X size={16} weight="bold" />
            </button>
        </div>
    );
};


const SettingsModal = ({ show, onClose, instructors, setInstructors, classTypes, setClassTypes, classLevels, setClassLevels }) => {
    const [newInstructor, setNewInstructor] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [editingIdx, setEditingIdx] = useState(null);
    const [editPhone, setEditPhone] = useState('');
    const [newClassType, setNewClassType] = useState('');
    const [newClassLevel, setNewClassLevel] = useState('');
    const [hoveredTag, setHoveredTag] = useState(null);

    // Helper to normalize instructor data (support both string and object formats)
    const normalizeInstructor = (inst) => {
        if (typeof inst === 'string') return { name: inst, phone: '' };
        return { name: inst.name || '', phone: inst.phone || '' };
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
            boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
        };

        const themes = {
            instructor: {
                background: hasPhone 
                    ? 'linear-gradient(135deg, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.15) 100%)'
                    : 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.08) 100%)',
                border: '1px solid rgba(212,175,55,0.4)',
            },
            classType: {
                background: 'linear-gradient(135deg, rgba(0,206,201,0.15) 0%, rgba(0,206,201,0.08) 100%)',
                border: '1px solid rgba(0,206,201,0.4)',
            },
            level: {
                background: 'linear-gradient(135deg, rgba(155,89,182,0.15) 0%, rgba(155,89,182,0.08) 100%)',
                border: '1px solid rgba(155,89,182,0.4)',
            }
        };

        return { ...baseStyle, ...themes[type] };
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={improvedModalContentStyle}>
                {/* Header */}
                <div style={modalHeaderStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.5rem' }}>⚙️</span>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>선생님 & 수업 종류 관리</h3>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={closeButtonStyle}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                        <X size={22} color="var(--text-secondary)" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div style={scrollContainerStyle}>
                    {/* 선생님 관리 섹션 */}
                    <div style={sectionCardStyle}>
                        <div style={sectionHeaderStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.2rem' }}>👩‍🏫</span>
                                <h4 style={{ margin: 0, color: '#d4af37', fontWeight: '600' }}>선생님 목록</h4>
                                <span style={badgeStyle}>{normalizedInstructors.length}명</span>
                            </div>
                        </div>
                        <p style={hintTextStyle}>
                            💡 선생님을 클릭하면 전화번호를 편집할 수 있습니다
                        </p>
                        <div style={inputRowStyle}>
                            <input
                                type="text"
                                value={newInstructor}
                                onChange={(e) => setNewInstructor(e.target.value)}
                                placeholder="선생님 이름"
                                style={{ ...improvedInputStyle, flex: 1 }}
                                onKeyDown={(e) => e.key === 'Enter' && newInstructor.trim() && document.getElementById('add-instructor-btn')?.click()}
                            />
                            <input
                                type="tel"
                                value={newPhone}
                                onChange={(e) => setNewPhone(e.target.value)}
                                placeholder="전화번호 (선택)"
                                style={{ ...improvedInputStyle, flex: 1 }}
                            />
                            <button
                                id="add-instructor-btn"
                                onClick={async () => {
                                    if (newInstructor.trim()) {
                                        const updated = [...normalizedInstructors, { name: newInstructor.trim(), phone: newPhone.trim() }];
                                        await storageService.updateInstructors(updated);
                                        setInstructors(updated);
                                        setNewInstructor('');
                                        setNewPhone('');
                                    }
                                }}
                                style={improvedActionBtnStyle}
                            >
                                <Plus size={18} weight="bold" /> 추가
                            </button>
                        </div>
                        <div style={tagContainerStyle}>
                            {normalizedInstructors.map((inst, idx) => (
                                <div 
                                    key={inst.name} 
                                    style={getTagStyle('instructor', `inst-${idx}`, !!inst.phone)}
                                    onMouseEnter={() => setHoveredTag(`inst-${idx}`)}
                                    onMouseLeave={() => setHoveredTag(null)}
                                >
                                    {editingIdx === idx ? (
                                        <>
                                            <span style={{ fontWeight: '600', color: '#d4af37' }}>{inst.name}</span>
                                            <input
                                                type="tel"
                                                value={editPhone}
                                                onChange={(e) => setEditPhone(e.target.value)}
                                                placeholder="전화번호"
                                                style={{ ...improvedInputStyle, width: '110px', padding: '4px 10px', fontSize: '0.85rem' }}
                                                autoFocus
                                                onKeyDown={(e) => e.key === 'Enter' && document.getElementById(`save-phone-${idx}`)?.click()}
                                            />
                                            <button
                                                id={`save-phone-${idx}`}
                                                onClick={async () => {
                                                    const updated = [...normalizedInstructors];
                                                    updated[idx] = { ...updated[idx], phone: editPhone.trim() };
                                                    await storageService.updateInstructors(updated);
                                                    setInstructors(updated);
                                                    setEditingIdx(null);
                                                }}
                                                style={saveBtnStyle}
                                            >
                                                저장
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span
                                                onClick={() => { setEditingIdx(idx); setEditPhone(inst.phone || ''); }}
                                                style={{ fontWeight: '500' }}
                                                title={inst.phone ? `📞 ${inst.phone}` : '클릭하여 전화번호 입력'}
                                            >
                                                {inst.name}
                                                {inst.phone && <span style={{ fontSize: '0.75rem', marginLeft: '6px', opacity: 0.8 }}>📞</span>}
                                            </span>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`'${inst.name}' 선생님을 삭제하시겠습니까?`)) {
                                                        const updated = normalizedInstructors.filter((_, i) => i !== idx);
                                                        await storageService.updateInstructors(updated);
                                                        setInstructors(updated);
                                                    }
                                                }}
                                                style={deleteIconBtnStyle}
                                            >
                                                <X size={14} weight="bold" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 수업 종류 관리 섹션 */}
                    <div style={sectionCardStyle}>
                        <div style={sectionHeaderStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.2rem' }}>📚</span>
                                <h4 style={{ margin: 0, color: '#00cec9', fontWeight: '600' }}>수업 종류</h4>
                                <span style={{ ...badgeStyle, background: 'rgba(0,206,201,0.2)', color: '#00cec9' }}>{classTypes.length}개</span>
                            </div>
                        </div>
                        <div style={inputRowStyle}>
                            <input
                                type="text"
                                value={newClassType}
                                onChange={(e) => setNewClassType(e.target.value)}
                                placeholder="수업 종류 입력"
                                style={{ ...improvedInputStyle, flex: 1 }}
                                onKeyDown={(e) => e.key === 'Enter' && newClassType.trim() && document.getElementById('add-classtype-btn')?.click()}
                            />
                            <button
                                id="add-classtype-btn"
                                onClick={async () => {
                                    if (newClassType.trim()) {
                                        const updated = [...classTypes, newClassType.trim()];
                                        await storageService.updateClassTypes(updated);
                                        setClassTypes(updated);
                                        setNewClassType('');
                                    }
                                }}
                                style={{ ...improvedActionBtnStyle, background: '#00cec9' }}
                            >
                                <Plus size={18} weight="bold" /> 추가
                            </button>
                        </div>
                        <div style={tagContainerStyle}>
                            {classTypes.map((ct, idx) => (
                                <div 
                                    key={ct} 
                                    style={getTagStyle('classType', `ct-${idx}`)}
                                    onMouseEnter={() => setHoveredTag(`ct-${idx}`)}
                                    onMouseLeave={() => setHoveredTag(null)}
                                >
                                    <span style={{ fontWeight: '500' }}>{ct}</span>
                                    <button
                                        onClick={async () => {
                                            if (window.confirm(`'${ct}' 수업 종류를 삭제하시겠습니까?`)) {
                                                const updated = classTypes.filter(c => c !== ct);
                                                await storageService.updateClassTypes(updated);
                                                setClassTypes(updated);
                                            }
                                        }}
                                        style={deleteIconBtnStyle}
                                    >
                                        <X size={14} weight="bold" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 레벨 관리 섹션 */}
                    <div style={sectionCardStyle}>
                        <div style={sectionHeaderStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.2rem' }}>🎯</span>
                                <h4 style={{ margin: 0, color: '#9b59b6', fontWeight: '600' }}>수업 레벨</h4>
                                <span style={{ ...badgeStyle, background: 'rgba(155,89,182,0.2)', color: '#9b59b6' }}>{classLevels?.length || 0}개</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>플라잉/키즈 수업용</span>
                        </div>
                            <div style={inputRowStyle}>
                                <input
                                    type="text"
                                    value={newClassLevel}
                                    onChange={(e) => setNewClassLevel(e.target.value)}
                                    placeholder="레벨 입력 (예: 0, 0.5, 1)"
                                    style={{ ...improvedInputStyle, flex: 1 }}
                                    onKeyDown={(e) => e.key === 'Enter' && newClassLevel.trim() && document.getElementById('add-level-btn')?.click()}
                                />
                                <button
                                    id="add-level-btn"
                                    onClick={async () => {
                                        const val = newClassLevel.trim();
                                        if (val) {
                                            if (classLevels?.includes(val)) {
                                                alert('이미 존재하는 레벨입니다.');
                                                return;
                                            }
                                            const updated = [...(classLevels || []), val].sort(); // Sort for better UX
                                            await storageService.updateClassLevels(updated);
                                            setClassLevels(updated);
                                            setNewClassLevel('');
                                        }
                                    }}
                                    style={{ ...improvedActionBtnStyle, background: '#9b59b6', color: 'white' }}
                                >
                                    <Plus size={18} weight="bold" /> 추가
                                </button>
                            </div>
                        <div style={tagContainerStyle}>
                            {classLevels?.map((level, idx) => (
                                <div 
                                    key={level} 
                                    style={getTagStyle('level', `lv-${idx}`)}
                                    onMouseEnter={() => setHoveredTag(`lv-${idx}`)}
                                    onMouseLeave={() => setHoveredTag(null)}
                                >
                                    <span style={{ fontWeight: '600' }}>Lv.{level}</span>
                                    <button
                                        onClick={async () => {
                                            if (window.confirm(`Lv.${level}을(를) 삭제하시겠습니까?`)) {
                                                const updated = classLevels.filter(l => l !== level);
                                                await storageService.updateClassLevels(updated);
                                                setClassLevels(updated);
                                            }
                                        }}
                                        style={deleteIconBtnStyle}
                                    >
                                        <X size={14} weight="bold" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Styles
const inputStyle = {
    padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: '0.9rem'
};



const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
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

const badgeStyle = {
    background: 'rgba(212,175,55,0.2)',
    color: '#d4af37',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600'
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
    color: '#1a1a1a',
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

const saveBtnStyle = {
    background: 'linear-gradient(135deg, #d4af37 0%, #c9a227 100%)', 
    border: 'none', 
    color: 'white', 
    cursor: 'pointer', 
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '0.85rem'
};

export { ScheduleClassEditor, SettingsModal };
