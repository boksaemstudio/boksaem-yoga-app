import { useLanguageStore } from '../../../stores/useLanguageStore';
import { useState, useEffect, useMemo, useRef } from 'react';
import CustomDatePicker from '../../common/CustomDatePicker';
import { useStudioConfig } from '../../../contexts/StudioContext';
import { storageService } from '../../../services/storage';
const RegistrationTab = ({
  pricingConfig,
  member,
  onAddSalesRecord,
  onUpdateMember,
  onManualAttendance,
  setActiveTab,
  setPrefillMessage
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const branches = config.BRANCHES || [];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // ─── 즉시 출석 관련 상태 ───
  const [immediateDate, setImmediateDate] = useState(() => new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Seoul'
  }));
  const [immediateTime, setImmediateTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [immediateBranch, setImmediateBranch] = useState(member.homeBranch || (branches.length > 0 ? branches[0].id : ''));
  // [FIX] 수업 선택값을 '자율수련' 또는 'time__title' 형식의 고유키로 관리
  const [immediateClassKey, setImmediateClassKey] = useState(t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || "\uC790\uC728\uC218\uB828");
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
      return restartDate.toLocaleDateString('sv-SE', {
        timeZone: 'Asia/Seoul'
      });
    }
    return new Date().toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Seoul'
    });
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
  const {
    calculatedPrice,
    calculatedCredits,
    calculatedEndDate,
    calculatedProductName,
    durationMonths
  } = useMemo(() => {
    const empty = {
      calculatedPrice: 0,
      calculatedCredits: 0,
      calculatedEndDate: '',
      calculatedProductName: '',
      durationMonths: 1
    };
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
        if (duration === 1) p = option.basePrice;else if (duration === 3) p = isCashLike && option.cashDiscount3 ? option.cashDiscount3 : option.discount3 || option.basePrice * 3;else if (duration === 6) p = isCashLike && option.cashDiscount6 ? option.cashDiscount6 : option.discount6 || option.basePrice * 6;else p = option.basePrice * duration;
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
      calculatedEndDate: end.toLocaleDateString('sv-SE', {
        timeZone: 'Asia/Seoul'
      }),
      calculatedProductName: `${label} ${duration > 1 && option.type !== 'ticket' ? `(${duration}개월)` : ''}`,
      durationMonths: months
    };
  }, [membershipType, selectedOption, duration, paymentMethod, startDate, startDateMode, immediateDate, pricingConfig]);
  useEffect(() => {
    setPrice(calculatedPrice);
  }, [calculatedPrice]);
  useEffect(() => {
    setCustomEndDate(calculatedEndDate);
  }, [calculatedEndDate]);
  useEffect(() => {
    setCustomCredits(calculatedCredits);
  }, [calculatedCredits]);

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
    const options = [{
      value: t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || "\uC790\uC728\uC218\uB828",
      label: t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || "\uC790\uC728\uC218\uB828",
      time: '',
      instructor: '',
      className: t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || "\uC790\uC728\uC218\uB828"
    }];
    if (immediateDailyClasses.length > 0) {
      immediateDailyClasses.forEach(cls => {
        const time = cls.time || '';
        const title = cls.title || cls.className || '';
        const instructor = cls.instructor || '';
        const parts = [time, title, instructor].filter(Boolean);
        const label = parts.join(' ');
        // 고유키: 시간__수업명 (예: '19:50__하타')
        const uniqueKey = `${time}__${title}`;
        options.push({
          value: uniqueKey,
          label,
          time,
          instructor,
          className: title
        });
      });
    }
    return options;
  }, [immediateDailyClasses]);

  // ─── 즉시 출석: 지점/날짜 변경 시 수업 선택 초기화 ───
  useEffect(() => {
    setImmediateClassKey(t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || "\uC790\uC728\uC218\uB828");
    setImmediateInstructor('');
  }, [immediateBranch, immediateDate]);

  // ─── 즉시 출석: 선택된 수업에서 실제 className, time, instructor 추출 ───
  const selectedClassInfo = useMemo(() => {
    const found = immediateClassOptions.find(opt => opt.value === immediateClassKey);
    if (!found || immediateClassKey === (t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || "\uC790\uC728\uC218\uB828")) {
      return {
        className: t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || t("g_2b3da3") || "\uC790\uC728\uC218\uB828",
        time: immediateTime,
        instructor: '',
        isFreePractice: true
      };
    }
    return {
      className: found.className,
      time: found.time,
      instructor: found.instructor,
      isFreePractice: false
    };
  }, [immediateClassKey, immediateClassOptions, immediateTime]);

  // [INFO] 선등록 여부 확인 — 현재 회원권이 활성 상태인지 체크
  const todayStr = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Seoul'
  });
  const isAdvance = member.endDate && new Date(member.endDate) >= new Date(todayStr) && (member.credits || 0) > 0;

  // [FIX] startDateMode에 따라 finalStartDate/finalEndDate 결정
  // Computed Info for TBD mode
  const isTbd = startDateMode === 'tbd';
  const isImmediate = startDateMode === 'immediate';
  const finalStartDate = isTbd ? 'TBD' : isImmediate ? immediateDate : startDate;
  const finalEndDate = isTbd ? 'TBD' : customEndDate;
  const handleRenew = async () => {
    if (isSubmitting || isSubmittingRef.current) return;

    // [FIX] 중복 등록 방지: 동일 memberId + 날짜 + 금액 조합으로 5초 내 재시도 차단
    const idempotencyKey = `reg_${member.id}_${new Date().toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Seoul'
    })}_${price}`;
    const lastSubmit = sessionStorage.getItem(idempotencyKey);
    if (lastSubmit && Date.now() - parseInt(lastSubmit) < 5000) {
      console.warn('[RegistrationTab] Duplicate submission blocked');
      return;
    }
    let confirmMsg = `${calculatedProductName}\n금액: ${price.toLocaleString()}원\n\n등록하시겠습니까?`;
    if (!confirm(confirmMsg)) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    sessionStorage.setItem(idempotencyKey, String(Date.now()));
    try {
      const today = new Date().toLocaleDateString('sv-SE', {
        timeZone: 'Asia/Seoul'
      });
      const salesData = {
        memberId: member.id,
        memberName: member.name,
        type: 'register',
        item: calculatedProductName,
        amount: price,
        paymentMethod: paymentMethod,
        date: today,
        startDate: finalStartDate,
        endDate: finalEndDate
      };
      if (onAddSalesRecord) await onAddSalesRecord(salesData);
      const updateData = {};
      if (isAdvance) {
        updateData.upcomingMembership = {
          membershipType: membershipType,
          credits: customCredits,
          originalCredits: customCredits,
          // [FIX] 원래 횟수 기록 (역추적용)
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
        updateData.streak = 0; // [FIX] 연속 출석도 리셋
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
          alert(t("g_2213b6") || t("g_2213b6") || t("g_2213b6") || t("g_2213b6") || t("g_2213b6") || "\uB4F1\uB85D\uC740 \uC644\uB8CC\uB418\uC5C8\uC73C\uB098, \uCD9C\uC11D \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uCD9C\uC11D\uBD80\uC5D0\uC11C \uC218\uB3D9\uC73C\uB85C \uCC98\uB9AC\uD574\uC8FC\uC138\uC694.");
        }
      }

      // [NEW] Auto-Message Redirect
      if (setPrefillMessage && setActiveTab) {
        const msgLines = [`${member.name} 회원님, 수강권 등록/연장이 확정되었습니다.`, '', `• 등록 항목: ${calculatedProductName}`, `• 등록 상태: ${isAdvance ? t("g_a4d3d8") || t("g_a4d3d8") || t("g_a4d3d8") || t("g_a4d3d8") || t("g_a4d3d8") || "\uD83D\uDDD3\uFE0F \uAE30\uC874 \uB9CC\uB8CC \uD6C4 \uC801\uC6A9 (\uC120\uB4F1\uB85D)" : t("g_3e13f0") || t("g_3e13f0") || t("g_3e13f0") || t("g_3e13f0") || t("g_3e13f0") || "\u2705 \uC9C4\uD589 \uC911"}`, `• 잔여 횟수: ${customCredits >= 999 ? t("g_d5b3ac") || t("g_d5b3ac") || t("g_d5b3ac") || t("g_d5b3ac") || t("g_d5b3ac") || "\uBB34\uC81C\uD55C \uD69F\uC218" : customCredits + (t("g_8a602f") || t("g_8a602f") || t("g_8a602f") || t("g_8a602f") || t("g_8a602f") || "\uD68C")}`, `• 이용 기간: ${finalStartDate === 'TBD' ? t("g_b8e060") || t("g_b8e060") || t("g_b8e060") || t("g_b8e060") || t("g_b8e060") || "\uCCAB \uCD9C\uC11D \uC2DC \uD655\uC815" : finalStartDate} ~ ${finalEndDate === 'TBD' ? t("g_b8e060") || t("g_b8e060") || t("g_b8e060") || t("g_b8e060") || t("g_b8e060") || "\uCCAB \uCD9C\uC11D \uC2DC \uD655\uC815" : finalEndDate}`, '', t("g_f4b2ec") || t("g_f4b2ec") || t("g_f4b2ec") || t("g_f4b2ec") || t("g_f4b2ec") || "\uC624\uB298\uB3C4 \uAC74\uAC15\uD55C \uD558\uB8E8 \uBCF4\uB0B4\uC138\uC694! \uD83D\uDE4F"];
        setPrefillMessage(msgLines.join('\n'));
        setTimeout(() => setActiveTab('messages'), 300);
      } else {
        alert(isImmediate ? t("g_de6b82") || t("g_de6b82") || t("g_de6b82") || t("g_de6b82") || t("g_de6b82") || "\uB4F1\uB85D \uBC0F \uCD9C\uC11D \uCC98\uB9AC\uAC00 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4." : t("g_b23e18") || t("g_b23e18") || t("g_b23e18") || t("g_b23e18") || t("g_b23e18") || "\uB4F1\uB85D\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      }
    } catch (err) {
      console.error('Registration error:', err);
      alert(`등록 중 오류가 발생했습니다.\n상세: ${err.message || t("g_053d5f") || t("g_053d5f") || t("g_053d5f") || t("g_053d5f") || t("g_053d5f") || "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"}`);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  }}>
            {/* 회원권 종류 */}
            <div className="form-group">
                <label className="form-label">{t("g_dd1b38") || t("g_dd1b38") || t("g_dd1b38") || t("g_dd1b38") || t("g_dd1b38") || "\uD68C\uC6D0\uAD8C \uC885\uB958"}</label>
                <select className="form-select" style={{
        fontFamily: 'var(--font-main)'
      }} value={membershipType} onChange={e => {
        const newType = e.target.value;
        // [FIX] 1회권 제외한 첫 옵션 선택
        const filteredOpts = (pricingConfig[newType]?.options || []).filter(opt => !(opt.type === 'ticket' && opt.credits === 1));
        const firstOptionId = filteredOpts[0]?.id || '';
        setMembershipType(newType);
        setSelectedOption(firstOptionId);
        setDuration(1);
      }}>
                    {pricingConfig && Object.entries(pricingConfig).filter(([key]) => key !== '_meta').map(([key, conf]) => <option key={key} value={key}>{conf.label || key}</option>)}
                </select>
            </div>

            {/* 세부 옵션 */}
            <div className="form-group">
                <label className="form-label">{t("g_b9497e") || t("g_b9497e") || t("g_b9497e") || t("g_b9497e") || t("g_b9497e") || "\uC138\uBD80 \uC635\uC158"}</label>
                <select className="form-select" style={{
        fontFamily: 'var(--font-main)'
      }} value={selectedOption} onChange={e => setSelectedOption(e.target.value)}>
                    {pricingConfig?.[membershipType]?.options?.filter(opt => !(opt.type === 'ticket' && opt.credits === 1)).map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                </select>
            </div>

            {/* 등록 기간 */}
            {(() => {
      const option = pricingConfig?.[membershipType]?.options?.find(opt => opt.id === selectedOption);
      if (option && option.type === 'subscription') {
        return <div className="form-group">
                            <label className="form-label">{t("g_87aba3") || t("g_87aba3") || t("g_87aba3") || t("g_87aba3") || t("g_87aba3") || "\uB4F1\uB85D \uAE30\uAC04"}</label>
                            <div style={{
            display: 'flex',
            gap: '8px'
          }}>
                                {[1, 3, 6].map(m => <button key={m} className={`action-btn ${duration === m ? 'primary' : ''}`} style={{
              flex: 1,
              opacity: duration === m ? 1 : 0.4,
              padding: '14px 0',
              fontSize: '1rem',
              fontWeight: 'bold'
            }} onClick={() => setDuration(m)}>
                                        {m}{t("g_f667f2") || t("g_f667f2") || t("g_f667f2") || t("g_f667f2") || t("g_f667f2") || "\uAC1C\uC6D4"}</button>)}
                            </div>
                        </div>;
      }
      return null;
    })()}

            {/* 결제 방식 */}
            <div className="form-group">
                <label className="form-label">{t("g_41f75e") || t("g_41f75e") || t("g_41f75e") || t("g_41f75e") || t("g_41f75e") || "\uACB0\uC81C \uBC29\uC2DD"}</label>
                <div style={{
        display: 'flex',
        gap: '10px'
      }}>
                    {[{
          id: 'card',
          label: t("g_7e9cf3") || t("g_7e9cf3") || t("g_7e9cf3") || t("g_7e9cf3") || t("g_7e9cf3") || "\uCE74\uB4DC"
        }, {
          id: 'cash',
          label: t("g_948cb2") || t("g_948cb2") || t("g_948cb2") || t("g_948cb2") || t("g_948cb2") || "\uD604\uAE08"
        }, {
          id: 'transfer',
          label: t("g_0b2312") || t("g_0b2312") || t("g_0b2312") || t("g_0b2312") || t("g_0b2312") || "\uC774\uCCB4"
        }].map(p => <button key={p.id} className={`action-btn ${paymentMethod === p.id ? 'primary' : ''}`} style={{
          flex: 1,
          padding: '14px 0',
          fontSize: '1rem',
          fontWeight: 'bold'
        }} onClick={() => setPaymentMethod(p.id)}>
                            {p.label}
                        </button>)}
                </div>
            </div>

            {/* 수련 시작일 */}
            <div className="form-group">
                <label className="form-label">{t("g_ace73a") || t("g_ace73a") || t("g_ace73a") || t("g_ace73a") || t("g_ace73a") || "\uC218\uB828 \uC2DC\uC791\uC77C"}</label>
                <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
                    {/* 3가지 시작일 모드 선택 */}
                    <div style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap'
        }}>
                        {[{
            value: 'tbd',
            label: isAdvance ? t("g_717d08") || t("g_717d08") || t("g_717d08") || t("g_717d08") || t("g_717d08") || "\uAE30\uC874 \uB9C8\uAC10 \uD6C4 \uCCAB\uCD9C\uC11D \uC2DC" : t("g_b882ea") || t("g_b882ea") || t("g_b882ea") || t("g_b882ea") || t("g_b882ea") || "\uCCAB \uCD9C\uC11D \uC2DC \uC2DC\uC791",
            icon: '🧘‍♀️',
            desc: t("g_44b49d") || t("g_44b49d") || t("g_44b49d") || t("g_44b49d") || t("g_44b49d") || "\uB098\uC911\uC5D0 \uCC98\uC74C \uC62C \uB54C \uC790\uB3D9 \uC2DC\uC791"
          }, {
            value: 'manual',
            label: t("g_d3ba9f") || t("g_d3ba9f") || t("g_d3ba9f") || t("g_d3ba9f") || t("g_d3ba9f") || "\uC2DC\uC791\uC77C \uC9C1\uC811 \uC9C0\uC815",
            icon: '📅',
            desc: t("g_eb8bab") || t("g_eb8bab") || t("g_eb8bab") || t("g_eb8bab") || t("g_eb8bab") || "\uC6D0\uD558\uB294 \uB0A0\uC9DC\uB97C \uC9C1\uC811 \uC785\uB825"
          }, {
            value: 'immediate',
            label: t("g_a15346") || t("g_a15346") || t("g_a15346") || t("g_a15346") || t("g_a15346") || "\uB4F1\uB85D \uC989\uC2DC \uCD9C\uC11D",
            icon: '⚡',
            desc: t("g_0a087b") || t("g_0a087b") || t("g_0a087b") || t("g_0a087b") || t("g_0a087b") || "\uC624\uB298\uBD80\uD130 \uC2DC\uC791 + \uCD9C\uC11D \uCC98\uB9AC"
          }].map(opt => <button key={opt.value} onClick={() => setStartDateMode(opt.value)} style={{
            flex: 1,
            minWidth: '120px',
            padding: '12px 10px',
            borderRadius: '10px',
            cursor: 'pointer',
            textAlign: 'center',
            border: `2px solid ${startDateMode === opt.value ? 'var(--primary-gold)' : 'rgba(255,255,255,0.08)'}`,
            background: startDateMode === opt.value ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.03)',
            transition: 'all 0.2s'
          }}>
                                <div style={{
              fontSize: '1.1rem',
              marginBottom: '4px'
            }}>{opt.icon}</div>
                                <div style={{
              fontWeight: 'bold',
              fontSize: '0.8rem',
              color: startDateMode === opt.value ? 'var(--primary-gold)' : 'var(--text-primary)',
              marginBottom: '2px'
            }}>{opt.label}</div>
                                <div style={{
              fontSize: '0.65rem',
              color: 'var(--text-tertiary)'
            }}>{opt.desc}</div>
                            </button>)}
                    </div>

                    {/* 모드별 세부 UI */}
                    {startDateMode === 'tbd' && <div style={{
          padding: '12px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'white',
          textAlign: 'center',
          fontSize: '0.9rem'
        }}>{t("g_8b5b77") || t("g_8b5b77") || t("g_8b5b77") || t("g_8b5b77") || t("g_8b5b77") || "\uCCAB \uCD9C\uC11D\uC77C\uC5D0 \uC2DC\uC791\uC77C/\uB9C8\uAC10\uC77C \uC790\uB3D9 \uD655\uC815"}</div>}
                    {startDateMode === 'manual' && <input type="date" className="form-input" style={{
          width: '100%',
          fontFamily: 'var(--font-main)',
          cursor: 'pointer'
        }} value={startDate} onClick={e => e.target.showPicker && e.target.showPicker()} onChange={e => setStartDate(e.target.value)} />}
                    {startDateMode === 'immediate' && <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
                            <div style={{
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            color: '#4CAF50',
            textAlign: 'center',
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}>
                                ✅ {immediateDate}{t("g_7d88ce") || t("g_7d88ce") || t("g_7d88ce") || t("g_7d88ce") || t("g_7d88ce") || "\uC2DC\uC791 + \uCD9C\uC11D 1\uD68C \uC790\uB3D9 \uCC98\uB9AC"}</div>
                            {/* 출석 날짜/시간/지점/수업 선택 UI */}
                            <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '14px',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
                                <label style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              fontWeight: 'bold'
            }}>{t("g_8e863b") || t("g_8e863b") || t("g_8e863b") || t("g_8e863b") || t("g_8e863b") || "\uD83D\uDCCB \uCD9C\uC11D \uC815\uBCF4 \uC120\uD0DD"}</label>
                                <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
                                    {/* 지점 */}
                                    <select value={immediateBranch} onChange={e => setImmediateBranch(e.target.value)} className="form-select" style={{
                flex: 1,
                minWidth: '90px'
              }}>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                    {/* 날짜 */}
                                    <div style={{
                flex: 1.5,
                minWidth: '130px'
              }}>
                                        <CustomDatePicker value={immediateDate} onChange={setImmediateDate} />
                                    </div>
                                </div>
                                <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
                                    {/* [FIX] 시간 입력: 자율수련일 때만 표시 (스케줄 수업은 시간이 자동 결정) */}
                                    {selectedClassInfo.isFreePractice && <input type="time" value={immediateTime} onChange={e => setImmediateTime(e.target.value)} className="form-input" style={{
                flex: 1,
                minWidth: '100px',
                cursor: 'pointer',
                fontFamily: 'var(--font-main)'
              }} />}
                                    {/* [FIX] 수업 선택: 고유키(time__title) 사용, 선택 시 시간/강사 자동 반영 */}
                                    <select value={immediateClassKey} onChange={e => {
                const key = e.target.value;
                setImmediateClassKey(key);
                const matched = immediateClassOptions.find(opt => opt.value === key);
                if (matched) {
                  setImmediateInstructor(matched.instructor || '');
                }
              }} className="form-select" style={{
                flex: selectedClassInfo.isFreePractice ? 1.2 : 1,
                minWidth: '120px'
              }}>
                                        {immediateClassOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>}

                    {/* 마감일(종료일) 입력 파트 */}
                    {startDateMode !== 'tbd' && <div style={{
          marginTop: '4px'
        }}>
                            <label style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            marginBottom: '8px'
          }}>
                                <span>{t("g_b004a1") || t("g_b004a1") || t("g_b004a1") || t("g_b004a1") || t("g_b004a1") || "\uB9C8\uAC10\uC77C(\uC885\uB8CC\uC77C)"}</span>
                            </label>
                            <input type="date" className="form-input" style={{
            width: '100%',
            cursor: 'pointer'
          }} value={customEndDate} onClick={e => e.target.showPicker && e.target.showPicker()} onChange={e => setCustomEndDate(e.target.value)} />
                        </div>}
                    {startDateMode === 'tbd' && <div style={{
          marginTop: '4px'
        }}>
                            <label style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            marginBottom: '8px'
          }}>
                                <span>{t("g_b004a1") || t("g_b004a1") || t("g_b004a1") || t("g_b004a1") || t("g_b004a1") || "\uB9C8\uAC10\uC77C(\uC885\uB8CC\uC77C)"}</span>
                            </label>
                            <input type="text" className="form-input" style={{
            width: '100%',
            cursor: 'not-allowed',
            color: 'var(--primary-gold)',
            fontWeight: 'bold',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.05)'
          }} value={t("g_97df36") || t("g_97df36") || t("g_97df36") || t("g_97df36") || t("g_97df36") || "\uCCAB \uCD9C\uC11D \uC2DC \uC790\uB3D9 \uD655\uC815 (\uC120\uB4F1\uB85D)"} disabled />
                        </div>}

                    {/* 안내 메시지 */}
                    {isAdvance && <div style={{
          fontSize: '0.75rem',
          padding: '10px',
          background: 'rgba(56, 189, 248, 0.08)',
          borderRadius: '8px',
          color: '#38bdf8',
          border: '1px solid rgba(56, 189, 248, 0.15)'
        }}>{t("g_b6057b") || t("g_b6057b") || t("g_b6057b") || t("g_b6057b") || t("g_b6057b") || "\u2139\uFE0F \uC794\uC5EC \uAE30\uAC04\uC774 \uB0A8\uC544\uC788\uC5B4 \uC120\uB4F1\uB85D\uC73C\uB85C \uCC98\uB9AC\uB429\uB2C8\uB2E4."}</div>}
                </div>
            </div>

            {/* 원장 메모 */}
            <div className="form-group">
                <label className="form-label" style={{
        marginBottom: '6px'
      }}>{t("g_e0dc09") || t("g_e0dc09") || t("g_e0dc09") || t("g_e0dc09") || t("g_e0dc09") || "\uC6D0\uC7A5 \uBA54\uBAA8 (\uC120\uD0DD)"}</label>
                <textarea className="form-input" style={{
        fontFamily: 'var(--font-main)',
        padding: '14px 18px',
        fontSize: '1rem',
        minHeight: '80px',
        resize: 'vertical'
      }} value={notesText} onChange={e => setNotesText(e.target.value)} placeholder={t("g_78b50d") || t("g_78b50d") || t("g_78b50d") || t("g_78b50d") || t("g_78b50d") || "\uD2B9\uC774\uC0AC\uD56D\uC774\uB098 \uBA54\uBAA8\uB97C \uC785\uB825\uD558\uC138\uC694"} />
            </div>

            {/* 결제 요약 카드 — MemberAddModal과 동일 스타일 */}
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
        }}>{t("g_ada266") || t("g_ada266") || t("g_ada266") || t("g_ada266") || t("g_ada266") || "\uACB0\uC81C \uAE08\uC561"}</span>
                    <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
                        <input className="form-input" style={{
            fontSize: '1.4rem',
            fontWeight: '900',
            color: 'var(--primary-gold)',
            background: 'transparent',
            border: 'none',
            textAlign: 'right',
            width: '150px',
            padding: 0,
            height: 'auto'
          }} value={price.toLocaleString()} onChange={e => {
            const rawValue = e.target.value.replace(/[^0-9]/g, '');
            setPrice(Number(rawValue));
          }} />
                        <span style={{
            fontSize: '1.4rem',
            fontWeight: '900',
            color: 'var(--primary-gold)'
          }}>{t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || "\uC6D0"}</span>
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
        }}>{t("g_705bfc") || t("g_705bfc") || t("g_705bfc") || t("g_705bfc") || t("g_705bfc") || "\uD69F\uC218"}</span>
                    {customCredits > 200 || customCredits === 9999 ? <span style={{
          fontWeight: 600
        }}>{t("g_7fe271") || t("g_7fe271") || t("g_7fe271") || t("g_7fe271") || t("g_7fe271") || "\uBB34\uC81C\uD55C"}</span> : <div style={{
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
          }} value={customCredits} onChange={e => setCustomCredits(Number(e.target.value))} />
                            <span style={{
            fontWeight: 600
          }}>{t("g_8a602f") || t("g_8a602f") || t("g_8a602f") || t("g_8a602f") || t("g_8a602f") || "\uD68C"}</span>
                        </div>}
                </div>
            </div>

            {/* 등록 버튼 */}
            <button onClick={handleRenew} disabled={isSubmitting} className="action-btn primary" style={{
      padding: '18px 0',
      fontSize: '1.1rem',
      fontWeight: '800',
      borderRadius: '16px',
      boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.2)',
      opacity: isSubmitting ? 0.6 : 1,
      cursor: isSubmitting ? 'not-allowed' : 'pointer',
      marginTop: '10px'
    }}>
                {isSubmitting ? t("g_a8d064") || t("g_a8d064") || t("g_a8d064") || t("g_a8d064") || t("g_a8d064") || "\uCC98\uB9AC \uC911..." : t("g_ec881e") || t("g_ec881e") || t("g_ec881e") || t("g_ec881e") || t("g_ec881e") || "\uB4F1\uB85D \uD558\uAE30"}
            </button>
        </div>;
};
export default RegistrationTab;