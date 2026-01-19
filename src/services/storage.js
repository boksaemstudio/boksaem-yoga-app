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
import { messaging, getToken, onMessage } from "../firebase";

// Local cache for sync-like access
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
  async initialize({ mode = 'full' } = {}) {
    console.log(`Initializing Firebase Storage Service (Mode: ${mode})...`);
    try {
      await signInAnonymously(auth);
      console.log("Secure session established (Anonymous Auth).");
    } catch (authError) {
      console.error("Auth failed:", authError);
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
        const imgs = {};
        snapshot.docs.forEach(doc => {
          imgs[doc.id] = doc.data().url || doc.data().base64;
        });
        cachedImages = imgs;
      },
      "Images"
    );
  },

  _safeGetItem(key) { try { return localStorage.getItem(key); } catch { return null; } },
  _safeSetItem(key, value) { try { localStorage.setItem(key, value); } catch { } },

  getMembers() { return cachedMembers; },
  async loadAllMembers() {
    try {
      const getAllMembers = httpsCallable(functions, 'getAllMembersAdminV2Call');
      const result = await getAllMembers();
      cachedMembers = result.data.members || [];
      notifyListeners();
      return cachedMembers;
    } catch (e) {
      const snapshot = await getDocs(collection(db, 'members'));
      cachedMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      notifyListeners();
      return cachedMembers;
    }
  },

  async findMembersByPhone(sku) {
    if (cachedMembers.length > 0) return cachedMembers.filter(m => m.phoneLast4 === sku);
    try {
      const getSecureMember = httpsCallable(functions, 'getSecureMemberV2Call');
      const result = await getSecureMember({ phoneLast4: sku });
      return result.data.members || [];
    } catch (e) {
      const q = query(collection(db, 'members'), where("phoneLast4", "==", sku), limit(10));
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

      const { newCredits, endDate } = response.data;
      const idx = cachedMembers.findIndex(m => m.id === memberId);
      if (idx !== -1) {
        cachedMembers[idx].credits = newCredits;
        notifyListeners();
      }
      return { success: true, message: `[${classTitle}] 출석되었습니다!`, member: { id: memberId, name: response.data.memberName, credits: newCredits, endDate } };
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
      console.warn("AI Experience failed, using fallback");
      return { message: "오늘도 매트 위에서 나를 만나는 소중한 시간 되시길 바랍니다.", bgTheme: "sunny", colorTone: "#FFFFFF", isFallback: true };
    }
  },

  async getAIAnalysis(memberName, attendanceCount, logs, timeOfDay, language = 'ko', requestRole = 'member', statsData = null, context = 'profile') {
    try {
      const genAI = httpsCallable(functions, 'generatePageExperienceV2');
      const res = await genAI({ memberName, attendanceCount, logs: (logs || []).slice(0, 10), type: 'analysis', timeOfDay, language, role: requestRole, statsData, context });
      return res.data;
    } catch (error) {
      return { message: "수련 기록을 바탕으로 분석 중입니다. 꾸준한 발걸음을 응원합니다!", isFallback: true };
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
    const cacheKey = `daily_yoga_${today}_${language}`;
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
      return [
        { name: "Child's Pose", benefit: language === 'ko' ? "휴식 및 이완" : "Rest", instruction: language === 'ko' ? "이마를 매트에 대고 편안하게 쉽니다." : "Rest forehead on mat.", emoji: "👶" },
        { name: "Cat-Cow", benefit: language === 'ko' ? "척추 유연성" : "Spine Flex", instruction: language === 'ko' ? "숨을 마시며 등을 펴고, 내쉬며 둥글게 맙니다." : "Inhale arch, exhale round.", emoji: "🐈" },
        { name: "Down Dog", benefit: language === 'ko' ? "전신 스트레칭" : "Full Body", instruction: language === 'ko' ? "엉덩이를 높이 들어 ㅅ자를 만듭니다." : "Lift hips high.", emoji: "🐕" }
      ];
    }
  },

  subscribe(callback) {
    listeners.push(callback);
    return () => { listeners = listeners.filter(l => l !== callback); };
  },

  getImages() { return cachedImages; },
  getNotices() { return [...cachedNotices].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)); },
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
    } catch (e) { }
  },

  // Kiosk branch management (localStorage-based for tablet persistence)
  getKioskBranch() {
    const stored = this._safeGetItem('kiosk_branch');
    return stored || 'mapo'; // Default to mapo
  },

  setKioskBranch(branchId) {
    this._safeSetItem('kiosk_branch', branchId);
  },

  // Get latest practice events for a member (used by Member App)
  async getPracticeEvents(memberId, limit = 5) {
    try {
      const eventsSnap = await getDocs(
        query(
          collection(db, 'practice_events'),
          where('memberId', '==', memberId),
          orderBy('triggeredAt', 'desc'),
          limit(limit)
        )
      );
      return eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error('Failed to fetch practice events:', e);
      return [];
    }
  }
};
