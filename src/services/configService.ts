/**
 * Config Service — Images, Pricing, Kiosk Settings, Branch Management
 * Extracted from storage.js → TypeScript
 */
import { onSnapshot, getDoc, setDoc, getDocs, Unsubscribe } from 'firebase/firestore';
import { STUDIO_CONFIG } from '../studioConfig';
import { tenantDb } from '../utils/tenantDb';

// ── Types ──
export interface KioskSettings {
  active: boolean;
  imageUrl: string | null;
  updatedAt?: string;
}

export interface PricingData {
  [key: string]: unknown;
}

type NotifyFn = (eventType?: string) => void;

// ── State ──
let cachedImages: Record<string, string> = {};
let pendingImageWrites: Record<string, { base64: string; timestamp: number }> = {};

// ── Service ──
export const configService = {
  getImages(): Record<string, string> { return cachedImages; },
  setCachedImages(imgs: Record<string, string>): void { cachedImages = imgs; },

  async fetchImages(): Promise<Record<string, string>> {
    if (Object.keys(cachedImages).length === 0) {
      try {
        const snapshot = await getDocs(tenantDb.collection('images'));
        const imgs: Record<string, string> = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          imgs[doc.id] = (data.url || data.base64) as string;
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

  async updateImage(id: string, base64: string, notifyListeners?: NotifyFn): Promise<boolean> {
    if (!base64 || !id) throw new Error("Invalid image data");
    cachedImages[id] = base64;
    pendingImageWrites[id] = { base64, timestamp: Date.now() };
    if (notifyListeners) notifyListeners();

    await setDoc(tenantDb.doc('images', id), { base64, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  },

  async getPricing(): Promise<PricingData> {
    try {
      const docRef = tenantDb.doc('settings', 'pricing');
      const snap = await getDoc(docRef);
      return snap.exists() ? (snap.data() as PricingData) : {};
    } catch (e) {
      console.error('[Config] Failed to get pricing:', e);
      return {};
    }
  },

  async savePricing(pricingData: PricingData, notifyListeners?: NotifyFn): Promise<boolean> {
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

  async getKioskSettings(branchId: string = 'all'): Promise<KioskSettings> {
    try {
      const docId = branchId === 'all' ? 'kiosk' : `kiosk_${branchId}`;
      const docSnap = await getDoc(tenantDb.doc('settings', docId));
      return docSnap.exists() ? (docSnap.data() as KioskSettings) : { active: false, imageUrl: null };
    } catch {
      return { active: false, imageUrl: null };
    }
  },

  async updateKioskSettings(branchId: string = 'all', data: Partial<KioskSettings>): Promise<boolean> {
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

  subscribeToKioskSettings(branchId: string = 'all', callback: (settings: KioskSettings) => void): Unsubscribe {
    try {
      const docId = branchId === 'all' ? 'kiosk' : `kiosk_${branchId}`;
      return onSnapshot(tenantDb.doc('settings', docId), (docSnap) => {
        callback(docSnap.exists() ? (docSnap.data() as KioskSettings) : { active: false, imageUrl: null });
      }, (error) => {
        console.warn('[Config] Kiosk settings listener error:', error);
      });
    } catch {
      return (() => {}) as Unsubscribe;
    }
  },

  // Branch management (localStorage-based)
  _safeGetItem(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } },
  _safeSetItem(key: string, value: string): void { try { localStorage.setItem(key, value); } catch { /* ignore */ } },

  getKioskBranch(): string {
    const stored = this._safeGetItem('kiosk_branch');
    return stored || (STUDIO_CONFIG.BRANCHES?.[0]?.id || 'main');
  },
  setKioskBranch(branchId: string): void { this._safeSetItem('kiosk_branch', branchId); },
  getCurrentBranch(): string { return this._safeGetItem('admin_current_branch') || 'all'; },
  setBranch(branchId: string): void { this._safeSetItem('admin_current_branch', branchId); }
};
