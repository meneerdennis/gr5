import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

function ActivitySwiper({ hikes, selectedHikeId, onSelectHike }) {
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
    <div style={{ padding: "0.5rem 0", width: "100%" }}>
      <h2
        style={{
          marginBottom: "0.5rem",
          fontSize: "1.1rem",
          paddingLeft: "1rem",
        }}
      >
        Activities
      </h2>
      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={20}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        breakpoints={{
          640: {
            slidesPerView: 2,
            spaceBetween: 20,
          },
          768: {
            slidesPerView: 3,
            spaceBetween: 20,
          },
          1024: {
            slidesPerView: 4,
            spaceBetween: 30,
          },
        }}
        style={{ padding: "0 2rem 1.5rem 2rem" }}
      >
        {sortedHikes.map((hike) => (
          <SwiperSlide key={hike.id}>
            <div
              onClick={() => onSelectHike(hike.id)}
              style={{
                padding: "0.6rem",
                border:
                  selectedHikeId === hike.id
                    ? "2px solid #1976d2"
                    : "1px solid #e0e0e0",
                borderRadius: "8px",
                cursor: "pointer",
                backgroundColor:
                  selectedHikeId === hike.id ? "#e3f2fd" : "white",
                transition: "all 0.3s",
                boxShadow:
                  selectedHikeId === hike.id
                    ? "0 3px 8px rgba(25, 118, 210, 0.3)"
                    : "0 2px 4px rgba(0,0,0,0.1)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                minHeight: "70px",
              }}
              onMouseEnter={(e) => {
                if (selectedHikeId !== hike.id) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 3px 8px rgba(0,0,0,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedHikeId !== hike.id) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                }
              }}
            >
              <div
                style={{
                  fontWeight: "600",
                  marginBottom: "0.3rem",
                  color: "#333",
                  fontSize: "0.9rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={hike.name || "Unnamed Activity"}
              >
                {hike.name || "Unnamed Activity"}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#666",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <span>📅</span>
                  <span>{formatDate(hike.startDate)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <span>📏</span>
                  <span>{hike.distanceKm?.toFixed(1) || "0"} km</span>
                </div>
                {hike.photos && hike.photos.length > 0 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hike.photos[0]) {
                        window.open(hike.photos[0], "_blank");
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      color: "#1976d2",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    <span>📷</span>
                    <span>
                      {hike.photos.length} photo
                      {hike.photos.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

export default ActivitySwiper;
