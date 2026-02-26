import { db, auth, functions } from "../firebase"; // ✅ Import storage
import { signInAnonymously, signInWithCustomToken } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { onSnapshot, doc, collection, getDocs, getDoc, addDoc, updateDoc, setDoc, deleteDoc, query, where, orderBy, limit as firestoreLimit, writeBatch } from 'firebase/firestore';
// Removed firebase/storage imports
import { STUDIO_CONFIG } from '../studioConfig';
import { messaging, getToken } from "../firebase";
import * as scheduleService from './scheduleService'; // [Refactor]
import * as noticeService from './noticeService'; // [Refactor]
import * as aiService from './aiService'; // [Refactor]
import { memberService } from './memberService'; // [Refactor] Extreme Safety Facade
import { attendanceService } from './attendanceService'; // [Refactor] Attendance Facade
import { paymentService } from './paymentService'; // [Refactor] Payment Facade
import { messageService } from './messageService'; // [Refactor] Message Facade
import { getKSTTotalMinutes } from '../utils/dates';

// Local cache for sync-like access
// [REMOVED] cachedMembers, phoneLast4Index, cachedAttendance moved to dedicated services
let cachedNotices = [];
// let cachedMessages = [];  // Unused
let cachedImages = {};
let pendingImageWrites = {}; // Buffer for optimistic updates
let cachedDailyClasses = {}; // {cacheKey: { classes: [...], fetchedAt: timestamp }}
const DAILY_CLASS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
let cachedPushTokens = [];
let listeners = [];

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
  subscribe(callback) {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(cb => cb !== callback);
    };
  },

  async initialize({ mode = 'full' } = {}) {
    // Wire up notifyListeners for internal services
    memberService.setNotifyCallback(notifyListeners);
    attendanceService.setNotifyCallback(notifyListeners);
    paymentService.setNotifyCallback(notifyListeners);
    messageService.setNotifyCallback(notifyListeners);
    attendanceService.setDependencies({
      getCurrentClass: this.getCurrentClass.bind(this),
      logError: this.logError.bind(this)
    });

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
      console.log("KIOSK MODE: Initializing cache for maximum speed & reliability...");
      console.time('[Kiosk] Full Cache Load');
      
      // [PERF] Wait for member cache to be ready before returning
      const members = await memberService.loadAllMembers();
      console.log(`[Storage] Kiosk member cache ready: ${members.length} members`);
      
      // [PERF] Aggressive Pre-fetch: Load today, yesterday, and tomorrow's classes
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
            fetchPromises.push(this._refreshDailyClassCache(branchId, date));
          });
        });

        await Promise.all(fetchPromises);
        console.log(`[Storage] Kiosk daily_classes cache ready (3 days for all branches)`);

        // [ALWAYS-ON] Periodic background refresh (every 10m)
        if (!this._refreshInterval) {
          this._refreshInterval = setInterval(() => {
            console.log("[Storage] Scheduled background refresh for today's classes and member cache...");
            branches.forEach(bid => this._refreshDailyClassCache(bid));
            // [UX] Refresh members periodically in Kiosk mode to prevent stale "Expired" states
            memberService.loadAllMembers();
          }, 10 * 60 * 1000); // 10m
        }

        // [NEW] Real-time Kiosk Trigger: 단일 문서 리스너 (가벼운 실시간 동기화)
        try {
          const syncRef = doc(db, 'system_state', 'kiosk_sync');
          onSnapshot(syncRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              if (data.lastMemberUpdate && data.lastMemberUpdate > (this._lastKioskSync || '')) {
                console.log('[Storage] Kiosk sync triggered by Admin. Refreshing members...');
                this._lastKioskSync = data.lastMemberUpdate;
                memberService.loadAllMembers();
              }
            }
          }, (err) => {
            console.warn('[Storage] Kiosk sync listener error:', err);
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

    // [NEW] Real-time Member Sync
    memberService.setupMemberListener(); // Ensure this is called!
    
    // [NEW] Real-time Attendance Sync
    attendanceService.setupAttendanceListener();

    safelySubscribe(
      query(collection(db, 'notices'), orderBy("timestamp", "desc")),
      (snapshot) => cachedNotices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      "Notices"
    );

    // [PERF] messages 빈 리스너 제거 — 아무것도 하지 않으면서 Firestore 연결 점유했음

    // [PERF] FCM 토큰: 기본 컬렉션(fcm_tokens)만 구독 (3중 → 단일)
    // 레거시 컬렉션(fcmTokens, push_tokens)은 마이그레이션 후 제거 예정
    safelySubscribe(
      collection(db, 'fcm_tokens'),
      (snapshot) => {
        cachedPushTokens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`[Storage] FCM Tokens: ${cachedPushTokens.length}`);
      },
      "FCMTokens"
    );

    // [PERF] images: 1회 로드로 변경 (실시간 구독 불필요 — 이미지는 거의 변하지 않음)
    try {
      const imgSnapshot = await getDocs(collection(db, 'images'));
      const imgs = {};
      imgSnapshot.docs.forEach(d => {
        imgs[d.id] = d.data().url || d.data().base64;
      });
      cachedImages = imgs;
      console.log(`[Storage] Images loaded (one-time): ${Object.keys(cachedImages).length} items`);
    } catch (imgErr) {
      console.warn('[Storage] Images load failed:', imgErr);
    }
  },

  _setupMemberListener() { return memberService.setupMemberListener(); },

  _safeGetItem(key) { try { return localStorage.getItem(key); } catch { return null; } },
  _safeSetItem(key, value) { try { localStorage.setItem(key, value); } catch { /* ignore */ } },

  async addNotice(title, content, images = [], sendPush = true) {
    return noticeService.addNotice(title, content, images, sendPush);
  },

  async deleteNotice(noticeId) {
    return noticeService.deleteNotice(noticeId);
  },

  getMembers() { return memberService.getMembers(); },
  loadAllMembers() { return memberService.loadAllMembers(); },
  
  // [PERF] Build O(1) lookup index for phoneLast4
  _buildPhoneLast4Index() { return memberService._buildPhoneLast4Index(); },



  /**
   * Finds members by the last 4 digits of their phone number.
   * Standardizes on 'phoneLast4' nomenclature.
   * [PERF] Uses O(1) index lookup when cache is ready.
   */
  findMembersByPhone(last4Digits) { return memberService.findMembersByPhone(last4Digits); },

  checkInById(memberId, branchId, force = false) { return attendanceService.checkInById(memberId, branchId, force); },
  
  _updateLocalMemberCache(memberId, updates) { return memberService._updateLocalMemberCache(memberId, updates); },

  async _refreshDailyClassCache(branchId, date = null) {
    const targetDate = date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = `${branchId}_${targetDate}`;
    try {
      const docRef = doc(db, 'daily_classes', cacheKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        cachedDailyClasses[cacheKey] = { 
          classes: docSnap.data().classes || [], 
          fetchedAt: Date.now() 
        };
      } else {
        cachedDailyClasses[cacheKey] = { 
          classes: [], 
          fetchedAt: Date.now() 
        };
      }
    } catch (e) {
      console.warn(`[Storage] Failed to refresh daily classes for ${cacheKey}:`, e);
    }
  },

  async getCurrentClass(branchId, instructorName = null) {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = `${branchId}_${today}`;
    
    // [LOGIC] 1. Fetch Classes for Today (With TTL & Stale Check)
    const cached = cachedDailyClasses[cacheKey];
    const now = Date.now();
    const isStale = !cached || !cached.classes || cached.classes.length === 0 || (now - (cached.fetchedAt || 0)) > DAILY_CLASS_CACHE_TTL;

    if (isStale) {
      try {
        console.log(`[Storage] Cache stale/empty for ${cacheKey}, refreshing...`);
        const docRef = doc(db, 'daily_classes', cacheKey);
        const docSnap = await getDoc(docRef);
        const classes = docSnap.exists() ? (docSnap.data().classes || []) : [];
        cachedDailyClasses[cacheKey] = { classes, fetchedAt: Date.now() };
      } catch (e) { 
        console.warn("[Storage] Failed to fetch classes:", e);
        return null; 
      }
    }
    
    // [LOGIC] 2. Filter & Sort Classes by Time
    let classes = (cachedDailyClasses[cacheKey]?.classes || [])
      .filter(c => c.status !== 'cancelled');

    // Filter by instructor if provided (Smart Filter)
    if (instructorName) {
      const query = instructorName.trim();
      classes = classes.filter(c => {
        const target = (c.instructor || '').trim();
        return target === query || target.includes(query) || query.includes(target);
      });
    }

    classes.sort((a, b) => a.time.localeCompare(b.time));

    if (classes.length === 0) return null;

    const currentMinutes = getKSTTotalMinutes();

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
        logicReason = `수업 예정: ${cls.time}`;
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
              logicReason = `다음 수업 우선: ${nextCls.time}`;
              break; 
           }
        }

        selectedClass = cls;
        logicReason = `수업 진행 중: ${cls.time}`;
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
            logicReason = `조기 출석: ${cls.time}`;
            break;
         }
      }
    }

    // Rule 4: Post-Class Grace Period (30 mins after end)
    // If no class matched via Rules 1-3, check if we just missed a class
    if (!selectedClass) {
      for (let i = classes.length - 1; i >= 0; i--) {
        const cls = classes[i];
        const duration = cls.duration || 60;
        const [h, m] = cls.time.split(':').map(Number);
        const endMinutes = (h * 60 + m) + duration;

        // If current time is within 30 mins after class ended
        if (currentMinutes >= endMinutes && currentMinutes <= endMinutes + 30) {
          selectedClass = cls;
          logicReason = `수업 종료 직후: ${cls.time} (종료 ${currentMinutes - endMinutes}분 경과)`;
          break;
        }
      }
    }

    if (selectedClass) {
       console.log(`[SmartAttendance] Matched: ${selectedClass.title || selectedClass.className} (${logicReason})`);
       return { 
         title: selectedClass.title || selectedClass.className, 
         instructor: selectedClass.instructor,
         time: selectedClass.time,
         debugReason: logicReason
       };
    }

    console.log(`[SmartAttendance] No match found. currentMinutes=${currentMinutes}, classes=${classes.map(c => c.time + '(' + c.title + ')').join(', ')}`);
    return null;
  },

  async getDailyClasses(branchId, instructorName = null) {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = `${branchId}_${today}`;
    
    const cached = cachedDailyClasses[cacheKey];
    if (!cached || !cached.classes) {
      try {
        const docRef = doc(db, 'daily_classes', cacheKey);
        const docSnap = await getDoc(docRef);
        const classes = docSnap.exists() ? (docSnap.data().classes || []) : [];
        cachedDailyClasses[cacheKey] = { classes, fetchedAt: Date.now() };
      } catch { return []; }
    }
    
    let classes = (cachedDailyClasses[cacheKey]?.classes || [])
      .filter(c => c.status !== 'cancelled');

    if (instructorName) {
      const target = instructorName.trim();
      classes = classes.filter(c => (c.instructor || '').trim() === target);
    }

    return classes.sort((a, b) => a.time.localeCompare(b.time));
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
    return aiService.getAIExperience(memberName, attendanceCount, day, hour, upcomingClass, weather, credits, remainingDays, language, diligence, context);
  },

  async getAIAnalysis(memberName, attendanceCount, logs, timeOfDay, language = 'ko', requestRole = 'member', statsData = null, context = 'profile') {
    return aiService.getAIAnalysis(memberName, attendanceCount, logs, timeOfDay, language, requestRole, statsData, context);
  },



  async getDailyYoga(language = 'ko') {
    return aiService.getDailyYoga(language);
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

  async updatePastAttendanceRecords(branchId, dateStr, oldClasses, newClasses) {
    return attendanceService.updatePastAttendanceRecords(branchId, dateStr, oldClasses, newClasses);
  },

  // Delegated Config Getters
  async getInstructors() { return scheduleService.getInstructors(); },
  async updateInstructors(list) { return scheduleService.updateInstructors(list); },
  async getClassTypes() { return scheduleService.getClassTypes(); },
  async updateClassTypes(list) { return scheduleService.updateClassTypes(list); },
  async getClassLevels() { return scheduleService.getClassLevels(); },
  async updateClassLevels(list) { return scheduleService.updateClassLevels(list); },
  getMemberById(id) { return memberService.getMemberById(id); },
  async fetchMemberById(id) { return memberService.fetchMemberById(id); },

  async getMonthlyBackups(branchId, year, month) {
    return scheduleService.getMonthlyBackups(branchId, year, month);
  },
  
  async restoreMonthlyBackup(branchId, year, month, backupId) {
    return scheduleService.restoreMonthlyBackup(branchId, year, month, backupId);
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

  /**
   * 로그인 실패 로깅
   * @param {string} type - "instructor" 또는 "member"
   * @param {string} name - 시도한 이름
   * @param {string} phoneLast4 - 시도한 전화번호 뒷4자리
   * @param {string} errorMessage - 에러 메시지
   */
  async logLoginFailure(type, name, phoneLast4, errorMessage) {
    try {
      await addDoc(collection(db, 'login_failures'), {
        timestamp: new Date().toISOString(),
        type: type,
        attemptedName: name,
        attemptedPhone: phoneLast4,
        errorMessage: errorMessage,
        userAgent: navigator.userAgent,
        device: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
      });
      console.log(`[Login Failure] Logged: ${type} - ${name} - ${phoneLast4}`);
    } catch (e) {
      console.error('[Login Failure] Failed to log:', e);
      // 로깅 실패는 조용히 무시 (사용자 경험에 영향 없음)
    }
  },

  // Member login (PIN-based authentication)
  async loginMember(name, last4Digits) {
    try {
      // [FIX] Use Cloud Function via findMembersByPhone to bypass Firestore security rules
      const matches = await this.findMembersByPhone(last4Digits);
      
      // [FIX] 이름 부분 매칭 - 데이터에 "노효원TTC2기" 같은 추가 정보가 있어도 "노효원"으로 로그인 가능
      const inputName = name.trim().toLowerCase();
      const filtered = matches.filter(m => {
        const memberName = (m.name || '').trim().toLowerCase();
        // 입력한 이름이 회원 이름에 포함되어 있거나, 회원 이름이 입력한 이름으로 시작하면 매칭
        return memberName.startsWith(inputName) || memberName.includes(inputName);
      });

        if (filtered.length === 1) {
          // [FIX] Sign in anonymously to enable Firestore writes (e.g. fcm_tokens)
          try {
            if (!auth.currentUser) {
                await import("firebase/auth").then(({ signInAnonymously }) => signInAnonymously(auth));
                console.log('[Storage] Anonymous auth successful for member login');
            }
          } catch (authErr) {
            console.warn('[Storage] Anonymous auth failed during login:', authErr);
          }
          return { success: true, member: { ...filtered[0], displayName: name.trim() } };
        } else if (filtered.length > 1) {
          console.warn(`Multiple members found for name ${name} and PIN ${last4Digits}`);
          // 정확히 일치하는 회원 우선
          const exact = filtered.find(m => (m.name || '').trim().toLowerCase() === inputName);
          
          // [FIX] Sign in anonymously here too
          try {
            if (!auth.currentUser) {
                await import("firebase/auth").then(({ signInAnonymously }) => signInAnonymously(auth));
                console.log('[Storage] Anonymous auth successful for member login');
            }
          } catch (authErr) {
            console.warn('[Storage] Anonymous auth failed during login:', authErr);
          }

          return { success: true, member: { ...(exact || filtered[0]), displayName: name.trim() } }; 
      } else {
        // 실패 로깅
        await this.logLoginFailure('member', name, last4Digits, 'NOT_FOUND');
        return { success: false, error: 'NOT_FOUND', message: '일치하는 회원 정보가 없습니다.' };
      }
    } catch (e) {
      console.error('Login failed:', e);
      // 실패 로깅
      await this.logLoginFailure('member', name, last4Digits, e.message || 'SYSTEM_ERROR');
      return { success: false, error: 'SYSTEM_ERROR', message: '로그인 중 오류가 발생했습니다.' };
    }
  },

  // [NEW] 강사 로그인 (Cloud Function 기반)
  async loginInstructor(name, last4Digits) {
    try {
      const verifyInstructor = httpsCallable(functions, 'verifyInstructorV2Call');
      const response = await withTimeout(
        verifyInstructor({ name, phoneLast4: last4Digits }),
        10000,
        '선생님 인증 시간 초과'
      );

      if (response.data.success) {
        // [FIX] Sign in with custom token (if provided) to pass firestore rules
        if (response.data.token) {
            try {
                await signInWithCustomToken(auth, response.data.token);
                console.log('[Storage] Instructor auth via token successful');
            } catch (authErr) {
                console.warn('[Storage] Instructor token auth failed:', authErr);
            }
        }
        
        localStorage.setItem('instructorName', response.data.name);
        return { success: true, name: response.data.name };
      } else {
        // 실패 로깅
        await this.logLoginFailure('instructor', name, last4Digits, response.data.message || '인증 실패');
        return { success: false, message: response.data.message || '인증 실패' };
      }
    } catch (e) {
      console.error('Instructor login failed:', e);
      // 실패 로깅
      await this.logLoginFailure('instructor', name, last4Digits, e.message || 'SYSTEM_ERROR');
      return { success: false, message: '로그인 중 시스템 오류가 발생했습니다.' };
    }
  },

  // [ADMIN] 데이터 마이그레이션 - phoneLast4 필드 자동 생성
  async migratePhoneLast4() {
    try {
      const snapshot = await getDocs(collection(db, 'members'));
      let count = 0;
      const batchSize = 100;
      let batch = writeBatch(db);

      for (const d of snapshot.docs) {
        const data = d.data();
        if (data.phone && !data.phoneLast4) {
          batch.update(doc(db, 'members', d.id), {
            phoneLast4: data.phone.slice(-4)
          });
          count++;
          if (count % batchSize === 0) {
            await batch.commit();
            batch = writeBatch(db);
          }
        }
      }
      await batch.commit();
      
      // 강사 목록도 업데이트 (지원하는 경우)
      const instDoc = await getDoc(doc(db, 'settings', 'instructors'));
      if (instDoc.exists()) {
        const list = instDoc.data().list || [];
        const updatedList = list.map(inst => {
          if (typeof inst === 'object' && inst.phone && !inst.phoneLast4) {
            return { ...inst, phoneLast4: inst.phone.slice(-4) };
          }
          return inst;
        });
        await setDoc(doc(db, 'settings', 'instructors'), { list: updatedList }, { merge: true });
      }

      return { success: true, count };
    } catch (e) {
      console.error('Migration failed:', e);
      throw e;
    }
  },


  updateMember(memberId, data) { return memberService.updateMember(memberId, data); },
  addMember(data) { return memberService.addMember(data); },
  getMemberStreak(memberId, attendance) { return memberService.getMemberStreak(memberId, attendance); },
  getMemberDiligence(memberId) { return memberService.getMemberDiligence(memberId); },
  getGreetingCache(memberId) { return memberService.getGreetingCache(memberId); },
  setGreetingCache(memberId, data) { return memberService.setGreetingCache(memberId, data); },

  async deletePushToken() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, { 
        vapidKey: STUDIO_CONFIG.VAPID_KEY || import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration
      });
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
          const tokenRef = doc(db, 'fcm_tokens', token);
          const tokenSnap = await getDoc(tokenRef);
          
          let dataToUpdate = { 
            memberId, 
            updatedAt: new Date().toISOString() 
          };

          if (!tokenSnap.exists() || !tokenSnap.data().createdAt) {
            dataToUpdate.createdAt = new Date().toISOString();
          }

          await setDoc(tokenRef, dataToUpdate, { merge: true });
          await updateDoc(doc(db, 'members', memberId), { pushEnabled: true });
        }
      }
      return permission;
    } catch (e) {
      console.error("Push permission request failed:", e);
      return 'denied';
    }
  },

  // [NEW] 강사용 푸시 권한 요청 및 토큰 저장
  async requestInstructorPushPermission(instructorName) {
    if (!instructorName) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await this.requestAndSaveToken('instructor');
        if (token) {
          const tokenRef = doc(db, 'fcm_tokens', token);
          const tokenSnap = await getDoc(tokenRef);
          
          let dataToUpdate = {
            token,
            role: 'instructor',
            instructorName,
            updatedAt: new Date().toISOString(),
            platform: 'web'
          };

          if (!tokenSnap.exists() || !tokenSnap.data().createdAt) {
            dataToUpdate.createdAt = new Date().toISOString();
          }

          await setDoc(tokenRef, dataToUpdate, { merge: true });
          console.log(`[Push] Instructor token registered for ${instructorName}`);
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error("Instructor push permission request failed:", e);
      return false;
    }
  },

  // [FIX] Service Worker 등록 상태 확인 (Vite PWA 호환)
  async verifyServiceWorkerRegistration() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('이 브라우저는 푸시 알림을 지원하지 않습니다.');
    }

    try {
      // Vite PWA가 이미 SW를 등록하므로, 준비될 때까지 기다리기만 하면 됩니다.
      // 중복 등록 시도("closed-by-client" 에러 원인)를 방지합니다.
      const registration = await navigator.serviceWorker.ready;
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
          const registration = await navigator.serviceWorker.ready;
          const token = await getToken(messaging, { 
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
          });
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

      const token = await getToken(messaging, { 
        vapidKey: VAPID_KEY, 
        serviceWorkerRegistration: await this.verifyServiceWorkerRegistration() 
      });
      if (!token) {
        throw new Error('토큰 발급에 실패했습니다.');
      }

      console.log('[Storage] New token obtained:', token.substring(0, 20) + '...');

      // 5. memberId와 연결하여 저장
      if (memberId) {
        const tokenRef = doc(db, 'fcm_tokens', token);
        const tokenSnap = await getDoc(tokenRef);
        
        let tokenData = {
          memberId,
          updatedAt: new Date().toISOString(),
          platform: 'web',
          role: 'member',
          language: 'ko'
        };

        // Preserve original createdAt if exists, or set new if missing
        if (!tokenSnap.exists() || !tokenSnap.data().createdAt) {
          tokenData.createdAt = new Date().toISOString();
        }

        await setDoc(tokenRef, tokenData, { merge: true });

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

      // 1. SW Registration 가져오기
      const registration = await this.verifyServiceWorkerRegistration();

      // 2. getToken에 registration 전달 (중요!)
      const token = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration 
      });
      return token;
    } catch (e) {
      console.error("Token retrieval failed:", e);
      alert("푸시 토큰 발급 실패: " + (e.message || e) + "\n\n(Firebase Console에서 웹 푸시 인증서 키를 확인해주세요.)");
      throw e;
    }
  },

  async translateNotices(notices, targetLang) {
    return noticeService.translateNotices(notices, targetLang);
  },

  async getAiUsage() {
    return aiService.getAiUsage();
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
      // 실패 로깅
      await this.logLoginFailure('admin', email, 'N/A', e.message || 'AUTH_ERROR');
      return { success: false, message: '로그인에 실패했습니다.' };
    }
  },

  async logoutAdmin() {
    const { signOut } = await import("firebase/auth");
    return signOut(auth);
  },

  // Sales & Revenue Facade
  addSalesRecord(data) { return paymentService.addSalesRecord(data); },
  deleteSalesRecord(salesId) { return paymentService.deleteSalesRecord(salesId); },
  getSalesHistory(memberId) { return paymentService.getSalesHistory(memberId); },
  getAllSales() { return paymentService.getAllSales(); },
  getSales() { return paymentService.getSales(); },

  deleteAttendance(logId) { return attendanceService.deleteAttendance(logId); },

  addManualAttendance(memberId, date, branchId, className = "수동 확인", instructor = "관리자") {
    return attendanceService.addManualAttendance(memberId, date, branchId, className, instructor);
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

  getAttendanceByMemberId(memberId) { return attendanceService.getAttendanceByMemberId(memberId); },
  getAttendanceByDate(dateStr, branchId = null) { return attendanceService.getAttendanceByDate(dateStr, branchId); },
  subscribeAttendance(dateStr, branchId = null, callback) { return attendanceService.subscribeAttendance(dateStr, branchId, callback); },

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

  clearAllAttendance() { return attendanceService.clearAllAttendance(); },

  getAttendance() { return attendanceService.getAttendance(); },
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
      const q = query(collection(db, 'notices'), orderBy('timestamp', 'desc'));
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
  getMessagesByMemberId(memberId) { return messageService.getMessagesByMemberId(memberId); },

  getPendingApprovals(callback) { return messageService.getPendingApprovals(callback); },
  approvePush(id) { return messageService.approvePush(id); },
  rejectPush(id) { return messageService.rejectPush(id); },

  addMessage(memberId, content, scheduledAt = null, templateId = null) { return messageService.addMessage(memberId, content, scheduledAt, templateId); },
  sendBulkMessages(memberIds, content, scheduledAt = null, templateId = null) { return messageService.sendBulkMessages(memberIds, content, scheduledAt, templateId); },
  getMessages(memberId) { return messageService.getMessages(memberId); },
  sendBulkPushCampaign(targetMemberIds, title, body) { return messageService.sendBulkPushCampaign(targetMemberIds, title, body); },

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

        // 만기일자 계산 (우선순위: 이용기간 > 만기일자 > 판매일자+기간)
        let endDate = '';
        
        // 1. 이용기간에서 종료일 추출 (최우선)
        if (row['이용기간']) {
          endDate = extractEndDateFromPeriod(row['이용기간']);
        }

        // 2. 만기일자 컬럼 확인 (이용기간 없거나 추출 실패 시)
        if (!endDate && row['만기일자']) {
          endDate = row['만기일자'];
        }

        // 3. 상품명에서 기간 추출하여 계산 (마지막 수단)
        if (!endDate && row['판매일자'] && row['마지막 판매']) {
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

  // [NEW] Kiosk Remote Settings
  async getKioskSettings() {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'kiosk'));
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return { active: false, imageUrl: null };
    } catch (e) {
      console.error('[Storage] Get kiosk settings failed:', e);
      return { active: false, imageUrl: null };
    }
  },

  async updateKioskSettings(data) {
    try {
      await setDoc(doc(db, 'settings', 'kiosk'), {
        ...data,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      console.error('[Storage] Update kiosk settings failed:', e);
      throw e;
    }
  },

  subscribeToKioskSettings(callback) {
    try {
      return onSnapshot(doc(db, 'settings', 'kiosk'), (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data());
        } else {
          callback({ active: false, imageUrl: null });
        }
      }, (error) => {
        console.warn('[Storage] Kiosk settings listener error:', error);
      });
    } catch (e) {
      console.error('[Storage] Failed to subscribe to kiosk settings:', e);
      return () => {};
    }
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

