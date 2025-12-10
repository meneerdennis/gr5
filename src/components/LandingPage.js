import React, { useState, useEffect } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";
import { Link } from "react-router-dom";

function LandingPage({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await signInWithPopup(auth, googleProvider);

      // Check if sign in was successful
      if (result.user) {
        onLoginSuccess(result.user);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onLoginSuccess(null); // Trigger logout
    } catch (error) {
      console.error("Sign out error:", error);
      setError("Failed to sign out. Please try again.");
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--gradient-background)" }}
    >
      {/* Navigation */}
      <nav className="glass-card m-4 mb-0 rounded-b-none">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-2xl">🥾</span>
            <span className="ml-2 text-xl font-bold text-gray-900">
              TrailMapper
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="glass-card p-8 text-center">
          <div className="mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🥾</span>
            </div>
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 mb-4">
              <span className="block">Track Your</span>
              <span className="block text-primary">Hiking Adventures</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Upload your GPX tracks, share photos, and create interactive maps
              of your hiking journeys. Connect with Strava to automatically sync
              your activities.
            </p>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Signing in..." : "Get Started with Google"}
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything you need for your hiking adventures
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="glass-card p-6">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-4">🗺️</span>
              <h3 className="text-xl font-semibold text-gray-900">
                Custom GPX Tracks
              </h3>
            </div>
            <p className="text-gray-600">
              Upload your own GPX files and create personalized hiking maps. No
              more being limited to standard routes.
            </p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-4">📸</span>
              <h3 className="text-xl font-semibold text-gray-900">
                Photo Integration
              </h3>
            </div>
            <p className="text-gray-600">
              Automatically attach photos to your route with GPS coordinates.
              Share your journey visually.
            </p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-4">🔗</span>
              <h3 className="text-xl font-semibold text-gray-900">
                Strava Integration
              </h3>
            </div>
            <p className="text-gray-600">
              Connect your Strava account for automatic activity syncing. Keep
              your hiking data up to date.
            </p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-4">🌐</span>
              <h3 className="text-xl font-semibold text-gray-900">
                Public Sharing
              </h3>
            </div>
            <p className="text-gray-600">
              Share your hiking adventures with friends and family through
              public viewing links.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="glass-card p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to start tracking?
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Join thousands of hikers who are already using TrailMapper to
            document their journeys.
          </p>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? "Signing in..." : "Get Started Free"}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-500">
            Built with ❤️ for hikers • TrailMapper 2024
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

export default LandingPage;
