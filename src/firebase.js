import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
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

// [FIX] Disable Offline Persistence to prevent stale data issues in Chrome
// if (typeof window !== 'undefined') {
//     enableIndexedDbPersistence(db).catch((err) => {
//         if (err.code === 'failed-precondition') {
//             console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
//         } else if (err.code === 'unimplemented') {
//             console.warn('The current browser does not support all of the features required to enable persistence');
//         }
//     });
// }
export const messaging = getMessaging(app);
export const auth = getAuth(app);
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
export const functions = getFunctions(app, "asia-northeast3");
export { getToken, onMessage };
