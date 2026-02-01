# GPX → GeoJSON conversion

Deze korte README beschrijft het conversie-script dat GPX-bestanden converteert naar GeoJSON en een precomputede route JSON met hoogtedata.

Waarom

- De conversie wordt nu handmatig uitgevoerd omdat `gr5.gpx` vrijwel nooit verandert. Dit voorkomt onnodige werk tijdens `npm run build` en deploys.

Wat gebeurt er

- `scripts/convert-gpx.js` leest `public/gr5.gpx` en schrijft twee bestanden:
  - `public/gr5.geojson` (LineString of FeatureCollection)
  - `public/gr5-route.json` (elevationProfile + totalDistanceKm)

Hoe te gebruiken

1. Lokale conversie:

```bash
npm run convert-gpx
```

2. Bouw en deploy zoals gewoonlijk:

```bash
npm run build
npm run deploy
```

Opmerkingen

- De build is aangepast zodat conversie niet automatisch meer wordt uitgevoerd. Als je wilt dat de conversie weer automatisch draait, voeg `node scripts/convert-gpx.js` terug in `prebuild` in `package.json`.
- Het `gr5-route.json` bestand kan behoorlijk groot zijn (hoogteresolutie). Als je bestandsgrootte wilt verminderen kun je het script aanpassen om te resample of te comprimeren voordat je het commit of uitrolt.

Als je wilt, voeg ik een optionele `--force` vlag toe zodat je de conversie forceren kunt, en/of een checksomme-control om alleen te converteren wanneer `gr5.gpx` wijzigen detecteert.
