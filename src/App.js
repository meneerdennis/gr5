import React, { useState, useEffect } from "react";
import { useHikeData } from "./hooks/useHikeData";
import Layout from "./components/Layout";
import ElevationProfile from "./components/ElevationProfile";
import ProgressBar from "./components/ProgressBar";
import MapView from "./components/MapView";
import ActivitySwiper from "./components/ActivitySwiper";

function App() {
  const { route, hikes, photos, loading, error } = useHikeData();
  const [hoverPoint, setHoverPoint] = useState(null);
  const [zoomRange, setZoomRange] = useState(null);
  const [currentWalkedDistance, setCurrentWalkedDistance] = useState(0);
  const [selectedHikeId, setSelectedHikeId] = useState(null);

  // Update current walked distance when route changes
  useEffect(() => {
    if (route && route.walkedDistanceKm) {
      setCurrentWalkedDistance(route.walkedDistanceKm);
    }
  }, [route]);

  if (loading) return <div>Data laden…</div>;
  if (error) return <div>Er ging iets mis: {error.message}</div>;
  if (!route) return <div>Geen routegegevens gevonden.</div>;

  const progress = currentWalkedDistance / route.totalDistanceKm;

  // Handle walked distance changes from MapView
  const handleWalkedDistanceChange = (newDistance) => {
    setCurrentWalkedDistance(newDistance);
  };

  // Handle activity selection
  const handleSelectHike = (hikeId) => {
    setSelectedHikeId(hikeId);
  };

  return (
    <Layout>
      <div style={{ padding: "1rem" }}>
        <h1>GR5 Hoek van Holland → Nice</h1>
        <ProgressBar progress={progress} />
        <ElevationProfile
          elevationProfile={route.elevationProfile}
          walkedDistanceKm={currentWalkedDistance}
          totalDistanceKm={route.totalDistanceKm}
          hoverPoint={hoverPoint}
          onHover={setHoverPoint}
          zoomRange={zoomRange}
          onZoomChange={setZoomRange}
          hikes={hikes}
        />
      </div>
      <ActivitySwiper
        hikes={hikes}
        selectedHikeId={selectedHikeId}
        onSelectHike={handleSelectHike}
      />
      <div
        style={{
          flex: 1,
          minHeight: "60vh",
          display: "flex",
          justifyContent: "center",
          alignContent: "center",
        }}
      >
        <MapView
          routePolyline={route.polyline}
          hikes={hikes}
          photos={photos}
          gpxUrl={process.env.PUBLIC_URL + "/gr5.gpx"}
          elevationProfile={route.elevationProfile}
          walkedDistanceKm={currentWalkedDistance}
          hoverPoint={hoverPoint}
          onHover={setHoverPoint}
          zoomRange={zoomRange}
          onZoomChange={setZoomRange}
          onWalkedDistanceChange={handleWalkedDistanceChange}
          selectedHikeId={selectedHikeId}
        />
      </div>
    </Layout>
  );
}

export default App;
