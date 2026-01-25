// src/services/notificationService.js
import { app } from "./firebase";
import { db } from "./firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

let messaging = null;

// Initialize Firebase Cloud Messaging (only for PWA users, not admins)
export const initializeMessaging = async () => {
  try {
    // Dynamically import messaging only when needed
    const { getMessaging, getToken, onMessage } =
      await import("firebase/messaging");

    // Check if service workers are supported
    if (!("serviceWorker" in navigator)) {
      console.warn("Service Workers not supported in this browser");
      return null;
    }

    // Check if notifications are allowed
    if (Notification.permission === "denied") {
      console.warn("Notifications are blocked by the browser");
      return null;
    }

    messaging = getMessaging(app);

    // Handle foreground messages
    onMessage(messaging, (payload) => {
      console.log("Foreground notification received:", payload);

      // Show notification if the app is focused
      if (Notification.permission === "granted") {
        const notificationTitle =
          payload.notification?.title || "GR5 Notification";
        const notificationOptions = {
          body: payload.notification?.body || "New update available",
          icon: "/hiker.png",
          badge: "/hikersmall.png",
          tag: payload.data?.hikeId || "gr5-notification",
          data: payload.data || {},
        };

        // Only show if browser window is active
        if (document.hidden) {
          new Notification(notificationTitle, notificationOptions);
        }
      }
    });

    return messaging;
  } catch (error) {
    console.error("Error initializing messaging:", error);
    return null;
  }
};

// Register service worker and get FCM token
export const registerServiceWorkerAndGetToken = async () => {
  try {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service Workers not supported");
      return null;
    }

    // Register the service worker
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    console.log("Service Worker registered:", registration);

    // Initialize messaging
    if (!messaging) {
      await initializeMessaging();
    }

    if (!messaging) {
      console.warn("Firebase Messaging not initialized");
      return null;
    }

    // Request notification permission
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("Notification permission not granted");
        return null;
      }
    } else if (Notification.permission === "denied") {
      console.warn("Notifications are denied");
      return null;
    }

    // Dynamically import getToken only when needed
    const { getToken } = await import("firebase/messaging");

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FCM_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("FCM Token obtained:", token);
      return token;
    } else {
      console.warn("No FCM token obtained");
      return null;
    }
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

// Save FCM token to Firestore
export const saveFCMToken = async (userId, token) => {
  if (!token || !userId) return;

  try {
    const tokenRef = doc(db, "userTokens", userId);
    await setDoc(
      tokenRef,
      {
        tokens: [token],
        updatedAt: new Date(),
        userAgent: navigator.userAgent,
      },
      { merge: true },
    );
    console.log("FCM token saved to Firestore");
  } catch (error) {
    console.error("Error saving FCM token:", error);
  }
};

// Get all user FCM tokens for sending notifications
export const getAllUserTokens = async () => {
  try {
    const tokensSnapshot = await getDocs(collection(db, "userTokens"));
    const tokens = [];

    tokensSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.tokens && Array.isArray(data.tokens)) {
        tokens.push(...data.tokens);
      }
    });

    return tokens;
  } catch (error) {
    console.error("Error getting user tokens:", error);
    return [];
  }
};

// Remove FCM token from Firestore
export const removeFCMToken = async (userId) => {
  if (!userId) return;

  try {
    const tokenRef = doc(db, "userTokens", userId);
    await deleteDoc(tokenRef);
    console.log("FCM token removed from Firestore");
  } catch (error) {
    console.error("Error removing FCM token:", error);
  }
};

// Send notification via backend cloud function
export const sendHikeNotification = async (hikeId, hikeName, message) => {
  try {
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User must be logged in to send notifications");
    }

    const functions = getFunctions(app, "us-central1");
    const sendNotification = httpsCallable(functions, "sendHikeNotification");

    const result = await sendNotification({
      hikeId,
      hikeName,
      message,
      timestamp: new Date().toISOString(),
    });

    return { success: true, result: result.data };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, error: error.message };
  }
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    return { granted: false, reason: "Notifications not supported" };
  }

  if (Notification.permission === "granted") {
    return { granted: true };
  }

  if (Notification.permission === "denied") {
    return {
      granted: false,
      reason: "User denied notification permission",
    };
  }

  try {
    const permission = await Notification.requestPermission();
    return { granted: permission === "granted" };
  } catch (error) {
    return { granted: false, reason: error.message };
  }
};
