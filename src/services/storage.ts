/**
 * Storage Service — Facade & Initialization Hub
 * TypeScript version — Full type annotations
 *
 * All domain logic is in dedicated services. This facade
 * delegates all `storageService.xxx()` calls to them.
 */
import { auth } from "../firebase";
import { signInAnonymously, User } from "firebase/auth";
import { onSnapshot, query, orderBy, addDoc, QuerySnapshot, DocumentData, Unsubscribe } from 'firebase/firestore';
import { tenantDb } from '../utils/tenantDb';
import { STUDIO_CONFIG } from '../studioConfig';

// Domain Services
import * as scheduleService from './scheduleService';
import * as noticeService from './noticeService';
import * as aiService from './aiService';
import { memberService, Member } from './memberService';
import { attendanceService, AttendanceLog } from './attendanceService';
import { paymentService, SalesRecord } from './paymentService';
import { messageService, Message, ApprovalItem } from './messageService';
import { authService } from './authService';
import { pushService, PushToken, PushStatus, PushHistoryItem } from './pushService';
import { classService } from './classService';
import { configService } from './configService';
import { migrationService, MigrationResult } from './migrationService';
import type { Notice } from './noticeService';
import type { DailyClass, DailyUpdate, ScheduleStatus, ScheduleBackup, WeeklyTemplateClass } from './scheduleService';

// Added for Demo Localization
import { useLanguageStore } from '../stores/useLanguageStore';
import { getCurrentStudioId } from '../utils/resolveStudioId';
import { 
    localizeMembers, 
    localizeSchedules, 
    localizeNotices, 
    localizeInstructors,
    localizePricings
} from '../utils/demoLocalization';

// ── Types ──
type EventType = 'members' | 'logs' | 'sales' | 'images' | 'notices' | 'general';
type ListenerCallback = (eventType: string) => void;

interface ErrorLogEntry {
    id: string;
    message: string;
    context: Record<string, unknown>;
    url: string;
    timestamp: string;
    userId: string;
}

// ── State ──
let cachedNotices: Notice[] = [];
const listeners: Record<EventType, ListenerCallback[]> = {
    members: [], logs: [], sales: [], images: [], notices: [], general: []
};

// ── Pub/Sub ──
const notifyListeners = (eventType: EventType = 'general'): void => {
    if (listeners[eventType]) listeners[eventType].forEach(callback => callback(eventType));
    if (eventType !== 'general' && listeners['general']) listeners['general'].forEach(callback => callback(eventType));
};

// ── Facade ──
export const storageService = {
    _initialized: false,
    _initializedMode: '' as string,
    _refreshInterval: null as ReturnType<typeof setInterval> | null,
    _lastKioskSync: '' as string,

    notifyListeners,

    subscribe(callback: ListenerCallback, eventTypes: EventType[] | EventType = ['general']): () => void {
        const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
        types.forEach(type => { if (!listeners[type]) (listeners as Record<string, ListenerCallback[]>)[type] = []; listeners[type].push(callback); });
        return () => { types.forEach(type => { if (listeners[type]) listeners[type] = listeners[type].filter(cb => cb !== callback); }); };
    },

    // ═══ INITIALIZATION ═══
    async initialize({ mode = 'full' } = {}): Promise<void> {
        if (this._initialized && this._initializedMode === mode) return;
        this._initialized = true;
        this._initializedMode = mode;

        memberService.setNotifyCallback(() => notifyListeners('members'));
        attendanceService.setNotifyCallback(() => notifyListeners('logs'));
        paymentService.setNotifyCallback(() => notifyListeners('sales'));
        messageService.setNotifyCallback();
        attendanceService.setDependencies({ getCurrentClass: this.getCurrentClass.bind(this), logError: this.logError.bind(this) });

        try {
            await new Promise<User | null>((resolve) => { const unsubscribe = auth.onAuthStateChanged((user) => { unsubscribe(); resolve(user); }); });
            if (!auth.currentUser) await signInAnonymously(auth);
        } catch (authError) { console.error("Auth initialization failed:", authError); }

        const safelySubscribe = (queryOrRef: ReturnType<typeof query>, cacheUpdater: (snapshot: QuerySnapshot<DocumentData>) => void, name: string, eventType: EventType = 'general'): Unsubscribe | undefined => {
            try {
                return onSnapshot(queryOrRef, (snapshot) => { cacheUpdater(snapshot); notifyListeners(eventType); }, (error) => { console.warn(`[Storage] Listener error for ${name}:`, error); });
            } catch (e) { console.error(`[Storage] Failed to subscribe to ${name}:`, e); return undefined; }
        };

        if (mode === 'kiosk') {
            console.time('[Kiosk] Full Cache Load');
            await memberService.loadAllMembers();
            memberService.setupMemberListener();
            try {
                const today = new Date();
                const dates: string[] = [];
                for (let i = -1; i <= 1; i++) { const d = new Date(today); d.setDate(d.getDate() + i); dates.push(d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })); }
                const branches = ((STUDIO_CONFIG as Record<string, unknown>).BRANCHES as Array<{ id: string }> || []).map(b => b.id);
                const fetchPromises: Promise<unknown>[] = [];
                dates.forEach(date => { branches.forEach(branchId => { fetchPromises.push(classService._refreshDailyClassCache(branchId, date)); }); });
                await Promise.all(fetchPromises);
                if (!this._refreshInterval) { this._refreshInterval = setInterval(() => { branches.forEach(bid => classService._refreshDailyClassCache(bid)); }, 10 * 60 * 1000); }
                try {
                    const syncRef = tenantDb.doc('system_state', 'kiosk_sync');
                    let unsubSync: Unsubscribe | null = null;
                    const setupSyncListener = (): void => {
                        if (unsubSync) unsubSync();
                        unsubSync = onSnapshot(syncRef, (snapshot) => {
                            if (snapshot.exists()) { const data = snapshot.data() as { lastMemberUpdate?: string }; if (data.lastMemberUpdate && data.lastMemberUpdate > (this._lastKioskSync || '')) this._lastKioskSync = data.lastMemberUpdate; }
                        }, (err) => { console.warn('[Storage] Kiosk sync listener error:', err); });
                    };
                    setupSyncListener();
                    window.addEventListener('online', () => { setupSyncListener(); });
                } catch (syncErr) { console.error('[Storage] Setup kiosk sync failed:', syncErr); }
            } catch (err) { console.warn('[Storage] Kiosk pre-fetch error:', err); }
            console.timeEnd('[Kiosk] Full Cache Load');
            return;
        }

        // FULL MODE
        memberService.setupMemberListener();
        attendanceService.setupAttendanceListener();
        paymentService.setupSalesListener();
        safelySubscribe(query(tenantDb.collection('notices'), orderBy("timestamp", "desc")), (snapshot) => { cachedNotices = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notice)); }, "Notices", "notices");
        safelySubscribe(tenantDb.collection('fcm_tokens') as unknown as ReturnType<typeof query>, (snapshot) => { pushService.setCachedPushTokens(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PushToken))); }, "FCMTokens");
        safelySubscribe(tenantDb.collection('images') as unknown as ReturnType<typeof query>, (snapshot) => { const imgs: Record<string, string> = {}; snapshot.docs.forEach(d => { const data = d.data() as { url?: string; base64?: string }; imgs[d.id] = data.url || data.base64 || ''; }); configService.setCachedImages(imgs); }, "Images", "images");
    },

    // ═══ MEMBER ═══
    getMembers(): Member[] { return localizeMembers(memberService.getMembers(), useLanguageStore.getState().language); },
    loadAllMembers(force = false) { return memberService.loadAllMembers(force); },
    _buildPhoneLast4Index() { return memberService._buildPhoneLast4Index(); },
    findMembersByPhone(last4Digits: string) { 
        const members = memberService.findMembersByPhone(last4Digits);
        const { localizeMembers } = require('../utils/demoLocalization');
        return localizeMembers(members, useLanguageStore.getState().language);
    },
    _updateLocalMemberCache(memberId: string, updates: Partial<Member>) { return memberService._updateLocalMemberCache(memberId, updates); },
    updateMember(memberId: string, data: Partial<Member>) { return memberService.updateMember(memberId, data); },
    addMember(data: Partial<Member> & { phone: string }) { return memberService.addMember(data); },
    getMemberById(id: string) { 
        const member = memberService.getMemberById(id);
        const { localizeMember } = require('../utils/demoLocalization');
        return localizeMember(member, useLanguageStore.getState().language);
    },
    fetchMemberById(id: string) { 
        return memberService.fetchMemberById(id).then(member => {
            const { localizeMember } = require('../utils/demoLocalization');
            return localizeMember(member, useLanguageStore.getState().language);
        }); 
    },
    getMemberStreak(memberId: string, attendance: Array<{ date?: string }>) { return memberService.getMemberStreak(memberId, attendance); },
    getMemberDiligence(memberId: string) { return memberService.getMemberDiligence(memberId); },
    getGreetingCache(memberId: string) { return memberService.getGreetingCache(memberId); },
    setGreetingCache(memberId: string, data: Record<string, unknown>) { return memberService.setGreetingCache(memberId, data); },
    softDeleteMember(memberId: string) { return memberService.softDeleteMember(memberId); },
    restoreMember(memberId: string) { return memberService.restoreMember(memberId); },
    getDeletedMembers() { return memberService.getDeletedMembers(); },
    permanentDeleteMember(memberId: string) { return memberService.permanentDeleteMember(memberId); },
    updateFaceDescriptor(memberId: string, descriptor: Float32Array | null) { return memberService.updateFaceDescriptor(memberId, descriptor); },
    deleteFaceDescriptor(memberId: string) { return memberService.deleteFaceDescriptor(memberId); },

    // ═══ ATTENDANCE ═══
    getAttendance(): AttendanceLog[] { return attendanceService.getAttendance(); },
    getAttendanceByMemberId(memberId: string) { return attendanceService.getAttendanceByMemberId(memberId); },
    getAttendanceByDate(dateStr: string, branchId: string | null = null) { return attendanceService.getAttendanceByDate(dateStr, branchId); },
    subscribeAttendance(dateStr: string, branchId: string | null = null, callback: (records: AttendanceLog[]) => void) { return attendanceService.subscribeAttendance(dateStr, branchId, callback); },
    checkInById(memberId: string, branchId: string, force = false, eventId?: string, facialMatched?: boolean, source: string = 'pin') { return attendanceService.checkInById(memberId, branchId, force, eventId, facialMatched, source); },
    deleteAttendance(logId: string, restoreCredit?: boolean) { return attendanceService.deleteAttendance(logId, restoreCredit); },
    restoreAttendance(logId: string) { return attendanceService.restoreAttendance(logId); },
    clearAllAttendance() { return attendanceService.clearAllAttendance(); },
    addManualAttendance(memberId: string, date: string, branchId: string, className = "수동 확인", instructor = "관리자", options: { skipCreditDeduction?: boolean } = {}) { return attendanceService.addManualAttendance(memberId, date, branchId, className, instructor, options); },
    updatePastAttendanceRecords(branchId: string, dateStr: string, oldClasses: DailyClass[] | null, newClasses: DailyClass[] | null) { return attendanceService.updatePastAttendanceRecords(branchId, dateStr, oldClasses, newClasses); },
    getDeletedAttendance() { return attendanceService.getDeletedAttendance(); },
    permanentDeleteAttendance(logId: string) { return attendanceService.permanentDeleteAttendance(logId); },

    // ═══ PAYMENT ═══
    getSales() { return paymentService.getSales(); },
    getRevenueStats() { return paymentService.getRevenueStats(); },
    getAllSales() { return paymentService.getAllSales(); },
    getSalesHistory(memberId: string) { return paymentService.getSalesHistory(memberId); },
    addSalesRecord(data: Partial<SalesRecord>) { return paymentService.addSalesRecord(data); },
    updateSalesRecord(salesId: string, updates: Partial<SalesRecord>) { return paymentService.updateSalesRecord(salesId, updates); },
    deleteSalesRecord(salesId: string) { return paymentService.deleteSalesRecord(salesId); },
    restoreSalesRecord(salesId: string) { return paymentService.restoreSalesRecord(salesId); },
    getDeletedSales() { return paymentService.getDeletedSales(); },
    permanentDeleteSalesRecord(salesId: string) { return paymentService.permanentDeleteSalesRecord(salesId); },

    // ═══ MESSAGE ═══
    getMessagesByMemberId(memberId: string) { return messageService.getMessagesByMemberId(memberId); },
    getPendingApprovals(callback: (items: ApprovalItem[]) => void) { return messageService.getPendingApprovals(callback); },
    approvePush(id: string) { return messageService.approvePush(id); },
    rejectPush(id: string) { return messageService.rejectPush(id); },
    addMessage(memberId: string, content: string, scheduledAt: string | null = null, sendMode: string = 'push_first') { return messageService.addMessage(memberId, content, scheduledAt, sendMode); },
    sendBulkMessages(memberIds: string[], content: string, scheduledAt: string | null = null, sendMode: string = 'push_first') { return messageService.sendBulkMessages(memberIds, content, scheduledAt, sendMode); },
    getMessages(memberId: string) { return messageService.getMessages(memberId); },
    sendBulkPushCampaign(targetMemberIds: string[], title: string, body: string) { return messageService.sendBulkPushCampaign(targetMemberIds, title, body); },

    // ═══ SCHEDULE ═══
    getMonthlyClasses(branchId: string, year: number, month: number) { 
        return localizeSchedules(scheduleService.getMonthlyClasses(branchId, year, month), useLanguageStore.getState().language); 
    },
    getMonthlyScheduleStatus(branchId: string, year: number, month: number) { return scheduleService.getMonthlyScheduleStatus(branchId, year, month); },
    updateDailyClasses(branchId: string, date: string, classes: DailyClass[]) { return scheduleService.updateDailyClasses(branchId, date, classes); },
    batchUpdateDailyClasses(branchId: string, updates: DailyUpdate[]) { return scheduleService.batchUpdateDailyClasses(branchId, updates); },
    createMonthlySchedule(branchId: string, year: number, month: number) { return scheduleService.createMonthlySchedule(branchId, year, month); },
    copyMonthlySchedule(branchId: string, fromYear: number, fromMonth: number, toYear: number, toMonth: number) { return scheduleService.copyMonthlySchedule(branchId, fromYear, fromMonth, toYear, toMonth); },
    deleteMonthlySchedule(branchId: string, year: number, month: number) { return scheduleService.deleteMonthlySchedule(branchId, year, month); },
    getInstructors() { 
        return localizeInstructors(scheduleService.getInstructors(), useLanguageStore.getState().language); 
    },
    updateInstructors(list: (string | Record<string, unknown>)[]) { return scheduleService.updateInstructors(list); },
    getClassTypes() { return scheduleService.getClassTypes(); },
    updateClassTypes(list: string[]) { return scheduleService.updateClassTypes(list); },
    getClassLevels() { return scheduleService.getClassLevels(); },
    updateClassLevels(list: string[]) { return scheduleService.updateClassLevels(list); },
    getMonthlyBackups(branchId: string, year: number, month: number) { return scheduleService.getMonthlyBackups(branchId, year, month); },
    restoreMonthlyBackup(branchId: string, year: number, month: number, backupId: string) { return scheduleService.restoreMonthlyBackup(branchId, year, month, backupId); },

    // ═══ NOTICE ═══
    addNotice(title: string, content: string, images: string[] = [], sendPush = true) { return noticeService.addNotice(title, content, images, sendPush); },
    deleteNotice(noticeId: string) { return noticeService.deleteNotice(noticeId); },
    translateNotices(notices: Notice[], targetLang: string) { return noticeService.translateNotices(notices, targetLang); },
    getNotices(): Notice[] { 
        let notices = [...cachedNotices].sort((a, b) => new Date(b.timestamp || '0').getTime() - new Date(a.timestamp || '0').getTime());
        return localizeNotices(notices, useLanguageStore.getState().language);
    },
    async loadNotices() { if (cachedNotices.length > 0) return cachedNotices; return noticeService.loadNotices(); },

    // ═══ AI ═══
    getAIExperience(memberName: string, attendanceCount: number, day: string, hour: number, upcomingClass: string | null, weather: string | null, credits: number, remainingDays: number, language = 'ko', diligence: unknown = null, context = 'profile', mbti: string | null = null) { return aiService.getAIExperience(memberName, attendanceCount, day, hour, upcomingClass, weather, credits, remainingDays, language, diligence, context, mbti); },
    getAIAnalysis(memberName: string, attendanceCount: number, logs: unknown[], timeOfDay: string, language = 'ko', requestRole = 'member', statsData: unknown = null, context = 'profile') { return aiService.getAIAnalysis(memberName, attendanceCount, logs, timeOfDay, language, requestRole, statsData, context); },
    getDailyYoga(language = 'ko', mbti: string | null = null, context: { weather?: string | null; temperature?: number | null; primaryClass?: string | null } = {}) { return aiService.getDailyYoga(language, mbti, context); },
    getAiUsage() { return aiService.getAiUsage(); },

    // ═══ AUTH ═══
    loginMember(name: string, last4Digits: string) { return authService.loginMember(name, last4Digits); },
    loginInstructor(name: string, last4Digits: string) { return authService.loginInstructor(name, last4Digits); },
    loginAdmin(email: string, password: string) { return authService.loginAdmin(email, password); },
    logoutAdmin() { return authService.logoutAdmin(); },
    onAuthStateChanged(callback: (user: User | null) => void) { return authService.onAuthStateChanged(callback); },
    logLoginFailure(type: string, name: string, phoneLast4: string, errorMessage: string) { return authService.logLoginFailure(type, name, phoneLast4, errorMessage); },

    // ═══ PUSH ═══
    saveToken(token: string, role = 'member', language = 'ko') { return pushService.saveToken(token, role, language); },
    saveInstructorToken(token: string, instructorName: string, language = 'ko') { return pushService.saveInstructorToken(token, instructorName, language); },
    deletePushToken(role?: string) { return pushService.deletePushToken(role); },
    requestPushPermission(memberId?: string, role = 'member') { return pushService.requestPushPermission(memberId, role); },
    requestInstructorPushPermission(instructorName: string) { return pushService.requestInstructorPushPermission(instructorName); },
    verifyServiceWorkerRegistration() { return pushService.verifyServiceWorkerRegistration(); },
    checkPushNotificationStatus() { return pushService.checkPushNotificationStatus(); },
    reregisterPushToken(memberId: string) { return pushService.reregisterPushToken(memberId); },
    requestAndSaveToken() { return pushService.requestAndSaveToken(); },
    getAllPushTokens() { return pushService.getAllPushTokens(); },
    diagnosePushData() { return pushService.diagnosePushData(); },
    getPushHistory(limitCount = 50) { return pushService.getPushHistory(limitCount); },
    subscribeToPushHistory(callback: (items: PushHistoryItem[]) => void, limitCount = 50) { return pushService.subscribeToPushHistory(callback, limitCount); },

    // ═══ CLASS ═══
    getCurrentClass(branchId: string, instructorName: string | null = null, membershipTypeHint: string | null = null) { return classService.getCurrentClass(branchId, instructorName, membershipTypeHint); },
    getDailyClasses(branchId: string, instructorName: string | null = null, date: string | null = null) { 
        return localizeSchedules(classService.getDailyClasses(branchId, instructorName, date), useLanguageStore.getState().language); 
    },

    // ═══ CONFIG ═══
    getImages() { 
        const imgs = { ...configService.getImages() };
        if (typeof window !== 'undefined' && getCurrentStudioId() === 'demo-yoga') {
            const lang = useLanguageStore.getState().language;
            if (lang && lang !== 'ko') {
                ['timeTable1', 'timeTable2', 'priceTable1', 'priceTable2', 'memberBg'].forEach(key => {
                    if (imgs[`${key}_${lang}`]) imgs[key] = imgs[`${key}_${lang}`];
                });
            }
        }
        return imgs;
    },
    updateImage(id: string, base64: string) { return configService.updateImage(id, base64, notifyListeners); },
    getPricing() { 
        const pricing = configService.getPricing();
        if (!pricing) return pricing;
        const lang = useLanguageStore.getState().language;
        // Check if pricing is { passes: [], regular: [] } which is common structure
        const localized = { ...pricing };
        if (Array.isArray(localized.passes)) localized.passes = localizePricings(localized.passes, lang);
        if (Array.isArray(localized.regular)) localized.regular = localizePricings(localized.regular, lang);
        return localized;
    },
    savePricing(pricingData: Record<string, unknown>) { return configService.savePricing(pricingData, notifyListeners); },
    getKioskSettings(branchId = 'all') { return configService.getKioskSettings(branchId); },
    updateKioskSettings(branchId: string, data: Record<string, unknown>) { return configService.updateKioskSettings(branchId, data); },
    subscribeToKioskSettings(branchId = 'all', callback: (data: any) => void) { return configService.subscribeToKioskSettings(branchId, callback); },
    getKioskBranch() { return configService.getKioskBranch(); },
    setKioskBranch(branchId: string) { return configService.setKioskBranch(branchId); },
    getCurrentBranch() { return configService.getCurrentBranch(); },
    setBranch(branchId: string) { return configService.setBranch(branchId); },

    // ═══ MIGRATION ═══
    migratePhoneLast4() { return migrationService.migratePhoneLast4(); },
    migrateMembersFromCSV(csvData: Array<Record<string, string>>, dryRun = false, onProgress: ((current: number, total: number, label: string) => void) | null = null) {
        return migrationService.migrateMembersFromCSV(csvData, dryRun, onProgress, this.cleanupAllData.bind(this) as unknown as ((onProgress: ((current: number, total: number, label: string) => void) | null) => Promise<void>) | null, this.loadAllMembers.bind(this) as unknown as (() => Promise<void>) | null, notifyListeners as unknown as (() => void) | null);
    },
    cleanupAllData(onProgress: ((current: number, total: number, label: string) => void) | null = null) {
        return migrationService.cleanupAllData(onProgress, notifyListeners as unknown as (() => void) | null, this.loadAllMembers.bind(this) as unknown as (() => Promise<void>) | null);
    },

    // ═══ ERROR LOGGING ═══
    async logError(error: unknown, context: Record<string, unknown> = {}): Promise<void> {
        try {
            await addDoc(tenantDb.collection('error_logs'), { message: (error as Error)?.message || String(error), context, url: window.location.href, timestamp: new Date().toISOString(), userId: auth.currentUser ? auth.currentUser.uid : 'anonymous' });
        } catch (e) { console.warn("Failed to log error:", e); }
    },

    async getErrorLogs(limitCount = 50): Promise<ErrorLogEntry[]> {
        const { getDocs: gd, query: q, orderBy: ob, limit: lim } = await import('firebase/firestore');
        try { const snapshot = await gd(q(tenantDb.collection('error_logs'), ob('timestamp', 'desc'), lim(limitCount))); return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ErrorLogEntry)); }
        catch { return []; }
    },

    async deleteErrorLog(logId: string): Promise<{ success: boolean; message?: string }> {
        const { deleteDoc: dd } = await import('firebase/firestore');
        try { await dd(tenantDb.doc('error_logs', logId)); return { success: true }; }
        catch (e) { return { success: false, message: (e as Error).message }; }
    },

    async clearErrorLogs(): Promise<{ success: boolean; count?: number; message?: string }> {
        const { getDocs: gd, deleteDoc: dd } = await import('firebase/firestore');
        try { const snapshot = await gd(tenantDb.collection('error_logs')); await Promise.all(snapshot.docs.map(d => dd(d.ref))); return { success: true, count: snapshot.docs.length }; }
        catch (e) { return { success: false, message: (e as Error).message }; }
    },

    _safeGetItem(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } },
    _safeSetItem(key: string, value: string): void { try { localStorage.setItem(key, value); } catch { /* ignore */ } },
};
