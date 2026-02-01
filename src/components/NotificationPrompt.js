import React, { useEffect, useState } from "react";

const STORAGE_KEY = "gr5_notify_prompt_v1";

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [shownOnce, setShownOnce] = useState(false);
  const [permissionState, setPermissionState] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "dismissed" || stored === "accepted") {
        setShownOnce(true);
        return;
      }
    } catch (e) {
      // ignore storage errors
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const timer = setTimeout(() => {
      setVisible(true);
    }, 1200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermissionState(Notification.permission);
  }, []);

  const dismiss = (mark = "dismissed") => {
    try {
      localStorage.setItem(STORAGE_KEY, mark);
    } catch (e) {}
    setVisible(false);
    setShownOnce(true);
  };

  const enableNotifications = async () => {
    if (typeof Notification === "undefined") {
      alert("Notifications are not supported in this browser.");
      dismiss();
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermissionState(result);
      if (result === "granted") {
        try {
          new Notification("Thanks — you'll be kept up to date!", {
            body: "We'll let you know about new hikes and updates.",
            silent: true,
          });
        } catch (e) {
          // ignore contexts where a Service Worker is required
        }
        dismiss("accepted");
      } else {
        dismiss("dismissed");
      }
    } catch (e) {
      console.error("Notification permission request failed", e);
      dismiss("dismissed");
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          dismiss("accepted");
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      alert(
        "To install: on iOS, tap Share → Add to Home Screen. On Android (Chrome), open the menu → Add to Home screen.",
      );
      dismiss();
    }
  };

  if (shownOnce) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        right: "1.25rem",
        bottom: "1.25rem",
        zIndex: 9999,
        maxWidth: "360px",
        width: "calc(100% - 2.5rem)",
        boxSizing: "border-box",
        transition: "transform 360ms cubic-bezier(.2,.9,.2,1), opacity 300ms",
        transform: visible ? "translateY(0)" : "translateY(120%)",
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.96)",
          color: "#0f172a",
          padding: "12px 14px",
          borderRadius: "12px",
          boxShadow: "0 8px 30px rgba(2,6,23,0.35)",
          border: "1px solid rgba(15,23,42,0.06)",
          fontSize: "0.95rem",
          lineHeight: 1.2,
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <div style={{ fontSize: "1.4rem" }}>🔔</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Keep up to date with new hikes</div>
            <div style={{ color: "#334155", marginBottom: 10, fontSize: "0.9rem" }}>
              Receive quick updates about new hikes and route changes. You can also
              add this app to your home screen for a better mobile experience.
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={enableNotifications}
                style={{
                  padding: "8px 10px",
                  background: "#8b5cf6",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Enable Notifications
              </button>

              <button
                onClick={handleInstall}
                style={{
                  padding: "8px 10px",
                  background: "transparent",
                  color: "#0f172a",
                  border: "1px solid rgba(15,23,42,0.08)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Install App
              </button>

              <button
                onClick={() => dismiss("dismissed")}
                style={{
                  padding: "8px 10px",
                  background: "transparent",
                  color: "#64748b",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
                aria-label="Close"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
