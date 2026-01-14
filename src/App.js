import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useHikeData } from "./hooks/useHikeData";
import Layout from "./components/Layout";
import ElevationProfile from "./components/ElevationProfile";
import MapView from "./components/MapView";
import AdminUploadPage from "./components/AdminUploadPage";
import AdminPhotoManager from "./components/AdminPhotoManager";
import AdminNoteEditor from "./components/AdminNoteEditor";
import AdminActivityManager from "./components/AdminActivityManager";
import AdminQuoteManager from "./components/AdminQuoteManager";
import AdminRoute from "./components/AdminRoute";

function App() {
  const { route, hikes, photos, loading, error } = useHikeData();
  const [hoverPoint, setHoverPoint] = useState(null);
  const [zoomRange, setZoomRange] = useState(null);
  const [currentWalkedDistance, setCurrentWalkedDistance] = useState(0);
  const [selectedHikeId, setSelectedHikeId] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Sort photos by distance along the route
  const sortedPhotos = useMemo(() => {
    return [...photos].sort(
      (a, b) => (a.distanceKm || 0) - (b.distanceKm || 0)
    );
  }, [photos]);

  // Navigation functions - memoized to prevent hook ordering issues
  const goToPreviousPhoto = useCallback(() => {
    if (selectedPhotoIndex > 0) {
      const newIndex = selectedPhotoIndex - 1;
      setSelectedPhotoIndex(newIndex);
      setSelectedPhoto(sortedPhotos[newIndex]);
    }
  }, [selectedPhotoIndex, sortedPhotos]);

  const goToNextPhoto = useCallback(() => {
    if (selectedPhotoIndex < sortedPhotos.length - 1) {
      const newIndex = selectedPhotoIndex + 1;
      setSelectedPhotoIndex(newIndex);
      setSelectedPhoto(sortedPhotos[newIndex]);
    }
  }, [selectedPhotoIndex, sortedPhotos]);

  // Update current walked distance when route changes
  useEffect(() => {
    if (route && route.walkedDistanceKm) {
      setCurrentWalkedDistance(route.walkedDistanceKm);
    }
  }, [route]);

  // Keyboard navigation for modal - always called to maintain hook order
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedPhoto) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goToPreviousPhoto();
          break;
        case "ArrowRight":
          e.preventDefault();
          goToNextPhoto();
          break;
        case "Escape":
          e.preventDefault();
          setSelectedPhoto(null);
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectedPhoto,
    selectedPhotoIndex,
    sortedPhotos,
    goToPreviousPhoto,
    goToNextPhoto,
  ]);

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

  // Handle clearing selected hike
  const handleClearSelectedHike = () => {
    setSelectedHikeId(null);
  };

  // Handle photo click for modal
  const handlePhotoClick = (photoData) => {
    setSelectedPhoto(photoData);
    // Find the index of this photo in the sorted photos array
    const index = sortedPhotos.findIndex(
      (p) =>
        p.url === photoData.url &&
        p.caption === photoData.caption &&
        p.date === photoData.date
    );
    setSelectedPhotoIndex(index >= 0 ? index : 0);
  };

  // Main app component with routes
  return (
    <Router>
      <Routes>
        {/* Protected admin routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Navigate to="/admin/manage" replace />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/upload"
          element={
            <AdminRoute>
              <AdminUploadPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/manage"
          element={
            <AdminRoute>
              <AdminPhotoManager />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/notes"
          element={
            <AdminRoute>
              <AdminNoteEditor />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/activities"
          element={
            <AdminRoute>
              <AdminActivityManager />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/quotes"
          element={
            <AdminRoute>
              <AdminQuoteManager />
            </AdminRoute>
          }
        />

        {/* Main application route */}
        <Route
          path="/"
          element={
            <Layout progress={progress}>
              {/* Main Dashboard Grid */}
              <div className="grid grid-cols-1 gap-6">
                {/* Elevation Profile Section */}
                <div className="slide-up ">
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
                <div id="map-section" className="slide-up p-0 m-0">
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
                    onSelectHike={handleSelectHike}
                    onPhotoClick={handlePhotoClick}
                    onClearSelectedHike={handleClearSelectedHike}
                  />
                </div>
              </div>

              {/* Photo Modal - rendered at app level */}
              {selectedPhoto && (
                <div
                  className="full-image-modal"
                  onClick={(e) => {
                    // Only close if clicking the backdrop, not the content
                    if (e.target === e.currentTarget) {
                      setSelectedPhoto(null);
                    }
                  }}
                >
                  <div className="full-image-container">
                    {/* Close button - subtle design */}
                    <button
                      className="close-button"
                      onClick={() => setSelectedPhoto(null)}
                      title="Close (Esc)"
                      style={{
                        background: "rgba(0, 0, 0, 0.5)",
                        color: "white",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        fontSize: "18px",
                        fontWeight: "normal",
                        width: "32px",
                        height: "32px",
                        borderRadius: "4px",
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        zIndex: 1002,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background = "rgba(0, 0, 0, 0.7)")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.background = "rgba(0, 0, 0, 0.5)")
                      }
                    >
                      ×
                    </button>

                    {/* Previous button */}
                    {selectedPhotoIndex > 0 && (
                      <button
                        className="nav-button nav-prev"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToPreviousPhoto();
                        }}
                        title="Previous photo"
                      >
                        ‹
                      </button>
                    )}

                    {/* Next button */}
                    {selectedPhotoIndex < sortedPhotos.length - 1 && (
                      <button
                        className="nav-button nav-next"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToNextPhoto();
                        }}
                        title="Next photo"
                      >
                        ›
                      </button>
                    )}

                    <img
                      src={selectedPhoto.url}
                      alt={selectedPhoto.caption || "Polarsteps foto"}
                    />

                    {/* Photo counter */}
                    <div className="photo-counter">
                      {selectedPhotoIndex + 1} / {sortedPhotos.length}
                    </div>

                    {(selectedPhoto.caption || selectedPhoto.date) && (
                      <div className="full-image-caption">
                        {selectedPhoto.caption && (
                          <div>{selectedPhoto.caption}</div>
                        )}
                        {selectedPhoto.date && (
                          <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                            {selectedPhoto.date}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Layout>
          }
        />

        {/* Redirect unknown routes to main page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
