import { useCallback, useEffect, useState } from "react";
import {
  initializeMessaging,
  isMessagingSupported,
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
  const [messagingSupported, setMessagingSupported] = useState(true);
  const [supportReason, setSupportReason] = useState("");

  const isIosBrowser = () => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    const isiOS = /iPad|iPhone|iPod/.test(ua);
    const isMacTouch = ua.includes("Mac") && "ontouchend" in document;
    return isiOS || isMacTouch;
  };

  const isStandalonePwa = () => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator?.standalone === true
    );
  };

  const subscribeForNotifications = useCallback(async () => {
    try {
      setError(null);

      if (isIosBrowser() && !isStandalonePwa()) {
        setMessagingSupported(false);
        setSupportReason("");
        setTokenReady(false);
        return { granted: false, reason: "unsupported" };
      }

      const supported = await isMessagingSupported();
      setMessagingSupported(supported);
      if (!supported) {
        setSupportReason(
          "Push notifications are not supported on this browser (iOS Safari requires an installed PWA).",
        );
        setTokenReady(false);
        return { granted: false, reason: "unsupported" };
      }
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
    if (isIosBrowser() && !isStandalonePwa()) {
      setMessagingSupported(false);
      setSupportReason("");
      return;
    }

    if (typeof Notification === "undefined") {
      setMessagingSupported(false);
      setSupportReason("Push notifications are not supported on this browser.");
      return;
    }

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
    messagingSupported,
    supportReason,
  };
}
