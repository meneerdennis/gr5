import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  lazy,
  Suspense,
} from "react";
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
import { NoteModalProvider, useNoteModal } from "./contexts/NoteModalContext";
import {
  ViewedActivitiesProvider,
  useViewedActivitiesContext,
} from "./contexts/ViewedActivitiesContext";
import { ViewedCommentsProvider } from "./contexts/ViewedCommentsContext";
import NoteModal from "./components/NoteModal";

// Lazy load admin components
const AdminPhotoManager = lazy(() => import("./components/AdminPhotoManager"));
const AdminNoteEditor = lazy(() => import("./components/AdminNoteEditor"));
const AdminActivityManager = lazy(
  () => import("./components/AdminActivityManager"),
);
import AdminRoute from "./components/AdminRoute";

import { useLikes } from "./hooks/useLikes";
import { useComments } from "./hooks/useComments";
import LikeButton from "./components/LikeButton";
import CommentsSection from "./components/CommentsSection";
import SwiperComponent from "./components/SwiperComponent";
import { SwiperSlide } from "swiper/react";
import { translateText, getUserLanguage } from "./services/translationService";
// Localized button texts
const buttonTexts = {
  en: {
    see: "See Translation",
    show: "Show Original",
    same: "The text is already in your language.",
    error: "Translation failed. Please try again.",
  },
  nl: {
    see: "Vertaling bekijken",
    show: "Origineel tonen",
    same: "De tekst is al in uw taal.",
    error: "Vertaling mislukt. Probeer het opnieuw.",
  },
  fr: {
    see: "Voir la traduction",
    show: "Afficher l'original",
    same: "Le texte est déjà dans votre langue.",
    error: "La traduction a échoué. Veuillez réessayer.",
  },
  de: {
    see: "Übersetzung anzeigen",
    show: "Original anzeigen",
    same: "Der Text ist bereits in Ihrer Sprache.",
    error: "Übersetzung fehlgeschlagen. Bitte versuchen Sie es erneut.",
  },
  lt: {
    see: "Žiūrėti vertimą",
    show: "Rodyti originalą",
    same: "Tekstas jau yra jūsų kalba.",
    error: "Vertimas nepavyko. Bandykite dar kartą.",
  },
  // Add more languages as needed
};

function AppContent() {
  const { route, hikes, photos, loading, error, refreshUpdates, refreshing } =
    useHikeData();
  const [hoverPoint, setHoverPoint] = useState(null);
  const [zoomRange, setZoomRange] = useState(null);
  const [currentWalkedDistance, setCurrentWalkedDistance] = useState(0);

  // Note modal state
  const { markAsViewed } = useViewedActivitiesContext();
  const { openModal, selectedPhotoLocation, hikeBounds } = useNoteModal();

  const { user } = useAuth();

  // Update current walked distance when route changes
  useEffect(() => {
    if (route && route.walkedDistanceKm) {
      setCurrentWalkedDistance(route.walkedDistanceKm);
    }
  }, [route]);

  // Memoize hikes with notes for navigation
  const hikesWithNotes = useMemo(() => {
    return hikes.filter((hike) => hike.note && hike.note.trim());
  }, [hikes]);

  // Compute progress defensively so Layout can mount even when route is not ready
  const progress =
    route?.totalDistanceKm > 0
      ? currentWalkedDistance / route.totalDistanceKm
      : 0;

  // Handle walked distance changes from MapView
  const handleWalkedDistanceChange = (newDistance) => {
    setCurrentWalkedDistance(newDistance);
  };

  // Handle activity selection
  const handleSelectHike = (hikeId) => {
    openModal(hikeId);
    const mapSection = document.getElementById("map-section");
    if (mapSection) {
      mapSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    }
  };

  const handleClearSelectedHike = () => {
    // Modal state now handled by context
  };

  // Handle photo click for modal
  const handlePhotoClick = (photoData) => {
    const photo = photos.find(
      (p) =>
        p.url === photoData.url &&
        p.caption === photoData.caption &&
        p.date === photoData.date,
    );
    if (photo && photo.hikeId) {
      openModal(photo.hikeId, photo.url);
    }
  };

  // Build the inner content: either a loading/error/no-route card, or the full routes
  let innerContent;

  if (loading) {
    innerContent = (
      <>
        <div className="inline-loading-overlay" aria-hidden>
          <div className="inline-loading-box">
            <div className="inline-loading-spinner" />
            <div className="text-sm text-gray-600">Loading trail data…</div>
          </div>
        </div>
        {/* Render the app shell with lightweight placeholders so there's no full-screen swap */}
        <Routes>
          <Route
            path="/"
            element={
              <>
                <div className="grid grid-cols-1 gap-6">
                  <div
                    className="glass-card p-6 animate-pulse"
                    style={{ minHeight: "140px" }}
                  >
                    <div className="text-gray-600">
                      Loading elevation profile…
                    </div>
                  </div>

                  <div
                    className="glass-card p-6 animate-pulse"
                    style={{ minHeight: "320px" }}
                  >
                    <div className="text-gray-600">Loading map…</div>
                  </div>
                </div>
              </>
            }
          />
          {/* Keep redirect in place while loading */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    );
  } else if (error) {
    innerContent = (
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
    );
  } else if (!route) {
    innerContent = (
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
    );
  } else {
    innerContent = (
      <Routes>
        {/* Protected admin routes */}
        <Route
          path="/admin"
          element={
            <Suspense fallback={<div>Loading...</div>}>
              <AdminRoute>
                <Navigate to="/admin/manage" replace />
              </AdminRoute>
            </Suspense>
          }
        />
        <Route
          path="/admin/manage"
          element={
            <Suspense fallback={<div>Loading...</div>}>
              <AdminRoute>
                <AdminPhotoManager />
              </AdminRoute>
            </Suspense>
          }
        />
        <Route
          path="/admin/notes"
          element={
            <Suspense fallback={<div>Loading...</div>}>
              <AdminRoute>
                <AdminNoteEditor />
              </AdminRoute>
            </Suspense>
          }
        />
        <Route
          path="/admin/activities"
          element={
            <Suspense fallback={<div>Loading...</div>}>
              <AdminRoute>
                <AdminActivityManager />
              </AdminRoute>
            </Suspense>
          }
        />
        {/* Main application route */}
        <Route
          path="/"
          element={
            <>
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
                    onSelectHike={handleSelectHike}
                    onPhotoClick={handlePhotoClick}
                    onClearSelectedHike={handleClearSelectedHike}
                    selectedPhotoLocation={selectedPhotoLocation}
                    hikeBounds={hikeBounds}
                    onRefresh={refreshUpdates}
                    refreshInProgress={refreshing}
                  />
                </div>
              </div>

              {/* Note Modal - Now a separate component using context */}
              <NoteModal
                hikes={hikes}
                photos={photos}
                user={user}
                markAsViewed={markAsViewed}
                hikesWithNotes={hikesWithNotes}
              />
            </>
          }
        />

        {/* Redirect unknown routes to main page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Always render Layout so global UI (notifications, prompts) remain mounted
  return (
    <Layout
      progress={progress}
      onRefresh={refreshUpdates}
      refreshInProgress={refreshing}
    >
      {innerContent}
    </Layout>
  );
}

function App() {
  return (
    <NoteModalProvider>
      <ViewedActivitiesProvider>
        <ViewedCommentsProvider>
          <Router>
            <AppContent />
          </Router>
        </ViewedCommentsProvider>
      </ViewedActivitiesProvider>
    </NoteModalProvider>
  );
}

export default App;
