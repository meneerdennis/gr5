require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("../serviceAccountKey.json");

const projectId =
  process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id || undefined;

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });

const db = getFirestore(app);

async function exportQuotes() {
  const snapshot = await db.collection("quotes").get();
  const quotes = snapshot.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        quote: (data.quote || "").trim(),
        author: (data.author || "").trim(),
      };
    })
    .filter((item) => item.quote && item.author);

  const outputPath = path.join(__dirname, "..", "src", "data", "quotes.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(quotes, null, 2)}\n`, "utf8");

  console.log(`Wrote ${quotes.length} quotes to ${outputPath}`);
}

exportQuotes().catch((error) => {
  console.error("Failed to export quotes:", error);
  process.exit(1);
});
