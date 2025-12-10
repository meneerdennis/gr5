import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { UserRouteService } from "../services/userRouteService";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../services/firebase";

function PhotoManager() {
  const { user, userProfile } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [filter, setFilter] = useState("all");

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

      // Load all photos from all routes
      const allPhotos = [];
      userRoutes.forEach((route) => {
        if (route.photos && route.photos.length > 0) {
          route.photos.forEach((photo) => {
            allPhotos.push({
              ...photo,
              routeName: route.name,
              routeId: route.id,
            });
          });
        }
      });

      setPhotos(allPhotos);
    } catch (error) {
      console.error("Error loading user data:", error);
      setMessage({ type: "error", text: "Failed to load photos." });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleUploadPhotos = async (routeId) => {
    if (selectedFiles.length === 0) {
      setMessage({ type: "error", text: "Please select photos to upload." });
      return;
    }

    setUploading(true);
    setMessage({ type: "", text: "" });

    try {
      const routeService = new UserRouteService(user.uid);
      const uploadedPhotos = [];

      for (const file of selectedFiles) {
        // Upload to Firebase Storage
        const fileRef = ref(
          storage,
          `photos/${user.uid}/${Date.now()}-${file.name}`
        );
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);

        // Create photo object
        const photo = {
          url: downloadURL,
          caption: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          uploadedAt: new Date().toISOString(),
          fileName: file.name,
          size: file.size,
        };

        uploadedPhotos.push(photo);
      }

      // Add photos to route
      for (const photo of uploadedPhotos) {
        await routeService.addPhotoToRoute(routeId, photo);
      }

      // Refresh data
      await loadUserData();

      setMessage({
        type: "success",
        text: `Successfully uploaded ${uploadedPhotos.length} photos!`,
      });
      setSelectedFiles([]);

      // Clear file input
      const fileInput = document.getElementById("photo-upload");
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Error uploading photos:", error);
      setMessage({
        type: "error",
        text: "Failed to upload photos. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (routeId, photoIndex) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    try {
      const routeService = new UserRouteService(user.uid);
      const route = await routeService.getRoute(routeId);

      if (route && route.photos) {
        const updatedPhotos = route.photos.filter(
          (_, index) => index !== photoIndex
        );
        await routeService.updateRoute(routeId, { photos: updatedPhotos });

        await loadUserData();
        setMessage({ type: "success", text: "Photo deleted successfully!" });
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      setMessage({ type: "error", text: "Failed to delete photo." });
    }
  };

  const filteredPhotos = photos.filter((photo) => {
    if (filter === "all") return true;
    if (filter === "recent") {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(photo.uploadedAt) > oneWeekAgo;
    }
    return photo.routeId === filter;
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Please sign in
          </h2>
          <p className="text-gray-300">
            You need to be signed in to manage photos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Photo Manager</h1>
        <p className="text-gray-300">
          Upload and manage photos for your routes.
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <div
          className={`mb-6 p-4 rounded-md ${
            message.type === "success"
              ? "bg-green-100 text-green-800 border border-green-300"
              : message.type === "error"
              ? "bg-red-100 text-red-800 border border-red-300"
              : "bg-blue-100 text-blue-800 border border-blue-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Upload Photos
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Route
                </label>
                <select
                  value={selectedRoute || ""}
                  onChange={(e) => setSelectedRoute(e.target.value)}
                  className="input"
                >
                  <option value="">Choose a route...</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Photos
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                <p className="mt-1 text-sm text-gray-400">
                  You can select multiple photos at once
                </p>
              </div>

              {selectedFiles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    Selected Files ({selectedFiles.length})
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="text-xs text-gray-400 flex justify-between"
                      >
                        <span className="truncate">{file.name}</span>
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => handleUploadPhotos(selectedRoute)}
                disabled={
                  !selectedRoute || selectedFiles.length === 0 || uploading
                }
                className="btn btn-primary w-full"
              >
                {uploading ? "Uploading..." : "Upload Photos"}
              </button>
            </div>
          </div>

          {/* Route Stats */}
          <div className="glass-card p-6 mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Your Routes
            </h2>
            <div className="space-y-3">
              {routes.map((route) => {
                const routePhotos = photos.filter(
                  (p) => p.routeId === route.id
                );
                return (
                  <div
                    key={route.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {route.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {routePhotos.length} photos
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedRoute(route.id)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Select
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Photos Gallery */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Your Photos ({filteredPhotos.length})
              </h2>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="input py-1 px-3 text-sm"
              >
                <option value="all">All Photos</option>
                <option value="recent">Recent (7 days)</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-300">Loading photos...</p>
              </div>
            ) : filteredPhotos.length === 0 ? (
              <div className="p-8 text-center">
                <span className="text-4xl mb-4 block">📸</span>
                <p className="text-gray-400 mb-2">No photos found</p>
                <p className="text-sm text-gray-500">
                  {filter === "all"
                    ? "Upload your first photos to get started"
                    : `No photos match the current filter`}
                </p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredPhotos.map((photo, index) => (
                    <div
                      key={index}
                      className="group relative aspect-square bg-gray-600 rounded-lg overflow-hidden"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={() => window.open(photo.url, "_blank")}
                      />

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-end">
                        <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity w-full">
                          <p className="text-xs font-medium truncate">
                            {photo.caption}
                          </p>
                          <p className="text-xs opacity-75 truncate">
                            {photo.routeName}
                          </p>
                          <p className="text-xs opacity-75">
                            {formatDate(photo.uploadedAt)}
                          </p>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePhoto(
                                photo.routeId,
                                photo.routePhotos?.findIndex(
                                  (p) => p.url === photo.url
                                ) || 0
                              );
                            }}
                            className="mt-2 text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhotoManager;
