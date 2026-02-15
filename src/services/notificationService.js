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
  getDoc,
  arrayRemove,
  serverTimestamp,
  arrayUnion,
  deleteField,
} from "firebase/firestore";
import { app, db, auth } from "./firebase";

let messagingInstance = null;

export const isMessagingSupported = async () => {
  try {
    return await isSupported();
  } catch (error) {
    console.warn("Messaging support check failed:", error);
    return false;
  }
};

export const initializeMessaging = async (onForegroundMessage) => {
  if (!(await isMessagingSupported())) return null;

  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }

  if (onForegroundMessage) {
    onMessage(messagingInstance, onForegroundMessage);
  }

  return messagingInstance;
};

export const registerServiceWorkerAndGetToken = async () => {
  if (!(await isMessagingSupported())) {
    throw new Error("Push messaging is not supported in this browser.");
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser.");
  }

  if (typeof window !== "undefined" && !window.isSecureContext) {
    throw new Error("Push notifications require HTTPS.");
  }

  const publicUrl = process.env.PUBLIC_URL || "";
  const swUrl = `${publicUrl}/firebase-messaging-sw.js`;

  console.log("Registering firebase-messaging-sw.js service worker...");
  console.log("Service worker URL:", swUrl);

  const registrations = await navigator.serviceWorker.getRegistrations();
  console.log("Existing service worker registrations:", registrations);

  const messagingRegistrations = registrations.filter((registration) => {
    const scriptUrl =
      registration?.active?.scriptURL ||
      registration?.waiting?.scriptURL ||
      registration?.installing?.scriptURL ||
      "";
    console.log("Checking service worker script URL:", scriptUrl);
    return scriptUrl.includes("firebase-messaging-sw.js");
  });

  let registration;
  if (messagingRegistrations.length > 0) {
    registration = messagingRegistrations[0];
    console.log(
      "Using existing firebase-messaging service worker registration",
    );
  } else {
    console.log("Registering new firebase-messaging service worker...");
    registration = await navigator.serviceWorker.register(swUrl);
    console.log("Firebase messaging service worker registered:", registration);
  }

  if (!registration || !registration.pushManager) {
    throw new Error(
      "PushManager is not available. Ensure the service worker is registered and active.",
    );
  }

  console.log("Service worker is ready and PushManager is available.");

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
  const userAgent = navigator.userAgent || "";
  const snapshot = await getDoc(tokenRef);
  const existing = snapshot.exists() ? snapshot.data() : {};
  const existingMeta = existing.tokensMeta || {};

  const nextMeta = {};
  Object.entries(existingMeta).forEach(([existingToken, meta]) => {
    if (meta?.userAgent && meta.userAgent === userAgent) return;
    nextMeta[existingToken] = meta;
  });

  nextMeta[token] = {
    userAgent,
    lastSeenAt: serverTimestamp(),
  };

  const nextTokens = Object.keys(nextMeta);

  await setDoc(
    tokenRef,
    {
      uid,
      tokens: nextTokens,
      tokensMeta: nextMeta,
      userAgent,
      createdAt: existing.createdAt || serverTimestamp(),
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
    [`tokensMeta.${token}`]: deleteField(),
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
