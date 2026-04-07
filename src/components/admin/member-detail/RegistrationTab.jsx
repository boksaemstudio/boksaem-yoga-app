import { useState, useEffect, useMemo, useRef } from 'react';
import CustomDatePicker from '../../common/CustomDatePicker';
import { useStudioConfig } from '../../../contexts/StudioContext';
import { storageService } from '../../../services/storage';

const RegistrationTab = ({ pricingConfig, member, onAddSalesRecord, onUpdateMember, onManualAttendance, setActiveTab, setPrefillMessage }) => {
    const { config } = useStudioConfig();
    const branches = config.BRANCHES || [];
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);

    // ─── 즉시 출석 관련 상태 ───
    const [immediateDate, setImmediateDate] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }));
    const [immediateTime, setImmediateTime] = useState(() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    });
    const [immediateBranch, setImmediateBranch] = useState(member.homeBranch || (branches.length > 0 ? branches[0].id : ''));
    // [FIX] 수업 선택값을 '자율수련' 또는 'time__title' 형식의 고유키로 관리
    const [immediateClassKey, setImmediateClassKey] = useState('자율수련');
    const [immediateInstructor, setImmediateInstructor] = useState('');
    const [immediateDailyClasses, setImmediateDailyClasses] = useState([]);

    // Renew State
    const [membershipType, setMembershipType] = useState(() => member.membershipType || Object.keys(pricingConfig || {}).find(k => k !== '_meta') || 'general');
    const [selectedOption, setSelectedOption] = useState('');
    const [duration, setDuration] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState('card');
    
    // [Smart Date Logic] — 3가지 시작일 모드: 'tbd' | 'manual' | 'immediate'
    // [FIX] 만료/소진 회원도 항상 모든 옵션 사용 가능
    const [startDateMode, setStartDateMode] = useState('tbd');
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
            months = duration * (option.months || 1);
        } else {
            if (option.type === 'ticket') {
                p = option.basePrice;
                c = option.credits;
                months = option.months || 3;
            } else {
                c = option.credits === 9999 ? 9999 : option.credits * duration;
                months = duration * (option.months || 1);
                if (duration === 1) p = option.basePrice;
                else if (duration === 3) p = isCashLike && option.cashDiscount3 ? option.cashDiscount3 : (option.discount3 || (option.basePrice * 3));
                else if (duration === 6) p = isCashLike && option.cashDiscount6 ? option.cashDiscount6 : (option.discount6 || (option.basePrice * 6));
                else p = option.basePrice * duration;
            }

            if (isCashLike && duration >= 3 && p > 0 && !option.cashPrice && !option.cashDiscount3 && !option.cashDiscount6) {
                p = Math.round(p * 0.95);
            }
        }

        // [FIX] immediate 모드에서는 immediateDate를 시작일로 사용하여
        // 실제 저장되는 시작일과 종료일 계산 기준이 일치하도록 보장
        const effectiveStartDate = startDateMode === 'immediate' ? immediateDate : startDate;
        const start = new Date(effectiveStartDate + 'T00:00:00+09:00');
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
    }, [membershipType, selectedOption, duration, paymentMethod, startDate, startDateMode, immediateDate, pricingConfig]);

    useEffect(() => { setPrice(calculatedPrice); }, [calculatedPrice]);
    useEffect(() => { setCustomEndDate(calculatedEndDate); }, [calculatedEndDate]);
    useEffect(() => { setCustomCredits(calculatedCredits); }, [calculatedCredits]);

    // ─── 즉시 출석: 선택 날짜/지점의 수업 목록 fetch ───
    useEffect(() => {
        if (startDateMode !== 'immediate' || !immediateBranch || !immediateDate) return;
        const fetchClasses = async () => {
            try {
                const classes = await storageService.getDailyClasses(immediateBranch, null, immediateDate);
                setImmediateDailyClasses(classes || []);
            } catch (err) {
                console.warn('[RegistrationTab] Failed to fetch daily classes:', err);
                setImmediateDailyClasses([]);
            }
        };
        fetchClasses();
    }, [startDateMode, immediateBranch, immediateDate]);

    // ─── 즉시 출석: 수업 옵션 ───
    // [FIX] value를 'time__title' 형식의 고유키로 사용하여 동일 수업명 중복 문제 해결
    const immediateClassOptions = useMemo(() => {
        const options = [{ value: '자율수련', label: '자율수련', time: '', instructor: '', className: '자율수련' }];
        if (immediateDailyClasses.length > 0) {
            immediateDailyClasses.forEach(cls => {
                const time = cls.time || '';
                const title = cls.title || cls.className || '';
                const instructor = cls.instructor || '';
                const parts = [time, title, instructor].filter(Boolean);
                const label = parts.join(' ');
                // 고유키: 시간__수업명 (예: '19:50__하타')
                const uniqueKey = `${time}__${title}`;
                options.push({ value: uniqueKey, label, time, instructor, className: title });
            });
        }
        return options;
    }, [immediateDailyClasses]);

    // ─── 즉시 출석: 지점/날짜 변경 시 수업 선택 초기화 ───
    useEffect(() => {
        setImmediateClassKey('자율수련');
        setImmediateInstructor('');
    }, [immediateBranch, immediateDate]);

    // ─── 즉시 출석: 선택된 수업에서 실제 className, time, instructor 추출 ───
    const selectedClassInfo = useMemo(() => {
        const found = immediateClassOptions.find(opt => opt.value === immediateClassKey);
        if (!found || immediateClassKey === '자율수련') {
            return { className: '자율수련', time: immediateTime, instructor: '', isFreePractice: true };
        }
        return { className: found.className, time: found.time, instructor: found.instructor, isFreePractice: false };
    }, [immediateClassKey, immediateClassOptions, immediateTime]);

    // [INFO] 선등록 여부 확인 — 현재 회원권이 활성 상태인지 체크
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const isAdvance = member.endDate && new Date(member.endDate) >= new Date(todayStr) && (member.credits || 0) > 0;

    // [FIX] startDateMode에 따라 finalStartDate/finalEndDate 결정
    // Computed Info for TBD mode
    const isTbd = startDateMode === 'tbd';
    const isImmediate = startDateMode === 'immediate';
    const finalStartDate = isTbd ? 'TBD' : (isImmediate ? immediateDate : startDate);
    const finalEndDate = isTbd ? 'TBD' : customEndDate;

    const handleRenew = async () => {
        if (isSubmitting || isSubmittingRef.current) return;

        // [FIX] 중복 등록 방지: 동일 memberId + 날짜 + 금액 조합으로 5초 내 재시도 차단
        const idempotencyKey = `reg_${member.id}_${new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })}_${price}`;
        const lastSubmit = sessionStorage.getItem(idempotencyKey);
        if (lastSubmit && (Date.now() - parseInt(lastSubmit)) < 5000) {
            console.warn('[RegistrationTab] Duplicate submission blocked');
            return;
        }
        
        let confirmMsg = `${calculatedProductName}\n금액: ${price.toLocaleString()}원\n\n등록하시겠습니까?`;
        if (!confirm(confirmMsg)) return;

        isSubmittingRef.current = true;
        setIsSubmitting(true);
        sessionStorage.setItem(idempotencyKey, String(Date.now()));
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
                    originalCredits: customCredits, // [FIX] 원래 횟수 기록 (역추적용)
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
                updateData.originalCredits = customCredits; // [FIX] 원래 횟수 기록 (역추적용)
                updateData.startDate = finalStartDate;
                updateData.endDate = finalEndDate;
                updateData.duration = durationMonths; // [FIX] TBD 해소 시 attendance.js가 이 값으로 endDate 계산
                updateData.lastPaymentDate = new Date().toISOString();
                updateData.price = price;
                updateData.attendanceCount = 0; // [FIX] 재등록 시 출석 횟수 리셋 (이전 등록 횟수 잔류 방지)
                updateData.streak = 0;          // [FIX] 연속 출석도 리셋
                if (notesText !== (member.notes || '')) updateData.notes = notesText;
            }

            await onUpdateMember(member.id, updateData);

            // [FIX] 즉시 출석 모드일 때 등록과 동시에 출석 처리 (선택한 시간/수업 사용)
            if (isImmediate && onManualAttendance) {
                try {
                    // [FIX] 선택된 수업의 시간/강사명을 정확하게 전달
                    const finalTime = selectedClassInfo.isFreePractice ? immediateTime : selectedClassInfo.time;
                    const finalClassName = selectedClassInfo.className;
                    const finalInstructor = selectedClassInfo.instructor;
                    await onManualAttendance(immediateDate, finalTime, immediateBranch || member.homeBranch || '', finalClassName, finalInstructor);
                } catch (attErr) {
                    console.error('Auto attendance error:', attErr);
                    // 등록은 성공했으므로 출석 실패는 경고만
                    alert('등록은 완료되었으나, 출석 처리 중 오류가 발생했습니다. 출석부에서 수동으로 처리해주세요.');
                }
            }
            
            // [NEW] Auto-Message Redirect
            if (setPrefillMessage && setActiveTab) {
                const msgLines = [
                    `${member.name} 회원님, 수강권 등록/연장이 확정되었습니다.`,
                    '',
                    `• 등록 항목: ${calculatedProductName}`,
                    `• 등록 상태: ${isAdvance ? '🗓️ 기존 만료 후 적용 (선등록)' : '✅ 진행 중'}`,
                    `• 잔여 횟수: ${customCredits >= 999 ? '무제한 횟수' : customCredits + '회'}`,
                    `• 이용 기간: ${finalStartDate === 'TBD' ? '첫 출석 시 확정' : finalStartDate} ~ ${finalEndDate === 'TBD' ? '첫 출석 시 확정' : finalEndDate}`,
                    '',
                    '오늘도 건강한 하루 보내세요! 🙏'
                ];
                setPrefillMessage(msgLines.join('\n'));
                setTimeout(() => setActiveTab('messages'), 300);
            } else {
                alert(isImmediate ? '등록 및 출석 처리가 완료되었습니다.' : '등록이 완료되었습니다.');
            }
        } catch (err) {
            console.error('Registration error:', err);
            alert(`등록 중 오류가 발생했습니다.\n상세: ${err.message || '알 수 없는 오류'}`);
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
                    {/* 3가지 시작일 모드 선택 */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[
                            { value: 'tbd', label: isAdvance ? '기존 마감 후 첫출석 시' : '첫 출석 시 시작', icon: '🧘‍♀️', desc: '나중에 처음 올 때 자동 시작' },
                            { value: 'manual', label: '시작일 직접 지정', icon: '📅', desc: '원하는 날짜를 직접 입력' },
                            { value: 'immediate', label: '등록 즉시 출석', icon: '⚡', desc: '오늘부터 시작 + 출석 처리' },
                        ].map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setStartDateMode(opt.value)}
                                style={{
                                    flex: 1, minWidth: '120px', padding: '12px 10px',
                                    borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                                    border: `2px solid ${startDateMode === opt.value ? 'var(--primary-gold)' : 'rgba(255,255,255,0.08)'}`,
                                    background: startDateMode === opt.value ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.03)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <div style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{opt.icon}</div>
                                <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: startDateMode === opt.value ? 'var(--primary-gold)' : 'var(--text-primary)', marginBottom: '2px' }}>{opt.label}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>{opt.desc}</div>
                            </button>
                        ))}
                    </div>

                    {/* 모드별 세부 UI */}
                    {startDateMode === 'tbd' && (
                        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', fontSize: '0.9rem' }}>
                            첫 출석일에 시작일/마감일 자동 확정
                        </div>
                    )}
                    {startDateMode === 'manual' && (
                        <input
                            type="date"
                            className="form-input"
                            style={{ width: '100%', fontFamily: 'var(--font-main)', cursor: 'pointer' }}
                            value={startDate}
                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    )}
                    {startDateMode === 'immediate' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)', color: '#4CAF50', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                ✅ {immediateDate} 시작 + 출석 1회 자동 처리
                            </div>
                            {/* 출석 날짜/시간/지점/수업 선택 UI */}
                            <div style={{
                                background: 'rgba(255,255,255,0.05)', padding: '14px', borderRadius: '10px',
                                display: 'flex', flexDirection: 'column', gap: '10px',
                                border: '1px solid rgba(255,255,255,0.08)'
                            }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>📋 출석 정보 선택</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {/* 지점 */}
                                    <select
                                        value={immediateBranch}
                                        onChange={(e) => setImmediateBranch(e.target.value)}
                                        className="form-select"
                                        style={{ flex: 1, minWidth: '90px' }}
                                    >
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                    {/* 날짜 */}
                                    <div style={{ flex: 1.5, minWidth: '130px' }}>
                                        <CustomDatePicker value={immediateDate} onChange={setImmediateDate} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {/* [FIX] 시간 입력: 자율수련일 때만 표시 (스케줄 수업은 시간이 자동 결정) */}
                                    {selectedClassInfo.isFreePractice && (
                                        <input
                                            type="time"
                                            value={immediateTime}
                                            onChange={e => setImmediateTime(e.target.value)}
                                            className="form-input"
                                            style={{ flex: 1, minWidth: '100px', cursor: 'pointer', fontFamily: 'var(--font-main)' }}
                                        />
                                    )}
                                    {/* [FIX] 수업 선택: 고유키(time__title) 사용, 선택 시 시간/강사 자동 반영 */}
                                    <select
                                        value={immediateClassKey}
                                        onChange={(e) => {
                                            const key = e.target.value;
                                            setImmediateClassKey(key);
                                            const matched = immediateClassOptions.find(opt => opt.value === key);
                                            if (matched) {
                                                setImmediateInstructor(matched.instructor || '');
                                            }
                                        }}
                                        className="form-select"
                                        style={{ flex: selectedClassInfo.isFreePractice ? 1.2 : 1, minWidth: '120px' }}
                                    >
                                        {immediateClassOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 마감일(종료일) 입력 파트 */}
                    {startDateMode !== 'tbd' && (
                        <div style={{ marginTop: '4px' }}>
                            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                <span>마감일(종료일)</span>
                            </label>
                            <input
                                type="date"
                                className="form-input"
                                style={{ width: '100%', cursor: 'pointer' }}
                                value={customEndDate}
                                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                onChange={e => setCustomEndDate(e.target.value)}
                            />
                        </div>
                    )}
                    {startDateMode === 'tbd' && (
                        <div style={{ marginTop: '4px' }}>
                            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                <span>마감일(종료일)</span>
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                style={{ width: '100%', cursor: 'not-allowed', color: 'var(--primary-gold)', fontWeight: 'bold', textAlign: 'center', background: 'rgba(255,255,255,0.05)' }}
                                value="첫 출석 시 자동 확정 (선등록)"
                                disabled
                            />
                        </div>
                    )}

                    {/* 안내 메시지 */}
                    {isAdvance && (
                        <div style={{
                            fontSize: '0.75rem', padding: '10px',
                            background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px',
                            color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.15)'
                        }}>
                            ℹ️ 잔여 기간이 남아있어 선등록으로 처리됩니다.
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
