import React, { useState, useEffect, useMemo } from 'react';
import { X } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';
import { STUDIO_CONFIG } from '../../../studioConfig';

const MemberAddModal = ({ isOpen, onClose, onSuccess }) => {
    const [pricingConfig, setPricingConfig] = useState(STUDIO_CONFIG.PRICING);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newMember, setNewMember] = useState({
        name: '', phone: '010', branch: STUDIO_CONFIG.BRANCHES[0].id,
        membershipType: 'general',
        selectedOption: '',
        duration: 1,
        paymentMethod: 'card',
        credits: 0,
        amount: 0,
        regDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
        startDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
        endDate: '',
        subject: ''
    });

    useEffect(() => {
        const loadPricing = async () => {
            const data = await storageService.getPricing();
            if (data) setPricingConfig(data);
        };
        if (isOpen) loadPricing();
    }, [isOpen]);

    // [Smart Calculation Logic for New Member]
    const { calculatedPrice, calculatedCredits, calculatedEndDate, calculatedProductName } = useMemo(() => {
        if (!isOpen) return { calculatedPrice: 0, calculatedCredits: 0, calculatedEndDate: '', calculatedProductName: '' };

        const { membershipType, selectedOption, duration, paymentMethod, startDate } = newMember;
        const category = pricingConfig[membershipType];

        if (!category) return { calculatedPrice: 0, calculatedCredits: 0, calculatedEndDate: '', calculatedProductName: '' };

        const option = category.options.find(opt => opt.id === selectedOption);
        if (!option) return { calculatedPrice: 0, calculatedCredits: 0, calculatedEndDate: '', calculatedProductName: '' };

        let p = 0;
        let c = 0;
        let months = duration;
        let label = option.label;

        // Price Calculation with Cash Price support
        if (paymentMethod === 'cash' && option.cashPrice) {
            p = option.cashPrice;
        } else {
            if (option.type === 'ticket') {
                p = option.basePrice;
                c = option.credits;
                months = option.months || 3;
            } else {
                c = option.credits === 9999 ? 9999 : option.credits * duration;
                if (duration === 1) p = option.basePrice;
                else if (duration === 3) p = option.discount3 || (option.basePrice * 3);
                else if (duration === 6) p = option.discount6 || (option.basePrice * 6);
                else p = option.basePrice * duration;
            }

            if (paymentMethod === 'cash' && duration >= 3 && p > 0 && !option.cashPrice) {
                p = Math.round(p * 0.95);
            }
        }

        const start = new Date(startDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + months);
        end.setDate(end.getDate() - 1);

        return {
            calculatedPrice: p,
            calculatedCredits: c,
            calculatedEndDate: end.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
            calculatedProductName: `${label} ${duration > 1 && option.type !== 'ticket' ? `(${duration}개월)` : ''}`
        };
    }, [newMember, pricingConfig, isOpen]);

    // Sync newMember state with calculated values
    useEffect(() => {
        if (!isOpen) return;
        setNewMember(prev => ({
            ...prev,
            amount: calculatedPrice,
            credits: calculatedCredits,
            endDate: calculatedEndDate,
            subject: calculatedProductName
        }));
    }, [calculatedPrice, calculatedCredits, calculatedEndDate, calculatedProductName, isOpen]);

    // Reset membership type when branch changes
    useEffect(() => {
        const availableTypes = Object.keys(pricingConfig).filter(key => {
            const config = pricingConfig[key];
            return !config.branches || config.branches.includes(newMember.branch);
        });

        if (!availableTypes.includes(newMember.membershipType)) {
            const firstValid = availableTypes[0] || 'general';
            const firstOption = pricingConfig[firstValid]?.options[0]?.id || '';

            setNewMember(prev => ({
                ...prev,
                membershipType: firstValid,
                selectedOption: firstOption
            }));
        }
    }, [newMember.branch, newMember.membershipType, isOpen, pricingConfig]);

    const handleAddMember = async () => {
        if (!newMember.name || !newMember.phone) {
            alert('이름과 전화번호는 필수입니다.');
            return;
        }
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const res = await storageService.addMember({
                name: newMember.name,
                phone: newMember.phone,
                credits: newMember.credits,
                homeBranch: newMember.branch,
                subject: newMember.subject,
                amount: newMember.amount,
                membershipType: newMember.membershipType,
                regDate: newMember.regDate,
                startDate: newMember.startDate,
                endDate: newMember.endDate,
                notes: ''
            });

            if (newMember.amount > 0) {
                await storageService.addSalesRecord({
                    memberId: res.id,
                    memberName: newMember.name,
                    type: 'register',
                    item: newMember.subject,
                    amount: newMember.amount,
                    paymentMethod: newMember.paymentMethod,
                    date: new Date().toISOString(),
                    branchId: newMember.branch
                });
            }

            onSuccess();
            onClose();
            // Reset form
            setNewMember({
                name: '', phone: '010', branch: STUDIO_CONFIG.BRANCHES[0].id,
                membershipType: 'general',
                selectedOption: pricingConfig['general']?.options[0]?.id || '',
                duration: 1,
                paymentMethod: 'card',
                credits: 0, amount: 0, regDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
                startDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }), endDate: '', subject: ''
            });
        } catch (err) {
            console.error('Error adding member:', err);
            alert('회원 등록 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">회원 등록</h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>
                <div className="form-group">
                    <label className="form-label">이름</label>
                    <input className="form-input" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} lang="ko" inputMode="text" autoComplete="name" spellCheck="false" autoCorrect="off" />
                </div>
                <div className="form-group">
                    <label className="form-label">전화번호</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--text-secondary)' }}>010</span>
                        <input
                            className="form-input"
                            style={{ flex: 1 }}
                            placeholder=" 나머지 8자리 숫자만 입력"
                            maxLength={8}
                            value={newMember.phone.replace('010', '')}
                            onChange={(e) => {
                                const clean = e.target.value.replace(/[^0-9]/g, '');
                                setNewMember({ ...newMember, phone: '010' + clean });
                            }}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">지점</label>
                    <select
                        className="form-select"
                        value={newMember.branch}
                        onChange={(e) => {
                            const nextBranch = e.target.value;
                            setNewMember({ ...newMember, branch: nextBranch });
                        }}
                    >
                        {STUDIO_CONFIG.BRANCHES.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">회원권 종류</label>
                    <select
                        className="form-select"
                        value={newMember.membershipType}
                        onChange={e => {
                            const newType = e.target.value;
                            const firstOptionId = pricingConfig[newType].options[0].id;
                            setNewMember({ ...newMember, membershipType: newType, selectedOption: firstOptionId, duration: 1 });
                        }}
                    >
                        {Object.entries(pricingConfig)
                            .filter(([, value]) => !value.branches || value.branches.includes(newMember.branch))
                            .map(([key, value]) => (
                                <option key={key} value={key}>{value.label}</option>
                            ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">세부 옵션</label>
                    <select
                        className="form-select"
                        value={newMember.selectedOption}
                        onChange={e => setNewMember({ ...newMember, selectedOption: e.target.value })}
                    >
                        {pricingConfig[newMember.membershipType]?.options.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {(() => {
                    const currentOption = pricingConfig[newMember.membershipType]?.options.find(o => o.id === newMember.selectedOption);
                    if (currentOption && currentOption.type === 'subscription') {
                        return (
                            <div className="form-group">
                                <label className="form-label">등록 기간</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {[1, 3, 6].map(m => (
                                        <button
                                            key={m}
                                            className={`action-btn ${newMember.duration === m ? 'primary' : ''}`}
                                            style={{ flex: 1, opacity: newMember.duration === m ? 1 : 0.5 }}
                                            onClick={() => setNewMember({ ...newMember, duration: m })}
                                        >
                                            {m}개월
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )
                    }
                    return null;
                })()}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="form-group">
                        <label className="form-label">등록일</label>
                        <input type="date" className="form-input" value={newMember.regDate} onChange={e => setNewMember({ ...newMember, regDate: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">수련 시작일</label>
                        <input type="date" className="form-input" value={newMember.startDate} onChange={e => setNewMember({ ...newMember, startDate: e.target.value })} />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">결제 방식</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {[
                            { id: 'card', label: '카드' },
                            { id: 'cash', label: '현금' }
                        ].map(p => {
                            const pricingInfo = pricingConfig[newMember.membershipType];
                            const selectedOpt = pricingInfo?.options?.find(o => o.id === newMember.selectedOption);
                            const isSubscription = selectedOpt?.type === 'subscription';
                            // Logic: Show cash if card (always), or if subscrip >= 3month, or if not subscrip (tickets)
                            // Basically hide cash for 1 month subscription? (As per dashboard logic: duration >= 3 && p > 0 && !cashPrice)
                            // Let's just always show cash but apply discount logic in memo
                            // Wait, dashboard said:
                            const showCash = p.id === 'card' || (isSubscription && newMember.duration >= 3) || !isSubscription;

                            if (!showCash) return null;

                            return (
                                <button
                                    key={p.id}
                                    className={`action-btn ${newMember.paymentMethod === p.id ? 'primary' : ''}`}
                                    style={{ flex: 1, opacity: newMember.paymentMethod === p.id ? 1 : 0.5 }}
                                    onClick={() => setNewMember({ ...newMember, paymentMethod: p.id })}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="form-group" style={{ background: 'rgba(212,175,55,0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary-gold)' }}>
                            {newMember.amount.toLocaleString()}원
                        </div>
                    </div>
                    <div style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '10px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                        <span>{newMember.credits > 200 ? '무제한 수련' : `총 ${newMember.credits}회`}</span>
                        <span style={{ color: 'var(--primary-gold)', fontWeight: 'bold' }}>마감일: {newMember.endDate}</span>
                    </div>
                </div>

                <div className="modal-actions">
                    <button onClick={onClose} style={{ padding: '10px 20px', color: 'var(--text-secondary)' }}>취소</button>
                    <button onClick={handleAddMember} className="action-btn primary">등록하기</button>
                </div>
            </div>
        </div>
    );
};

export default MemberAddModal;
