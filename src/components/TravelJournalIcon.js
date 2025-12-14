import React, { useState } from "react";

function TravelJournalIcon({
  hikes,
  selectedHikeId,
  onSelectHike,
  onClearSelectedHike,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Sort hikes by date (most recent first)
  const sortedHikes = [...hikes].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateB - dateA;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="travel-journal-icon-container">
      {/* Unified Journal Button with Text and Icon */}
      <div
        className="journal-button-container"
        style={{ position: "relative" }}
      >
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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

        {/* iOS-style notification badge */}
        {sortedHikes.length > 0 && (
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
            }}
          >
            {sortedHikes.length > 99 ? "99+" : sortedHikes.length}
          </div>
        )}
      </div>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div
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
                  onClick={() => {
                    onSelectHike(hike.id);
                    // Only close dropdown if the activity doesn't have a note
                    if (!hike.note) {
                      setIsDropdownOpen(false);
                    }
                  }}
                  className={`activity-dropdown-item ${
                    selectedHikeId === hike.id ? "selected" : ""
                  }`}
                >
                  <div className="activity-dropdown-item-header">
                    <div className="activity-dropdown-item-title">
                      <h4 title={hike.name || "Unnamed Activity"}>
                        {hike.name || "Unnamed Activity"}
                      </h4>
                      {hike.note && (
                        <span
                          title="This activity has a note"
                          style={{
                            fontSize: "12px",
                            color: "#D2691E",
                            marginLeft: "4px",
                          }}
                        >
                          📝
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
