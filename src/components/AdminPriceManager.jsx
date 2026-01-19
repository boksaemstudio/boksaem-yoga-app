import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { STUDIO_CONFIG, getBranchName } from '../studioConfig';
import { Plus, PencilLine, Trash, X } from '@phosphor-icons/react';
const AdminPriceManager = () => {
    const [pricing, setPricing] = useState({});
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCategoryKey, setEditingCategoryKey] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const optionsEndRef = React.useRef(null);

    const scrollToBottom = () => {
        if (optionsEndRef.current) {
            optionsEndRef.current.scrollIntoView({ behavior: "smooth" });
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
    }, []);

    const loadPricing = async () => {
        setLoading(true);
        const data = await storageService.getPricing();
        // Ensure data is deep cloned to avoid reference issues
        setPricing(JSON.parse(JSON.stringify(data)));
        setLoading(false);
    };

    const handleEditCategory = (key) => {
        setEditingCategoryKey(key);
        setEditingCategory(JSON.parse(JSON.stringify(pricing[key])));
        setShowEditModal(true);
    };

    const handleDeleteCategory = async (key) => {
        if (!confirm('정말 이 회원권 종류를 삭제하시겠습니까?')) return;

        const newPricing = { ...pricing };
        delete newPricing[key];

        const success = await storageService.savePricing(newPricing);
        if (success) {
            setPricing(newPricing);
            alert('삭제되었습니다.');
        } else {
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    const handleAddNewCategory = () => {
        const newKey = `custom_${Date.now()}`;
        setEditingCategoryKey(newKey);
        setEditingCategory({
            label: '새 회원권',
            branches: ['gwangheungchang', 'mapo'],
            options: [] // Empty options initially
        });
        setShowEditModal(true);
    };

    const handleSaveCategory = async () => {
        if (!editingCategory.label) return alert('회원권 이름을 입력하세요.');

        setIsSubmitting(true);
        const newPricing = { ...pricing, [editingCategoryKey]: editingCategory };

        try {
            const success = await storageService.savePricing(newPricing);
            if (success) {
                setPricing(newPricing);
                setShowEditModal(false);
                alert('저장되었습니다.');
            } else {
                alert('저장 실패');
            }
        } catch (e) {
            console.error(e);
            alert('오류 발생');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Modal Field Handlers ---

    const updateCategoryField = (field, value) => {
        setEditingCategory(prev => ({ ...prev, [field]: value }));
    };

    const toggleBranch = (branchId) => {
        setEditingCategory(prev => {
            const branches = prev.branches || [];
            if (branches.includes(branchId)) {
                return { ...prev, branches: branches.filter(b => b !== branchId) };
            } else {
                return { ...prev, branches: [...branches, branchId] };
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

    const removeOption = (idx) => {
        setEditingCategory(prev => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== idx)
        }));
    };

    const updateOption = (idx, field, value) => {
        setEditingCategory(prev => {
            const newOptions = [...prev.options];
            newOptions[idx] = { ...newOptions[idx], [field]: value };
            return { ...prev, options: newOptions };
        });
    };

    if (loading) return <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>가격표 정보를 불러오는 중...</div>;

    return (
        <div style={{ paddingBottom: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="section-title" style={{ margin: 0 }}>가격표 관리</h3>
                <button
                    onClick={handleAddNewCategory}
                    className="action-btn primary"
                    style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <Plus size={18} weight="bold" /> 새 회원권 추가
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {pricing && Object.entries(pricing).map(([key, category]) => (
                    <div key={key} className="dashboard-card" style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                            <div>
                                <h4 style={{ margin: '0 0 5px 0', color: 'var(--primary-gold)', fontSize: '1.2rem' }}>{category?.label || '이름 없음'}</h4>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    {category?.branches && category.branches.map(b => (
                                        <span key={b} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                                            {getBranchName(b)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => handleEditCategory(key)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <PencilLine size={20} />
                                </button>
                                <button onClick={() => handleDeleteCategory(key)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}>
                                    <Trash size={20} />
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                            {category?.options && category.options.map((opt, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                                    <span>{opt?.label || '옵션명 없음'}</span>
                                    <span style={{ fontWeight: 'bold' }}>{opt?.basePrice?.toLocaleString() || 0}원</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Modal */}
            {showEditModal && editingCategory && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h3>회원권 수정</h3>
                            <button onClick={() => setShowEditModal(false)} className="close-btn"><X size={24} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Basic Info */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', alignItems: 'center' }}>
                                <label>회원권 이름</label>
                                <input
                                    type="text"
                                    className="styled-input"
                                    value={editingCategory.label}
                                    onChange={(e) => updateCategoryField('label', e.target.value)}
                                />

                                <label>적용 지점</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {STUDIO_CONFIG.BRANCHES.map(b => (
                                        <div
                                            key={b.id}
                                            onClick={() => toggleBranch(b.id)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '20px',
                                                border: `1px solid ${editingCategory.branches.includes(b.id) ? 'var(--primary-gold)' : 'rgba(255,255,255,0.2)'}`,
                                                background: editingCategory.branches.includes(b.id) ? 'rgba(212,175,55,0.2)' : 'transparent',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            {b.name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0' }} />

                            {/* Options List */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <h4 style={{ margin: 0 }}>세부 옵션 (기간/횟수)</h4>
                                    <button onClick={addOption} className="action-btn sm" style={{ background: 'rgba(255,255,255,0.1)' }}>+ 옵션 추가</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {editingCategory.options.map((opt, idx) => (
                                        <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                                            <button
                                                onClick={() => removeOption(idx)}
                                                style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}
                                            >
                                                <X size={18} />
                                            </button>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>표시 이름</label>
                                                    <input
                                                        type="text"
                                                        className="styled-input"
                                                        value={opt.label}
                                                        placeholder="예: 1개월 (주2회)"
                                                        onChange={(e) => updateOption(idx, 'label', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>기본 가격</label>
                                                    <input
                                                        type="number"
                                                        className="styled-input"
                                                        value={opt.basePrice}
                                                        onChange={(e) => updateOption(idx, 'basePrice', parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>횟수 (무제한=9999)</label>
                                                    <input
                                                        type="number"
                                                        className="styled-input"
                                                        value={opt.credits}
                                                        onChange={(e) => updateOption(idx, 'credits', parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>유효 기간(개월)</label>
                                                    <input
                                                        type="number"
                                                        className="styled-input"
                                                        value={opt.months}
                                                        onChange={(e) => updateOption(idx, 'months', parseInt(e.target.value) || 1)}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>유형</label>
                                                    <select
                                                        className="styled-select"
                                                        value={opt.type}
                                                        onChange={(e) => updateOption(idx, 'type', e.target.value)}
                                                    >
                                                        <option value="subscription">기간제(월)</option>
                                                        <option value="ticket">횟수권</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Advanced Pricing (Multi-month discounts) - Only for subscriptions */}
                                            {opt.type === 'subscription' && (
                                                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '15px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ fontSize: '0.75rem', opacity: 0.6 }}>3개월 할인가 (선택)</label>
                                                        <input
                                                            type="number"
                                                            className="styled-input"
                                                            style={{ fontSize: '0.9rem', padding: '6px' }}
                                                            value={opt.discount3 || ''}
                                                            placeholder="비어있으면 기본값x3"
                                                            onChange={(e) => updateOption(idx, 'discount3', e.target.value ? parseInt(e.target.value) : undefined)}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ fontSize: '0.75rem', opacity: 0.6 }}>6개월 할인가 (선택)</label>
                                                        <input
                                                            type="number"
                                                            className="styled-input"
                                                            style={{ fontSize: '0.9rem', padding: '6px' }}
                                                            value={opt.discount6 || ''}
                                                            placeholder="비어있으면 기본값x6"
                                                            onChange={(e) => updateOption(idx, 'discount6', e.target.value ? parseInt(e.target.value) : undefined)}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <div ref={optionsEndRef} />
                                </div>
                            </div>

                            <button onClick={handleSaveCategory} className="action-btn primary" disabled={isSubmitting} style={{ width: '100%', marginTop: '10px' }}>
                                {isSubmitting ? '저장 중...' : '저장하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPriceManager;
