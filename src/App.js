import React, { useState, useEffect } from "react";
import { useHikeData } from "./hooks/useHikeData";
import Layout from "./components/Layout";
import ElevationProfile from "./components/ElevationProfile";
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

  if (loading)
    return (
      <Layout>
        <div className="glass-card p-8 text-center">
          <div className="bounce-in">
            <div className="text-6xl mb-4">🥾</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Loading Trail Data
            </h2>
            <p className="text-gray-600">Preparing your GR5 adventure...</p>
            <div className="mt-4">
              <div className="modern-progress w-64 mx-auto">
                <div className="modern-progress-fill w-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );

  if (error)
    return (
      <Layout>
        <div className="glass-card p-8 text-center">
          <div className="bounce-in">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-semibold text-red-600 mb-2">
              Oops! Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">Error: {error.message}</p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      </Layout>
    );

  if (!route)
    return (
      <Layout>
        <div className="glass-card p-8 text-center">
          <div className="bounce-in">
            <div className="text-6xl mb-4">🗺️</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No Route Data Found
            </h2>
            <p className="text-gray-600">
              We couldn't find any GR5 route information.
            </p>
          </div>
        </div>
      </Layout>
    );

  const progress =
    route.totalDistanceKm > 0
      ? currentWalkedDistance / route.totalDistanceKm
      : 0;

  // Handle walked distance changes from MapView
  const handleWalkedDistanceChange = (newDistance) => {
    setCurrentWalkedDistance(newDistance);
  };

  // Handle activity selection
  const handleSelectHike = (hikeId) => {
    setSelectedHikeId(hikeId);

    // Auto-scroll to map when activity is selected
    const mapSection = document.getElementById("map-section");
    if (mapSection) {
      mapSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    }
  };

  return (
    <Layout progress={progress}>
      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Hiking Activities Section */}
        <div className="slide-up">
          <ActivitySwiper
            hikes={hikes}
            selectedHikeId={selectedHikeId}
            onSelectHike={handleSelectHike}
          />
        </div>

        {/* Elevation Profile Section */}
        <div className="slide-up">
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

        {/* Map Section */}
        <div id="map-section" className="slide-up">
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
      </div>
    </Layout>
  );
}

export default App;
