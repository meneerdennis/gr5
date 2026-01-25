import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/modern.css";
import "./styles/mobile-travel-journal-fix.css";

// Explicitly unregister any previous service workers to avoid client-side hangs
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
