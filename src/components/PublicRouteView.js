import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { UserRouteService } from "../services/userRouteService";
import MapView from "./MapView";

function PublicRouteView() {
  const { username, routeId } = useParams();
  const [route, setRoute] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPublicRoute();
  }, [username, routeId]);

  const loadPublicRoute = async () => {
    try {
      setLoading(true);
      setError("");

      const routeService = new UserRouteService();
      const publicRoute = await routeService.getRouteByUsername(
        username,
        routeId
      );

      if (!publicRoute) {
        setError("Route not found or is not public.");
        return;
      }

      setRoute(publicRoute);
      setUserProfile({
        displayName: publicRoute.userDisplayName,
        photoURL: publicRoute.userPhoto,
        username: publicRoute.username,
      });
    } catch (error) {
      console.error("Error loading public route:", error);
      setError("Failed to load route.");
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (distance) => {
    return `${distance.toFixed(2)} km`;
  };

  const formatElevation = (elevation) => {
    return `${Math.round(elevation)} m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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

  if (error || !route) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="text-6xl mb-4">🗺️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Route Not Found
          </h1>
          <p className="text-gray-300 mb-4">
            {error || "This route doesn't exist or is not publicly accessible."}
          </p>
          <a href="/" className="btn btn-primary">
            Go to TrailMapper
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="glass-card m-4 mb-0 rounded-b-none">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {userProfile?.photoURL && (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {route.name}
                </h1>
                <p className="text-gray-300">
                  Shared by {userProfile?.displayName || userProfile?.username}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/" className="btn btn-secondary">
                🥾 TrailMapper
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Route Info */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="glass-card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatDistance(route.distanceKm)}
              </div>
              <div className="text-sm text-gray-400">Distance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatElevation(route.elevationGain)}
              </div>
              <div className="text-sm text-gray-400">Elevation Gain</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatDate(route.createdAt)}
              </div>
              <div className="text-sm text-gray-400">Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">🌍</div>
              <div className="text-sm text-gray-400">Public Route</div>
            </div>
          </div>

          {route.description && (
            <div className="mt-4 pt-4 border-t border-gray-600">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Description
              </h3>
              <p className="text-gray-300">{route.description}</p>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Route Map</h3>
          <div className="h-96 rounded-lg">
            <MapView
              routePolyline={route.polyline}
              gpxUrl={route.gpxUrl}
              elevationProfile={null}
              height="100%"
              showControls={true}
              photos={route.photos || []}
            />
          </div>
        </div>

        {/* Activities */}
        {route.activities && route.activities.length > 0 && (
          <div className="glass-card p-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Recent Activities
            </h3>
            <div className="space-y-3">
              {route.activities.slice(0, 3).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-800 bg-opacity-30 rounded-md"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {activity.name || "Hiking Activity"}
                    </p>
                    <p className="text-sm text-gray-400">
                      {formatDistance(activity.distanceKm || 0)} •{" "}
                      {formatDate(activity.startDate)}
                    </p>
                  </div>
                  <div className="text-sm text-gray-400">
                    🏃 {Math.round(activity.movingTimeSec / 60)} min
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        {route.photos && route.photos.length > 0 && (
          <div className="glass-card p-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Photos from this Route ({route.photos.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {route.photos.slice(0, 12).map((photo, index) => (
                <div
                  key={index}
                  className="aspect-square bg-gray-600 rounded-md overflow-hidden cursor-pointer hover:opacity-75 transition-opacity"
                  onClick={() => window.open(photo.url, "_blank")}
                >
                  <img
                    src={photo.thumbnailUrl || photo.url}
                    alt={photo.caption || "Route photo"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            {route.photos.length > 12 && (
              <p className="text-center text-gray-400 mt-4">
                And {route.photos.length - 12} more photos...
              </p>
            )}
          </div>
        )}

        {/* Footer CTA */}
        <div className="glass-card p-8 mt-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Create Your Own Route
          </h2>
          <p className="text-gray-300 mb-6">
            Upload your GPX tracks, share photos, and create interactive maps of
            your hiking adventures.
          </p>
          <a href="/" className="btn btn-primary">
            Get Started with TrailMapper
          </a>
        </div>
      </div>
    </div>
  );
}

export default PublicRouteView;
