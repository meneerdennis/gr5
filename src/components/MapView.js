import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import PhotoMarkerPopup from "./PhotoMarkerPopup";
import GpxTrack from "./Gpxtrack";

const photoIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconAnchor: [12, 41],
  iconSize: [25, 41],
  popupAnchor: [1, -34],
});

// Custom hiker icon using DivIcon
const hikerIcon = new L.DivIcon({
  html: `
    <div style="
      background: #e91e63;
      border: 3px solid white;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transform: translate(-50%, -50%);
    ">🚶‍➡️</div>
  `,
  className: "custom-hiker-icon",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

// Component to handle hover marker
function HoverMarker({ hoverPoint }) {
  if (!hoverPoint || !hoverPoint.lat || !hoverPoint.lon) return null;

  return (
    <CircleMarker
      center={[hoverPoint.lat, hoverPoint.lon]}
      radius={8}
      pathOptions={{ color: "#666", fillColor: "#666", fillOpacity: 0.8 }}
    >
      <Popup>
        <div>
          <strong>Distance:</strong> {hoverPoint.distanceKm.toFixed(1)} km
          <br />
          <strong>Elevation:</strong> {hoverPoint.elevationM.toFixed(0)} m
        </div>
      </Popup>
    </CircleMarker>
  );
}

// Component to handle map interactions and zoom synchronization
function MapInteraction({
  elevationProfile,
  onHover,
  zoomRange,
  onZoomChange,
}) {
  const map = useMap();
  const isUpdatingFromZoomRange = useRef(false);
  const lastZoomRange = useRef(null);
  const isUserZooming = useRef(false);
  const lastMapUpdate = useRef(0);
  const isInitialLoad = useRef(true);

  // Check if current map view matches the zoom range
  const doesMapViewMatchZoomRange = (range) => {
    if (!range || !map || !elevationProfile || elevationProfile.length === 0)
      return true;

    const bounds = map.getBounds();
    const pointsInRange = elevationProfile.filter(
      (p) =>
        p.lat && p.lon && p.distanceKm >= range[0] && p.distanceKm <= range[1]
    );

    if (pointsInRange.length === 0) return false;

    const rangeBounds = L.latLngBounds(
      pointsInRange.map((p) => [p.lat, p.lon])
    );

    // Check if the map bounds are approximately equal to the range bounds
    const mapSw = bounds.getSouthWest();
    const mapNe = bounds.getNorthEast();
    const rangeSw = rangeBounds.getSouthWest();
    const rangeNe = rangeBounds.getNorthEast();

    const tolerance = 0.01; // Approximately 1km tolerance
    const latDiff =
      Math.abs(mapSw.lat - rangeSw.lat) + Math.abs(mapNe.lat - rangeNe.lat);
    const lngDiff =
      Math.abs(mapSw.lng - rangeSw.lng) + Math.abs(mapNe.lng - rangeNe.lng);

    return latDiff < tolerance && lngDiff < tolerance;
  };

  // Sync map bounds with elevation profile zoom range
  useEffect(() => {
    if (!map || !elevationProfile || elevationProfile.length === 0) return;

    // Check if zoom range actually changed
    const rangeChanged =
      !lastZoomRange.current ||
      !zoomRange ||
      (zoomRange &&
        lastZoomRange.current &&
        (zoomRange[0] !== lastZoomRange.current[0] ||
          zoomRange[1] !== lastZoomRange.current[1]));

    if (!rangeChanged) return;

    // Skip if map view already matches the zoom range (unless it's initial load)
    if (!isInitialLoad.current && doesMapViewMatchZoomRange(zoomRange)) {
      lastZoomRange.current = zoomRange;
      return;
    }

    lastZoomRange.current = zoomRange;

    // Only update map if this wasn't triggered by a recent map interaction
    const timeSinceLastMapUpdate = Date.now() - lastMapUpdate.current;
    if (timeSinceLastMapUpdate < 1000 && !isInitialLoad.current) {
      return; // Skip this update to avoid interference
    }

    isUpdatingFromZoomRange.current = true;

    if (zoomRange) {
      // Find points within the zoom range
      const pointsInRange = elevationProfile.filter(
        (p) =>
          p.lat &&
          p.lon &&
          p.distanceKm >= zoomRange[0] &&
          p.distanceKm <= zoomRange[1]
      );

      if (pointsInRange.length > 0) {
        const bounds = L.latLngBounds(pointsInRange.map((p) => [p.lat, p.lon]));
        // Use very minimal padding and preserve current zoom
        map.fitBounds(bounds, { padding: [5, 5], maxZoom: map.getZoom() });
      }
    } else {
      // Reset to full route bounds
      const allPoints = elevationProfile.filter((p) => p.lat && p.lon);
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints.map((p) => [p.lat, p.lon]));
        // Use very minimal padding
        map.fitBounds(bounds, { padding: [5, 5] });
      }
    }

    isInitialLoad.current = false;

    // Reset flag after animation completes
    setTimeout(() => {
      isUpdatingFromZoomRange.current = false;
    }, 300);
  }, [map, elevationProfile, zoomRange]);

  // Handle map interactions (zoom and pan) to update elevation profile zoom range
  useEffect(() => {
    if (!map || !elevationProfile || elevationProfile.length === 0) return;

    let interactionTimeout = null;

    const handleZoomStart = () => {
      isUserZooming.current = true;
    };

    const handleMoveEnd = () => {
      // Skip if this move was triggered by elevation profile update
      if (isUpdatingFromZoomRange.current) return;

      // Debounce to prevent rapid updates during panning
      if (interactionTimeout) {
        clearTimeout(interactionTimeout);
      }

      interactionTimeout = setTimeout(() => {
        lastMapUpdate.current = Date.now();
        const bounds = map.getBounds();
        updateElevationProfileFromBounds(bounds, false);
      }, 400); // Wait 400ms after user stops panning
    };

    const handleZoomEnd = () => {
      // Skip if this zoom was triggered by elevation profile update
      if (isUpdatingFromZoomRange.current) {
        isUserZooming.current = false;
        return;
      }

      // Debounce to prevent rapid updates
      if (interactionTimeout) {
        clearTimeout(interactionTimeout);
      }

      interactionTimeout = setTimeout(() => {
        lastMapUpdate.current = Date.now();
        const bounds = map.getBounds();
        updateElevationProfileFromBounds(bounds, true);
        isUserZooming.current = false;
      }, 600); // Wait 600ms after user stops zooming
    };

    // Function to update elevation profile based on current map bounds
    const updateElevationProfileFromBounds = (bounds, isZoom) => {
      // Find points within the current map bounds
      const pointsInBounds = elevationProfile.filter(
        (p) => p.lat && p.lon && bounds.contains([p.lat, p.lon])
      );

      if (pointsInBounds.length > 0) {
        const minKm = Math.min(...pointsInBounds.map((p) => p.distanceKm));
        const maxKm = Math.max(...pointsInBounds.map((p) => p.distanceKm));

        // Calculate the percentage of route visible
        const totalRouteKm =
          elevationProfile[elevationProfile.length - 1].distanceKm;
        const visiblePercentage = ((maxKm - minKm) / totalRouteKm) * 100;

        if (isZoom) {
          // For zooming: only update if user has zoomed in significantly
          if (
            visiblePercentage < 90 &&
            maxKm - minKm > 10 &&
            (!lastZoomRange.current ||
              Math.abs(minKm - lastZoomRange.current[0]) > 15 ||
              Math.abs(maxKm - lastZoomRange.current[1]) > 15)
          ) {
            onZoomChange([minKm, maxKm]);
          }
        } else {
          // For panning: update if a meaningful portion of route is visible
          if (
            visiblePercentage < 95 &&
            maxKm - minKm > 5 && // Smaller threshold for panning
            (!lastZoomRange.current ||
              Math.abs(minKm - lastZoomRange.current[0]) > 10 ||
              Math.abs(maxKm - lastZoomRange.current[1]) > 10)
          ) {
            onZoomChange([minKm, maxKm]);
          }
        }
      }
    };

    map.on("zoomstart", handleZoomStart);
    map.on("zoomend", handleZoomEnd);
    map.on("moveend", handleMoveEnd);

    return () => {
      if (interactionTimeout) {
        clearTimeout(interactionTimeout);
      }
      map.off("zoomstart", handleZoomStart);
      map.off("zoomend", handleZoomEnd);
      map.off("moveend", handleMoveEnd);
    };
  }, [map, elevationProfile, onZoomChange]);

  // Handle map click for hover
  useEffect(() => {
    if (!map || !elevationProfile || elevationProfile.length === 0) return;

    const handleMapClick = (e) => {
      const clickedLat = e.latlng.lat;
      const clickedLon = e.latlng.lng;

      // Find closest point in elevation profile
      let closestPoint = null;
      let minDistance = Infinity;

      elevationProfile.forEach((point) => {
        if (!point.lat || !point.lon) return;
        const distance = Math.sqrt(
          Math.pow(point.lat - clickedLat, 2) +
            Math.pow(point.lon - clickedLon, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      });

      if (closestPoint && minDistance < 0.1) {
        // Only trigger if click is close enough
        onHover(closestPoint);
      }
    };

    map.on("click", handleMapClick);

    return () => {
      map.off("click", handleMapClick);
    };
  }, [map, elevationProfile, onHover]);

  return null;
}

function MapView({
  routePolyline = [],
  hikes = [],
  photos = [],
  gpxUrl,
  elevationProfile = [],
  walkedDistanceKm = 0,
  hoverPoint,
  onHover,
  zoomRange,
  onZoomChange,
  onWalkedDistanceChange,
}) {
  const [currentPosition, setCurrentPosition] = useState(null);

  // Helper function to find current hiker position based on last hike end position
  const findCurrentPosition = () => {
    if (!hikes || hikes.length === 0 || !elevationProfile.length) {
      return null;
    }

    // Sort hikes by startDate to get the most recent hike
    const sortedHikes = [...hikes].sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateB - dateA; // Most recent first
    });

    const lastHike = sortedHikes[0];
    if (!lastHike) {
      return null;
    }

    // Get positions from the last hike
    let positions = [];

    if (lastHike.polyline && Array.isArray(lastHike.polyline)) {
      positions = lastHike.polyline;
    } else if (lastHike.latlng && Array.isArray(lastHike.latlng)) {
      positions = lastHike.latlng;
    }

    if (positions.length === 0) {
      return null;
    }

    // Get the end position (last point) of the last hike
    const endPosition = positions[positions.length - 1];
    const [lat, lon] = endPosition;

    // Find the corresponding elevation point from the elevation profile
    // by finding the closest point to this lat/lon
    let closestElevationPoint = null;
    let minDistance = Infinity;

    elevationProfile.forEach((point) => {
      if (!point.lat || !point.lon) return;
      const distance = Math.sqrt(
        Math.pow(point.lat - lat, 2) + Math.pow(point.lon - lon, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestElevationPoint = point;
      }
    });

    return closestElevationPoint || null;
  };

  // Update current position when hikes or elevation profile changes
  useEffect(() => {
    const position = findCurrentPosition();
    setCurrentPosition(position);

    // Update walked distance if we have a valid position
    if (position && position.distanceKm && onWalkedDistanceChange) {
      onWalkedDistanceChange(position.distanceKm);
    }
  }, [hikes, elevationProfile, onWalkedDistanceChange]);

  // fallback center
  const center =
    routePolyline.length > 0
      ? routePolyline[Math.floor(routePolyline.length / 2)]
      : [50, 4];

  return (
    <div style={{ width: "70%", height: "500px" }}>
      <MapContainer
        center={center}
        zoom={6}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap-bijdragers"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* GPX-route (temporarily disabled due to plugin issues) */}
        {/* {gpxUrl && (
          <GpxTrack
            url={gpxUrl}
            elevationProfile={elevationProfile}
            onHover={onHover}
          />
        )} */}

        {/* Primary route display - GR5.gpx track (rendered first, below) */}
        {elevationProfile.length > 0 && (
          <Polyline
            positions={elevationProfile
              .map((p) => [p.lat, p.lon])
              .filter((pos) => pos[0] && pos[1])}
            color="#ff5722"
            weight={3}
            opacity={0.8}
            zIndex={300}
          />
        )}

        {/* Firebase Hikes GPX Polylines (rendered last, on top) */}
        {hikes.map((hike) => {
          // Handle both array format and polyline string format
          let positions = [];

          if (hike.polyline && Array.isArray(hike.polyline)) {
            positions = hike.polyline;
          } else if (hike.latlng && Array.isArray(hike.latlng)) {
            positions = hike.latlng;
          }

          if (positions.length === 0) return null;

          return (
            <Polyline
              key={hike.id}
              positions={positions}
              color="#4caf50"
              weight={5}
              opacity={0.9}
              zIndex={1000}
            >
              <Popup>
                <div>
                  <strong>{hike.name || "GR5 Hike"}</strong>
                  <br />
                  <strong>Distance:</strong>{" "}
                  {hike.distanceKm?.toFixed(1) || "N/A"} km
                  <br />
                  <strong>Date:</strong> {hike.startDate || "N/A"}
                  <br />
                  <strong>Type:</strong> {hike.type || "N/A"}
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Photo markers */}
        {photos.map((photo) => (
          <Marker
            key={photo.id}
            position={[photo.lat, photo.lng]}
            icon={photoIcon}
          >
            <Popup>
              <PhotoMarkerPopup photo={photo} />
            </Popup>
          </Marker>
        ))}

        {/* Hiker marker - shows current position */}
        {currentPosition && currentPosition.lat && currentPosition.lon && (
          <Marker
            position={[currentPosition.lat, currentPosition.lon]}
            icon={hikerIcon}
          >
            <Popup>
              <div>
                <strong>Current Position</strong>
                <br />
                <strong>Distance:</strong>{" "}
                {currentPosition.distanceKm?.toFixed(1) || "0.0"} km
                <br />
                <strong>Elevation:</strong>{" "}
                {currentPosition.elevationM?.toFixed(0) || "0"} m
              </div>
            </Popup>
          </Marker>
        )}

        {/* Hover marker */}
        <HoverMarker hoverPoint={hoverPoint} />

        {/* Map interaction handler */}
        <MapInteraction
          elevationProfile={elevationProfile}
          onHover={onHover}
          zoomRange={zoomRange}
          onZoomChange={onZoomChange}
        />
      </MapContainer>
    </div>
  );
}

export default MapView;
