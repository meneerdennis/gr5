import React, { useState, useEffect, useRef } from "react";
import { useViewedActivitiesContext } from "../contexts/ViewedActivitiesContext";
import { useViewedCommentsContext } from "../contexts/ViewedCommentsContext";
import { useAuth } from "../hooks/useAuth";

// Add slideDown animation
const slideDownKeyframes = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// Inject the keyframes into the document head
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = slideDownKeyframes;
  document.head.appendChild(style);
}

function TravelJournalIcon({
  hikes,
  selectedHikeId,
  onSelectHike,
  onClearSelectedHike,
  onRefresh,
  refreshInProgress,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const {
    markAsViewed,
    getUnreadCount,
    isViewed,
    loading: activitiesLoading,
  } = useViewedActivitiesContext();
  const { user } = useAuth();
  const {
    hasNewComments,
    markCommentsAsViewed,
    loading: commentsLoading,
    hasStoredData,
  } = useViewedCommentsContext();
  const [commentCountOverrides, setCommentCountOverrides] = useState({});
  const dropdownRef = useRef(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Sort hikes by date (most recent first)
  const sortedHikes = [...hikes].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateB - dateA;
  });

  // Get unread activities count for the notification badge
  const unreadHikeCount = activitiesLoading ? 0 : getUnreadCount(sortedHikes);
  const unreadCommentCount = commentsLoading
    ? 0
    : sortedHikes.filter((hike) => {
        const currentCommentsCount =
          (commentCountOverrides[hike.id] ?? hike.commentsCount) || 0;
        return hasNewComments(hike.id, currentCommentsCount);
      }).length;
  const unreadCount = unreadHikeCount + unreadCommentCount;

  useEffect(() => {
    if (commentsLoading || hasStoredData || !hikes?.length) return;
    hikes.forEach((hike) => {
      markCommentsAsViewed(hike.id, hike.commentsCount || 0);
    });
  }, [commentsLoading, hasStoredData, hikes, markCommentsAsViewed]);

  useEffect(() => {
    if (!hikes?.length) return;
    setCommentCountOverrides((prev) => {
      const next = { ...prev };
      hikes.forEach((hike) => {
        const baseCount = hike.commentsCount || 0;
        next[hike.id] = Math.max(next[hike.id] || 0, baseCount);
      });
      return next;
    });
  }, [hikes]);

  useEffect(() => {
    const handleCommentAdded = (event) => {
      const activityId = event?.detail?.activityId;
      const eventUid = event?.detail?.uid;
      if (user?.uid && eventUid === user.uid) return;
      if (!activityId) return;
      setCommentCountOverrides((prev) => {
        const currentBase =
          prev[activityId] ||
          hikes.find((hike) => hike.id === activityId)?.commentsCount ||
          0;
        return {
          ...prev,
          [activityId]: currentBase + 1,
        };
      });
    };

    window.addEventListener("commentAdded", handleCommentAdded);
    return () => window.removeEventListener("commentAdded", handleCommentAdded);
  }, [hikes, user?.uid]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
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
  }, [isDropdownOpen]);

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
  const handleActivitySelect = async (hikeId) => {
    // Mark activity as viewed (async, but we don't wait for it to keep UI responsive)
    markAsViewed(hikeId);
    const selectedHike = hikes.find((hike) => hike.id === hikeId);
    const currentCommentsCount =
      (commentCountOverrides[hikeId] ?? selectedHike?.commentsCount) || 0;
    markCommentsAsViewed(hikeId, currentCommentsCount);

    // Call the original onSelectHike function
    onSelectHike(hikeId);
  };

  return (
    <div className="travel-journal-icon-container">
      {/* Custom Travel Journal Dropdown */}
      <div
        className="journal-select-container"
        style={{ position: "relative" }}
        ref={dropdownRef}
      >
        <div
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="custom-select-trigger"
          style={{
            width: isMobile ? "200px" : "280px",
            padding: "12px 16px",
            border: "2px solid #4a90e2",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
            fontSize: isMobile ? "12px" : "15px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            userSelect: "none",
            boxShadow: "0 4px 15px rgba(74, 144, 226, 0.2)",
            transition: "all 0.3s ease",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.target.style.boxShadow = "0 6px 20px rgba(74, 144, 226, 0.3)";
            e.target.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.target.style.boxShadow = "0 4px 15px rgba(74, 144, 226, 0.2)";
            e.target.style.transform = "translateY(0)";
          }}
          title="Select hiking activity"
        >
          {/* Subtle animated background effect */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "-100%",
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(90deg, transparent, rgba(74, 144, 226, 0.1), transparent)",
              transition: "left 0.5s",
            }}
          />

          {/* Icon */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "18px" }}>📖</span>
            <span
              style={{
                color: selectedHikeId ? "#2c3e50" : "#7f8c8d",
                fontWeight: "500",
              }}
            >
              {selectedHikeId
                ? hikes.find((h) => h.id === selectedHikeId)?.name ||
                  "Unnamed Activity"
                : "Travel Journal"}
            </span>
          </div>

          <span
            style={{
              transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s ease",
              fontSize: "14px",
              color: "#4a90e2",
            }}
          >
            ▼
          </span>
        </div>

        {/* Custom Dropdown Options */}
        {isDropdownOpen && (
          <div
            className="custom-select-options"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
              border: "2px solid #4a90e2",
              borderTop: "none",
              borderRadius: "0 0 12px 12px",
              maxHeight: "250px",
              overflowY: "auto",
              zIndex: 1000,
              boxShadow: "0 8px 25px rgba(74, 144, 226, 0.15)",
              animation: "slideDown 0.3s ease-out",
            }}
          >
            <div
              style={{
                padding: "6px 10px",
                fontSize: isMobile ? "10px" : "11px",
                color: "#5f6b7a",
                borderBottom: "1px solid #f0f0f0",
                backgroundColor: "#f9fbfd",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                position: "sticky",
                top: 0,
                zIndex: 2,
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#0066cc",
                      display: "inline-block",
                    }}
                  />
                  New hike
                </span>
                <span
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#2ecc71",
                      display: "inline-block",
                    }}
                  />
                  New comment
                </span>
              </span>
              {onRefresh && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!refreshInProgress) {
                      onRefresh();
                    }
                  }}
                  disabled={refreshInProgress}
                  title="Refresh updates"
                  style={{
                    color: refreshInProgress ? "#10b981" : "#4a90e2",
                    background: "transparent",
                    border: "none",
                    borderRadius: "8px",
                    cursor: refreshInProgress ? "default" : "pointer",
                    padding: isMobile ? "0.15rem 0.3rem" : "0.2rem 0.4rem",
                    fontSize: isMobile ? "12px" : "13px",
                    fontWeight: 600,
                    opacity: refreshInProgress ? 0.7 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  🔄
                </button>
              )}
            </div>
            {sortedHikes.map((hike) =>
              (() => {
                const currentCommentsCount =
                  (commentCountOverrides[hike.id] ?? hike.commentsCount) || 0;
                return (
                  <div
                    key={hike.id}
                    onClick={() => {
                      handleActivitySelect(hike.id);
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor:
                        selectedHikeId === hike.id ? "#f0f8ff" : "white",
                      color: "#333",
                      borderBottom: "1px solid #f0f0f0",
                      fontSize: isMobile ? "12px" : "14px",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f5f5f5";
                      e.target.style.color = "#333";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor =
                        selectedHikeId === hike.id ? "#f0f8ff" : "white";
                      e.target.style.color = "#333";
                    }}
                  >
                    <span>
                      {hike.name || "Unnamed Activity"}
                      {hike.distanceKm && ` (${hike.distanceKm.toFixed(1)} km)`}
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        marginLeft: "8px",
                      }}
                    >
                      {!isViewed(hike.id) && (
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: "#0066cc",
                            display: "inline-block",
                          }}
                          title="New hike"
                        />
                      )}
                      {hasNewComments(hike.id, currentCommentsCount) && (
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: "#2ecc71",
                            display: "inline-block",
                          }}
                          title="New comment"
                        />
                      )}
                    </span>
                  </div>
                );
              })(),
            )}
          </div>
        )}

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
    </div>
  );
}

export default TravelJournalIcon;
