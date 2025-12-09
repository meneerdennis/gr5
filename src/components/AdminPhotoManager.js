import React, { useState, useEffect, useRef } from "react";
import {
  getAllPhotos,
  updatePhoto,
  deletePhoto,
  createThumbnailsForExistingPhotos,
} from "../services/photoService";
import { getHikesFromFirebase } from "../services/firebaseService";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const photoIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAuNSAyMS41QzIxLjQ4IDE3LjY3MyAyMS41IDEyLjc4NiAyMS41IDhDMjEuNSAzLjYzNjQgMTYuOTQ2IC0xIDExLjUgLTFDMTAuMDQ0IC0xIDguNSAwLjc1MTQgOC41IDIuNTAwOEM4LjUgMi43Mjk0IDguNTI3NyAyLjk2NDYgOC41NSAzLjIxOUw4LjU1IDQuNDI2MUM4LjU1IDQuNDY5IDguNTU4NCA0LjUxMjIgOC41NjcgNC41NTI2TDguNTY3IDQuOTg2MUM4LjU2NyA1LjAzNDQgOC41NjkgNS4wODE0IDguNTcyIDUuMTI5TDguNTcyIDUuNDQ5QzguNTcyIDUuNDk0NiA4LjU3MDYgNS41Mzg3IDguNTY5IDUuNTgyM0w4LjU2OSA1LjkyNTZDNi4yNSA1OS44NTcgMi42OSA0Mi44MzcgMi42OSAyMC44MzNDMi42OSAyMC43OTcgMi42OSAyMC43NjIgMi43MDIgMjAuNzI3TDIuNzAyIDIwLjQ3NUMyLjcwMiAxNi43NTcgMy4yOTEgMTMuMjg3IDQuMjQ2IDEwLjI1NkM1LjI2MiA3LjEzMzYgNi45NDYgNC40NDQzIDkuNzA3IDIuNzg2MUMxMC42ODIgMS45NTM0IDExLjc0OSAxLjUgMTIuODU5IDEuNUMyNy44NTkgMS41IDM5LjUgMTMuMTQxIDM5LjUgMjguMDQxQzM5LjUgNDIuOTUxIDMxLjA3NSA1MS41IDIxLjc1MSA1MS41QzE2LjM2NiA1MS41IDExLjc5NSA0OC4yODQgOS4zMDM5IDQ0LjAzNjlDOC44NzM3IDQwLjgwOSA4LjUgMzcuNTE5IDguNSAzNC4wNzFDOC41IDMyLjA3MSA4Ljk1NDQgMzAuMTk0IDkuNzI3MyAyOC40NTVMMTIuMTIzIDIwLjI4NEw4LjUwNSAzNC4wMTdDOC41MDUgMzQuMTIyIDguNTA2IDMyLjMxNiA4LjUwNiAzMS43MDhDOC41MDYgMzAuMzU2IDguNTY3IDI5LjA3IDguNzE3IDI3Ljk1OEw4LjcxNyAyNy41NDdDOC43MTcgMjcuMTQ4IDguNzQ0IDI2Ljc1MyA4Ljc5IDI2LjM5NkwxMC4yMjUgMTguMjM2TDEyLjMwMyAyMC4yNTdMMTQuMzc1IDE4LjIyOEwxNS44NTIgMTkuNzE2QzE3LjQ4OSAyMS4xOTUgMTguNTQyIDIuNTcyIDE5LjI2NCAxNy44NTZDMjAuNzIgMTYuMzk2IDIwLjUgMjEuNSAyMC41IDIxLjVaIiBmaWxsPSIjZmY1NzIyIi8+PC9zdmc+",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function AdminPhotoManager() {
  const [photos, setPhotos] = useState([]);
  const [hikes, setHikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [editForm, setEditForm] = useState({
    caption: "",
    description: "",
    route: "",
  });
  const [deletingPhoto, setDeletingPhoto] = useState(null);
  const [deletingPhotos, setDeletingPhotos] = useState([]); // For bulk delete
  const [filterRoute, setFilterRoute] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showMap, setShowMap] = useState(false); // Start with map hidden for better mobile performance
  const [showFullImage, setShowFullImage] = useState(null); // For full-size image modal
  const [mapCenter, setMapCenter] = useState([46.8182, 8.2275]); // Switzerland center
  const [creatingThumbnails, setCreatingThumbnails] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState(new Set()); // For multi-select
  const tableContainerRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [photosData, hikesData] = await Promise.all([
        getAllPhotos(),
        getHikesFromFirebase(),
      ]);

      console.log("Loaded photos data:", photosData.length, "photos");
      console.log("Sample photo:", photosData[0]);

      // Use stored thumbnail URLs, fallback to original image if no thumbnail
      const photosWithThumbnails = photosData.map((photo) => {
        const thumbnail = photo.thumbnailUrl || photo.url;
        console.log(
          `Photo ${photo.id}: thumbnailUrl=${photo.thumbnailUrl}, using=${thumbnail}`
        );
        return {
          ...photo,
          thumbnail: thumbnail, // Use stored thumbnail or fallback to original
        };
      });

      setPhotos(photosWithThumbnails);
      setHikes(hikesData);
      // Clear selection when data is reloaded
      setSelectedPhotos(new Set());
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Multi-select functionality
  const togglePhotoSelection = (photoId) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPhotos.size === filteredPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(filteredPhotos.map((photo) => photo.id)));
    }
  };

  const clearSelection = () => {
    setSelectedPhotos(new Set());
  };

  const startEdit = (photo) => {
    setEditingPhoto(photo.id);
    setEditForm({
      caption: photo.caption || "",
      description: photo.description || "",
      route: photo.hikeId || "",
    });
  };

  const cancelEdit = () => {
    setEditingPhoto(null);
    setEditForm({
      caption: "",
      description: "",
      route: "",
    });
  };

  const saveEdit = async () => {
    if (!editingPhoto) return;

    try {
      const updates = {
        caption: editForm.caption,
        description: editForm.description,
        hikeId: editForm.route,
      };

      await updatePhoto(editingPhoto, updates);

      // Reload photos to reflect changes
      await loadData();

      setEditingPhoto(null);
      setEditForm({
        caption: "",
        description: "",
        route: "",
      });
    } catch (error) {
      console.error("Error updating photo:", error);
      alert("Failed to update photo: " + error.message);
    }
  };

  const confirmDelete = (photo) => {
    setDeletingPhoto(photo);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
  };

  const confirmBulkDelete = () => {
    const photosToDelete = filteredPhotos.filter((photo) =>
      selectedPhotos.has(photo.id)
    );
    setDeletingPhotos(photosToDelete);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
  };

  const cancelDelete = () => {
    setDeletingPhoto(null);
    setDeletingPhotos([]);
    // Restore body scroll
    document.body.style.overflow = "unset";
    document.body.classList.remove("modal-open");
  };

  const deleteConfirmed = async () => {
    try {
      let successCount = 0;
      let failCount = 0;

      // Handle single photo deletion
      if (deletingPhoto) {
        console.log(
          "Deleting photo:",
          deletingPhoto.id,
          deletingPhoto.originalName
        );
        const result = await deletePhoto(
          deletingPhoto.id,
          deletingPhoto.hikeId
        );

        if (result.success) {
          successCount = 1;
        } else {
          failCount = 1;
          throw new Error(result.error || "Unknown error occurred");
        }
      }
      // Handle bulk photo deletion
      else if (deletingPhotos.length > 0) {
        console.log(`Deleting ${deletingPhotos.length} photos...`);

        for (const photo of deletingPhotos) {
          try {
            const result = await deletePhoto(photo.id, photo.hikeId);
            if (result.success) {
              successCount++;
            } else {
              failCount++;
              console.warn(
                `Failed to delete ${photo.originalName}:`,
                result.error
              );
            }
          } catch (error) {
            failCount++;
            console.warn(
              `Error deleting ${photo.originalName}:`,
              error.message
            );
          }
        }
      }

      // Show success/failure message
      if (successCount > 0) {
        const successMsg = document.createElement("div");
        successMsg.textContent = `Successfully deleted ${successCount} photo(s)!`;
        successMsg.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          z-index: 10000;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(successMsg);
        setTimeout(() => document.body.removeChild(successMsg), 3000);
      }

      if (failCount > 0) {
        alert(`Failed to delete ${failCount} photo(s). Please try again.`);
      }

      // Reload photos to reflect changes
      await loadData();
      setDeletingPhoto(null);
      setDeletingPhotos([]);
      clearSelection();
    } catch (error) {
      console.error("Error deleting photo(s):", error);
      alert("Failed to delete photo(s): " + error.message);
      // Don't close the modal on error so user can try again
    }
  };

  const filteredPhotos = photos.filter((photo) => {
    const matchesRoute = !filterRoute || photo.hikeId === filterRoute;
    const matchesSearch =
      !searchTerm ||
      photo.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.originalName?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesRoute && matchesSearch;
  });

  // Fix iOS Safari horizontal scroll position bug
  useEffect(() => {
    const fixScrollPosition = () => {
      if (tableContainerRef.current) {
        console.log("Fixing scroll position to 0");
        // Multiple approaches to ensure scroll position is 0
        tableContainerRef.current.scrollLeft = 0;

        // Force a reflow
        tableContainerRef.current.style.transform = "translateX(0)";
        tableContainerRef.current.style.marginLeft = "0";

        // Try scrolling again after a short delay
        setTimeout(() => {
          if (tableContainerRef.current) {
            tableContainerRef.current.scrollLeft = 0;
            console.log(
              "Applied secondary scroll fix, scrollLeft:",
              tableContainerRef.current.scrollLeft
            );
          }
        }, 50);
      }
    };

    // Fix immediately
    fixScrollPosition();

    // Fix after component renders
    setTimeout(fixScrollPosition, 200);

    // Fix after images/resources load
    setTimeout(fixScrollPosition, 500);
  }, [filteredPhotos]); // Re-run when photos load/filter

  const openFullImage = (photo) => {
    console.log("Opening full image modal for photo:", photo);
    console.log("Photo URL:", photo.url);
    console.log("Photo thumbnail URL:", photo.thumbnailUrl);

    // Create a backup plan - if the URL fails, we'll try the thumbnail
    const imageToShow = {
      ...photo,
      backupUrl: photo.thumbnailUrl || photo.url,
    };

    setShowFullImage(imageToShow);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
  };

  const closeFullImage = () => {
    setShowFullImage(null);
    // Restore body scroll
    document.body.style.overflow = "unset";
    document.body.classList.remove("modal-open");
  };

  const createThumbnailsForPhotos = async () => {
    try {
      setCreatingThumbnails(true);
      const result = await createThumbnailsForExistingPhotos();

      if (result.success) {
        alert(
          `Successfully created thumbnails for ${result.successful} photos. ${result.failed} failed.`
        );
        // Reload photos to reflect the changes
        await loadData();
      } else {
        alert("Failed to create thumbnails: " + result.error);
      }
    } catch (error) {
      console.error("Error creating thumbnails:", error);
      alert("Error creating thumbnails: " + error.message);
    } finally {
      setCreatingThumbnails(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getHikeName = (hikeId) => {
    const hike = hikes.find((h) => h.id === hikeId);
    return hike ? hike.name : "Unknown Route";
  };

  const getMapCenterFromPhotos = () => {
    const photosWithLocation = filteredPhotos.filter(
      (p) => p.lat && p.lng && !isNaN(p.lat) && !isNaN(p.lng)
    );

    if (photosWithLocation.length === 0) return [46.8182, 8.2275];

    const avgLat =
      photosWithLocation.reduce((sum, p) => sum + p.lat, 0) /
      photosWithLocation.length;
    const avgLng =
      photosWithLocation.reduce((sum, p) => sum + p.lng, 0) /
      photosWithLocation.length;

    return [avgLat, avgLng];
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="glass-card p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto mb-4"></div>
            <p className="text-gray-200">Loading photos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <div className="w-full mx-auto max-w-none sm:max-w-4xl lg:max-w-6xl xl:max-w-7xl">
        {/* Header */}
        <div
          className="glass-card p-4 sm:p-6 mb-6"
          style={{ marginBottom: "10px" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-2">
                📸 Photo Management
              </h1>
              <p className="text-gray-300">
                Manage your uploaded photos - edit captions, routes, and delete
                unwanted images.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-2">
              <button onClick={loadData} className="btn btn-secondary">
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Filter by Route
              </label>
              <select
                value={filterRoute}
                onChange={(e) => setFilterRoute(e.target.value)}
                className="input"
              >
                <option value="" style={{ color: "black" }}>
                  All Routes
                </option>
                {hikes.map((hike) => (
                  <option
                    key={hike.id}
                    value={hike.id}
                    style={{ color: "black" }}
                  >
                    {hike.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Search Photos
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search caption, description, or filename..."
                className="input"
              />
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-300">
                <strong>{filteredPhotos.length}</strong> photo(s) found
                {selectedPhotos.size > 0 && (
                  <span className="ml-2 text-blue-300">
                    • {selectedPhotos.size} selected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedPhotos.size > 0 && (
            <div className="bg-blue-900 bg-opacity-30 border border-blue-500 border-opacity-30 rounded-lg p-3 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="text-blue-300 text-sm mb-2 sm:mb-0">
                  <strong>{selectedPhotos.size}</strong> photo(s) selected
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={clearSelection}
                    className="btn btn-secondary text-xs"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={confirmBulkDelete}
                    className="btn btn-danger text-xs"
                  >
                    🗑️ Delete Selected ({selectedPhotos.size})
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Photos Table */}
        <div className="glass-card p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">
            📷 Photos ({filteredPhotos.length})
          </h2>

          {filteredPhotos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📷</div>
              <h3 className="text-xl font-medium text-gray-100 mb-2">
                No photos found
              </h3>
              <p className="text-gray-300">
                {searchTerm || filterRoute
                  ? "Try adjusting your search or filter criteria."
                  : "Upload some photos first!"}
              </p>
            </div>
          ) : (
            /* Table View */
            <div
              className="overflow-x-auto table-scroll-container"
              ref={tableContainerRef}
            >
              <table className="min-w-full table-mobile-responsive">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={
                          selectedPhotos.size === filteredPhotos.length &&
                          filteredPhotos.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Thumbnail
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Caption
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-600">
                  {filteredPhotos.map((photo) => (
                    <tr
                      key={photo.id}
                      className={`hover:bg-gray-800 hover:bg-opacity-30 ${
                        selectedPhotos.has(photo.id)
                          ? "bg-blue-900 bg-opacity-20"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedPhotos.has(photo.id)}
                          onChange={() => togglePhotoSelection(photo.id)}
                          className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <img
                          src={photo.thumbnail}
                          alt={photo.caption || "Photo"}
                          className="photo-thumbnail"
                          onClick={() => openFullImage(photo)}
                          onError={(e) => {
                            console.warn(
                              "Table thumbnail failed to load:",
                              photo.url
                            );
                            e.target.src = photo.url; // Fallback to original
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-100">
                          {photo.originalName}
                        </div>
                        {photo.size && (
                          <div className="text-sm text-gray-400">
                            {(photo.size / 1024 / 1024).toFixed(1)} MB
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingPhoto === photo.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editForm.caption}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  caption: e.target.value,
                                })
                              }
                              className="input"
                              placeholder="Enter caption..."
                            />
                            <select
                              value={editForm.route}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  route: e.target.value,
                                })
                              }
                              className="input"
                            >
                              <option value="" style={{ color: "black" }}>
                                Select route...
                              </option>
                              {hikes.map((hike) => (
                                <option
                                  key={hike.id}
                                  value={hike.id}
                                  style={{ color: "black" }}
                                >
                                  {hike.name}
                                </option>
                              ))}
                            </select>
                            <div className="flex space-x-1">
                              <button
                                onClick={saveEdit}
                                className="btn btn-primary text-xs"
                              >
                                💾
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="btn btn-secondary text-xs"
                              >
                                ❌
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-sm text-gray-200">
                              {photo.caption || "No caption"}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        {getHikeName(photo.hikeId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(photo.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {editingPhoto === photo.id ? null : (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => startEdit(photo)}
                              className="text-primary-400 hover:text-primary-300 transition-colors"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => confirmDelete(photo)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Full-Size Image Modal */}
      {showFullImage && (
        <div className="full-image-modal" onClick={closeFullImage}>
          <div
            className="full-image-container"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={showFullImage.url}
              alt={showFullImage.caption || "Full size photo"}
              className="max-w-full max-h-[80vh] object-contain mx-auto block"
              style={{
                maxHeight: "80vh",
                maxWidth: "90vw",
              }}
              onLoad={() =>
                console.log(
                  "Modal image loaded successfully:",
                  showFullImage.url
                )
              }
              onError={(e) => {
                console.error("Modal image failed to load:", showFullImage.url);
                console.log("Error target:", e.target);
                console.log("Error src:", e.target.src);
                // Try to show the backup image as fallback
                if (
                  showFullImage.backupUrl &&
                  e.target.src !== showFullImage.backupUrl
                ) {
                  console.log(
                    "Falling back to backup image:",
                    showFullImage.backupUrl
                  );
                  e.target.src = showFullImage.backupUrl;
                } else {
                  console.log("All image sources failed, showing error state");
                  e.target.style.display = "none";
                }
              }}
            />
            <button onClick={closeFullImage} className="close-button">
              ❌
            </button>
            {showFullImage.caption && (
              <div className="full-image-caption">
                <p className="text-sm font-medium">{showFullImage.caption}</p>
                <p className="text-xs opacity-75">
                  {showFullImage.originalName}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Single Photo */}
      {deletingPhoto && (
        <div className="admin-modal">
          <div className="glass-card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">
              Confirm Deletion
            </h3>

            <div className="mb-4">
              <img
                src={deletingPhoto.thumbnail}
                alt="Delete preview"
                className="w-24 h-24 object-cover rounded mb-3"
                onError={(e) => {
                  console.warn(
                    "Delete modal thumbnail failed to load:",
                    deletingPhoto.url
                  );
                  e.target.style.display = "none";
                }}
              />
              <p className="text-gray-200 mb-2">
                Are you sure you want to delete this photo?
              </p>
              <p className="text-sm text-gray-300">
                <strong>Caption:</strong>{" "}
                {deletingPhoto.caption || "No caption"}
              </p>
              <p className="text-sm text-gray-300">
                <strong>File:</strong> {deletingPhoto.originalName}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={deleteConfirmed}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Bulk Delete */}
      {deletingPhotos.length > 0 && (
        <div className="admin-modal">
          <div className="glass-card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">
              Confirm Bulk Deletion
            </h3>

            <div className="mb-4">
              <p className="text-gray-200 mb-3">
                Are you sure you want to delete{" "}
                <strong>{deletingPhotos.length}</strong> photo(s)?
              </p>

              <div className="max-h-32 overflow-y-auto bg-gray-800 bg-opacity-50 rounded p-2 mb-3">
                {deletingPhotos.map((photo, index) => (
                  <div key={photo.id} className="text-sm text-gray-300 mb-1">
                    {index + 1}. {photo.originalName}
                  </div>
                ))}
              </div>

              <p className="text-sm text-yellow-300">
                ⚠️ This action cannot be undone.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={deleteConfirmed}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPhotoManager;
