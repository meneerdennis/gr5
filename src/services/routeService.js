export async function getRouteData() {
  const polyline = [
    [51.979, 4.133],
    [50.85, 4.35],
    [49.6, 6.1],
    [46.5, 6.6],
    [45.0, 6.0],
    [43.7, 7.26],
  ];

  // Fetch and parse CSV data
  try {
    const response = await fetch("/gr5/gr5_every_5km.csv");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvText = await response.text();
    const lines = csvText.trim().split("\n");
    const elevationProfile = [];

    // Skip header row and parse data
    for (let i = 1; i < lines.length; i++) {
      const [km, elevation] = lines[i].split(",");
      if (
        km &&
        elevation &&
        !isNaN(parseFloat(km)) &&
        !isNaN(parseFloat(elevation))
      ) {
        elevationProfile.push({
          distanceKm: parseFloat(km),
          elevationM: parseFloat(elevation),
        });
      }
    }

    if (elevationProfile.length === 0) {
      throw new Error("No valid elevation data found in CSV");
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
    console.error("Error loading CSV data:", error);
    // Fallback to sample data if CSV loading fails
    const elevationProfile = [
      { distanceKm: 0, elevationM: 0 },
      { distanceKm: 200, elevationM: 200 },
      { distanceKm: 400, elevationM: 500 },
      { distanceKm: 600, elevationM: 1500 },
      { distanceKm: 800, elevationM: 1000 },
      { distanceKm: 1000, elevationM: 0 },
    ];

    return {
      polyline,
      elevationProfile,
      totalDistanceKm: 1000,
      walkedDistanceKm: 320,
    };
  }
}
