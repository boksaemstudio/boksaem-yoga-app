/**
 * Attendance Service — Check-in, Manual Attendance, History
 * TypeScript version — Full type annotations
 */
import { db, functions, app } from '../firebase';
import { doc, query, where, orderBy, getDocs, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot, limit as firestoreLimit, increment, Unsubscribe } from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { memberService } from './memberService';
import { evaluateUpcomingActivation, isTBD, calculateEndDate } from '../utils/membershipUtils';
import { tenantDb } from '../utils/tenantDb';

// ── Types ──
export interface AttendanceLog {
    id: string;
    memberId?: string;
    memberName?: string;
    branchId?: string;
    className?: string;
    instructor?: string;
    classTime?: string;
    type?: string;
    date?: string;
    timestamp?: string;
    status?: string;
    denialReason?: string;
    photoUrl?: string;
    sessionCount?: number;
    [key: string]: unknown;
}

export interface CheckInResult {
    success: boolean;
    message?: string;
    isOffline?: boolean;
    attendanceId?: string;
    attendanceStatus?: string;
    denialReason?: string;
    isDuplicate?: boolean;
    member?: Record<string, unknown>;
}

interface Dependencies {
    getCurrentClass: (branchId: string) => Promise<{ title?: string; instructor?: string; time?: string } | null>;
    logError: (error: unknown, context: Record<string, unknown>) => Promise<void>;
}

// ── Helpers ──
const withTimeout = <T>(promise: Promise<T>, timeoutMs = 10000, errorMsg = '서버 응답 시간 초과'): Promise<T> => {
    return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs))]);
};

const safeUUID = (): string => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

// ── State ──
let cachedAttendance: AttendanceLog[] = [];
let notifyCallback: () => void = () => {};
let attendanceListenerUnsubscribe: Unsubscribe | null = null;
let deps: Dependencies = { getCurrentClass: async () => null, logError: async () => {} };

// ── Service ──
export const attendanceService = {
    setNotifyCallback(callback: () => void): void { notifyCallback = callback; },
    setDependencies(dependencies: Partial<Dependencies>): void { deps = { ...deps, ...dependencies }; },

    setupAttendanceListener(): Unsubscribe | null {
        try {
            if (attendanceListenerUnsubscribe) attendanceListenerUnsubscribe();
            attendanceListenerUnsubscribe = onSnapshot(
                query(tenantDb.collection('attendance'), orderBy("timestamp", "desc"), firestoreLimit(500)),
                (snapshot) => { cachedAttendance = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLog)); notifyCallback(); },
                (error) => console.warn(`[attendanceService] Listener error:`, error)
            );
            return attendanceListenerUnsubscribe;
        } catch (e) { console.error(`[attendanceService] Failed to subscribe:`, e); return null; }
    },

    getAttendance(): AttendanceLog[] { return cachedAttendance; },

    async clearAllAttendance(): Promise<{ success: boolean; count?: number; message?: string }> {
        try {
            const { writeBatch } = await import('firebase/firestore');
            const snapshot = await getDocs(tenantDb.collection('attendance'));
            if (snapshot.empty) return { success: true, count: 0 };
            const docs = snapshot.docs; const CHUNK_SIZE = 500; let deletedCount = 0;
            for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
                const batch = writeBatch(db); const chunk = docs.slice(i, i + CHUNK_SIZE);
                chunk.forEach(d => batch.delete(d.ref)); await batch.commit(); deletedCount += chunk.length;
            }
            cachedAttendance = []; notifyCallback();
            return { success: true, count: deletedCount };
        } catch (e) { console.error("Clear all attendance failed:", e); return { success: false, message: (e as Error).message }; }
    },

    async getAttendanceByMemberId(memberId: string): Promise<AttendanceLog[]> {
        let results = cachedAttendance.filter(log => log.memberId === memberId)
            .sort((a, b) => new Date(b.timestamp || '').getTime() - new Date(a.timestamp || '').getTime());
        if (results.length === 0) {
            try {
                const q = query(tenantDb.collection('attendance'), where('memberId', '==', memberId));
                const snapshot = await getDocs(q);
                results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLog)).filter(r => !(r as Record<string, unknown>).deletedAt);
                results.sort((a, b) => new Date(b.timestamp || '').getTime() - new Date(a.timestamp || '').getTime());
            } catch (e) { console.warn('[Attendance] Firestore fallback failed:', e); }
        }
        return results;
    },

    async getAttendanceByDate(dateStr: string, branchId: string | null = null): Promise<AttendanceLog[]> {
        try {
            const q = query(tenantDb.collection('attendance'), where("date", "==", dateStr));
            const snapshot = await getDocs(q);
            let records: AttendanceLog[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLog)).filter(r => !(r as Record<string, unknown>).deletedAt);
            records.sort((a, b) => { const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0; const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0; return timeB - timeA; });
            if (branchId) records = records.filter(r => r.branchId === branchId);
            return records;
        } catch (e) { console.warn("Get attendance by date failed:", e); return []; }
    },

    subscribeAttendance(dateStr: string, branchId: string | null = null, callback: (records: AttendanceLog[]) => void): Unsubscribe {
        try {
            const q = query(tenantDb.collection('attendance'), where("date", "==", dateStr));
            return onSnapshot(q, (snapshot) => {
                let records: AttendanceLog[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLog)).filter(r => !(r as Record<string, unknown>).deletedAt);
                records.sort((a, b) => { const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0; const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0; return timeB - timeA; });
                if (branchId) records = records.filter(r => r.branchId === branchId);
                callback(records);
            }, (error) => { console.warn('[attendanceService] Attendance listener error:', error); });
        } catch (e) { console.error('[attendanceService] Failed to subscribe to attendance:', e); return (() => {}) as Unsubscribe; }
    },

    async deleteAttendance(logId: string, restoreCredit = true): Promise<{ success: boolean; message?: string }> {
        try {
            const logRef = tenantDb.doc('attendance', logId);
            const logSnap = await getDoc(logRef);
            const { writeBatch: wb } = await import('firebase/firestore');
            const batch = wb(db);

            if (logSnap.exists()) {
                const logData = logSnap.data() as AttendanceLog;
                const lowerStatus = (logData.status || '').toLowerCase();
                const wasValid = lowerStatus === 'valid' || lowerStatus === 'success' || (!logData.status && !logData.denialReason);
                if (restoreCredit && logData.memberId && wasValid && (logData.type === 'checkin' || logData.type === 'manual' || !logData.type || logData.type === 'attendance')) {
                    const creditsToRestore = logData.sessionCount || 1;
                    batch.update(tenantDb.doc('members', logData.memberId), { credits: increment(creditsToRestore), attendanceCount: increment(-creditsToRestore) });
                }
            }
            // Soft Delete: 실제 삭제 대신 deletedAt 필드 설정 (복원 가능)
            batch.update(logRef, { deletedAt: new Date().toISOString(), _deletedBy: 'admin' });
            await batch.commit();

            // 사진은 보존 (soft delete이므로 나중에 복원 시 필요)
            cachedAttendance = cachedAttendance.filter(l => l.id !== logId);
            notifyCallback();
            return { success: true };
        } catch (e) {
            console.error("Soft-delete attendance failed:", e);
            await deps.logError(e, { context: 'deleteAttendance', logId });
            return { success: false, message: (e as Error).message };
        }
    },

    async restoreAttendance(logId: string): Promise<{ success: boolean; message?: string }> {
        try {
            const logRef = tenantDb.doc('attendance', logId);
            const logSnap = await getDoc(logRef);
            if (!logSnap.exists()) return { success: false, message: '출석 기록을 찾을 수 없습니다.' };

            const logData = logSnap.data() as AttendanceLog;
            const { writeBatch: wb, deleteField: df } = await import('firebase/firestore');
            const batch = wb(db);

            // deletedAt 필드 제거
            batch.update(logRef, { deletedAt: df(), _deletedBy: df() });

            // 크레딧 차감 복원
            const lowerStatus = (logData.status || '').toLowerCase();
            const wasValid = lowerStatus === 'valid' || lowerStatus === 'success' || (!logData.status && !logData.denialReason);
            if (logData.memberId && wasValid && (logData.type === 'checkin' || logData.type === 'manual' || !logData.type || logData.type === 'attendance')) {
                const creditsToDeduct = logData.sessionCount || 1;
                batch.update(tenantDb.doc('members', logData.memberId), { credits: increment(-creditsToDeduct), attendanceCount: increment(creditsToDeduct) });
            }

            await batch.commit();
            notifyCallback();
            return { success: true };
        } catch (e) {
            console.error("Restore attendance failed:", e);
            return { success: false, message: (e as Error).message };
        }
    },

    async getDeletedAttendance(): Promise<AttendanceLog[]> {
        try {
            const q = query(tenantDb.collection('attendance'), where('deletedAt', '!=', null), orderBy('deletedAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLog));
        } catch (e) {
            console.warn("[attendanceService] getDeletedAttendance failed:", e);
            return [];
        }
    },

    async permanentDeleteAttendance(logId: string): Promise<{ success: boolean; message?: string }> {
        try {
            await deleteDoc(tenantDb.doc('attendance', logId));
            notifyCallback();
            return { success: true };
        } catch (e) {
            console.error('[attendanceService] Permanent delete attendance failed:', e);
            return { success: false, message: (e as Error).message };
        }
    },

    async syncPendingCheckins(): Promise<{ successCount: number; remainingCount: number }> {
        if (!navigator.onLine) return { successCount: 0, remainingCount: 0 };
        const queue: Record<string, unknown>[] = JSON.parse(localStorage.getItem('pending_checkins_queue') || '[]');
        if (queue.length === 0) return { successCount: 0, remainingCount: 0 };
        const pendingRef = tenantDb.collection('pending_attendance');
        const remainingQueue: Record<string, unknown>[] = []; let successCount = 0;
        for (const item of queue) { try { await addDoc(pendingRef, item); successCount++; } catch { remainingQueue.push(item); } }
        if (remainingQueue.length > 0) localStorage.setItem('pending_checkins_queue', JSON.stringify(remainingQueue));
        else localStorage.removeItem('pending_checkins_queue');
        return { successCount, remainingCount: remainingQueue.length };
    },

    async checkInById(memberId: string, branchId: string, force = false, eventId: string | null = null, facialMatched = false): Promise<CheckInResult> {
        try {
            const checkInMember = httpsCallable(functions, 'checkInMemberV2Call');
            const currentClassInfo = await deps.getCurrentClass(branchId);
            const classTitle = currentClassInfo?.title || '자율수련';
            const instructor = currentClassInfo?.instructor || '미지정';
            let lastErr: Error | null = null;

            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const response = await withTimeout(
                        checkInMember({ memberId, branchId, classTitle, instructor, classTime: currentClassInfo?.time || null, force, eventId: eventId || safeUUID(), facialMatched }),
                        12000, 'timeout'
                    );
                    const data = response.data as Record<string, unknown>;
                    if (data.success) {
                        return {
                            success: true,
                            message: data.isMultiSession ? `[${classTitle}] ${data.sessionCount}회차 출석되었습니다!` : `[${classTitle}] 출석되었습니다!`,
                            attendanceId: data.attendanceId as string, attendanceStatus: data.attendanceStatus as string,
                            denialReason: data.denialReason as string, isDuplicate: data.isDuplicate as boolean,
                            member: { id: memberId, name: data.memberName, credits: data.newCredits, attendanceCount: data.attendanceCount, streak: data.streak, startDate: data.startDate, endDate: data.endDate, isMultiSession: data.isMultiSession, sessionCount: data.sessionCount }
                        };
                    } else {
                        return { success: false, message: (data.message as string) || 'Check-in failed' };
                    }
                } catch (error) {
                    lastErr = error as Error;
                    const errCode = (error as { code?: string }).code;
                    const logicErrorCodes = ['invalid-argument', 'failed-precondition', 'out-of-range', 'unauthenticated', 'permission-denied', 'not-found', 'already-exists', 'resource-exhausted', 'aborted', 'cancelled', 'unknown'];
                    if (errCode && logicErrorCodes.includes(errCode)) return { success: false, message: (error as Error).message };
                    if (attempt === 1 && navigator.onLine) continue;
                    break;
                }
            }

            // Offline fallback
            console.warn(`[attendanceService] Offline mode triggered. Reason: ${lastErr?.message || 'Unknown'}`);
            const member = memberService.getMemberById(memberId);
            const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            const now = new Date().toISOString();

            if (member) {
                let isExpired = false; let denialReason: string | null = null;
                if (member.endDate) { if (new Date(today) > new Date(member.endDate)) { isExpired = true; denialReason = 'expired'; } }
                if (!isExpired && (member.credits || 0) <= 0) { isExpired = true; denialReason = 'no_credits'; }
                if (isExpired && member.upcomingMembership?.startDate) {
                    const { shouldActivate, newFields } = evaluateUpcomingActivation(member as Record<string, unknown>, today);
                    if (shouldActivate) { Object.assign(member, newFields); isExpired = false; denialReason = null; }
                }
                if (isExpired) return { success: true, isOffline: true, attendanceStatus: 'denied', denialReason: denialReason || undefined, message: '기간 혹은 횟수가 만료되었습니다. (오프라인)', member };
            }

            const pendingData: Record<string, unknown> = {
                memberId, branchId, classTitle, instructor, classTime: currentClassInfo?.time || null,
                date: today, timestamp: now, status: 'pending-offline', eventId: eventId || safeUUID(), facialMatched,
                activatedUpcomingMembership: member && member.startDate === today ? { membershipType: member.membershipType, startDate: member.startDate, endDate: member.endDate, credits: member.credits } : null
            };

            try { await addDoc(tenantDb.collection('pending_attendance'), pendingData); }
            catch (firestoreErr) {
                console.error("[attendanceService] Firestore write failed. LocalStorage fallback:", (firestoreErr as Error).message);
                const localQueue: Record<string, unknown>[] = JSON.parse(localStorage.getItem('pending_checkins_queue') || '[]');
                localQueue.push(pendingData); localStorage.setItem('pending_checkins_queue', JSON.stringify(localQueue));
            }

            const newCredits = (member?.credits || 0) > 0 ? ((member?.credits || 0) - 1) : 0;
            const newCount = (member?.attendanceCount || 0) + 1;
            const updatePayload: Record<string, unknown> = { credits: newCredits, attendanceCount: newCount, lastAttendance: now };
            if ((pendingData.activatedUpcomingMembership as Record<string, unknown> | null)) { updatePayload.membershipType = member?.membershipType; updatePayload.startDate = member?.startDate; updatePayload.endDate = member?.endDate; updatePayload.upcomingMembership = null; }
            if (member) memberService._updateLocalMemberCache(memberId, updatePayload);

            return { success: true, isOffline: true, message: `[${classTitle}] 출석되었습니다!`, member: { ...(member || {}), name: member?.name || '회원', credits: newCredits, attendanceCount: newCount, membershipType: (updatePayload.membershipType || member?.membershipType) as string, startDate: (updatePayload.startDate || member?.startDate) as string, endDate: (updatePayload.endDate || member?.endDate) as string } };
        } catch (error) { return { success: false, message: (error as Error).message }; }
    },

    async addManualAttendance(memberId: string, date: string, branchId: string, className = "수동 확인", instructor = "관리자", { skipCreditDeduction = false } = {}): Promise<{ success: boolean; id?: string; message?: string }> {
        try {
            // [DRY Refactor] 모든 비즈니스 로직은 서버의 coreLogic.js가 처리.
            // 프론트엔드는 파라미터만 전달하는 thin client.
            const adminAddAttendance = httpsCallable(functions, 'adminAddAttendanceCall');
            const response = await adminAddAttendance({ memberId, branchId, date, className, instructor, skipCreditDeduction });
            const data = response.data as Record<string, unknown>;
            if (data.success) {
                notifyCallback();
                return { success: true, id: data.attendanceId as string };
            }
            return { success: false, message: (data.message as string) || '수동 출석 처리 실패' };
        } catch (e) { console.error("Add manual attendance failed:", e); return { success: false, message: (e as Error).message }; }
    },

    async updatePastAttendanceRecords(branchId: string, dateStr: string, oldClasses: Array<{ time?: string; title?: string; className?: string; instructor?: string; duration?: number; status?: string }> | null, newClasses: Array<{ time?: string; title?: string; className?: string; instructor?: string; duration?: number }> | null): Promise<{ success: boolean; count?: number; message?: string }> {
        try {
            if (!oldClasses || !newClasses) return { success: true, count: 0 };
            interface ChangedClass { time: string; duration: number; oldTitle?: string; oldInst?: string; newTitle?: string; newInst?: string; }
            const changedClasses: ChangedClass[] = [];
            newClasses.forEach(newCls => {
                if (!newCls.time) return;
                const oldCls = oldClasses.find(c => c.time === newCls.time);
                if (oldCls) {
                    const isTitleChanged = (oldCls.title || oldCls.className) !== (newCls.title || newCls.className);
                    const isInstChanged = oldCls.instructor !== newCls.instructor;
                    if (isTitleChanged || isInstChanged) changedClasses.push({ time: newCls.time, duration: newCls.duration || 60, oldTitle: oldCls.title || oldCls.className, oldInst: oldCls.instructor, newTitle: newCls.title || newCls.className, newInst: newCls.instructor });
                }
            });
            if (changedClasses.length === 0) return { success: true, count: 0 };

            const q = query(tenantDb.collection('attendance'), where("date", "==", dateStr), where("branchId", "==", branchId));
            const snapshot = await getDocs(q);
            if (snapshot.empty) return { success: true, count: 0 };

            const { writeBatch: wb } = await import('firebase/firestore');
            const batch = wb(db); let updateCount = 0;
            snapshot.docs.forEach(docSnap => {
                const log = docSnap.data() as AttendanceLog;
                changedClasses.forEach(changedCls => {
                    const [classH, classM] = changedCls.time.split(':').map(Number);
                    const classStartMins = classH * 60 + classM; const classEndMins = classStartMins + changedCls.duration;
                    const logDate = new Date(log.timestamp || ''); const logMins = logDate.getHours() * 60 + logDate.getMinutes();
                    if (logMins >= classStartMins - 30 && logMins <= classEndMins + 30) {
                        if (log.className === changedCls.oldTitle || log.instructor === changedCls.oldInst) {
                            batch.update(tenantDb.doc('attendance', docSnap.id), { className: changedCls.newTitle, instructor: changedCls.newInst });
                            updateCount++;
                        }
                    }
                });
            });
            if (updateCount > 0) await batch.commit();
            return { success: true, count: updateCount };
        } catch (e) { console.error("[attendanceService] Failed retroactive update:", e); return { success: false, message: (e as Error).message }; }
    }
};
