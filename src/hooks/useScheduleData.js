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
        const [instructorList, classTypeList, classLevelList] = await Promise.all([
            storageService.getInstructors(config.DEFAULT_SCHEDULE_TEMPLATE),
            storageService.getClassTypes(config.DEFAULT_SCHEDULE_TEMPLATE),
            storageService.getClassLevels()
        ]);
        setInstructors(instructorList);
        setClassTypes(classTypeList);
        setClassLevels(classLevelList);
    }, [config.DEFAULT_SCHEDULE_TEMPLATE]);

    // 초기화 + 실시간 구독
    useEffect(() => {
        setScheduleStatus('undefined');
        loadMonthlyData();
        loadMasterData();

        const unsub = storageService.subscribe(async (eventType) => {
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
        if (!allowBooking) { setMonthlyBookings({}); return; }
        const unsub = bookingService.subscribeMonthBookings(branchId, year, month, (bookings) => {
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
        if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1);
    };
    const handleNextMonth = () => {
        if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1);
    };

    const handleCreateStandard = async () => {
        const confirmMsg = `📅 ${year}년 ${month}월에 '표준 시간표(기본)'를 적용하시겠습니까?\n\n기본 설정된 시간표 패턴으로 생성됩니다.`;
        if (!window.confirm(confirmMsg)) return;
        setLoading(true);
        try {
            const res = await storageService.createMonthlySchedule(branchId, year, month, config.DEFAULT_SCHEDULE_TEMPLATE);
            alert(res.message || "표준 시간표가 생성되었습니다.");
            await loadMonthlyData();
        } catch (error) {
            console.error("Error creating standard schedule:", error);
            alert("생성 중 오류가 발생했습니다: " + error.message);
        } finally { setLoading(false); }
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
            alert('이전 달 내용을 바탕으로 스케줄이 생성되었습니다.');
            await loadMonthlyData();
        } catch (e) { console.error(e); alert(e.message); }
        finally { setLoading(false); }
    };

    const handleReset = () => setShowResetConfirm(true);

    const confirmReset = async () => {
        setShowResetConfirm(false);
        setLoading(true);
        try {
            await storageService.deleteMonthlySchedule(branchId, year, month);
            alert('스케줄이 초기화되었습니다.\n(혹시 실수로 지웠다면 [백업 복원] 버튼으로 살릴 수 있습니다)');
            await loadMonthlyData();
        } catch (error) {
            console.error("Reset failed:", error);
            alert("초기화 중 오류가 발생했습니다: " + error.message);
        } finally { setLoading(false); }
    };

    const handleOpenRestore = async () => {
        setLoading(true);
        try {
            const list = await storageService.getMonthlyBackups(branchId, year, month);
            setBackupList(list);
            setShowRestoreModal(true);
        } catch (e) { alert('백업 목록을 불러오는데 실패했습니다.'); }
        finally { setLoading(false); }
    };

    const handleRestoreBackup = async (backupId) => {
        if (!window.confirm('선택한 이전 스케줄로 복원하시겠습니까?\n현재 시간표 내용이 덮어씌워집니다.')) return;
        setShowRestoreModal(false);
        setLoading(true);
        try {
            await storageService.restoreMonthlyBackup(branchId, year, month, backupId);
            alert('스케줄이 원상복구 되었습니다.');
            await loadMonthlyData();
        } catch (e) { console.error("Restore failed:", e); alert('복원 중 오류가 발생했습니다.'); }
        finally { setLoading(false); }
    };

    const saveDayClasses = async (selectedDate, dayClasses, applyToAll = false) => {
        if (!selectedDate) return false;
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
                shouldUpdatePastAttendance = window.confirm(
                    `해당 날짜(${selectedDate})의 수업명이나 강사명이 변경되었습니다.\n\n` +
                    `이 변경 사항을 과거 출석 기록(이미 등록된 출석부)에도 일괄 적용하시겠습니까?\n` +
                    `(적용 시 강사앱 통계 등이 수정되며, 회원의 남은 횟수/기간은 변동되지 않아 안전합니다.)`
                );
            }

            if (applyToAll) {
                const targetDate = new Date(selectedDate);
                const targetDayIndex = targetDate.getDay();
                const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                const targetDayName = dayNames[targetDayIndex];
                const datesToUpdate = [];
                const tempDate = new Date(year, month - 1, 1);
                while (tempDate.getMonth() === month - 1) {
                    if (tempDate.getDay() === targetDayIndex) {
                        const dStr = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`;
                        datesToUpdate.push({ date: dStr, classes: dayClasses });
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
            alert("저장 중 오류가 발생했습니다.");
            return false;
        } finally { setLoading(false); }
    };

    return {
        year, month, loading, monthlyClasses, scheduleStatus, images,
        instructors, setInstructors, classTypes, setClassTypes, classLevels, setClassLevels,
        monthlyBookings, handlePrevMonth, handleNextMonth, loadMonthlyData,
        handleCreateStandard, handleCopyPrevMonth, handleReset, confirmReset,
        handleOpenRestore, handleRestoreBackup, saveDayClasses,
        backupList, showResetConfirm, setShowResetConfirm, showRestoreModal, setShowRestoreModal,
    };
}
