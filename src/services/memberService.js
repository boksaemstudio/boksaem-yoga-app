import { db, functions } from '../firebase';
import { collection, doc, query, where, getDocs, getDoc, addDoc, updateDoc, setDoc, onSnapshot, limit as firestoreLimit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { tenantDb } from '../utils/tenantDb';

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
      const syncRef = tenantDb.doc('system_state', 'kiosk_sync');
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
    console.log("[memberService] setupMemberListener called - optimized to avoid global onSnapshot read spikes.");
    
    // [NEW] Load from LocalStorage for immediate UI response (Optimistic)
    const stored = localStorage.getItem('kiosk_member_cache');
    if (stored && cachedMembers.length === 0) {
      try {
        cachedMembers = JSON.parse(stored);
        console.log(`[memberService] Booting from local cache: ${cachedMembers.length} members`);
        this._buildPhoneLast4Index();
      } catch (e) {
        console.warn('[memberService] Local cache corrupt');
      }
    }

    try {
      if (memberListenerUnsubscribe) {
        memberListenerUnsubscribe();
      }
      memberListenerUnsubscribe = onSnapshot(tenantDb.collection('members'), (snapshot) => {
        const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cachedMembers = members;
        
        try {
            localStorage.setItem('kiosk_member_cache', JSON.stringify(cachedMembers));
        } catch (e) {
            console.warn('[memberService] Cache persistence failed');
        }

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

  async loadAllMembers(force = false) {
    if (!force && cachedMembers.length > 0) return cachedMembers;

    try {
      console.time('[memberService] Force Fetch Members');
      console.log("[memberService] Cache empty or forced, fetching members...");
      const snapshot = await getDocs(tenantDb.collection('members'));
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      cachedMembers = members;
      
      // [CRITICAL FIX] Save to localStorage so next kiosk boot is instantaneous
      try {
          localStorage.setItem('kiosk_member_cache', JSON.stringify(cachedMembers));
      } catch (e) {
          console.warn('[memberService] Local cache save failed (Storage full?)');
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
    const newIndex = {};
    cachedMembers.forEach(m => {
      const last4 = m.phoneLast4 || (m.phone && m.phone.slice(-4));
      if (last4) {
        if (!newIndex[last4]) newIndex[last4] = [];
        newIndex[last4].push(m);
      }
    });
    phoneLast4Index = newIndex;
  },

  async findMembersByPhone(last4Digits) {
    let members = [];
    if (phoneLast4Index[last4Digits]?.length > 0) {
      members = phoneLast4Index[last4Digits];
    } else {
      const cachedResults = cachedMembers.filter(m => (m.phoneLast4 || (m.phone && m.phone.slice(-4))) === last4Digits);
      if (cachedResults.length > 0) {
        members = cachedResults;
      } else {
        try {
          const getSecureMember = httpsCallable(functions, 'getSecureMemberV2Call');
          const result = await withTimeout(
            getSecureMember({ phoneLast4: last4Digits }),
            15000,
            '회원 조회 시간 초과'
          );
          members = result.data.members || [];
        } catch (e) {
          console.error('[memberService] Cloud Function member lookup failed:', e);
          // [FIX] Don't fall back to direct Firestore query — anonymous kiosk auth doesn't have permission.
          // Instead, let the empty result propagate so the UI shows "회원 정보를 찾을 수 없습니다"
          members = [];
        }
      }
    }

    // [SECURITY & PERF] Fetch biometrics for members who have the flag but not the descriptor
    const bioTasks = members
      .filter(m => m.hasFaceDescriptor && !m.faceDescriptor)
      .map(async m => {
        try {
          const bioSnap = await getDoc(tenantDb.doc('face_biometrics', m.id));
          if (bioSnap.exists()) {
             const bioData = bioSnap.data();
             m.faceDescriptor = bioData.descriptor;
          }
        } catch (e) { console.warn(`[memberService] Bio load failed for ${m.id}`); }
      });

    if (bioTasks.length > 0) await Promise.all(bioTasks);
    return members;
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
      const docRef = tenantDb.doc('members', id);
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
      const memberRef = tenantDb.doc('members', memberId);
      await updateDoc(memberRef, { ...data, updatedAt: new Date().toISOString() });
      this.triggerKioskSync();
      return { success: true };
    } catch (e) {
      console.error('Update member failed:', e);
      return { success: false, error: e.message };
    }
  },

  async updateFaceDescriptor(memberId, descriptor) {
    try {
      if (!descriptor) return { success: false };
      // [SECURITY] Save to isolated biometrics collection
      const bioRef = tenantDb.doc('face_biometrics', memberId);
      const descriptorArray = Array.from(descriptor);
      
      await setDoc(bioRef, { 
        memberId,
        descriptor: descriptorArray,
        updatedAt: new Date().toISOString()
      });

      // Synchronize with membership record metadata to trigger UI badges
      const memberRef = tenantDb.doc('members', memberId);
      await updateDoc(memberRef, { 
        hasFaceDescriptor: true,
        faceUpdatedAt: new Date().toISOString()
      });

      console.log(`[memberService] Face biometrics secured for ${memberId}`);
      this._updateLocalMemberCache(memberId, { faceDescriptor: descriptorArray, hasFaceDescriptor: true });
      return { success: true };
    } catch (e) {
      console.error('[memberService] Bio hardening failed:', e);
      return { success: false, error: e.message };
    }
  },

  _updateLocalMemberCache(memberId, updates) {
    const idx = cachedMembers.findIndex(m => m.id === memberId);
    if (idx !== -1) {
      const newMembers = [...cachedMembers];
      newMembers[idx] = { ...newMembers[idx], ...updates };
      cachedMembers = newMembers;
      
      // [NEW] Persist for offline durability
      try {
        localStorage.setItem('kiosk_member_cache', JSON.stringify(cachedMembers));
      } catch (e) {
        console.warn('[memberService] Cache persistence failed (Storage full?)');
      }

      notifyCallback();
      this._buildPhoneLast4Index();
    }
  },

  async addMember(data) {
    try {
      const phoneQuery = query(tenantDb.collection('members'), where('phone', '==', data.phone));
      const phoneSnap = await getDocs(phoneQuery);
      if (!phoneSnap.empty) {
        throw new Error('이미 등록된 전화번호입니다.');
      }

      const docRef = await addDoc(tenantDb.collection('members'), {
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
      const docSnap = await getDoc(tenantDb.doc('member_diligence', memberId));
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
