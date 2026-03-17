/**
 * Storage Service — Facade & Initialization Hub
 * 
 * All domain logic has been extracted to dedicated services:
 * - memberService    — Member CRUD, cache, phone lookup
 * - attendanceService — Check-in, attendance logs
 * - paymentService   — Sales records, revenue stats
 * - messageService   — Individual & bulk messages, push campaigns
 * - scheduleService  — Monthly schedules, timetable management
 * - noticeService    — Studio notices
 * - aiService        — AI experiences, analysis, daily yoga
 * - authService      — Login/logout for members, instructors, admins
 * - pushService      — FCM tokens, push permissions, push history
 * - classService     — Smart class matching, daily class cache
 * - configService    — Images, pricing, kiosk settings, branches
 * - migrationService — CSV import, data cleanup
 *
 * This file remains as a single entry point (facade) so that
 * all existing `storageService.xxx()` calls continue to work
 * without any component-level changes.
 */
import { auth } from "../firebase";
import { signInAnonymously } from "firebase/auth";
import { onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';
import { tenantDb } from '../utils/tenantDb';

// Domain Services
import * as scheduleService from './scheduleService';
import * as noticeService from './noticeService';
import * as aiService from './aiService';
import { memberService } from './memberService';
import { attendanceService } from './attendanceService';
import { paymentService } from './paymentService';
import { messageService } from './messageService';
import { authService } from './authService';
import { pushService } from './pushService';
import { classService } from './classService';
import { configService } from './configService';
import { migrationService } from './migrationService';

// ─── Local State ────────────────────────────────────────
let cachedNotices = [];

let listeners = {
  members: [], logs: [], sales: [], images: [], notices: [], general: []
};

// ─── Pub/Sub ────────────────────────────────────────────
const notifyListeners = (eventType = 'general') => {
  if (listeners[eventType]) {
    listeners[eventType].forEach(callback => callback(eventType));
  }
  if (eventType !== 'general' && listeners['general']) {
    listeners['general'].forEach(callback => callback(eventType));
  }
};

// ─── Facade ─────────────────────────────────────────────
export const storageService = {
  notifyListeners,

  subscribe(callback, eventTypes = ['general']) {
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    types.forEach(type => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(callback);
    });
    return () => {
      types.forEach(type => {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter(cb => cb !== callback);
        }
      });
    };
  },

  // ═══════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════
  async initialize({ mode = 'full' } = {}) {
    if (this._initialized && this._initializedMode === mode) return;
    this._initialized = true;
    this._initializedMode = mode;

    // Wire up notifyListeners for internal services
    memberService.setNotifyCallback(() => notifyListeners('members'));
    attendanceService.setNotifyCallback(() => notifyListeners('logs'));
    paymentService.setNotifyCallback(() => notifyListeners('sales'));
    messageService.setNotifyCallback(() => notifyListeners('general'));
    attendanceService.setDependencies({
      getCurrentClass: this.getCurrentClass.bind(this),
      logError: this.logError.bind(this)
    });

    // Auth
    try {
      await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => { unsubscribe(); resolve(user); });
      });
      if (!auth.currentUser) await signInAnonymously(auth);
    } catch (authError) {
      console.error("Auth initialization failed:", authError);
    }

    const safelySubscribe = (queryOrRef, cacheUpdater, name, eventType = 'general') => {
      try {
        return onSnapshot(queryOrRef, (snapshot) => {
          cacheUpdater(snapshot);
          notifyListeners(eventType);
        }, (error) => {
          console.warn(`[Storage] Listener error for ${name}:`, error);
        });
      } catch (e) {
        console.error(`[Storage] Failed to subscribe to ${name}:`, e);
      }
    };

    // ── KIOSK MODE ──
    if (mode === 'kiosk') {
      console.log("KIOSK MODE: Initializing cache for maximum speed & reliability...");
      console.time('[Kiosk] Full Cache Load');
      
      const members = await memberService.loadAllMembers();
      console.log(`[Storage] Kiosk member cache ready: ${members.length} members`);
      memberService.setupMemberListener();
      
      try {
        const today = new Date();
        const dates = [];
        for (let i = -1; i <= 1; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() + i);
          dates.push(d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }));
        }

        const branches = ['gwangheungchang', 'mapo'];
        const fetchPromises = [];
        dates.forEach(date => {
          branches.forEach(branchId => {
            fetchPromises.push(classService._refreshDailyClassCache(branchId, date));
          });
        });
        await Promise.all(fetchPromises);

        if (!this._refreshInterval) {
          this._refreshInterval = setInterval(() => {
            branches.forEach(bid => classService._refreshDailyClassCache(bid));
          }, 10 * 60 * 1000);
        }

        // Real-time Kiosk Trigger
        try {
          const syncRef = tenantDb.doc('system_state', 'kiosk_sync');
          let unsubSync = null;

          const setupSyncListener = () => {
            if (unsubSync) unsubSync();
            unsubSync = onSnapshot(syncRef, (snapshot) => {
              if (snapshot.exists()) {
                const data = snapshot.data();
                if (data.lastMemberUpdate && data.lastMemberUpdate > (this._lastKioskSync || '')) {
                  this._lastKioskSync = data.lastMemberUpdate;
                }
              }
            }, (err) => {
              console.warn('[Storage] Kiosk sync listener error:', err);
            });
          };

          setupSyncListener();
          window.addEventListener('online', () => {
            console.log('[Storage] Network reconnected. Restoring Kiosk sync listener...');
            setupSyncListener();
          });
        } catch (syncErr) {
          console.error('[Storage] Setup kiosk sync failed:', syncErr);
        }
      } catch (err) {
        console.warn('[Storage] Kiosk pre-fetch error:', err);
      }
      
      console.timeEnd('[Kiosk] Full Cache Load');
      return;
    }

    // ── FULL MODE ──
    memberService.setupMemberListener();
    attendanceService.setupAttendanceListener();

    safelySubscribe(
      query(tenantDb.collection('notices'), orderBy("timestamp", "desc")),
      (snapshot) => cachedNotices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      "Notices", "notices"
    );

    safelySubscribe(
      tenantDb.collection('fcm_tokens'),
      (snapshot) => {
        const tokens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        pushService.setCachedPushTokens(tokens);
      },
      "FCMTokens"
    );

    safelySubscribe(
      tenantDb.collection('images'),
      (snapshot) => {
        const imgs = {};
        snapshot.docs.forEach(d => { imgs[d.id] = d.data().url || d.data().base64; });
        configService.setCachedImages(imgs);
      },
      "Images", "images"
    );
  },

  // ═══════════════════════════════════════════════════════
  // MEMBER FACADE
  // ═══════════════════════════════════════════════════════
  getMembers() { return memberService.getMembers(); },
  loadAllMembers(force = false) { return memberService.loadAllMembers(force); },
  _buildPhoneLast4Index() { return memberService._buildPhoneLast4Index(); },
  findMembersByPhone(last4Digits) { return memberService.findMembersByPhone(last4Digits); },
  _updateLocalMemberCache(memberId, updates) { return memberService._updateLocalMemberCache(memberId, updates); },
  updateMember(memberId, data) { return memberService.updateMember(memberId, data); },
  addMember(data) { return memberService.addMember(data); },
  getMemberById(id) { return memberService.getMemberById(id); },
  async fetchMemberById(id) { return memberService.fetchMemberById(id); },
  getMemberStreak(memberId, attendance) { return memberService.getMemberStreak(memberId, attendance); },
  getMemberDiligence(memberId) { return memberService.getMemberDiligence(memberId); },
  getGreetingCache(memberId) { return memberService.getGreetingCache(memberId); },
  setGreetingCache(memberId, data) { return memberService.setGreetingCache(memberId, data); },

  // ═══════════════════════════════════════════════════════
  // ATTENDANCE FACADE
  // ═══════════════════════════════════════════════════════
  getAttendance() { return attendanceService.getAttendance(); },
  getAttendanceByMemberId(memberId) { return attendanceService.getAttendanceByMemberId(memberId); },
  getAttendanceByDate(dateStr, branchId = null) { return attendanceService.getAttendanceByDate(dateStr, branchId); },
  subscribeAttendance(dateStr, branchId = null, callback) { return attendanceService.subscribeAttendance(dateStr, branchId, callback); },
  checkInById(memberId, branchId, force = false) { return attendanceService.checkInById(memberId, branchId, force); },
  deleteAttendance(logId, restoreCredit) { return attendanceService.deleteAttendance(logId, restoreCredit); },
  clearAllAttendance() { return attendanceService.clearAllAttendance(); },
  addManualAttendance(memberId, date, branchId, className = "수동 확인", instructor = "관리자", options = {}) {
    return attendanceService.addManualAttendance(memberId, date, branchId, className, instructor, options);
  },
  async updatePastAttendanceRecords(branchId, dateStr, oldClasses, newClasses) {
    return attendanceService.updatePastAttendanceRecords(branchId, dateStr, oldClasses, newClasses);
  },

  // ═══════════════════════════════════════════════════════
  // PAYMENT FACADE
  // ═══════════════════════════════════════════════════════
  getSales() { return paymentService.getSales(); },
  getRevenueStats() { return paymentService.getRevenueStats(); },
  getAllSales() { return paymentService.getAllSales(); },
  getSalesHistory(memberId) { return paymentService.getSalesHistory(memberId); },
  addSalesRecord(data) { return paymentService.addSalesRecord(data); },
  updateSalesRecord(salesId, updates) { return paymentService.updateSalesRecord(salesId, updates); },
  deleteSalesRecord(salesId) { return paymentService.deleteSalesRecord(salesId); },

  // ═══════════════════════════════════════════════════════
  // MESSAGE FACADE
  // ═══════════════════════════════════════════════════════
  getMessagesByMemberId(memberId) { return messageService.getMessagesByMemberId(memberId); },
  getPendingApprovals(callback) { return messageService.getPendingApprovals(callback); },
  approvePush(id) { return messageService.approvePush(id); },
  rejectPush(id) { return messageService.rejectPush(id); },
  addMessage(memberId, content, scheduledAt = null, templateId = null) { return messageService.addMessage(memberId, content, scheduledAt, templateId); },
  sendBulkMessages(memberIds, content, scheduledAt = null, templateId = null) { return messageService.sendBulkMessages(memberIds, content, scheduledAt, templateId); },
  getMessages(memberId) { return messageService.getMessages(memberId); },
  sendBulkPushCampaign(targetMemberIds, title, body) { return messageService.sendBulkPushCampaign(targetMemberIds, title, body); },

  // ═══════════════════════════════════════════════════════
  // SCHEDULE FACADE
  // ═══════════════════════════════════════════════════════
  async getMonthlyClasses(branchId, year, month) { return scheduleService.getMonthlyClasses(branchId, year, month); },
  async getMonthlyScheduleStatus(branchId, year, month) { return scheduleService.getMonthlyScheduleStatus(branchId, year, month); },
  async updateDailyClasses(branchId, date, classes) { return scheduleService.updateDailyClasses(branchId, date, classes); },
  async batchUpdateDailyClasses(branchId, updates) { return scheduleService.batchUpdateDailyClasses(branchId, updates); },
  async createMonthlySchedule(branchId, year, month) { return scheduleService.createMonthlySchedule(branchId, year, month); },
  async copyMonthlySchedule(branchId, fromYear, fromMonth, toYear, toMonth) { return scheduleService.copyMonthlySchedule(branchId, fromYear, fromMonth, toYear, toMonth); },
  async deleteMonthlySchedule(branchId, year, month) { return scheduleService.deleteMonthlySchedule(branchId, year, month); },
  async getInstructors() { return scheduleService.getInstructors(); },
  async updateInstructors(list) { return scheduleService.updateInstructors(list); },
  async getClassTypes() { return scheduleService.getClassTypes(); },
  async updateClassTypes(list) { return scheduleService.updateClassTypes(list); },
  async getClassLevels() { return scheduleService.getClassLevels(); },
  async updateClassLevels(list) { return scheduleService.updateClassLevels(list); },
  async getMonthlyBackups(branchId, year, month) { return scheduleService.getMonthlyBackups(branchId, year, month); },
  async restoreMonthlyBackup(branchId, year, month, backupId) { return scheduleService.restoreMonthlyBackup(branchId, year, month, backupId); },

  // ═══════════════════════════════════════════════════════
  // NOTICE FACADE
  // ═══════════════════════════════════════════════════════
  async addNotice(title, content, images = [], sendPush = true) { return noticeService.addNotice(title, content, images, sendPush); },
  async deleteNotice(noticeId) { return noticeService.deleteNotice(noticeId); },
  async translateNotices(notices, targetLang) { return noticeService.translateNotices(notices, targetLang); },
  getNotices() { return [...cachedNotices].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)); },
  async loadNotices() {
    if (cachedNotices.length > 0) return cachedNotices;
    return noticeService.loadNotices();
  },

  // ═══════════════════════════════════════════════════════
  // AI FACADE
  // ═══════════════════════════════════════════════════════
  async getAIExperience(memberName, attendanceCount, day, hour, upcomingClass, weather, credits, remainingDays, language = 'ko', diligence = null, context = 'profile') {
    return aiService.getAIExperience(memberName, attendanceCount, day, hour, upcomingClass, weather, credits, remainingDays, language, diligence, context);
  },
  async getAIAnalysis(memberName, attendanceCount, logs, timeOfDay, language = 'ko', requestRole = 'member', statsData = null, context = 'profile') {
    return aiService.getAIAnalysis(memberName, attendanceCount, logs, timeOfDay, language, requestRole, statsData, context);
  },
  async getDailyYoga(language = 'ko') { return aiService.getDailyYoga(language); },
  async getAiUsage() { return aiService.getAiUsage(); },

  // ═══════════════════════════════════════════════════════
  // AUTH FACADE
  // ═══════════════════════════════════════════════════════
  async loginMember(name, last4Digits) { return authService.loginMember(name, last4Digits); },
  async loginInstructor(name, last4Digits) { return authService.loginInstructor(name, last4Digits); },
  async loginAdmin(email, password) { return authService.loginAdmin(email, password); },
  async logoutAdmin() { return authService.logoutAdmin(); },
  onAuthStateChanged(callback) { return authService.onAuthStateChanged(callback); },
  async logLoginFailure(type, name, phoneLast4, errorMessage) { return authService.logLoginFailure(type, name, phoneLast4, errorMessage); },

  // ═══════════════════════════════════════════════════════
  // PUSH FACADE
  // ═══════════════════════════════════════════════════════
  async saveToken(token, role = 'member', language = 'ko') { return pushService.saveToken(token, role, language); },
  async saveInstructorToken(token, instructorName, language = 'ko') { return pushService.saveInstructorToken(token, instructorName, language); },
  async deletePushToken() { return pushService.deletePushToken(); },
  async requestPushPermission(memberId) { return pushService.requestPushPermission(memberId); },
  async requestInstructorPushPermission(instructorName) { return pushService.requestInstructorPushPermission(instructorName); },
  async verifyServiceWorkerRegistration() { return pushService.verifyServiceWorkerRegistration(); },
  async checkPushNotificationStatus() { return pushService.checkPushNotificationStatus(); },
  async reregisterPushToken(memberId) { return pushService.reregisterPushToken(memberId); },
  async requestAndSaveToken() { return pushService.requestAndSaveToken(); },
  async getAllPushTokens() { return pushService.getAllPushTokens(); },
  async diagnosePushData() { return pushService.diagnosePushData(); },
  async getPushHistory(limitCount = 50) { return pushService.getPushHistory(limitCount); },
  subscribeToPushHistory(callback, limitCount = 50) { return pushService.subscribeToPushHistory(callback, limitCount); },

  // ═══════════════════════════════════════════════════════
  // CLASS FACADE
  // ═══════════════════════════════════════════════════════
  async getCurrentClass(branchId, instructorName = null, membershipTypeHint = null) {
    return classService.getCurrentClass(branchId, instructorName, membershipTypeHint);
  },
  async getDailyClasses(branchId, instructorName = null, date = null) {
    return classService.getDailyClasses(branchId, instructorName, date);
  },

  // ═══════════════════════════════════════════════════════
  // CONFIG FACADE
  // ═══════════════════════════════════════════════════════
  getImages() { return configService.getImages(); },
  async updateImage(id, base64) { return configService.updateImage(id, base64, notifyListeners); },
  async getPricing() { return configService.getPricing(); },
  async savePricing(pricingData) { return configService.savePricing(pricingData, notifyListeners); },
  async getKioskSettings(branchId = 'all') { return configService.getKioskSettings(branchId); },
  async updateKioskSettings(branchId = 'all', data) { return configService.updateKioskSettings(branchId, data); },
  subscribeToKioskSettings(branchId = 'all', callback) { return configService.subscribeToKioskSettings(branchId, callback); },
  getKioskBranch() { return configService.getKioskBranch(); },
  setKioskBranch(branchId) { return configService.setKioskBranch(branchId); },
  getCurrentBranch() { return configService.getCurrentBranch(); },
  setBranch(branchId) { return configService.setBranch(branchId); },

  // ═══════════════════════════════════════════════════════
  // MIGRATION FACADE
  // ═══════════════════════════════════════════════════════
  async migratePhoneLast4() { return migrationService.migratePhoneLast4(); },
  async migrateMembersFromCSV(csvData, dryRun = false, onProgress = null) {
    return migrationService.migrateMembersFromCSV(
      csvData, dryRun, onProgress,
      this.cleanupAllData.bind(this),
      this.loadAllMembers.bind(this),
      notifyListeners
    );
  },
  async cleanupAllData(onProgress = null) {
    return migrationService.cleanupAllData(onProgress, notifyListeners, this.loadAllMembers.bind(this));
  },

  // ═══════════════════════════════════════════════════════
  // ERROR LOGGING & MONITORING
  // ═══════════════════════════════════════════════════════
  async logError(error, context = {}) {
    try {
      await addDoc(tenantDb.collection('error_logs'), {
        message: error?.message || String(error),
        context,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: auth.currentUser ? auth.currentUser.uid : 'anonymous'
      });
    } catch (e) { console.warn("Failed to log error:", e); }
  },

  async getErrorLogs(limitCount = 50) {
    const { getDocs, query: q, orderBy: ob, limit: lim } = await import('firebase/firestore');
    try {
      const snapshot = await getDocs(q(tenantDb.collection('error_logs'), ob('timestamp', 'desc'), lim(limitCount)));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) { return []; }
  },

  async deleteErrorLog(logId) {
    const { deleteDoc } = await import('firebase/firestore');
    try {
      await deleteDoc(tenantDb.doc('error_logs', logId));
      return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
  },

  async clearErrorLogs() {
    const { getDocs, deleteDoc } = await import('firebase/firestore');
    try {
      const snapshot = await getDocs(tenantDb.collection('error_logs'));
      await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
      return { success: true, count: snapshot.docs.length };
    } catch (e) { return { success: false, message: e.message }; }
  },

  // Helpers
  _safeGetItem(key) { try { return localStorage.getItem(key); } catch { return null; } },
  _safeSetItem(key, value) { try { localStorage.setItem(key, value); } catch { /* ignore */ } },
};
