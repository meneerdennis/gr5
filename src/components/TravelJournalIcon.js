import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

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
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="unified-journal-button"
        title="View hiking activities"
      >
        <span className="travel-journal-text">{"volg mijn reis hier =>"}</span>
        <img
          src={process.env.PUBLIC_URL + "/travel_journal_icon_128.png"}
          alt="Travel Journal"
          className="journal-icon-image"
        />
      </button>

      {/* Swiper Menu */}
      {isDropdownOpen && (
        <div
          className="journal-swiper-container"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="journal-swiper-header">
            <h3 className="text-lg font-semibold text-gray-900">
              Hiking Adventures
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
            <div className="badge">{sortedHikes.length} hikes</div>
          </div>

          {sortedHikes.length === 0 ? (
            <div className="p-3 text-center text-gray-500">
              No activities found.
            </div>
          ) : (
            <div className="journal-swiper-content">
              <Swiper
                className="journal-swiper"
                modules={[Navigation, Pagination]}
                spaceBetween={16}
                slidesPerView={1}
                navigation
                pagination={{
                  clickable: true,
                  el: ".journal-swiper__pagination",
                  renderBullet: (index, className) =>
                    `<span class="${className}"></span>`,
                }}
                breakpoints={{
                  640: {
                    slidesPerView: 2,
                    spaceBetween: 16,
                  },
                  768: {
                    slidesPerView: 3,
                    spaceBetween: 16,
                  },
                }}
              >
                {sortedHikes.map((hike) => (
                  <SwiperSlide key={hike.id}>
                    <div
                      onClick={() => {
                        onSelectHike(hike.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`activity-card ${
                        selectedHikeId === hike.id ? "selected" : ""
                      }`}
                      style={{ margin: "0", height: "100px" }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <h4
                              className="text-gray-700 font-semibold"
                              title={hike.name || "Unnamed Activity"}
                              style={{ margin: "0", fontSize: "14px" }}
                            >
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
                      </div>
                      <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span>📅</span>
                            <span className="text-gray-700">
                              {formatDate(hike.startDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>📏</span>
                            <span className="text-gray-700">
                              {hike.distanceKm?.toFixed(1) || "0"} km
                            </span>
                          </div>
                          {hike.note && (
                            <div className="flex items-center gap-1">
                              <span>📝</span>
                              <span className="text-gray-700">note</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
              <div className="journal-swiper__pagination" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TravelJournalIcon;
