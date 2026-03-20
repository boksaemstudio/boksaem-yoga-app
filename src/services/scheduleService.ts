/**
 * Schedule Service — Monthly/Daily Classes, Templates, Backups
 * TypeScript version — Full type annotations
 */
import { db, auth } from "../firebase";
import { getDocs, getDoc, setDoc, query, where, writeBatch, onSnapshot, Unsubscribe } from "firebase/firestore";
import { tenantDb } from '../utils/tenantDb';

// ── Types ──
export interface DailyClass {
    time?: string;
    title?: string;
    name?: string;
    className?: string;
    instructor?: string;
    status?: string;
    level?: string;
    duration?: number;
    [key: string]: unknown;
}

export interface DailyUpdate {
    date: string;
    classes: DailyClass[];
}

export interface ScheduleStatus {
    exists: boolean;
    isSaved: boolean;
    isLegacy?: boolean;
}

export interface ScheduleBackup {
    id: string;
    branchId: string;
    year: number;
    month: number;
    classes: Record<string, unknown>;
    timestamp: string;
    createdBy?: string;
}

export interface WeeklyTemplateClass {
    startTime?: string;
    className?: string;
    instructor?: string;
    level?: string;
    duration?: number;
    days: string[];
    [key: string]: unknown;
}

type ScheduleResult = { success: boolean; message?: string; error?: unknown; backupId?: string; count?: number };

// ── Helpers ──
const getDayName = (date: Date): string => ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

// ── Service — Queries ──
export const getMonthlyClasses = async (branchId: string, year: number, month: number): Promise<Record<string, DailyClass[]>> => {
    if (!branchId) return {};
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month).padStart(2, '0')}-31`;
    const q = query(tenantDb.collection('daily_classes'), where('branchId', '==', branchId), where('date', '>=', startStr), where('date', '<=', endStr));
    try {
        const snapshot = await getDocs(q);
        const monthlyData: Record<string, DailyClass[]> = {};
        snapshot.docs.forEach(d => { const data = d.data() as { date: string; classes: DailyClass[] }; monthlyData[data.date] = data.classes; });
        return monthlyData;
    } catch (e) { console.warn("Failed to fetch monthly classes:", e); return {}; }
};

export const subscribeMonthlyClasses = (branchId: string, year: number, month: number, callback: (data: Record<string, DailyClass[]>) => void): Unsubscribe => {
    if (!branchId) return () => {};
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month).padStart(2, '0')}-31`;
    const q = query(tenantDb.collection('daily_classes'), where('branchId', '==', branchId), where('date', '>=', startStr), where('date', '<=', endStr));
    return onSnapshot(q, (snapshot) => {
        const monthlyData: Record<string, DailyClass[]> = {};
        snapshot.docs.forEach(d => { const data = d.data() as { date: string; classes: DailyClass[] }; monthlyData[data.date] = data.classes; });
        callback(monthlyData);
    }, (error) => { console.warn("Failed to subscribe to monthly classes:", error); callback({}); });
};

export const getMonthlyScheduleStatus = async (branchId: string, year: number, month: number): Promise<ScheduleStatus> => {
    try {
        const metaDocId = `${branchId}_${year}_${month}`;
        const metaSnap = await getDoc(tenantDb.doc('monthly_schedules', metaDocId));
        if (metaSnap.exists()) return { exists: true, isSaved: (metaSnap.data() as { isSaved: boolean }).isSaved };
        const sampleDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const dailySnap = await getDoc(tenantDb.doc('daily_classes', `${branchId}_${sampleDate}`));
        if (dailySnap.exists()) return { exists: true, isSaved: true, isLegacy: true };
        for (let d = 2; d <= 5; d++) {
            const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dSnap = await getDoc(tenantDb.doc('daily_classes', `${branchId}_${dStr}`));
            if (dSnap.exists()) return { exists: true, isSaved: true, isLegacy: true };
        }
        return { exists: false, isSaved: false };
    } catch (e) { console.warn("Status check failed:", e); return { exists: false, isSaved: false }; }
};

// ── Service — Mutations ──
export const updateDailyClasses = async (branchId: string, date: string, classes: DailyClass[]): Promise<ScheduleResult> => {
    try {
        await setDoc(tenantDb.doc('daily_classes', `${branchId}_${date}`), { branchId, date, classes, updatedAt: new Date().toISOString() });
        return { success: true };
    } catch (e) { console.error("Update daily classes failed:", e); throw e; }
};

export const batchUpdateDailyClasses = async (branchId: string, updates: DailyUpdate[]): Promise<ScheduleResult> => {
    try {
        const batch = writeBatch(db);
        updates.forEach(update => {
            batch.set(tenantDb.doc('daily_classes', `${branchId}_${update.date}`), { branchId, date: update.date, classes: update.classes, updatedAt: new Date().toISOString() });
        });
        await batch.commit();
        return { success: true };
    } catch (e) { console.error("Batch update failed:", e); throw e; }
};

const generateScheduleFromTemplateImpl = async (branchId: string, year: number, month: number, template: WeeklyTemplateClass[]): Promise<ScheduleResult> => {
    const updates: DailyUpdate[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const templateMap: Record<string, WeeklyTemplateClass[]> = {};
    template.forEach(cls => { cls.days.forEach(day => { if (!templateMap[day]) templateMap[day] = []; templateMap[day].push(cls); }); });
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const dayName = getDayName(date);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const classes = templateMap[dayName] || [];
        const cleanedClasses: DailyClass[] = classes.map(cls => ({ time: cls.startTime, title: cls.className, instructor: cls.instructor || '미지정', status: 'normal', level: cls.level || '', duration: cls.duration || 60 }));
        updates.push({ date: dateStr, classes: cleanedClasses });
    }
    await batchUpdateDailyClasses(branchId, updates);
    const metaDocId = `${branchId}_${year}_${month}`;
    await setDoc(tenantDb.doc('monthly_schedules', metaDocId), { branchId, year, month, isSaved: true, createdAt: new Date().toISOString(), createdBy: auth.currentUser?.email || 'admin' });
    return { success: true };
};

export const createMonthlySchedule = async (branchId: string, year: number, month: number, defaultScheduleTemplate: Record<string, WeeklyTemplateClass[]> = {}): Promise<ScheduleResult> => {
    try {
        const templateSnap = await getDoc(tenantDb.doc('weekly_templates', branchId));
        let template: WeeklyTemplateClass[] = [];
        if (templateSnap.exists()) { template = (templateSnap.data() as { classes: WeeklyTemplateClass[] }).classes || []; }
        else { console.warn("Weekly template not found, using config fallback."); template = defaultScheduleTemplate[branchId] || []; }
        return generateScheduleFromTemplateImpl(branchId, year, month, template);
    } catch (e) { console.error("Create monthly schedule failed:", e); throw e; }
};

export const copyMonthlySchedule = async (branchId: string, fromYear: number, fromMonth: number, toYear: number, toMonth: number): Promise<ScheduleResult> => {
    try {
        const daysInSourceMonth = new Date(fromYear, fromMonth, 0).getDate();
        const fetchPromises: Promise<{ day: number; date: Date; exists: boolean; data: Record<string, unknown> }>[] = [];
        for (let d = 1; d <= daysInSourceMonth; d++) {
            const dStr = `${fromYear}-${String(fromMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            fetchPromises.push(getDoc(tenantDb.doc('daily_classes', `${branchId}_${dStr}`)).then(snap => ({ day: d, date: new Date(fromYear, fromMonth - 1, d), exists: snap.exists(), data: (snap.data() || {}) as Record<string, unknown> })));
        }
        const results = await Promise.all(fetchPromises);
        const validDays = results.filter(r => r.exists && (r.data.classes as DailyClass[])?.length > 0);
        if (validDays.length === 0) throw new Error("지난 달 데이터가 전혀 없어 복사할 수 없습니다.");

        // Extract best weekday template
        const weeks: Record<number, typeof validDays> = {};
        validDays.forEach(r => { const dayIdx = r.date.getDay(); if (dayIdx === 0 || dayIdx === 6) return; const weekNum = Math.ceil(r.day / 7); if (!weeks[weekNum]) weeks[weekNum] = []; weeks[weekNum].push(r); });
        let bestWeekNum: number | null = null; let maxScore = -1;
        Object.entries(weeks).forEach(([weekNum, days]) => {
            const score = days.reduce((acc, curr) => acc + ((curr.data.classes as DailyClass[]) || []).filter(cls => cls.status !== 'cancelled').length, 0);
            if (score > maxScore) { maxScore = score; bestWeekNum = Number(weekNum); }
        });

        const weekdayTemplate: Record<string, DailyClass[]> = {};
        if (bestWeekNum && weeks[bestWeekNum]) {
            weeks[bestWeekNum].forEach(r => { weekdayTemplate[getDayName(r.date)] = ((r.data.classes as DailyClass[]) || []).map(cls => ({ ...cls, status: 'normal' })); });
        } else {
            validDays.forEach(r => { const name = getDayName(r.date); if (name !== '토' && name !== '일' && !weekdayTemplate[name]) weekdayTemplate[name] = ((r.data.classes as DailyClass[]) || []).map(cls => ({ ...cls, status: 'normal' })); });
        }

        const sourceSaturdays = validDays.filter(r => r.date.getDay() === 6).sort((a, b) => a.day - b.day).map(r => ((r.data.classes as DailyClass[]) || []).map(cls => ({ ...cls, status: 'normal' })));
        const sourceSundays = validDays.filter(r => r.date.getDay() === 0).sort((a, b) => a.day - b.day).map(r => ((r.data.classes as DailyClass[]) || []).map(cls => ({ ...cls, status: 'normal' })));

        const updates: DailyUpdate[] = [];
        const daysInTargetMonth = new Date(toYear, toMonth, 0).getDate();
        let saturdayIndex = 0; let sundayIndex = 0;
        for (let d = 1; d <= daysInTargetMonth; d++) {
            const targetDate = new Date(toYear, toMonth - 1, d);
            const dayName = getDayName(targetDate);
            const dateStr = `${toYear}-${String(toMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            let classesToCopy: DailyClass[] = [];
            if (dayName === '토') { if (sourceSaturdays.length > 0) { classesToCopy = sourceSaturdays[saturdayIndex % sourceSaturdays.length]; saturdayIndex++; } }
            else if (dayName === '일') { if (sourceSundays.length > 0) { classesToCopy = sourceSundays[sundayIndex % sourceSundays.length]; sundayIndex++; } }
            else { classesToCopy = weekdayTemplate[dayName] || []; }
            if (classesToCopy.length > 0) {
                updates.push({ date: dateStr, classes: classesToCopy.map(cls => ({ time: cls.time, title: cls.title, instructor: cls.instructor, status: 'normal', level: cls.level || '', duration: cls.duration || 60 })) });
            }
        }
        if (updates.length > 0) {
            await batchUpdateDailyClasses(branchId, updates);
            await setDoc(tenantDb.doc('monthly_schedules', `${branchId}_${toYear}_${toMonth}`), { branchId, year: toYear, month: toMonth, isSaved: true, createdAt: new Date().toISOString(), createdBy: auth.currentUser?.email || 'admin' });
            return { success: true, message: `지난달 데이터를 기반으로 새 스케줄이 생성되었습니다.\n(평일: ${bestWeekNum || 1}주차 패턴, 주말: 순차 적용)` };
        }
        return { success: false, message: "복사할 데이터가 없습니다." };
    } catch (e) { console.error("Copy schedule failed:", e); throw e; }
};

export const backupMonthlySchedule = async (branchId: string, year: number, month: number, classesData: Record<string, unknown>): Promise<ScheduleResult> => {
    try {
        const backupId = `${branchId}_${year}_${month}_${Date.now()}`;
        await setDoc(tenantDb.doc('monthly_schedules_backup', backupId), { branchId, year, month, classes: classesData, timestamp: new Date().toISOString(), createdBy: auth.currentUser?.email || 'admin' });
        // Cleanup old backups — keep only 2
        const q = query(tenantDb.collection('monthly_schedules_backup'), where('branchId', '==', branchId), where('year', '==', year), where('month', '==', month));
        const snapshot = await getDocs(q);
        if (snapshot.size > 2) {
            const backups: ScheduleBackup[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleBackup));
            backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const batch = writeBatch(db);
            for (let i = 2; i < backups.length; i++) batch.delete(tenantDb.doc('monthly_schedules_backup', backups[i].id));
            await batch.commit();
        }
        return { success: true, backupId };
    } catch (e) { console.error("Backup failed:", e); return { success: false, error: e }; }
};

export const deleteMonthlySchedule = async (branchId: string, year: number, month: number): Promise<ScheduleResult> => {
    try {
        const startStr = `${year}-${String(month).padStart(2, '0')}-01`; const endStr = `${year}-${String(month).padStart(2, '0')}-31`;
        const q = query(tenantDb.collection('daily_classes'), where('branchId', '==', branchId), where('date', '>=', startStr), where('date', '<=', endStr));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) { const classesData: Record<string, unknown> = {}; snapshot.docs.forEach(d => { classesData[d.id] = d.data(); }); await backupMonthlySchedule(branchId, year, month, classesData); }
        const batch = writeBatch(db); let count = 0;
        snapshot.docs.forEach(d => { batch.delete(d.ref); count++; });
        batch.delete(tenantDb.doc('monthly_schedules', `${branchId}_${year}_${month}`));
        if (count > 0 || snapshot.empty) await batch.commit();
        return { success: true, count };
    } catch (e) { console.error("Delete schedule failed:", e); throw e; }
};

export const getMonthlyBackups = async (branchId: string, year: number, month: number): Promise<ScheduleBackup[]> => {
    try {
        const q = query(tenantDb.collection('monthly_schedules_backup'), where('branchId', '==', branchId), where('year', '==', year), where('month', '==', month));
        const snapshot = await getDocs(q);
        const backups = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleBackup));
        backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return backups;
    } catch (e) { console.error("Failed to get backups:", e); return []; }
};

export const restoreMonthlyBackup = async (branchId: string, year: number, month: number, backupId: string): Promise<ScheduleResult> => {
    try {
        const backupSnap = await getDoc(tenantDb.doc('monthly_schedules_backup', backupId));
        if (!backupSnap.exists()) throw new Error("Backup not found");
        const classesData = (backupSnap.data() as { classes: Record<string, Record<string, unknown>> }).classes || {};
        const batch = writeBatch(db);
        Object.entries(classesData).forEach(([docId, data]) => { batch.set(tenantDb.doc('daily_classes', docId), data); });
        batch.set(tenantDb.doc('monthly_schedules', `${branchId}_${year}_${month}`), { branchId, year, month, isSaved: true, restoredAt: new Date().toISOString(), restoredFrom: backupId });
        await batch.commit();
        return { success: true };
    } catch (e) { console.error("Restore failed:", e); throw e; }
};

// ── Service — Config Getters ──
export const getInstructors = async (defaultScheduleTemplate: Record<string, WeeklyTemplateClass[]> = {}): Promise<(string | Record<string, unknown>)[]> => {
    try {
        const docSnap = await getDoc(tenantDb.doc('settings', 'instructors'));
        if (docSnap.exists() && (docSnap.data() as { list?: unknown[] }).list) return (docSnap.data() as { list: (string | Record<string, unknown>)[] }).list;
        const instructors = new Set<string>();
        Object.values(defaultScheduleTemplate).forEach(schedule => { schedule.forEach(cls => { if (cls.instructor) instructors.add(cls.instructor); }); });
        return Array.from(instructors).sort();
    } catch (e) { console.warn("Failed to load instructors:", e); return ['원장', '한아', '정연', '미선', '희정', '보윤', '소영', '은혜', '혜실', '세연', 'anu', '송미', '다나', '리안', '성희', '효원', '희연']; }
};

export const getClassTypes = async (defaultScheduleTemplate: Record<string, WeeklyTemplateClass[]> = {}): Promise<string[]> => {
    try {
        const docSnap = await getDoc(tenantDb.doc('settings', 'classTypes'));
        if (docSnap.exists() && (docSnap.data() as { list?: string[] }).list) return (docSnap.data() as { list: string[] }).list;
        const types = new Set<string>();
        Object.values(defaultScheduleTemplate).forEach(schedule => { schedule.forEach(cls => { if (cls.className) types.add(cls.className); }); });
        return Array.from(types).sort();
    } catch (e) { console.warn("Failed to load class types:", e); return ['하타', '마이솔', '아쉬탕가', '인요가', '하타+인', '하타인텐시브', '임신부요가', '플라잉', '키즈플라잉', '빈야사', '인양요가', '힐링', '로우플라잉']; }
};

export const getClassLevels = async (): Promise<string[]> => {
    try { const docSnap = await getDoc(tenantDb.doc('settings', 'classLevels')); if (docSnap.exists() && (docSnap.data() as { list?: string[] }).list) return (docSnap.data() as { list: string[] }).list; return ['0.5', '1', '1.5', '2']; }
    catch { return ['0.5', '1', '1.5', '2']; }
};

export const updateInstructors = async (list: (string | Record<string, unknown>)[]): Promise<ScheduleResult> => { try { await setDoc(tenantDb.doc('settings', 'instructors'), { list, updatedAt: new Date().toISOString() }, { merge: true }); return { success: true }; } catch (e) { console.error("Failed to update instructors:", e); throw e; } };
export const updateClassTypes = async (list: string[]): Promise<ScheduleResult> => { try { await setDoc(tenantDb.doc('settings', 'classTypes'), { list, updatedAt: new Date().toISOString() }, { merge: true }); return { success: true }; } catch (e) { console.error("Failed to update class types:", e); throw e; } };
export const updateClassLevels = async (list: string[]): Promise<ScheduleResult> => { try { await setDoc(tenantDb.doc('settings', 'classLevels'), { list, updatedAt: new Date().toISOString() }, { merge: true }); return { success: true }; } catch (e) { console.error("Failed to update class levels:", e); throw e; } };
