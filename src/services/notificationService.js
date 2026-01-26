import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
} from "firebase/messaging";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  doc,
  setDoc,
  updateDoc,
  arrayRemove,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { app, db, auth } from "./firebase";

let messagingInstance = null;

export const initializeMessaging = async (onForegroundMessage) => {
  if (!(await isSupported())) return null;

  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }

  if (onForegroundMessage) {
    onMessage(messagingInstance, onForegroundMessage);
  }

  return messagingInstance;
};

export const registerServiceWorkerAndGetToken = async () => {
  if (!(await isSupported())) return null;

  const publicUrl = process.env.PUBLIC_URL || "";
  const registration = await navigator.serviceWorker.register(
    `${publicUrl}/firebase-messaging-sw.js`,
  );

  const messaging = await initializeMessaging();
  const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;

  if (!vapidKey) {
    throw new Error("Missing REACT_APP_FIREBASE_VAPID_KEY");
  }

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  return { token };
};

export const saveFCMToken = async (token) => {
  if (!token) return;

  const uid = auth.currentUser?.uid || null;
  if (!uid) return;

  const tokenRef = doc(db, "userTokens", uid);
  await setDoc(
    tokenRef,
    {
      uid,
      tokens: arrayUnion(token),
      userAgent: navigator.userAgent,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const removeFCMToken = async (token) => {
  if (!token) return;
  const uid = auth.currentUser?.uid || null;
  if (!uid) return;
  const tokenRef = doc(db, "userTokens", uid);
  await updateDoc(tokenRef, {
    tokens: arrayRemove(token),
    lastSeenAt: serverTimestamp(),
  });
};

export const getAllUserTokens = async () => [];

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    return { granted: false, reason: "unsupported" };
  }

  if (Notification.permission === "granted") {
    return { granted: true };
  }

  if (Notification.permission === "denied") {
    return { granted: false, reason: "denied" };
  }

  const permission = await Notification.requestPermission();
  return { granted: permission === "granted", reason: permission };
};

export const sendHikeNotification = async ({
  hikeId,
  hikeName,
  message,
  force = false,
}) => {
  try {
    const functions = getFunctions(app);
    const callable = httpsCallable(functions, "sendHikeNotification");
    const result = await callable({ hikeId, hikeName, message, force });
    return { success: true, ...result.data };
  } catch (error) {
    console.error("Error sending hike notification:", error);
    return { success: false, error: error.message };
  }
};
