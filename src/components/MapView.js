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
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import PhotoMarkerPopup from "./PhotoMarkerPopup";
import GpxTrack from "./Gpxtrack";
import TravelJournalIcon from "./TravelJournalIcon";

// Global function for photo modal (will be set by MapView)
let globalPhotoClickHandler = null;

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
      try {
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (error) {
        console.warn("Error fitting bounds:", error);
      }
    }
  }, [bounds, map]);

  return null;
}

// Component to handle photo markers with clustering
function PhotoMarkers({ photos, onPhotoClick }) {
  const map = useMap();
  const markersRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Clear all existing marker cluster groups and individual markers from the map
    map.eachLayer((layer) => {
      if (layer instanceof L.MarkerClusterGroup || layer instanceof L.Marker) {
        // Only remove our photo markers, not other markers like the hiker marker
        if (
          layer.options &&
          layer.options.icon &&
          layer.options.icon.options &&
          layer.options.icon.options.className === "photo-marker-icon"
        ) {
          map.removeLayer(layer);
        } else if (layer instanceof L.MarkerClusterGroup) {
          map.removeLayer(layer);
        }
      }
    });

    // Remove existing markers reference if it exists
    if (markersRef.current) {
      if (Array.isArray(markersRef.current)) {
        // Individual markers
        markersRef.current.forEach((marker) => map.removeLayer(marker));
      } else {
        // Cluster group
        map.removeLayer(markersRef.current);
      }
      markersRef.current = null;
    }

    // Group photos by location to handle overlapping photos
    const photosByLocation = new Map();
    photos.forEach((photo) => {
      const key = `${photo.lat},${photo.lng}`;
      if (!photosByLocation.has(key)) {
        photosByLocation.set(key, []);
      }
      photosByLocation.get(key).push(photo);
    });

    // Create markers for each unique location
    const locationMarkers = Array.from(photosByLocation.entries()).map(
      ([key, locationPhotos]) => {
        const [lat, lng] = key.split(",").map(Number);
        return {
          lat,
          lng,
          photos: locationPhotos,
          count: locationPhotos.length,
        };
      }
    );

    // Use clustering only if there are 5+ unique locations
    const shouldCluster = locationMarkers.length >= 5;

    if (shouldCluster) {
      // Use clustering for 5+ photos
      const markers = L.markerClusterGroup({
        spiderfyOnMaxZoom: false,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        removeOutsideVisibleBounds: true,
        disableClusteringAtZoom: 12, // Disable clustering earlier for faster declustering
        maxClusterRadius: 30, // Smaller cluster radius for finer control
      });

      // Add location markers to cluster group
      locationMarkers.forEach((location) => {
        const marker = L.marker([location.lat, location.lng], {
          icon: createPhotoIcon(location.photos[0]), // Use first photo as icon
        });

        /* Create popup content showing all photos at this location */
        const popupContent = document.createElement("div");

        // Create content with better mobile touch handling
        const photoElements = location.photos.map((photo, index) => {
          const thumbnailUrl = getPhotoThumbnailUrl(photo);
          const photoDiv = document.createElement("div");
          photoDiv.style.maxWidth = "200px";
          if (index > 0) {
            photoDiv.style.marginTop = "1rem";
            photoDiv.style.borderTop = "1px solid #eee";
            photoDiv.style.paddingTop = "0.5rem";
          }

          const img = document.createElement("img");
          img.src = thumbnailUrl;
          img.alt = photo.caption || "Polarsteps foto";
          img.style.width = "100%";
          img.style.borderRadius = "4px";
          img.style.marginBottom = "0.5rem";
          img.style.cursor = "pointer";
          img.style.touchAction = "manipulation";
          img.setAttribute("data-photo-url", photo.url.replace(/"/g, '"'));
          img.setAttribute(
            "data-photo-caption",
            (photo.caption || "").replace(/"/g, '"')
          );
          img.setAttribute("data-photo-date", photo.date || "");

          // Add both click and touchend handlers for better mobile support
          const handlePhotoClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.globalPhotoClickHandler) {
              window.globalPhotoClickHandler({
                url: img.getAttribute("data-photo-url"),
                caption: img.getAttribute("data-photo-caption"),
                date: img.getAttribute("data-photo-date"),
              });
            }
          };

          img.addEventListener("click", handlePhotoClick);
          img.addEventListener("touchend", handlePhotoClick);

          photoDiv.appendChild(img);

          if (photo.caption) {
            const captionDiv = document.createElement("div");
            captionDiv.style.fontWeight = "bold";
            captionDiv.textContent = photo.caption;
            photoDiv.appendChild(captionDiv);
          }

          if (photo.date) {
            const dateDiv = document.createElement("div");
            dateDiv.style.fontSize = "0.8rem";
            dateDiv.style.color = "#555";
            dateDiv.textContent = photo.date;
            photoDiv.appendChild(dateDiv);
          }

          return photoDiv;
        });

        photoElements.forEach((el) => popupContent.appendChild(el));

        marker.bindPopup(popupContent);
        markers.addLayer(marker);
      });

      // Add cluster group to map
      map.addLayer(markers);
      markersRef.current = markers;
    } else {
      // Show individual markers for 1-4 locations
      const individualMarkers = [];

      locationMarkers.forEach((location) => {
        const marker = L.marker([location.lat, location.lng], {
          icon: createPhotoIcon(location.photos[0]), // Use first photo as icon
        });

        /* Create popup content showing all photos at this location */
        const popupContent = document.createElement("div");

        // Create content with better mobile touch handling
        const photoElements = location.photos.map((photo, index) => {
          const thumbnailUrl = getPhotoThumbnailUrl(photo);
          const photoDiv = document.createElement("div");
          photoDiv.style.maxWidth = "200px";
          if (index > 0) {
            photoDiv.style.marginTop = "1rem";
            photoDiv.style.borderTop = "1px solid #eee";
            photoDiv.style.paddingTop = "0.5rem";
          }

          const img = document.createElement("img");
          img.src = thumbnailUrl;
          img.alt = photo.caption || "Polarsteps foto";
          img.style.width = "100%";
          img.style.borderRadius = "4px";
          img.style.marginBottom = "0.5rem";
          img.style.cursor = "pointer";
          img.style.touchAction = "manipulation";
          img.setAttribute("data-photo-url", photo.url.replace(/"/g, '"'));
          img.setAttribute(
            "data-photo-caption",
            (photo.caption || "").replace(/"/g, '"')
          );
          img.setAttribute("data-photo-date", photo.date || "");

          // Add both click and touchend handlers for better mobile support
          const handlePhotoClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.globalPhotoClickHandler) {
              window.globalPhotoClickHandler({
                url: img.getAttribute("data-photo-url"),
                caption: img.getAttribute("data-photo-caption"),
                date: img.getAttribute("data-photo-date"),
              });
            }
          };

          img.addEventListener("click", handlePhotoClick);
          img.addEventListener("touchend", handlePhotoClick);

          photoDiv.appendChild(img);

          if (photo.caption) {
            const captionDiv = document.createElement("div");
            captionDiv.style.fontWeight = "bold";
            captionDiv.textContent = photo.caption;
            photoDiv.appendChild(captionDiv);
          }

          if (photo.date) {
            const dateDiv = document.createElement("div");
            dateDiv.style.fontSize = "0.8rem";
            dateDiv.style.color = "#555";
            dateDiv.textContent = photo.date;
            photoDiv.appendChild(dateDiv);
          }

          return photoDiv;
        });

        photoElements.forEach((el) => popupContent.appendChild(el));

        marker.bindPopup(popupContent);
        marker.addTo(map);
        individualMarkers.push(marker);
      });

      markersRef.current = individualMarkers;
    }

    // Cleanup function
    return () => {
      if (markersRef.current) {
        if (Array.isArray(markersRef.current)) {
          // Individual markers
          markersRef.current.forEach((marker) => map.removeLayer(marker));
        } else {
          // Cluster group
          map.removeLayer(markersRef.current);
        }
        markersRef.current = null;
      }
    };
  }, [map, photos]);

  return null;
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
  const isMapReady = useRef(false);

  // Ensure map is ready before any operations
  useEffect(() => {
    if (map && map.getContainer && !isMapReady.current) {
      try {
        // Test if map is fully initialized
        map.getZoom();
        isMapReady.current = true;
      } catch (error) {
        console.warn("Map not ready yet:", error);
      }
    }
  }, [map]);

  // Check if current map view matches the zoom range
  const doesMapViewMatchZoomRange = (range) => {
    if (
      !range ||
      !map ||
      !map.getContainer() ||
      !elevationProfile ||
      elevationProfile.length === 0
    )
      return true;

    try {
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
    } catch (error) {
      console.warn("Error checking map view bounds:", error);
      return true;
    }
  };

  // Sync map bounds with elevation profile zoom range
  useEffect(() => {
    if (
      !map ||
      !map.getContainer() ||
      !elevationProfile ||
      elevationProfile.length === 0
    )
      return;

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

    try {
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
          const bounds = L.latLngBounds(
            pointsInRange.map((p) => [p.lat, p.lon])
          );
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
    } catch (error) {
      console.warn("Error updating map bounds:", error);
    }

    isInitialLoad.current = false;

    // Reset flag after animation completes
    setTimeout(() => {
      isUpdatingFromZoomRange.current = false;
    }, 300);
  }, [map, elevationProfile, zoomRange]);

  // Handle map interactions (zoom and pan) to update elevation profile zoom range
  useEffect(() => {
    if (
      !map ||
      !isMapReady.current ||
      !elevationProfile ||
      elevationProfile.length === 0
    )
      return;

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
        try {
          lastMapUpdate.current = Date.now();
          const bounds = map.getBounds();
          updateElevationProfileFromBounds(bounds, false);
        } catch (error) {
          console.warn("Error handling move end:", error);
        }
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
        try {
          lastMapUpdate.current = Date.now();
          const bounds = map.getBounds();
          updateElevationProfileFromBounds(bounds, true);
          isUserZooming.current = false;
        } catch (error) {
          console.warn("Error handling zoom end:", error);
          isUserZooming.current = false;
        }
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
    if (
      !map ||
      !isMapReady.current ||
      !elevationProfile ||
      elevationProfile.length === 0
    )
      return;

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
  selectedHikeId,
  onSelectHike,
  onPhotoClick,
  onClearSelectedHike,
}) {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // Find the selected hike and its note
  const selectedHike = hikes.find((hike) => hike.id === selectedHikeId);
  const noteText = selectedHike?.note || "";

  // Set up global photo click handler to use the prop
  useEffect(() => {
    globalPhotoClickHandler = onPhotoClick;
    // Make it available on window for onclick handlers
    window.globalPhotoClickHandler = onPhotoClick;
    return () => {
      globalPhotoClickHandler = null;
      window.globalPhotoClickHandler = null;
    };
  }, [onPhotoClick]);

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

  if (!routePolyline.length && !elevationProfile.length) {
    return <div>Geen kaartgegevens beschikbaar</div>;
  }

  return (
    <div className="map-container fade-in">
      <div className="map-view-container">
        {/* Photo Modal moved to App level */}
        {false && selectedPhoto && (
          <div
            className="full-image-modal"
            onClick={(e) => {
              // Only close if clicking the backdrop, not the content
              if (e.target === e.currentTarget) {
                setSelectedPhoto(null);
              }
            }}
          >
            <div className="full-image-container">
              {/* Close button - multiple options for visibility */}
              <button
                className="close-button"
                onClick={() => setSelectedPhoto(null)}
                title="Close (Esc)"
                style={{
                  background: "red",
                  color: "white",
                  border: "3px solid white",
                  fontSize: "24px",
                  fontWeight: "bold",
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  zIndex: 1002,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>

              {/* Fallback close button at bottom */}
              <button
                onClick={() => setSelectedPhoto(null)}
                style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "red",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  zIndex: 1002,
                }}
              >
                CLOSE MODAL
              </button>

              {/* Previous button */}
              {selectedPhotoIndex > 0 && (
                <button
                  className="nav-button nav-prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPreviousPhoto();
                  }}
                  title="Previous photo"
                >
                  ‹
                </button>
              )}

              {/* Next button */}
              {selectedPhotoIndex < sortedPhotos.length - 1 && (
                <button
                  className="nav-button nav-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextPhoto();
                  }}
                  title="Next photo"
                >
                  ›
                </button>
              )}

              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || "Polarsteps foto"}
              />

              {/* Photo counter */}
              <div className="photo-counter">
                {selectedPhotoIndex + 1} / {sortedPhotos.length}
              </div>

              {(selectedPhoto.caption || selectedPhoto.date) && (
                <div className="full-image-caption">
                  {selectedPhoto.caption && <div>{selectedPhoto.caption}</div>}
                  {selectedPhoto.date && (
                    <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                      {selectedPhoto.date}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <MapContainer
          center={center}
          zoom={6}
          className="map-container-leaflet"
          whenReady={handleMapReady}
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
          {hikes.map((hike, index) => {
            // Handle both array format and polyline string format
            let positions = [];

            if (hike.polyline && Array.isArray(hike.polyline)) {
              positions = hike.polyline;
            } else if (hike.latlng && Array.isArray(hike.latlng)) {
              positions = hike.latlng;
            }

            if (positions.length === 0) return null;

            // Assign a unique color to each hike - smooth gradient flow (starting with lime)
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

            const hikeColor = colorPalette[index % colorPalette.length];
            const isSelected = hike.id === selectedHikeId;

            return (
              <Polyline
                key={hike.id}
                positions={positions}
                color={hikeColor}
                weight={isSelected ? 6 : 4}
                opacity={isSelected ? 1 : 0.9}
                zIndex={isSelected ? 2000 : 1000}
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
          <PhotoMarkers photos={photos} onPhotoClick={onPhotoClick} />

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

          {/* Map interaction handler */}
          <MapInteraction
            elevationProfile={elevationProfile}
            onHover={onHover}
            zoomRange={zoomRange}
            onZoomChange={onZoomChange}
          />

          {/* Map initializer */}
          <MapInitializer onReady={handleMapReady} />
        </MapContainer>

        {/* Travel Journal Icon - positioned in top-right corner */}
        <TravelJournalIcon
          hikes={hikes}
          selectedHikeId={selectedHikeId}
          onSelectHike={onSelectHike}
          onClearSelectedHike={onClearSelectedHike}
        />

        {/* Note Overlay - Oldschool Notepad Style */}
        {/* This is rendered outside MapContainer but positioned as an overlay */}
        {noteText && (
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              zIndex: 1000,
              maxWidth: "350px",
              minWidth: "250px",
              fontFamily: "'Courier New', monospace",
              background: "#fefefe",
              border: "2px solid #8B4513",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              overflow: "hidden",
            }}
          >
            {/* Notepad Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #D2691E, #CD853F)",
                color: "white",
                padding: "8px 12px",
                fontWeight: "bold",
                fontSize: "14px",
                borderBottom: "1px solid #8B4513",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "16px" }}>📝</span>
              <span>Activity Note</span>
              <button
                onClick={onClearSelectedHike}
                style={{
                  marginLeft: "auto",
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  color: "white",
                  borderRadius: "4px",
                  width: "20px",
                  height: "20px",
                  cursor: "pointer",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Close note"
              >
                ×
              </button>
            </div>

            {/* Notepad Content */}
            <div
              style={{
                padding: "16px",
                background: "#fefefe",
                maxHeight: "300px",
                overflowY: "auto",
                position: "relative",
              }}
            >
              {/* Lined paper effect - extended to full content area */}
              <div
                style={{
                  position: "absolute",
                  top: "0",
                  left: "0",
                  right: "0",
                  bottom: "-1000px",
                  background: `repeating-linear-gradient(
                    to bottom,
                    transparent 0px,
                    transparent 6px,
                    #e0e0e0 6px,
                    #e0e0e0 7px,
                    transparent 7px,
                    transparent 15px
                  )`,
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              />

              {/* Content with perfect line alignment */}
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  whiteSpace: "pre-wrap",
                  lineHeight: "17px",
                  fontSize: "13px",
                  color: "#333",
                  fontFamily: "'Courier New', monospace",
                  paddingRight: "4px",
                  paddingTop: "6px",
                }}
              >
                {noteText}
              </div>
            </div>

            {/* Notepad Footer */}
            <div
              style={{
                background: "#f5f5f5",
                padding: "6px 12px",
                borderTop: "1px solid #ddd",
                fontSize: "11px",
                color: "#666",
                textAlign: "center",
              }}
            >
              {selectedHike?.name || "Activity Note"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapView;
