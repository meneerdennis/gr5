import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/modern.css";
import "./styles/mobile-travel-journal-fix.css";

// Register service worker for caching (but keep Firebase messaging worker)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(
      (registration) => {
        console.log("Service worker registered for caching:", registration);
      },
      (error) => {
        console.log("Service worker registration failed:", error);
      },
    );
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
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
