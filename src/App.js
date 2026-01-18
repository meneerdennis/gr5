import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useHikeData } from "./hooks/useHikeData";
import { useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import ElevationProfile from "./components/ElevationProfile";
import MapView from "./components/MapView";
import AdminUploadPage from "./components/AdminUploadPage";
import AdminPhotoManager from "./components/AdminPhotoManager";
import AdminNoteEditor from "./components/AdminNoteEditor";
import AdminActivityManager from "./components/AdminActivityManager";
import AdminQuoteManager from "./components/AdminQuoteManager";
import AdminRoute from "./components/AdminRoute";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useViewedActivities } from "./hooks/useViewedActivities";

import { useLikes } from "./hooks/useLikes";
import LikeButton from "./components/LikeButton";
import CommentsSection from "./components/CommentsSection";

function App() {
  const { route, hikes, photos, loading, error } = useHikeData();
  const [hoverPoint, setHoverPoint] = useState(null);
  const [zoomRange, setZoomRange] = useState(null);
  const [currentWalkedDistance, setCurrentWalkedDistance] = useState(0);
  const [selectedHikeId, setSelectedHikeId] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [photoLoading, setPhotoLoading] = useState(false);

  // Note modal state
  const { markAsViewed } = useViewedActivities();

  const { user } = useAuth();

  // Sort photos by distance along the route
  const sortedPhotos = useMemo(() => {
    return [...photos].sort(
      (a, b) => (a.distanceKm || 0) - (b.distanceKm || 0)
    );
  }, [photos]);

  // Navigation functions - memoized to prevent hook ordering issues
  const goToPreviousPhoto = useCallback(() => {
    if (selectedPhotoIndex > 0) {
      setPhotoLoading(true);
      const newIndex = selectedPhotoIndex - 1;
      setSelectedPhotoIndex(newIndex);
      setSelectedPhoto(sortedPhotos[newIndex]);
    }
  }, [selectedPhotoIndex, sortedPhotos]);

  const goToNextPhoto = useCallback(() => {
    if (selectedPhotoIndex < sortedPhotos.length - 1) {
      setPhotoLoading(true);
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

  // Note modal logic
  const selectedHike = hikes.find((hike) => hike.id === selectedHikeId);
  const { likesCount } = useLikes(selectedHike?.id, user?.uid);
  const noteText = selectedHike?.note || "";
  const showNoteModal = selectedHikeId && noteText;

  // Mobile detection for modal styling
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Get all hikes with notes for navigation
  const hikesWithNotes = hikes.filter((hike) => hike.note && hike.note.trim());
  const currentNoteIndex = hikesWithNotes.findIndex(
    (hike) => hike.id === selectedHikeId
  );
  const hasPreviousNote = currentNoteIndex > 0;
  const hasNextNote = currentNoteIndex < hikesWithNotes.length - 1;

  // Navigation functions for notes (with mark as viewed)
  const goToPreviousNote = () => {
    if (hasPreviousNote) {
      const previousHike = hikesWithNotes[currentNoteIndex - 1];
      setSelectedHikeId(previousHike.id);
      // Mark as viewed when navigating via arrows
      markAsViewed(previousHike.id);
    }
  };

  const goToNextNote = () => {
    if (hasNextNote) {
      const nextHike = hikesWithNotes[currentNoteIndex + 1];
      setSelectedHikeId(nextHike.id);
      // Mark as viewed when navigating via arrows
      markAsViewed(nextHike.id);
    }
  };

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

                    {photoLoading && (
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          zIndex: 1001,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            border: "4px solid rgba(255, 255, 255, 0.3)",
                            borderTop: "4px solid white",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                        <div
                          style={{
                            color: "white",
                            fontSize: "14px",
                            fontWeight: "500",
                            textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
                          }}
                        >
                          Loading photo...
                        </div>
                      </div>
                    )}
                    <img
                      src={selectedPhoto.url}
                      alt={selectedPhoto.caption || "Polarsteps foto"}
                      onLoad={() => setPhotoLoading(false)}
                      onError={() => setPhotoLoading(false)}
                      style={{
                        opacity: photoLoading ? 0.3 : 1,
                        transition: "opacity 0.3s ease",
                      }}
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

              {/* Note Modal - Instagram-like Post Style */}
              {showNoteModal && (
                <div
                  className="note-modal-backdrop"
                  onClick={(e) => {
                    // Only close if clicking the backdrop, not the content
                    if (e.target === e.currentTarget) {
                      setSelectedHikeId(null);
                    }
                  }}
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    display: "flex",
                    alignItems: isMobile ? "flex-start" : "center",
                    justifyContent: "center",
                    zIndex: 2000,
                    padding: isMobile ? "10px" : "20px",
                    overflowY: isMobile ? "auto" : "hidden",
                  }}
                >
                  <div
                    className="instagram-post-modal"
                    style={{
                      maxWidth: "500px",
                      width: "100%",
                      maxHeight: isMobile ? "none" : "90vh",
                      height: isMobile ? "auto" : "auto",
                      backgroundColor: "white",
                      borderRadius: "12px",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                      border: "1px solid #e1e5e9",
                      overflow: isMobile ? "visible" : "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* Instagram Header */}
                    <div
                      className="instagram-header"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderBottom: "1px solid #e1e5e9",
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            backgroundColor: "#f0f0f0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: "12px",
                            fontSize: "16px",
                          }}
                        >
                          🏔️
                        </div>
                        <div>
                          <div style={{ fontWeight: "600", fontSize: "14px" }}>
                            {selectedHike?.name || "GR5 Hike"}
                          </div>
                          <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                            {formatDate(selectedHike?.startDate)}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedHikeId(null)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "20px",
                          color: "#8e8e8e",
                          padding: "4px",
                        }}
                        title="Close post"
                      >
                        ×
                      </button>
                    </div>

                    {/* Photos Swiper */}
                    {selectedHike?.photos && selectedHike.photos.length > 0 && (
                      <div
                        className="instagram-photos"
                        style={{ position: "relative", flexShrink: 0 }}
                      >
                        <Swiper
                          modules={[Navigation, Pagination]}
                          spaceBetween={0}
                          slidesPerView={1}
                          navigation
                          pagination={{ clickable: true }}
                          style={{ height: "400px" }}
                        >
                          {selectedHike.photos.map((photo, index) => (
                            <SwiperSlide key={index}>
                              <img
                                src={photo.url}
                                alt={photo.caption || `Photo ${index + 1}`}
                                style={{
                                  width: "100%",
                                  height: "400px",
                                  objectFit: "cover",
                                }}
                              />
                            </SwiperSlide>
                          ))}
                        </Swiper>
                      </div>
                    )}

                    {/* Post Content */}
                    <div
                      className="instagram-content"
                      style={{
                        padding: "12px 16px",
                        flex: isMobile ? "none" : 1,
                        overflowY: isMobile ? "visible" : "auto",
                      }}
                    >
                      {/* Action Buttons */}
                      <div
                        className="instagram-actions"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          marginBottom: "12px",
                        }}
                      >
                        <LikeButton activityId={selectedHike.id} />
                        <button
                          onClick={() => {
                            const commentsSection = document.querySelector(
                              ".instagram-comments"
                            );
                            if (commentsSection) {
                              commentsSection.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                            }
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                          title="Comment"
                        >
                          <svg
                            width="24"
                            height="24"
                            stroke="#000000"
                            strokeWidth="2"
                            viewBox="0 0 122.97 122.88"
                          >
                            <path d="M61.44,0a61.46,61.46,0,0,1,54.91,89l6.44,25.74a5.83,5.83,0,0,1-7.25,7L91.62,115A61.43,61.43,0,1,1,61.44,0ZM96.63,26.25a49.78,49.78,0,1,0-9,77.52A5.83,5.83,0,0,1,92.4,103L109,107.77l-4.5-18a5.86,5.86,0,0,1,.51-4.34,49.06,49.06,0,0,0,4.62-11.58,50,50,0,0,0-13-47.62Z" />
                          </svg>
                        </button>
                      </div>

                      {/* Likes Count */}
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          marginBottom: "8px",
                          color: "#262626",
                        }}
                      >
                        {likesCount || 0} likes
                      </div>

                      {/* Caption/Note */}
                      <div className="instagram-caption">
                        <span style={{ fontWeight: "600", marginRight: "8px" }}>
                          {selectedHike?.name || "GR5 Hike"}
                        </span>
                        <span style={{ fontSize: "14px", color: "#262626" }}>
                          {noteText}
                        </span>
                      </div>

                      {/* Comments Section (placeholder) */}
                      <div
                        className="instagram-comments"
                        style={{
                          marginTop: "12px",
                          paddingTop: "12px",
                          borderTop: "1px solid #e1e5e9",
                        }}
                      >
                        <CommentsSection activityId={selectedHike.id} />
                      </div>
                    </div>

                    {/* Navigation Arrows for Multiple Notes */}
                    {(hasPreviousNote || hasNextNote) && (
                      <div
                        className="instagram-navigation"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 16px",
                          backgroundColor: "#fafafa",
                          borderTop: "1px solid #e1e5e9",
                          flexShrink: 0,
                        }}
                      >
                        {hasPreviousNote ? (
                          <button
                            onClick={goToPreviousNote}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "14px",
                              color: "#0095f6",
                              fontWeight: "600",
                            }}
                          >
                            ‹ Previous
                          </button>
                        ) : (
                          <div />
                        )}

                        {hikesWithNotes.length > 1 && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#8e8e8e",
                              alignSelf: "center",
                            }}
                          >
                            {currentNoteIndex + 1} of {hikesWithNotes.length}
                          </span>
                        )}

                        {hasNextNote ? (
                          <button
                            onClick={goToNextNote}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "14px",
                              color: "#0095f6",
                              fontWeight: "600",
                            }}
                          >
                            Next ›
                          </button>
                        ) : (
                          <div />
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
