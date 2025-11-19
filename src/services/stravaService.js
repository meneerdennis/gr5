import { getHikesFromFirebase } from "./firebaseService";

export async function getStravaHikes() {
  try {
    const hikes = await getHikesFromFirebase();

    // Convert Firebase data to expected format
    return hikes.map((hike) => ({
      id: hike.id || hike.stravaId,
      stravaId: hike.stravaId,
      distanceKm: hike.distanceKm,
      startDate: hike.startDate,
      type: hike.type,
      name: hike.name,
      description: hike.description,
      polyline: hike.polyline ? decodePolyline(hike.polyline) : [],
      latlng: hike.latlng || [],
      altitude: hike.altitude || [],
      time: hike.time || [],
      photos: hike.photos || [],
    }));
  } catch (error) {
    console.error("Error fetching hikes:", error);
    // Return empty array on error instead of mock data
    return [];
  }
}

// Polyline decoder function (simplified version)
function decodePolyline(encoded) {
  if (!encoded) return [];

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
