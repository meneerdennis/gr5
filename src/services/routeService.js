// Helper function to calculate distance between two lat/lon points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

import {
  getHikesFromFirebase,
  calculateTotalWalkedDistance,
  decodePolyline,
} from "./firebaseService";

export async function getRouteData(options = {}) {
  const { hikes: providedHikes = null } = options;

  const CACHE_KEY = "gr5_route_data";
  const CACHE_TIMESTAMP_KEY = "gr5_route_data_timestamp";
  const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days (increased from 24 hours)

  // Check cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (cached && cachedTimestamp) {
      const cacheAge = Date.now() - parseInt(cachedTimestamp);
      if (cacheAge < CACHE_DURATION) {
        const cachedData = JSON.parse(cached);
        // Still need to calculate walked distance from Firebase
        const hikes = Array.isArray(providedHikes)
          ? providedHikes
          : await getHikesFromFirebase();
        const walkedDistanceKm = calculateTotalWalkedDistance(hikes);
        return {
          ...cachedData,
          polyline: decodePolyline(cachedData.polyline),
          walkedDistanceKm,
        };
      }
    }
  } catch (cacheError) {
    console.warn("Error reading from cache:", cacheError);
  }

  // Fetch pre-generated route data
  try {
    const [polylineResponse, routeResponse] = await Promise.all([
      fetch(process.env.PUBLIC_URL + "/gr5-polyline.txt"),
      fetch(process.env.PUBLIC_URL + "/gr5-route.json"),
    ]);

    if (!polylineResponse.ok || !routeResponse.ok) {
      throw new Error(
        `HTTP error! polyline: ${polylineResponse.status}, route: ${routeResponse.status}`,
      );
    }

    const polylineText = await polylineResponse.text();
    const routeData = await routeResponse.json();

    const { elevationProfile, totalDistanceKm } = routeData;

    // Calculate walked distance from Firebase hikes
    const hikes = Array.isArray(providedHikes)
      ? providedHikes
      : await getHikesFromFirebase();
    const walkedDistanceKm = calculateTotalWalkedDistance(hikes);

    const result = {
      polyline: decodePolyline(polylineText),
      elevationProfile,
      totalDistanceKm,
      walkedDistanceKm,
    };

    // Cache the result (without walkedDistanceKm as it changes)
    try {
      const cacheData = {
        polyline: polylineText, // Store encoded version
        elevationProfile,
        totalDistanceKm,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (cacheError) {
      console.warn("Error caching route data:", cacheError);
    }

    return result;
  } catch (error) {
    console.error("Error loading route data:", error);

    // Calculate walked distance from Firebase hikes even in error case
    let walkedDistanceKm = 0;
    try {
      const hikes = Array.isArray(providedHikes)
        ? providedHikes
        : await getHikesFromFirebase();
      walkedDistanceKm = calculateTotalWalkedDistance(hikes);
    } catch (firebaseError) {
      console.error(
        "Error fetching hikes for walked distance calculation:",
        firebaseError,
      );
      walkedDistanceKm = 0;
    }

    // Fallback to sample data if loading fails
    const elevationProfile = [
      { distanceKm: 0, elevationM: 0, lat: 51.979, lon: 4.133 },
      { distanceKm: 200, elevationM: 200, lat: 50.85, lon: 4.35 },
      { distanceKm: 400, elevationM: 500, lat: 49.6, lon: 6.1 },
      { distanceKm: 600, elevationM: 1500, lat: 46.5, lon: 6.6 },
      { distanceKm: 800, elevationM: 1000, lat: 45.0, lon: 6.0 },
      { distanceKm: 1000, elevationM: 0, lat: 43.7, lon: 7.26 },
    ];

    return {
      polyline: "sample_polyline",
      elevationProfile,
      totalDistanceKm: 1000,
      walkedDistanceKm,
    };
  }
}
