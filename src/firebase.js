import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "boksaem-yoga.firebaseapp.com",
    projectId: "boksaem-yoga",
    storageBucket: "boksaem-yoga.firebasestorage.app",
    messagingSenderId: "638854766032",
    appId: "1:638854766032:web:db6b919068aaf5808b2dd5"
};

export const app = initializeApp(firebaseConfig);
console.log("Firebase initialized with project:", firebaseConfig.projectId);
export const db = getFirestore(app);
export const messaging = getMessaging(app);
import { getAuth } from "firebase/auth";
export const auth = getAuth(app);
// TODO: Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates 에서 키 쌍을 생성하고 아래에 복사해 넣으세요.
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
export { getToken, onMessage };

import { getFunctions } from "firebase/functions";
export const functions = getFunctions(app, "asia-northeast3");
