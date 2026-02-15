import { useState, useEffect, useMemo, useRef } from 'react';
import CustomDatePicker from '../../common/CustomDatePicker';

const RegistrationTab = ({ pricingConfig, member, onAddSalesRecord, onUpdateMember }) => {
    const [mode, setMode] = useState('renew'); // 'renew' or 'extend'
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);

    // Renew State
    const [membershipType, setMembershipType] = useState('general');
    const [selectedOption, setSelectedOption] = useState('');
    const [duration, setDuration] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState('card');
    // [Smart Date Logic]
    const [startDate, setStartDate] = useState(() => {
        const today = new Date();
        const end = member.endDate ? new Date(member.endDate) : null;

        // If has valid end date and it is in the future (or today)
        if (end && end >= new Date(today.setHours(0, 0, 0, 0))) {
            const restartDate = new Date(end);
            restartDate.setDate(restartDate.getDate() + 1);
            return restartDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        }
        return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    });

    // Computed
    const [price, setPrice] = useState(0);

    // Init Logic
    useEffect(() => {
        if (pricingConfig && pricingConfig.general && pricingConfig.general.options.length > 0) {
            setSelectedOption(pricingConfig.general.options[0].id);
        }
    }, [pricingConfig]);

    // Calculation Logic - Use useMemo for derived values
    const { calculatedPrice, calculatedCredits, calculatedEndDate, calculatedProductName } = useMemo(() => {
        if (mode === 'extend') return { calculatedPrice: 0, calculatedCredits: 0, calculatedEndDate: '', calculatedProductName: '' };
        if (!pricingConfig) return { calculatedPrice: 0, calculatedCredits: 0, calculatedEndDate: '', calculatedProductName: '' };

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
    }, [mode, membershipType, selectedOption, duration, paymentMethod, startDate, pricingConfig]);

    // Update price state separately since it's editable
    useEffect(() => {
        setPrice(calculatedPrice);
    }, [calculatedPrice]);

    const handleRenew = async () => {
        // 중복 클릭 방지
        if (isSubmitting || isSubmittingRef.current) return;
        if (!confirm(`${calculatedProductName}\n금액: ${price.toLocaleString()}원\n\n등록하시겠습니까?`)) return;

        isSubmittingRef.current = true;
        setIsSubmitting(true);
        try {
            const salesData = {
                memberId: member.id,
                memberName: member.name,
                type: 'register',
                item: calculatedProductName,
                amount: price,
                paymentMethod: paymentMethod,
                date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
                startDate: startDate,
                endDate: calculatedEndDate
            };

            if (onAddSalesRecord) await onAddSalesRecord(salesData);

            const updateData = {
                membershipType: membershipType,
                credits: calculatedCredits,
                startDate: startDate,
                endDate: calculatedEndDate,
                lastPaymentDate: new Date().toISOString()
            };

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Toggle Mode */}
            <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '10px' }}>
                {['renew', 'extend'].map(m => (
                    <button
                        key={m} onClick={() => setMode(m)}
                        style={{
                            flex: 1, padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold',
                            background: mode === m ? 'var(--primary-gold)' : 'transparent',
                            color: mode === m ? 'black' : '#71717a'
                        }}
                    >
                        {m === 'renew' ? '시작/재등록' : '기간 연장'}
                    </button>
                ))}
            </div>

            {mode === 'renew' ? (
                <>
                    {/* Membership Type Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        {pricingConfig && Object.entries(pricingConfig).map(([key, conf]) => (
                            <button
                                key={key}
                                onClick={() => setMembershipType(key)}
                                style={{
                                    padding: '15px 5px', borderRadius: '10px', border: '1px solid',
                                    borderColor: membershipType === key ? 'var(--primary-gold)' : 'rgba(255,255,255,0.1)',
                                    background: membershipType === key ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
                                    color: membershipType === key ? 'var(--primary-gold)' : '#a1a1aa',
                                    fontSize: '0.9rem', fontWeight: 'bold'
                                }}
                            >
                                {conf.label || key}
                            </button>
                        ))}
                    </div>

                    {/* Options */}
                    <InputGroup label="수강권 종류" value={selectedOption} onChange={setSelectedOption} type="select"
                        options={pricingConfig?.[membershipType]?.options?.map(o => ({ value: o.id, label: o.label })) || []}
                    />

                    {/* Duration / Payment Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        {(() => {
                            const option = pricingConfig?.[membershipType]?.options?.find(opt => opt.id === selectedOption);
                            if (option && option.type === 'subscription') {
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>등록 기간 (개월)</label>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            {[1, 3, 6].map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setDuration(m)}
                                                    style={{
                                                        flex: 1, padding: '10px 0', borderRadius: '8px', border: '1px solid',
                                                        borderColor: duration === m ? 'var(--primary-gold)' : 'rgba(255,255,255,0.1)',
                                                        background: duration === m ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                                                        color: duration === m ? 'var(--primary-gold)' : '#71717a',
                                                        fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer'
                                                    }}
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            return <div />; // Spacer if no duration choice
                        })()}
                        <InputGroup label="결제 수단" value={paymentMethod} onChange={setPaymentMethod} type="select"
                            options={[{ value: 'card', label: '카드' }, { value: 'cash', label: '현금' }, { value: 'transfer', label: '이체' }]}
                        />
                    </div>

                    <InputGroup label="시작일 (재시작일)" value={startDate} onChange={setStartDate} type="date" />

                    {/* Summary Card */}
                    <div style={{ background: 'rgba(20,20,20,0.5)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ color: '#a1a1aa' }}>예상 종료일</span>
                            <span style={{ color: 'white' }}>{calculatedEndDate}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ color: '#a1a1aa' }}>지급 횟수</span>
                            <span style={{ color: 'white' }}>{calculatedCredits === 9999 ? '무제한' : `${calculatedCredits}회`}</span>
                        </div>
                        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'white', fontWeight: 'bold' }}>결제 금액</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input
                                    type="text"
                                    value={price.toLocaleString()}
                                    onChange={(e) => {
                                        const val = Number(e.target.value.replace(/[^0-9]/g, ''));
                                        setPrice(val);
                                    }}
                                    style={{
                                        background: 'transparent', border: 'none', color: 'var(--primary-gold)',
                                        fontSize: '1.4rem', fontWeight: 'bold', textAlign: 'right', width: '150px'
                                    }}
                                />
                                <span style={{ color: 'var(--primary-gold)', fontSize: '1.4rem', fontWeight: 'bold' }}>원</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleRenew}
                        disabled={isSubmitting}
                        style={{
                            padding: '18px', borderRadius: '12px', border: 'none',
                            background: isSubmitting ? '#555' : 'var(--primary-gold)', color: 'black',
                            fontWeight: 'bold', fontSize: '1.1rem', marginTop: '10px',
                            opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isSubmitting ? '처리 중...' : '등록 하기'}
                    </button>
                </>
            ) : (
                <>
                    <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '10px' }}>만료일 직접 변경</h3>
                    <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '20px' }}>
                        달력을 클릭하여 새로운 만료일을 선택하면 즉시 변경됩니다.
                    </p>

                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                        <label style={{ display: 'block', color: '#a1a1aa', marginBottom: '10px' }}>현재 만료일</label>
                        <div style={{ maxWidth: '300px', margin: '0 auto' }}>
                            <CustomDatePicker
                                value={member.endDate || ''}
                                onChange={async (newDate) => {
                                    if (!newDate) return;
                                    if (confirm(`만료일을 ${newDate}로 변경하시겠습니까?`)) {
                                        const salesData = {
                                            memberId: member.id,
                                            memberName: member.name,
                                            type: 'extend',
                                            item: `만료일 변경 (${member.endDate} -> ${newDate})`,
                                            amount: 0,
                                            paymentMethod: 'none',
                                            date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
                                            memo: '기간 연장/단축'
                                        };

                                        if (onAddSalesRecord) await onAddSalesRecord(salesData);
                                        await onUpdateMember(member.id, { endDate: newDate });
                                        alert('변경되었습니다.');
                                    }
                                }}
                            />
                        </div>
                        <p style={{ marginTop: '10px', fontSize: '0.8rem', color: '#71717a' }}>
                            📅 날짜를 누르면 변경할 수 있습니다.
                        </p>
                    </div>
                </>
            )}
        </div >
    );
};

const InputGroup = ({ label, value, onChange, type = 'text', options = [] }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{label}</label>
        {type === 'text' && (
            <input
                type="text" value={value} onChange={e => onChange(e.target.value)}
                style={inputStyle}
            />
        )}
        {type === 'number' && (
            <input
                type="number" value={value} onChange={e => onChange(e.target.value)}
                style={inputStyle}
            />
        )}
        {type === 'date' && (
            <CustomDatePicker value={value} onChange={onChange} />
        )}
        {type === 'select' && (
            <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
                {options.map(o => <option key={o.value} value={o.value} style={{ color: 'white', background: '#333' }}>{o.label}</option>)}
            </select>
        )}
        {type === 'textarea' && (
            <textarea
                value={value} onChange={e => onChange(e.target.value)}
                style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
            />
        )}
    </div>
);

const inputStyle = {
    padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem'
};

export default RegistrationTab;
