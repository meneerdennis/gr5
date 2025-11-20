import React from "react";

function ProgressBar({ progress, compact = false, position = "normal" }) {
  const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)));

  if (compact && position === "top-right") {
    return (
      <div className="fixed top-6 right-6 z-50 glass-card p-4">
        <div className="modern-progress w-32">
          <div
            className="modern-progress-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="text-center mt-2">
          <span className="text-sm font-semibold text-gray-700">
            {percentage}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-5 mb-6 fade-in"
      style={{ width: "100%", justifyContent: "center", alignSelf: "center" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">Trail Progress</h3>
      </div>

      <div className="modern-progress mb-4" style={{ height: "12px" }}>
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
