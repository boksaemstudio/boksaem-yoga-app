import { useState } from 'react';
import { Plus, X } from '@phosphor-icons/react';
import { storageService } from '../services/storage';

const ScheduleClassEditor = ({ cls, idx, dayClasses, setDayClasses, instructors, classTypes, classLevels }) => {
    const editorInputStyle = { ...inputStyle, fontSize: '0.85rem', padding: '6px' };
    return (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center', backgroundColor: 'var(--bg-input)', padding: '6px', borderRadius: '8px', minWidth: '550px' }}>
            <input
                type="time"
                value={cls.time}
                onChange={(e) => {
                    const newClasses = [...dayClasses];
                    newClasses[idx].time = e.target.value;
                    setDayClasses(newClasses);
                }}
                style={{ ...editorInputStyle, width: '85px' }}
            />
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
                {instructors.map(inst => {
                    const name = typeof inst === 'string' ? inst : inst.name;
                    return <option key={name} value={name}>{name}</option>;
                })}
            </select>
            {(cls.title?.includes('플라잉') || cls.title?.includes('키즈')) && (
                <select
                    value={cls.level || ''}
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
                style={{ background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer' }}
            >
                <X size={18} weight="bold" />
            </button>
        </div >
    );
};

const SettingsModal = ({ show, onClose, instructors, setInstructors, classTypes, setClassTypes, classLevels, setClassLevels }) => {
    const [newInstructor, setNewInstructor] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [editingIdx, setEditingIdx] = useState(null);
    const [editPhone, setEditPhone] = useState('');
    const [newClassType, setNewClassType] = useState('');
    const [newClassLevel, setNewClassLevel] = useState('');

    // Helper to normalize instructor data (support both string and object formats)
    const normalizeInstructor = (inst) => {
        if (typeof inst === 'string') return { name: inst, phone: '' };
        return { name: inst.name || '', phone: inst.phone || '' };
    };

    const normalizedInstructors = (instructors || []).map(normalizeInstructor);

    if (!show) return null;

    return (
        <div style={modalOverlayStyle}>
            <div style={{ ...modalContentStyle, maxWidth: '750px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ margin: 0 }}>선생님 & 수업 종류 관리</h3>
                        <button
                            onClick={async () => {
                                if (window.confirm("모든 설정을 이미지 분석 기본값으로 초기화하시겠습니까?")) {
                                    const defaultInst = [
                                        { name: '원장', phone: '' }, { name: '미선', phone: '' }, { name: '소영', phone: '' },
                                        { name: '한아', phone: '' }, { name: '정연', phone: '' }, { name: '효원', phone: '' },
                                        { name: '희정', phone: '' }, { name: '보윤', phone: '' }, { name: '은혜', phone: '' },
                                        { name: '혜실', phone: '' }, { name: '세연', phone: '' }, { name: 'anu', phone: '' },
                                        { name: '희연', phone: '' }, { name: '송미', phone: '' }, { name: '성희', phone: '' },
                                        { name: '다나', phone: '' }, { name: '리안', phone: '' }
                                    ];
                                    const defaultTypes = ['하타', '아쉬탕가', '하타+인', '마이솔', '하타 인텐시브', '인요가', '빈야사', '힐링', '플라잉', '임신부요가', '키즈플라잉', '인양요가', '로우플라잉', '하타인텐시브'];
                                    await storageService.updateInstructors(defaultInst);
                                    await storageService.updateClassTypes(defaultTypes);
                                    setInstructors(defaultInst);
                                    setClassTypes(defaultTypes);
                                }
                            }}
                            style={{ ...actionBtnStyle, backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', fontSize: '0.8rem', padding: '4px 8px' }}
                        >
                            기본값으로 초기화
                        </button>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} color="var(--text-secondary)" />
                    </button>
                </div>

                {/* 선생님 관리 */}
                <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ marginBottom: '10px', color: 'var(--primary-gold)' }}>선생님 목록</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        💡 강사를 클릭하면 전화번호를 입력할 수 있습니다
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <input
                            type="text"
                            value={newInstructor}
                            onChange={(e) => setNewInstructor(e.target.value)}
                            placeholder="선생님 이름"
                            style={{ ...inputStyle, flex: 1 }}
                        />
                        <input
                            type="tel"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            placeholder="전화번호 (선택)"
                            style={{ ...inputStyle, flex: 1 }}
                        />
                        <button
                            onClick={async () => {
                                if (newInstructor.trim()) {
                                    const updated = [...normalizedInstructors, { name: newInstructor.trim(), phone: newPhone.trim() }];
                                    await storageService.updateInstructors(updated);
                                    setInstructors(updated);
                                    setNewInstructor('');
                                    setNewPhone('');
                                }
                            }}
                            style={actionBtnStyle}
                        >
                            <Plus size={18} /> 추가
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {normalizedInstructors.map((inst, idx) => (
                            <div key={inst.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'var(--bg-input)', borderRadius: '20px' }}>
                                {editingIdx === idx ? (
                                    <>
                                        <span style={{ fontWeight: 'bold' }}>{inst.name}</span>
                                        <input
                                            type="tel"
                                            value={editPhone}
                                            onChange={(e) => setEditPhone(e.target.value)}
                                            placeholder="전화번호"
                                            style={{ ...inputStyle, width: '120px', padding: '4px 8px', fontSize: '0.85rem' }}
                                            autoFocus
                                        />
                                        <button
                                            onClick={async () => {
                                                const updated = [...normalizedInstructors];
                                                updated[idx] = { ...updated[idx], phone: editPhone.trim() };
                                                await storageService.updateInstructors(updated);
                                                setInstructors(updated);
                                                setEditingIdx(null);
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--primary-gold)', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
                                        >
                                            저장
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span
                                            onClick={() => { setEditingIdx(idx); setEditPhone(inst.phone || ''); }}
                                            style={{ cursor: 'pointer' }}
                                            title={inst.phone ? `📞 ${inst.phone}` : '클릭하여 전화번호 입력'}
                                        >
                                            {inst.name}{inst.phone && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>📞</span>}
                                        </span>
                                        <button
                                            onClick={async () => {
                                                if (window.confirm(`'${inst.name}' 선생님을 삭제하시겠습니까?`)) {
                                                    const updated = normalizedInstructors.filter((_, i) => i !== idx);
                                                    await storageService.updateInstructors(updated);
                                                    setInstructors(updated);
                                                }
                                            }}
                                            style={{ background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', padding: 0 }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 수업 종류 관리 */}
                <div>
                    <h4 style={{ marginBottom: '10px', color: 'var(--primary-gold)' }}>수업 종류 목록</h4>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <input
                            type="text"
                            value={newClassType}
                            onChange={(e) => setNewClassType(e.target.value)}
                            placeholder="수업 종류 입력"
                            style={{ ...inputStyle, flex: 1 }}
                        />
                        <button
                            onClick={async () => {
                                if (newClassType.trim()) {
                                    const updated = [...classTypes, newClassType.trim()];
                                    await storageService.updateClassTypes(updated);
                                    setClassTypes(updated);
                                    setNewClassType('');
                                }
                            }}
                            style={actionBtnStyle}
                        >
                            <Plus size={18} /> 추가
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {classTypes.map(ct => (
                            <div key={ct} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'var(--bg-input)', borderRadius: '20px' }}>
                                <span>{ct}</span>
                                <button
                                    onClick={async () => {
                                        if (window.confirm(`'${ct}' 수업 종류를 삭제하시겠습니까?`)) {
                                            const updated = classTypes.filter(c => c !== ct);
                                            await storageService.updateClassTypes(updated);
                                            setClassTypes(updated);
                                        }
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', padding: 0 }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 레벨 관리 */}
            <div style={{ marginTop: '30px' }}>
                <h4 style={{ marginBottom: '10px', color: 'var(--primary-gold)' }}>레벨 목록 (플라잉/키즈)</h4>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input
                        type="text"
                        value={newClassLevel}
                        onChange={(e) => setNewClassLevel(e.target.value)}
                        placeholder="레벨 입력 (예: 2.5)"
                        style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                        onClick={async () => {
                            if (newClassLevel.trim()) {
                                const updated = [...classLevels, newClassLevel.trim()];
                                await storageService.updateClassLevels(updated);
                                setClassLevels(updated);
                                setNewClassLevel('');
                            }
                        }}
                        style={actionBtnStyle}
                    >
                        <Plus size={18} /> 추가
                    </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {classLevels?.map(level => (
                        <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'var(--bg-input)', borderRadius: '20px' }}>
                            <span>Lv.{level}</span>
                            <button
                                onClick={async () => {
                                    if (window.confirm(`Lv.${level}을(를) 삭제하시겠습니까?`)) {
                                        const updated = classLevels.filter(l => l !== level);
                                        await storageService.updateClassLevels(updated);
                                        setClassLevels(updated);
                                    }
                                }}
                                style={{ background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', padding: 0 }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
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

const actionBtnStyle = {
    padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary-gold)', color: 'white',
    fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
};

const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
};

const modalContentStyle = {
    backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '700px',
    color: 'var(--text-primary)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
};

export { ScheduleClassEditor, SettingsModal };
