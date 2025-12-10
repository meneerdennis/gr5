import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { UserRouteService } from "../services/userRouteService";
import { Link } from "react-router-dom";
import MapView from "./MapView";

function Dashboard() {
  const { user, userProfile } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDistance: 0,
    totalRoutes: 0,
    totalPhotos: 0,
    totalActivities: 0,
  });

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const routeService = new UserRouteService(user.uid);
      const userRoutes = await routeService.getUserRoutes();

      setRoutes(userRoutes);

      // Calculate stats
      const totalDistance = userRoutes.reduce(
        (sum, route) => sum + (route.distanceKm || 0),
        0
      );
      const totalPhotos = userRoutes.reduce(
        (sum, route) => sum + (route.photos?.length || 0),
        0
      );
      const totalActivities = userRoutes.reduce(
        (sum, route) => sum + (route.activities?.length || 0),
        0
      );

      setStats({
        totalDistance,
        totalRoutes: userRoutes.length,
        totalPhotos,
        totalActivities,
      });

      // Auto-select first route for map
      if (userRoutes.length > 0 && !selectedRoute) {
        setSelectedRoute(userRoutes[0]);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (distance) => {
    return `${distance.toFixed(2)} km`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRouteShareUrl = (routeId) => {
    return `${window.location.origin}/public/${userProfile?.username}/${routeId}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Please sign in
          </h2>
          <p className="text-gray-600">
            You need to be signed in to view your dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user.displayName?.split(" ")[0] || "Hiker"}!
            </h1>
            <p className="text-gray-600">
              Track your hiking adventures and share your favorite routes.
            </p>
          </div>
          <div className="flex-shrink-0 ml-4">
            <Link to="/routes" className="btn btn-primary">
              📤 Upload New Route
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🗺️</span>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Routes
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.totalRoutes}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">📏</span>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Distance
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {formatDistance(stats.totalDistance)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">📸</span>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Photos
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.totalPhotos}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🏃</span>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Activities
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.totalActivities}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Routes List */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Your Routes
            </h3>

            {routes.length === 0 ? (
              <div className="text-center py-6">
                <span className="text-4xl mb-4 block">🥾</span>
                <p className="text-gray-500 mb-4">No routes yet</p>
                <Link to="/routes" className="btn btn-secondary">
                  Upload your first route
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {routes.slice(0, 5).map((route) => (
                  <div
                    key={route.id}
                    className={`p-3 rounded-md border cursor-pointer transition-colors ${
                      selectedRoute?.id === route.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedRoute(route)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {route.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistance(route.distanceKm)} •{" "}
                          {formatDate(route.createdAt)}
                        </p>
                        {route.isPublic && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                            Public
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {routes.length > 5 && (
                  <div className="text-center pt-3">
                    <Link
                      to="/routes"
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      View all {routes.length} routes →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Map View */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedRoute ? selectedRoute.name : "Select a route to view"}
              </h3>
              {selectedRoute && selectedRoute.isPublic && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        getRouteShareUrl(selectedRoute.id)
                      );
                      // You could add a toast notification here
                    }}
                    className="btn btn-secondary text-xs"
                  >
                    🔗 Copy Share Link
                  </button>
                  <a
                    href={getRouteShareUrl(selectedRoute.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary text-xs"
                  >
                    🌐 View Public
                  </a>
                </div>
              )}
            </div>

            <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
              {selectedRoute ? (
                <MapView
                  routePolyline={selectedRoute.polyline}
                  gpxUrl={selectedRoute.gpxUrl}
                  elevationProfile={null}
                  height="100%"
                  showControls={true}
                />
              ) : (
                <div className="text-center text-gray-500">
                  <span className="text-4xl mb-2 block">🗺️</span>
                  <p>Select a route to view on the map</p>
                </div>
              )}
            </div>

            {selectedRoute && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Distance:</span>{" "}
                  {formatDistance(selectedRoute.distanceKm)}
                </div>
                <div>
                  <span className="font-medium">Elevation Gain:</span>{" "}
                  {Math.round(selectedRoute.elevationGain)}m
                </div>
                {selectedRoute.description && (
                  <div className="col-span-2">
                    <span className="font-medium">Description:</span>{" "}
                    {selectedRoute.description}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/routes" className="activity-card">
            <div className="text-center">
              <span className="text-2xl mb-2 block">📤</span>
              <h4 className="font-medium">Upload Route</h4>
              <p className="text-sm text-gray-500 mt-1">
                Add a new GPX track to your collection
              </p>
            </div>
          </Link>

          <Link to="/admin/upload" className="activity-card">
            <div className="text-center">
              <span className="text-2xl mb-2 block">📸</span>
              <h4 className="font-medium">Upload Photos</h4>
              <p className="text-sm text-gray-500 mt-1">
                Add photos to your routes
              </p>
            </div>
          </Link>

          <Link to="/admin/strava" className="activity-card">
            <div className="text-center">
              <span className="text-2xl mb-2 block">🔄</span>
              <h4 className="font-medium">Strava Sync</h4>
              <p className="text-sm text-gray-500 mt-1">
                Connect and sync your Strava activities
              </p>
            </div>
          </Link>

          <Link to="/settings" className="activity-card">
            <div className="text-center">
              <span className="text-2xl mb-2 block">⚙️</span>
              <h4 className="font-medium">Settings</h4>
              <p className="text-sm text-gray-500 mt-1">
                Manage your account and preferences
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
