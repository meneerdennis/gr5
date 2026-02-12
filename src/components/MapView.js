import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
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
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import "leaflet-gpx";
import PhotoMarkerPopup from "./PhotoMarkerPopup";
import GpxTrack from "./Gpxtrack";
import Dropdown from "./Dropdown";
import ElevationProfile from "./ElevationProfile";
import { useViewedActivities } from "../hooks/useViewedActivities";
import PhotoMarkers from "./PhotoMarkers";
import MapInteraction from "./MapInteraction";
import simplify from "simplify-js";

// Global function for photo modal (will be set by MapView)
let globalPhotoClickHandler = null;

// Global function to close all photo popups (will be set by PhotoMarkers)
let globalClosePhotoPopups = null;

const photoIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconAnchor: [12, 41],
  iconSize: [25, 41],
  popupAnchor: [1, -34],
});

// Custom hiker icon using the hikersmall.png image
const hikerIcon = new L.Icon({
  iconUrl: process.env.PUBLIC_URL + "/hikersmall.png",
  iconRetinaUrl: process.env.PUBLIC_URL + "/hikersmall.png",
  iconSize: [45, 45],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
  shadowUrl: null,
  shadowSize: null,
  shadowAnchor: null,
});

// Function to get the appropriate thumbnail URL for a photo
const getPhotoThumbnailUrl = (photo) => {
  // Use stored thumbnail URL if available, otherwise fall back to original
  return photo.thumbnailUrl || photo.url;
};

// Function to create custom photo icon using photo object
const createPhotoIcon = (photo) => {
  const thumbnailUrl = getPhotoThumbnailUrl(photo);
  return new L.Icon({
    iconUrl: thumbnailUrl,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    className: "photo-marker-icon",
  });
};

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

// Component to handle zooming to selected hike
function ZoomToHike({ bounds }) {
  const map = useMap();

  useEffect(() => {
    if (bounds && map && map.getContainer()) {
      // Small delay to ensure map is fully ready
      setTimeout(() => {
        try {
          if (map && map.getContainer()) {
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        } catch (error) {
          console.warn("Error fitting bounds:", error);
        }
      }, 100);
    }
  }, [bounds, map]);

  return null;
}

// Component to handle panning to selected photo location
function PanToPhoto({ photoLocation }) {
  const map = useMap();

  useEffect(() => {
    if (
      photoLocation &&
      photoLocation.lat &&
      photoLocation.lng &&
      map &&
      map.getContainer()
    ) {
      try {
        map.flyTo([photoLocation.lat, photoLocation.lng], map.getZoom(), {
          duration: 0.5,
        });
      } catch (error) {
        console.warn("Error panning to photo:", error);
      }
    }
  }, [photoLocation, map]);

  return null;
}

// Component to handle zooming to hike bounds
function ZoomToHikeBounds({ hikeBounds }) {
  const map = useMap();

  useEffect(() => {
    if (
      hikeBounds &&
      hikeBounds.south !== undefined &&
      hikeBounds.west !== undefined &&
      hikeBounds.north !== undefined &&
      hikeBounds.east !== undefined &&
      map &&
      map.getContainer()
    ) {
      try {
        const bounds = L.latLngBounds(
          [hikeBounds.south, hikeBounds.west],
          [hikeBounds.north, hikeBounds.east],
        );
        // Zoom as close as possible with minimal padding to show entire hike
        map.fitBounds(bounds, {
          padding: [20, 20],
          maxZoom: 18,
          animate: true,
        });
      } catch (error) {
        console.warn("Error zooming to hike bounds:", error);
      }
    }
  }, [hikeBounds, map]);

  return null;
}

// PhotoMarkers extracted to src/components/PhotoMarkers.js

// MapInteraction extracted to src/components/MapInteraction.js

function MapView({
  routePolyline = [],
  hikes = [],
  photos = [],
  gpxUrl,
  elevationProfile = [],
  walkedDistanceKm = 0,
  totalDistanceKm = 0,
  hoverPoint,
  onHover,
  zoomRange,
  onZoomChange,
  onWalkedDistanceChange,
  selectedHikeId,
  onSelectHike,
  onPhotoClick,
  onClearSelectedHike,
  selectedPhotoLocation,
  hikeBounds,
  onRefresh,
  refreshInProgress,
}) {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [suppressZoomUpdates, setSuppressZoomUpdates] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [buttonNudge, setButtonNudge] = useState(false);
  const suppressZoomUpdatesRef = useRef(false);

  // Nudge animation for button discovery
  useEffect(() => {
    const timer = setTimeout(() => {
      setButtonNudge(true);
      setTimeout(() => setButtonNudge(false), 600);
    }, 1000); // Start after 1 second

    return () => clearTimeout(timer);
  }, []);

  // Dynamic map height: apply larger heights for all screen sizes per request
  const [mapHeight, setMapHeight] = useState(null);
  const [availableHeight, setAvailableHeight] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const mapRef = useRef(null);
  const invalidateTimerRef = useRef(null);

  useEffect(() => {
    const computeHeights = () => {
      const width =
        window.innerWidth || document.documentElement.clientWidth || 360;
      const height = window.innerHeight || 1000;
      const mobile = width < 1024;
      setIsMobile(mobile);

      if (mobile) {
        // Use the existing mobile height calculation
        let baseVh;
        if (width <= 360) {
          baseVh = 66;
        } else if (width <= 412) {
          baseVh = 70;
        } else if (width <= 540) {
          baseVh = 75;
        } else if (width <= 768) {
          baseVh = 76;
        } else {
          baseVh = 82;
        }

        const isPwa =
          window.matchMedia?.("(display-mode: standalone)")?.matches ||
          window.navigator?.standalone === true;
        if (isPwa) baseVh += 6;

        const newHeight = `${baseVh}vh`;
        setMapHeight(newHeight);
        setAvailableHeight(null);
      } else {
        // For desktop, calculate available height
        const headerHeight = 180;
        const footerHeight = 0;
        const calculatedHeight = Math.max(
          height - headerHeight - footerHeight,
          350,
        ); // minimum 350px
        setAvailableHeight(`${calculatedHeight}px`);
        setMapHeight(null);
      }

      // Invalidate map size
      if (mapRef.current) {
        if (invalidateTimerRef.current)
          clearTimeout(invalidateTimerRef.current);
        invalidateTimerRef.current = setTimeout(() => {
          try {
            mapRef.current.invalidateSize({ animate: false });
          } catch (err) {
            // ignore
          }
        }, 200);
      }
    };

    computeHeights();

    let resizeTimeout;
    const onEvent = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        computeHeights();
      }, 100);
    };
    window.addEventListener("resize", onEvent);
    window.addEventListener("orientationchange", onEvent);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onEvent);
    }

    return () => {
      window.removeEventListener("resize", onEvent);
      window.removeEventListener("orientationchange", onEvent);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", onEvent);
      }
      if (invalidateTimerRef.current) {
        clearTimeout(invalidateTimerRef.current);
        invalidateTimerRef.current = null;
      }
    };
  }, []);

  // Memoize filtered photos so PhotoMarkers doesn't recreate markers on every render
  const filteredPhotos = useMemo(() => {
    const withLocation = photos.filter((p) => p.lat && p.lng);
    // Deduplicate by id, keeping the first occurrence
    const seen = new Set();
    return withLocation.filter((photo) => {
      if (seen.has(photo.id)) {
        return false;
      }
      seen.add(photo.id);
      return true;
    });
  }, [photos]);

  // Memoize the wrapped photo click handler so it doesn't trigger PhotoMarkers re-render unnecessarily
  const wrappedPhotoClickHandler = useCallback(
    (photoData) => {
      // Close all photo popups immediately
      if (window.globalClosePhotoPopups) {
        window.globalClosePhotoPopups();
      }

      setSuppressZoomUpdates(true);
      suppressZoomUpdatesRef.current = true;

      // Call the original handler
      if (onPhotoClick) {
        onPhotoClick(photoData);
      }

      // Re-enable zoom updates after 2.5 seconds (popup will have settled by then)
      const timeout = setTimeout(() => {
        setSuppressZoomUpdates(false);
        suppressZoomUpdatesRef.current = false;
      }, 2500);

      return () => clearTimeout(timeout);
    },
    [onPhotoClick],
  );

  // Set up global photo click handler to use the memoized handler
  useEffect(() => {
    globalPhotoClickHandler = wrappedPhotoClickHandler;
    // Make it available on window for onclick handlers
    window.globalPhotoClickHandler = wrappedPhotoClickHandler;
    return () => {
      globalPhotoClickHandler = null;
      window.globalPhotoClickHandler = null;
    };
  }, [wrappedPhotoClickHandler]);

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
        Math.pow(point.lat - lat, 2) + Math.pow(point.lon - lon, 2),
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

  // Zoom to selected hike when selectedHikeId changes
  useEffect(() => {
    if (!selectedHikeId) return;

    const selectedHike = hikes.find((hike) => hike.id === selectedHikeId);
    if (!selectedHike) return;

    // Get positions from the selected hike
    let positions = [];
    if (selectedHike.polyline && Array.isArray(selectedHike.polyline)) {
      positions = selectedHike.polyline;
    } else if (selectedHike.latlng && Array.isArray(selectedHike.latlng)) {
      positions = selectedHike.latlng;
    }

    if (positions.length === 0) return;

    // Create bounds from the hike positions
    try {
      const bounds = L.latLngBounds(positions);

      // We need to access the map instance to fit bounds
      // This will be handled by a new component
      setSelectedHikeBounds(bounds);
    } catch (error) {
      console.warn("Error creating bounds for selected hike:", error);
      setSelectedHikeBounds(null);
    }
  }, [selectedHikeId, hikes]);

  const [selectedHikeBounds, setSelectedHikeBounds] = useState(null);

  // fallback center
  const center =
    routePolyline.length > 0
      ? routePolyline[Math.floor(routePolyline.length / 2)]
      : [50, 4];

  // Component to handle map initialization
  function MapInitializer({ onReady }) {
    const map = useMap();

    useEffect(() => {
      if (map) {
        // Enable scroll wheel zoom only after map is initialized to avoid
        // internal Leaflet errors when the container is not yet ready.
        try {
          if (map.scrollWheelZoom && map.scrollWheelZoom.enable) {
            map.scrollWheelZoom.enable();
          }
        } catch (err) {
          // ignore
        }

        const timer = setTimeout(() => {
          onReady();
        }, 100); // Small delay to ensure map is fully initialized

        return () => clearTimeout(timer);
      }
    }, [map, onReady]);

    return null;
  }

  const handleMapReady = () => {
    setMapReady(true);
  };

  // Store created map instance so we can call invalidateSize after mobile resizes
  const handleMapCreated = (mapInstance) => {
    try {
      mapRef.current = mapInstance;
      // Ensure size is correct when map is first created
      mapRef.current.invalidateSize({ animate: false });
    } catch (err) {
      // ignore
    }
  };

  if (!routePolyline.length && !elevationProfile.length) {
    return <div>Geen kaartgegevens beschikbaar</div>;
  }

  // Calculate available height for the map (viewport height minus header/footer)
  // Set styles based on screen size
  const containerStyle = {
    height: isMobile ? mapHeight || "72vh" : availableHeight || "600px",
    position: "relative",
  };
  const viewStyle = {
    height: isMobile ? mapHeight || "72vh" : availableHeight || "600px",
    aspectRatio: isMobile ? "unset" : "auto",
  };

  return (
    <div className="map-container fade-in" style={containerStyle}>
      <div className="map-view-container" style={viewStyle}>
        <MapContainer
          key={`map-${isMobile ? mapHeight : availableHeight}`}
          center={center}
          zoom={6}
          className="map-container-leaflet"
          style={{
            height: isMobile ? mapHeight || "72vh" : availableHeight || "600px",
            width: "100%",
          }}
          whenCreated={handleMapCreated}
          whenReady={handleMapReady}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap-bijdragers"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            crossOrigin="anonymous"
            updateWhenIdle={true}
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
              positions={simplifyRoute(
                elevationProfile,
                isMobile ? 0.0005 : 0.0001,
              )
                .map((p) => [p.lat, p.lon])
                .filter((pos) => pos[0] && pos[1])}
              color="#ff5722"
              weight={4}
              opacity={0.95}
              zIndex={300}
              dashArray={null}
              lineCap="round"
              lineJoin="round"
              className="gpx-route-main"
            />
          )}

          {/* Firebase Hikes GPX Polylines (rendered last, on top) */}
          {hikes.map((hike, index) => {
            // Handle both array format and polyline string format
            let positions = [];

            if (hike.polyline && Array.isArray(hike.polyline)) {
              positions = hike.polyline;
            } else if (hike.latlng && Array.isArray(hike.latlng)) {
              positions = hike.latlng;
            }

            if (positions.length === 0) return null;

            // Assign a unique color to each hike - mixed up order for better contrast
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

            // Shuffle the color palette to mix up the order
            const shuffledPalette = [...colorPalette].sort(
              () => Math.random() - 0.5,
            );

            const hikeColor = shuffledPalette[index % shuffledPalette.length];
            const isSelected = hike.id === selectedHikeId;

            return (
              <Polyline
                key={hike.id}
                positions={positions}
                color={hikeColor}
                weight={isSelected ? 7 : 5}
                opacity={isSelected ? 1 : 0.95}
                zIndex={isSelected ? 2500 : 1200}
                lineCap="round"
                lineJoin="round"
                className={`activity-polyline ${
                  isSelected ? "selected-activity" : ""
                }`}
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

          {/* Photo markers with clustering */}
          <PhotoMarkers photos={filteredPhotos} onPhotoClick={onPhotoClick} />

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

          {/* Zoom to selected hike */}
          <ZoomToHike bounds={selectedHikeBounds} />

          {/* Pan to selected photo */}
          <PanToPhoto photoLocation={selectedPhotoLocation} />

          {/* Zoom to hike bounds (from note modal) */}
          <ZoomToHikeBounds hikeBounds={hikeBounds} />

          {/* Map interaction handler */}
          <MapInteraction
            elevationProfile={elevationProfile}
            onHover={onHover}
            zoomRange={zoomRange}
            onZoomChange={onZoomChange}
            suppressZoomUpdates={suppressZoomUpdates}
          />

          {/* Map initializer */}
          <MapInitializer onReady={handleMapReady} />
        </MapContainer>

        {/* Travel Journal Icon - positioned in top-right corner */}
        <Dropdown
          hikes={hikes}
          selectedHikeId={selectedHikeId}
          onSelectHike={onSelectHike}
          onClearSelectedHike={onClearSelectedHike}
          onRefresh={onRefresh}
          refreshInProgress={refreshInProgress}
        />
      </div>

      {/* Elevation Profile at the bottom */}
      {!isMinimized && (
        <div
          className="elevation-profile-container"
          style={{
            position: "absolute",
            bottom: 15,
            left: 0,
            right: 0,
            padding: "8px",
            zIndex: 1000,
            maxHeight: "100px",
            overflow: "hidden",
          }}
        >
          <ElevationProfile
            elevationProfile={elevationProfile}
            walkedDistanceKm={walkedDistanceKm}
            totalDistanceKm={totalDistanceKm}
            hoverPoint={hoverPoint}
            onHover={onHover}
            zoomRange={zoomRange}
            onZoomChange={onZoomChange}
            hikes={hikes}
          />
        </div>
      )}

      {/* Minimize/Maximize Button */}
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        style={{
          position: "absolute",
          bottom: isMinimized ? 10 : 90,
          right: 10,
          zIndex: 1001,
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: "18px",
          width: 36,
          height: 36,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          transition: "all 0.2s ease",
          fontSize: "12px",
          transform: buttonNudge ? "translateY(-3px)" : "scale(1)",
        }}
        title={
          isMinimized ? "Show Elevation Profile" : "Hide Elevation Profile"
        }
        onMouseEnter={(e) => {
          e.target.style.transform = "scale(1.05)";
          e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = buttonNudge
            ? "translateY(-3px)"
            : "scale(1)";
          e.target.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: "bold",
            color: "#666",
            lineHeight: 1,
          }}
        >
          {isMinimized ? "+" : "−"}
        </div>
      </button>
    </div>
  );
}

export default MapView;

function simplifyRoute(route, tolerance) {
  return simplify(
    route.map((point) => ({ x: point.lat, y: point.lon })),
    tolerance,
  ).map((point) => ({ lat: point.x, lon: point.y }));
}
