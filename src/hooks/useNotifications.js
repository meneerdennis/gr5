import { useCallback, useEffect, useState } from "react";
import {
  initializeMessaging,
  registerServiceWorkerAndGetToken,
  saveFCMToken,
  requestNotificationPermission,
} from "../services/notificationService";

export function useNotifications() {
  const [tokenReady, setTokenReady] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [error, setError] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);

  const subscribeForNotifications = useCallback(async () => {
    try {
      setError(null);
      const permission = await requestNotificationPermission();
      setNotificationPermission(
        permission.granted ? "granted" : permission.reason || "default",
      );

      if (!permission.granted) {
        setTokenReady(false);
        return { granted: false, reason: permission.reason };
      }

      await initializeMessaging((payload) => {
        setLastMessage(payload || null);
        const title = payload?.notification?.title || "New update";
        const body = payload?.notification?.body || "";
        if (Notification.permission === "granted") {
          new Notification(title, {
            body,
            icon: payload?.notification?.icon,
          });
        }
      });

      const result = await registerServiceWorkerAndGetToken();
      const token = result?.token || "";
      await saveFCMToken(token);
      setTokenReady(Boolean(token));
      return { granted: true };
    } catch (err) {
      console.error("Notification setup failed:", err);
      setError(err.message);
      setTokenReady(false);
      return { granted: false, reason: err.message };
    }
  }, []);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setNotificationPermission(Notification.permission);

    if (Notification.permission === "granted") {
      subscribeForNotifications();
    }
  }, [subscribeForNotifications]);

  return {
    tokenReady,
    notificationPermission,
    canReceiveNotifications: notificationPermission === "granted",
    subscribeForNotifications,
    error,
    lastMessage,
  };
}
