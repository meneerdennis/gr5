import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/modern.css";
import "./styles/mobile-travel-journal-fix.css";

// Register service worker for caching (but keep Firebase messaging worker).
// Defer registration to idle time to avoid competing with LCP on slow mobile.
if ("serviceWorker" in navigator) {
  const registerSW = () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service worker registered for caching:", registration);
      })
      .catch((error) => {
        console.log("Service worker registration failed:", error);
      });

    // Clean up legacy service workers, but keep the Firebase messaging worker
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        const scriptUrl = registration?.active?.scriptURL || "";
        if (
          !scriptUrl.includes("firebase-messaging-sw.js") &&
          !scriptUrl.includes("sw.js")
        ) {
          registration.unregister();
        }
      });
    });
  };

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    try {
      window.requestIdleCallback(registerSW, { timeout: 3000 });
    } catch (e) {
      // Fallback to delayed registration
      window.addEventListener("load", () => setTimeout(registerSW, 1500));
    }
  } else {
    // Older browsers: register shortly after load
    window.addEventListener("load", () => setTimeout(registerSW, 1500));
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
