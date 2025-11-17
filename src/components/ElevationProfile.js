import React from "react";

function ElevationProfile({
  elevationProfile,
  walkedDistanceKm,
  totalDistanceKm,
}) {
  const width = 900;
  const height = 120;
  const padding = 40; // Increased padding for better margins

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

  const maxElevation = Math.max(
    ...elevationProfile.map((p) => p.elevationM || 0),
    1
  );

  // Filter and process valid data
  const validData = elevationProfile.filter(
    (p) =>
      p && typeof p.distanceKm === "number" && typeof p.elevationM === "number"
  );

  // Calculate points for the elevation line
  const points = validData
    .map((p) => {
      const x =
        padding + (p.distanceKm / totalDistanceKm) * (width - 2 * padding);
      const y =
        height -
        padding -
        (p.elevationM / maxElevation) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(" ");

  // Calculate marker position
  const markerX =
    padding + (walkedDistanceKm / totalDistanceKm) * (width - 2 * padding);

  // Start and end positions for markers
  const startX = padding;
  const endX = width - padding;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height + 60}`}>
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
          y={height + 25}
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill="#333"
        >
          0 km
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
          x={width - 60}
          y={height + 25}
          textAnchor="end"
          fontSize="14"
          fontWeight="bold"
          fill="#333"
        >
          2223 km
        </text>

        {/* Progress line */}
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
          y={height + 40}
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fill="#e91e63"
        >
          {walkedDistanceKm} km
        </text>
      </svg>
    </div>
  );
}

export default ElevationProfile;
