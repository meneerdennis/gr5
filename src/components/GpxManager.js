import React, { useState, useEffect } from "react";
import { UserRouteService, parseGPXFile } from "../services/userRouteService";
import { useAuth } from "../contexts/AuthContext";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../services/firebase";

function GpxManager() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [routeName, setRouteName] = useState("");
  const [routeDescription, setRouteDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [routeService, setRouteService] = useState(null);

  useEffect(() => {
    if (user) {
      const service = new UserRouteService(user.uid);
      setRouteService(service);
      loadRoutes(service);
    }
  }, [user]);

  const loadRoutes = async (service) => {
    try {
      setLoading(true);
      const userRoutes = await service.getUserRoutes();
      setRoutes(userRoutes);
    } catch (error) {
      console.error("Error loading routes:", error);
      setError("Failed to load routes");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith(".gpx")) {
      setSelectedFile(file);
      setRouteName(file.name.replace(".gpx", ""));
      setError("");
    } else {
      setError("Please select a valid GPX file");
      setSelectedFile(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile || !routeName.trim()) {
      setError("Please select a GPX file and enter a route name");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      // Parse GPX file
      const parsedData = await parseGPXFile(selectedFile);

      // Upload GPX file to storage
      const fileRef = ref(
        storage,
        `gpx-files/${user.uid}/${Date.now()}-${selectedFile.name}`
      );
      await uploadBytes(fileRef, selectedFile);
      const gpxUrl = await getDownloadURL(fileRef);

      // Create route data
      const routeData = {
        name: routeName.trim(),
        description: routeDescription.trim(),
        gpxUrl: gpxUrl,
        polyline: parsedData.coordinates
          .map((coord) => coord.join(","))
          .join(";"),
        coordinates: parsedData.coordinates,
        distanceKm: parsedData.distanceKm,
        elevationGain: parsedData.elevationGain,
        startLocation: parsedData.startLocation,
        endLocation: parsedData.endLocation,
        isPublic: isPublic,
      };

      // Save to database
      const newRoute = await routeService.createRoute(routeData);

      // Update local state
      setRoutes([newRoute, ...routes]);

      // Reset form
      setSelectedFile(null);
      setRouteName("");
      setRouteDescription("");
      setIsPublic(false);
      e.target.reset();

      setSuccess(`Route "${routeData.name}" uploaded successfully!`);
    } catch (error) {
      console.error("Error uploading route:", error);
      setError(error.message || "Failed to upload route");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRoute = async (routeId, routeName) => {
    if (!window.confirm(`Are you sure you want to delete "${routeName}"?`)) {
      return;
    }

    try {
      await routeService.deleteRoute(routeId);
      setRoutes(routes.filter((route) => route.id !== routeId));
      setSuccess(`Route "${routeName}" deleted successfully`);
    } catch (error) {
      console.error("Error deleting route:", error);
      setError("Failed to delete route");
    }
  };

  const togglePublic = async (routeId, currentPublic, routeName) => {
    try {
      await routeService.updateRoute(routeId, { isPublic: !currentPublic });
      setRoutes(
        routes.map((route) =>
          route.id === routeId ? { ...route, isPublic: !currentPublic } : route
        )
      );
      setSuccess(
        `Route "${routeName}" is now ${!currentPublic ? "public" : "private"}`
      );
    } catch (error) {
      console.error("Error updating route privacy:", error);
      setError("Failed to update route privacy");
    }
  };

  const formatDistance = (distance) => {
    return `${distance.toFixed(2)} km`;
  };

  const formatElevation = (elevation) => {
    return `${Math.round(elevation)} m`;
  };

  if (!user) {
    return (
      <div className="text-center p-8">
        <div className="glass-card p-8">
          <p className="text-gray-600">Please sign in to manage your routes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Routes</h2>
        <p className="text-gray-600">
          Upload and manage your GPX tracks. Create custom routes for your
          hiking adventures.
        </p>
      </div>

      {/* Upload Form */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Upload New Route
        </h3>

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GPX File
            </label>
            <input
              type="file"
              accept=".gpx"
              onChange={handleFileSelect}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Route Name
            </label>
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="Enter route name"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={routeDescription}
              onChange={(e) => setRouteDescription(e.target.value)}
              placeholder="Describe your route..."
              rows={3}
              className="input"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="isPublic"
              className="ml-2 block text-sm text-gray-900"
            >
              Make this route public (shareable with others)
            </label>
          </div>

          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="btn btn-primary"
          >
            {uploading ? "Uploading..." : "Upload Route"}
          </button>
        </form>
      </div>

      {/* Messages */}
      {error && (
        <div className="glass-card p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="glass-card p-4">
          <p className="text-green-600">{success}</p>
        </div>
      )}

      {/* Routes List */}
      <div className="glass-card">
        <div
          className="p-6 border-b"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <h3 className="text-lg font-semibold text-gray-900">
            Your Routes ({routes.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading routes...</p>
          </div>
        ) : routes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No routes yet. Upload your first GPX file to get started!</p>
          </div>
        ) : (
          <div
            className="divide-y"
            style={{ borderColor: "var(--glass-border)" }}
          >
            {routes.map((route) => (
              <div key={route.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">
                        {route.name}
                      </h4>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          route.isPublic
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {route.isPublic ? "Public" : "Private"}
                      </span>
                    </div>

                    {route.description && (
                      <p className="text-gray-600 mb-3">{route.description}</p>
                    )}

                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <span>📏 {formatDistance(route.distanceKm)}</span>
                      <span>⛰️ {formatElevation(route.elevationGain)}</span>
                      <span>
                        📅 {new Date(route.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() =>
                        togglePublic(route.id, route.isPublic, route.name)
                      }
                      className="btn btn-secondary text-xs"
                    >
                      {route.isPublic ? "Make Private" : "Make Public"}
                    </button>

                    <button
                      onClick={() => handleDeleteRoute(route.id, route.name)}
                      className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GpxManager;
