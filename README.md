# GR5 Webapp – Hoek van Holland → Nice

Dit is een eenvoudige React-webapp (Create React App) om je GR5-wandeling te visualiseren:

- Overzichtskaart met de GR5-route
- Foto-markers op de kaart (via Polarsteps-data)
- Hoogteprofiel van de volledige route
- Progress bar met hoeveel % je al gewandeld hebt
- Voorbereid op hosting via GitHub Pages
- Voorbereid op gebruik van Firebase / Firestore als databron

---

## 1. Installatie

```bash
npm install
```

Start de development-server:

```bash
npm start
```

De app draait dan normaal op `http://localhost:3000`.

---

## 2. GitHub Pages inzetten

In `package.json` staat een `homepage`-veld:

```json
"homepage": "https://<username>.github.io/<repo-name>"
```

Vervang:

- `<username>` door je GitHub-gebruikersnaam
- `<repo-name>` door de naam van de repo (bijv. `gr5-app`)

Daarna:

```bash
npm run deploy
```

Dit:

1. Bouwt de app naar de `build/` map
2. Publiceert de inhoud naar de `gh-pages` branch
3. Je site staat dan op de `homepage`-URL

Vergeet niet op GitHub bij **Settings → Pages** de **Source** op `gh-pages` (branch) te zetten.

---

## 3. Firebase & Firestore

### 3.1. Firebase-configuratie

1. Maak een Firebase-project in de Firebase console.
2. Voeg een web-app toe en kopieer de configuratie (apiKey, authDomain, …).
3. Maak in de root van je project een `.env.local` bestand:

```env
REACT_APP_FIREBASE_API_KEY=YOUR_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
REACT_APP_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=XXXXXXX
REACT_APP_FIREBASE_APP_ID=1:XXXXXXX:web:YYYYYYYY
```

4. In `src/services/firebase.js` wordt deze config gebruikt.

> Let op: variabelen moeten met `REACT_APP_` beginnen om zichtbaar te zijn in de frontend.

### 3.2. Firestore-structuur (voorbeeld)

Een mogelijke structuur:

- **routes**
  - `gr5`
    - `polyline`: array van `[lat, lng]`
    - `totalDistanceKm`: number
    - `elevationProfile`: array van `{ distanceKm, elevationM }`

- **hikes**
  - document per Strava-activiteit
    - `stravaId`
    - `distanceKm`
    - `startDate`
    - `polyline`

- **photos**
  - document per foto
    - `lat`
    - `lng`
    - `url`
    - `caption`
    - `date`

In de frontend kun je dan bijvoorbeeld:

```js
// pseudo-code
const routesRef = collection(db, "routes");
const gr5Doc = await getDoc(doc(routesRef, "gr5"));
```

De huidige code gebruikt nog **dummy-data** in `routeService.js`, `stravaService.js`, `polarstepsService.js`.  
Je kunt die stap voor stap vervangen door echte Firestore-queries.

---

## 4. Strava → Firestore synchronisatiescript (Node)

In de map `tools/` zit een voorbeeldscript `stravaSync.js` dat:

1. Strava-activiteiten ophaalt via de Strava API
2. Enkel wandelingen filtert (type: `Walk` / `Hike`)
3. Ze schrijft naar de `hikes`-collectie in Firestore

### 4.1. Benodigde environment-variabelen

Maak een `.env` bestand in de root voor het **Node-script** (dit wordt niet door CRA gebruikt maar door Node):

```env
# Strava
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
STRAVA_REFRESH_TOKEN=...

# Firebase Admin
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
```

- `STRAVA_REFRESH_TOKEN` haal je uit de Strava API instellingen (je maakt een app op Strava).
- `serviceAccountKey.json` download je via Firebase console → Service accounts → Generate new private key.

### 4.2. Script draaien

```bash
node tools/stravaSync.js
```

Dit script:

- Vraagt een access token aan Strava via de refresh token
- Haalt een lijst van activiteiten op
- Slaat ze op in Firestore

Je kunt dit bv. manueel runnen wanneer je wilt syncen, of later automatiseren (GitHub Action / cronjob / Cloud Function).

---

## 5. Polarsteps → Firestore

Polarsteps heeft geen officiële publieke API. Typisch doe je:

1. Je data exporteren uit Polarsteps (JSON / GPX / foto’s).
2. Een eigen script schrijven dat:
   - alle stops / foto’s inleest,
   - de GPS-coördinaten uit de export haalt,
   - per foto een document schrijft naar de `photos`-collectie in Firestore.

Je kunt daarbij het voorbeeld van `tools/stravaSync.js` hergebruiken,
maar dan met data uit je export in plaats van uit Strava.

---

## 6. Frontend – hoe de data gebruikt wordt

- `useHikeData` laad alle data (route, hikes, photos) in één hook.
- `App.js`:
  - toont een titel,
  - progress bar (percentage gewandelde km),
  - SVG-hoogteprofiel met een lijn waar je momenteel bent,
  - een Leaflet-kaart met:
    - Polyline voor de GR5-route
    - Markers op de foto-locaties

Zodra je de services (`routeService`, `stravaService`, `polarstepsService`) koppelt aan Firestore, zie je de **echte** data verschijnen zonder dat je de UI moet herschrijven.

---

## 7. Belangrijke bestanden (overzicht)

- `src/App.js` – hoofdcomponent, combineert alles
- `src/hooks/useHikeData.js` – laadt alle data
- `src/components/Layout.js` – page layout
- `src/components/ProgressBar.js` – horizontale voortgangsbalk
- `src/components/ElevationProfile.js` – hoogteprofiel (SVG)
- `src/components/MapView.js` – kaart + route + markers
- `src/components/PhotoMarkerPopup.js` – layout van een popup met foto
- `src/services/routeService.js` – routegegevens (nu dummy)
- `src/services/stravaService.js` – Strava-data (nu dummy)
- `src/services/polarstepsService.js` – Polarsteps-data (nu dummy)
- `src/services/firebase.js` – Firebase-init (frontend)
- `tools/stravaSync.js` – Node-script om Strava → Firestore te syncen

---

Veel wandel- en codeplezier! 🚶‍♂️🗺️  
Als je wil, kan ik ook helpen met: testen, typechecking (TypeScript), of het ombouwen naar een PWA zodat je de app offline op je smartphone kan gebruiken.
