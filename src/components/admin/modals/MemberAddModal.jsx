import { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { X } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';
import { useStudioConfig } from '../../../contexts/StudioContext';
const MemberAddModal = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const branches = config.BRANCHES || [];
  const [pricingConfig, setPricingConfig] = useState(config.PRICING || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [dailyClasses, setDailyClasses] = useState([]);
  const [newMember, setNewMember] = useState({
    name: '',
    phone: '010',
    branch: branches.length > 0 ? branches[0].id : '',
    membershipType: Object.keys(config.PRICING || {}).find(k => k !== '_meta') || 'general',
    selectedOption: '',
    duration: 1,
    paymentMethod: 'card',
    credits: 0,
    amount: 0,
    regDate: new Date().toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Seoul'
    }),
    startDate: new Date().toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Seoul'
    }),
    endDate: '',
    subject: '',
    autoStart: false,
    includeToday: false,
    // [NEW] Option for "Attended today"
    todayClass: null,
    // [NEW] To store matched class info
    notes: '' // [NEW] Member notes
  });
  useEffect(() => {
    const loadPricing = async () => {
      const data = await storageService.getPricing();
      if (data) setPricingConfig(data);
    };
    if (isOpen) loadPricing();
  }, [isOpen]);

  // [NEW] 선택 지점의 오늘 수업 목록 가져오기
  useEffect(() => {
    const fetchClasses = async () => {
      if (!isOpen || !newMember.branch) return;
      try {
        const today = new Date().toLocaleDateString('sv-SE', {
          timeZone: 'Asia/Seoul'
        });
        const classes = await storageService.getDailyClasses(newMember.branch, null, today);
        setDailyClasses(classes || []);
      } catch (err) {
        console.warn('[MemberAddModal] Failed to fetch daily classes:', err);
        setDailyClasses([]);
      }
    };
    fetchClasses();
  }, [isOpen, newMember.branch]);

  // [Smart Calculation Logic for New Member]
  const {
    calculatedPrice,
    calculatedCredits,
    calculatedEndDate,
    calculatedRealEndDate,
    calculatedProductName,
    durationMonths
  } = useMemo(() => {
    if (!isOpen) return {
      calculatedPrice: 0,
      calculatedCredits: 0,
      calculatedEndDate: '',
      calculatedRealEndDate: '',
      calculatedProductName: '',
      durationMonths: 1
    };
    const {
      membershipType,
      selectedOption,
      duration,
      paymentMethod,
      startDate,
      includeToday
    } = newMember;
    const category = pricingConfig[membershipType];
    if (!category) return {
      calculatedPrice: 0,
      calculatedCredits: 0,
      calculatedEndDate: '',
      calculatedRealEndDate: '',
      calculatedProductName: '',
      durationMonths: 1
    };
    const option = category.options.find(opt => opt.id === selectedOption);
    if (!option) return {
      calculatedPrice: 0,
      calculatedCredits: 0,
      calculatedEndDate: '',
      calculatedRealEndDate: '',
      calculatedProductName: '',
      durationMonths: 1
    };
    let p = 0;
    let c = 0;
    let months = duration;
    let label = option.label;
    let fallbackMonths = 1;
    if (option.label) {
      const match = option.label.match(/(\d+)개월/);
      if (match) fallbackMonths = parseInt(match[1], 10);
    }

    // Price Calculation with Cash/Transfer Price support
    // [FIX] 이체(transfer)도 현금과 동일한 가격 적용
    const isCashLike = paymentMethod === 'cash' || paymentMethod === 'transfer';
    if (isCashLike && option.cashPrice !== undefined) {
      p = option.cashPrice;
      // [FIX] Preserve credits for cash payments if option defines it
      c = option.credits === 9999 ? 9999 : option.credits * duration;
      months = duration * (option.months && option.months > 1 ? option.months : fallbackMonths);
    } else {
      if (option.type === 'ticket') {
        p = option.basePrice;
        c = option.credits;
        months = option.months || fallbackMonths > 1 ? fallbackMonths : 3;
      } else {
        c = option.credits === 9999 ? 9999 : option.credits * duration;
        months = duration * (option.months && option.months > 1 ? option.months : fallbackMonths);
        if (duration === 1) p = option.basePrice;else if (duration === 3) p = isCashLike && option.cashDiscount3 ? option.cashDiscount3 : option.discount3 || option.basePrice * 3;else if (duration === 6) p = isCashLike && option.cashDiscount6 ? option.cashDiscount6 : option.discount6 || option.basePrice * 6;else p = option.basePrice * duration;
      }
      if (isCashLike && duration >= 3 && p > 0 && !option.cashPrice && !option.cashDiscount3 && !option.cashDiscount6) {
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
    const realEnd = end.toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Seoul'
    });
    return {
      calculatedPrice: p,
      calculatedCredits: c,
      calculatedEndDate: newMember.autoStart ? t("g_b8e060") || "\uCCAB \uCD9C\uC11D \uC2DC \uD655\uC815" : newMember.manualEndDate ? newMember.manualEndDate : realEnd,
      calculatedRealEndDate: newMember.manualEndDate ? newMember.manualEndDate : realEnd,
      calculatedProductName: `${label} ${duration > 1 && option.type !== 'ticket' ? `(${duration}개월)` : ''}`,
      durationMonths: months // [FIX] 실제 계산된 유효기간(개월) — ticket/subscription 무관하게 정확한 값
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
      realEndDate: calculatedRealEndDate,
      subject: calculatedProductName,
      manualEndDate: '' // [FIX] 시작일이나 결제기간 변경 시 수동 마감일 초기화하여 자동계산값 노출 보장
    }));
  }, [calculatedPrice, calculatedCredits, calculatedEndDate, calculatedRealEndDate, calculatedProductName, isOpen]);

  // pricingConfig/branch/모달열림 변경 시 membershipType과 selectedOption을 항상 동시 검증
  const getBranchName = id => branches.find(b => b.id === id)?.name || id;
  useEffect(() => {
    if (!isOpen) return;
    const validKeys = Object.keys(pricingConfig).filter(k => k !== '_meta');
    if (validKeys.length === 0) return;
    const branchName = getBranchName(newMember.branch);
    const availableTypes = validKeys.filter(key => {
      const cfg = pricingConfig[key];
      return !cfg?.branches || cfg.branches.includes(newMember.branch) || cfg.branches.includes(branchName);
    });
    if (availableTypes.length === 0) return;

    // 1) membershipType 검증
    let targetType = newMember.membershipType;
    if (!availableTypes.includes(targetType)) {
      targetType = availableTypes[0];
    }

    // 2) selectedOption 검증 — 현재 타입의 옵션 목록에 포함되어 있는지
    // [FIX] 1회권(credits === 1 && type === 'ticket') 제외
    const options = (pricingConfig[targetType]?.options || []).filter(opt => !(opt.type === 'ticket' && opt.credits === 1));
    const isOptionValid = newMember.selectedOption && options.some(opt => opt.id === newMember.selectedOption);
    const needsTypeChange = targetType !== newMember.membershipType;
    const needsOptionChange = !isOptionValid;
    if (needsTypeChange || needsOptionChange) {
      setNewMember(prev => ({
        ...prev,
        ...(needsTypeChange ? {
          membershipType: targetType
        } : {}),
        ...(needsOptionChange ? {
          selectedOption: options[0]?.id || ''
        } : {})
      }));
    }
  }, [newMember.branch, newMember.membershipType, newMember.selectedOption, isOpen, pricingConfig]);
  const handleAddMember = async () => {
    if (!newMember.name || !newMember.phone) {
      alert(t("g_e53e44") || "\uC774\uB984\uACFC \uC804\uD654\uBC88\uD638\uB294 \uD544\uC218\uC785\uB2C8\uB2E4.");
      return;
    }
    if (isSubmitting) return;
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
        duration: durationMonths,
        // [FIX] 가격표의 실제 유효기간(months) 사용 — newMember.duration은 subscription UI용이라 ticket에서 값이 안 바뀜
        attendanceCount: newMember.includeToday ? 1 : 0,
        // [NEW] Mark initial attendance
        lastAttendance: newMember.includeToday ? new Date().toISOString() : null,
        notes: newMember.notes || ''
      });
      if (newMember.amount > 0) {
        await storageService.addSalesRecord({
          memberId: res.id,
          memberName: newMember.name,
          type: 'register',
          item: newMember.subject,
          amount: newMember.amount,
          paymentMethod: newMember.paymentMethod,
          date: new Date().toLocaleDateString('sv-SE', {
            timeZone: 'Asia/Seoul'
          }),
          branchId: newMember.branch
        });
      }

      // [NEW] Automatically add attendance record if "Include Today" is checked
      if (newMember.includeToday) {
        // [FIX] ISO timestamp 대신 YYYY-MM-DD 날짜를 전달
        // 이전: new Date().toISOString() → UTC 변환되어 서버에서 date/classTime이 잘못 저장됨
        const todayDateStr = new Date().toLocaleDateString('sv-SE', {
          timeZone: 'Asia/Seoul'
        });
        await storageService.addManualAttendance(res.id, todayDateStr, newMember.branch, newMember.todayClass?.title || t("g_e7056c") || "\uB4F1\uB85D \uB2F9\uC77C \uC218\uB828", newMember.todayClass?.instructor || t("g_019a25") || "\uC2DC\uC2A4\uD15C \uC790\uB3D9", {
          skipCreditDeduction: true
        } // [FIX] 이미 credits 계산 시 1회 차감됨, 이중 차감 방지
        );
      }
      onSuccess();
      onClose();
      // Reset form
      setNewMember({
        name: '',
        phone: '010',
        branch: branches.length > 0 ? branches[0].id : '',
        membershipType: Object.keys(pricingConfig).find(k => k !== '_meta') || 'general',
        selectedOption: '',
        duration: 1,
        paymentMethod: 'card',
        credits: 0,
        amount: 0,
        regDate: new Date().toLocaleDateString('sv-SE', {
          timeZone: 'Asia/Seoul'
        }),
        startDate: new Date().toLocaleDateString('sv-SE', {
          timeZone: 'Asia/Seoul'
        }),
        endDate: '',
        subject: '',
        autoStart: false,
        includeToday: false,
        todayClass: null,
        manualEndDate: '',
        notes: ''
      });
    } catch (err) {
      console.error('Error adding member:', err);
      alert(t("g_7117f4") || "\uD68C\uC6D0 \uB4F1\uB85D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };
  if (!isOpen) return null;
  return <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: 'var(--modal-padding, 24px)',
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto',
      borderRadius: 'min(24px, 5vw)'
    }}>
                <div className="modal-header">
                    <h2 className="modal-title">{t('회원 등록')}</h2>
                    <button onClick={onClose} style={{
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
                        <X size={24} weight="bold" />
                    </button>
                </div>
                <div className="form-group" style={{
        marginBottom: '14px'
      }}>
                    <label className="form-label" style={{
          marginBottom: '6px'
        }}>{t('이름')}</label>
                    <input className="form-input" style={{
          fontFamily: 'var(--font-main)',
          padding: '14px 18px',
          fontSize: '1.1rem'
        }} value={newMember.name} onChange={e => setNewMember({
          ...newMember,
          name: e.target.value
        })} lang="ko" inputMode="text" autoComplete="name" spellCheck="false" autoCorrect="off" placeholder={t('회원 이름 입력')} />
                </div>
                <div className="form-group" style={{
        marginBottom: '14px'
      }}>
                    <label className="form-label" style={{
          marginBottom: '6px'
        }}>{t('전화번호')}</label>
                    <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
                        <span style={{
            padding: '14px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-main)',
            fontWeight: 'bold'
          }}>010</span>
                        <input className="form-input" style={{
            flex: 1,
            fontFamily: 'var(--font-main)',
            padding: '14px 18px',
            fontSize: '1.1rem'
          }} placeholder={t('뒷자리 8자리 숫자')} maxLength={8} inputMode="numeric" value={newMember.phone.replace('010', '')} onChange={e => {
            const clean = e.target.value.replace(/[^0-9]/g, '');
            setNewMember({
              ...newMember,
              phone: '010' + clean
            });
          }} />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">{t('지점')}</label>
                    <select className="form-select" style={{
          fontFamily: 'var(--font-main)'
        }} value={newMember.branch} onChange={e => {
          const nextBranch = e.target.value;
          setNewMember({
            ...newMember,
            branch: nextBranch
          });
        }}>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">{t('회원권 종류')}</label>
                    <select className="form-select" style={{
          fontFamily: 'var(--font-main)'
        }} value={newMember.membershipType} onChange={e => {
          const newType = e.target.value;
          // [FIX] 1회권 제외한 첫 옵션 선택
          const filteredOpts = (pricingConfig[newType]?.options || []).filter(opt => !(opt.type === 'ticket' && opt.credits === 1));
          const firstOptionId = filteredOpts[0]?.id || '';
          setNewMember({
            ...newMember,
            membershipType: newType,
            selectedOption: firstOptionId,
            duration: 1
          });
        }}>
                        {Object.entries(pricingConfig).filter(([key, value]) => key !== '_meta' && (!value.branches || value.branches.includes(newMember.branch) || value.branches.includes(getBranchName(newMember.branch)))).map(([key, value]) => <option key={key} value={key}>{value.label || key}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">{t('세부 옵션')}</label>
                    <select className="form-select" style={{
          fontFamily: 'var(--font-main)'
        }} value={newMember.selectedOption} onChange={e => setNewMember({
          ...newMember,
          selectedOption: e.target.value
        })}>
                        {pricingConfig[newMember.membershipType]?.options.filter(opt => !(opt.type === 'ticket' && opt.credits === 1)).map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                    </select>
                </div>

                {(() => {
        const currentOption = pricingConfig[newMember.membershipType]?.options.find(o => o.id === newMember.selectedOption);
        if (currentOption && currentOption.type === 'subscription') {
          return <div className="form-group">
                                <label className="form-label">{t('등록 기간')}</label>
                                <div style={{
              display: 'flex',
              gap: '8px'
            }}>
                                    {[1, 3, 6].map(m => <button key={m} className={`action-btn ${newMember.duration === m ? 'primary' : ''}`} style={{
                flex: 1,
                opacity: newMember.duration === m ? 1 : 0.4,
                padding: '14px 0',
                fontSize: '1rem',
                fontWeight: 'bold'
              }} onClick={() => setNewMember({
                ...newMember,
                duration: m
              })}>
                                            {m}{t("g_f667f2") || "\uAC1C\uC6D4"}</button>)}
                                </div>
                            </div>;
        }
        return null;
      })()}

                <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px'
      }}>
                    <div className="form-group">
                        <label className="form-label">{t('등록일')}</label>
                        <div style={{
            position: 'relative'
          }}>
                            <input type="date" className="form-input" style={{
              width: '100%',
              fontFamily: 'var(--font-main)',
              cursor: 'pointer'
            }} value={newMember.regDate} onClick={e => e.target.showPicker && e.target.showPicker()} onChange={e => setNewMember({
              ...newMember,
              regDate: e.target.value
            })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
                            <span>{t('수련 시작일')}</span>
                        </label>
                        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
                            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
                                <label style={{
                flex: 1,
                padding: '12px 8px',
                borderRadius: '10px',
                background: newMember.autoStart ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.05)',
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
                                    <input type="checkbox" style={{
                  width: '16px',
                  height: '16px'
                }} checked={newMember.autoStart} onChange={e => setNewMember({
                  ...newMember,
                  autoStart: e.target.checked,
                  includeToday: e.target.checked ? false : newMember.includeToday
                })} />
                                    {t('첫 출석일 시작')}
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
                                    <input type="checkbox" style={{
                  width: '16px',
                  height: '16px'
                }} checked={newMember.includeToday} onChange={async e => {
                  const isChecked = e.target.checked;
                  let matchedClass = null;
                  if (isChecked) {
                    try {
                      const typeHint = pricingConfig[newMember.membershipType]?.label;
                      matchedClass = await storageService.getCurrentClass(newMember.branch, null, typeHint);
                    } catch (err) {
                      console.error("Failed to fetch today's class during registration", err);
                    }
                  }
                  setNewMember({
                    ...newMember,
                    includeToday: isChecked,
                    todayClass: matchedClass,
                    autoStart: isChecked ? false : newMember.autoStart,
                    startDate: isChecked ? new Date().toLocaleDateString('sv-SE', {
                      timeZone: 'Asia/Seoul'
                    }) : newMember.startDate
                  });
                }} />
                                    {t('오늘 수련 포함')}
                                </label>
                            </div>

                            {/* [CRITICAL FIX] 항상 날짜 입력 필드를 노출하도록 수정 (사용자 피드백 반영) */}
                            <input type="date" className="form-input fade-in" style={{
              width: '100%',
              cursor: newMember.autoStart ? 'not-allowed' : 'pointer',
              opacity: newMember.autoStart ? 0.6 : 1
            }} value={newMember.startDate} disabled={newMember.autoStart} onClick={e => !newMember.autoStart && e.target.showPicker && e.target.showPicker()} onChange={e => setNewMember({
              ...newMember,
              startDate: e.target.value
            })} />

                            {newMember.includeToday && <div className="fade-in" style={{
              marginTop: '6px'
            }}>
                                    <select className="form-select" style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '0.9rem',
                background: 'rgba(76,175,80,0.1)',
                border: '1px solid rgba(76,175,80,0.3)',
                borderRadius: '10px',
                color: '#81C784',
                fontWeight: 'bold',
                cursor: 'pointer'
              }} value={(() => {
                const cls = newMember.todayClass;
                if (!cls) return t("g_2b3da3") || "\uC790\uC728\uC218\uB828";
                // [FIX] 고유키(time__title) 사용하여 동일 수업명 중복 시에도 정확한 선택 보장
                return cls._key || cls.title || t("g_2b3da3") || "\uC790\uC728\uC218\uB828";
              })()} onChange={e => {
                const selectedKey = e.target.value;
                if (selectedKey === (t("g_2b3da3") || "\uC790\uC728\uC218\uB828")) {
                  setNewMember({
                    ...newMember,
                    todayClass: null
                  });
                } else {
                  // [FIX] 고유키(time__title)로 매칭하여 정확한 수업 정보 반영
                  const matched = dailyClasses.find(c => {
                    const cTitle = c.title || c.className || '';
                    const tm = c.time || '';
                    return `${tm}__${cTitle}` === selectedKey;
                  });
                  setNewMember({
                    ...newMember,
                    todayClass: matched ? {
                      _key: selectedKey,
                      title: matched.title || matched.className,
                      instructor: matched.instructor,
                      time: matched.time
                    } : {
                      title: selectedKey
                    }
                  });
                }
              }}>
                                        <option value={t('자율수련')}>{t('자율수련 (-1회)')}</option>
                                        {dailyClasses.map((cls, idx) => {
                  const title = cls.title || cls.className || '';
                  const time = cls.time || '';
                  const instructor = cls.instructor || '';
                  const label = [time, title, instructor].filter(Boolean).join(' ') + (t("g_ab216c") || " (-1\uD68C)");
                  // [FIX] 고유키(time__title) — 같은 수업이 다른 시간대에 있어도 구분 가능
                  const uniqueKey = `${time}__${title}`;
                  return <option key={uniqueKey} value={uniqueKey}>{label}</option>;
                })}
                                    </select>
                                </div>}
                            
                            {/* 마감일(종료일) */}
                            <div className="fade-in" style={{
              marginTop: '10px'
            }}>
                                <label className="form-label" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                                    <span>{t('마감일(종료일)')}</span>
                                    {newMember.autoStart && <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--primary-gold)'
                }}>{t('*첫 출석 시 조정됨')}</span>}
                                </label>
                                <input type="date" className="form-input" style={{
                width: '100%',
                cursor: 'pointer'
              }} value={newMember.manualEndDate || newMember.realEndDate || ''} onClick={e => e.target.showPicker && e.target.showPicker()} onChange={e => setNewMember({
                ...newMember,
                manualEndDate: e.target.value
              })} />
                                <div style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.4)',
                marginTop: '4px'
              }}>
                                    {t('* 날짜 선택 시 수동 적용. 비우면 자동 계산.')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">{t('결제 방식')}</label>
                    <div style={{
          display: 'flex',
          gap: '10px'
        }}>
                        {[{
            id: 'card',
            label: t("g_7e9cf3") || "\uCE74\uB4DC"
          }, {
            id: 'cash',
            label: t("g_948cb2") || "\uD604\uAE08"
          }, {
            id: 'transfer',
            label: t("g_0b2312") || "\uC774\uCCB4"
          }].map(p => <button key={p.id} className={`action-btn ${newMember.paymentMethod === p.id ? 'primary' : ''}`} style={{
            flex: 1,
            padding: '14px 0',
            fontSize: '1rem',
            fontWeight: 'bold'
          }} onClick={() => setNewMember({
            ...newMember,
            paymentMethod: p.id
          })}>
                                {p.label}
                            </button>)}
                    </div>
                </div>

                <div className="form-group" style={{
        background: 'rgba(var(--primary-rgb), 0.08)',
        padding: '20px',
        borderRadius: '16px',
        border: '1px solid rgba(var(--primary-rgb), 0.2)',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
      }}>
                    <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline'
        }}>
                        <span style={{
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 'bold'
          }}>{t('결제 금액')}</span>
                        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
                            <input className="form-input" style={{
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
            }} value={newMember.amount.toLocaleString()} onChange={e => {
              const rawValue = e.target.value.replace(/[^0-9]/g, '');
              setNewMember({
                ...newMember,
                amount: Number(rawValue)
              });
            }} />
                            <span style={{
              fontSize: '1.4rem',
              fontWeight: '900',
              color: 'var(--primary-gold)'
            }}>{t('원')}</span>
                        </div>
                    </div>
                    <div style={{
          fontSize: '0.95rem',
          color: 'var(--text-primary)',
          marginTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '12px'
        }}>
                        <span style={{
            fontWeight: 600
          }}>{t('횟수')}</span>
                        {newMember.credits > 200 ? <span style={{
            fontWeight: 600
          }}>{t('무제한')}</span> : <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
                                <input className="form-input" type="number" style={{
              width: '60px',
              textAlign: 'right',
              padding: '6px 8px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '700'
            }} value={newMember.credits} onChange={e => setNewMember({
              ...newMember,
              credits: Number(e.target.value)
            })} />
                                <span style={{
              fontWeight: 600
            }}>{t('회')}</span>
                            </div>}
                    </div>
                </div>

                <div className="form-group" style={{
        marginTop: '10px'
      }}>
                    <label className="form-label" style={{
          marginBottom: '6px'
        }}>{t('원장 메모 (선택)')}</label>
                    <textarea className="form-input" style={{
          fontFamily: 'var(--font-main)',
          padding: '14px 18px',
          fontSize: '1rem',
          minHeight: '80px',
          resize: 'vertical'
        }} value={newMember.notes || ''} onChange={e => setNewMember({
          ...newMember,
          notes: e.target.value
        })} placeholder={t('특이사항이나 메모를 입력하세요')} />
                </div>

                <div className="modal-actions" style={{
        gap: '12px',
        marginTop: '10px'
      }}>
                    <button onClick={onClose} style={{
          flex: 1,
          padding: '18px 0',
          color: 'var(--text-secondary)',
          fontWeight: '600',
          fontSize: '1rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px'
        }}>{t('취소')}</button>
                    <button onClick={handleAddMember} className="action-btn primary" style={{
          flex: 2,
          padding: '18px 0',
          fontSize: '1.1rem',
          fontWeight: '800',
          borderRadius: '16px',
          boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.2)'
        }} disabled={isSubmitting}>
                        {isSubmitting ? t("g_a8d064") || "\uCC98\uB9AC \uC911..." : t("g_bcf353") || "\uD68C\uC6D0 \uB4F1\uB85D \uC644\uB8CC"}
                    </button>
                </div>
            </div>
        </div>;
};
export default MemberAddModal;