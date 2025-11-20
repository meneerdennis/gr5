import React from "react";
import ProgressBar from "./ProgressBar";

function Layout({ children, progress = 0 }) {
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* Modern Header */}
      <header className="glass-card p-6 m-4 mb-0 rounded-b-none ">
        <div className="container mx-auto justify-between">
          <div className="flex items-center justify-between">
            <div className="flex-1 " style={{ width: "100%" }}>
              <div className="flex  gap-4" style={{ width: "100%" }}>
                <div style={{ width: "100%" }}>
                  <h1 className="text-3xl font-bold text-gray-900">
                    GR5 Trail Tracker
                  </h1>
                  <p className="text-gray-600">Hoek van Holland → Nice</p>
                </div>
                <ProgressBar
                  progress={progress}
                  compact={false}
                  position="top-right"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Compact Progress Bar positioned at top-right of header */}

      {/* Main Content */}
      <main className="flex-1 p-4">
        <div className="container mx-auto">{children}</div>
      </main>
    </div>
  );
}

export default Layout;
