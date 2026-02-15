/*
  scripts/emulator-read-test.js
  - Connects to the Firestore emulator (default localhost:8080)
  - Seeds sample data if empty
  - Runs a set of realistic scenarios (initial load, tab-switch cycles, comment polling, full refresh)
  - Reports document-read counts (by counting documents returned) and API-call counts

  Usage:
    1) Start the Firestore emulator: `firebase emulators:start --only firestore`
    2) Run this script: `node scripts/emulator-read-test.js`

  Note: this is a local/emulator tool for profiling. It approximates the number
  of document reads produced by the app's queries and is useful to compare
  before/after changes.
*/

const admin = require("firebase-admin");

// Default emulator host/port if not already set by caller
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";

const PROJECT_ID = process.env.FIRESTORE_PROJECT_ID || "gr5-emulator";

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

const counters = {
  docsRead: 0,
  getDocsCalls: 0,
  getDocCalls: 0,
};

function resetCounters() {
  counters.docsRead = 0;
  counters.getDocsCalls = 0;
  counters.getDocCalls = 0;
}

function recordQuerySnapshot(snap) {
  counters.getDocsCalls += 1;
  counters.docsRead += snap.size || 0;
}

function recordGetDoc(snap) {
  counters.getDocCalls += 1;
  // In admin SDK DocumentSnapshot.exists is a boolean property
  counters.docsRead += snap.exists ? 1 : 0;
}

async function seedIfEmpty() {
  const sampleCheck = await db.collection("hikes").limit(1).get();
  if (!sampleCheck.empty) return;

  console.log(
    "Seeding emulator with sample data: 200 hikes, 500 photos, comment counts, meta docs...",
  );

  // Batch seed hikes + photos + comment counts
  const batch = db.batch();
  const HIKES = 200;
  const PHOTOS = 500;

  for (let i = 1; i <= HIKES; i++) {
    const id = `hike-${i}`;
    const ref = db.collection("hikes").doc(id);
    batch.set(ref, {
      name: `Hike ${i}`,
      startDate: new Date(Date.now() - i * 86400000).toISOString(),
      distanceKm: Number((Math.random() * 30).toFixed(1)),
      commentsCount: Math.floor(Math.random() * 30),
      lat: [51.9 + Math.random() * 2],
      lng: [4.1 + Math.random() * 3],
    });

    const ccRef = db.collection("hikeCommentCounts").doc(id);
    batch.set(ccRef, { count: Math.floor(Math.random() * 20) });
  }

  // photos (attach to hikes round-robin)
  for (let j = 1; j <= PHOTOS; j++) {
    const id = `photo-${j}`;
    const hikeId = `hike-${(j % HIKES) + 1}`;
    const ref = db.collection("photos").doc(id);
    batch.set(ref, {
      uploadedAt: Date.now() - j * 1000,
      lat: 50 + Math.random(),
      lng: 4 + Math.random(),
      url: `https://example.local/${id}.jpg`,
      hikeId,
      caption: `Photo ${j}`,
    });
  }

  // meta docs
  const metaHikesRef = db.collection("meta").doc("hikesLatestChange");
  batch.set(metaHikesRef, {
    id: "hike-1",
    type: "added",
    timestamp: Date.now(),
  });
  const metaPhotosRef = db.collection("meta").doc("photosLatestChange");
  batch.set(metaPhotosRef, {
    id: "photo-1",
    type: "added",
    uploadedAt: Date.now(),
    timestamp: Date.now(),
  });
  const metaCommentsRef = db.collection("meta").doc("commentsLatestChange");
  batch.set(metaCommentsRef, {
    id: "hike-1",
    type: "added",
    timestamp: Date.now(),
  });

  await batch.commit();
  console.log("Seeding finished.");
}

async function scenario_initialLoad() {
  // initial app load: load hikes (limit 10) + some photos (limit 100)
  const hikesSnap = await db
    .collection("hikes")
    .orderBy("startDate", "asc")
    .limit(10)
    .get();
  recordQuerySnapshot(hikesSnap);

  const photosSnap = await db.collection("photos").limit(100).get();
  recordQuerySnapshot(photosSnap);
}

async function scenario_tabSwitchCycle() {
  // Each attach of the cheap listeners in the app reads the top doc(s)
  const topHikeSnap = await db
    .collection("hikes")
    .orderBy("startDate", "desc")
    .limit(1)
    .get();
  recordQuerySnapshot(topHikeSnap);

  const topPhotoSnap = await db
    .collection("photos")
    .orderBy("uploadedAt", "desc")
    .limit(1)
    .get();
  recordQuerySnapshot(topPhotoSnap);

  const metaHikeSnap = await db
    .collection("meta")
    .doc("hikesLatestChange")
    .get();
  recordGetDoc(metaHikeSnap);

  const metaPhotoSnap = await db
    .collection("meta")
    .doc("photosLatestChange")
    .get();
  recordGetDoc(metaPhotoSnap);
}

// TTL-aware simulation: track last fetch time and optionally skip fetches when recent
let lastCommentCountsFetchAt = 0;
const COMMENT_VISIBILITY_TTL_MS = 90 * 1000; // 90s (matches client-side guard)

async function scenario_pollComments() {
  const countsSnap = await db.collection("hikeCommentCounts").get();
  recordQuerySnapshot(countsSnap);
}

// Guarded version that simulates the client-side TTL/cooldown we added in useHikeData
async function scenario_pollComments_guarded() {
  const now = Date.now();
  if (now - lastCommentCountsFetchAt < COMMENT_VISIBILITY_TTL_MS) {
    // Simulate a skipped visibility-triggered fetch (no reads)
    return;
  }
  const countsSnap = await db.collection("hikeCommentCounts").get();
  recordQuerySnapshot(countsSnap);
  lastCommentCountsFetchAt = Date.now();
}

async function scenario_getHikeById(randomHikeId) {
  const snap = await db.collection("hikes").doc(randomHikeId).get();
  recordGetDoc(snap);
}

// Simulate receiving a comments meta-doc change then fetching the single comment-count doc
async function scenario_commentMetaChange() {
  const metaSnap = await db
    .collection("meta")
    .doc("commentsLatestChange")
    .get();
  recordGetDoc(metaSnap);
  const ccSnap = await db.collection("hikeCommentCounts").doc("hike-1").get();
  recordGetDoc(ccSnap);
}

async function scenario_fullRefresh() {
  const hikesSnap = await db.collection("hikes").get();
  recordQuerySnapshot(hikesSnap);
  const photosSnap = await db.collection("photos").get();
  recordQuerySnapshot(photosSnap);
}

async function runScenario(name, fn, iterations = 5, pauseMs = 250) {
  resetCounters();
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    await fn();
    if (pauseMs) await new Promise((r) => setTimeout(r, pauseMs));
  }
  const duration = Date.now() - start;
  console.log("\n---", name, `(${iterations} runs)`);
  console.log(
    `docsRead: ${counters.docsRead} | getDocsCalls: ${counters.getDocsCalls} | getDocCalls: ${counters.getDocCalls} | duration: ${duration}ms`,
  );
  console.log(
    `avg docs/read per run: ${(counters.docsRead / iterations).toFixed(2)}`,
  );
}

async function main() {
  console.log(
    "Emulator read-test — connecting to Firestore emulator at:",
    process.env.FIRESTORE_EMULATOR_HOST,
  );
  try {
    // Basic connectivity check
    await db.collection("__emulator_check").limit(1).get();
  } catch (err) {
    console.error(
      "Cannot reach Firestore emulator. Start it with: firebase emulators:start --only firestore",
    );
    console.error(err.message);
    process.exit(1);
  }

  // Seed data if empty
  await seedIfEmpty();

  // Pick a random hike id for single-doc reads
  const someHikeSnap = await db.collection("hikes").limit(1).get();
  const someHikeId = someHikeSnap.docs[0].id;

  // Run scenarios
  await runScenario("initialLoad", scenario_initialLoad, 5, 200);
  await runScenario(
    "tabSwitch (simulate attach/detach)",
    scenario_tabSwitchCycle,
    20,
    100,
  );
  await runScenario(
    "pollComments (visibility-triggered)",
    scenario_pollComments,
    3,
    200,
  );
  // Simulate the new client-side guard (TTL) to show reduced reads
  await runScenario(
    "pollComments (guarded, TTL=90s)",
    scenario_pollComments_guarded,
    3,
    200,
  );
  await runScenario(
    "commentMetaChange (meta + single count fetch)",
    scenario_commentMetaChange,
    5,
    150,
  );
  await runScenario(
    "getHikeById (single fetch)",
    () => scenario_getHikeById(someHikeId),
    10,
    50,
  );
  await runScenario(
    "fullRefresh (all hikes+photos)",
    scenario_fullRefresh,
    2,
    500,
  );

  console.log(
    "\nDone. Use these numbers to compare before/after applying optimizations.",
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
