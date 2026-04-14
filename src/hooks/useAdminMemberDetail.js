import { useLanguageStore } from '../stores/useLanguageStore';
import { useState, useEffect, useRef, useCallback } from 'react';
import { onSnapshot, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { tenantDb } from '../utils/tenantDb';
import { storageService } from '../services/storage';

/**
 * useAdminMemberDetail — AdminMemberDetailModal의 비즈니스 로직 (~330줄 추출)
 * 
 * Firestore 리스너, 가격 자동채움, AI분석, 변경감지/저장, 수동출석/삭제 관리
 */
export const useAdminMemberDetail = (initialMember, propMemberLogs, {
  onUpdateMember,
  onClose,
  pricingConfig
}) => {
  const t = useLanguageStore(s => s.t);
  const [localMember, setLocalMember] = useState(initialMember);
  const member = localMember || initialMember;

  // [DEFENSE] duration 교차 검증 헬퍼
  // member.duration이 없거나 1이면서 credits > 1이면 pricing config로 보정
  const getSafeDuration = useCallback(m => {
    let dur = m.duration || 1;
    if (dur <= 1 && (m.credits > 1 || m.subject) && pricingConfig) {
      const category = pricingConfig[m.membershipType];
      if (category?.options) {
        let matched = category.options.find(opt => m.subject && opt.label && m.subject.includes(opt.label));
        if (!matched) {
          matched = category.options.find(opt => opt.credits === (m.credits || 0) + (m.attendanceCount || 0));
        }
        if (matched?.months && matched.months > dur) {
          console.warn(`[MemberDetail] ⚠️ duration 보정: ${m.name} duration=${dur} → pricing=${matched.months}mo`);
          dur = matched.months;
          // DB에도 수정 (fire-and-forget)
          storageService.updateMember(m.id, {
            duration: dur
          }).catch(() => {});
        }
      }
    }
    return dur;
  }, [pricingConfig]);
  const [editData, setEditData] = useState({
    ...initialMember
  });
  const [memberLogs, setMemberLogs] = useState(propMemberLogs || []);
  const [logLimit, setLogLimit] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isDirtyByUser, setIsDirtyByUser] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const isSubmittingRef = useRef(false);

  // Selective Save State
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [selectedChangeKeys, setSelectedChangeKeys] = useState(new Set());

  // ─── Sync prop → local ───
  useEffect(() => {
    setLocalMember(initialMember);
  }, [initialMember]);
  useEffect(() => {
    if (!localMember) return;
    setEditData(prev => ({
      ...prev,
      credits: localMember.credits,
      startDate: localMember.startDate,
      endDate: localMember.endDate,
      attendanceCount: localMember.attendanceCount,
      subject: localMember.subject || prev.subject,
      regDate: localMember.regDate || prev.regDate,
      price: localMember.price !== undefined ? localMember.price : prev.price
    }));
  }, [localMember?.credits, localMember?.startDate, localMember?.endDate, localMember?.attendanceCount, localMember?.price, localMember?.subject, localMember?.regDate]);

  // ─── Real-time Member Listener ───
  useEffect(() => {
    if (!member?.id || member?.role === 'instructor') return;
    const unsub = onSnapshot(tenantDb.doc('members', member.id), snap => {
      if (snap.exists()) setLocalMember({
        id: snap.id,
        ...snap.data()
      });
    }, err => console.error("[AdminMemberDetail] Member listener error:", err));
    return () => unsub();
  }, [member?.id]);

  // ─── Real-time Attendance Listener ───
  useEffect(() => {
    if (!member?.id || member?.role === 'instructor') return;
    const q = query(tenantDb.collection('attendance'), where('memberId', '==', member.id), orderBy('timestamp', 'desc'), firestoreLimit(logLimit));
    const unsubAt = onSnapshot(q, snap => {
      const history = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(r => !r.deletedAt);
      setMemberLogs(history);
      if (member.endDate === 'TBD' && history.length > 0) {
        const sorted = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const d = new Date(sorted[0].timestamp);
        const startDateStr = d.toLocaleDateString('sv-SE', {
          timeZone: 'Asia/Seoul'
        });
        const safeDur = getSafeDuration(member);
        const end = new Date(d);
        end.setMonth(end.getMonth() + safeDur);
        end.setDate(end.getDate() - 1);
        const endDateStr = end.toLocaleDateString('sv-SE', {
          timeZone: 'Asia/Seoul'
        });
        storageService.updateMember(member.id, {
          startDate: startDateStr,
          endDate: endDateStr
        }).catch(() => {});
      }
    }, err => console.error("[AdminMemberDetail] Logs listener error:", err));
    return () => unsubAt();
  }, [member?.id, member?.endDate, member?.duration, logLimit]);

  // ─── Price Autofill ───
  useEffect(() => {
    if (!member?.id || member?.role === 'instructor') return;
    const isMissingPrice = member.price === undefined || member.price === 0;
    const isMissingSubject = !member.subject;
    const isMissingRegDate = !member.regDate;
    if (!isMissingPrice && !isMissingSubject && !isMissingRegDate) return;
    let isMounted = true;
    (async () => {
      try {
        const sales = await storageService.getSalesHistory(member.id);
        if (!sales?.length || !isMounted) return;
        let matchedSale = sales.find(s => s.startDate === member.startDate && s.endDate === member.endDate && s.type === 'register');
        if (!matchedSale) {
          matchedSale = sales.find(s => {
            const saleDate = s.date || s.timestamp;
            if (!saleDate || !member.regDate) return false;
            const saleDateStr = typeof saleDate === 'string' && saleDate.includes('T') ? saleDate.split('T')[0] : saleDate;
            return saleDateStr === member.regDate;
          });
        }
        if (!matchedSale) matchedSale = [...sales].sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0))[0];
        if (matchedSale) {
          const updates = {};
          if (isMissingPrice && matchedSale.amount > 0) updates.price = matchedSale.amount;
          if (isMissingSubject && matchedSale.item) updates.subject = matchedSale.item;
          if (isMissingRegDate && matchedSale.date) updates.regDate = matchedSale.date.includes('T') ? matchedSale.date.split('T')[0] : matchedSale.date;
          if (Object.keys(updates).length > 0) {
            setLocalMember(prev => ({
              ...prev,
              ...updates
            }));
            setEditData(prev => ({
              ...prev,
              ...updates
            }));
          }
        }
      } catch {}
    })();
    return () => {
      isMounted = false;
    };
  }, [member?.id, member?.price, member?.subject, member?.regDate]);

  // ─── AI Analysis ───
  useEffect(() => {
    if (!member?.id || member?.role === 'instructor' || activeTab !== 'attendance') return;
    let isMounted = true;
    storageService.getAIAnalysis(member.name, memberLogs.length, memberLogs, 12, 'ko', 'admin').then(a => {
      if (isMounted) setAiAnalysis(a);
    }).catch(() => {
      if (isMounted) setAiAnalysis({
        message: t("g_3ef6a5") || "\uB370\uC774\uD130 \uBD84\uC11D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
        isError: true
      });
    });
    return () => {
      isMounted = false;
    };
  }, [member?.id, activeTab, memberLogs.length]);

  // ─── Field Labels ───
  const FIELD_LABELS = {
    name: t("g_6eb5cd") || "\uC774\uB984",
    phone: t("g_ba8df0") || "\uC804\uD654\uBC88\uD638",
    membershipType: t("g_c4edbb") || "\uD68C\uC6D0\uAD8C \uAD6C\uBD84",
    subject: t("g_af273f") || "\uC138\uBD80 \uC774\uC6A9\uAD8C",
    regDate: t("g_252d4d") || "\uB4F1\uB85D\uC77C",
    startDate: t("g_69faaa") || "\uC218\uAC15 \uC2DC\uC791\uC77C",
    endDate: t("g_42003a") || "\uC885\uB8CC\uC77C",
    credits: t("g_386745") || "\uC794\uC5EC \uD69F\uC218",
    price: t("g_ada266") || "\uACB0\uC81C \uAE08\uC561",
    notes: t("g_f3720a") || "\uBA54\uBAA8"
  };
  const getChangedFields = useCallback(() => {
    const changes = [];
    Object.keys(FIELD_LABELS).forEach(key => {
      const original = member[key] ?? '';
      const current = editData[key] ?? '';
      if (key === 'price') {
        if (!original && !current) return;
        if (Number(original) !== Number(current)) changes.push({
          key,
          label: FIELD_LABELS[key],
          oldValue: original,
          newValue: current
        });
      } else if (original != current) {
        changes.push({
          key,
          label: FIELD_LABELS[key],
          oldValue: original,
          newValue: current
        });
      }
    });
    return changes;
  }, [member, editData]);

  // ─── Save Logic ───
  const handlePreSave = useCallback(() => {
    const changes = getChangedFields();
    if (changes.length === 0) {
      alert(t("g_ded1d4") || "\uBCC0\uACBD \uC0AC\uD56D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
      return;
    }
    const revenueRelatedKeys = ['startDate', 'endDate', 'credits'];
    const hasRevenueRelated = changes.some(c => revenueRelatedKeys.includes(c.key));
    if (changes.length === 1) {
      const change = changes[0];
      const extra = hasRevenueRelated ? t("g_8cb3c0") || "\n\n\u203B \uB9E4\uCD9C \uAE30\uB85D\uC740 \uBCC4\uB3C4\uB85C \uAD00\uB9AC\uB418\uBBC0\uB85C \uC601\uD5A5\uBC1B\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." : '';
      if (confirm(`${change.label}을(를) "${change.oldValue}"에서 "${change.newValue}"(으)로 변경하시겠습니까?${extra}`)) {
        handleFinalSave({
          [change.key]: editData[change.key]
        });
      }
    } else {
      setPendingChanges(changes);
      setSelectedChangeKeys(new Set(changes.map(c => c.key)));
      setShowChangeModal(true);
    }
  }, [getChangedFields, editData]);
  const handleFinalSave = useCallback(async dataToUpdate => {
    const success = await onUpdateMember(member.id, dataToUpdate);
    if (success) {
      if (dataToUpdate.regDate) {
        try {
          const sales = await storageService.getSalesHistory(member.id);
          const primarySale = sales?.find(s => s.startDate === member.startDate && s.endDate === member.endDate);
          if (primarySale) {
            await storageService.updateSalesRecord(primarySale.id, {
              date: dataToUpdate.regDate
            });
            alert(`저장되었습니다.\n(매출 날짜도 ${dataToUpdate.regDate}로 자동 변경)`);
            setIsDirtyByUser(false);
            setShowChangeModal(false);
            onClose();
            return;
          }
        } catch {}
      }
      alert(t("g_0c47ff") || "\uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      setIsDirtyByUser(false);
      setShowChangeModal(false);
      onClose();
    }
  }, [member, onUpdateMember, onClose]);

  // ─── Safe Close ───
  const handleSafeClose = useCallback(() => {
    const changes = getChangedFields();
    if (isDirtyByUser && changes.length > 0) {
      if (!confirm(t("g_bb11d4") || "\uC800\uC7A5\uD558\uC9C0 \uC54A\uC740 \uBCC0\uACBD \uC0AC\uD56D\uC774 \uC788\uC2B5\uB2C8\uB2E4. \uBCC0\uACBD\uC744 \uCDE8\uC18C\uD558\uACE0 \uCC3D\uC744 \uB2EB\uC73C\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) return;
    }
    onClose();
  }, [getChangedFields, isDirtyByUser, onClose]);

  // ─── Manual Attendance ───
  const handleManualAttendance = useCallback(async (dateStr, timeStr, branchId, className, instructorName) => {
    if (isSubmitting) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      // [FIX] 수동 출석의 실제 수업 시간을 백엔드에 전달하기 위해 Date와 Time을 결합해 전달합니다.
      // 서버는 ISO 포맷을 받아 KST로 변환 후 dateStr(YYYY-MM-DD) 추출, 시간은 timestamp로 온전히 보전합니다.
      let combinedDateStr = dateStr;
      if (timeStr && timeStr !== 'no-time') {
        const [hh, mm] = timeStr.split(':');
        combinedDateStr = `${dateStr}T${hh}:${mm}:00+09:00`;
      }
      const result = await storageService.addManualAttendance(member.id, combinedDateStr, branchId, className || t("g_5af740") || "\uC218\uB3D9 \uD655\uC778", instructorName || t("g_0cb522") || "\uAD00\uB9AC\uC790");
      if (result.success) {
        if (member.startDate === 'TBD') {
          const startDateStr = dateStr;
          const d = new Date(dateStr);
          const safeDur = getSafeDuration(member);
          const end = new Date(d);
          end.setMonth(end.getMonth() + safeDur);
          end.setDate(end.getDate() - 1);
          const endDateStr = end.toLocaleDateString('sv-SE', {
            timeZone: 'Asia/Seoul'
          });
          await storageService.updateMember(member.id, {
            startDate: startDateStr,
            endDate: endDateStr
          });
          setLocalMember(prev => ({
            ...prev,
            startDate: startDateStr,
            endDate: endDateStr
          }));
          if (onUpdateMember) onUpdateMember(member.id, {
            startDate: startDateStr,
            endDate: endDateStr
          });
        }
        if (member.upcomingMembership) {
          try {
            const fresh = await storageService.getMemberById(member.id);
            if (fresh) setLocalMember(prev => ({
              ...prev,
              credits: fresh.credits,
              startDate: fresh.startDate,
              endDate: fresh.endDate,
              membershipType: fresh.membershipType,
              upcomingMembership: fresh.upcomingMembership || null
            }));
          } catch {}
        }
        alert(t("g_85eb30") || "\uC218\uB3D9 \uCD9C\uC11D\uCC98\uB9AC\uAC00 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      } else {
        alert((t("g_b1b1d6") || "\uCD9C\uC11D \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4: ") + (result.message || t("g_053d5f") || "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"));
      }
    } catch (e) {
      console.error(e);
      alert(t("g_7b4a71") || "\uCD9C\uC11D \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isSubmitting, member]);

  // ─── Delete Attendance ───
  const handleDeleteAttendance = useCallback(async logId => {
    if (isSubmitting) return;
    if (!confirm(t("g_afb8e4") || "\uC815\uB9D0 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await storageService.deleteAttendance(logId, true);
      if (result.success) {
        setTimeout(() => {
          storageService.notifyListeners('logs');
          storageService.notifyListeners('members');
        }, 500);
      } else {
        throw new Error(result.message || t("g_ab8524") || "\uC0AD\uC81C \uC2E4\uD328");
      }
    } catch (e) {
      console.error(e);
      alert(`삭제에 실패했습니다: ${e.message}`);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isSubmitting]);
  return {
    member,
    editData,
    memberLogs,
    logLimit,
    setLogLimit,
    isSubmitting,
    aiAnalysis,
    isDirtyByUser,
    activeTab,
    setActiveTab,
    showChangeModal,
    setShowChangeModal,
    pendingChanges,
    selectedChangeKeys,
    setSelectedChangeKeys,
    setEditData: updater => {
      setIsDirtyByUser(true);
      setEditData(updater);
    },
    setEditDataRaw: setEditData,
    handlePreSave,
    handleFinalSave,
    handleSafeClose,
    handleManualAttendance,
    handleDeleteAttendance,
    FIELD_LABELS
  };
};