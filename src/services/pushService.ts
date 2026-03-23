/**
 * Push Notification Service — FCM Token Management & Push History
 * TypeScript version
 */
import { auth, messaging } from "../firebase";
import { signInAnonymously } from "firebase/auth";
import { getToken } from "firebase/messaging";
import { onSnapshot, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy, limit as firestoreLimit, Unsubscribe } from 'firebase/firestore';
import { STUDIO_CONFIG } from '../studioConfig';
import { tenantDb } from '../utils/tenantDb';

// ── Types ──
export interface PushToken {
    id: string;
    token?: string;
    role?: 'member' | 'instructor' | 'admin';
    memberId?: string;
    instructorName?: string;
    language?: string;
    platform?: string;
    updatedAt?: string;
    createdAt?: string;
    [key: string]: unknown;
}

export interface PushStatus {
    supported: boolean;
    permission: string;
    serviceWorker: boolean;
    hasToken?: boolean;
    message: string;
}

export interface PushHistoryItem {
    id: string;
    displayDate: unknown;
    [key: string]: unknown;
}

// ── State ──
let cachedPushTokens: PushToken[] = [];

// ── Helpers ──
const getVapidKey = (): string => (STUDIO_CONFIG as Record<string, unknown>).VAPID_KEY as string || (import.meta as unknown as { env: Record<string, string> }).env.VITE_FIREBASE_VAPID_KEY || '';

// ── Service ──
export const pushService = {
    getCachedPushTokens(): PushToken[] { return cachedPushTokens; },
    setCachedPushTokens(tokens: PushToken[]): void { cachedPushTokens = tokens; },

    async saveToken(token: string, role = 'member', language = 'ko'): Promise<void> {
        if (!token) return;
        try {
            const tokenRef = tenantDb.doc('fcm_tokens', token);
            await setDoc(tokenRef, { token, role, language, updatedAt: new Date().toISOString(), platform: 'web' }, { merge: true });
        } catch (e) { console.error("Save token failed:", e); }
    },

    async saveInstructorToken(token: string, instructorName: string, language = 'ko'): Promise<void> {
        if (!token || !instructorName) return;
        try {
            if (!auth.currentUser) { try { await signInAnonymously(auth); } catch (authErr) { console.error('[Push] Auth failed:', authErr); } }
            const tokenRef = tenantDb.doc('fcm_tokens', token);
            await setDoc(tokenRef, { token, role: 'instructor', instructorName, language, updatedAt: new Date().toISOString(), platform: 'web' }, { merge: true });
        } catch (e) {
            console.error(`[Push] Save instructor token FAILED for ${instructorName}:`, e);
        }
    },

    async deletePushToken(role?: string): Promise<boolean> {
        try {
            const registration = await navigator.serviceWorker.ready;
            const token = await getToken(messaging, { vapidKey: getVapidKey(), serviceWorkerRegistration: registration });
            if (token) {
                const tokenSnap = await getDoc(tenantDb.doc('fcm_tokens', token));
                if (tokenSnap.exists()) {
                    const data = tokenSnap.data() as PushToken;
                    // [ROOT FIX] instructor 토큰은 보호 — admin에서 삭제 시 instructor 토큰까지 날리지 않음
                    if (role && data.role !== role) {
                        console.log(`[Push] Skipping delete: token role is '${data.role}', requested delete for '${role}'`);
                        return true;
                    }
                    if (data.memberId) await updateDoc(tenantDb.doc('members', data.memberId), { pushEnabled: false });
                }
                // role 필터 없으면 기존처럼 삭제 (회원용)
                if (!role || (tokenSnap.exists() && (tokenSnap.data() as PushToken).role === role)) {
                    await deleteDoc(tenantDb.doc('fcm_tokens', token));
                }
            }
            return true;
        } catch (e) { console.error("Delete push token failed:", e); return false; }
    },

    async requestPushPermission(memberId?: string, role: string = 'member'): Promise<string> {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const token = await this.requestAndSaveToken();
                if (token) {
                    const tokenRef = tenantDb.doc('fcm_tokens', token);
                    const tokenSnap = await getDoc(tokenRef);
                    const existingData = tokenSnap.exists() ? (tokenSnap.data() as Record<string, unknown>) : {};
                    
                    // [ROOT FIX] roles 배열로 다중 역할 누적 저장
                    const existingRoles = (existingData.roles as string[]) || (existingData.role ? [existingData.role as string] : []);
                    const roles = [...new Set([...existingRoles, role])]; // 중복 제거
                    
                    const dataToUpdate: Record<string, unknown> = { 
                        role, // 최신 역할 (backward compatibility)
                        roles, // 전체 역할 배열
                        platform: 'web', 
                        language: localStorage.getItem('app_language') || 'ko', 
                        updatedAt: new Date().toISOString() 
                    };
                    
                    // [ROOT FIX] memberId — 현재 전달된 것 or 기존 것 보존
                    if (memberId) {
                        dataToUpdate.memberId = memberId;
                    } else if (existingData.memberId) {
                        dataToUpdate.memberId = existingData.memberId;
                    }
                    
                    // instructorName 보존
                    if (existingData.instructorName) {
                        dataToUpdate.instructorName = existingData.instructorName;
                    }
                    
                    if (!tokenSnap.exists() || !existingData.createdAt) {
                        dataToUpdate.createdAt = new Date().toISOString();
                    }

                    // [ROOT FIX] 동일 기기의 이전 stale 토큰 정리 + 기존 데이터 이관
                    const devicePrefix = token.split(':')[0];
                    if (devicePrefix) {
                        try {
                            const allTokens = await getDocs(tenantDb.collection('fcm_tokens'));
                            for (const doc of allTokens.docs) {
                                if (doc.id === token) continue;
                                if (doc.id.startsWith(devicePrefix + ':')) {
                                    const oldData = doc.data() as Record<string, unknown>;
                                    // 이전 토큰의 모든 정보 이관
                                    if (oldData.memberId && !dataToUpdate.memberId) {
                                        dataToUpdate.memberId = oldData.memberId;
                                    }
                                    if (oldData.instructorName && !dataToUpdate.instructorName) {
                                        dataToUpdate.instructorName = oldData.instructorName;
                                    }
                                    // 이전 토큰 roles 이관
                                    const oldRoles = (oldData.roles as string[]) || (oldData.role ? [oldData.role as string] : []);
                                    dataToUpdate.roles = [...new Set([...(dataToUpdate.roles as string[]), ...oldRoles])];
                                    
                                    await deleteDoc(tenantDb.doc('fcm_tokens', doc.id));
                                    console.log(`[Push] 🧹 Cleaned stale token: ${doc.id.substring(0, 30)}...`);
                                }
                            }
                        } catch (cleanupErr) {
                            console.warn('[Push] Stale token cleanup failed (non-critical):', cleanupErr);
                        }
                    }

                    await setDoc(tokenRef, dataToUpdate, { merge: true });
                    console.log(`[Push] ✅ Token saved: role=${role}, roles=${(dataToUpdate.roles as string[]).join(',')}, memberId=${dataToUpdate.memberId || 'N/A'}`);
                    // memberId가 있으면 members 문서의 fcmToken도 최신으로 갱신
                    if (dataToUpdate.memberId) {
                        await updateDoc(tenantDb.doc('members', dataToUpdate.memberId as string), { pushEnabled: true, fcmToken: token });
                    }
                }
            }
            return permission;
        } catch (e) { console.error("Push permission request failed:", e); return 'denied'; }
    },

    async requestInstructorPushPermission(instructorName: string): Promise<boolean> {
        if (!instructorName) return false;
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return false;
            if (!auth.currentUser) { try { await signInAnonymously(auth); } catch { /* continue */ } }
            const registration = await navigator.serviceWorker.ready;
            const token = await getToken(messaging, { vapidKey: getVapidKey(), serviceWorkerRegistration: registration });
            if (!token) return false;
            
            const tokenRef = tenantDb.doc('fcm_tokens', token);
            const tokenSnap = await getDoc(tokenRef);
            const existingData = tokenSnap.exists() ? (tokenSnap.data() as Record<string, unknown>) : {};
            
            // [ROOT FIX] roles 배열로 다중 역할 누적 저장
            const existingRoles = (existingData.roles as string[]) || (existingData.role ? [existingData.role as string] : []);
            const roles = [...new Set([...existingRoles, 'instructor'])];
            
            const dataToUpdate: Record<string, unknown> = { 
                role: 'instructor', roles, instructorName, 
                updatedAt: new Date().toISOString(), platform: 'web' 
            };
            
            // 기존 memberId 보존
            if (existingData.memberId) dataToUpdate.memberId = existingData.memberId;
            if (!tokenSnap.exists() || !existingData.createdAt) dataToUpdate.createdAt = new Date().toISOString();
            
            // [ROOT FIX] 동일 기기의 이전 stale 토큰 정리 + 기존 데이터 이관
            const devicePrefix = token.split(':')[0];
            if (devicePrefix) {
                try {
                    const allTokens = await getDocs(tenantDb.collection('fcm_tokens'));
                    for (const doc of allTokens.docs) {
                        if (doc.id === token) continue;
                        if (doc.id.startsWith(devicePrefix + ':')) {
                            const oldData = doc.data() as Record<string, unknown>;
                            if (oldData.memberId && !dataToUpdate.memberId) dataToUpdate.memberId = oldData.memberId;
                            const oldRoles = (oldData.roles as string[]) || (oldData.role ? [oldData.role as string] : []);
                            dataToUpdate.roles = [...new Set([...(dataToUpdate.roles as string[]), ...oldRoles])];
                            await deleteDoc(tenantDb.doc('fcm_tokens', doc.id));
                            console.log(`[Push] 🧹 Cleaned stale instructor token: ${doc.id.substring(0, 30)}...`);
                        }
                    }
                } catch (cleanupErr) {
                    console.warn('[Push] Instructor stale token cleanup failed:', cleanupErr);
                }
            }
            
            await setDoc(tokenRef, dataToUpdate, { merge: true });
            console.log(`[Push] ✅ Instructor token saved: ${instructorName}, roles=${(dataToUpdate.roles as string[]).join(',')}`);
            return true;
        } catch (e) { console.error(`[Push] Instructor push failed for ${instructorName}:`, e); return false; }
    },

    async verifyServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
        if (!('serviceWorker' in navigator)) throw new Error('이 브라우저는 푸시 알림을 지원하지 않습니다.');
        try { return await navigator.serviceWorker.ready; }
        catch (e) { throw new Error(`Service Worker 확인 실패: ${(e as Error).message}`); }
    },

    async checkPushNotificationStatus(): Promise<PushStatus> {
        try {
            if (!('Notification' in window)) return { supported: false, permission: 'unsupported', serviceWorker: false, message: '이 브라우저는 푸시 알림을 지원하지 않습니다.' };
            const permission = Notification.permission;
            let serviceWorkerActive = false;
            if ('serviceWorker' in navigator) { const reg = await navigator.serviceWorker.getRegistration(); serviceWorkerActive = !!(reg && reg.active); }
            let hasToken = false;
            try {
                const VAPID_KEY = getVapidKey();
                if (VAPID_KEY && permission === 'granted' && serviceWorkerActive) {
                    const registration = await navigator.serviceWorker.ready;
                    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
                    hasToken = !!token;
                }
            } catch { /* ignore */ }
            return { supported: true, permission, serviceWorker: serviceWorkerActive, hasToken, message: this._getPushStatusMessage(permission, serviceWorkerActive, hasToken) };
        } catch { return { supported: false, permission: 'error', serviceWorker: false, hasToken: false, message: '푸시 알림 상태를 확인할 수 없습니다.' }; }
    },

    _getPushStatusMessage(permission: string, serviceWorker: boolean, hasToken: boolean): string {
        if (permission === 'denied') return '⚠️ 알림이 차단되었습니다.';
        if (permission !== 'granted') return '알림 권한이 필요합니다.';
        if (!serviceWorker) return '⚠️ 서비스 워커가 등록되지 않았습니다.';
        if (!hasToken) return '⚠️ 푸시 토큰이 등록되지 않았습니다.';
        return '✅ 푸시 알림이 정상적으로 설정되었습니다.';
    },

    async reregisterPushToken(memberId: string): Promise<{ success: boolean; token?: string; error?: string; message: string }> {
        try {
            await this.verifyServiceWorkerRegistration();
            try { await this.deletePushToken(); } catch { /* OK */ }
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') throw new Error('알림 권한이 거부되었습니다.');
            const VAPID_KEY = getVapidKey();
            if (!VAPID_KEY) throw new Error('VAPID Key가 설정되지 않았습니다.');
            const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: await this.verifyServiceWorkerRegistration() });
            if (!token) throw new Error('토큰 발급에 실패했습니다.');
            if (memberId) {
                const tokenRef = tenantDb.doc('fcm_tokens', token);
                const tokenSnap = await getDoc(tokenRef);
                const existingData = tokenSnap.exists() ? (tokenSnap.data() as Record<string, unknown>) : {};
                
                // [ROOT FIX] roles 배열 보존
                const existingRoles = (existingData.roles as string[]) || (existingData.role ? [existingData.role as string] : []);
                const roles = [...new Set([...existingRoles, 'member'])];
                
                const tokenData: Record<string, unknown> = { 
                    memberId, role: 'member', roles,
                    updatedAt: new Date().toISOString(), platform: 'web', 
                    language: localStorage.getItem('app_language') || 'ko'
                };
                // 기존 instructorName 보존
                if (existingData.instructorName) tokenData.instructorName = existingData.instructorName;
                if (!tokenSnap.exists() || !existingData.createdAt) tokenData.createdAt = new Date().toISOString();
                
                await setDoc(tokenRef, tokenData, { merge: true });
                await updateDoc(tenantDb.doc('members', memberId), { pushEnabled: true, fcmToken: token, lastTokenUpdate: new Date() });
            }
            return { success: true, token, message: '푸시 알림이 성공적으로 설정되었습니다!' };
        } catch (error) {
            const msg = (error as Error).message;
            return { success: false, error: msg, message: `푸시 알림 설정 실패: ${msg}` };
        }
    },

    async requestAndSaveToken(): Promise<string> {
        const permission = await Notification.requestPermission();
        if (permission === 'denied') throw new Error("브라우저 알림 권한이 차단되었습니다.");
        const VAPID_KEY = getVapidKey();
        if (!VAPID_KEY) throw new Error("VITE_FIREBASE_VAPID_KEY is missing");
        const registration = await this.verifyServiceWorkerRegistration();
        return await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    },

    async getAllPushTokens(): Promise<PushToken[]> {
        if (cachedPushTokens.length > 0) return cachedPushTokens;
        try {
            const snapshot = await getDocs(tenantDb.collection('fcm_tokens')).catch(() => ({ docs: [] as never[] }));
            cachedPushTokens = snapshot.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() } as PushToken));
            return cachedPushTokens;
        } catch { return cachedPushTokens || []; }
    },

    async diagnosePushData(): Promise<Record<string, number | string>> {
        const collections = ['fcm_tokens', 'fcmTokens', 'push_tokens', 'tokens', 'fcm_token'];
        const results: Record<string, number | string> = {};
        for (const name of collections) {
            try { const snap = await getDocs(tenantDb.collection(name)); results[name] = snap.size; }
            catch (e) { results[name] = "Error: " + (e as Error).message; }
        }
        return results;
    },

    async getPushHistory(limitCount = 50): Promise<PushHistoryItem[]> {
        try {
            const q = query(tenantDb.collection('push_history'), orderBy('createdAt', 'desc'), firestoreLimit(limitCount));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => {
                const data = d.data() as Record<string, unknown>;
                return { id: d.id, ...data, displayDate: (data.createdAt as { toDate?: () => Date })?.toDate?.() || data.createdAt || new Date() } as PushHistoryItem;
            });
        } catch { return []; }
    },

    subscribeToPushHistory(callback: (items: PushHistoryItem[]) => void, limitCount = 50): Unsubscribe {
        try {
            const q = query(tenantDb.collection('push_history'), orderBy('createdAt', 'desc'), firestoreLimit(limitCount));
            return onSnapshot(q, (snapshot) => {
                callback(snapshot.docs.map(d => {
                    const item = d.data() as Record<string, unknown>;
                    return { id: d.id, ...item, displayDate: (item.createdAt as { toDate?: () => Date })?.toDate?.() || item.createdAt || new Date() } as PushHistoryItem;
                }));
            }, (error) => { console.warn('[Push] Push history listener error:', error); callback([]); });
        } catch { callback([]); return (() => {}) as Unsubscribe; }
    }
};
