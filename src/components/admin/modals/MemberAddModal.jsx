import { useState, useEffect, useMemo, useRef } from 'react';
import { X } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';
import { STUDIO_CONFIG } from '../../../studioConfig';

const MemberAddModal = ({ isOpen, onClose, onSuccess }) => {
    const [pricingConfig, setPricingConfig] = useState(STUDIO_CONFIG.PRICING);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);

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
        subject: '',
        autoStart: true,
        includeToday: false, // [NEW] Option for "Attended today"
        todayClass: null // [NEW] To store matched class info
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

        const { membershipType, selectedOption, duration, paymentMethod, startDate, includeToday } = newMember;
        const category = pricingConfig[membershipType];

        if (!category) return { calculatedPrice: 0, calculatedCredits: 0, calculatedEndDate: '', calculatedProductName: '' };

        const option = category.options.find(opt => opt.id === selectedOption);
        if (!option) return { calculatedPrice: 0, calculatedCredits: 0, calculatedEndDate: '', calculatedProductName: '' };

        let p = 0;
        let c = 0;
        let months = duration;
        let label = option.label;

        // Price Calculation with Cash Price support
        if (paymentMethod === 'cash' && option.cashPrice !== undefined) {
            p = option.cashPrice;
            // [FIX] Preserve credits for cash payments if option defines it
            c = option.credits === 9999 ? 9999 : option.credits * duration;
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

        // [Logic] Deduct 1 credit if today is included
        if (includeToday && c > 0 && c !== 9999) {
            c -= 1;
        }

        const start = new Date(startDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + months);
        end.setDate(end.getDate() - 1);

        return {
            calculatedPrice: p,
            calculatedCredits: c,
            calculatedEndDate: newMember.autoStart ? '첫 출석 시 확정' : (membershipType === 'ttc' && newMember.manualEndDate ? newMember.manualEndDate : end.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })),
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
        if (isSubmitting || isSubmittingRef.current) return;

        isSubmittingRef.current = true;
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
                startDate: newMember.autoStart ? 'TBD' : newMember.startDate,
                endDate: newMember.autoStart ? 'TBD' : newMember.endDate,
                duration: newMember.duration,
                attendanceCount: newMember.includeToday ? 1 : 0, // [NEW] Mark initial attendance
                lastAttendance: newMember.includeToday ? new Date().toISOString() : null,
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
                    date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
                    branchId: newMember.branch
                });
            }

            // [NEW] Automatically add attendance record if "Include Today" is checked
            if (newMember.includeToday) {
                await storageService.addManualAttendance(
                    res.id,
                    new Date().toISOString(),
                    newMember.branch,
                    newMember.todayClass?.title || "등록 당일 수련",
                    newMember.todayClass?.instructor || "시스템 자동"
                );
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
                startDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }), endDate: '', subject: '', autoStart: true,
                includeToday: false,
                todayClass: null,
                manualEndDate: ''
            });
        } catch (err) {
            console.error('Error adding member:', err);
            alert('회원 등록 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'center' }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                margin: 'auto',
                padding: '28px',
                borderRadius: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div className="modal-header">
                    <h2 className="modal-title">회원 등록</h2>
                    <button onClick={onClose} style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={24} weight="bold" />
                    </button>
                </div>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="form-label" style={{ marginBottom: '6px' }}>이름</label>
                    <input className="form-input" style={{ fontFamily: 'var(--font-main)', padding: '14px 18px', fontSize: '1.1rem' }} value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} lang="ko" inputMode="text" autoComplete="name" spellCheck="false" autoCorrect="off" placeholder="회원 이름 입력" />
                </div>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="form-label" style={{ marginBottom: '6px' }}>전화번호</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ padding: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-main)', fontWeight: 'bold' }}>010</span>
                        <input
                            className="form-input"
                            style={{ flex: 1, fontFamily: 'var(--font-main)', padding: '14px 18px', fontSize: '1.1rem' }}
                            placeholder="뒷자리 8자리 숫자"
                            maxLength={8}
                            inputMode="numeric"
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
                        style={{ fontFamily: 'var(--font-main)' }}
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
                        style={{ fontFamily: 'var(--font-main)' }}
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
                        style={{ fontFamily: 'var(--font-main)' }}
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
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {[1, 3, 6].map(m => (
                                        <button
                                            key={m}
                                            className={`action-btn ${newMember.duration === m ? 'primary' : ''}`}
                                            style={{ flex: 1, opacity: newMember.duration === m ? 1 : 0.4, padding: '14px 0', fontSize: '1rem', fontWeight: 'bold' }}
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
                        <div style={{ position: 'relative' }}>
                            <input
                                type="date"
                                className="form-input"
                                style={{ width: '100%', fontFamily: 'var(--font-main)', cursor: 'pointer' }}
                                value={newMember.regDate}
                                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                onChange={e => setNewMember({ ...newMember, regDate: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>수련 시작일</span>
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <label style={{
                                    flex: 1,
                                    padding: '12px 8px',
                                    borderRadius: '10px',
                                    background: newMember.autoStart ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${newMember.autoStart ? 'var(--primary-gold)' : 'transparent'}`,
                                    fontSize: '0.8rem',
                                    color: newMember.autoStart ? 'var(--primary-gold)' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: newMember.autoStart ? 'bold' : 'normal'
                                }}>
                                    <input
                                        type="checkbox"
                                        style={{ width: '16px', height: '16px' }}
                                        checked={newMember.autoStart}
                                        onChange={e => setNewMember({
                                            ...newMember,
                                            autoStart: e.target.checked,
                                            includeToday: e.target.checked ? false : newMember.includeToday
                                        })}
                                    />
                                    첫 출석일 시작
                                </label>
                                <label style={{
                                    flex: 1,
                                    padding: '12px 8px',
                                    borderRadius: '10px',
                                    background: newMember.includeToday ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${newMember.includeToday ? '#4CAF50' : 'transparent'}`,
                                    fontSize: '0.8rem',
                                    color: newMember.includeToday ? '#4CAF50' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: newMember.includeToday ? 'bold' : 'normal'
                                }}>
                                    <input
                                        type="checkbox"
                                        style={{ width: '16px', height: '16px' }}
                                        checked={newMember.includeToday}
                                        onChange={async (e) => {
                                            const isChecked = e.target.checked;
                                            let matchedClass = null;

                                            if (isChecked) {
                                                try {
                                                    matchedClass = await storageService.getCurrentClass(newMember.branch);
                                                } catch (err) {
                                                    console.error("Failed to fetch today's class during registration", err);
                                                }
                                            }

                                            setNewMember({
                                                ...newMember,
                                                includeToday: isChecked,
                                                todayClass: matchedClass,
                                                autoStart: isChecked ? false : newMember.autoStart,
                                                startDate: isChecked ? new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) : newMember.startDate
                                            });
                                        }}
                                    />
                                    오늘 수련 포함
                                </label>
                            </div>

                            {/* [IMPORTANT] Conditionally hide the date input for cleaner UI */}
                            {!newMember.autoStart && !newMember.includeToday ? (
                                <input
                                    type="date"
                                    className="form-input fade-in"
                                    style={{ width: '100%', cursor: 'pointer' }}
                                    value={newMember.startDate}
                                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                    onChange={e => setNewMember({ ...newMember, startDate: e.target.value })}
                                />
                            ) : (
                                <div style={{ height: '0', overflow: 'hidden' }}>
                                    {/* Invisible but present to avoid layout jumps if needed, 
                                        though conditional rendering is usually cleaner. 
                                        User asked to 'remove' show, so we render null or hidden. */}
                                </div>
                            )}

                            {newMember.includeToday && (
                                <div className="fade-in" style={{ fontSize: '0.75rem', padding: '10px', background: 'rgba(76,175,80,0.1)', borderRadius: '8px', color: '#81C784', border: '1px solid rgba(76,175,80,0.2)' }}>
                                    ✨ {newMember.todayClass ? `매칭: ${newMember.todayClass.title}` : '매칭: 자율수련'} (-1회)
                                </div>
                            )}
                        </div>
                    </div>
                    {/* [NEW] TTC End Date Selection for New Member */}
                    {newMember.membershipType === 'ttc' && (
                        <div className="form-group">
                            <label className="form-label" style={{ color: '#f59e0b' }}>✓ 종료일 수동 지정 (TTC)</label>
                            <input
                                type="date"
                                className="form-input fade-in"
                                style={{ width: '100%', cursor: 'pointer', borderColor: '#f59e0b', color: '#f59e0b' }}
                                value={newMember.manualEndDate || ''}
                                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                onChange={e => setNewMember({ ...newMember, manualEndDate: e.target.value })}
                            />
                        </div>
                    )}
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
                            const showCash = p.id === 'card' || (isSubscription && newMember.duration >= 3) || !isSubscription;

                            if (!showCash) return null;

                            return (
                                <button
                                    key={p.id}
                                    className={`action-btn ${newMember.paymentMethod === p.id ? 'primary' : ''}`}
                                    style={{ flex: 1, padding: '14px 0', fontSize: '1rem', fontWeight: 'bold' }}
                                    onClick={() => setNewMember({ ...newMember, paymentMethod: p.id })}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="form-group" style={{ background: 'rgba(212,175,55,0.08)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.2)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>결제 금액</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                className="form-input"
                                style={{
                                    fontSize: '1.4rem',
                                    fontWeight: '900',
                                    color: 'var(--primary-gold)',
                                    letterSpacing: '-0.02em',
                                    background: 'transparent',
                                    border: 'none',
                                    textAlign: 'right',
                                    width: '150px',
                                    padding: 0,
                                    height: 'auto'
                                }}
                                value={newMember.amount.toLocaleString()}
                                onChange={(e) => {
                                    const rawValue = e.target.value.replace(/[^0-9]/g, '');
                                    setNewMember({ ...newMember, amount: Number(rawValue) });
                                }}
                            />
                            <span style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--primary-gold)' }}>원</span>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '12px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                        <span style={{ fontWeight: 600 }}>{newMember.credits > 200 ? '무제한 수련' : `총 ${newMember.credits}회`}</span>
                        <span style={{ color: 'var(--primary-gold)', fontWeight: '800' }}>마감: {newMember.endDate}</span>
                    </div>
                </div>

                <div className="modal-actions" style={{ gap: '12px', marginTop: '10px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '18px 0', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>취소</button>
                    <button onClick={handleAddMember} className="action-btn primary" style={{ flex: 2, padding: '18px 0', fontSize: '1.1rem', fontWeight: '800', borderRadius: '16px', boxShadow: '0 10px 20px rgba(212, 175, 55, 0.2)' }} disabled={isSubmitting}>
                        {isSubmitting ? '처리 중...' : '회원 등록 완료'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MemberAddModal;
