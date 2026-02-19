import { initializeApp } from "firebase/app";
import { getFirestore, clearIndexedDbPersistence } from "firebase/firestore";
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

// [FIX] Clear stale Firestore IndexedDB cache on startup to prevent 0-count bug
// This only clears if no other tabs are using Firestore (safe)
if (typeof window !== 'undefined') {
    clearIndexedDbPersistence(db).catch((err) => {
        // Expected to fail if other tabs are open or persistence wasn't enabled
        // This is fine - it just means cache is already in use
        if (err.code !== 'failed-precondition') {
            console.warn('[Firebase] Cache clear skipped:', err.code);
        }
    });
}

export const messaging = getMessaging(app);
export const auth = getAuth(app);
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
export const functions = getFunctions(app, "asia-northeast3");
export { getToken, onMessage };

