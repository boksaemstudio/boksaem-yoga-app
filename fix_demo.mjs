import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import fs from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSy...", // I don't have the API key! Wait! I can get it from src/firebase.js
};
