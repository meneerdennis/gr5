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

export async function getRouteData() {
  const polyline = [
    [51.979, 4.133],
    [50.85, 4.35],
    [49.6, 6.1],
    [46.5, 6.6],
    [45.0, 6.0],
    [43.7, 7.26],
  ];

  // Fetch and parse GPX data
  try {
    const response = await fetch(process.env.PUBLIC_URL + "/gr5.gpx");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const gpxText = await response.text();
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, "text/xml");

    // Extract track points
    const trkpts = gpxDoc.querySelectorAll("trkpt");
    const elevationProfile = [];
    let cumulativeDistance = 0;

    trkpts.forEach((trkpt, index) => {
      const lat = parseFloat(trkpt.getAttribute("lat"));
      const lon = parseFloat(trkpt.getAttribute("lon"));
      const eleElement = trkpt.querySelector("ele");
      const elevation = eleElement ? parseFloat(eleElement.textContent) : 0;

      // Calculate distance from previous point
      if (index > 0) {
        const prevTrkpt = trkpts[index - 1];
        const prevLat = parseFloat(prevTrkpt.getAttribute("lat"));
        const prevLon = parseFloat(prevTrkpt.getAttribute("lon"));
        cumulativeDistance += calculateDistance(prevLat, prevLon, lat, lon);
      }

      elevationProfile.push({
        distanceKm: cumulativeDistance,
        elevationM: elevation,
        lat,
        lon,
      });
    });

    if (elevationProfile.length === 0) {
      throw new Error("No valid elevation data found in GPX");
    }

    const totalDistanceKm =
      elevationProfile[elevationProfile.length - 1].distanceKm;
    const walkedDistanceKm = 320;

    return {
      polyline,
      elevationProfile,
      totalDistanceKm,
      walkedDistanceKm,
    };
  } catch (error) {
    console.error("Error loading GPX data:", error);
    // Fallback to sample data if GPX loading fails
    const elevationProfile = [
      { distanceKm: 0, elevationM: 0, lat: 51.979, lon: 4.133 },
      { distanceKm: 200, elevationM: 200, lat: 50.85, lon: 4.35 },
      { distanceKm: 400, elevationM: 500, lat: 49.6, lon: 6.1 },
      { distanceKm: 600, elevationM: 1500, lat: 46.5, lon: 6.6 },
      { distanceKm: 800, elevationM: 1000, lat: 45.0, lon: 6.0 },
      { distanceKm: 1000, elevationM: 0, lat: 43.7, lon: 7.26 },
    ];

    return {
      polyline,
      elevationProfile,
      totalDistanceKm: 1000,
      walkedDistanceKm: 320,
    };
  }
}
