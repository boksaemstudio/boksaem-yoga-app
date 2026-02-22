import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // ✅ Import getStorage
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "boksaem-yoga.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "boksaem-yoga",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "boksaem-yoga.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "638854766032",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:638854766032:web:db6b919068aaf5808b2dd5"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app); // ✅ Initialize Storage

// [FIX] Removed clearIndexedDbPersistence — it was causing 0-count data in regular browsers.
// The call fails when other tabs are open (failed-precondition), and even when it succeeds,
// it clears all cached Firestore data, forcing a full re-fetch from network.
// This made data appear as 0 until the network round-trip completed.
console.log('[Firebase] Initialized without IndexedDbPersistence clear v2026.02.22.v7');

// [BUILD-FIX] Exported unminifiable version marker to force chunk hash change and bypass Workbox precache
export const FIREBASE_INIT_VERSION = '2026.02.22.v7';
// Defeat dead code elimination by modifying global state:
if (typeof window !== 'undefined') window.__FIREBASE_VERSION = FIREBASE_INIT_VERSION;

export const messaging = getMessaging(app);
export const auth = getAuth(app);
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
export const functions = getFunctions(app, "asia-northeast3");
export { getToken, onMessage };

