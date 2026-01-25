// src/hooks/useNotifications.js
import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import {
  registerServiceWorkerAndGetToken,
  saveFCMToken,
  removeFCMToken,
  requestNotificationPermission,
} from "../services/notificationService";

export function useNotifications() {
  const { user } = useAuth();
  const [tokenReady, setTokenReady] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    Notification?.permission || "default",
  );

  useEffect(() => {
    if (!user) return;

    const initializeNotifications = async () => {
      try {
        // Request permission
        const permissionResult = await requestNotificationPermission();
        setNotificationPermission(Notification?.permission || "default");

        if (!permissionResult.granted) {
          console.log("Notifications not available:", permissionResult.reason);
          return;
        }

        // Register service worker and get token
        const token = await registerServiceWorkerAndGetToken();

        if (token) {
          // Save token to Firestore
          await saveFCMToken(user.uid, token);
          setTokenReady(true);
          console.log("Notifications initialized successfully");
        }
      } catch (error) {
        console.error("Error initializing notifications:", error);
      }
    };

    initializeNotifications();

    // Cleanup on logout
    return () => {
      if (user) {
        removeFCMToken(user.uid).catch((error) => {
          console.error("Error removing FCM token on logout:", error);
        });
      }
    };
  }, [user]);

  return {
    tokenReady,
    notificationPermission,
    canReceiveNotifications: notificationPermission === "granted" && tokenReady,
  };
}
