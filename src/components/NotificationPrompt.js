import React, { useEffect, useState, useRef } from "react";

const STORAGE_KEY = "gr5_notify_prompt_v1";

export default function NotificationPrompt({
  open = false,
  onClose = () => {},
}) {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [shownOnce, setShownOnce] = useState(false);
  // no collapsed icon — header bell will be used instead
  const [permissionState, setPermissionState] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const containerRef = useRef(null);

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
      if (open) setVisible(true);
      else setVisible(true);
    }, 1200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  // respond to `open` prop changes (bell click should re-open prompt even if dismissed)
  useEffect(() => {
    if (!open) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "accepted") {
        // already accepted — no need to open
        return;
      }
    } catch (e) {}
    setShownOnce(false);
    setVisible(true);
  }, [open]);

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
    try {
      onClose();
    } catch (e) {}
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

  // Click-outside handler: first click collapses, second click dismisses
  useEffect(() => {
    if (!visible) return;
    const onDocClick = (e) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target)) return; // clicked inside
      // clicked outside: dismiss immediately (header bell controls re-open)
      dismiss("dismissed");
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [visible]);

  if (shownOnce && !open) return null;

  // No collapsed icon — header bell will be used instead

  return (
    <div
      ref={containerRef}
      aria-live="polite"
      style={{
        position: "fixed",
        right: "1rem",
        top: "1.25rem",
        zIndex: 9999,
        maxWidth: "300px",
        width: "auto",
        boxSizing: "border-box",
        transition: "transform 260ms cubic-bezier(.2,.9,.2,1), opacity 260ms",
        transform: visible ? "translateY(0)" : "translateY(80%)",
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.94)",
          color: "#0f172a",
          padding: "8px 10px",
          borderRadius: "10px",
          boxShadow: "0 6px 20px rgba(2,6,23,0.2)",
          border: "1px solid rgba(15,23,42,0.04)",
          fontSize: "0.88rem",
          lineHeight: 1.15,
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
          <div style={{ fontSize: "1.1rem", lineHeight: 1 }}>🔔</div>
          <div style={{ flex: 1 }}>
            <div
              style={{ fontWeight: 700, marginBottom: 4, fontSize: "0.95rem" }}
            >
              Updates about new hikes
            </div>
            <div
              style={{ color: "#334155", marginBottom: 8, fontSize: "0.84rem" }}
            >
              Get short updates about new hikes and route changes. Add to your
              home screen for a better mobile experience.
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                onClick={enableNotifications}
                style={{
                  padding: "6px 8px",
                  background: "#8b5cf6",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                }}
              >
                Enable
              </button>

              <button
                onClick={handleInstall}
                style={{
                  padding: "6px 8px",
                  background: "transparent",
                  color: "#0f172a",
                  border: "1px solid rgba(15,23,42,0.06)",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                }}
              >
                Install
              </button>

              <button
                onClick={() => dismiss("dismissed")}
                style={{
                  padding: "6px 8px",
                  background: "transparent",
                  color: "#64748b",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "0.85rem",
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
