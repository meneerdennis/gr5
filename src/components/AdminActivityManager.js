import React, { useState, useEffect } from "react";
import {
  getHikesFromFirebase,
  updateHike,
  addHikeToFirebase,
  parseGPX,
  parseFIT,
  markHikeAsNotified,
  updateHikeCache,
} from "../services/firebaseService";
import { sendHikeNotification } from "../services/notificationService";
import { auth } from "../services/firebase";
import { db } from "../services/firebase";
import { doc, deleteDoc } from "firebase/firestore";

function AdminActivityManager() {
  const [hikes, setHikes] = useState([]);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate paginated hikes
  const totalPages = Math.ceil(hikes.length / itemsPerPage);
  const paginatedHikes = hikes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Reset to first page when hikes change
  useEffect(() => {
    setCurrentPage(1);
  }, [hikes.length]);
  const [loading, setLoading] = useState(true);
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [selectedHike, setSelectedHike] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingHikeId, setEditingHikeId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editSongOfTheDay, setEditSongOfTheDay] = useState("");
  const [editStatus, setEditStatus] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(null);
  const [notifyingHikeId, setNotifyingHikeId] = useState(null);

  useEffect(() => {
    loadHikes();
  }, []);

  const loadHikes = async () => {
    try {
      // Always fetch fresh data (no cache) to ensure new activities show up immediately
      const hikesData = await getHikesFromFirebase(null, { useCache: false });
      // Sort newest → oldest by startDate so admin sees recent activities first
      const sortedHikes = (hikesData || []).slice().sort((a, b) => {
        const da = new Date(a?.startDate || a?.createdAt || 0).getTime();
        const db = new Date(b?.startDate || b?.createdAt || 0).getTime();
        return db - da;
      });

      setHikes(sortedHikes);
      // Update local cache so other parts of the app (and clients using cached data) pick up the deletion immediately
      try {
        updateHikeCache(null, sortedHikes);
      } catch (e) {
        console.warn("Failed to update hike cache:", e);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error loading hikes:", error);
      setLoading(false);
    }
  };

  const handleDeleteClick = (hike) => {
    setSelectedHike(hike);
    setConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedHike) return;

    try {
      setDeleteStatus(null);
      const hikeRef = doc(db, "hikes", selectedHike.id);
      await deleteDoc(hikeRef);

      setDeleteStatus({
        type: "success",
        message: `✅ Successfully deleted activity: ${selectedHike.name}`,
      });

      // Refresh the list
      await loadHikes();
    } catch (error) {
      console.error("Error deleting hike:", error);
      setDeleteStatus({
        type: "error",
        message: `❌ Failed to delete activity: ${error.message}`,
      });
    } finally {
      setConfirmDelete(false);
      setSelectedHike(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete(false);
    setSelectedHike(null);
  };

  const handleEditClick = (hike) => {
    setEditingHikeId(hike.id);
    setEditName(hike.name);
    setEditStart(hike.start || "");
    setEditEnd(hike.end || "");
    setEditSongOfTheDay(hike.songOfTheDay || "");
  };

  const handleSaveEdit = async () => {
    if (!editingHikeId || !editName.trim()) return;

    try {
      setEditStatus(null);
      console.log("Updating hike with payload:", {
        name: editName.trim(),
        start: editStart.trim(),
        end: editEnd.trim(),
        songOfTheDay: editSongOfTheDay,
      });
      const result = await updateHike(editingHikeId, {
        name: editName.trim(),
        start: editStart.trim(),
        end: editEnd.trim(),
        songOfTheDay: editSongOfTheDay,
      });
      if (result.success) {
        setEditStatus({
          type: "success",
          message: "✅ Activity updated successfully.",
        });
        await loadHikes();
      } else {
        setEditStatus({
          type: "error",
          message: `❌ Failed to update activity: ${result.error}`,
        });
      }
    } catch (error) {
      console.error("Error updating hike:", error);
      setEditStatus({
        type: "error",
        message: `❌ Failed to update activity: ${error.message}`,
      });
    } finally {
      setEditingHikeId(null);
      setEditName("");
      setEditStart("");
      setEditEnd("");
      setEditSongOfTheDay("");
    }
  };

  const handleCancelEdit = () => {
    setEditingHikeId(null);
    setEditName("");
    setEditStart("");
    setEditEnd("");
    setEditSongOfTheDay("");
    setEditStatus(null);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(null);

    try {
      let parsedData;
      if (file.name.toLowerCase().endsWith(".gpx")) {
        const content = await file.text();
        parsedData = parseGPX(content);
      } else if (file.name.toLowerCase().endsWith(".fit")) {
        const buffer = await file.arrayBuffer();
        parsedData = await parseFIT(buffer);
      } else {
        throw new Error(
          "Unsupported file type. Please upload .gpx or .fit files.",
        );
      }

      // Add to Firebase
      const result = await addHikeToFirebase(parsedData);
      if (result.success) {
        setUploadStatus({
          type: "success",
          message: `✅ Successfully uploaded activity: ${parsedData.name}`,
        });
        await loadHikes(); // Refresh list
      } else {
        setUploadStatus({
          type: "error",
          message: `❌ Failed to upload activity: ${result.error}`,
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadStatus({
        type: "error",
        message: `❌ Failed to process file: ${error.message}`,
      });
    } finally {
      setUploading(false);
      event.target.value = ""; // Reset file input
    }
  };

  const handleNotifyUsers = async (hike) => {
    if (!hike?.id) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setNotificationStatus({
          type: "error",
          message: "❌ Please sign in to send notifications.",
        });
        return;
      }
      if (currentUser.isAnonymous) {
        setNotificationStatus({
          type: "error",
          message:
            "❌ Anonymous users cannot send notifications. Please sign in with Google.",
        });
        return;
      }
      setNotificationStatus(null);
      setNotifyingHikeId(hike.id);
      const payload = {
        hikeId: hike.id,
        hikeName: hike.name,
        message: hike.name
          ? `New hike: ${hike.name}`
          : "A new hike is available.",
        force: true,
      };
      const notifyResult = await sendHikeNotification(payload);
      if (notifyResult.success) {
        await markHikeAsNotified(hike.id);
        const metaParts = [];
        if (typeof notifyResult.sent === "number") {
          metaParts.push(`sent ${notifyResult.sent}`);
        }
        if (typeof notifyResult.failed === "number") {
          metaParts.push(`failed ${notifyResult.failed}`);
        }
        if (typeof notifyResult.removed === "number") {
          metaParts.push(`removed ${notifyResult.removed}`);
        }
        const metaSuffix = metaParts.length ? ` (${metaParts.join(", ")})` : "";
        setNotificationStatus({
          type: "success",
          message: `✅ Notification sent for activity: ${hike.name}${metaSuffix}`,
        });
        await loadHikes();
      } else {
        setNotificationStatus({
          type: "error",
          message: `❌ Failed to send notification: ${notifyResult.error}`,
        });
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      setNotificationStatus({
        type: "error",
        message: `❌ Failed to send notification: ${error.message}`,
      });
    } finally {
      setNotifyingHikeId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 text-sm">
        <div className="glass-card p-6 text-center">
          <div className="animate-spin rounded-full mx-auto mb-4 border-b-2 border-blue-400 h-10 w-10 sm:h-12 sm:w-12"></div>
          <p className="text-gray-200">Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 text-sm">
      <div className="max-w-7xl mx-auto">
        <div className="glass-card p-4 sm:p-6 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-100 mb-4">
            🗑️ Activity Manager
          </h1>
          <p className="text-gray-300 mb-6">
            View and manage all your activities. Delete unwanted
            activities/hikes from your collection.
          </p>

          {deleteStatus && (
            <div
              className={`p-3 rounded-lg mb-4 ${
                deleteStatus.type === "success"
                  ? "bg-green-900 bg-opacity-30 text-green-300 border border-green-500 border-opacity-30"
                  : "bg-red-900 bg-opacity-30 text-red-300 border border-red-500 border-opacity-30"
              }`}
            >
              <p>{deleteStatus.message}</p>
            </div>
          )}

          {editStatus && (
            <div
              className={`p-3 rounded-lg mb-4 ${
                editStatus.type === "success"
                  ? "bg-green-900 bg-opacity-30 text-green-300 border border-green-500 border-opacity-30"
                  : "bg-red-900 bg-opacity-30 text-red-300 border border-red-500 border-opacity-30"
              }`}
            >
              <p>{editStatus.message}</p>
            </div>
          )}

          {uploadStatus && (
            <div
              className={`p-3 rounded-lg mb-4 ${
                uploadStatus.type === "success"
                  ? "bg-green-900 bg-opacity-30 text-green-300 border border-green-500 border-opacity-30"
                  : "bg-red-900 bg-opacity-30 text-red-300 border border-red-500 border-opacity-30"
              }`}
            >
              <p>{uploadStatus.message}</p>
            </div>
          )}

          {notificationStatus && (
            <div
              className={`p-3 rounded-lg mb-4 ${
                notificationStatus.type === "success"
                  ? "bg-green-900 bg-opacity-30 text-green-300 border border-green-500 border-opacity-30"
                  : "bg-red-900 bg-opacity-30 text-red-300 border border-red-500 border-opacity-30"
              }`}
            >
              <p>{notificationStatus.message}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left p-2 text-xs font-medium text-gray-200 w-2/5 md:w-1/3 lg:w-1/4">
                    Name
                  </th>
                  <th className="text-left p-2 text-xs font-medium text-gray-200">
                    Date
                  </th>
                  <th className="text-left p-2 text-xs font-medium text-gray-200">
                    Distance
                  </th>

                  {/* Compact song indicator — placed after Distance */}
                  <th className="text-center p-2 w-8 text-xs font-medium text-gray-200">
                    🎶
                  </th>

                  <th className="text-left p-2 text-xs font-medium text-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {hikes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center p-6 text-gray-400">
                      No activities found.
                    </td>
                  </tr>
                ) : (
                  paginatedHikes.map((hike) => (
                    <React.Fragment key={hike.id}>
                      <tr className="border-b border-gray-700 hover:bg-gray-800">
                        <td
                          className="p-2 text-gray-200 max-w-xs md:max-w-sm overflow-hidden"
                          style={{ maxWidth: "320px" }}
                        >
                          {editingHikeId === hike.id ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-2 py-1 bg-gray-700 text-gray-200 border border-gray-600 rounded"
                              autoFocus
                            />
                          ) : (
                            <div
                              className="truncate"
                              title={hike.name}
                              style={{ display: "block" }}
                            >
                              {hike.name}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-gray-300">
                          {formatDate(hike.startDate)}
                        </td>
                        <td className="p-2 text-gray-300">
                          {hike.distanceKm ? hike.distanceKm.toFixed(1) : "N/A"}{" "}
                          km
                        </td>

                        {/* Compact song indicator placed immediately after Distance */}
                        <td className="p-2 text-center text-xs text-gray-300">
                          {hike.songOfTheDay ? (
                            <span
                              className="text-green-300"
                              title="Song available"
                            >
                              ✅
                            </span>
                          ) : (
                            <span className="text-gray-600">&nbsp;</span>
                          )}
                        </td>

                        <td className="p-2 flex space-x-2">
                          {editingHikeId === hike.id ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                className="btn btn-success text-xs px-2 py-1"
                              >
                                💾 Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="btn btn-secondary text-xs px-2 py-1"
                              >
                                ❌ Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditClick(hike)}
                                className="btn btn-primary text-xs px-2 py-1"
                              >
                                ✏️ Edit
                              </button>
                            </>
                          )}
                        </td>
                      </tr>

                      {editingHikeId === hike.id && (
                        <tr className="bg-gray-800">
                          <td colSpan="5" className="p-3 text-sm text-gray-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs text-gray-400">
                                  Start
                                </label>
                                <input
                                  type="text"
                                  value={editStart}
                                  onChange={(e) => setEditStart(e.target.value)}
                                  className="w-full px-2 py-1 bg-gray-700 text-gray-200 border border-gray-600 rounded mt-1"
                                  placeholder="Start location"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-gray-400">
                                  End
                                </label>
                                <input
                                  type="text"
                                  value={editEnd}
                                  onChange={(e) => setEditEnd(e.target.value)}
                                  className="w-full px-2 py-1 bg-gray-700 text-gray-200 border border-gray-600 rounded mt-1"
                                  placeholder="End location"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="text-xs text-gray-400">
                                  Spotify URL
                                </label>
                                <input
                                  type="text"
                                  value={editSongOfTheDay}
                                  onChange={(e) =>
                                    setEditSongOfTheDay(e.target.value)
                                  }
                                  className="w-full px-2 py-1 bg-gray-700 text-gray-200 border border-gray-600 rounded mt-1"
                                  placeholder="Spotify Song URL"
                                />
                              </div>

                              <div className="md:col-span-2 flex gap-2 mt-3">
                                <button
                                  onClick={handleSaveEdit}
                                  className="btn btn-success px-2 py-1 text-xs"
                                >
                                  💾 Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="btn btn-secondary px-2 py-1 text-xs"
                                >
                                  ❌ Cancel
                                </button>

                                {/* Moved: Notify + Delete now live inside the edit panel */}
                                <button
                                  onClick={() => handleNotifyUsers(hike)}
                                  className="btn btn-secondary px-2 py-1 text-xs"
                                  disabled={notifyingHikeId === hike.id}
                                >
                                  {notifyingHikeId === hike.id
                                    ? "📣 Notifying..."
                                    : hike.notifiedAt
                                      ? "📣 Notify Again"
                                      : "📣 Notify Users"}
                                </button>

                                <button
                                  onClick={() => handleDeleteClick(hike)}
                                  className="btn btn-danger px-2 py-1 text-xs"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls (moved outside table to satisfy valid DOM nesting) */}
            {hikes.length > 0 && (
              <div className="flex justify-center items-center mt-4 space-x-2">
                <button
                  className="btn btn-secondary px-2 py-1 text-xs"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  &lt; Prev
                </button>
                <span className="text-gray-200 text-xs">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn btn-secondary px-2 py-1 text-xs"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  Next &gt;
                </button>
              </div>
            )}
          </div>

          <div className="mb-6 p-4 bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg">
            <h3 className="text-base font-medium text-gray-100 mb-3">
              📤 Upload Activity
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Import activities from GPX or FIT files (e.g., from Strava).
              Supported formats: .gpx, .fit
            </p>
            <input
              type="file"
              accept=".gpx,.fit"
              onChange={handleFileUpload}
              disabled={uploading}
              className="block w-full text-xs text-gray-300 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {uploading && (
              <div className="mt-3 flex items-center text-blue-300">
                <div className="animate-spin rounded-full border-b-2 border-blue-400 h-4 w-4 mr-2"></div>
                Processing file...
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-900 bg-opacity-30 border border-blue-500 border-opacity-30 rounded-lg">
            <h3 className="font-medium text-blue-200 mb-2">
              ⚠️ Important Notes:
            </h3>
            <ul className="text-blue-100 text-xs space-y-1">
              <li>• Deleting an activity is permanent and cannot be undone.</li>
              <li>
                • All photos associated with the activity will also be removed.
              </li>
              <li>
                • The activity will no longer appear in your travel journal.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmDelete && selectedHike && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="glass-card p-6 max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-100 mb-4">
              Confirm Deletion
            </h2>
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete the activity "{selectedHike.name}
              "?
            </p>
            <p className="text-gray-400 text-sm mb-6">
              This action cannot be undone. All associated photos will also be
              deleted.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={handleCancelDelete}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 btn btn-danger"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminActivityManager;
