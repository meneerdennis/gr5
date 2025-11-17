import React from 'react';

function ElevationProfile({ elevationProfile, walkedDistanceKm, totalDistanceKm }) {
  const width = 800;
  const height = 120;
  const padding = 10;

  const maxElevation = Math.max(...elevationProfile.map(p => p.elevationM), 1);

  const points = elevationProfile
    .map(p => {
      const x = padding + (p.distanceKm / totalDistanceKm) * (width - 2 * padding);
      const y = height - padding - (p.elevationM / maxElevation) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  const markerX =
    padding + (walkedDistanceKm / totalDistanceKm) * (width - 2 * padding);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      <rect x="0" y="0" width={width} height={height} fill="#fafafa" />
      <polyline
        points={points}
        fill="none"
        stroke="#8884d8"
        strokeWidth="2"
      />
      <line
        x1={markerX}
        y1={padding}
        x2={markerX}
        y2={height - padding}
        stroke="#e91e63"
        strokeDasharray="4 4"
      />
    </svg>
  );
}

export default ElevationProfile;