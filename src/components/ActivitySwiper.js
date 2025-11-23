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
    <div className="glass-card p-2  fade-in">
      <div className="flex items-center gap-2 ">
        <h2
          className="text-2xl p-0 font-semibold text-gray-900"
          style={{ marginTop: "5px", marginBottom: "10px" }}
        >
          Hiking Adventures
        </h2>
        <div className="badge">{sortedHikes.length} hikes</div>
      </div>

      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={24}
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
            spaceBetween: 24,
          },
        }}
        className="pb-4"
      >
        {sortedHikes.map((hike) => (
          <SwiperSlide key={hike.id}>
            <div
              onClick={() => onSelectHike(hike.id)}
              className={`activity-card ${
                selectedHikeId === hike.id ? "selected" : ""
              }`}
              style={{ maxHeight: "100px", margin: "0" }}
            >
              <div className="flex justify-between items-center ">
                <div className="flex items-center justify-between">
                  <h3
                    className="text-gray-700 font-semibold "
                    title={hike.name || "Unnamed Activity"}
                    style={{ margin: "0" }}
                  >
                    {hike.name || "Unnamed Activity"}
                  </h3>
                  {selectedHikeId === hike.id}
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
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

export default ActivitySwiper;
