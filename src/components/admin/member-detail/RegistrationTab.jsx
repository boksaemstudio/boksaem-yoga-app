import { useState, useEffect, useMemo, useRef } from 'react';
import CustomDatePicker from '../../common/CustomDatePicker';

const RegistrationTab = ({ pricingConfig, member, onAddSalesRecord, onUpdateMember }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);

    // Renew State
    const [membershipType, setMembershipType] = useState(() => member.membershipType || Object.keys(pricingConfig || {}).find(k => k !== '_meta') || 'general');
    const [selectedOption, setSelectedOption] = useState('');
    const [duration, setDuration] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState('card');
    
    // [Smart Date Logic] — "첫 출석일 시작" 체크박스 (MemberAddModal 통일)
    const [autoStart, setAutoStart] = useState(true);
    const [startDate, setStartDate] = useState(() => {
        const today = new Date();
        const end = member.endDate ? new Date(member.endDate) : null;

        if (end && end >= new Date(today.setHours(0, 0, 0, 0))) {
            const restartDate = new Date(end);
            restartDate.setDate(restartDate.getDate() + 1);
            return restartDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        }
        return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    });

    // durationMonths is now derived from useMemo below, no longer a separate state

    // Computed
    const [price, setPrice] = useState(0);
    const [notesText, setNotesText] = useState(member?.notes || '');
    const [customEndDate, setCustomEndDate] = useState('');
    const [customCredits, setCustomCredits] = useState(0);

    // Init Logic & Changed Membership Type hook
    useEffect(() => {
        if (pricingConfig && pricingConfig[membershipType] && pricingConfig[membershipType].options.length > 0) {
            // [FIX] 1회권(credits === 1 && type === 'ticket') 제외한 첫 옵션 선택
            const filteredOpts = pricingConfig[membershipType].options.filter(opt => !(opt.type === 'ticket' && opt.credits === 1));
            setSelectedOption(filteredOpts[0]?.id || '');
        }
    }, [membershipType, pricingConfig]);

    // Calculation Logic - Use useMemo for derived values
    // [FIX] durationMonths를 useMemo 반환값으로 이동 (setState in useMemo 안티패턴 제거)
    const { calculatedPrice, calculatedCredits, calculatedEndDate, calculatedProductName, durationMonths } = useMemo(() => {
        const empty = { calculatedPrice: 0, calculatedCredits: 0, calculatedEndDate: '', calculatedProductName: '', durationMonths: 1 };
        if (!pricingConfig) return empty;

        const category = pricingConfig[membershipType];
        if (!category) return empty;

        const option = category.options.find(opt => opt.id === selectedOption);
        if (!option) return empty;

        let p = 0;
        let c = 0;
        let months = duration;
        let label = option.label;

        // [FIX] 이체(transfer)도 현금과 동일한 가격 적용
        const isCashLike = paymentMethod === 'cash' || paymentMethod === 'transfer';

        if (isCashLike && option.cashPrice !== undefined) {
            p = option.cashPrice;
            c = option.credits === 9999 ? 9999 : option.credits * duration;
        } else {
            if (option.type === 'ticket') {
                p = option.basePrice;
                c = option.credits;
                months = option.months || 3;
            } else {
                c = option.credits === 9999 ? 9999 : option.credits * duration;
                if (duration === 1) p = option.basePrice;
                else if (duration === 3) p = isCashLike && option.cashDiscount3 ? option.cashDiscount3 : (option.discount3 || (option.basePrice * 3));
                else if (duration === 6) p = isCashLike && option.cashDiscount6 ? option.cashDiscount6 : (option.discount6 || (option.basePrice * 6));
                else p = option.basePrice * duration;
            }

            if (isCashLike && duration >= 3 && p > 0 && !option.cashPrice && !option.cashDiscount3 && !option.cashDiscount6) {
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
            calculatedProductName: `${label} ${duration > 1 && option.type !== 'ticket' ? `(${duration}개월)` : ''}`,
            durationMonths: months
        };
    }, [membershipType, selectedOption, duration, paymentMethod, startDate, pricingConfig]);

    useEffect(() => { setPrice(calculatedPrice); }, [calculatedPrice]);
    useEffect(() => { setCustomEndDate(calculatedEndDate); }, [calculatedEndDate]);
    useEffect(() => { setCustomCredits(calculatedCredits); }, [calculatedCredits]);

    // [INFO] 선등록 여부 확인 — credits=0이면 수강권 소진 상태이므로 선등록(TBD) 처리하지 않음
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const isAdvance = member.endDate && new Date(member.endDate) >= new Date(todayStr) && (member.credits || 0) > 0;

    // Computed Info for TBD mode
    const finalStartDate = (isAdvance && autoStart) ? 'TBD' : startDate;
    const finalEndDate = (isAdvance && autoStart) ? 'TBD' : customEndDate;

    const handleRenew = async () => {
        if (isSubmitting) return;
        
        let confirmMsg = `${calculatedProductName}\n금액: ${price.toLocaleString()}원\n\n등록하시겠습니까?`;
        if (!confirm(confirmMsg)) return;

        isSubmittingRef.current = true;
        setIsSubmitting(true);
        try {
            const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

            const salesData = {
                memberId: member.id,
                memberName: member.name,
                type: 'register',
                item: calculatedProductName,
                amount: price,
                paymentMethod: paymentMethod,
                date: today,
                startDate: finalStartDate,
                endDate: finalEndDate,
            };

            if (onAddSalesRecord) await onAddSalesRecord(salesData);

            const updateData = {};
            if (isAdvance) {
                updateData.upcomingMembership = {
                    membershipType: membershipType,
                    credits: customCredits,
                    startDate: finalStartDate,
                    endDate: finalEndDate,
                    durationMonths: durationMonths,
                    price: price
                };
                updateData.lastPaymentDate = new Date().toISOString();
                updateData.price = price;
                if (notesText !== (member.notes || '')) updateData.notes = notesText;
            } else {
                updateData.membershipType = membershipType;
                updateData.credits = customCredits;
                updateData.startDate = finalStartDate;
                updateData.endDate = finalEndDate;
                updateData.lastPaymentDate = new Date().toISOString();
                updateData.price = price;
                if (notesText !== (member.notes || '')) updateData.notes = notesText;
            }

            await onUpdateMember(member.id, updateData);
            
            alert('등록이 완료되었습니다.');
        } catch (err) {
            console.error('Registration error:', err);
            alert('등록 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* 회원권 종류 */}
            <div className="form-group">
                <label className="form-label">회원권 종류</label>
                <select
                    className="form-select"
                    style={{ fontFamily: 'var(--font-main)' }}
                    value={membershipType}
                    onChange={e => {
                        const newType = e.target.value;
                        // [FIX] 1회권 제외한 첫 옵션 선택
                        const filteredOpts = (pricingConfig[newType]?.options || []).filter(opt => !(opt.type === 'ticket' && opt.credits === 1));
                        const firstOptionId = filteredOpts[0]?.id || '';
                        setMembershipType(newType);
                        setSelectedOption(firstOptionId);
                        setDuration(1);
                    }}
                >
                    {pricingConfig && Object.entries(pricingConfig).filter(([key]) => key !== '_meta').map(([key, conf]) => (
                        <option key={key} value={key}>{conf.label || key}</option>
                    ))}
                </select>
            </div>

            {/* 세부 옵션 */}
            <div className="form-group">
                <label className="form-label">세부 옵션</label>
                <select
                    className="form-select"
                    style={{ fontFamily: 'var(--font-main)' }}
                    value={selectedOption}
                    onChange={e => setSelectedOption(e.target.value)}
                >
                    {pricingConfig?.[membershipType]?.options
                        ?.filter(opt => !(opt.type === 'ticket' && opt.credits === 1))
                        .map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* 등록 기간 */}
            {(() => {
                const option = pricingConfig?.[membershipType]?.options?.find(opt => opt.id === selectedOption);
                if (option && option.type === 'subscription') {
                    return (
                        <div className="form-group">
                            <label className="form-label">등록 기간</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[1, 3, 6].map(m => (
                                    <button
                                        key={m}
                                        className={`action-btn ${duration === m ? 'primary' : ''}`}
                                        style={{ flex: 1, opacity: duration === m ? 1 : 0.4, padding: '14px 0', fontSize: '1rem', fontWeight: 'bold' }}
                                        onClick={() => setDuration(m)}
                                    >
                                        {m}개월
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                }
                return null;
            })()}

            {/* 결제 방식 */}
            <div className="form-group">
                <label className="form-label">결제 방식</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {[
                        { id: 'card', label: '카드' },
                        { id: 'cash', label: '현금' },
                        { id: 'transfer', label: '이체' }
                    ].map(p => (
                        <button
                            key={p.id}
                            className={`action-btn ${paymentMethod === p.id ? 'primary' : ''}`}
                            style={{ flex: 1, padding: '14px 0', fontSize: '1rem', fontWeight: 'bold' }}
                            onClick={() => setPaymentMethod(p.id)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 수련 시작일 */}
            <div className="form-group">
                <label className="form-label">수련 시작일</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* 첫 출석일 시작 체크박스 — 선등록 시에만 표시 */}
                    {isAdvance && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{
                                padding: '12px 16px',
                                borderRadius: '10px',
                                background: autoStart ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${autoStart ? 'var(--primary-gold)' : 'transparent'}`,
                                fontSize: '0.85rem',
                                color: autoStart ? 'var(--primary-gold)' : 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: autoStart ? 'bold' : 'normal',
                                flex: 1
                            }}>
                                <input
                                    type="checkbox"
                                    style={{ width: '16px', height: '16px' }}
                                    checked={autoStart}
                                    onChange={e => setAutoStart(e.target.checked)}
                                />
                                🧘‍♀️ 기존 마감 후 첫 출석 시 시작
                            </label>
                            <div className="tooltip-container" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                                <div style={{
                                    width: '18px', height: '18px', borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '11px', fontWeight: 'bold'
                                }}>i</div>
                                <div className="tooltip-text" style={{ width: '220px', left: 'auto', right: 0, transform: 'translateX(0)' }}>
                                    <strong>자동 시작 로직</strong><br />
                                    현재 이용 중인 회원권이 모두 소진되거나 만료된 후, <strong>가장 처음 출석하는 날짜</strong>를 기준으로 새 회원권의 시작일과 만료일이 자동으로 세팅됩니다.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 날짜 입력 */}
                    {autoStart && isAdvance ? (
                        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', fontSize: '0.9rem' }}>
                            첫 출석일에 시작일/마감일 자동 확정
                        </div>
                    ) : (
                        <input
                            type="date"
                            className="form-input"
                            style={{ width: '100%', fontFamily: 'var(--font-main)', cursor: 'pointer' }}
                            value={startDate}
                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    )}

                    {/* 마감일(종료일) 수정 */}
                    <div style={{ marginTop: '4px' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            <span>마감일(종료일) 수정</span>
                            {autoStart && isAdvance && <span style={{ color: 'var(--primary-gold)' }}>*첫 출석 시 조정됨</span>}
                        </label>
                        <input
                            type="date"
                            className="form-input"
                            style={{ width: '100%', cursor: autoStart && isAdvance ? 'not-allowed' : 'pointer', opacity: autoStart && isAdvance ? 0.6 : 1 }}
                            value={autoStart && isAdvance ? '' : customEndDate}
                            disabled={autoStart && isAdvance}
                            onClick={(e) => !(autoStart && isAdvance) && e.target.showPicker && e.target.showPicker()}
                            onChange={e => setCustomEndDate(e.target.value)}
                        />
                    </div>

                    {/* 선등록 안내 */}
                    {isAdvance && (
                        <div style={{
                            fontSize: '0.75rem', padding: '10px',
                            background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px',
                            color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.15)'
                        }}>
                            ℹ️ 잔여 기간이 남아있어 선등록으로 처리됩니다. {autoStart ? '기존 회원권이 모두 소진된 후, 다음 첫 출석 시에 새 회원권이 활성화됩니다.' : '지정하신 수련 시작일이 되면 새 회원권이 자동으로 활성화됩니다.'}
                        </div>
                    )}
                </div>
            </div>

            {/* 원장 메모 */}
            <div className="form-group">
                <label className="form-label" style={{ marginBottom: '6px' }}>원장 메모 (선택)</label>
                <textarea
                    className="form-input"
                    style={{ fontFamily: 'var(--font-main)', padding: '14px 18px', fontSize: '1rem', minHeight: '80px', resize: 'vertical' }}
                    value={notesText}
                    onChange={e => setNotesText(e.target.value)}
                    placeholder="특이사항이나 메모를 입력하세요"
                />
            </div>

            {/* 결제 요약 카드 — MemberAddModal과 동일 스타일 */}
            <div className="form-group" style={{ background: 'rgba(var(--primary-rgb), 0.08)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(var(--primary-rgb), 0.2)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>결제 금액</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                            className="form-input"
                            style={{
                                fontSize: '1.4rem',
                                fontWeight: '900',
                                color: 'var(--primary-gold)',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'right',
                                width: '150px',
                                padding: 0,
                                height: 'auto'
                            }}
                            value={price.toLocaleString()}
                            onChange={(e) => {
                                const rawValue = e.target.value.replace(/[^0-9]/g, '');
                                setPrice(Number(rawValue));
                            }}
                        />
                        <span style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--primary-gold)' }}>원</span>
                    </div>
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                    <span style={{ fontWeight: 600 }}>횟수</span>
                    {customCredits > 200 || customCredits === 9999 ? (
                        <span style={{ fontWeight: 600 }}>무제한</span>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                className="form-input"
                                type="number"
                                style={{
                                    width: '60px', textAlign: 'right', padding: '6px 8px',
                                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '8px', color: 'white', fontSize: '1rem', fontWeight: '700'
                                }}
                                value={customCredits}
                                onChange={(e) => setCustomCredits(Number(e.target.value))}
                            />
                            <span style={{ fontWeight: 600 }}>회</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 등록 버튼 */}
            <button
                onClick={handleRenew}
                disabled={isSubmitting}
                className="action-btn primary"
                style={{
                    padding: '18px 0', fontSize: '1.1rem', fontWeight: '800',
                    borderRadius: '16px', boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.2)',
                    opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    marginTop: '10px'
                }}
            >
                {isSubmitting ? '처리 중...' : '등록 하기'}
            </button>
        </div>
    );
};

export default RegistrationTab;
