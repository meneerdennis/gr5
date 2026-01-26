const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");
const envLocalPath = path.join(rootDir, ".env.local");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

const requiredKeys = [
  "REACT_APP_FIREBASE_API_KEY",
  "REACT_APP_FIREBASE_AUTH_DOMAIN",
  "REACT_APP_FIREBASE_PROJECT_ID",
  "REACT_APP_FIREBASE_STORAGE_BUCKET",
  "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
  "REACT_APP_FIREBASE_APP_ID",
];

const missing = requiredKeys.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.warn(
    `Missing Firebase env vars: ${missing.join(", ")}. The messaging service worker will not initialize.`,
  );
}

const config = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "",
};

const outPath = path.join(rootDir, "public", "firebase-config.js");
const content = `// Auto-generated from .env/.env.local. Do not edit manually.\nself.__FIREBASE_CONFIG__ = ${JSON.stringify(
  config,
  null,
  2,
)};\n`;

fs.writeFileSync(outPath, content, "utf8");
console.log(`Firebase messaging config written to ${outPath}`);
