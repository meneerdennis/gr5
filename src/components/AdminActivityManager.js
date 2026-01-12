import React, { useState, useEffect } from "react";
import { getHikesFromFirebase } from "../services/firebaseService";
import { db } from "../services/firebase";
import { doc, deleteDoc } from "firebase/firestore";

function AdminActivityManager() {
  const [hikes, setHikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [selectedHike, setSelectedHike] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    loadHikes();
  }, []);

  const loadHikes = async () => {
    try {
      const hikesData = await getHikesFromFirebase();
      setHikes(hikesData);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="glass-card p-6 text-center">
          <div className="animate-spin rounded-full mx-auto mb-4 border-b-2 border-blue-400 h-10 w-10 sm:h-12 sm:w-12"></div>
          <p className="text-gray-200">Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="glass-card p-4 sm:p-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-4">
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

          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left p-3 font-medium text-gray-200">
                    Name
                  </th>
                  <th className="text-left p-3 font-medium text-gray-200">
                    Date
                  </th>
                  <th className="text-left p-3 font-medium text-gray-200">
                    Distance
                  </th>
                  <th className="text-left p-3 font-medium text-gray-200">
                    Type
                  </th>
                  <th className="text-left p-3 font-medium text-gray-200">
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
                  hikes.map((hike) => (
                    <tr
                      key={hike.id}
                      className="border-b border-gray-700 hover:bg-gray-800"
                    >
                      <td className="p-3 text-gray-200">{hike.name}</td>
                      <td className="p-3 text-gray-300">
                        {formatDate(hike.startDate)}
                      </td>
                      <td className="p-3 text-gray-300">
                        {hike.distanceKm ? hike.distanceKm.toFixed(1) : "N/A"}{" "}
                        km
                      </td>
                      <td className="p-3 text-gray-300">{hike.type}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDeleteClick(hike)}
                          className="btn btn-danger text-sm"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-blue-900 bg-opacity-30 border border-blue-500 border-opacity-30 rounded-lg">
            <h3 className="font-medium text-blue-200 mb-2">
              ⚠️ Important Notes:
            </h3>
            <ul className="text-blue-100 text-sm space-y-1">
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
            <h2 className="text-xl font-bold text-gray-100 mb-4">
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
