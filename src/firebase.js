import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    ...(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID && { measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID })
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app); // ✅ Initialize Storage

// [FIX] Removed clearIndexedDbPersistence — it was causing 0-count data in regular browsers.
console.log('[Firebase] Initialized without IndexedDbPersistence clear v2026.02.22.v7');

// [GA4] Firebase Analytics — 환경변수에 측정 ID가 있을 때만 활성화
let analytics = null;
isSupported().then(yes => {
    if (yes && firebaseConfig.measurementId) {
        analytics = getAnalytics(app);
        console.log('[Firebase] Analytics enabled:', firebaseConfig.measurementId);
    }
}).catch(() => {});

// [BUILD-FIX] Exported unminifiable version marker to force chunk hash change and bypass Workbox precache
export const FIREBASE_INIT_VERSION = '2026.03.10.v1';
// Defeat dead code elimination by modifying global state:
if (typeof window !== 'undefined') window.__FIREBASE_VERSION = FIREBASE_INIT_VERSION;

export const messaging = getMessaging(app);
export const auth = getAuth(app);
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
export const functions = getFunctions(app, "asia-northeast3");
export { getToken, onMessage };

