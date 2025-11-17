// tools/stravaSync.js
//
// Node-script om Strava-activiteiten op te halen
// en in Firestore te schrijven onder de collectie "hikes".
//
// Gebruik:
//   1. Maak een .env bestand in de root met:
//        STRAVA_CLIENT_ID=...
//        STRAVA_CLIENT_SECRET=...
//        STRAVA_REFRESH_TOKEN=...
//        FIREBASE_PROJECT_ID=your-project-id
//        GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
//   2. Download serviceAccountKey.json via Firebase Console
//   3. Voer uit met: node tools/stravaSync.js
//
// Dit is een basisraamwerk – pas filters, mapping en validatie aan
// aan je eigen wensen.
//

require('dotenv').config();
const axios = require('axios');
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const {
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
  STRAVA_REFRESH_TOKEN,
  FIREBASE_PROJECT_ID,
  GOOGLE_APPLICATION_CREDENTIALS,
} = process.env;

if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
  console.error('❌ STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET of STRAVA_REFRESH_TOKEN ontbreken in .env');
  process.exit(1);
}

if (!FIREBASE_PROJECT_ID || !GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('❌ FIREBASE_PROJECT_ID of GOOGLE_APPLICATION_CREDENTIALS ontbreken in .env');
  process.exit(1);
}

if (!fs.existsSync(GOOGLE_APPLICATION_CREDENTIALS)) {
  console.error('❌ serviceAccountKey-bestand niet gevonden op pad:', GOOGLE_APPLICATION_CREDENTIALS);
  process.exit(1);
}

const serviceAccount = require(require('path').resolve(GOOGLE_APPLICATION_CREDENTIALS));

initializeApp({
  credential: cert(serviceAccount),
  projectId: FIREBASE_PROJECT_ID,
});

const db = getFirestore();

// 1. Refresh token omzetten naar access token
async function getAccessToken() {
  const url = 'https://www.strava.com/oauth/token';
  const response = await axios.post(url, {
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    refresh_token: STRAVA_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });
  return response.data.access_token;
}

// 2. Activiteiten ophalen
async function fetchActivities(accessToken, page = 1, perPage = 30) {
  const url = 'https://www.strava.com/api/v3/athlete/activities';
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
}

// 3. Activiteiten filteren + naar Firestore schrijven
async function syncHikes() {
  const accessToken = await getAccessToken();
  console.log('✅ Access token verkregen');

  let page = 1;
  let totalImported = 0;

  while (true) {
    console.log(`📥 Haal activiteiten op (pagina ${page})...`);
    const activities = await fetchActivities(accessToken, page, 50);

    if (!activities.length) {
      break;
    }

    for (const act of activities) {
      // Filter op type – pas aan naar wens (bijv. 'Walk', 'Hike')
      if (act.type !== 'Walk' && act.type !== 'Hike') continue;

      const docId = String(act.id);
      const ref = db.collection('hikes').doc(docId);

      // polyline (samengevatte route)
      const polyline = act.map && act.map.summary_polyline ? act.map.summary_polyline : null;

      const hikeData = {
        stravaId: act.id,
        name: act.name,
        distanceKm: act.distance / 1000,
        movingTimeSec: act.moving_time,
        startDate: act.start_date,
        type: act.type,
        polyline, // TODO: decode naar lat/lngs als je dat nodig hebt
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await ref.set(hikeData, { merge: true });
      totalImported++;
      console.log(`✅ Hike opgeslagen: ${act.name} (${docId})`);
    }

    page++;
  }

  console.log(`🎉 Klaar. Totaal geïmporteerde hikes: ${totalImported}`);
}

syncHikes().catch(err => {
  console.error('❌ Fout tijdens sync:', err);
  process.exit(1);
});
