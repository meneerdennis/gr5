import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { UserRouteService } from "../services/userRouteService";

function StravaSyncPage() {
  const { user, userProfile, updateUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({
    totalActivities: 0,
    totalDistance: 0,
    lastSync: null,
    connected: false,
  });

  useEffect(() => {
    loadStravaData();
  }, [userProfile]);

  const loadStravaData = () => {
    const isConnected = userProfile?.settings?.stravaConnected || false;
    const lastSync = userProfile?.settings?.stravaLastSync;
    const userActivities = userProfile?.activities || [];

    const totalDistance = userActivities.reduce(
      (sum, activity) => sum + (activity.distanceKm || 0),
      0
    );

    setStats({
      totalActivities: userActivities.length,
      totalDistance,
      lastSync,
      connected: isConnected,
    });

    setActivities(userActivities);
  };

  const handleConnectStrava = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // In a real implementation, this would redirect to Strava OAuth
      // For demo purposes, we'll simulate the connection
      setTimeout(() => {
        const updates = {
          settings: {
            ...userProfile.settings,
            stravaConnected: true,
            stravaAccessToken: "simulated_token", // In real app, store securely
            stravaLastSync: new Date().toISOString(),
          },
        };

        updateUserProfile(updates).then(() => {
          setMessage({
            type: "success",
            text: "Successfully connected to Strava!",
          });
          setStats((prev) => ({
            ...prev,
            connected: true,
            lastSync: new Date().toISOString(),
          }));
        });
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error("Error connecting to Strava:", error);
      setMessage({
        type: "error",
        text: "Failed to connect to Strava. Please try again.",
      });
      setLoading(false);
    }
  };

  const handleDisconnectStrava = async () => {
    if (
      !window.confirm(
        "Are you sure you want to disconnect your Strava account?"
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const updates = {
        settings: {
          ...userProfile.settings,
          stravaConnected: false,
          stravaAccessToken: null,
          stravaLastSync: null,
        },
      };

      await updateUserProfile(updates);
      setMessage({
        type: "success",
        text: "Disconnected from Strava successfully.",
      });
      setStats((prev) => ({ ...prev, connected: false, lastSync: null }));
      setActivities([]);
    } catch (error) {
      console.error("Error disconnecting from Strava:", error);
      setMessage({ type: "error", text: "Failed to disconnect from Strava." });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncActivities = async () => {
    setSyncing(true);
    setMessage({ type: "", text: "" });

    try {
      // Simulate syncing activities from Strava
      setTimeout(() => {
        const mockActivities = [
          {
            id: "1",
            name: "Morning Hike",
            distanceKm: 12.5,
            movingTimeSec: 7200,
            startDate: new Date(Date.now() - 86400000).toISOString(),
            type: "Hike",
            polyline: "encoded_polyline_string",
          },
          {
            id: "2",
            name: "Trail Run",
            distanceKm: 8.2,
            movingTimeSec: 3600,
            startDate: new Date(Date.now() - 172800000).toISOString(),
            type: "Run",
            polyline: "encoded_polyline_string",
          },
          {
            id: "3",
            name: "Weekend Adventure",
            distanceKm: 25.0,
            movingTimeSec: 14400,
            startDate: new Date(Date.now() - 259200000).toISOString(),
            type: "Hike",
            polyline: "encoded_polyline_string",
          },
        ];

        const updatedActivities = [...activities, ...mockActivities];
        setActivities(updatedActivities);

        const updates = {
          activities: updatedActivities,
          settings: {
            ...userProfile.settings,
            stravaLastSync: new Date().toISOString(),
          },
        };

        updateUserProfile(updates).then(() => {
          const totalDistance = updatedActivities.reduce(
            (sum, activity) => sum + (activity.distanceKm || 0),
            0
          );
          setStats((prev) => ({
            ...prev,
            totalActivities: updatedActivities.length,
            totalDistance,
            lastSync: new Date().toISOString(),
          }));
          setMessage({
            type: "success",
            text: `Successfully synced ${mockActivities.length} new activities!`,
          });
        });

        setSyncing(false);
      }, 3000);
    } catch (error) {
      console.error("Error syncing activities:", error);
      setMessage({
        type: "error",
        text: "Failed to sync activities. Please try again.",
      });
      setSyncing(false);
    }
  };

  const formatDistance = (distance) => {
    return `${distance.toFixed(2)} km`;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Please sign in
          </h2>
          <p className="text-gray-600">
            You need to be signed in to access Strava sync.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Strava Integration</h1>
        <p className="text-gray-600">
          Connect your Strava account to automatically sync your hiking
          activities.
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <div
          className={`mb-6 p-4 rounded-md ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : message.type === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className={`w-4 h-4 rounded-full ${
                  stats.connected ? "bg-green-500" : "bg-gray-300"
                }`}
              ></div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  {stats.connected ? "Connected to Strava" : "Not Connected"}
                </h2>
                <p className="text-sm text-gray-500">
                  {stats.connected
                    ? `Last synced: ${
                        stats.lastSync ? formatDate(stats.lastSync) : "Never"
                      }`
                    : "Connect your Strava account to get started"}
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              {!stats.connected ? (
                <button
                  onClick={handleConnectStrava}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Connecting..." : "Connect Strava"}
                </button>
              ) : (
                <button
                  onClick={handleDisconnectStrava}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {stats.connected && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🏃</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Activities
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalActivities}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
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
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🔄</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Last Sync
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.lastSync
                          ? formatDate(stats.lastSync).split(",")[0]
                          : "Never"}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sync Controls */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Sync Activities
              </h2>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Fetch your latest activities from Strava to add them to your
                    routes.
                  </p>
                </div>
                <button
                  onClick={handleSyncActivities}
                  disabled={syncing}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncing ? "Syncing..." : "Sync Now"}
                </button>
              </div>
            </div>
          </div>

          {/* Activities List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Recent Activities ({activities.length})
              </h2>
            </div>

            {activities.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <span className="text-4xl mb-4 block">🏃</span>
                <p className="text-gray-500">No activities synced yet.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Click "Sync Now" to fetch your latest activities from Strava.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {activities.map((activity) => (
                  <div key={activity.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">
                            {activity.type === "Hike"
                              ? "🥾"
                              : activity.type === "Run"
                              ? "🏃"
                              : activity.type === "Walk"
                              ? "🚶"
                              : "🏃‍♂️"}
                          </span>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {activity.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {formatDate(activity.startDate)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <span>{formatDistance(activity.distanceKm)}</span>
                        <span>{formatDuration(activity.movingTimeSec)}</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {activity.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Help Section */}
      {!stats.connected && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            How Strava Integration Works
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • Connect your Strava account to automatically sync hiking
              activities
            </li>
            <li>
              • Activities with GPS data can be converted to routes in
              TrailMapper
            </li>
            <li>
              • Photos from your Strava activities can be added to your routes
            </li>
            <li>
              • Sync runs automatically in the background, or sync manually
              anytime
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default StravaSyncPage;
