/**
 * Push Notification Service — FCM Token Management & Push History
 * Extracted from storage.js
 */
import { auth, messaging } from "../firebase";
import { signInAnonymously } from "firebase/auth";
import { getToken } from "firebase/messaging";
import { onSnapshot, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { STUDIO_CONFIG } from '../studioConfig';
import { tenantDb } from '../utils/tenantDb';

let cachedPushTokens = [];

export const pushService = {
  getCachedPushTokens() { return cachedPushTokens; },
  setCachedPushTokens(tokens) { cachedPushTokens = tokens; },

  async saveToken(token, role = 'member', language = 'ko') {
    if (!token) return;
    try {
      const tokenRef = tenantDb.doc('fcm_tokens', token);
      await setDoc(tokenRef, { token, role, language, updatedAt: new Date().toISOString(), platform: 'web' }, { merge: true });
    } catch (e) { console.error("Save token failed:", e); }
  },

  async saveInstructorToken(token, instructorName, language = 'ko') {
    if (!token || !instructorName) return;
    try {
      if (!auth.currentUser) {
        try { await signInAnonymously(auth); } catch (authErr) {
          console.error('[Push] Auth failed:', authErr.code);
        }
      }

      const tokenRef = tenantDb.doc('fcm_tokens', token);
      await setDoc(tokenRef, {
        token,
        role: 'instructor',
        instructorName,
        language,
        updatedAt: new Date().toISOString(),
        platform: 'web'
      }, { merge: true });
      console.log(`[Push] ✅ Instructor token saved for ${instructorName}`);
    } catch (e) {
      console.error(`[Push] ❌ Save instructor token FAILED for ${instructorName}:`, e.code, e.message);
    }
  },

  async deletePushToken() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, { 
        vapidKey: STUDIO_CONFIG.VAPID_KEY || import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration
      });
      if (token) {
        const tokenSnap = await getDoc(tenantDb.doc('fcm_tokens', token));
        if (tokenSnap.exists() && tokenSnap.data().memberId) {
          await updateDoc(tenantDb.doc('members', tokenSnap.data().memberId), { pushEnabled: false });
        }
        await deleteDoc(tenantDb.doc('fcm_tokens', token));
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
        const token = await this.requestAndSaveToken();
        if (token && memberId) {
          const tokenRef = tenantDb.doc('fcm_tokens', token);
          const tokenSnap = await getDoc(tokenRef);
          
          let dataToUpdate = { 
            memberId, 
            role: 'member',
            platform: 'web',
            language: localStorage.getItem('app_language') || 'ko',
            updatedAt: new Date().toISOString() 
          };

          if (!tokenSnap.exists() || !tokenSnap.data().createdAt) {
            dataToUpdate.createdAt = new Date().toISOString();
          }

          await setDoc(tokenRef, dataToUpdate, { merge: true });
          await updateDoc(tenantDb.doc('members', memberId), { pushEnabled: true });
        }
      }
      return permission;
    } catch (e) {
      console.error("Push permission request failed:", e);
      return 'denied';
    }
  },

  async requestInstructorPushPermission(instructorName) {
    if (!instructorName) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      if (!auth.currentUser) {
        try { await signInAnonymously(auth); } catch (authErr) {
          console.error('[Push] Auth failed:', authErr);
        }
      }

      const registration = await navigator.serviceWorker.ready;
      const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (!token) return false;

      const tokenRef = tenantDb.doc('fcm_tokens', token);
      let dataToUpdate = {
        token, role: 'instructor', instructorName,
        updatedAt: new Date().toISOString(), platform: 'web'
      };

      try {
        const tokenSnap = await getDoc(tokenRef);
        if (!tokenSnap.exists() || !tokenSnap.data().createdAt) {
          dataToUpdate.createdAt = new Date().toISOString();
        }
      } catch (readErr) {
        dataToUpdate.createdAt = new Date().toISOString();
      }

      await setDoc(tokenRef, dataToUpdate, { merge: true });
      return true;
    } catch (e) {
      console.error(`[Push] ❌ Instructor push failed for ${instructorName}:`, e.code, e.message);
      return false;
    }
  },

  async verifyServiceWorkerRegistration() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('이 브라우저는 푸시 알림을 지원하지 않습니다.');
    }
    try {
      return await navigator.serviceWorker.ready;
    } catch (e) {
      throw new Error(`Service Worker 확인 실패: ${e.message}`);
    }
  },

  async checkPushNotificationStatus() {
    try {
      if (!('Notification' in window)) {
        return { supported: false, permission: 'unsupported', serviceWorker: false, message: '이 브라우저는 푸시 알림을 지원하지 않습니다.' };
      }

      const permission = Notification.permission;
      let serviceWorkerActive = false;
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        serviceWorkerActive = !!(reg && reg.active);
      }

      let hasToken = false;
      try {
        const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (VAPID_KEY && permission === 'granted' && serviceWorkerActive) {
          const registration = await navigator.serviceWorker.ready;
          const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
          hasToken = !!token;
        }
      } catch (e) { /* ignore */ }

      return {
        supported: true, permission, serviceWorker: serviceWorkerActive, hasToken,
        message: this._getPushStatusMessage(permission, serviceWorkerActive, hasToken)
      };
    } catch (e) {
      return { supported: false, permission: 'error', serviceWorker: false, hasToken: false, message: '푸시 알림 상태를 확인할 수 없습니다.' };
    }
  },

  _getPushStatusMessage(permission, serviceWorker, hasToken) {
    if (permission === 'denied') return '⚠️ 알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.';
    if (permission !== 'granted') return '알림 권한이 필요합니다.';
    if (!serviceWorker) return '⚠️ 서비스 워커가 등록되지 않았습니다.';
    if (!hasToken) return '⚠️ 푸시 토큰이 등록되지 않았습니다.';
    return '✅ 푸시 알림이 정상적으로 설정되었습니다.';
  },

  async reregisterPushToken(memberId) {
    try {
      await this.verifyServiceWorkerRegistration();
      try { await this.deletePushToken(); } catch (e) { /* OK */ }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('알림 권한이 거부되었습니다.');

      const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!VAPID_KEY) throw new Error('VAPID Key가 설정되지 않았습니다.');

      const token = await getToken(messaging, { 
        vapidKey: VAPID_KEY, 
        serviceWorkerRegistration: await this.verifyServiceWorkerRegistration() 
      });
      if (!token) throw new Error('토큰 발급에 실패했습니다.');

      if (memberId) {
        const tokenRef = tenantDb.doc('fcm_tokens', token);
        const tokenSnap = await getDoc(tokenRef);
        
        let tokenData = { memberId, updatedAt: new Date().toISOString(), platform: 'web', role: 'member', language: 'ko' };
        if (!tokenSnap.exists() || !tokenSnap.data().createdAt) {
          tokenData.createdAt = new Date().toISOString();
        }
        await setDoc(tokenRef, tokenData, { merge: true });
        await updateDoc(tenantDb.doc('members', memberId), {
          pushEnabled: true, fcmToken: token, lastTokenUpdate: new Date()
        });
      }

      return { success: true, token, message: '푸시 알림이 성공적으로 설정되었습니다!' };
    } catch (error) {
      return { success: false, error: error.message, message: `푸시 알림 설정 실패: ${error.message}` };
    }
  },

  async requestAndSaveToken() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        throw new Error("브라우저 알림 권한이 차단되었습니다. 주소창의 자물쇠 아이콘을 눌러 허용해주세요.");
      }

      const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!VAPID_KEY) {
        alert("푸시 알림 설정 오류: VAPID Key가 설정되지 않았습니다. 관리자에게 문의하세요.");
        throw new Error("VITE_FIREBASE_VAPID_KEY is missing");
      }

      const registration = await this.verifyServiceWorkerRegistration();
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
      return token;
    } catch (e) {
      console.error("Token retrieval failed:", e);
      alert("푸시 토큰 발급 실패: " + (e.message || e) + "\n\n(Firebase Console에서 웹 푸시 인증서 키를 확인해주세요.)");
      throw e;
    }
  },

  async getAllPushTokens() {
    if (cachedPushTokens.length > 0) return cachedPushTokens;

    try {
      const results = await Promise.all([
        getDocs(tenantDb.collection('fcm_tokens')).catch(() => ({ docs: [] })),
        getDocs(tenantDb.collection('fcmTokens')).catch(() => ({ docs: [] })),
        getDocs(tenantDb.collection('push_tokens')).catch(() => ({ docs: [] }))
      ]);

      const allMerged = {};
      results.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          allMerged[doc.id] = { id: doc.id, ...doc.data() };
        });
      });

      const tokens = Object.values(allMerged);
      cachedPushTokens = tokens;
      return tokens;
    } catch (e) {
      return cachedPushTokens || [];
    }
  },

  async diagnosePushData() {
    const collections = ['fcm_tokens', 'fcmTokens', 'push_tokens', 'tokens', 'fcm_token'];
    const results = {};
    for (const name of collections) {
      try {
        const snap = await getDocs(tenantDb.collection(name));
        results[name] = snap.size;
      } catch (e) {
        results[name] = "Error: " + e.message;
      }
    }
    return results;
  },

  async getPushHistory(limitCount = 50) {
    try {
      const q = query(tenantDb.collection('push_history'), orderBy('createdAt', 'desc'), firestoreLimit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, displayDate: data.createdAt?.toDate?.() || data.createdAt || new Date() };
      });
    } catch (e) {
      return [];
    }
  },

  subscribeToPushHistory(callback, limitCount = 50) {
    try {
      const q = query(tenantDb.collection('push_history'), orderBy('createdAt', 'desc'), firestoreLimit(limitCount));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const item = doc.data();
          return { id: doc.id, ...item, displayDate: item.createdAt?.toDate?.() || item.createdAt || new Date() };
        });
        callback(data);
      }, (error) => {
        console.warn('[Push] Push history listener error:', error);
        callback([]);
      });
    } catch (e) {
      callback([]);
      return () => {};
    }
  }
};
