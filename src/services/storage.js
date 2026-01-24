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

  async getMonthlyClasses(branchId, year, month) {
    if (!branchId) return {};

    // [LEGACY SUPPORT]
    // We do NOT check for metadata existence here anymore.
    // We just try to fetch daily classes. If they exist, we return them.
    // This allows January (legacy) data to be shown even if 'monthly_schedules' doc is missing.

    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month).padStart(2, '0')}-31`;

    const q = query(
      collection(db, 'daily_classes'),
      where('branchId', '==', branchId),
      where('date', '>=', startStr),
      where('date', '<=', endStr)
    );

    try {
      const snapshot = await getDocs(q);
      const monthlyData = {};
      snapshot.docs.forEach(doc => {
        monthlyData[doc.data().date] = doc.data().classes;
      });
      return monthlyData;
    } catch (e) {
      console.warn("Failed to fetch monthly classes:", e);
      return {};
    }
  },

  async getMonthlyScheduleStatus(branchId, year, month) {
    try {
      const metaDocId = `${branchId}_${year}_${month}`;
      const metaRef = doc(db, 'monthly_schedules', metaDocId);
      const metaSnap = await getDoc(metaRef);

      if (metaSnap.exists()) {
        return { exists: true, isSaved: metaSnap.data().isSaved };
      }

      // [FALLBACK] Check if 'daily_classes' exist for a sample day (e.g. 1st day)
      // This supports legacy data created before metadata feature
      // Try checking the 1st day of the month
      const sampleDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const dailyRef = doc(db, 'daily_classes', `${branchId}_${sampleDate}`);
      const dailySnap = await getDoc(dailyRef);

      if (dailySnap.exists()) {
        return { exists: true, isSaved: true, isLegacy: true };
      }

      // Try checking a few more days just in case 1st is empty/holiday
      // Or better, simple query? (Query might be expensive if no index, but exact match on ID prefix not possible easily)
      // Let's check 2nd and 3rd too.
      for (let d = 2; d <= 5; d++) {
        const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dRef = doc(db, 'daily_classes', `${branchId}_${dStr}`);
        const dSnap = await getDoc(dRef);
        if (dSnap.exists()) return { exists: true, isSaved: true, isLegacy: true };
      }

      return { exists: false, isSaved: false };
    } catch (e) {
      console.warn("Status check failed:", e);
      return { exists: false, isSaved: false };
    }
  },

  async updateDailyClasses(branchId, date, classes) {
    try {
      const docRef = doc(db, 'daily_classes', `${branchId}_${date}`);
      await setDoc(docRef, {
        branchId,
        date,
        classes,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (e) {
      console.error("Update daily classes failed:", e);
      throw e;
    }
  },

  async batchUpdateDailyClasses(branchId, updates) {
    try {
      const batch = await import("firebase/firestore").then(mod => mod.writeBatch(db));
      updates.forEach(update => {
        const docRef = doc(db, 'daily_classes', `${branchId}_${update.date}`);
        batch.set(docRef, {
          branchId,
          date: update.date,
          classes: update.classes,
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
      return { success: true };
    } catch (e) {
      console.error("Batch update failed:", e);
      throw e;
    }
  },

  // [NEW] Smart Creation Logic
  async createMonthlySchedule(branchId, year, month) {
    console.log(`[Schedule] Creating for ${branchId} ${year}-${month}`);
    try {
      // 1. Fetch Weekly Template (Blueprint) from Firestore
      // ... (existing logic)
      const templateRef = doc(db, 'weekly_templates', branchId);
      const templateSnap = await getDoc(templateRef);

      let template = [];
      if (templateSnap.exists()) {
        template = templateSnap.data().classes || [];
      } else {
        console.warn("Weekly template not found in Firestore, using config fallback.");
        template = STUDIO_CONFIG.DEFAULT_SCHEDULE_TEMPLATE[branchId] || [];
      }
      return this._generateScheduleFromTemplate(branchId, year, month, template);
    } catch (e) {
      console.error("Create monthly schedule failed:", e);
      throw e;
    }
  },

  async copyMonthlySchedule(branchId, fromYear, fromMonth, toYear, toMonth) {
    try {
      console.log(`Copying schedule from ${fromYear}-${fromMonth} to ${toYear}-${toMonth}`);

      // Helper to get day name
      const getDayName = (date) => ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

      // 1. Scan Source Month Data
      // We need to fetch ALL classes from the source month to analyze patterns.
      const sourceDays = [];
      const daysInSourceMonth = new Date(fromYear, fromMonth, 0).getDate();

      // Fetch all potential days in parallel (batching might be needed if month is huge, but 31 days is fine)
      const fetchPromises = [];
      for (let d = 1; d <= daysInSourceMonth; d++) {
        const dStr = `${fromYear}-${String(fromMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        fetchPromises.push(getDoc(doc(db, 'daily_classes', `${branchId}_${dStr}`)).then(snap => ({ day: d, date: new Date(fromYear, fromMonth - 1, d), exists: snap.exists(), data: snap.data() })));
      }

      const results = await Promise.all(fetchPromises);
      const validDays = results.filter(r => r.exists && r.data.classes && r.data.classes.length > 0);

      if (validDays.length === 0) {
        throw new Error("지난 달 데이터가 전혀 없어 복사할 수 없습니다. 먼저 지난 달 스케줄을 확인해주세요.");
      }

      // 2. Extract "Best Template" for Weekdays (Mon-Fri)
      // Strategy: Group by Week #, score by number of classes. Pick the week with max classes.
      const weeks = {};
      validDays.forEach(r => {
        const dayIdx = r.date.getDay();
        if (dayIdx === 0 || dayIdx === 6) return; // Skip weekends for template

        // Calculate approximate week number (1-5)
        const weekNum = Math.ceil(r.day / 7);
        if (!weeks[weekNum]) weeks[weekNum] = [];
        weeks[weekNum].push(r);
      });

      // Find the week with the most 'full' days (max logic)
      let bestWeekNum = null;
      let maxScore = -1;

      Object.entries(weeks).forEach(([weekNum, days]) => {
        // Score = number of classes in that week
        const score = days.reduce((acc, curr) => acc + (curr.data.classes.length || 0), 0);
        if (score > maxScore) {
          maxScore = score;
          bestWeekNum = weekNum;
        }
      });

      // Valid weekday template map: "월" -> [Classes], "화" -> [Classes]...
      const weekdayTemplate = {};
      if (bestWeekNum && weeks[bestWeekNum]) {
        weeks[bestWeekNum].forEach(r => {
          weekdayTemplate[getDayName(r.date)] = r.data.classes;
        });
      } else {
        // Fallback: If no good week found, just try to collect *any* weekday data
        validDays.forEach(r => {
          const name = getDayName(r.date);
          if (name !== '토' && name !== '일' && !weekdayTemplate[name]) {
            weekdayTemplate[name] = r.data.classes;
          }
        });
      }

      // 3. Collect Saturdays (Sequential)
      const sourceSaturdays = validDays
        .filter(r => r.date.getDay() === 6)
        .sort((a, b) => a.day - b.day)
        .map(r => r.data.classes);

      // 4. Generate Target Month
      const updates = [];
      const daysInTargetMonth = new Date(toYear, toMonth, 0).getDate();
      let saturdayIndex = 0;

      for (let d = 1; d <= daysInTargetMonth; d++) {
        const targetDate = new Date(toYear, toMonth - 1, d);
        const dayName = getDayName(targetDate);
        const dateStr = `${toYear}-${String(toMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        let classesToCopy = [];

        if (dayName === '토') {
          // Rotation Logic: 1st -> 1st, 2nd -> 2nd... loop if needed
          if (sourceSaturdays.length > 0) {
            classesToCopy = sourceSaturdays[saturdayIndex % sourceSaturdays.length];
            saturdayIndex++;
          }
        } else if (dayName === '일') {
          // Treat Sunday like weekdays (Template) or skip if not in template
          classesToCopy = weekdayTemplate['일'] || [];
        } else {
          // Weekdays (Mon-Fri) -> Use Best Template
          classesToCopy = weekdayTemplate[dayName] || [];
        }

        // Clean up classes
        if (classesToCopy && classesToCopy.length > 0) {
          const cleanedClasses = classesToCopy.map(cls => ({
            time: cls.time,
            title: cls.title,
            instructor: cls.instructor,
            status: 'normal',
            level: cls.level || '',
            duration: cls.duration || 60
          }));
          updates.push({ date: dateStr, classes: cleanedClasses });
        }
      }

      if (updates.length > 0) {
        await this.batchUpdateDailyClasses(branchId, updates);

        // Save Metadata
        const metaDocId = `${branchId}_${toYear}_${toMonth}`;
        await setDoc(doc(db, 'monthly_schedules', metaDocId), {
          branchId, year: toYear, month: toMonth, isSaved: true, createdAt: new Date().toISOString(), createdBy: auth.currentUser?.email || 'admin'
        });

        return { success: true, message: `지난달 데이터를 기반으로 새 스케줄이 생성되었습니다.\n(평일: ${bestWeekNum || 1}주차 패턴, 토요일: 순차 적용)` };
      }

      return { success: false, message: "복사할 데이터가 없습니다." };

    } catch (e) {
      console.error("Copy schedule failed:", e);
      throw e;
    }
  },

  async deleteMonthlySchedule(branchId, year, month) {
    try {
      console.log(`Deleting schedule for ${branchId} ${year}-${month}`);

      // 1. Find all daily classes for this month
      const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const endStr = `${year}-${String(month).padStart(2, '0')}-31`;

      const q = query(
        collection(db, 'daily_classes'),
        where('branchId', '==', branchId),
        where('date', '>=', startStr),
        where('date', '<=', endStr)
      );

      const snapshot = await getDocs(q);

      // 2. Batch Delete
      const batch = await import("firebase/firestore").then(mod => mod.writeBatch(db));
      let count = 0;

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });

      // 3. Delete Metadata
      const metaDocId = `${branchId}_${year}_${month}`;
      batch.delete(doc(db, 'monthly_schedules', metaDocId));

      // 4. Delete Image (if exists)
      // Since we don't know the exact image key without checking, we could guess key format.
      // But updateImage will overwrite anyway. Let's just focus on data reset.
      // Optionally could reset image but might be unsafe if user wants to keep image.
      // User request is "Init Schedule", usually means data.

      if (count > 0 || snapshot.empty) await batch.commit();

      return { success: true, count };
    } catch (e) {
      console.error("Delete schedule failed:", e);
      throw e;
    }
  },

  subscribe(callback) {
    listeners.push(callback);
    return () => { listeners = listeners.filter(l => l !== callback); };
  },


  getNotices() { return [...cachedNotices].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)); },
  getAttendance() { return [...cachedAttendance].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)); },
  getPushHistory() { return [...cachedMessages].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)); },
  getMembers() { return [...cachedMembers]; }, // [OPTIMIZATION] Sync getter
  getAllPushTokens() { return []; /* Placeholder if needed, or implement fetching fcm_tokens */ },

  async getPricing() {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'pricing'));
      if (docSnap.exists()) return docSnap.data().config;
      return STUDIO_CONFIG.PRICING;
    } catch (e) {
      console.warn("Failed to load pricing:", e);
      return STUDIO_CONFIG.PRICING;
    }
  },

  async savePricing(newPricing) {
    try {
      await setDoc(doc(db, 'settings', 'pricing'), { config: newPricing, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (e) {
      console.error("Failed to save pricing:", e);
      return false;
    }
  },

  async getInstructors() {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'instructors'));
      if (docSnap.exists() && docSnap.data().list) return docSnap.data().list;

      // Fallback: Extract from DEFAULT_SCHEDULE_TEMPLATE
      const instructors = new Set();
      Object.values(STUDIO_CONFIG.DEFAULT_SCHEDULE_TEMPLATE).forEach(schedule => {
        schedule.forEach(cls => {
          if (cls.instructor) instructors.add(cls.instructor);
        });
      });
      return Array.from(instructors).sort();
    } catch (e) {
      console.warn("Failed to load instructors:", e);
      return ['원장', '한아', '정연', '미선', '희정', '보윤', '소영', '은혜', '혜실', '세연', 'anu', '송미', '다나', '리안', '성희', '효원', '희연'];
    }
  },

  async getClassTypes() {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'classTypes'));
      if (docSnap.exists() && docSnap.data().list) return docSnap.data().list;

      // Fallback
      const types = new Set();
      Object.values(STUDIO_CONFIG.DEFAULT_SCHEDULE_TEMPLATE).forEach(schedule => {
        schedule.forEach(cls => {
          if (cls.className) types.add(cls.className);
        });
      });
      return Array.from(types).sort();
    } catch (e) {
      console.warn("Failed to load class types:", e);
      return ['하타', '마이솔', '아쉬탕가', '인요가', '하타+인', '하타인텐시브', '임신부요가', '플라잉', '키즈플라잉', '빈야사', '인양요가', '힐링', '로우플라잉'];
    }
  },

  async getClassLevels() {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'classLevels'));
      if (docSnap.exists() && docSnap.data().list) return docSnap.data().list;
      return ['0.5', '1', '1.5', '2'];
    } catch {
      return ['0.5', '1', '1.5', '2'];
    }
  },
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
    return stored || 'mapo'; // Default to mapo
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
  }
};

