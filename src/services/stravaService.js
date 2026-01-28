import { getHikesFromFirebase } from "./firebaseService";

export async function getStravaHikes(options = {}) {
  try {
    const {
      limit = null,
      useCache = true,
      cacheTtlMs = 5 * 60 * 1000,
    } = options;
    const hikes = await getHikesFromFirebase(limit, { useCache, cacheTtlMs });

    // Convert Firebase data to expected format
    return hikes.map((hike) => ({
      id: hike.id || hike.stravaId,
      stravaId: hike.stravaId,
      distanceKm: hike.distanceKm,
      startDate: hike.startDate,
      type: hike.type,
      name: hike.name,
      description: hike.description,
      commentsCount: hike.commentsCount || 0,
      polyline: normalizePolyline(hike.polyline),
      latlng: hike.latlng || [],
      altitude: hike.altitude || [],
      time: hike.time || [],
      photos: hike.photos || [],
      note: hike.note || "",
      start: hike.start || "",
      end: hike.end || "",
    }));
  } catch (error) {
    console.error("Error fetching hikes:", error);
    // Return empty array on error instead of mock data
    return [];
  }
}

function normalizePolyline(polyline) {
  if (!polyline) return [];

  if (Array.isArray(polyline)) {
    if (polyline.length === 0) return [];
    const first = polyline[0];
    if (Array.isArray(first) && typeof first[0] === "number") {
      return polyline;
    }
    if (first && typeof first === "object") {
      if (typeof first.lat === "number" && typeof first.lng === "number") {
        return polyline.map((point) => [point.lat, point.lng]);
      }
      if (
        Array.isArray(first.coordinates) &&
        typeof first.coordinates[0] === "number"
      ) {
        return polyline.map((point) => point.coordinates);
      }
    }
  }

  if (typeof polyline === "string") {
    return decodePolyline(polyline);
  }

  console.warn("Unsupported polyline format:", polyline);
  return [];
}

// Polyline decoder function (simplified version)
function decodePolyline(encoded) {
  if (!encoded) return [];
  if (typeof encoded !== "string") return [];

  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates = [];

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}
