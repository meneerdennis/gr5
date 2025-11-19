import React, { useRef } from "react";

function ElevationProfile({
  elevationProfile,
  walkedDistanceKm,
  totalDistanceKm,
  hoverPoint,
  onHover,
  zoomRange,
  onZoomChange,
}) {
  const width = 900;
  const height = 100;
  const padding = 40;
  const svgRef = useRef(null);

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
  const validData = elevationProfile.filter(
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
    <div style={{ position: "relative", width: "100%" }}>
      <div style={{ marginBottom: "10px", fontSize: "12px", color: "#666" }}>
        {zoomRange ? (
          <span>
            Viewing: {visibleStartKm.toFixed(1)} - {visibleEndKm.toFixed(1)} km
            |{" "}
            <button
              onClick={() => onZoomChange(null)}
              style={{ cursor: "pointer", padding: "2px 8px" }}
            >
              Reset Zoom
            </button>
          </span>
        ) : (
          <span>Scroll wheel to zoom | Double-click to reset</span>
        )}
      </div>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${width} ${height + 60}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        style={{ cursor: "crosshair" }}
      >
        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="#fafafa" />
        {/* Elevation line */}
        <polyline
          points={points}
          fill="none"
          stroke="#8884d8"
          strokeWidth="2"
        />
        {/* Start marker */}
        <circle cx={startX} cy={height - padding} r="4" fill="#4CAF50" />
        <text
          x={startX}
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

            {/* Hiker emoji icon */}
            <text x={markerX} y={height - 25} textAnchor="middle" fontSize="20">
              🚶‍➡️
            </text>

            {/* Current position text */}
            <text
              x={markerX}
              y={20}
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="#e91e63"
            >
              {walkedDistanceKm} km
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
  );
}

export default ElevationProfile;
