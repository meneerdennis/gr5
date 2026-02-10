// src/services/firebase.js
// Frontend Firebase-configuratie (Create React App)

import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";

const runtimeConfig =
  typeof window !== "undefined" ? window.__FIREBASE_CONFIG__ : null;

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || runtimeConfig?.apiKey || "",
  authDomain:
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ||
    runtimeConfig?.authDomain ||
    "",
  projectId:
    process.env.REACT_APP_FIREBASE_PROJECT_ID || runtimeConfig?.projectId || "",
  storageBucket:
    process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ||
    runtimeConfig?.storageBucket ||
    "",
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ||
    runtimeConfig?.messagingSenderId ||
    "",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || runtimeConfig?.appId || "",
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfig.length > 0) {
  console.error(
    `Missing Firebase config values: ${missingConfig.join(", ")}. ` +
      "Check .env/.env.local or public/firebase-config.js.",
  );
}

const app = initializeApp(firebaseConfig);
export { app };
export const db = getFirestore(app);

// Enable Firestore offline persistence for better caching
export const enableFirestorePersistence = async () => {
  try {
    await enableIndexedDbPersistence(db);
    console.log("Firestore persistence enabled");
    return true;
  } catch (error) {
    if (error.code === "failed-precondition") {
      console.warn("Firestore persistence failed: Multiple tabs open");
    } else if (error.code === "unimplemented") {
      console.warn("Firestore persistence not supported in this browser");
    } else {
      console.error("Firestore persistence error:", error);
    }
    return false;
  }
};

// Initialize persistence
enableFirestorePersistence();
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Enable persistence so users remain logged in across page refreshes
export const ensureAuthPersistence = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    return "local";
  } catch (error) {
    console.warn(
      "Local persistence unavailable, falling back to session:",
      error,
    );
  }

  try {
    await setPersistence(auth, browserSessionPersistence);
    return "session";
  } catch (error) {
    console.warn("Session persistence unavailable:", error);
  }

  throw new Error(
    "Auth persistence is disabled in this browser. Please allow cookies and site storage.",
  );
};

ensureAuthPersistence().catch((error) => {
  console.warn("Failed to enable Firebase persistence:", error);
});
