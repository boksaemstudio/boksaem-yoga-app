import { db, functions } from '../firebase';
import { collection, doc, query, where, getDocs, getDoc, addDoc, updateDoc, setDoc, onSnapshot, limit as firestoreLimit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

// [NETWORK] Timeout wrapper for Cloud Function calls
const withTimeout = (promise, timeoutMs = 10000, errorMsg = '서버 응답 시간 초과') => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs))
  ]);
};

// --- Local Cache ---
let cachedMembers = [];
let phoneLast4Index = {}; // { "1234": [member1, member2], ... }
let memberListenerUnsubscribe = null;
let notifyCallback = () => {};

export const memberService = {
  // [NEW] Trigger Kiosk Sync
  async triggerKioskSync() {
    try {
      const syncRef = doc(db, 'system_state', 'kiosk_sync');
      await setDoc(syncRef, { lastMemberUpdate: new Date().toISOString() }, { merge: true });
      console.log('[memberService] Kiosk sync triggered');
    } catch (e) {
      console.warn('[memberService] Failed to trigger kiosk sync:', e);
    }
  },

  // --- Initialization & Listener ---
  setNotifyCallback(callback) {
    notifyCallback = callback;
  },

  setupMemberListener() {
    console.log("[memberService] Starting Member Listener...");
    try {
      if (memberListenerUnsubscribe) {
        memberListenerUnsubscribe();
      }
      memberListenerUnsubscribe = onSnapshot(collection(db, 'members'), (snapshot) => {
        const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cachedMembers = members;
        console.log(`[memberService] Members updated via listener: ${members.length}`);
        this._buildPhoneLast4Index();
        notifyCallback();
      }, (error) => {
        console.warn("[memberService] Member listener error:", error);
      });
      return memberListenerUnsubscribe;
    } catch (e) {
      console.error("[memberService] Failed to setup member listener:", e);
      return null;
    }
  },

  getMembers() {
    return cachedMembers;
  },

  async loadAllMembers() {
    if (cachedMembers.length > 0) return cachedMembers;

    try {
      console.time('[memberService] Force Fetch Members');
      console.log("[memberService] Cache empty, force fetching members...");
      const snapshot = await getDocs(collection(db, 'members'));
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (cachedMembers.length === 0) {
        cachedMembers = members;
      }
      
      this._buildPhoneLast4Index();
      console.timeEnd('[memberService] Force Fetch Members');
      
      return cachedMembers;
    } catch (e) {
      console.error("Force fetch members failed:", e);
      return [];
    }
  },

  _buildPhoneLast4Index() {
    phoneLast4Index = {};
    cachedMembers.forEach(m => {
      const last4 = m.phoneLast4 || (m.phone && m.phone.slice(-4));
      if (last4) {
        if (!phoneLast4Index[last4]) phoneLast4Index[last4] = [];
        phoneLast4Index[last4].push(m);
      }
    });
    console.log(`[memberService] PhoneLast4 index built: ${Object.keys(phoneLast4Index).length} unique PINs`);
  },

  async findMembersByPhone(last4Digits) {
    if (phoneLast4Index[last4Digits]?.length > 0) {
      console.log(`[memberService] Index hit for ${last4Digits}: ${phoneLast4Index[last4Digits].length} member(s)`);
      return phoneLast4Index[last4Digits];
    }
    
    const cachedResults = cachedMembers.filter(m => (m.phoneLast4 || (m.phone && m.phone.slice(-4))) === last4Digits);
    if (cachedResults.length > 0) {
      console.log(`[memberService] Cache filter hit for ${last4Digits}: ${cachedResults.length} member(s)`);
      return cachedResults;
    }

    console.warn(`[memberService] Cache miss for ${last4Digits}, calling Cloud Function...`);
    try {
      const getSecureMember = httpsCallable(functions, 'getSecureMemberV2Call');
      const result = await withTimeout(
        getSecureMember({ phoneLast4: last4Digits }),
        10000,
        '회원 조회 시간 초과 - 네트워크를 확인해주세요'
      );
      const members = result.data.members || [];
      
      members.forEach(m => {
        const idx = cachedMembers.findIndex(cm => cm.id === m.id);
        if (idx !== -1) {
          cachedMembers[idx] = { ...cachedMembers[idx], ...m };
        } else {
          if (!cachedMembers.some(cm => cm.id === m.id)) {
            cachedMembers.push(m);
          }
        }
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

  getMemberById(id) {
    if (!id) return null;
    return cachedMembers.find(m => m.id === id) || null;
  },

  async fetchMemberById(id) {
    if (!id) return null;
    const cached = this.getMemberById(id);
    if (cached) return cached;

    try {
      const docRef = doc(db, 'members', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        // Insert into cache to prevent subsequent fetches
        if (!cachedMembers.some(m => m.id === id)) {
           cachedMembers.push(data);
           this._buildPhoneLast4Index();
        }
        return data;
      }
      return null;
    } catch (e) {
      console.error('Fetch member failed:', e);
      return null;
    }
  },

  async updateMember(memberId, data) {
    try {
      const memberRef = doc(db, 'members', memberId);
      await updateDoc(memberRef, { ...data, updatedAt: new Date().toISOString() });
      this.triggerKioskSync();
      return { success: true };
    } catch (e) {
      console.error('Update member failed:', e);
      return { success: false, error: e.message };
    }
  },

  _updateLocalMemberCache(memberId, updates) {
    const idx = cachedMembers.findIndex(m => m.id === memberId);
    if (idx !== -1) {
      cachedMembers[idx] = { ...cachedMembers[idx], ...updates };
      notifyCallback();
      this._buildPhoneLast4Index();
    }
  },

  async addMember(data) {
    try {
      const phoneQuery = query(collection(db, 'members'), where('phone', '==', data.phone));
      const phoneSnap = await getDocs(phoneQuery);
      if (!phoneSnap.empty) {
        throw new Error('이미 등록된 전화번호입니다.');
      }

      const docRef = await addDoc(collection(db, 'members'), {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phoneLast4: data.phone.slice(-4)
      });
      console.log(`[memberService] Member added to Firestore: ${docRef.id}`);
      this.triggerKioskSync();
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
      const docSnap = await getDoc(doc(db, 'member_diligence', memberId));
      return docSnap.exists() ? docSnap.data() : null;
    } catch (e) {
      console.warn("Diligence fetch failed:", e);
      return null;
    }
  },

  // Greeting Cache (Local Storage)
  _safeGetItem(key) { try { return localStorage.getItem(key); } catch { return null; } },
  _safeSetItem(key, value) { try { localStorage.setItem(key, value); } catch { /* ignore */ } },

  getGreetingCache(memberId) {
    const cached = this._safeGetItem(`greeting_${memberId}`);
    return cached ? JSON.parse(cached) : null;
  },

  setGreetingCache(memberId, data) {
    this._safeSetItem(`greeting_${memberId}`, JSON.stringify(data));
  }
};
