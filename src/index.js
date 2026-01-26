import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/modern.css";
import "./styles/mobile-travel-journal-fix.css";

// Clean up legacy service workers, but keep the Firebase messaging worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      const scriptUrl = registration?.active?.scriptURL || "";
      if (!scriptUrl.includes("firebase-messaging-sw.js")) {
        registration.unregister();
      }
    });
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
