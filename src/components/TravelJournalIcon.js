import React, { useState, useEffect, useRef } from "react";
import { useViewedActivities } from "../hooks/useViewedActivities";

function TravelJournalIcon({
  hikes,
  selectedHikeId,
  onSelectHike,
  onClearSelectedHike,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { markAsViewed, getUnreadCount, isViewed } = useViewedActivities();
  const dropdownRef = useRef(null);

  // Find the currently selected hike to check if it has a note
  const selectedHike = hikes.find((hike) => hike.id === selectedHikeId);
  const hasNoteOpen = selectedHike?.note && selectedHike.note.trim();

  // Close dropdown when clicking outside (but not if note is currently open)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Don't close if clicking on the journal button
        if (event.target.closest(".unified-journal-button")) {
          return;
        }
        // Only close dropdown if there's no note overlay currently open
        if (!hasNoteOpen) {
          setIsDropdownOpen(false);
        }
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isDropdownOpen, hasNoteOpen]);

  // Sort hikes by date (most recent first)
  const sortedHikes = [...hikes].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateB - dateA;
  });

  // Get unread activities count for the notification badge
  const unreadCount = getUnreadCount(sortedHikes);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Handle activity selection and mark as viewed
  const handleActivitySelect = (hikeId) => {
    // Mark activity as viewed
    markAsViewed(hikeId);

    // Call the original onSelectHike function
    onSelectHike(hikeId);

    // Only close dropdown if the activity doesn't have a note
    const selectedHike = sortedHikes.find((h) => h.id === hikeId);
    if (selectedHike && !selectedHike.note) {
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="travel-journal-icon-container">
      {/* Unified Journal Button with Text and Icon */}
      <div
        className="journal-button-container"
        style={{ position: "relative" }}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isDropdownOpen) {
              // If closing the dropdown and a note is open, close the note too
              if (hasNoteOpen) {
                onClearSelectedHike();
              }
            }
            setIsDropdownOpen(!isDropdownOpen);
          }}
          className="unified-journal-button badge"
          title="View hiking activities"
        >
          <img
            src={
              process.env.PUBLIC_URL + "/travel_journal_button_transparent.png"
            }
            alt="Travel Journal"
            className="journal-icon-image"
          />
          <div className="travel-journal-text">
            Travel
            <br />
            Journal
          </div>
        </button>

        {/* iOS-style notification badge - only show if there are unread activities */}
        {unreadCount > 0 && (
          <div
            className="notification-badge"
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              backgroundColor: "#ff3b30",
              color: "white",
              borderRadius: "50%",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: "bold",
              border: "2px solid white",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              zIndex: 1002,
              animation: "pulse 2s infinite",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </div>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="journal-swiper-container"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="journal-swiper-header">
            <h3 className="text-lg font-semibold text-gray-900">
              Afgewerkte etappes
            </h3>
            <button
              onClick={() => setIsDropdownOpen(false)}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                color: "#6b7280",
                padding: "4px",
                borderRadius: "4px",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#374151")}
              onMouseLeave={(e) => (e.target.style.color = "#6b7280")}
            >
              ×
            </button>
            <div className="badge">{sortedHikes.length} etappes</div>
          </div>

          {sortedHikes.length === 0 ? (
            <div className="p-3 text-center text-gray-500">
              No activities found.
            </div>
          ) : (
            <div
              className="journal-swiper-content"
              style={{
                maxHeight: "40vh",
                overflowY: "auto",
                overflowX: "hidden",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {sortedHikes.map((hike) => (
                <div
                  key={hike.id}
                  onClick={() => handleActivitySelect(hike.id)}
                  className={`activity-dropdown-item ${
                    selectedHikeId === hike.id ? "selected" : ""
                  }`}
                >
                  <div className="activity-dropdown-item-header">
                    <div className="activity-dropdown-item-title">
                      <h4 title={hike.name || "Unnamed Activity"}>
                        {hike.name || "Unnamed Activity"}
                      </h4>

                      {/* Show unread indicator */}
                      {!isViewed(hike.id) && (
                        <span
                          title="New activity"
                          style={{
                            fontSize: "12px",
                            color: "#ff3b30",
                            marginLeft: "4px",
                            animation: "pulse 1s infinite",
                          }}
                        >
                          ●
                        </span>
                      )}
                    </div>
                    {selectedHikeId === hike.id && (
                      <span className="activity-dropdown-check">✓</span>
                    )}
                  </div>
                  <div className="activity-dropdown-item-info">
                    <div className="flex items-center gap-1">
                      <span>📅</span>
                      <span>{formatDate(hike.startDate)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>📏</span>
                      <span>{hike.distanceKm?.toFixed(1) || "0"} km</span>
                    </div>
                    {hike.note && (
                      <div className="flex items-center gap-3">
                        <span>📝</span>
                        <span>note</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TravelJournalIcon;
