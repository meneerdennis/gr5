export async function getRouteData() {
  const polyline = [
    [51.979, 4.133],
    [50.85, 4.35],
    [49.6, 6.1],
    [46.5, 6.6],
    [45.0, 6.0],
    [43.7, 7.26],
  ];

  const elevationProfile = [
    { distanceKm: 0, elevationM: 0 },
    { distanceKm: 200, elevationM: 200 },
    { distanceKm: 400, elevationM: 500 },
    { distanceKm: 600, elevationM: 1500 },
    { distanceKm: 800, elevationM: 1000 },
    { distanceKm: 1000, elevationM: 0 },
  ];

  const totalDistanceKm = 1000;
  const walkedDistanceKm = 320;

  return {
    polyline,
    elevationProfile,
    totalDistanceKm,
    walkedDistanceKm,
  };
}