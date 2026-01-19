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

const STORAGE_KEYS = {
  MEMBERS: 'members',
  ATTENDANCE: 'attendance',
  NOTICES: 'notices',
  MESSAGES: 'messages',
  IMAGES: 'images',
  CONFIG: 'config',
  SCHEDULES: 'schedules',
  TOKENS: 'fcm_tokens',
  CALENDAR_MEMOS: 'calendar_memos',
  PUSH_CAMPAIGNS: 'push_campaigns',
  ERROR_LOGS: 'error_logs'
};

import { messaging, getToken, onMessage } from "../firebase";

// Local cache for sync-like access (to avoid rewriting entire UI)
let cachedMembers = [];
let cachedAttendance = [];
let cachedNotices = [];
let cachedMessages = [];
let cachedImages = {};
let cachedDailyClasses = {};
let listeners = [];

const notifyListeners = () => {
  listeners.forEach(callback => callback());
};

export const storageService = {
  async initialize() {
    console.log("Initializing Firebase Storage Service (Secure Mode)...");

    // 0. Anonymous Authentication for security
    try {
      await signInAnonymously(auth);
      console.log("Secure session established (Anonymous Auth).");
    } catch (authError) {
      console.error("Auth failed:", authError);
    }

    // 1. Setup real-time listeners for non-sensitive collections
    // [SECURITY] Members collection full snapshot is REPLACED by on-demand lookup
    // Only if user is Admin (can be checked via local state or role) we might load all.
    // For now, removing global sync to prevent data leakage.

    const safelySubscribe = (queryOrRef, cacheUpdater, name) => {
      try {
        return onSnapshot(queryOrRef, (snapshot) => {
          cacheUpdater(snapshot);
          notifyListeners();
        }, (error) => {
          console.warn(`[Storage] Listener error for ${name}:`, error);
          // Allow the app to proceed even if this listener fails
        });
      } catch (e) {
        console.error(`[Storage] Failed to subscribe to ${name}:`, e);
      }
    };

    safelySubscribe(
      query(collection(db, STORAGE_KEYS.ATTENDANCE), orderBy("timestamp", "desc")),
      (snapshot) => cachedAttendance = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      "Attendance"
    );

    safelySubscribe(
      query(collection(db, STORAGE_KEYS.NOTICES), orderBy("date", "desc")),
      (snapshot) => cachedNotices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      "Notices"
    );

    safelySubscribe(
      collection(db, STORAGE_KEYS.MESSAGES),
      (snapshot) => cachedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      "Messages"
    );

    safelySubscribe(
      collection(db, STORAGE_KEYS.IMAGES),
      (snapshot) => {
        const imgs = {};
        snapshot.docs.forEach(doc => {
          imgs[doc.id] = doc.data().url || doc.data().base64;
        });
        cachedImages = imgs;
      },
      "Images"
    );

    // 2. Data Migration from LocalStorage to Firebase (Once)
    const migrationStatus = this._safeGetItem('firebase_migration_done');
    if (!migrationStatus) {
      await this.migrateFromLocalStorage();
      this._safeSetItem('firebase_migration_done', 'true');
    }
  },

  async migrateFromLocalStorage() {
    console.log("Migrating data from LocalStorage to Firebase...");

    // Migrate Members
    const localMembers = JSON.parse(this._safeGetItem('yoga_app_members') || '[]');
    for (const m of localMembers) {
      const { id, ...data } = m;
      await setDoc(doc(db, STORAGE_KEYS.MEMBERS, id), data);
    }

    // Migrate Attendance
    const localAttendance = JSON.parse(this._safeGetItem('yoga_app_attendance') || '[]');
    for (const a of localAttendance) {
      const { id, ...data } = a;
      await setDoc(doc(db, STORAGE_KEYS.ATTENDANCE, id || Date.now().toString()), data);
    }

    // Migrate Notices
    const localNotices = JSON.parse(this._safeGetItem('yoga_app_notices') || '[]');
    for (const n of localNotices) {
      const { id, ...data } = n;
      await setDoc(doc(db, STORAGE_KEYS.NOTICES, id || Date.now().toString()), data);
    }

    // Migrate Images
    const localImages = JSON.parse(this._safeGetItem('yoga_app_images') || '{}');
    for (const [key, value] of Object.entries(localImages)) {
      await setDoc(doc(db, STORAGE_KEYS.IMAGES, key), { base64: value });
    }

    console.log("Migration finished.");
  },

  // Helper for safe storage access
  _safeGetItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage access denied:", e);
      return null;
    }
  },

  _safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("localStorage write denied:", e);
    }
  },

  getCurrentBranch() {
    return this._safeGetItem('yoga_app_current_branch') || 'all';
  },

  setBranch(branchId) {
    this._safeSetItem('yoga_app_current_branch', branchId);
  },

  getKioskBranch() {
    try {
      const saved = localStorage.getItem('yoga_app_kiosk_branch_v2');
      const isValid = STUDIO_CONFIG.BRANCHES.some(b => b.id === saved);
      return isValid ? saved : STUDIO_CONFIG.BRANCHES[0].id;
    } catch {
      return STUDIO_CONFIG.BRANCHES[0].id;
    }
  },

  setKioskBranch(branchId) {
    try {
      localStorage.setItem('yoga_app_kiosk_branch_v2', branchId);
    } catch (e) {
      console.warn("Kiosk branch save failed:", e);
    }
  },

  getMembers() {
    return cachedMembers;
  },

  async loadAllMembers() {
    try {
      const getAllMembers = httpsCallable(functions, 'getAllMembersAdminV2Call');
      const result = await getAllMembers();
      cachedMembers = result.data.members || [];
      notifyListeners();
      return cachedMembers;
    } catch (e) {
      console.error("Failed to load all members for admin:", e);
      // [FALLBACK] 보안 규칙이 허용하는 경우 직접 조회 시도
      const snapshot = await getDocs(collection(db, STORAGE_KEYS.MEMBERS));
      cachedMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      notifyListeners();
      return cachedMembers;
    }
  },

  async findMemberByPhone(sku) {
    if (cachedMembers.length > 0) return cachedMembers.find(m => m.phoneLast4 === sku);
    const q = query(collection(db, STORAGE_KEYS.MEMBERS), where("phoneLast4", "==", sku));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },

  async findMemberByFullPhone(phone) {
    if (cachedMembers.length > 0) return cachedMembers.find(m => m.phone === phone);
    const q = query(collection(db, STORAGE_KEYS.MEMBERS), where("phone", "==", phone));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },

  async findMembersByPhone(sku) {
    // 1. Check local cache first (if from Admin view)
    if (cachedMembers.length > 0) return cachedMembers.filter(m => m.phoneLast4 === sku);

    // 2. [SECURE] Call Cloud Function for on-demand lookup
    try {
      const getSecureMember = httpsCallable(functions, 'getSecureMemberV2Call');
      const result = await getSecureMember({ phoneLast4: sku });
      return result.data.members || [];
    } catch (e) {
      console.error("Secure search failed, falling back to public query:", e);
      // Fallback for transition period (if allowed by rules)
      const q = query(collection(db, STORAGE_KEYS.MEMBERS), where("phoneLast4", "==", sku), limit(10));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  },

  async findMemberByNameAndPhone(name, phoneLast4) {
    // 1. Check cache with robust matching (phoneLast4 OR phone endsWith)
    if (cachedMembers.length > 0) {
      return cachedMembers.find(m =>
        m.name === name &&
        (m.phoneLast4 === phoneLast4 || (m.phone && m.phone.endsWith(phoneLast4)))
      );
    }

    // 2. Query by Name only to avoid Index issues and handle missing phoneLast4 field
    try {
      const q = query(collection(db, STORAGE_KEYS.MEMBERS), where("name", "==", name));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      // 3. Filter in memory
      // This handles cases where 'phoneLast4' field might be missing in old data
      const match = snapshot.docs.find(doc => {
        const data = doc.data();
        // Check explicit phoneLast4 field OR verify full phone string
        return (data.phoneLast4 === phoneLast4) ||
          (data.phone && typeof data.phone === 'string' && data.phone.endsWith(phoneLast4));
      });

      return match ? { id: match.id, ...match.data() } : null;

    } catch (error) {
      console.error("Error in findMemberByNameAndPhone:", error);
      // Fallback: If name query fails (rare), return null
      return null;
    }
  },

  async loginMember(name, phoneLast4) {
    try {
      // 1. Try to find by name + last 4 digits (primary method)
      let member = await this.findMemberByNameAndPhone(name, phoneLast4);

      if (!member) {
        console.warn(`Login failed for: Name=${name}, PhoneLast4=${phoneLast4}. Member not found in DB.`);
        // Fallback: Check if user entered full phone number by mistake? 
        // Although the UI says "last 4 digits", sometimes users enter full phone.
        // But for now, strict adherence to UI is safer.
        return { success: false, message: '회원 정보를 찾을 수 없습니다. 이름과 휴대폰 번호 뒤 4자리를 확인해주세요.' };
      }

      console.log(`Login Success for: ${member.name}`);
      return { success: true, member };
    } catch (error) {
      console.error("Login error details:", error);
      return { success: false, message: '로그인 처리 중 오류가 발생했습니다: ' + (error.message || error) };
    }
  },

  async getMemberById(id) {
    const cached = cachedMembers.find(m => m.id === id);
    if (cached) return cached;
    const docSnap = await getDoc(doc(db, STORAGE_KEYS.MEMBERS, id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  async addMember(memberData) {
    const newMember = {
      name: memberData.name,
      phone: memberData.phone,
      phoneLast4: memberData.phone.slice(-4),
      subject: memberData.subject || '',
      credits: parseInt(memberData.credits),
      homeBranch: memberData.homeBranch,
      regDate: memberData.regDate || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
      startDate: memberData.startDate || null,
      endDate: memberData.endDate || null,
      amount: memberData.amount || 0
    };
    const docRef = await addDoc(collection(db, STORAGE_KEYS.MEMBERS), newMember);
    return { id: docRef.id, ...newMember };
  },

  async generateMonthlySchedule(branchId, year, month) {
    const templateSlots = [];

    // Use configuration from STUDIO_CONFIG
    let template = STUDIO_CONFIG.DEFAULT_SCHEDULE_TEMPLATE[branchId];

    // Fallback or error if no template found
    if (!template) {
      console.warn(`No schedule template found for branch: ${branchId}`);
      template = [];
      // OR return error: 
      // return { success: false, message: `해당 지점(${branchId})의 스케줄 템플릿이 없습니다.` };
    }

    templateSlots.push(...template);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    let count = 0;
    console.log(`[generateMonthlySchedule] Starting for ${branchId} - ${year}/${month}`);
    const promises = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toLocaleDateString('sv-SE');
      const dayName = dayNames[d.getDay()];

      const dailyClasses = templateSlots
        .filter(slot => slot.days.includes(dayName))
        .map(slot => ({
          time: slot.startTime,
          title: slot.className,
          instructor: slot.instructor || '',
          status: 'normal',
          duration: slot.className.includes('인텐시브') || slot.className === '마이솔' ? 90 : 60
        }))
        .sort((a, b) => a.time.localeCompare(b.time));

      if (dailyClasses.length > 0) {
        const docRef = doc(db, 'daily_classes', `${branchId}_${dateStr}`);
        promises.push(setDoc(docRef, {
          branchId,
          date: dateStr,
          classes: dailyClasses
        }).catch(err => {
          console.error(`Failed to write for ${dateStr}:`, err);
          throw err;
        }));
        count++;
      }
    }
    console.log(`[generateMonthlySchedule] Waiting for ${promises.length} writes...`);
    await Promise.all(promises);
    console.log(`[generateMonthlySchedule] Finished successfully.`);
    return { success: true, message: `${count}일치 스케줄이 이미지 시간표 기반으로 생성되었습니다.` };
  },

  async updateMemberCredits(memberId, amount) {
    const member = cachedMembers.find(m => m.id === memberId);
    if (member) {
      const newCredits = member.credits + amount;
      await updateDoc(doc(db, STORAGE_KEYS.MEMBERS, memberId), { credits: newCredits });
      member.credits = newCredits;
      return { ...member };
    }
    return null;
  },

  async updateMember(memberId, updateData) {
    const data = { ...updateData };
    if (updateData.phone) {
      data.phoneLast4 = updateData.phone.slice(-4);
    }
    await updateDoc(doc(db, STORAGE_KEYS.MEMBERS, memberId), data);
    const idx = cachedMembers.findIndex(m => m.id === memberId);
    if (idx !== -1) {
      cachedMembers[idx] = { ...cachedMembers[idx], ...data };
    }
    return true;
  },

  async extendMember(memberId, days) {
    const member = cachedMembers.find(m => m.id === memberId);
    if (!member) return { success: false, message: '회원을 찾을 수 없습니다.' };
    if (!member.endDate) return { success: false, message: '마감일이 설정되지 않은 회원입니다.' };

    const currentEndDate = new Date(member.endDate);
    currentEndDate.setDate(currentEndDate.getDate() + parseInt(days));
    const newDate = currentEndDate.toISOString().split('T')[0];

    await updateDoc(doc(db, STORAGE_KEYS.MEMBERS, memberId), { endDate: newDate });
    member.endDate = newDate;
    return { success: true, message: '연장되었습니다.', newDate };
  },

  async checkInById(memberId, branchId) {
    try {
      // 1. [SECURE] Call Cloud Function for atomic transaction
      const checkInMember = httpsCallable(functions, 'checkInMemberV2Call');

      // 현재 수업 정보 조회 (클라이언트 사이드에서 먼저 조회하여 전달)
      const currentClassInfo = await this.getCurrentClass(branchId);
      const classTitle = currentClassInfo?.title || '자율수련';

      const response = await checkInMember({
        memberId,
        branchId,
        classTitle
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Check-in failed');
      }

      const { memberName, newCredits } = response.data;

      // 3. Smart Diligence Analysis (Gamification)
      const newAttendanceLog = {
        memberId,
        branchId,
        classTitle,
        timestamp: new Date() // Use current time for the new log
      };

      // Calculate classic streak
      const streak = this._calculateStreak(memberId, branchId, [...cachedAttendance, newAttendanceLog]);

      // Calculate Smart Diligence Status
      let diligence = null;
      try {
        // Dynamic import to avoid circular dependency if any (though utils should be fine)
        const { analyzeDiligence } = await import('../utils/diligence');

        // We need the full member object. 
        // If cachedMembers[idx] was just updated, let's use that, or the fetched member.
        const memberObj = cachedMembers.find(m => m.id === memberId) || { id: memberId, name: memberName, credits: newCredits }; // fallback

        // Ensure credits are up to date for analysis (important for Count-based logic)
        const updatedMemberObj = { ...memberObj, credits: newCredits };

        diligence = analyzeDiligence(updatedMemberObj, [...cachedAttendance, newAttendanceLog]);
      } catch (err) {
        console.warn("Diligence analysis failed:", err);
      }

      // Update local member cache
      const idx = cachedMembers.findIndex(m => m.id === memberId);
      if (idx !== -1) {
        cachedMembers[idx].credits = newCredits;
        cachedMembers[idx].streak = streak; // Keep classic streak for fallback
        cachedMembers[idx].diligence = diligence;
        notifyListeners();
      }

      return {
        success: true,
        message: classTitle ? `[${classTitle}] 수업 출석되었습니다!` : '출석되었습니다!',
        member: {
          id: memberId,
          name: memberName,
          credits: newCredits,
          endDate: response.data.endDate || (cachedMembers.find(m => m.id === memberId)?.endDate),
          streak: streak,
          diligence: diligence // Return the full analysis object
        },
        className: classTitle,
        attendanceCount: 0,
        aiMessage: null
      };
    } catch (error) {
      console.error("[checkInById] SECURE ERROR:", error);
      return { success: false, message: `오류가 발생했습니다: ${error.message}` };
    }
  },

  _calculateStreak(memberId, _branchId, providedLogs = null) {
    // Get member's attendance history
    let logsToUse = providedLogs || cachedAttendance;

    // If using global cache, filter by memberId
    if (!providedLogs) {
      logsToUse = logsToUse.filter(a => a.memberId === memberId);
    }

    const history = logsToUse
      .map(a => {
        // Handle both Firestore Timestamp and ISO string
        const date = a.timestamp ? new Date(a.timestamp.seconds * 1000 || a.timestamp) : new Date();
        return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
      })
      .sort()
      .reverse();

    // Add 'Today' because we just succeeded but cache might not update instantly via snapshot
    const today = new Date().toLocaleDateString('en-CA');
    const uniqueDays = [...new Set([today, ...history])]; // Deduplicate
    uniqueDays.sort().reverse(); // Validated desc order: Today, Yesterday, ...

    // Check if the first date is today
    if (uniqueDays[0] !== today) {
      // Simpler Logic: 
      // uniqueDays[0] is Today. uniqueDays[1] should be Yesterday.
      let currentStreak = 1; // Start with today
      let checkDate = new Date(today);

      for (let i = 1; i < uniqueDays.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1); // Subtract 1 day
        const expectedStr = checkDate.toLocaleDateString('en-CA');

        if (uniqueDays[i] === expectedStr) {
          currentStreak++;
        } else {
          break; // Sequence broken
        }
      }

      return currentStreak;
    }
  },

  getMemberStreak(memberId, logs = null) {
    return this._calculateStreak(memberId, null, logs);
  },

  async getMemberDiligence(memberId) {
    const member = await this.getMemberById(memberId);
    if (!member) return null;
    const history = await this.getAttendanceByMemberId(memberId);
    const { analyzeDiligence } = await import('../utils/diligence');
    return analyzeDiligence(member, history);
  },

  async getSchedules() {
    const snapshot = await getDocs(collection(db, STORAGE_KEYS.SCHEDULES));
    const schedules = {};
    snapshot.docs.forEach(doc => {
      schedules[doc.id] = doc.data().slots;
    });
    return schedules;
  },

  async updateSchedule(branchId, slots) {
    await setDoc(doc(db, STORAGE_KEYS.SCHEDULES, branchId), { slots });
    return true;
  },

  /**
   * Get current class for a branch based on today's schedule
   * Uses daily_classes collection (modern approach)
   * @param {string} branchId - Branch ID
   * @returns {Object|null} { title, instructor } or null
   */
  async getCurrentClass(branchId) {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = `${branchId}_${today}`;

    // Check cache first
    if (!cachedDailyClasses[cacheKey]) {
      const docRef = doc(db, 'daily_classes', cacheKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        cachedDailyClasses[cacheKey] = docSnap.data().classes;
      } else {
        cachedDailyClasses[cacheKey] = [];
      }
    }

    const classes = cachedDailyClasses[cacheKey] || [];
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const cls of classes) {
      if (cls.status === 'cancelled') continue;

      const [startHour, startMin] = cls.time.split(':').map(Number);
      const startTimeInMins = startHour * 60 + startMin;
      const duration = cls.duration || 60;

      // Check if current time is within 20 minutes before start and during class
      if (currentTime >= startTimeInMins - 20 && currentTime < startTimeInMins + duration) {
        return { title: cls.title, instructor: cls.instructor };
      }
    }
    return null;
  },

  async checkIn(phoneLast4, branchId) {
    const members = await this.findMembersByPhone(phoneLast4);
    if (members.length === 0) {
      return { success: false, message: '회원 정보를 찾을 수 없습니다.' };
    }
    if (members.length > 1) {
      return { success: true, needsSelection: true, members };
    }
    return this.checkInById(members[0].id, branchId);
  },

  getAttendance() {
    return cachedAttendance;
  },

  async getAttendanceByMemberId(memberId) {
    if (cachedAttendance.length > 0) {
      return cachedAttendance.filter(log => log.memberId === memberId);
    }
    const q = query(collection(db, STORAGE_KEYS.ATTENDANCE), where('memberId', '==', memberId), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async addMessage(memberId, content) {
    const newMessage = {
      memberId,
      content,
      timestamp: new Date().toISOString(),
      read: false
    };
    const docRef = await addDoc(collection(db, STORAGE_KEYS.MESSAGES), newMessage);
    const result = { id: docRef.id, ...newMessage };
    cachedMessages = [result, ...cachedMessages];
    return result;
  },

  getMessages(memberId = null) {
    if (memberId) {
      return cachedMessages.filter(m => m.memberId === memberId).reverse();
    }
    return cachedMessages;
  },

  async addNotice(title, content, image = null) {
    const newNotice = {
      title,
      content,
      image,
      date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
      timestamp: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, STORAGE_KEYS.NOTICES), newNotice);
    return { id: docRef.id, ...newNotice };
  },

  async deleteNotice(id) {
    await deleteDoc(doc(db, STORAGE_KEYS.NOTICES, id));
    return true;
  },

  getNotices() {
    return [...cachedNotices].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  },

  getPushHistory() {
    const history = [
      ...cachedMessages.map(m => ({ ...m, type: 'individual' })),
      ...cachedNotices.map(n => ({ ...n, type: 'notice' }))
    ];
    return history.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  },

  async getAIExperience(memberName, attendanceCount, day, hour, upcomingClass = null, weather = null, credits = null, remainingDays = null, language = 'ko', diligence = null) {
    try {
      // Use Client-Side AI Service
      // Dynamic import to avoid top-level issues
      const { generateClientSideAIExperience } = await import('./aiService');

      console.log(`[storage.js] clientAI: member=${memberName}, badge=${diligence?.badge?.label}`);

      let resultData = await generateClientSideAIExperience({
        memberName,
        attendanceCount,
        dayOfWeek: day,
        timeOfDay: hour,
        upcomingClass: upcomingClass,
        weather: weather,
        credits: credits,
        remainingDays: remainingDays,
        language: language,
        diligence: diligence,
        role: memberName && !["방문 회원", "방문회원", "visitor", "Guest"].includes(memberName) ? 'member' : 'visitor',
        type: 'experience'
      });

      return resultData;
    } catch (err) {
      console.error(`DEBUG: storageService.getAIExperience CRITICAL ERROR: lang=${language}`, err);
      // Fallback is purely for network/API errors; in normal operation, "real" AI should be used.
      const isGeneric = !memberName || memberName === "방문 회원" || memberName === "방문회원" || memberName === "visitor";

      // Simple Dictionary for Fallbacks
      const fallbackDict = {
        ko: {
          calm: ["오늘, 오직 나만을 위한 소중한 시간을 가져보세요. ✨", "매트 위에서 호흡하세요. 🌿", "자신을 돌보는 시간이 되기를 바랍니다. 🕊️"],
          energetic: ["오늘도 매트 위에 서신 당신을 응원합니다! 화이팅! 💪", "땀 흘린 만큼 개운해질 거예요! 🔥", "꾸준함이 나를 만듭니다. 힘내세요! ✨"]
        },
        en: {
          calm: ["Take a precious moment just for yourself. ✨", "Breathe on the mat. 🌿", "Hope this is a time to care for yourself. 🕊️"],
          energetic: ["Rooting for you on the mat today! Fighting! 💪", "Feel refreshed after sweating! 🔥", "Consistency builds you. Keep going! ✨"]
        },
        ru: {
          calm: ["Уделите драгоценный момент только для себя. ✨", "Дышите на коврике. 🌿", "Надеюсь, это время для заботы о себе. 🕊️"],
          energetic: ["Болеем за вас сегодня! Вперед! 💪", "Почувствуйте свежесть после тренировки! 🔥", "Постоянство создает вас. Так держать! ✨"]
        },
        zh: {
          calm: ["给自己留一段珍贵的时光。✨", "在垫子上呼吸。🌿", "希望能成为照顾自己的时间。🕊️"],
          energetic: ["为您今天的练习加油！加油！💪", "流汗后会更清爽！🔥", "坚持成就更好的自己。加油！✨"]
        },
        ja: {
          calm: ["自分だけの大切な時間を持ってください。✨", "マットの上で呼吸しましょう。🌿", "自分をいたわる時間になりますように。🕊️"],
          energetic: ["今日もマットの上に立つあなたを応援します！ファイト！💪", "汗を流した分、すっきりしますよ！🔥", "継続が私を作ります。頑張ってください！✨"]
        }
      };

      const langKey = fallbackDict[language] ? language : 'ko';

      let fallbackMsg = "";

      if (isGeneric) {
        // [Visitor] Calm Fallbacks
        const msgs = fallbackDict[langKey].calm;
        fallbackMsg = msgs[Math.floor(Math.random() * msgs.length)];
      } else {
        // [Member] Energetic Fallbacks
        const msgs = fallbackDict[langKey].energetic;
        const displayName = `${memberName}, `;
        fallbackMsg = `${displayName}${msgs[Math.floor(Math.random() * msgs.length)]}`;
      }
      return {
        message: fallbackMsg,
        bgTheme: hour < 10 ? 'dawn' : (hour < 18 ? 'sunny' : 'night'),
        colorTone: '#FDFCF0',
        isFallback: true
      };
    }
  },



  async getAIAnalysis(memberName, attendanceCount, logs, timeOfDay, language = 'ko', requestRole = 'member', statsData = null) {
    this._lastAnalysisLang = language;
    try {
      // Use Client-Side AI for Analysis too
      const { generateClientSideAIExperience } = await import('./aiService');
      const result = await generateClientSideAIExperience({
        memberName,
        attendanceCount,
        logs: logs.slice(0, 5), // Reduce logs for client side
        type: 'analysis',
        timeOfDay,
        language,
        role: requestRole,
        statsData,
        diligence: null // Analysis doesn't need diligence object itself, it CREATES analysis
      });
      return result;
    } catch (error) {
      console.warn("AI Analysis failed (Client Side):", error);
      return null;
    }
  },

  _calculateStatsInternal(logs) {
    if (!logs || logs.length === 0) return null;
    const dayCount = {};
    const hourCount = {};
    const days = ['일', '월', '화', '수', '목', '금', '토'];

    logs.forEach(log => {
      const d = new Date(log.timestamp);
      const day = days[d.getDay()];
      const hour = d.getHours();
      dayCount[day] = (dayCount[day] || 0) + 1;
      hourCount[hour] = (hourCount[hour] || 0) + 1;
    });

    const topDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]?.[0];

    return { topDay, topHour };
  },

  getImages() {
    return cachedImages;
  },

  async updateImage(key, base64) {
    await setDoc(doc(db, STORAGE_KEYS.IMAGES, key), { base64 });
    cachedImages[key] = base64;
    notifyListeners();
  },

  async requestPushPermission(memberId = null) {
    try {
      if (!('Notification' in window)) {
        console.log('This browser does not support notifications.');
        return 'not_supported';
      }

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        try {
          const { VAPID_KEY, messaging } = await import("../firebase");

          if (!VAPID_KEY || VAPID_KEY.startsWith("PLEASE_REPLACE")) {
            console.warn("VAPID Key is missing!");
            return 'permission_only';
          }

          const token = await getToken(messaging, {
            vapidKey: VAPID_KEY
          });

          if (token) {
            const tokenRef = doc(db, STORAGE_KEYS.TOKENS, token);
            await setDoc(tokenRef, {
              createdAt: new Date().toISOString(),
              deviceId: navigator.userAgent,
              memberId: memberId,
              type: memberId ? 'member' : 'admin',
              lastUpdated: new Date().toISOString()
            });
            return 'granted';
          }
        } catch (tokenErr) {
          console.error('Token acquisition failed:', tokenErr);
          return 'permission_only';
        }
      }
      return permission;
    } catch (error) {
      console.error('Push registration process failed:', error);
      return 'error';
    }
  },

  async deletePushToken() {
    try {
      const { messaging } = await import("../firebase");
      const token = await getToken(messaging);
      if (token) {
        await deleteDoc(doc(db, STORAGE_KEYS.TOKENS, token));
        return true;
      }
    } catch (e) {
      console.error("Failed to delete push token", e);
    }
    return false;
  },

  subscribeToForegroundMessages(callback) {
    return onMessage(messaging, (payload) => {
      callback(payload);
    });
  },

  async getAllPushTokens() {
    const querySnapshot = await getDocs(collection(db, STORAGE_KEYS.TOKENS));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  subscribe(callback) {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  },

  async getMonthlyClasses(branchId, year, month) {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month).padStart(2, '0')}-31`;

    const q = query(
      collection(db, 'daily_classes'),
      where('branchId', '==', branchId),
      where('date', '>=', startStr),
      where('date', '<=', endStr)
    );
    const snapshot = await getDocs(q);
    const result = {};
    snapshot.docs.forEach(d => {
      result[d.data().date] = d.data().classes;
    });
    return result;
  },

  async updateDailyClasses(branchId, date, classes) {
    await setDoc(doc(db, 'daily_classes', `${branchId}_${date}`), {
      branchId,
      date,
      classes
    });
    return true;
  },

  async batchUpdateDailyClasses(branchId, updates) {
    // updates is an array of { date, classes }
    for (const update of updates) {
      await setDoc(doc(db, 'daily_classes', `${branchId}_${update.date}`), {
        branchId,
        date: update.date,
        classes: update.classes
      });
    }
    return true;
  },


  async getInstructors() {
    const defaults = ['원장', '미선', '소영', '한아', '정연', '효원', '희정', '보윤', '은혜', '혜실', '세연', 'anu', '희연', '송미', '성희', '다나', '리안'];
    try {
      const docRef = doc(db, 'settings', 'instructors');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const list = docSnap.data().list || [];
        return list.length > 0 ? list : defaults;
      }
    } catch (e) {
      console.error("Error fetching instructors:", e);
    }
    return defaults;
  },

  async updateInstructors(instructors) {
    await setDoc(doc(db, 'settings', 'instructors'), { list: instructors });
    return true;
  },

  async getClassTypes() {
    const defaults = ['하타', '아쉬탕가', '하타+인', '마이솔', '하타 인텐시브', '인요가', '빈야사', '힐링', '플라잉', '임신부요가', '키즈플라잉', '인양요가', '로우플라잉', '하타인텐시브'];
    try {
      const docRef = doc(db, 'settings', 'classTypes');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const list = docSnap.data().list || [];
        return list.length > 0 ? list : defaults;
      }
    } catch (e) {
      console.error("Error fetching class types:", e);
    }
    return defaults;
  },

  async updateClassTypes(classTypes) {
    await setDoc(doc(db, 'settings', 'classTypes'), { list: classTypes });
    return true;
  },

  async getClassLevels() {
    const defaults = ['0', '0.5', '1', '1.5', '2', '3'];
    try {
      const docRef = doc(db, 'settings', 'classLevels');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const list = docSnap.data().list || [];
        return list.length > 0 ? list : defaults;
      }
    } catch (e) {
      console.error("Error fetching class levels:", e);
    }
    return defaults;
  },

  async updateClassLevels(classLevels) {
    await setDoc(doc(db, 'settings', 'classLevels'), { list: classLevels });
    return true;
  },

  async sendBulkPushCampaign(targetMemberIds, title, body) {
    if (!targetMemberIds || targetMemberIds.length === 0) return;

    await addDoc(collection(db, 'push_campaigns'), {
      targetMemberIds,
      title,
      body,
      createdAt: new Date().toISOString(),
      status: 'pending'
    });
  },

  async sendBulkSMS(targetMemberIds, content) {
    if (!targetMemberIds || targetMemberIds.length === 0) return;

    console.log(`[Mock SMS] Sending to ${targetMemberIds.length} members: ${content}`);
    // In a real app, you would add a document to a 'sms_queue' collection 
    // which a Cloud Function would pick up and send via Twilio/Coolsms.
    await addDoc(collection(db, 'sms_queue'), {
      targetMemberIds,
      content,
      createdAt: new Date().toISOString(),
      status: 'pending'
    });
    return true;
  },

  async getPricing() {
    try {
      const docRef = doc(db, 'settings', 'pricing');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().data;
      }
      // Fallback to STUDIO_CONFIG if not found in DB (Migration logic)
      return STUDIO_CONFIG.PRICING;
    } catch (e) {
      console.error("Error fetching pricing:", e);
      return STUDIO_CONFIG.PRICING;
    }
  },

  async savePricing(pricingData) {
    try {
      await setDoc(doc(db, 'settings', 'pricing'), {
        data: pricingData,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.error("Error saving pricing:", e);
      return false;
    }
  },

  // --- Auth Methods ---
  async loginAdmin(email, password) {
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const { auth } = await import("../firebase");
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      let message = "로그인에 실패했습니다.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = "이메일 또는 비밀번호가 올바르지 않습니다.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.";
      }
      return { success: false, message };
    }
  },

  async logoutAdmin() {
    try {
      const { signOut } = await import("firebase/auth");
      const { auth } = await import("../firebase");
      await signOut(auth);
      return true;
    } catch (error) {
      console.error("Logout failed:", error);
      return false;
    }
  },

  onAuthStateChanged(callback) {
    import("../firebase").then(({ auth }) => {
      import("firebase/auth").then(({ onAuthStateChanged }) => {
        onAuthStateChanged(auth, callback);
      });
    });
  },

  async translateNotices(notices, language) {
    if (!notices || notices.length === 0 || language === 'ko') return notices;

    // Simple memory cache to avoid redundant API calls
    const cacheKey = `notices_${language}_${notices.map(n => n.id).join('_')}`;
    if (this._noticeCache && this._noticeCache[cacheKey]) {
      return this._noticeCache[cacheKey];
    }

    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const { app } = await import('../firebase');
      const functions = getFunctions(app, 'asia-northeast3');
      const translateNoticesV2 = httpsCallable(functions, 'translateNoticesV2');
      const result = await translateNoticesV2({ notices, language });

      this._noticeCache = this._noticeCache || {};
      this._noticeCache[cacheKey] = result.data;

      return result.data;
    } catch (error) {
      console.warn("Notice translation failed:", error);
      return notices;
    }
  },

  async logError(error, context = {}) {
    try {
      console.error("Logging error to system:", error);

      const errorData = {
        message: error.message || String(error),
        stack: error.stack || null,
        context: context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        userId: auth.currentUser ? auth.currentUser.uid : 'anonymous'
      };

      await addDoc(collection(db, STORAGE_KEYS.ERROR_LOGS), errorData);
    } catch (logErr) {
      console.error("Failed to write to error_logs:", logErr);
    }
  }
};

