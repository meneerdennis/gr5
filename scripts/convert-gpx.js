const fs = require("fs");
const path = require("path");
const { DOMParser } = require("@xmldom/xmldom");
const tj = require("@mapbox/togeojson");
const turf = require("@turf/turf");

const gpxPath = path.join(__dirname, "..", "public", "gr5.gpx");
const outGeo = path.join(__dirname, "..", "public", "gr5.geojson");
const outRoute = path.join(__dirname, "..", "public", "gr5-route.json");
const outPolyline = path.join(__dirname, "..", "public", "gr5-polyline.txt");

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Google Maps polyline encoding function
function encodePolyline(coordinates) {
  let encoded = "";
  let prevLat = 0;
  let prevLng = 0;

  for (const coord of coordinates) {
    const lat = Math.round(coord[1] * 1e5);
    const lng = Math.round(coord[0] * 1e5);

    encoded += encodeValue(lat - prevLat);
    encoded += encodeValue(lng - prevLng);

    prevLat = lat;
    prevLng = lng;
  }

  return encoded;
}

function encodeValue(value) {
  value = value < 0 ? ~(value << 1) : value << 1;
  let encoded = "";

  while (value >= 0x20) {
    encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
    value >>= 5;
  }

  encoded += String.fromCharCode(value + 63);
  return encoded;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

try {
  console.log("Reading GPX:", gpxPath);
  const xml = fs.readFileSync(gpxPath, "utf8");
  const doc = new DOMParser().parseFromString(xml, "text/xml");

  console.log("Converting GPX to GeoJSON...");
  let geo = tj.gpx(doc);

  // If the geojson contains multiple features, keep as-is.
  // Simplify geometry to reduce file size (tolerance tuned for small change)
  try {
    const simplified = turf.simplify(geo, {
      tolerance: 0.00005,
      highQuality: false,
    });
    geo = simplified;
  } catch (e) {
    console.warn(
      "Turf simplify failed, continuing with original GeoJSON",
      e.message,
    );
  }

  // Build elevation profile by reading trkpt elements directly (preserves original ordering)
  let trkpts = doc.getElementsByTagName("trkpt");
  // Some GPX files include namespace prefixes (ns0:trkpt). Try namespaced lookup if none found.
  if (!trkpts || trkpts.length === 0) {
    trkpts = doc.getElementsByTagNameNS("*", "trkpt");
  }

  const elevationProfile = [];
  let cumulative = 0;

  for (let i = 0; i < trkpts.length; i++) {
    const pt = trkpts[i];
    const lat = parseFloat(pt.getAttribute("lat"));
    const lon = parseFloat(pt.getAttribute("lon"));
    const eleEl =
      pt.getElementsByTagName("ele")[0] ||
      pt.getElementsByTagNameNS("*", "ele")[0];
    const elevation = eleEl ? parseFloat(eleEl.textContent) : 0;

    if (elevationProfile.length > 0) {
      const prev = elevationProfile[elevationProfile.length - 1];
      cumulative += haversineKm(prev.lat, prev.lon, lat, lon);
    }

    elevationProfile.push({
      distanceKm: cumulative,
      elevationM: elevation,
      lat,
      lon,
    });
  }

  const totalDistanceKm = elevationProfile.length
    ? elevationProfile[elevationProfile.length - 1].distanceKm
    : 0;

  // Ensure GeoJSON contains a usable LineString. If togeojson didn't return a LineString
  // (namespaced GPX or non-standard input), synthesize one from the elevationProfile.
  try {
    const hasLine =
      geo &&
      ((geo.type === "FeatureCollection" &&
        geo.features &&
        geo.features.some(
          (f) =>
            f.geometry &&
            (f.geometry.type === "LineString" ||
              f.geometry.type === "MultiLineString"),
        )) ||
        geo.type === "LineString");
    if (!hasLine && elevationProfile.length) {
      geo = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { source: "generated-from-gpx" },
            geometry: {
              type: "LineString",
              coordinates: elevationProfile.map((p) => [p.lon, p.lat]),
            },
          },
        ],
      };
    }
  } catch (e) {
    console.warn("GeoJSON post-processing failed:", e.message);
  }

  fs.writeFileSync(outGeo, JSON.stringify(geo));
  fs.writeFileSync(
    outRoute,
    JSON.stringify({ elevationProfile, totalDistanceKm }),
  );

  // Generate and save polyline
  const polylineCoords = elevationProfile.map((p) => [p.lon, p.lat]);
  const polyline = encodePolyline(polylineCoords);
  fs.writeFileSync(outPolyline, polyline);

  console.log("Wrote:", outGeo);
  console.log("Wrote:", outRoute);
  console.log("Wrote:", outPolyline);
  console.log(
    "Total trkpt:",
    trkpts.length,
    "totalDistanceKm:",
    totalDistanceKm.toFixed(3),
  );
} catch (err) {
  console.error("Error converting GPX:", err);
  process.exit(1);
}
