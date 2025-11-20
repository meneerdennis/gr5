import React from "react";

function ActivityList({ hikes, selectedHikeId, onSelectHike }) {
  if (!hikes || hikes.length === 0) {
    return (
      <div style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
        No activities found.
      </div>
    );
  }

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
    <div style={{ padding: "1rem" }}>
      <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Activities</h2>
      <div
        style={{
          maxHeight: "400px",
          overflowY: "auto",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
        }}
      >
        {sortedHikes.map((hike) => (
          <div
            key={hike.id}
            onClick={() => onSelectHike(hike.id)}
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #e0e0e0",
              cursor: "pointer",
              backgroundColor: selectedHikeId === hike.id ? "#e3f2fd" : "white",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (selectedHikeId !== hike.id) {
                e.currentTarget.style.backgroundColor = "#f5f5f5";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedHikeId !== hike.id) {
                e.currentTarget.style.backgroundColor = "white";
              }
            }}
          >
            <div
              style={{
                fontWeight: "600",
                marginBottom: "0.25rem",
                color: "#333",
              }}
            >
              {hike.name || "Unnamed Activity"}
            </div>
            <div
              style={{
                fontSize: "0.875rem",
                color: "#666",
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <span>📅 {formatDate(hike.startDate)}</span>
              <span>📏 {hike.distanceKm?.toFixed(1) || "0"} km</span>
              {hike.photos && hike.photos.length > 0 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    // Open first photo or photo gallery
                    if (hike.photos[0]) {
                      window.open(hike.photos[0], "_blank");
                    }
                  }}
                  style={{
                    color: "#1976d2",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  📷 {hike.photos.length} photo
                  {hike.photos.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActivityList;
