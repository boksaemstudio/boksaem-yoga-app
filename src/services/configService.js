/**
 * Config Service — Images, Pricing, Kiosk Settings, Branch Management
 * Extracted from storage.js
 */
import { onSnapshot, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { STUDIO_CONFIG } from '../studioConfig';
import { tenantDb } from '../utils/tenantDb';

let cachedImages = {};
let pendingImageWrites = {};

export const configService = {
  getImages() { return cachedImages; },
  setCachedImages(imgs) { cachedImages = imgs; },

  async fetchImages() {
    if (Object.keys(cachedImages).length === 0) {
      try {
        const snapshot = await getDocs(tenantDb.collection('images'));
        const imgs = {};
        snapshot.docs.forEach(doc => {
          imgs[doc.id] = doc.data().url || doc.data().base64;
        });
        cachedImages = imgs;
        return imgs;
      } catch (e) {
        console.warn("[Config] Failed to fetch images:", e);
        return {};
      }
    }
    return cachedImages;
  },

  async updateImage(id, base64, notifyListeners) {
    try {
      if (!base64 || !id) throw new Error("Invalid image data");
      cachedImages[id] = base64;
      pendingImageWrites[id] = { base64, timestamp: Date.now() };
      if (notifyListeners) notifyListeners();

      await setDoc(tenantDb.doc('images', id), { base64, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (e) {
      console.error("Update image failed:", e);
      throw e;
    }
  },

  async getPricing() {
    try {
      const docRef = tenantDb.doc('settings', 'pricing');
      const snap = await getDoc(docRef);
      return snap.exists() ? snap.data() : {};
    } catch (e) {
      console.error('[Config] Failed to get pricing:', e);
      return {};
    }
  },

  async savePricing(pricingData, notifyListeners) {
    try {
      const docRef = tenantDb.doc('settings', 'pricing');
      await setDoc(docRef, pricingData);
      if (notifyListeners) notifyListeners('settings');
      return true;
    } catch (e) {
      console.error('[Config] Failed to save pricing:', e);
      return false;
    }
  },

  async getKioskSettings(branchId = 'all') {
    try {
      const docId = branchId === 'all' ? 'kiosk' : `kiosk_${branchId}`;
      const docSnap = await getDoc(tenantDb.doc('settings', docId));
      return docSnap.exists() ? docSnap.data() : { active: false, imageUrl: null };
    } catch (e) {
      return { active: false, imageUrl: null };
    }
  },

  async updateKioskSettings(branchId = 'all', data) {
    try {
      const docId = branchId === 'all' ? 'kiosk' : `kiosk_${branchId}`;
      await setDoc(tenantDb.doc('settings', docId), {
        ...data, updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      console.error('[Config] Update kiosk settings failed:', e);
      throw e;
    }
  },

  subscribeToKioskSettings(branchId = 'all', callback) {
    try {
      const docId = branchId === 'all' ? 'kiosk' : `kiosk_${branchId}`;
      return onSnapshot(tenantDb.doc('settings', docId), (docSnap) => {
        callback(docSnap.exists() ? docSnap.data() : { active: false, imageUrl: null });
      }, (error) => {
        console.warn('[Config] Kiosk settings listener error:', error);
      });
    } catch (e) {
      return () => {};
    }
  },

  // Branch management (localStorage-based)
  _safeGetItem(key) { try { return localStorage.getItem(key); } catch { return null; } },
  _safeSetItem(key, value) { try { localStorage.setItem(key, value); } catch { /* ignore */ } },

  getKioskBranch() {
    const stored = this._safeGetItem('kiosk_branch');
    return stored || (STUDIO_CONFIG.BRANCHES?.[0]?.id || 'main');
  },
  setKioskBranch(branchId) { this._safeSetItem('kiosk_branch', branchId); },
  getCurrentBranch() { return this._safeGetItem('admin_current_branch') || 'all'; },
  setBranch(branchId) { this._safeSetItem('admin_current_branch', branchId); }
};
