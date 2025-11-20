import React, { useRef, useState } from "react";

function ElevationProfile({
  elevationProfile,
  walkedDistanceKm,
  totalDistanceKm,
  hoverPoint,
  onHover,
  zoomRange,
  onZoomChange,
  hikes = [],
}) {
  const [smoothingEnabled, setSmoothingEnabled] = useState(true);
  const [smoothingWindow, setSmoothingWindow] = useState(15);

  // Moving average smoothing function
  const applySmoothing = (data, windowSize) => {
    if (!data || data.length === 0 || windowSize <= 1) return data;

    const smoothed = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < data.length; i++) {
      let sum = 0;
      let count = 0;

      // Average points within the window
      for (
        let j = Math.max(0, i - halfWindow);
        j <= Math.min(data.length - 1, i + halfWindow);
        j++
      ) {
        sum += data[j].elevationM;
        count++;
      }

      smoothed.push({
        ...data[i],
        elevationM: sum / count,
      });
    }

    return smoothed;
  };

  // Apply smoothing if enabled
  const processedProfile = smoothingEnabled
    ? applySmoothing(elevationProfile, smoothingWindow)
    : elevationProfile;
  const width = 900;
  const height = 80;
  const padding = 20;
  const svgRef = useRef(null);

  // Color palette - smooth gradient flow through spectrum (starting with lime)
  const colorPalette = [
    "#84cc16", // Lime
    "#10b981", // Emerald
    "#14b8a6", // Teal
    "#06b6d4", // Cyan
    "#0ea5e9", // Sky Blue
    "#3b82f6", // Blue
    "#6366f1", // Indigo
    "#8b5cf6", // Violet
    "#a855f7", // Purple
    "#c026d3", // Fuchsia
    "#ec4899", // Pink
    "#ef4444", // Red
    "#f97316", // Orange
    "#f59e0b", // Amber
    "#eab308", // Yellow
  ];

  // Calculate distance ranges for each hike by matching coordinates
  const hikesWithDistances = hikes.map((hike) => {
    let positions = [];
    if (hike.polyline && Array.isArray(hike.polyline)) {
      positions = hike.polyline;
    } else if (hike.latlng && Array.isArray(hike.latlng)) {
      positions = hike.latlng;
    }

    if (positions.length === 0) {
      return { ...hike, startDistanceKm: 0, endDistanceKm: 0 };
    }

    // Find closest elevation profile points to start and end of hike
    const startPos = positions[0];
    const endPos = positions[positions.length - 1];

    let startDistanceKm = 0;
    let endDistanceKm = 0;
    let minStartDist = Infinity;
    let minEndDist = Infinity;

    processedProfile.forEach((point) => {
      if (!point.lat || !point.lon) return;

      // Check distance to start position
      const startDist = Math.sqrt(
        Math.pow(point.lat - startPos[0], 2) +
          Math.pow(point.lon - startPos[1], 2)
      );
      if (startDist < minStartDist) {
        minStartDist = startDist;
        startDistanceKm = point.distanceKm;
      }

      // Check distance to end position
      const endDist = Math.sqrt(
        Math.pow(point.lat - endPos[0], 2) + Math.pow(point.lon - endPos[1], 2)
      );
      if (endDist < minEndDist) {
        minEndDist = endDist;
        endDistanceKm = point.distanceKm;
      }
    });

    return { ...hike, startDistanceKm, endDistanceKm };
  });

  // Handle empty or invalid data
  if (
    !elevationProfile ||
    !Array.isArray(elevationProfile) ||
    elevationProfile.length === 0
  ) {
    return (
      <svg width="100%" viewBox={`0 0 ${width} ${height + 60}`}>
        <rect x="0" y="0" width={width} height={height} fill="#f5f5f5" />
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#666">
          No elevation data available
        </text>
      </svg>
    );
  }

  // Handle division by zero
  if (!totalDistanceKm || totalDistanceKm <= 0) {
    return (
      <svg width="100%" viewBox={`0 0 ${width} ${height + 60}`}>
        <rect x="0" y="0" width={width} height={height} fill="#f5f5f5" />
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#666">
          Invalid total distance
        </text>
      </svg>
    );
  }

  // Determine visible range
  const visibleStartKm = zoomRange ? zoomRange[0] : 0;
  const visibleEndKm = zoomRange ? zoomRange[1] : totalDistanceKm;
  const visibleDistanceKm = visibleEndKm - visibleStartKm;

  // Filter data to visible range
  const validData = processedProfile.filter(
    (p) =>
      p &&
      typeof p.distanceKm === "number" &&
      typeof p.elevationM === "number" &&
      p.distanceKm >= visibleStartKm &&
      p.distanceKm <= visibleEndKm
  );

  // Calculate max elevation for visible range
  const maxElevation = Math.max(...validData.map((p) => p.elevationM || 0), 1);

  // Calculate points for the elevation line (relative to visible range)
  const points = validData
    .map((p) => {
      const x =
        padding +
        ((p.distanceKm - visibleStartKm) / visibleDistanceKm) *
          (width - 2 * padding);
      const y =
        height -
        padding -
        (p.elevationM / maxElevation) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(" ");

  // Calculate marker position (if within visible range)
  let markerX = null;
  if (walkedDistanceKm >= visibleStartKm && walkedDistanceKm <= visibleEndKm) {
    markerX =
      padding +
      ((walkedDistanceKm - visibleStartKm) / visibleDistanceKm) *
        (width - 2 * padding);
  }

  // Start and end positions for markers
  const startX = padding;
  const endX = width - padding;

  // Handle mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;

    // Convert mouse position to distance
    const mouseDistanceKm =
      visibleStartKm +
      ((svgX - padding) / (width - 2 * padding)) * visibleDistanceKm;

    // Zoom factor (negative deltaY = zoom in, positive = zoom out)
    const zoomFactor = e.deltaY > 0 ? 1.2 : 0.8;

    // Calculate new range centered on mouse position
    const currentRange = visibleEndKm - visibleStartKm;
    const newRange = currentRange * zoomFactor;

    // Keep mouse position at same relative location
    const mouseRatio = (mouseDistanceKm - visibleStartKm) / currentRange;
    let newStartKm = mouseDistanceKm - newRange * mouseRatio;
    let newEndKm = mouseDistanceKm + newRange * (1 - mouseRatio);

    // Clamp to total distance bounds
    if (newStartKm < 0) {
      newEndKm = Math.min(totalDistanceKm, newEndKm - newStartKm);
      newStartKm = 0;
    }
    if (newEndKm > totalDistanceKm) {
      newStartKm = Math.max(0, newStartKm - (newEndKm - totalDistanceKm));
      newEndKm = totalDistanceKm;
    }

    // Only zoom if range is meaningful (between 10km and total distance)
    if (
      newEndKm - newStartKm >= 10 &&
      newEndKm - newStartKm < totalDistanceKm
    ) {
      onZoomChange([newStartKm, newEndKm]);
    } else if (newEndKm - newStartKm >= totalDistanceKm) {
      // Reset to full view if zoomed out too far
      onZoomChange(null);
    }
  };

  // Handle mouse move on elevation profile
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;

    // Convert SVG x to distance
    const distanceKm =
      visibleStartKm +
      ((svgX - padding) / (width - 2 * padding)) * visibleDistanceKm;

    // Find closest point in elevation profile
    let closestPoint = null;
    let minDiff = Infinity;

    validData.forEach((point) => {
      const diff = Math.abs(point.distanceKm - distanceKm);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = point;
      }
    });

    if (closestPoint) {
      onHover(closestPoint);
    }
  };

  const handleMouseLeave = () => {
    onHover(null);
  };

  const handleDoubleClick = () => {
    // Reset zoom on double click
    onZoomChange(null);
  };

  // Calculate hover marker position if hoverPoint exists
  let hoverX = null;
  let hoverY = null;
  if (
    hoverPoint &&
    hoverPoint.distanceKm >= visibleStartKm &&
    hoverPoint.distanceKm <= visibleEndKm
  ) {
    hoverX =
      padding +
      ((hoverPoint.distanceKm - visibleStartKm) / visibleDistanceKm) *
        (width - 2 * padding);
    hoverY =
      height -
      padding -
      (hoverPoint.elevationM / maxElevation) * (height - 2 * padding);
  }

  return (
    <div className="elevation-chart mb-2 fade-in">
      <div className="flex items-center justify-between mb-6">
        {zoomRange ? (
          <div className="flex items-center gap-4 p-2">
            <span className="text-sm text-gray-600">
              Viewing: {visibleStartKm.toFixed(1)} - {visibleEndKm.toFixed(1)}{" "}
              km
            </span>
            <button
              onClick={() => onZoomChange(null)}
              className="btn btn-secondary text-xs px-3 py-1"
            >
              Reset Zoom
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Scroll to zoom | Double-click to reset
            </span>
          </div>
        )}
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onDoubleClick={handleDoubleClick}
          onWheel={handleWheel}
          className="cursor-crosshair rounded-lg"
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
        >
          {/* Define gradient for mountain silhouette */}
          <defs>
            <linearGradient
              id="elevationGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop
                offset="0%"
                style={{ stopColor: "#fc0000ff", stopOpacity: 0.8 }}
              />
              <stop
                offset="50%"
                style={{ stopColor: "#f1e100ff", stopOpacity: 0.4 }}
              />
              <stop
                offset="200%"
                style={{ stopColor: "#00a716ff", stopOpacity: 0.1 }}
              />
            </linearGradient>

            {/* Sky gradient */}
            <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop
                offset="0%"
                style={{ stopColor: "#95b1ffff", stopOpacity: 1 }}
              />
              <stop
                offset="30%"
                style={{ stopColor: "rgba(208, 226, 255, 1)", stopOpacity: 1 }}
              />
              <stop
                offset="60%"
                style={{ stopColor: "#ffffff", stopOpacity: 1 }}
              />
            </linearGradient>
          </defs>

          {/* Sky background with gradient */}
          <rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill="url(#skyGradient)"
          />

          {/* Filled area under elevation line (mountain silhouette) */}
          <polygon
            points={`${-width},${height} ${points} ${width * 2},${height}`}
            fill="url(#elevationGradient)"
            stroke="none"
          />

          {/* Green progress fill - shows completed portion */}
          {markerX !== null && (
            <rect
              width={Math.max(0, markerX)}
              height={height}
              fill="#4caf50"
              opacity="0.6"
              style={{ transition: "width 0.2s ease" }}
              z-index="19"
            />
          )}

          {/* Elevation line */}
          <polyline
            points={points}
            fill="none"
            stroke="orange"
            strokeWidth="2"
          />

          {/* Colored segments for each hike */}
          {hikesWithDistances.map((hike, index) => {
            // Get hike distance range
            const hikeStartKm = hike.startDistanceKm || 0;
            const hikeEndKm = hike.endDistanceKm || 0;

            // Skip if hike is outside visible range
            if (hikeEndKm < visibleStartKm || hikeStartKm > visibleEndKm) {
              return null;
            }

            // Filter points within this hike's range and visible range
            const hikePoints = validData.filter(
              (p) => p.distanceKm >= hikeStartKm && p.distanceKm <= hikeEndKm
            );

            if (hikePoints.length < 2) return null;

            // Create polyline points for this hike segment
            const hikePolylinePoints = hikePoints
              .map((p) => {
                const x =
                  padding +
                  ((p.distanceKm - visibleStartKm) / visibleDistanceKm) *
                    (width - 2 * padding);
                const y =
                  height -
                  padding -
                  (p.elevationM / maxElevation) * (height - 2 * padding);
                return `${x},${y}`;
              })
              .join(" ");

            const hikeColor = colorPalette[index % colorPalette.length];

            return (
              <polyline
                key={hike.id || index}
                points={hikePolylinePoints}
                fill="none"
                stroke={hikeColor}
                strokeWidth="2"
                opacity="0.9"
                z-index="20"
              />
            );
          })}

          {/* Start marker */}
          <circle cx={startX} cy={height - padding} r="4" fill="#4CAF50" />
          <text
            x={startX + 10}
            y={height}
            textAnchor="middle"
            fontSize="14"
            fontWeight="bold"
            fill="#333"
          >
            {visibleStartKm.toFixed(0)} km
          </text>
          {/* Finish marker with checkered flag */}
          <g transform={`translate(${endX}, ${height - padding})`}>
            {/* Flag pole */}
            <line
              x1="0"
              y1="-20"
              x2="0"
              y2="5"
              stroke="#8B4513"
              strokeWidth="3"
            />
            {/* Checkered flag */}
            <rect
              x="0"
              y="-20"
              width="20"
              height="15"
              fill="white"
              stroke="#000"
              strokeWidth="1"
            />
            {/* Checkered pattern */}
            <g transform="translate(0, -20)">
              <rect x="0" y="0" width="5" height="5" fill="#000" />
              <rect x="10" y="0" width="5" height="5" fill="#000" />
              <rect x="5" y="5" width="5" height="5" fill="#000" />
              <rect x="15" y="5" width="5" height="5" fill="#000" />
              <rect x="0" y="10" width="5" height="5" fill="#000" />
              <rect x="10" y="10" width="5" height="5" fill="#000" />
            </g>
          </g>
          <text
            x={width - 10}
            y={height}
            textAnchor="end"
            fontSize="14"
            fontWeight="bold"
            fill="#333"
          >
            {visibleEndKm.toFixed(0)} km
          </text>
          {/* Progress line */}
          {markerX !== null && (
            <>
              <line
                x1={markerX}
                y1={padding}
                x2={markerX}
                y2={height - padding}
                stroke="#e91e63"
                strokeDasharray="4 4"
                strokeWidth="2"
              />

              {/* Hiker icon */}
              <image
                href={process.env.PUBLIC_URL + "/hikersmall.png"}
                x={markerX - 16}
                y={height - 45}
                width="45"
                height="45"
                clipPath="circle(50% at 50%)"
              />

              {/* Current position text */}
              <text
                x={markerX}
                y={20}
                textAnchor="middle"
                fontSize="14"
                fontWeight="bold"
                fill="#e91e63"
              >
                {Math.round(walkedDistanceKm)} km
              </text>
            </>
          )}
          {/* Hover indicator */}
          {hoverPoint && hoverX !== null && hoverY !== null && (
            <g>
              <line
                x1={hoverX}
                y1={padding}
                x2={hoverX}
                y2={height - padding}
                stroke="#666"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <circle cx={hoverX} cy={hoverY} r="5" fill="#666" />
              <text
                x={hoverX}
                y={padding - 10}
                textAnchor="middle"
                fontSize="12"
                fill="#666"
              >
                {hoverPoint.distanceKm.toFixed(1)} km |{" "}
                {hoverPoint.elevationM.toFixed(0)} m
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

export default ElevationProfile;
