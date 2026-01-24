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
import NoteModal from "./components/NoteModal";

// Lazy load admin components
const AdminPhotoManager = lazy(() => import("./components/AdminPhotoManager"));
const AdminNoteEditor = lazy(() => import("./components/AdminNoteEditor"));
const AdminActivityManager = lazy(
  () => import("./components/AdminActivityManager"),
);
const AdminQuoteManager = lazy(() => import("./components/AdminQuoteManager"));
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
  const { route, hikes, photos, loading, error } = useHikeData();
  const [hoverPoint, setHoverPoint] = useState(null);
  const [zoomRange, setZoomRange] = useState(null);
  const [currentWalkedDistance, setCurrentWalkedDistance] = useState(0);

  // Note modal state
  const { markAsViewed } = useViewedActivitiesContext();
  const { openModal, selectedPhotoLocation } = useNoteModal();

  const { user } = useAuth();

  // Update current walked distance when route changes
  useEffect(() => {
    if (route && route.walkedDistanceKm) {
      setCurrentWalkedDistance(route.walkedDistanceKm);
    }
  }, [route]);

  // Note modal logic - now handled by NoteModal component
  // Memoize hikes with notes for navigation
  const hikesWithNotes = useMemo(() => {
    return hikes.filter((hike) => hike.note && hike.note.trim());
  }, [hikes]);

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
    // Open modal for this hike
    openModal(hikeId);

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
    // Modal state now handled by context
  };

  // Handle photo click for modal
  const handlePhotoClick = (photoData) => {
    // Find the photo in the photos array to get hikeId
    const photo = photos.find(
      (p) =>
        p.url === photoData.url &&
        p.caption === photoData.caption &&
        p.date === photoData.date,
    );
    if (photo && photo.hikeId) {
      // Open modal for this hike with this photo selected
      openModal(photo.hikeId, photo.url);
    }
  };

  // Main app component with routes
  return (
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
      <Route
        path="/admin/quotes"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <AdminRoute>
              <AdminQuoteManager />
            </AdminRoute>
          </Suspense>
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
                  onSelectHike={handleSelectHike}
                  onPhotoClick={handlePhotoClick}
                  onClearSelectedHike={handleClearSelectedHike}
                  selectedPhotoLocation={selectedPhotoLocation}
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
          </Layout>
        }
      />

      {/* Redirect unknown routes to main page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ViewedActivitiesProvider>
        <NoteModalProvider>
          <AppContent />
        </NoteModalProvider>
      </ViewedActivitiesProvider>
    </Router>
  );
}

export default App;
