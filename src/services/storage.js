import { db, auth, functions } from "../firebase";
import { signInAnonymously } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { onSnapshot, doc, collection, getDocs, getDoc, addDoc, updateDoc, setDoc, deleteDoc, query, where, orderBy, limit as firestoreLimit, increment } from 'firebase/firestore';
import { STUDIO_CONFIG } from '../studioConfig';
import { messaging, getToken } from "../firebase";
import * as scheduleService from './scheduleService'; // [Refactor]

// Local cache for sync-like access
let cachedMembers = [];
let cachedAttendance = [];
let cachedNotices = [];
// let cachedMessages = [];  // Unused
let cachedImages = {};
let pendingImageWrites = {}; // Buffer for optimistic updates
let cachedDailyClasses = {};
let cachedPushTokensMap = {}; // Use Map-like object to merge multiple collections
let cachedPushTokens = [];
let listeners = [];

// [PERF] O(1) lookup index for phone last 4 digits
let phoneLast4Index = {}; // { "1234": [member1, member2], ... }

// [NETWORK] Timeout wrapper for Cloud Function calls
// Prevents infinite waiting when network is slow or disconnected
const withTimeout = (promise, timeoutMs = 10000, errorMsg = '서버 응답 시간 초과') => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    )
  ]);
};

const notifyListeners = () => {
  listeners.forEach(callback => callback());
};

export const storageService = {
  async initialize({ mode = 'full' } = {}) {
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
      console.log("KIOSK MODE: Initializing cache for maximum speed...");
      console.time('[Kiosk] Full Cache Load');
      
      // [PERF] Wait for member cache to be ready before returning
      const members = await this.loadAllMembers();
      console.log(`[Storage] Kiosk member cache ready: ${members.length} members`);
      
      // [PERF] Pre-fetch today's class info for all branches (parallel)
      try {
        await Promise.all([
          this.getCurrentClass('mokdong').catch(() => {}),
          this.getCurrentClass('suwon').catch(() => {})
        ]);
        console.log('[Storage] Kiosk daily_classes cache ready');
      } catch { /* Silently ignore pre-fetch errors */ }
      
      console.timeEnd('[Kiosk] Full Cache Load');
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
      ( /* snapshot */) => { /* messages sync disabled for now */ },
      "Messages"
    );

    const updateTokenCache = (snapshot, collectionName) => {
      const tokens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Update the map for this collection
      cachedPushTokensMap[collectionName] = tokens;

      // Merge all tokens (avoiding duplicates by document ID)
      const allMerged = {};
      Object.values(cachedPushTokensMap).forEach(tokenList => {
        tokenList.forEach(t => {
          allMerged[t.id] = t;
        });
      });

      cachedPushTokens = Object.values(allMerged);
      console.log(`[Storage] Total Unique FCM Tokens: ${cachedPushTokens.length}`);
      notifyListeners();
    };

    safelySubscribe(
      collection(db, 'fcm_tokens'),
      (snapshot) => updateTokenCache(snapshot, 'fcm_tokens'),
      "FCMTokensMain"
    );

    safelySubscribe(
      collection(db, 'fcmTokens'),
      (snapshot) => updateTokenCache(snapshot, 'fcmTokens'),
      "FCMTokensFallback1"
    );

    safelySubscribe(
      collection(db, 'push_tokens'),
      (snapshot) => updateTokenCache(snapshot, 'push_tokens'),
      "FCMTokensFallback2"
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

  _setupMemberListener() {
    console.log("[Storage] Starting Member Listener...");
    try {
      return onSnapshot(collection(db, 'members'), (snapshot) => {
        const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cachedMembers = members;
        console.log(`[Storage] Members updated via listener: ${members.length}`);
        notifyListeners();
      }, (error) => {
        console.warn("[Storage] Member listener error:", error);
      });
    } catch (e) {
      console.error("[Storage] Failed to setup member listener:", e);
    }
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
      console.time('[Storage] Force Fetch Members');
      console.log("[Storage] Cache empty, force fetching members...");
      const snapshot = await getDocs(collection(db, 'members'));
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Update cache only if listener hasn't already (race condition check)
      if (cachedMembers.length === 0) {
        cachedMembers = members;
      }
      
      // [PERF] Build O(1) lookup index for phoneLast4
      this._buildPhoneLast4Index();
      console.timeEnd('[Storage] Force Fetch Members');
      
      return cachedMembers;
    } catch (e) {
      console.error("Force fetch members failed:", e);
      return [];
    }
  },
  
  // [PERF] Build O(1) lookup index for phoneLast4
  _buildPhoneLast4Index() {
    phoneLast4Index = {};
    cachedMembers.forEach(m => {
      const last4 = m.phoneLast4 || (m.phone && m.phone.slice(-4));
      if (last4) {
        if (!phoneLast4Index[last4]) phoneLast4Index[last4] = [];
        phoneLast4Index[last4].push(m);
      }
    });
    console.log(`[Storage] PhoneLast4 index built: ${Object.keys(phoneLast4Index).length} unique PINs`);
  },



  /**
   * Finds members by the last 4 digits of their phone number.
   * Standardizes on 'phoneLast4' nomenclature.
   * [PERF] Uses O(1) index lookup when cache is ready.
   */
  async findMembersByPhone(last4Digits) {
    // [PERF] O(1) Index lookup first
    if (phoneLast4Index[last4Digits]?.length > 0) {
      console.log(`[Storage] Index hit for ${last4Digits}: ${phoneLast4Index[last4Digits].length} member(s)`);
      return phoneLast4Index[last4Digits];
    }
    
    // Fallback: O(n) filter on cachedMembers (for new members not yet indexed)
    const cachedResults = cachedMembers.filter(m => (m.phoneLast4 || (m.phone && m.phone.slice(-4))) === last4Digits);
    if (cachedResults.length > 0) {
      console.log(`[Storage] Cache filter hit for ${last4Digits}: ${cachedResults.length} member(s)`);
      return cachedResults;
    }

    // Last resort: Cloud Function (should rarely happen in kiosk mode)
    console.warn(`[Storage] Cache miss for ${last4Digits}, calling Cloud Function...`);
    try {
      const getSecureMember = httpsCallable(functions, 'getSecureMemberV2Call');
      // [NETWORK] Apply timeout to prevent infinite waiting
      const result = await withTimeout(
        getSecureMember({ phoneLast4: last4Digits }),
        10000,
        '회원 조회 시간 초과 - 네트워크를 확인해주세요'
      );
      const members = result.data.members || [];
      // Update cache and index
      members.forEach(m => {
        const idx = cachedMembers.findIndex(cm => cm.id === m.id);
        if (idx !== -1) {
          cachedMembers[idx] = { ...cachedMembers[idx], ...m };
        } else {
          if (!cachedMembers.some(cm => cm.id === m.id)) {
            cachedMembers.push(m);
          }
        }
        // Update index
        if (!phoneLast4Index[last4Digits]) phoneLast4Index[last4Digits] = [];
        if (!phoneLast4Index[last4Digits].some(im => im.id === m.id)) {
          phoneLast4Index[last4Digits].push(m);
        }
      });
      return members;
    } catch (e) {
      console.warn("Using Firestore fallback for findMembersByPhone:", e);
      const q = query(collection(db, 'members'), where("phoneLast4", "==", last4Digits), firestoreLimit(10));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  },


  async checkInById(memberId, branchId) {
    try {
      const checkInMember = httpsCallable(functions, 'checkInMemberV2Call');
      const currentClassInfo = await this.getCurrentClass(branchId);
      const classTitle = currentClassInfo?.title || '자율수련';
      const instructor = currentClassInfo?.instructor || '관리자';
      // [NETWORK] Apply timeout to prevent infinite waiting on slow networks
      const response = await withTimeout(
        checkInMember({ memberId, branchId, classTitle, instructor }),
        10000,
        '출석 처리 시간 초과 - 다시 시도해주세요'
      );

      if (!response.data.success) throw new Error(response.data.message || 'Check-in failed');

      const { newCredits, startDate, endDate, attendanceCount, streak, isMultiSession, sessionCount } = response.data;
      const idx = cachedMembers.findIndex(m => m.id === memberId);
      if (idx !== -1) {
        cachedMembers[idx].credits = newCredits;
        cachedMembers[idx].attendanceCount = attendanceCount;
        cachedMembers[idx].streak = streak;
        // [FIX] Update dates if they were TBD
        cachedMembers[idx].startDate = startDate;
        cachedMembers[idx].endDate = endDate;
        // [FIX] Locally update lastAttendance to prevent "Ghost Member" (Risk) false positives immediately after check-in
        cachedMembers[idx].lastAttendance = new Date().toISOString();
        notifyListeners();
      }
      return {
        success: true,
        message: isMultiSession ? `[${classTitle}] ${sessionCount}회차 출석되었습니다!` : `[${classTitle}] 출석되었습니다!`,
        member: {
          id: memberId,
          name: response.data.memberName,
          credits: newCredits,
          attendanceCount,
          streak,
          startDate,
          endDate,
          isMultiSession,
          sessionCount
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  async getCurrentClass(branchId) {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = `${branchId}_${today}`;
    
    // [LOGIC] 1. Fetch Classes for Today
    if (!cachedDailyClasses[cacheKey]) {
      try {
        const docRef = doc(db, 'daily_classes', cacheKey);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) cachedDailyClasses[cacheKey] = docSnap.data().classes;
        else cachedDailyClasses[cacheKey] = [];
      } catch { return null; }
    }
    
    // [LOGIC] 2. Sort Classes by Time
    const classes = (cachedDailyClasses[cacheKey] || [])
      .filter(c => c.status !== 'cancelled')
      .sort((a, b) => a.time.localeCompare(b.time));

    if (classes.length === 0) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let selectedClass = null;
    let logicReason = "No Match";

    // === [SMART MATCHING ALGORITHM] ===
    // Priority 1: Next Class Incoming (30 mins before start) -> "Next Instructor's Territory"
    // Priority 2: Ongoing Class (Start <= Now < End) -> "Current Instructor's Territory"
    // Priority 3: Early Bird (60 mins before start IF no previous class blocking) -> "Allowed Early Entry"

    for (let i = 0; i < classes.length; i++) {
      const cls = classes[i];
      const duration = cls.duration || 60;
      const [h, m] = cls.time.split(':').map(Number);
      const startMinutes = h * 60 + m;
      const endMinutes = startMinutes + duration;

      // Rule 1: 30-min Pre-class Zone (High Priority)
      // If we are within 30 mins before a class starts, it belongs to THIS class.
      // Even if the previous class is running late, the new arrival is likely for this new class.
      if (currentMinutes >= startMinutes - 30 && currentMinutes < startMinutes) {
        selectedClass = cls;
        logicReason = `Upcoming (30min rule): ${cls.time}`;
        break; // Found highest priority, stop.
      }

      // Rule 2: Ongoing Class
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        // If we already selected a "Next Class" via Rule 1 in a previous iteration? 
        // No, because Rule 1 looks at "Future" relative to "Now".
        // If we are HERE, it means we are INSIDE this class time.
        // BUT wait, could we be in the overlapping 30m window of the NEXT class?
        // -> Loop order matters. Sort by time asc.
        // Let's check if the NEXT class (i+1) claims this time via Rule 1.
        
        const nextCls = classes[i+1];
        if (nextCls) {
           const [nh, nm] = nextCls.time.split(':').map(Number);
           const nextStart = nh * 60 + nm;
           if (currentMinutes >= nextStart - 30) {
              // Overlap! The next class is starting soon (<30m).
              // User policy: "Assign to NEXT instructor".
              selectedClass = nextCls;
              logicReason = `Overlap Priority (Next Class): ${nextCls.time}`;
              break; 
           }
        }

        selectedClass = cls;
        logicReason = `Ongoing: ${cls.time}`;
        break; 
      }

      // Rule 3: 1-Hour Early Bird (Empty Gap)
      // Only valid if we are NOT in the range of the previous class.
      // Since we iterate sorted, and we haven't matched Rule 1 or 2 yet for 'cls',
      // we check if we are in the [Start - 60, Start - 30) window.
      if (currentMinutes >= startMinutes - 60 && currentMinutes < startMinutes - 30) {
         // Ensure no previous class is blocking this slot
         const prevCls = classes[i-1];
         let isBlocked = false;
         if (prevCls) {
            const [ph, pm] = prevCls.time.split(':').map(Number);
            const prevEnd = (ph * 60 + pm) + (prevCls.duration || 60);
            if (currentMinutes < prevEnd) {
               isBlocked = true; // Still in previous class time
            }
         }

         if (!isBlocked) {
            selectedClass = cls;
            logicReason = `Early Bird (60min): ${cls.time}`;
            break;
         }
      }
    }

    if (selectedClass) {
       console.log(`[SmartAttendance] Matched: ${selectedClass.title} (${logicReason})`);
       return { 
         title: selectedClass.title, 
         instructor: selectedClass.instructor,
         debugReason: logicReason // For UI display if needed
       };
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

  // [NEW] 강사용 푸시 토큰 저장 - 출석 알림 수신용
  async saveInstructorToken(token, instructorName, language = 'ko') {
    if (!token || !instructorName) return;
    try {
      const tokenRef = doc(db, 'fcm_tokens', token);
      await setDoc(tokenRef, {
        token,
        role: 'instructor',
        instructorName,
        language,
        updatedAt: new Date().toISOString(),
        platform: 'web'
      }, { merge: true });
      console.log(`[Storage] Instructor token saved for ${instructorName}`);
    } catch (e) {
      console.error("Save instructor token failed:", e);
    }
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
  async updateInstructors(list) { return scheduleService.updateInstructors(list); },
  async getClassTypes() { return scheduleService.getClassTypes(); },
  async updateClassTypes(list) { return scheduleService.updateClassTypes(list); },
  async getClassLevels() { return scheduleService.getClassLevels(); },
  async updateClassLevels(list) { return scheduleService.updateClassLevels(list); },
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
      console.log(`[Storage] Member added to Firestore: ${docRef.id}`);

      // [REMOVED] cachedMembers.push(...)
      // We rely on the real-time listener (_setupMemberListener) to update the cache.
      // Manually pushing here causes duplicates when the listener also fires.

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
        // [SYNC] Find memberId for this token and mark as pushEnabled: false
        const tokenSnap = await getDoc(doc(db, 'fcm_tokens', token));
        if (tokenSnap.exists() && tokenSnap.data().memberId) {
          await updateDoc(doc(db, 'members', tokenSnap.data().memberId), { pushEnabled: false });
        }
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
          // [FIX] Use setDoc with merge to prevent "No document to update" error
          await setDoc(doc(db, 'fcm_tokens', token), { memberId, updatedAt: new Date().toISOString() }, { merge: true });
          // [SYNC] Mark member as push enabled
          await updateDoc(doc(db, 'members', memberId), { pushEnabled: true });
        }
      }
      return permission;
    } catch (e) {
      console.error("Push permission request failed:", e);
      return 'denied';
    }
  },

  // [NEW] Service Worker 등록 상태 확인
  async verifyServiceWorkerRegistration() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('이 브라우저는 푸시 알림을 지원하지 않습니다.');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration) {
        throw new Error('Service Worker가 등록되지 않았습니다.');
      }

      // Service Worker 파일 확인
      const swUrl = '/firebase-messaging-sw.js';
      const swRegistration = await navigator.serviceWorker.getRegistration();

      if (!swRegistration || !swRegistration.active) {
        console.warn('[Storage] Service Worker is not active. Attempting re-registration...');
        const newReg = await navigator.serviceWorker.register(swUrl, { scope: '/' });
        await newReg.update();
        return newReg;
      }

      return registration;
    } catch (e) {
      console.error('[Storage] Service Worker verification failed:', e);
      throw new Error(`Service Worker 확인 실패: ${e.message}`);
    }
  },

  // [NEW] 푸시 알림 상태 확인
  async checkPushNotificationStatus() {
    try {
      // 1. 브라우저 지원 여부
      if (!('Notification' in window)) {
        return {
          supported: false,
          permission: 'unsupported',
          serviceWorker: false,
          message: '이 브라우저는 푸시 알림을 지원하지 않습니다.'
        };
      }

      // 2. 권한 상태
      const permission = Notification.permission;

      // 3. Service Worker 상태
      let serviceWorkerActive = false;
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        serviceWorkerActive = !!(reg && reg.active);
      }

      // 4. 토큰 존재 여부
      let hasToken = false;
      try {
        const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (VAPID_KEY && permission === 'granted' && serviceWorkerActive) {
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          hasToken = !!token;
        }
      } catch (e) {
        console.warn('[Storage] Token check failed:', e);
      }

      return {
        supported: true,
        permission,
        serviceWorker: serviceWorkerActive,
        hasToken,
        message: this._getPushStatusMessage(permission, serviceWorkerActive, hasToken)
      };
    } catch (e) {
      console.error('[Storage] Push notification status check failed:', e);
      return {
        supported: false,
        permission: 'error',
        serviceWorker: false,
        hasToken: false,
        message: '푸시 알림 상태를 확인할 수 없습니다.'
      };
    }
  },

  _getPushStatusMessage(permission, serviceWorker, hasToken) {
    if (permission === 'denied') {
      return '⚠️ 알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.';
    }
    if (permission !== 'granted') {
      return '알림 권한이 필요합니다.';
    }
    if (!serviceWorker) {
      return '⚠️ 서비스 워커가 등록되지 않았습니다.';
    }
    if (!hasToken) {
      return '⚠️ 푸시 토큰이 등록되지 않았습니다.';
    }
    return '✅ 푸시 알림이 정상적으로 설정되었습니다.';
  },

  // [IMPROVED] 푸시 토큰 재등록
  async reregisterPushToken(memberId) {
    try {
      console.log('[Storage] Starting push token reregistration...');

      // 1. Service Worker 검증
      await this.verifyServiceWorkerRegistration();

      // 2. 기존 토큰 삭제 시도 (오류 무시)
      try {
        await this.deletePushToken();
      } catch (e) {
        console.warn('[Storage] Failed to delete old token (this is OK):', e);
      }

      // 3. 권한 요청
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('알림 권한이 거부되었습니다.');
      }

      // 4. 새 토큰 요청
      const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!VAPID_KEY) {
        throw new Error('VAPID Key가 설정되지 않았습니다.');
      }

      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (!token) {
        throw new Error('토큰 발급에 실패했습니다.');
      }

      console.log('[Storage] New token obtained:', token.substring(0, 20) + '...');

      // 5. memberId와 연결하여 저장
      if (memberId) {
        await setDoc(doc(db, 'fcm_tokens', token), {
          memberId,
          updatedAt: new Date().toISOString(),
          platform: 'web',
          role: 'member',
          language: 'ko'
        }, { merge: true });

        await updateDoc(doc(db, 'members', memberId), {
          pushEnabled: true,
          fcmToken: token, // [FIX] Save token to member doc for legacy compatibility
          lastTokenUpdate: new Date()
        });

        console.log('[Storage] Token registered for member:', memberId);
      }

      return { success: true, token, message: '푸시 알림이 성공적으로 설정되었습니다!' };
    } catch (error) {
      console.error('[Storage] Token reregistration failed:', error);
      return {
        success: false,
        error: error.message,
        message: `푸시 알림 설정 실패: ${error.message}`
      };
    }
  },

  // Assuming requestAndSaveToken is a helper function within the same object or scope
  // This is the function that the instruction refers to.
  async requestAndSaveToken() {  // Removed unused 'type' parameter
    try {
      const permission = await Notification.requestPermission();
      console.warn("Permission status:", permission);
      if (permission === 'denied') {
        throw new Error("브라우저 알림 권한이 차단되었습니다. 주소창의 자물쇠 아이콘을 눌러 허용해주세요.");
      }

      // The original instruction implies saving the token here, but the provided snippet
      // only returns it. The saving logic for memberId is in requestPushPermission.
      // [FIX] Ensure VAPID key is available. If .env is missing, the user needs to provide it.
      // Used fallback from user provided key just in case env var fails in some build environments
      const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

      if (!VAPID_KEY) {
        alert("푸시 알림 설정 오류: VAPID Key가 설정되지 않았습니다. 관리자에게 문의하세요.");
        throw new Error("VITE_FIREBASE_VAPID_KEY is missing");
      }

      console.log(`[Storage] Requesting token with VAPID Key...`);

      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      return token;
    } catch (e) {
      console.error("Token retrieval failed:", e);
      alert("푸시 토큰 발급 실패: " + (e.message || e) + "\n\n(Firebase Console에서 웹 푸시 인증서 키를 확인해주세요.)");
      throw e;
    }
  },

  async getAttendanceByMemberId(memberId) {
    try {
      console.log('[Storage] getAttendanceByMemberId called for:', memberId);
      const q = query(collection(db, 'attendance'), where('memberId', '==', memberId), orderBy('timestamp', 'desc'), firestoreLimit(50));
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('[Storage] getAttendanceByMemberId results:', results.length, results);
      return results;
    } catch (e) {
      console.error('[Storage] Failed to fetch attendance:', e);
      console.error('[Storage] Error details:', e.message, e.code);
      return [];
    }
  },

  // [NEW] Get attendance records by date and optionally by branch
  async getAttendanceByDate(dateStr, branchId = null) {
    try {
      let q;
      if (branchId) {
        q = query(
          collection(db, 'attendance'),
          where('date', '==', dateStr),
          where('branchId', '==', branchId),
          orderBy('timestamp', 'desc')
        );
      } else {
        q = query(
          collection(db, 'attendance'),
          where('date', '==', dateStr),
          orderBy('timestamp', 'desc')
        );
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error('[Storage] getAttendanceByDate failed:', e);
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
      const logRef = doc(db, 'attendance', logId);
      const logSnap = await getDoc(logRef);

      if (logSnap.exists()) {
        const logData = logSnap.data();
        // If it was a standard check-in or manual entry, restore credit
        if (logData.memberId && (logData.type === 'checkin' || logData.type === 'manual')) {
          const memberRef = doc(db, 'members', logData.memberId);
          await updateDoc(memberRef, {
            credits: increment(1),
            attendanceCount: increment(-1)
          });

          // Update local cache if available
          const idx = cachedMembers.findIndex(m => m.id === logData.memberId);
          if (idx !== -1) {
            cachedMembers[idx].credits = (Number(cachedMembers[idx].credits) || 0) + 1;
            cachedMembers[idx].attendanceCount = Math.max(0, (Number(cachedMembers[idx].attendanceCount) || 0) - 1);
          }
        }
      }

      await deleteDoc(logRef);
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
      // Get member info for name
      const memberDoc = await getDoc(doc(db, 'members', memberId));
      const memberName = memberDoc.exists() ? memberDoc.data().name : '알 수 없음';

      // Use the provided date but set a reasonable time if only YYYY-MM-DD is provided
      let finalDate = new Date(date);
      if (isNaN(finalDate.getTime())) {
        // Fallback to today if invalid
        finalDate = new Date();
      }
      const timestamp = finalDate.toISOString();

      // [FIX] Auto-match with schedule using daily_classes instead of deprecated schedules collection
      let finalClassName = className;
      let finalInstructor = instructor;

      if (className === "수동 확인") {
        try {
          // Get schedule for this date/time/branch
          const dateStr = finalDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
          const scheduleDocId = `${branchId}_${dateStr}`;
          const scheduleDoc = await getDoc(doc(db, 'daily_classes', scheduleDocId));

          if (scheduleDoc.exists()) {
            const scheduleData = scheduleDoc.data();
            const dayClasses = scheduleData.classes || [];

            // Find matching class by time
            const hour = finalDate.getHours();
            const minute = finalDate.getMinutes();
            const requestTimeMins = hour * 60 + minute;

            const matchedClass = dayClasses.find(cls => {
              if (!cls.time || cls.status === 'cancelled') return false;
              const [classHour, classMinute] = cls.time.split(':').map(Number);
              const classTimeMins = classHour * 60 + classMinute;

              // Match if within 40 minutes range (e.g., 20 mins before to 20 mins after start)
              // or strictly during the class duration
              const diff = Math.abs(requestTimeMins - classTimeMins);
              return diff <= 30; // 30 minutes tolerance
            });

            if (matchedClass) {
              finalClassName = matchedClass.title || matchedClass.name || "수업";
              finalInstructor = matchedClass.instructor || "강사님";
            } else {
              // No matching class found
              finalClassName = "자율수련";
              finalInstructor = "회원";
            }
          } else {
            finalClassName = "자율수련";
            finalInstructor = "회원";
          }
        } catch (scheduleError) {
          console.warn("Schedule lookup failed, using default:", scheduleError);
          finalClassName = "자율수련";
          finalInstructor = "회원";
        }
      }

      const docRef = await addDoc(collection(db, 'attendance'), {
        memberId,
        memberName,
        timestamp,
        branchId,
        className: finalClassName,
        instructor: finalInstructor,
        type: 'manual',
        date: finalDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
      });

      // [CRITICAL] Deduct credit for manual attendance
      const memberRef = doc(db, 'members', memberId);
      await updateDoc(memberRef, {
        credits: increment(-1),
        attendanceCount: increment(1),
        lastAttendance: timestamp
      });

      // [FIX] Update local cache immediately for instant UI feedback
      const newLog = {
        id: docRef.id,
        memberId,
        memberName,
        timestamp,
        branchId,
        className: finalClassName,
        instructor: finalInstructor,
        type: 'manual',
        date: finalDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
      };

      // [FIX] Prevent duplicate entries if listener already fired
      const alreadyExists = cachedAttendance.some(l => l.id === docRef.id);
      if (!alreadyExists) {
        cachedAttendance.push(newLog);
        // Sort immediately to prevent "jumping" UI
        cachedAttendance.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }

      // Update member cache too
      const mIdx = cachedMembers.findIndex(m => m.id === memberId);
      if (mIdx !== -1) {
        cachedMembers[mIdx].credits = (Number(cachedMembers[mIdx].credits) || 0) - 1;
        cachedMembers[mIdx].attendanceCount = (Number(cachedMembers[mIdx].attendanceCount) || 0) + 1;
        cachedMembers[mIdx].lastAttendance = timestamp;
      }

      notifyListeners();

      return { success: true, id: docRef.id };
    } catch (e) {
      console.error("Add manual attendance failed:", e);
      return { success: false, message: e.message };
    }
  },

  // [Monitoring] Get Error Logs
  async getErrorLogs(limitCount = 50) {
    try {
      // Ensure 'error_logs' collection exists or is queryable.
      // Note: Composite index might be needed for 'timestamp desc'.
      const q = query(
        collection(db, 'error_logs'),
        orderBy('timestamp', 'desc'),
        firestoreLimit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("Failed to fetch error logs:", e);
      return [];
    }
  },

  // [NEW] Get Push History
  async getPushHistory(limitCount = 50) {
    try {
      const q = query(
        collection(db, 'push_history'),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limitCount)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          displayDate: data.createdAt?.toDate?.() || data.createdAt || new Date()
        };
      });
    } catch (e) {
      console.warn('Failed to fetch push history:', e);
      return [];
    }
  },

  // [NEW] Subscribe to Push History
  subscribeToPushHistory(callback, limitCount = 50) {
    try {
      const q = query(
        collection(db, 'push_history'),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limitCount)
      );
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const item = doc.data();
          return {
            id: doc.id,
            ...item,
            displayDate: item.createdAt?.toDate?.() || item.createdAt || new Date()
          };
        });
        callback(data);
      }, (error) => {
        console.warn('[Storage] Push history listener error:', error);
      });
    } catch (e) {
      console.error('[Storage] Failed to subscribe to push history:', e);
      return () => {};
    }
  },


  // [Added] Delete single error log
  async deleteErrorLog(logId) {
    try {
      await deleteDoc(doc(db, 'error_logs', logId));
      return { success: true };
    } catch (e) {
      console.error("Delete error log failed:", e);
      return { success: false, message: e.message };
    }
  },

  // [Added] Clear all error logs
  async clearErrorLogs() {
    try {
      const snapshot = await getDocs(collection(db, 'error_logs'));
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      return { success: true, count: snapshot.docs.length };
    } catch (e) {
      console.error("Clear error logs failed:", e);
      return { success: false, message: e.message };
    }
  },

  // [Added] Clear all attendance logs
  async clearAllAttendance() {
    try {
      if (!confirm('정말로 모든 출석 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        return { success: false, message: '취소되었습니다.' };
      }
      const snapshot = await getDocs(collection(db, 'attendance'));
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      cachedAttendance = [];
      notifyListeners();
      return { success: true, count: snapshot.docs.length };
    } catch (e) {
      console.error("Clear all attendance failed:", e);
      return { success: false, message: e.message };
    }
  },

  // [Added] Getters for cached data
  getAttendance() { return cachedAttendance; },
  getNotices() { return cachedNotices; },

  // [Added] Load notices with fallback for empty cache
  async loadNotices() {
    // If cache has data, return it
    if (cachedNotices.length > 0) {
      return cachedNotices;
    }

    // Fallback: fetch directly if cache is empty
    try {
      console.log('[Storage] Cache empty, fetching notices from Firestore...');
      const q = query(collection(db, 'notices'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const notices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Update cache for future calls
      cachedNotices = notices;
      return notices;
    } catch (e) {
      console.error('Failed to fetch notices:', e);
      return [];
    }
  },

  async getAllPushTokens() {
    // If listeners already populated cache, return it
    if (cachedPushTokens.length > 0) return cachedPushTokens;

    try {
      console.log("[Storage] getAllPushTokens: Force fetching from Firestore collections...");
      const results = await Promise.all([
        getDocs(collection(db, 'fcm_tokens')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'fcmTokens')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'push_tokens')).catch(() => ({ docs: [] }))
      ]);

      const allMerged = {};
      results.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          allMerged[doc.id] = { id: doc.id, ...doc.data() };
        });
      });

      const tokens = Object.values(allMerged);
      cachedPushTokens = tokens;
      console.log(`[Storage] getAllPushTokens: Total ${tokens.length} unique tokens fetched.`);
      return tokens;
    } catch (e) {
      console.warn("[Storage] Critical failure in getAllPushTokens:", e);
      return cachedPushTokens || [];
    }
  },

  async diagnosePushData() {
    const collections = ['fcm_tokens', 'fcmTokens', 'push_tokens', 'tokens', 'fcm_token'];
    const results = {};
    for (const name of collections) {
      try {
        const snap = await getDocs(collection(db, name));
        results[name] = snap.size;
      } catch (e) {
        results[name] = "Error: " + e.message;
      }
    }
    return results;
  },



  // [NEW] Get all messages (Individual + Notices) for a specific member
  async getMessagesByMemberId(memberId) {
    try {
      console.log(`[Storage] Fetching messages for member: ${memberId}`);

      // 1. Fetch individual messages for this member
      const msgQuery = query(
        collection(db, 'messages'),
        where('memberId', '==', memberId),
        firestoreLimit(50)
      );
      const msgSnap = await getDocs(msgQuery);
      const individualMessages = msgSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'admin_individual'
      }));

      // 2. Fetch Global Notices to display in message list as well
      const noticeQuery = query(
        collection(db, 'notices'),
        firestoreLimit(20)
      );
      const noticeSnap = await getDocs(noticeQuery);
      const noticeMessages = noticeSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'notice',
        content: doc.data().content, // Notices usually have content field
        timestamp: doc.data().timestamp || doc.data().date // Normalizing timestamp
      }));

      // 3. Merge and Sort by timestamp descending
      const allMessages = [...individualMessages, ...noticeMessages].sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
      });

      return allMessages;
    } catch (e) {
      console.error("[Storage] getMessagesByMemberId failed:", e);
      return [];
    }
  },

  // [Added] Get pricing information  
  async getPricing() {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'pricing'));
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (e) {
      console.warn("Failed to fetch pricing:", e);
      return null;
    }
  },

  // [Added] Subscribe to global listener changes
  subscribe(callback) {
    listeners.push(callback);
    // Return unsubscribe function
    return () => {
      listeners = listeners.filter(cb => cb !== callback);
    };
  },

  getPendingApprovals(callback) {
    try {
      const q = query(
        collection(db, 'message_approvals'),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (callback) callback(items);
      }, (error) => {
        console.warn("[Storage] Error fetching pending approvals:", error);
        if (callback) callback([]);
      });
    } catch (e) {
      console.error("[Storage] Failed to setup pending approvals listener:", e);
      if (callback) callback([]);
      return () => { };
    }
  },

  async approvePush(id) {
    try {
      const docRef = doc(db, 'message_approvals', id);
      await updateDoc(docRef, { status: 'approved', approvedAt: new Date().toISOString() });
      return { success: true };
    } catch (e) {
      console.error("Approve push failed:", e);
      throw e;
    }
  },

  async rejectPush(id) {
    try {
      await deleteDoc(doc(db, 'message_approvals', id));
      return { success: true };
    } catch (e) {
      console.error("Reject push failed:", e);
      throw e;
    }
  },

  // --- Real Push Notifications & Messaging ---

  /**
   * Sends a single push notification to a member by adding a doc to 'messages' collection.
   * This triggers 'sendPushOnMessageV2' Cloud Function.
   */
  async addMessage(memberId, content) {
    try {
      if (!memberId || !content) throw new Error("Invalid message data");

      const docRef = await addDoc(collection(db, 'messages'), {
        memberId,
        content,
        type: 'admin_individual',
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString()
      });

      console.log(`[Storage] Message added for ${memberId}: ${docRef.id}. Triggering push...`);
      return { success: true, id: docRef.id };
    } catch (e) {
      console.error("Add message failed:", e);
      throw e;
    }
  },

  /**
   * Fetches message history for a specific member.
   */
  async getMessages(memberId) {
    try {
      const q = query(
        collection(db, 'messages'),
        where("memberId", "==", memberId),
        orderBy("timestamp", "desc"),
        firestoreLimit(50)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("Get messages failed:", e);
      return [];
    }
  },

  /**
   * Sends bulk push notifications by adding a doc to 'push_campaigns' collection.
   * This triggers 'sendBulkPushV2' Cloud Function.
   */
  async sendBulkPushCampaign(targetMemberIds, title, body) {
    try {
      if (!body) throw new Error("Message body is required");

      const docRef = await addDoc(collection(db, 'push_campaigns'), {
        targetMemberIds: targetMemberIds || [], // Empty list = All Members in cloud function
        title: title || STUDIO_CONFIG.NAME + " 알림",
        body,
        status: 'pending',
        createdAt: new Date().toISOString(),
        totalTargets: targetMemberIds?.length || 0
      });

      console.log(`[Storage] Bulk push campaign created: ${docRef.id}. Status: pending.`);
      return { success: true, id: docRef.id };
    } catch (e) {
      console.error("Bulk push failed:", e);
      throw e;
    }
  },

  /**
   * CSV 회원 데이터 마이그레이션
   * @param {Array<Object>} csvData - 파싱된 CSV 데이터
   * @param {boolean} dryRun - true면 실제 마이그레이션 없이 검증만
   * @param {Function} onProgress - 진행 상황 콜백 (currentIndex, total, currentMember)
   * @returns {Promise<Object>} 마이그레이션 결과
   */
  async migrateMembersFromCSV(csvData, dryRun = false, onProgress = null) {
    const {
      extractMonthsFromProduct,
      calculateEndDate,
      extractEndDateFromPeriod,
      convertToBranchId,
      parseCredits,
      parseAmount,
      parseLastVisit
    } = await import('../utils/csvParser.js');

    const results = {
      total: csvData.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      members: [],
      sales: []
    };

    console.log(`[Migration] Starting CSV migration. Total rows: ${csvData.length}, Dry Run: ${dryRun}`);

    // [New] If not dry run, clear all existing data first as requested by user
    if (!dryRun) {
      console.log('[Migration] Not a dry run. Clearing existing data first...');
      if (onProgress) onProgress(0, 0, '기존 데이터 정리 중 (전체 삭제)...');
      await this.cleanupAllData((current, total, colName) => {
        if (onProgress) onProgress(0, 0, `${colName} 삭제 중...`);
      });
      console.log('[Migration] Cleanup complete. Proceeding with migration...');
    }

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];

      try {
        // 진행 상황 콜백
        if (onProgress) {
          onProgress(i + 1, csvData.length, row['이름']);
        }

        // 필수 필드 검증
        if (!row['이름'] || !row['휴대폰1']) {
          results.skipped++;
          results.errors.push({ row: i + 1, name: row['이름'], error: '필수 필드 누락 (이름 또는 전화번호)' });
          continue;
        }

        // 회원 데이터 변환
        const branchId = convertToBranchId(row['회원번호']);
        const credits = parseCredits(row['남은횟수']);
        const phone = row['휴대폰1'].trim();
        const phoneLast4 = phone.slice(-4);

        // 만기일자 계산
        let endDate = row['만기일자'] || '';
        if (!endDate && row['이용기간']) {
          // 이용기간에서 종료일 추출
          endDate = extractEndDateFromPeriod(row['이용기간']);
        }
        if (!endDate && row['판매일자'] && row['마지막 판매']) {
          // 상품명에서 기간 추출하여 계산
          const months = extractMonthsFromProduct(row['마지막 판매']);
          endDate = calculateEndDate(row['판매일자'], months);
        }

        const memberData = {
          name: row['이름'].trim(),
          phone,
          phoneLast4,
          branchId,
          homeBranch: branchId,
          credits,
          startDate: row['판매일자'] || row['등록일자'] || '',
          endDate: endDate || '',
          attendanceCount: 0,
          lastAttendance: parseLastVisit(row['마지막출입']) || '',
          createdAt: row['등록일자'] ? new Date(row['등록일자']).toISOString() : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          streak: 0,
          pushEnabled: false
        };

        // Dry Run 모드가 아니면 실제 마이그레이션
        if (!dryRun) {
          // 중복 전화번호 체크
          const existingQuery = query(
            collection(db, 'members'),
            where('phone', '==', phone)
          );
          const existingSnap = await getDocs(existingQuery);

          let memberId;
          if (existingSnap.empty) {
            // 새 회원 추가
            const docRef = await addDoc(collection(db, 'members'), memberData);
            memberId = docRef.id;
            console.log(`[Migration] Added new member: ${memberData.name} (${memberId})`);
          } else {
            // 기존 회원 업데이트
            memberId = existingSnap.docs[0].id;
            const existingData = existingSnap.docs[0].data();

            // [Fix] Ensure createdAt is never undefined
            const existingCreatedAt = existingData.createdAt || existingData.updatedAt || new Date().toISOString();

            await updateDoc(doc(db, 'members', memberId), {
              ...memberData,
              createdAt: existingCreatedAt // 기존 가입일 유지
            });
            console.log(`[Migration] Updated existing member: ${memberData.name} (${memberId})`);
          }

          // 판매 기록 추가 (판매금액이 0이 아닌 경우)
          const amount = parseAmount(row['판매금액']);
          if (amount > 0 && row['판매일자']) {
            const salesData = {
              memberId,
              memberName: memberData.name,
              amount,
              productName: row['마지막 판매'] || '',
              branchId,
              timestamp: new Date(row['판매일자']).toISOString()
            };
            await addDoc(collection(db, 'sales'), salesData);
            results.sales.push(salesData);
            console.log(`[Migration] Added sales record: ${memberData.name} - ${amount}원`);
          }
        }

        results.members.push(memberData);
        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          name: row['이름'],
          error: error.message
        });
        console.error(`[Migration] Error at row ${i + 1}:`, error);
      }
    }

    console.log(`[Migration] Complete. Success: ${results.success}, Failed: ${results.failed}, Skipped: ${results.skipped}`);

    // 캐시 갱신 (실제 마이그레이션인 경우)
    if (!dryRun) {
      await this.loadAllMembers();
      notifyListeners();
    }

    return results;
  },

  /**
   * [DANGER] Clears all non-core data (members, sales, attendance, push, etc.) for a fresh start.
   * Keeps: notices, timetable, prices, images.
   */
  async cleanupAllData(onProgress = null) {
    const { getDocs, collection, writeBatch } = await import("firebase/firestore");

    // Collections to definitely DELETE
    const collectionsToClear = [
      'members',
      'sales',
      'attendance',
      'push_campaigns',
      'push_history',
      'notifications',
      'messages',
      'message_approvals',
      'fcm_tokens',
      'fcmTokens',
      'push_tokens'
    ];

    let totalDeleted = 0;
    const stats = {};

    for (const colName of collectionsToClear) {
      console.log(`[Storage] Clearing collection: ${colName}...`);
      try {
        const snapshot = await getDocs(collection(db, colName));
        const docs = snapshot.docs;
        stats[colName] = docs.length;

        if (docs.length === 0) continue;

        // Firestore batch limit is 500
        for (let i = 0; i < docs.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + 500);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();

          totalDeleted += chunk.length;
          if (onProgress) onProgress(totalDeleted, docs.length, colName);
        }
      } catch (e) {
        console.warn(`[Cleanup] Failed to clear ${colName}:`, e);
      }
    }

    console.log(`[Storage] Cleanup complete. Deleted ${totalDeleted} documents.`);

    // Refresh cash
    await this.loadAllMembers();
    notifyListeners();

    return { totalDeleted, stats };
  }
};

