import { useLanguageStore } from '../stores/useLanguageStore';
import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storage';
import * as bookingService from '../services/bookingService';

/**
 * useScheduleData — AdminScheduleManager 데이터 로직 훅
 * 월별 스케줄 CRUD, 백업/복원, 마스터 데이터 로드 관리.
 *
 * @param {string} branchId
 * @param {Object} config
 * @returns {{ year, month, loading, monthlyClasses, scheduleStatus, images, instructors, classTypes, classLevels, monthlyBookings, handlePrevMonth, handleNextMonth, loadMonthlyData, handleCreateStandard, handleCopyPrevMonth, handleReset, confirmReset, handleOpenRestore, handleRestoreBackup, saveDayClasses, backupList, showResetConfirm, setShowResetConfirm, showRestoreModal, setShowRestoreModal }}
 */
export function useScheduleData(branchId, config) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [monthlyClasses, setMonthlyClasses] = useState({});
  const [scheduleStatus, setScheduleStatus] = useState('undefined');
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(false);
  const [instructors, setInstructors] = useState([]);
  const [classTypes, setClassTypes] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [monthlyBookings, setMonthlyBookings] = useState({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupList, setBackupList] = useState([]);
  const allowBooking = config?.POLICIES?.ALLOW_BOOKING;
  const loadMonthlyData = useCallback(async () => {
    setLoading(true);
    try {
      const status = await storageService.getMonthlyScheduleStatus(branchId, year, month);
      setScheduleStatus(status.exists && status.isSaved ? 'saved' : 'undefined');
      if (status.exists && status.isSaved) {
        const data = await storageService.getMonthlyClasses(branchId, year, month);
        setMonthlyClasses(data);
      } else {
        setMonthlyClasses({});
      }
      const imgs = await storageService.getImages();
      setImages(imgs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [branchId, year, month]);
  const loadMasterData = useCallback(async () => {
    const [instructorList, classTypeList, classLevelList] = await Promise.all([storageService.getInstructors(), storageService.getClassTypes(), storageService.getClassLevels()]);
    setInstructors(instructorList);
    setClassTypes(classTypeList);
    setClassLevels(classLevelList);
  }, []);

  // 초기화 + 실시간 구독
  useEffect(() => {
    setScheduleStatus('undefined');
    loadMonthlyData();
    loadMasterData();
    const unsub = storageService.subscribe(async eventType => {
      if (eventType === 'images' || eventType === 'all') {
        const latestImages = await storageService.getImages();
        setImages(latestImages);
      }
      if (eventType === 'dailyClasses' || eventType === 'all') loadMonthlyData();
      if (eventType === 'settings' || eventType === 'all') loadMasterData();
    }, ['images', 'dailyClasses', 'settings']);
    return () => unsub();
  }, [branchId, year, month, loadMonthlyData, loadMasterData]);

  // 예약 구독
  useEffect(() => {
    if (!allowBooking) {
      setMonthlyBookings({});
      return;
    }
    const unsub = bookingService.subscribeMonthBookings(branchId, year, month, bookings => {
      const byDate = {};
      bookings.forEach(b => {
        if (!byDate[b.date]) byDate[b.date] = [];
        byDate[b.date].push(b);
      });
      setMonthlyBookings(byDate);
    });
    return () => unsub();
  }, [year, month, branchId, allowBooking]);
  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else setMonth(month - 1);
  };
  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else setMonth(month + 1);
  };
  const handleCreateStandard = async () => {
    const confirmMsg = `📅 ${year}년 ${month}월에 '표준 시간표(기본)'를 적용하시겠습니까?\n\n기본 설정된 시간표 패턴으로 생성됩니다.`;
    if (!window.confirm(confirmMsg)) return;
    setLoading(true);
    try {
      const res = await storageService.createMonthlySchedule(branchId, year, month);
      alert(res.message || t("g_f03be7") || t("g_f03be7") || t("g_f03be7") || t("g_f03be7") || t("g_f03be7") || "\uD45C\uC900 \uC2DC\uAC04\uD45C\uAC00 \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      await loadMonthlyData();
    } catch (error) {
      console.error("Error creating standard schedule:", error);
      alert((t("g_9322f6") || t("g_9322f6") || t("g_9322f6") || t("g_9322f6") || t("g_9322f6") || "\uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ") + error.message);
    } finally {
      setLoading(false);
    }
  };
  const handleCopyPrevMonth = async () => {
    const d = new Date(year, month - 1, 1);
    d.setMonth(d.getMonth() - 1);
    const prevYear = d.getFullYear();
    const prevMonth = d.getMonth() + 1;
    if (!confirm(`${prevYear}년 ${prevMonth}월의 스케줄 패턴을 복사하여\n${year}년 ${month}월 스케줄을 생성하시겠습니까?\n\n(일요일과 토요일 일정도 순차적으로 복사됩니다.)`)) return;
    setLoading(true);
    try {
      await storageService.copyMonthlySchedule(branchId, prevYear, prevMonth, year, month);
      alert(t("g_a4f100") || t("g_a4f100") || t("g_a4f100") || t("g_a4f100") || t("g_a4f100") || "\uC774\uC804 \uB2EC \uB0B4\uC6A9\uC744 \uBC14\uD0D5\uC73C\uB85C \uC2A4\uCF00\uC904\uC774 \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      await loadMonthlyData();
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };
  const handleReset = () => setShowResetConfirm(true);
  const confirmReset = async () => {
    setShowResetConfirm(false);
    setLoading(true);
    try {
      await storageService.deleteMonthlySchedule(branchId, year, month);
      alert(t("g_fda046") || t("g_fda046") || t("g_fda046") || t("g_fda046") || t("g_fda046") || "\uC2A4\uCF00\uC904\uC774 \uCD08\uAE30\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4.\n(\uD639\uC2DC \uC2E4\uC218\uB85C \uC9C0\uC6E0\uB2E4\uBA74 [\uBC31\uC5C5 \uBCF5\uC6D0] \uBC84\uD2BC\uC73C\uB85C \uC0B4\uB9B4 \uC218 \uC788\uC2B5\uB2C8\uB2E4)");
      await loadMonthlyData();
    } catch (error) {
      console.error("Reset failed:", error);
      alert((t("g_8b4400") || t("g_8b4400") || t("g_8b4400") || t("g_8b4400") || t("g_8b4400") || "\uCD08\uAE30\uD654 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ") + error.message);
    } finally {
      setLoading(false);
    }
  };
  const handleOpenRestore = async () => {
    setLoading(true);
    try {
      const list = await storageService.getMonthlyBackups(branchId, year, month);
      setBackupList(list);
      setShowRestoreModal(true);
    } catch (e) {
      alert(t("g_3bf229") || t("g_3bf229") || t("g_3bf229") || t("g_3bf229") || t("g_3bf229") || "\uBC31\uC5C5 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uB294\uB370 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      setLoading(false);
    }
  };
  const handleRestoreBackup = async backupId => {
    if (!window.confirm(t("g_1d92ca") || t("g_1d92ca") || t("g_1d92ca") || t("g_1d92ca") || t("g_1d92ca") || "\uC120\uD0DD\uD55C \uC774\uC804 \uC2A4\uCF00\uC904\uB85C \uBCF5\uC6D0\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n\uD604\uC7AC \uC2DC\uAC04\uD45C \uB0B4\uC6A9\uC774 \uB36E\uC5B4\uC50C\uC6CC\uC9D1\uB2C8\uB2E4.")) return;
    setShowRestoreModal(false);
    setLoading(true);
    try {
      await storageService.restoreMonthlyBackup(branchId, year, month, backupId);
      alert(t("g_0c3745") || t("g_0c3745") || t("g_0c3745") || t("g_0c3745") || t("g_0c3745") || "\uC2A4\uCF00\uC904\uC774 \uC6D0\uC0C1\uBCF5\uAD6C \uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      await loadMonthlyData();
    } catch (e) {
      console.error("Restore failed:", e);
      alert(t("g_c7e408") || t("g_c7e408") || t("g_c7e408") || t("g_c7e408") || t("g_c7e408") || "\uBCF5\uC6D0 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      setLoading(false);
    }
  };
  const saveDayClasses = async (selectedDate, dayClasses, applyToAll = false) => {
    if (!selectedDate) return false;

    // ── 시간순 정렬 (HH:MM 기준) ──
    dayClasses.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
    setLoading(true);
    try {
      let shouldUpdatePastAttendance = false;
      let oldClassesSnapshot = monthlyClasses[selectedDate] || [];
      let hasRelevantChanges = false;
      dayClasses.forEach(newCls => {
        if (!newCls.time) return;
        const oldCls = oldClassesSnapshot.find(c => c.time === newCls.time);
        if (oldCls) {
          const isTitleChanged = (oldCls.title || oldCls.className) !== (newCls.title || newCls.className);
          const isInstChanged = oldCls.instructor !== newCls.instructor;
          if (isTitleChanged || isInstChanged) hasRelevantChanges = true;
        }
      });
      if (hasRelevantChanges && !applyToAll) {
        shouldUpdatePastAttendance = window.confirm(`해당 날짜(${selectedDate})의 수업명이나 강사명이 변경되었습니다.\n\n` + `이 변경 사항을 과거 출석 기록(이미 등록된 출석부)에도 일괄 적용하시겠습니까?\n` + `(적용 시 강사앱 통계 등이 수정되며, 회원의 남은 횟수/기간은 변동되지 않아 안전합니다.)`);
      }
      if (applyToAll) {
        const targetDate = new Date(selectedDate);
        const targetDayIndex = targetDate.getDay();
        const dayNames = [t("g_95e431") || t("g_95e431") || t("g_95e431") || t("g_95e431") || t("g_95e431") || "\uC77C", t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || "\uC6D4", t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || "\uD654", t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || "\uC218", t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || "\uBAA9", t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || "\uAE08", t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || "\uD1A0"];
        const targetDayName = dayNames[targetDayIndex];
        const datesToUpdate = [];
        const tempDate = new Date(year, month - 1, 1);
        while (tempDate.getMonth() === month - 1) {
          if (tempDate.getDay() === targetDayIndex) {
            const dStr = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`;
            datesToUpdate.push({
              date: dStr,
              classes: dayClasses
            });
          }
          tempDate.setDate(tempDate.getDate() + 1);
        }
        if (!window.confirm(`이번 달의 모든 [${targetDayName}요일] (${datesToUpdate.length}일)을 동일하게 수정하시겠습니까?\n\n날짜: ${datesToUpdate.map(d => d.date.split('-')[2]).join(', ')}`)) {
          setLoading(false);
          return false;
        }
        await storageService.batchUpdateDailyClasses(branchId, datesToUpdate);
        if (shouldUpdatePastAttendance) {
          for (const dateObj of datesToUpdate) {
            const oldClassesForDate = monthlyClasses[dateObj.date] || [];
            await storageService.updatePastAttendanceRecords(branchId, dateObj.date, oldClassesForDate, dateObj.classes);
          }
        }
      } else {
        await storageService.updateDailyClasses(branchId, selectedDate, dayClasses);
        if (shouldUpdatePastAttendance) {
          await storageService.updatePastAttendanceRecords(branchId, selectedDate, oldClassesSnapshot, dayClasses);
        }
      }
      await loadMonthlyData();
      return true;
    } catch (error) {
      console.error("Error saving daily classes:", error);
      alert(t("g_12ba3c") || t("g_12ba3c") || t("g_12ba3c") || t("g_12ba3c") || t("g_12ba3c") || "\uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
      return false;
    } finally {
      setLoading(false);
    }
  };
  return {
    year,
    month,
    loading,
    monthlyClasses,
    scheduleStatus,
    images,
    instructors,
    setInstructors,
    classTypes,
    setClassTypes,
    classLevels,
    setClassLevels,
    monthlyBookings,
    handlePrevMonth,
    handleNextMonth,
    loadMonthlyData,
    handleCreateStandard,
    handleCopyPrevMonth,
    handleReset,
    confirmReset,
    handleOpenRestore,
    handleRestoreBackup,
    saveDayClasses,
    backupList,
    showResetConfirm,
    setShowResetConfirm,
    showRestoreModal,
    setShowRestoreModal
  };
}