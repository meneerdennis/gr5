import React from "react";

function ProgressBar({
  progress,
  compact = false,
  position = "normal",
  headerRight = null,
}) {
  const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)));

  if (compact && position === "top-right") {
    return (
      <div className="fixed  right-6 z-50 flex  items-center space-y-2">
        <div
          style={{
            width: "15px",
            height: "80px",
            background: "rgba(139, 92, 246, 0.2)",
            borderRadius: "5px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: `${percentage}%`,
              background: "linear-gradient(135deg, #10b981, #06b6d4)",
              borderRadius: "8px",
              transition: "height 0.5s ease-in-out",
            }}
          />
        </div>
        <span
          className="text-sm font-semibold text-gray-700"
          style={{ paddingLeft: "10px" }}
        >
          {percentage}%
        </span>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <h3
          className="text-xl font-semibold text-gray-900"
          style={{ margin: "10px 0" }}
        >
          Trail Progress
        </h3>
        {headerRight && <div>{headerRight}</div>}
      </div>

      <div
        className="modern-progress mb-4"
        style={{ height: "20px", marginBottom: "5px" }}
      >
        <div
          className="modern-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span className="font-medium">{percentage}% of GR5 completed</span>
      </div>
    </div>
  );
}

export default ProgressBar;
