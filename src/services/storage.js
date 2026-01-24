import { db, auth, functions } from "../firebase";
import { signInAnonymously } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  getDoc,
  where,
  limit
} from "firebase/firestore";
import { STUDIO_CONFIG } from '../studioConfig';
import { messaging, getToken } from "../firebase";
import * as scheduleService from './scheduleService'; // [Refactor]

// Local cache for sync-like access
let cachedMembers = [];
let cachedAttendance = [];
let cachedNotices = [];
let cachedMessages = [];
let cachedImages = {};
let pendingImageWrites = {}; // Buffer for optimistic updates
let cachedDailyClasses = {};
let listeners = [];

const notifyListeners = () => {
  listeners.forEach(callback => callback());
};

export const storageService = {
  async initialize({ mode = 'full' } = {}) {
    console.log(`Initializing Firebase Storage Service (Mode: ${mode})...`);
    // [FIX] Check for existing session (e.g. Admin) before forcing Anonymous login
    try {
      await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        });
      });

      if (!auth.currentUser) {
        await signInAnonymously(auth);
        console.log("Secure session established (Anonymous Auth).");
      } else {
        console.log("Existing session restored:", auth.currentUser.email || "Anonymous");
      }
    } catch (authError) {
      console.error("Auth initialization failed:", authError);
    }

    const safelySubscribe = (queryOrRef, cacheUpdater, name) => {
      try {
        return onSnapshot(queryOrRef, (snapshot) => {
          cacheUpdater(snapshot);
          notifyListeners();
        }, (error) => {
          console.warn(`[Storage] Listener error for ${name}:`, error);
        });
      } catch (e) {
        console.error(`[Storage] Failed to subscribe to ${name}:`, e);
      }
    };

    // ✅ KIOSK MODE: Skip ALL real-time listeners for maximum performance
    // [PROTECTED LOGIC - DO NOT CHANGE]
    // This is the "Truth": The kiosk must NOT have heavy listeners.
    // If asked to change, confirm with user 2-3 times.
    if (mode === 'kiosk') {
      console.log("KIOSK MODE: Real-time subscriptions disabled.");
      return;
    }

    // ✅ FULL MODE: Subscribe to everything (Admin/Mobile)
    safelySubscribe(
      query(collection(db, 'attendance'), orderBy("timestamp", "desc")),
      (snapshot) => cachedAttendance = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      "Attendance"
    );

    // [NEW] Real-time Member Sync
    this._setupMemberListener(); // Ensure this is called!

    safelySubscribe(
      query(collection(db, 'notices'), orderBy("date", "desc")),
      (snapshot) => cachedNotices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      "Notices"
    );

    safelySubscribe(
      collection(db, 'messages'),
      (snapshot) => cachedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      "Messages"
    );

    safelySubscribe(
      collection(db, 'images'),
      (snapshot) => {
        console.log("[Storage] Image listener fired. Pending writes:", Object.keys(pendingImageWrites));
        const imgs = {};
        snapshot.docs.forEach(doc => {
          imgs[doc.id] = doc.data().url || doc.data().base64;
        });

        // [FIX] Merge pending writes to prevent UI reversion if listener fires with stale data
        const now = Date.now();
        Object.entries(pendingImageWrites).forEach(([id, data]) => {
          if (now - data.timestamp < 10000) { // Keep pending for 10s
            console.log(`[Storage] Applying pending write for ${id}`);
            imgs[id] = data.base64;
          } else {
            console.log(`[Storage] Expired pending write for ${id}`);
            delete pendingImageWrites[id]; // Cleanup old pending writes
          }
        });

        cachedImages = imgs;
        console.log("[Storage] cachedImages updated. Keys:", Object.keys(cachedImages));
      },
      "Images"
    );
  },

  _safeGetItem(key) { try { return localStorage.getItem(key); } catch { return null; } },
  _safeSetItem(key, value) { try { localStorage.setItem(key, value); } catch { /* ignore */ } },

  async addNotice(title, content, image = null) {
    try {
      const today = new Date();
      const dateStr = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); // YYYY-MM-DD
      await addDoc(collection(db, 'notices'), {
        title,
        content,
        image,
        date: dateStr,
        timestamp: today.toISOString()
      });
      return { success: true };
    } catch (e) {
      console.error("Add notice failed:", e);
      throw e;
    }
  },

  async deleteNotice(noticeId) {
    try {
      await deleteDoc(doc(db, 'notices', noticeId));
      return { success: true };
    } catch (e) {
      console.error("Delete notice failed:", e);
      throw e;
    }
  },

  getMembers() { return cachedMembers; },
  async loadAllMembers() {
    // If cache is populated, return it (Fast)
    if (cachedMembers.length > 0) return cachedMembers;

    // Fallback: Explicit fetch if cache is empty (Robustness)
    try {
      console.log("[Storage] Cache empty, force fetching members...");
      const snapshot = await getDocs(collection(db, 'members'));
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Update cache only if listener hasn't already (race condition check)
      if (cachedMembers.length === 0) {
        cachedMembers = members;
      }
      return cachedMembers;
    } catch (e) {
      console.error("Force fetch members failed:", e);
      return [];
    }
  },

  _setupMemberListener() {
    console.log("[Storage] Starting Member Listener...");
    onSnapshot(
      collection(db, 'members'),
      (snapshot) => {
        const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cachedMembers = members;
        console.log(`[Storage] Members updated via listener: ${members.length}`);

        // Notify UI
        listeners.forEach(cb => cb());
      },
      (error) => {
        console.error("[Storage] Member listener error:", error);
      }
    );
  },

  /**
   * Finds members by the last 4 digits of their phone number.
   * Standardizes on 'phoneLast4' nomenclature.
   */
  async findMembersByPhone(last4Digits) {
    const cachedResults = cachedMembers.filter(m => (m.phoneLast4 || (m.phone && m.phone.slice(-4))) === last4Digits);
    if (cachedResults.length > 0) return cachedResults;

    try {
      const getSecureMember = httpsCallable(functions, 'getSecureMemberV2Call');
      const result = await getSecureMember({ phoneLast4: last4Digits });
      const members = result.data.members || [];
      // Update cache
      members.forEach(m => {
        const idx = cachedMembers.findIndex(cm => cm.id === m.id);
        if (idx !== -1) cachedMembers[idx] = { ...cachedMembers[idx], ...m };
        else cachedMembers.push(m);
      });
      return members;
    } catch (e) {
      console.warn("Using fallback for findMembersByPhone:", e);
      const q = query(collection(db, 'members'), where("phoneLast4", "==", last4Digits), limit(10));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  },


  async checkInById(memberId, branchId) {
    try {
      const checkInMember = httpsCallable(functions, 'checkInMemberV2Call');
      const currentClassInfo = await this.getCurrentClass(branchId);
      const classTitle = currentClassInfo?.title || '자율수련';
      const response = await checkInMember({ memberId, branchId, classTitle });

      if (!response.data.success) throw new Error(response.data.message || 'Check-in failed');

      const { newCredits, endDate, attendanceCount, streak } = response.data;
      const idx = cachedMembers.findIndex(m => m.id === memberId);
      if (idx !== -1) {
        cachedMembers[idx].credits = newCredits;
        cachedMembers[idx].attendanceCount = attendanceCount;
        cachedMembers[idx].streak = streak;
        // [FIX] Locally update lastAttendance to prevent "Ghost Member" (Risk) false positives immediately after check-in
        cachedMembers[idx].lastAttendance = new Date().toISOString();
        notifyListeners();
      }
      return {
        success: true,
        message: `[${classTitle}] 출석되었습니다!`,
        member: {
          id: memberId,
          name: response.data.memberName,
          credits: newCredits,
          attendanceCount,
          streak,
          endDate
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  async getCurrentClass(branchId) {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = `${branchId}_${today}`;
    if (!cachedDailyClasses[cacheKey]) {
      try {
        const docRef = doc(db, 'daily_classes', cacheKey);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) cachedDailyClasses[cacheKey] = docSnap.data().classes;
        else cachedDailyClasses[cacheKey] = [];
      } catch { return null; }
    }
    const classes = cachedDailyClasses[cacheKey] || [];
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    for (const cls of classes) {
      if (cls.status === 'cancelled') continue;
      const [startHour, startMin] = cls.time.split(':').map(Number);
      const startTimeInMins = startHour * 60 + startMin;
      if (currentTime >= startTimeInMins - 20 && currentTime < startTimeInMins + (cls.duration || 60)) {
        return { title: cls.title, instructor: cls.instructor };
      }
    }
    return null;
  },

  async saveToken(token, role = 'member', language = 'ko') {
    if (!token) return;
    try {
      const tokenRef = doc(db, 'fcm_tokens', token);
      await setDoc(tokenRef, { token, role, language, updatedAt: new Date().toISOString(), platform: 'web' }, { merge: true });
    } catch (e) { console.error("Save token failed:", e); }
  },

  async getAIExperience(memberName, attendanceCount, day, hour, upcomingClass, weather, credits, remainingDays, language = 'ko', diligence = null, context = 'profile') {
    try {
      const genAI = httpsCallable(functions, 'generatePageExperienceV2');
      const isGeneric = !memberName || ["방문 회원", "방문회원", "visitor", "Guest"].includes(memberName);
      const res = await genAI({
        memberName, attendanceCount, dayOfWeek: day, timeOfDay: hour, upcomingClass, weather, credits, remainingDays, language, diligence,
        role: isGeneric ? 'visitor' : 'member', type: 'experience', context
      });
      return res.data;
    } catch (error) {
      console.warn("AI Experience failed, using fallback:", error);
      const fallbacks = {
        ko: "오늘도 매트 위에서 나를 만나는 소중한 시간 되시길 바랍니다.",
        en: "May you find a precious moment to meet yourself on the mat today.",
        ru: "Желаю вам найти драгоценный момент для встречи с собой на коврике сегодня.",
        zh: "愿你今天在垫子上找到与自己相遇的珍贵时刻。",
        ja: "今日もマットの上で自分自身と向き合う大切な時間となりますように。"
      };
      return { message: fallbacks[language] || fallbacks['ko'], bgTheme: "sunny", colorTone: "#FFFFFF", isFallback: true };
    }
  },

  async getAIAnalysis(memberName, attendanceCount, logs, timeOfDay, language = 'ko', requestRole = 'member', statsData = null, context = 'profile') {
    // 1. Check Cache
    const cacheKey = `ai_analysis_${memberName}_${attendanceCount}_${language}_${new Date().getHours()}`;
    const cached = this._safeGetItem(cacheKey);
    if (cached) {
      console.log("[AI] Returning cached analysis");
      return JSON.parse(cached);
    }

    try {
      const genAI = httpsCallable(functions, 'generatePageExperienceV2');
      // [TIMEOUT RACE] If AI takes > 12s, allow fallback to trigger (handled by UI mostly, but we can return early if needed)
      // For now, reliance on 'flash' model should be fast enough.

      const res = await genAI({ memberName, attendanceCount, logs: (logs || []).slice(0, 10), type: 'analysis', timeOfDay, language, role: requestRole, statsData, context });

      // 2. Set Cache
      if (res.data && !res.data.isFallback) {
        this._safeSetItem(cacheKey, JSON.stringify(res.data));
      }
      return res.data;
    } catch (error) {
      console.warn("AI Analysis failed, using fallback:", error);
      const fallbacks = {
        ko: "수련 기록을 바탕으로 분석 중입니다. 꾸준한 발걸음을 응원합니다!",
        en: "Analyzing your practice records. Cheering for your steady progress!",
        ru: "Анализируем ваши записи тренировок. Поддерживаем ваш постоянный прогресс!",
        zh: "正在通过修炼记录进行分析。为您的坚持加油！",
        ja: "練習記録を分析中です。あなたの着実な歩みを応援します！"
      };
      return { message: fallbacks[language] || fallbacks['ko'], isFallback: true };
    }
  },

  async requestAndSaveToken(role = 'member', language = 'ko') {
    try {
      const token = await getToken(messaging, { vapidKey: STUDIO_CONFIG.VAPID_KEY || import.meta.env.VITE_FIREBASE_VAPID_KEY });
      if (token) await this.saveToken(token, role, language);
      return token;
    } catch { return null; }
  },

  async getDailyYoga(language = 'ko') {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = `daily_yoga_${today}_${language}_v2`; // v2 added to invalidate old 3-pose cache
    const cached = this._safeGetItem(cacheKey);

    if (cached) return JSON.parse(cached);

    try {
      const genYoga = httpsCallable(functions, 'generateDailyYogaV2');
      // For context, we can pass simple approximate time/weather or let backend handle defaults
      const response = await genYoga({ language, timeOfDay: new Date().getHours(), weather: 'Sunny' }); // Client side weather fetch is complex, simplified for now
      const data = response.data;

      this._safeSetItem(cacheKey, JSON.stringify(data));
      return data;
    } catch (e) {
      console.warn("Daily Yoga fetch failed:", e);
      // Return hardcoded fallback if everything fails
      const fallbackData = [
        { name: "Child's Pose", benefit: language === 'ko' ? "휴식 및 이완" : "Rest", instruction: language === 'ko' ? "이마를 매트에 대고 편안하게 쉽니다." : "Rest forehead on mat.", emoji: "👶" },
        { name: "Cat-Cow", benefit: language === 'ko' ? "척추 유연성" : "Spine Flex", instruction: language === 'ko' ? "숨을 마시며 등을 펴고, 내쉬며 둥글게 맙니다." : "Inhale arch, exhale round.", emoji: "🐈" }
      ];
      fallbackData.isFallback = true;
      return fallbackData;
    }
  },


  // [Refactoring] Delegated to ScheduleService
  async getMonthlyClasses(branchId, year, month) {
    return scheduleService.getMonthlyClasses(branchId, year, month);
  },

  async getMonthlyScheduleStatus(branchId, year, month) {
    return scheduleService.getMonthlyScheduleStatus(branchId, year, month);
  },

  async updateDailyClasses(branchId, date, classes) {
    return scheduleService.updateDailyClasses(branchId, date, classes);
  },

  async batchUpdateDailyClasses(branchId, updates) {
    return scheduleService.batchUpdateDailyClasses(branchId, updates);
  },

  async createMonthlySchedule(branchId, year, month) {
    return scheduleService.createMonthlySchedule(branchId, year, month);
  },

  async copyMonthlySchedule(branchId, fromYear, fromMonth, toYear, toMonth) {
    return scheduleService.copyMonthlySchedule(branchId, fromYear, fromMonth, toYear, toMonth);
  },

  async deleteMonthlySchedule(branchId, year, month) {
    return scheduleService.deleteMonthlySchedule(branchId, year, month);
  },

  // Delegated Config Getters
  async getInstructors() { return scheduleService.getInstructors(); },
  async getClassTypes() { return scheduleService.getClassTypes(); },
  async getClassLevels() { return scheduleService.getClassLevels(); },
  async getMemberById(id) {
    const docSnap = await getDoc(doc(db, 'members', id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  async logError(error, context = {}) {
    try {
      await addDoc(collection(db, 'error_logs'), {
        message: error?.message || String(error),
        context,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: auth.currentUser ? auth.currentUser.uid : 'anonymous'
      });
    } catch (e) { console.warn("Failed to log error:", e); }
  },

  // Kiosk branch management (localStorage-based for tablet persistence)
  getKioskBranch() {
    const stored = this._safeGetItem('kiosk_branch');
    return stored || STUDIO_CONFIG.BRANCH_IDS.MAPO; // Default to mapo
  },

  setKioskBranch(branchId) {
    this._safeSetItem('kiosk_branch', branchId);
  },

  // Admin Branch Management
  getCurrentBranch() {
    return this._safeGetItem('admin_current_branch') || 'all';
  },

  setBranch(branchId) {
    this._safeSetItem('admin_current_branch', branchId);
  },

  // Member login (PIN-based authentication)
  async loginMember(name, last4Digits) {
    try {
      const membersSnap = await getDocs(
        query(
          collection(db, 'members'),
          where('name', '==', name)
        )
      );

      const matches = membersSnap.docs.filter(doc => {
        const phone = doc.data().phone || '';
        return phone.slice(-4) === last4Digits;
      });

      if (matches.length === 1) {
        return { success: true, member: { id: matches[0].id, ...matches[0].data() } };
      } else if (matches.length > 1) {
        return { success: false, error: 'MULTIPLE_MATCHES', candidates: matches.map(m => ({ id: m.id, ...m.data() })) };
      } else {
        return { success: false, error: 'NOT_FOUND', message: '회원을 찾을 수 없습니다.' };
      }
    } catch (e) {
      console.error('Login failed:', e);
      return { success: false, error: 'SYSTEM_ERROR', message: '로그인 중 오류가 발생했습니다.' };
    }
  },

  async updateMember(memberId, data) {
    try {
      const memberRef = doc(db, 'members', memberId);
      await updateDoc(memberRef, { ...data, updatedAt: new Date().toISOString() });
      return { success: true };
    } catch (e) {
      console.error('Update member failed:', e);
      return { success: false, error: e.message };
    }
  },

  async addMember(data) {
    try {
      // Check for duplicates
      const phoneQuery = query(collection(db, 'members'), where('phone', '==', data.phone));
      const phoneSnap = await getDocs(phoneQuery);
      if (!phoneSnap.empty) {
        throw new Error('이미 등록된 전화번호입니다.');
      }

      const docRef = await addDoc(collection(db, 'members'), {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phoneLast4: data.phone.slice(-4) // Optimisation for lookup
      });

      // Update local cache immediately for speed
      cachedMembers.push({ id: docRef.id, ...data });
      notifyListeners();

      return { success: true, id: docRef.id };
    } catch (e) {
      console.error('Add member failed:', e);
      throw e;
    }
  },

  getMemberStreak(memberId, attendance) {
    try {
      if (!attendance || attendance.length === 0) return 0;

      const dates = attendance.map(a => a.date).filter(Boolean).sort().reverse();
      const uniqueDates = [...new Set(dates)];

      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

      if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

      let streak = 1;
      let lastDate = new Date(uniqueDates[0]);

      for (let i = 1; i < uniqueDates.length; i++) {
        const currentDate = new Date(uniqueDates[i]);
        const diff = Math.round((lastDate - currentDate) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          streak++;
          lastDate = currentDate;
        } else {
          break;
        }
      }
      return streak;
    } catch (e) {
      console.warn('Streak calc failed:', e);
      return 0;
    }
  },

  async getMemberDiligence(memberId) {
    try {
      // Diligence data is calculated by server; we just fetch it
      const docSnap = await getDoc(doc(db, 'member_diligence', memberId));
      return docSnap.exists() ? docSnap.data() : null;
    } catch (e) {
      console.warn("Diligence fetch failed:", e);
      return null;
    }
  },

  getGreetingCache(memberId) {
    const cached = this._safeGetItem(`greeting_${memberId}`);
    return cached ? JSON.parse(cached) : null;
  },

  setGreetingCache(memberId, data) {
    this._safeSetItem(`greeting_${memberId}`, JSON.stringify(data));
  },

  async deletePushToken() {
    try {
      const token = await getToken(messaging, { vapidKey: STUDIO_CONFIG.VAPID_KEY || import.meta.env.VITE_FIREBASE_VAPID_KEY });
      if (token) {
        await deleteDoc(doc(db, 'fcm_tokens', token));
      }
      return true;
    } catch (e) {
      console.error("Delete push token failed:", e);
      return false;
    }
  },

  async requestPushPermission(memberId) {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await this.requestAndSaveToken('member');
        if (token && memberId) {
          await updateDoc(doc(db, 'fcm_tokens', token), { memberId });
        }
      }
      return permission;
    } catch (e) {
      console.error("Push permission request failed:", e);
      return 'denied';
    }
  },

  async getAttendanceByMemberId(memberId) {
    try {
      const q = query(collection(db, 'attendance'), where('memberId', '==', memberId), orderBy('date', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error('Failed to fetch attendance:', e);
      return [];
    }
  },

  async translateNotices(notices, targetLang) {
    if (targetLang === 'ko' || !notices || notices.length === 0) return notices;
    try {
      const translateCall = httpsCallable(functions, 'translateNoticesV2');
      const response = await translateCall({ notices: notices.map(n => ({ id: n.id, title: n.title, content: n.content })), language: targetLang });
      if (response.data && response.data.notices) {
        // [FIX] Merge translated title/content with ORIGINAL object to preserve images/dates
        return response.data.notices.map(translated => {
          const original = notices.find(n => n.id === translated.id);
          return { ...original, ...translated };
        });
      }
      return notices;
    } catch (e) {
      console.warn("[Storage] Notice translation failed:", e);
      return notices;
    }
  },

  async getAiUsage() {
    try {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
      const docRef = doc(db, 'system_stats', `ai_usage_${today}`);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { count: snapshot.data().count || 0, limit: 2000 };
      }
      return { count: 0, limit: 2000 };
    } catch (e) {
      console.error("AI Usage fetch failed:", e);
      return { count: 0, limit: 2000 };
    }
  },

  onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
  },

  async getImages() {
    // [FIX] Return cachedImages (populated by listener from 'images' collection)
    // If cache is empty, fetch directly from Firestore as a fallback
    if (Object.keys(cachedImages).length === 0) {
      try {
        console.log("[Storage] cachedImages empty, fetching from Firestore...");
        const snapshot = await getDocs(collection(db, 'images'));
        const imgs = {};
        snapshot.docs.forEach(doc => {
          imgs[doc.id] = doc.data().url || doc.data().base64;
        });
        cachedImages = imgs; // Update cache
        console.log("[Storage] Fetched images from Firestore. Keys:", Object.keys(imgs));
        return imgs;
      } catch (e) {
        console.warn("[Storage] Failed to fetch images from Firestore:", e);
        return {};
      }
    }
    return cachedImages;
  },

  async updateImage(id, base64) {
    try {
      if (!base64 || !id) throw new Error("Invalid image data");

      console.log(`[Storage] updateImage called for ${id}. Length: ${base64.length}`);
      // [FIX] Update cache immediately and add to pending buffer
      cachedImages[id] = base64;
      pendingImageWrites[id] = { base64, timestamp: Date.now() };
      // Notify listeners immediately to reflect local change
      notifyListeners();

      await setDoc(doc(db, 'images', id), { base64, updatedAt: new Date().toISOString() }, { merge: true });
      console.log(`[Storage] SetDoc complete for ${id}`);
      return true;
    } catch (e) {
      console.error("Update image failed:", e);
      throw e;
    }
  },

  async loginAdmin(email, password) {
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (e) {
      console.error('Admin login failed:', e);
      return { success: false, message: '로그인에 실패했습니다.' };
    }
  },

  async logoutAdmin() {
    const { signOut } = await import("firebase/auth");
    return signOut(auth);
  },

  // Sales & Revenue
  async addSalesRecord(data) {
    try {
      await addDoc(collection(db, 'sales'), {
        ...data,
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.error("Add sales failed:", e);
      throw e;
    }
  },

  async getSalesHistory(memberId) {
    try {
      const q = query(
        collection(db, 'sales'),
        where("memberId", "==", memberId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("Get sales history failed:", e);
      return [];
    }
  },

  async getAllSales() {
    try {
      const q = query(
        collection(db, 'sales'),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("Get all sales failed:", e);
      return [];
    }
  },

  async getSales() { return this.getAllSales(); },

  async deleteAttendance(logId) {
    try {
      await deleteDoc(doc(db, 'attendance', logId));
      cachedAttendance = cachedAttendance.filter(l => l.id !== logId);
      notifyListeners();
      return { success: true };
    } catch (e) {
      console.error("Delete attendance failed:", e);
      return { success: false, message: e.message };
    }
  },

  async addManualAttendance(memberId, date, branchId, className = "수동 확인", instructor = "관리자") {
    try {
      // Use the provided date but set a reasonable time if only YYYY-MM-DD is provided
      let finalDate = new Date(date);
      if (isNaN(finalDate.getTime())) {
        // Fallback to today if invalid
        finalDate = new Date();
      }
      const timestamp = finalDate.toISOString();

      const docRef = await addDoc(collection(db, 'attendance'), {
        memberId,
        timestamp,
        branchId,
        className,
        instructor,
        type: 'manual'
      });
      const newLog = { id: docRef.id, memberId, timestamp, branchId, className, instructor, type: 'manual' };
      cachedAttendance = [newLog, ...cachedAttendance];
      notifyListeners();
      return { success: true, id: docRef.id };
    } catch (e) {
      console.error("Add manual attendance failed:", e);
      return { success: false, message: e.message };
    }
  },

  // [Monitoring] Get Error Logs
  getErrorLogs: async (limitCount = 50) => {
    try {
      // Ensure 'error_logs' collection exists or is queryable.
      // Note: Composite index might be needed for 'timestamp desc'.
      const q = query(
        collection(db, 'error_logs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching error logs:", error);
      return [];
    }
  }
};

