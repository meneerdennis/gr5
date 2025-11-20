import { db } from "./firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";

export async function getHikesFromFirebase() {
  try {
    const hikesCollection = collection(db, "hikes");
    const q = query(hikesCollection, orderBy("startDate", "asc"));
    const querySnapshot = await getDocs(q);

    const hikes = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      hikes.push({
        id: doc.id,
        stravaId: data.stravaId,
        name: data.name,
        description: data.description,
        distanceKm: data.distanceKm,
        movingTimeSec: data.movingTimeSec,
        elapsedTimeSec: data.elapsedTimeSec,
        startDate: data.startDate,
        type: data.type,
        polyline: data.polyline,
        photos: data.photos || [],
        latlng: data.latlng || [],
        altitude: data.altitude || [],
        time: data.time || [],
      });
    });

    return hikes;
  } catch (error) {
    console.error("Error fetching hikes from Firebase:", error);
    return [];
  }
}

// Calculate total walked distance from hikes
export function calculateTotalWalkedDistance(hikes) {
  return hikes.reduce((total, hike) => {
    return total + (hike.distanceKm || 0);
  }, 0);
}

// Extract all photos from hikes
export function getPhotosFromHikes(hikes) {
  const photos = [];

  console.log("getPhotosFromHikes called with hikes:", hikes);

  hikes.forEach((hike) => {
    console.log(`Processing hike ${hike.id}, photos:`, hike.photos);
    if (hike.photos && Array.isArray(hike.photos)) {
      hike.photos.forEach((photo) => {
        console.log("Processing photo:", photo);
        // Ensure photo has required properties for map markers
        if (photo.lat && photo.lng) {
          photos.push({
            id: photo.id || `${hike.id}-${photo.lat}-${photo.lng}`,
            lat: photo.lat,
            lng: photo.lng,
            url: photo.url || photo.photoUrl || "",
            caption: photo.caption || photo.description || "",
            date: photo.date || hike.startDate,
            hikeId: hike.id,
            hikeName: hike.name,
          });
        } else {
          console.log("Photo missing lat/lng:", photo);
        }
      });
    }
  });

  console.log("Total photos extracted:", photos.length, photos);
  return photos;
}

// Convert polyline string to array of coordinates (if needed)
export function decodePolyline(polylineStr) {
  if (!polylineStr) return [];

  // This is a simplified polyline decoder
  // In a real implementation, you'd use a proper polyline library
  const points = [];
  let index = 0;
  const len = polylineStr.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = polylineStr.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = polylineStr.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}
