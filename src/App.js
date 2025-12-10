import React from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LandingPage from "./components/LandingPage";
import MainLayout from "./components/MainLayout";
import Dashboard from "./components/Dashboard";
import GpxManager from "./components/GpxManager";
import AdminUploadPage from "./components/AdminUploadPage";
import AdminPhotoManager from "./components/AdminPhotoManager";
import AdminNoteEditor from "./components/AdminNoteEditor";
import PublicRouteView from "./components/PublicRouteView";
import SettingsPage from "./components/SettingsPage";
import StravaSyncPage from "./components/StravaSyncPage";
import PhotoManager from "./components/PhotoManager";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Public Route Viewer (for sharing)
const PublicRoute = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading route...</p>
        </div>
      </div>
    );
  }

  return <PublicRouteView />;
};

// Main App Content (inside AuthProvider)
const AppContent = () => {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route
          path="/"
          element={
            user ? <Navigate to="/dashboard" replace /> : <LandingPage />
          }
        />

        {/* Public Route Sharing */}
        <Route path="/public/:username/:routeId" element={<PublicRoute />} />

        {/* Protected Routes (require authentication) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/routes"
          element={
            <ProtectedRoute>
              <MainLayout>
                <GpxManager />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/photos"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PhotoManager />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <MainLayout>
                <SettingsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin Routes (integrated into main layout) */}
        <Route
          path="/admin/upload"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AdminUploadPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/manage"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AdminPhotoManager />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/notes"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AdminNoteEditor />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/strava"
          element={
            <ProtectedRoute>
              <MainLayout>
                <StravaSyncPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Legacy Routes - redirect to new structure */}
        <Route path="/admin" element={<Navigate to="/dashboard" replace />} />

        {/* Default redirect for unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

// Main App Component with AuthProvider wrapper
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
