import React, { lazy, Suspense } from "react";

// Lazy-load the Swiper wrapper (includes Swiper, modules and CSS)
const SwiperComponent = lazy(() => import("./SwiperComponent"));
const SwiperSlide = lazy(() =>
  import("./SwiperComponent").then((mod) => ({ default: mod.SwiperSlide })),
);

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
    <div className="glass-card p-2 fade-in">
      <div className="flex items-center gap-2 ">
        <h2
          className="text-2xl p-0 font-semibold text-gray-900"
          style={{ marginTop: "5px", marginBottom: "10px" }}
        >
          Hiking Adventures
        </h2>
        <div className="badge">{sortedHikes.length} hikes</div>
      </div>

      {/* ⬇️ pagination-bullets komen hier te staan */}

      <Suspense fallback={<div style={{ minHeight: 120 }} />}> 
        <SwiperComponent
          className="my-swiper"
          spaceBetween={24}
          slidesPerView={1}
          navigation
          pagination={{
            clickable: true,
            el: ".hike-swiper__pagination",
            renderBullet: (index, className) =>
              `<span class="${className}"></span>`,
          }}
          breakpoints={{
            640: { slidesPerView: 2, spaceBetween: 20 },
            768: { slidesPerView: 3, spaceBetween: 20 },
            1024: { slidesPerView: 4, spaceBetween: 24 },
          }}
        >
          {sortedHikes.map((hike) => (
            <Suspense key={hike.id} fallback={<div />}>
              <SwiperSlide>
                <div
                  onClick={() => onSelectHike(hike.id)}
                  className={`activity-card ${
                    selectedHikeId === hike.id ? "selected" : ""
                  }`}
                  style={{ maxHeight: "100px", margin: "0" }}
                >
              <div className="flex justify-between items-center ">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <h3
                      className="text-gray-700 font-semibold"
                      title={hike.name || "Unnamed Activity"}
                      style={{ margin: "0" }}
                    >
                      {hike.name || "Unnamed Activity"}
                    </h3>
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
            </Suspense>
          ))}
        </SwiperComponent>
      </Suspense>
      <div className="hike-swiper__pagination" />
    </div>
  );
}

export default ActivitySwiper;
