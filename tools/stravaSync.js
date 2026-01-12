// tools/stravaSync.js
//
// Haalt Strava-activiteiten op en schrijft ze naar Firestore in collectie "hikes".
// - gebruikt refresh token uit .env
// - filtert enkel activiteiten waar "GR5" in naam of beschrijving voorkomt
// - haalt GPS-streams (latlng, altitude, time) op
//
// .env moet minstens bevatten:
//
// STRAVA_CLIENT_ID=...
// STRAVA_CLIENT_SECRET=...
// STRAVA_REFRESH_TOKEN=...
// FIREBASE_PROJECT_ID=your-project-id
// GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
//
// Run met:
//   node tools/stravaSync.js
//

require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// ---- ENV-CHECKS ----------------------------------------------------------

const {
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
  STRAVA_REFRESH_TOKEN,
  FIREBASE_PROJECT_ID,
  GOOGLE_APPLICATION_CREDENTIALS,
} = process.env;

if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
  console.error(
    "❌ STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET of STRAVA_REFRESH_TOKEN ontbreken in .env"
  );
  process.exit(1);
}

if (!FIREBASE_PROJECT_ID || !GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    "❌ FIREBASE_PROJECT_ID of GOOGLE_APPLICATION_CREDENTIALS ontbreken in .env"
  );
  process.exit(1);
}

if (!fs.existsSync(GOOGLE_APPLICATION_CREDENTIALS)) {
  console.error(
    "❌ serviceAccountKey-bestand niet gevonden op pad:",
    GOOGLE_APPLICATION_CREDENTIALS
  );
  process.exit(1);
}

// ---- FIREBASE INIT ------------------------------------------------------

const serviceAccount = require(path.resolve(GOOGLE_APPLICATION_CREDENTIALS));

initializeApp({
  credential: cert(serviceAccount),
  projectId: FIREBASE_PROJECT_ID,
});

const db = getFirestore();

// ---- STRAVA: REFRESH TOKEN → ACCESS TOKEN --------------------------------

async function getAccessToken() {
  const url = "https://www.strava.com/oauth/token";
  const response = await axios.post(url, {
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    refresh_token: STRAVA_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });

  const data = response.data;
  console.log("✅ Access token verkregen");
  console.log("  Scope:", data.scope);
  console.log("  Verloopt op:", new Date(data.expires_at * 1000).toISOString());

  return data.access_token;
}

// ---- STRAVA: ACTIVITEITEN OPHALEN ---------------------------------------

async function fetchActivities(accessToken, page = 1, perPage = 30) {
  const url = "https://www.strava.com/api/v3/athlete/activities";

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        page,
        per_page: perPage,
      },
    });

    return response.data;
  } catch (err) {
    console.error("❌ Fout tijdens het ophalen van Strava-activiteiten:");
    console.error("Message:", err.message);

    if (err.response) {
      console.error("Status code:", err.response.status);
      console.error("Response data:", err.response.data);
    } else {
      console.error("⚠️ Geen response ontvangen van Strava:", err);
    }

    throw err;
  }
}

// ---- STRAVA: GPS-STREAMS (latlng, altitude, time) ------------------------

async function fetchStreams(activityId, accessToken) {
  const url = `https://www.strava.com/api/v3/activities/${activityId}/streams`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        keys: "latlng,altitude,time",
        key_by_type: true,
      },
    });

    const data = response.data || {};
    return {
      latlng: data.latlng?.data || [],
      altitude: data.altitude?.data || [],
      time: data.time?.data || [],
    };
  } catch (err) {
    console.error(
      `❌ Fout bij ophalen van streams voor activiteit ${activityId}:`,
      err.response?.data || err.message
    );
    // Geen showstopper: we geven gewoon lege arrays terug
    return { latlng: [], altitude: [], time: [] };
  }
}

// ---- SYNC LOGICA --------------------------------------------------------

async function syncHikes() {
  const accessToken = await getAccessToken();

  let page = 1;
  let totalImported = 0;

  while (true) {
    console.log(`📥 Haal activiteiten op (pagina ${page})...`);
    const activities = await fetchActivities(accessToken, page, 50);

    if (!activities.length) {
      break;
    }

    for (const act of activities) {
      // (optioneel) filter op type
      // if (act.type !== "Hike" && act.type !== "Walk") continue;

      console.log(`➡️ Verwerk activiteit: ${act.name} (${act.type})`);
      console.log(
        `   Beschrijving: "${act.description || "(geen beschrijving)"}"`
      );

      const docId = String(act.id);
      const ref = db.collection("hikes").doc(docId);

      // 📍 GPS-streams
      const streams = await fetchStreams(act.id, accessToken);

      // Alleen de delen bewaren die Firestore slikt (geen geneste arrays)

      // polyline (samengevatte route)
      const polyline =
        act.map && act.map.summary_polyline ? act.map.summary_polyline : null;

      // Copy description to note field (like AdminNoteEditor does)
      const noteContent = act.description || "";

      const hikeData = {
        stravaId: act.id,
        name: act.name,
        description: act.description || "",
        note: noteContent, // Copy description to note field
        distanceKm: act.distance ? act.distance / 1000 : null,
        movingTimeSec: act.moving_time || null,
        elapsedTimeSec: act.elapsed_time || null,
        startDate: act.start_date || null,
        type: act.type,
        polyline,
        // streams: streamsForFirestore, // ✅ geen geneste arrays meer
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Log the data structure to verify note field is present
      console.log("Data to be saved:", JSON.stringify(hikeData, null, 2));

      // Update the document with the latest data from Strava
      // Use set() without merge to ensure all fields are written
      await ref.set(hikeData);

      // Verify the document was created with the note field
      const docSnapshot = await ref.get();
      const savedData = docSnapshot.data();
      console.log(
        "Document saved with data:",
        JSON.stringify(savedData, null, 2)
      );

      if (!savedData.note) {
        console.error("❌ ERROR: Note field was not saved to Firestore!");
      } else {
        console.log(
          `✅ SUCCESS: Note field saved with value: "${savedData.note}"`
        );
      }

      console.log(`✅ Activity saved with note: "${hikeData.note}"`);
      console.log(`   Description: "${hikeData.description}"`);
      console.log(`   Note field set to: "${hikeData.note}"`);
      totalImported++;
      console.log(`✅ GR5-hike opgeslagen: ${act.name} (${docId})`);
    }

    page++;
  }

  console.log(`🎉 Klaar. Totaal geïmporteerde GR5-hikes: ${totalImported}`);
}

// ---- START SCRIPT -------------------------------------------------------

syncHikes().catch((err) => {
  console.error("❌ Fout tijdens sync:", err);
  process.exit(1);
});
