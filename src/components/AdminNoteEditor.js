import React, { useState, useEffect } from "react";
import {
  getHikesFromFirebase,
  updateHikeNote,
} from "../services/firebaseService";

function AdminNoteEditor() {
  const [hikes, setHikes] = useState([]);
  const [selectedHike, setSelectedHike] = useState("");
  const [currentNote, setCurrentNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleHikeSelect = (hikeId) => {
    setSelectedHike(hikeId);
    const hike = hikes.find((h) => h.id === hikeId);
    setCurrentNote(hike?.note || "");
    setSaveStatus(null);
  };

  const handleSaveNote = async () => {
    if (!selectedHike) {
      setSaveStatus({
        type: "error",
        message: "Please select a hike first.",
      });
      return;
    }

    setSaving(true);
    setSaveStatus(null);

    try {
      const result = await updateHikeNote(selectedHike, currentNote);

      if (result.success) {
        setSaveStatus({
          type: "success",
          message: "Note saved successfully!",
        });

        // Update the hikes list with the new note
        setHikes((prevHikes) =>
          prevHikes.map((hike) =>
            hike.id === selectedHike ? { ...hike, note: currentNote } : hike,
          ),
        );

        // Notify main app to update hike data
        window.dispatchEvent(new CustomEvent("hikeUpdated"));
      } else {
        setSaveStatus({
          type: "error",
          message: `Failed to save note: ${result.error}`,
        });
      }
    } catch (error) {
      setSaveStatus({
        type: "error",
        message: `Error saving note: ${error.message}`,
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="glass-card p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2 mb-6"></div>
            <div className="h-40 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-4 sm:p-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-4">
            📝 Activity Notes Editor
          </h1>
          <p className="text-gray-300 mb-6">
            Add personal notes to your hiking activities. Notes will appear as
            notepad-style overlays on the map when an activity is selected.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Hike Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Select Activity
                </label>
                <select
                  value={selectedHike}
                  onChange={(e) => handleHikeSelect(e.target.value)}
                  className="input"
                >
                  <option value="" style={{ color: "black" }}>
                    Choose an activity...
                  </option>
                  {hikes.map((hike) => (
                    <option
                      key={hike.id}
                      value={hike.id}
                      style={{ color: "black" }}
                    >
                      {hike.name || "Unnamed Activity"} (
                      {formatDate(hike.startDate)}) -{" "}
                      {hike.distanceKm?.toFixed(1)}km
                    </option>
                  ))}
                </select>
              </div>

              {selectedHike && (
                <div className="p-3 bg-blue-900 bg-opacity-30 border border-blue-500 border-opacity-30 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    <strong>Selected Activity:</strong>{" "}
                    {hikes.find((h) => h.id === selectedHike)?.name ||
                      "Unknown"}
                  </p>
                  <p className="text-blue-300 text-sm">
                    <strong>Date:</strong>{" "}
                    {formatDate(
                      hikes.find((h) => h.id === selectedHike)?.startDate,
                    )}
                  </p>
                  <p className="text-blue-300 text-sm">
                    <strong>Distance:</strong>{" "}
                    {hikes
                      .find((h) => h.id === selectedHike)
                      ?.distanceKm?.toFixed(1)}
                    km
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Note Editor */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Note Content
                </label>
                <textarea
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  className="input"
                  rows={12}
                  placeholder="Enter your note here... This note will appear as a notepad-style overlay on the map."
                  disabled={!selectedHike}
                  style={{ resize: "vertical", minHeight: "200px" }}
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleSaveNote}
                  disabled={!selectedHike || saving}
                  className="btn btn-primary flex-1"
                >
                  {saving ? "💾 Saving..." : "💾 Save Note"}
                </button>

                {currentNote && selectedHike && (
                  <button
                    onClick={() => setCurrentNote("")}
                    className="btn btn-secondary"
                    disabled={saving}
                  >
                    🗑️ Clear
                  </button>
                )}
              </div>

              {saveStatus && (
                <div
                  className={`p-3 rounded-lg ${
                    saveStatus.type === "success"
                      ? "bg-green-900 bg-opacity-30 text-green-300 border border-green-500 border-opacity-30"
                      : "bg-red-900 bg-opacity-30 text-red-300 border border-red-500 border-opacity-30"
                  }`}
                >
                  <p>{saveStatus.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">
            📋 How Notes Work
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-100 mb-2">
                ✍️ Adding Notes
              </h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <p>
                  1. <strong>Select an activity</strong> from the dropdown
                </p>
                <p>
                  2. <strong>Write your note</strong> in the text area
                </p>
                <p>
                  3. <strong>Save</strong> to store the note
                </p>
                <p>
                  4. <strong>View on map</strong> by clicking the activity in
                  the swiper
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-100 mb-2">🗺️ Map Display</h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <p>
                  📝 <strong>Notepad Style:</strong> Notes appear as vintage
                  notepads
                </p>
                <p>
                  📍 <strong>Location:</strong> Upper right corner of the map
                </p>
                <p>
                  📜 <strong>Scrollable:</strong> Long notes can be scrolled
                </p>
                <p>
                  🎯 <strong>Auto-display:</strong> Shows when activity is
                  selected
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-500 border-opacity-30 rounded-lg">
            <p className="text-yellow-300 text-sm">
              <strong>💡 Pro Tip:</strong> Notes support long text and will
              automatically become scrollable if they exceed the visible area.
              Perfect for detailed hike descriptions, stories, or route
              observations!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminNoteEditor;
