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
      },
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

          let mediaElement;
          if (
            (photo.type && photo.type.startsWith("video/")) ||
            photo.url?.includes(".mov") ||
            photo.url?.includes(".mp4") ||
            photo.url?.includes(".avi") ||
            photo.url?.includes(".webm")
          ) {
            mediaElement = document.createElement("video");
            mediaElement.src = thumbnailUrl;
            mediaElement.style.width = "100%";
            mediaElement.style.borderRadius = "4px";
            mediaElement.style.marginBottom = "0.5rem";
            mediaElement.style.cursor = "pointer";
            mediaElement.style.touchAction = "manipulation";
            mediaElement.muted = true;
            // Add play icon overlay
            const playIcon = document.createElement("div");
            playIcon.innerHTML = "▶️";
            playIcon.style.position = "absolute";
            playIcon.style.top = "50%";
            playIcon.style.left = "50%";
            playIcon.style.transform = "translate(-50%, -50%)";
            playIcon.style.fontSize = "1.5rem";
            playIcon.style.pointerEvents = "none";
            photoDiv.style.position = "relative";
            photoDiv.appendChild(playIcon);
          } else {
            mediaElement = document.createElement("img");
            mediaElement.src = thumbnailUrl;
            mediaElement.alt = photo.caption || "Polarsteps foto";
            mediaElement.style.width = "100%";
            mediaElement.style.borderRadius = "4px";
            mediaElement.style.marginBottom = "0.5rem";
            mediaElement.style.cursor = "pointer";
            mediaElement.style.touchAction = "manipulation";
          }

          mediaElement.setAttribute(
            "data-photo-url",
            photo.url.replace(/"/g, '"'),
          );
          mediaElement.setAttribute(
            "data-photo-caption",
            (photo.caption || "").replace(/"/g, '"'),
          );
          mediaElement.setAttribute("data-photo-date", photo.date || "");

          // Add both click and touchend handlers for better mobile support
          const handlePhotoClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.globalPhotoClickHandler) {
              window.globalPhotoClickHandler({
                url: mediaElement.getAttribute("data-photo-url"),
                caption: mediaElement.getAttribute("data-photo-caption"),
                date: mediaElement.getAttribute("data-photo-date"),
              });
            }
          };

          mediaElement.addEventListener("click", handlePhotoClick);
          mediaElement.addEventListener("touchend", handlePhotoClick);

          photoDiv.appendChild(mediaElement);

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

        // Configure popup to stay open during map movement
        marker.bindPopup(popupContent, {
          autoClose: false,
          closeButton: true,
          closeOnClick: false,
          closeOnEscapeKey: true,
        });
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

          let mediaElement;
          if (
            (photo.type && photo.type.startsWith("video/")) ||
            photo.url?.includes(".mov") ||
            photo.url?.includes(".mp4") ||
            photo.url?.includes(".avi") ||
            photo.url?.includes(".webm")
          ) {
            mediaElement = document.createElement("video");
            mediaElement.src = thumbnailUrl;
            mediaElement.style.width = "100%";
            mediaElement.style.borderRadius = "4px";
            mediaElement.style.marginBottom = "0.5rem";
            mediaElement.style.cursor = "pointer";
            mediaElement.style.touchAction = "manipulation";
            mediaElement.muted = true;
            // Add play icon overlay
            const playIcon = document.createElement("div");
            playIcon.innerHTML = "▶️";
            playIcon.style.position = "absolute";
            playIcon.style.top = "50%";
            playIcon.style.left = "50%";
            playIcon.style.transform = "translate(-50%, -50%)";
            playIcon.style.fontSize = "1.5rem";
            playIcon.style.pointerEvents = "none";
            photoDiv.style.position = "relative";
            photoDiv.appendChild(playIcon);
          } else {
            mediaElement = document.createElement("img");
            mediaElement.src = thumbnailUrl;
            mediaElement.alt = photo.caption || "Polarsteps foto";
            mediaElement.style.width = "100%";
            mediaElement.style.borderRadius = "4px";
            mediaElement.style.marginBottom = "0.5rem";
            mediaElement.style.cursor = "pointer";
            mediaElement.style.touchAction = "manipulation";
            mediaElement.loading = "lazy";
          }

          mediaElement.setAttribute(
            "data-photo-url",
            photo.url.replace(/"/g, '"'),
          );
          mediaElement.setAttribute(
            "data-photo-caption",
            (photo.caption || "").replace(/"/g, '"'),
          );
          mediaElement.setAttribute("data-photo-date", photo.date || "");

          // Add both click and touchend handlers for better mobile support
          const handlePhotoClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.globalPhotoClickHandler) {
              window.globalPhotoClickHandler({
                url: mediaElement.getAttribute("data-photo-url"),
                caption: mediaElement.getAttribute("data-photo-caption"),
                date: mediaElement.getAttribute("data-photo-date"),
              });
            }
          };

          mediaElement.addEventListener("click", handlePhotoClick);
          mediaElement.addEventListener("touchend", handlePhotoClick);

          photoDiv.appendChild(mediaElement);

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

        // Configure popup to stay open during map movement
        marker.bindPopup(popupContent, {
          autoClose: false,
          closeButton: true,
          closeOnClick: false,
          closeOnEscapeKey: true,
        });
        marker.addTo(map);
        individualMarkers.push(marker);
      });

      markersRef.current = individualMarkers;
    }

    // Close other photo popups when one opens
    const handlePopupOpen = (e) => {
      try {
        const src = e && e.popup && e.popup._source;
        if (!src) return;

        // Only act on our photo markers (identified by icon className)
        const isPhotoMarker =
          src.options &&
          src.options.icon &&
          src.options.icon.options &&
          src.options.icon.options.className === "photo-marker-icon";
        if (!isPhotoMarker) return;

        // Gather all photo markers (cluster group's layers or individual array)
        let allMarkers = [];
        if (markersRef.current) {
          if (Array.isArray(markersRef.current)) {
            allMarkers = markersRef.current;
          } else if (markersRef.current.getLayers) {
            allMarkers = markersRef.current.getLayers();
          }
        }

        allMarkers.forEach((m) => {
          if (!m || m === src) return;
          try {
            // closePopup is safe to call even if popup is not open
            m.closePopup && m.closePopup();
          } catch (err) {
            /* ignore */
          }
        });
      } catch (err) {
        console.warn("Error in photo popupopen handler:", err);
      }
    };

    map.on("popupopen", handlePopupOpen);

    // Set up global function to close all photo popups
    globalClosePhotoPopups = () => {
      try {
        let allMarkers = [];
        if (markersRef.current) {
          if (Array.isArray(markersRef.current)) {
            allMarkers = markersRef.current;
          } else if (markersRef.current.getLayers) {
            allMarkers = markersRef.current.getLayers();
          }
        }
        allMarkers.forEach((m) => {
          if (!m) return;
          try {
            m.closePopup && m.closePopup();
          } catch (err) {
            /* ignore */
          }
        });
      } catch (err) {
        console.warn("Error closing photo popups:", err);
      }
    };
    window.globalClosePhotoPopups = globalClosePhotoPopups;

    // Cleanup function
    return () => {
      map.off("popupopen", handlePopupOpen);
      globalClosePhotoPopups = null;
      window.globalClosePhotoPopups = null;
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
  suppressZoomUpdates = false,
}) {
  const map = useMap();
  const isUpdatingFromZoomRange = useRef(false);
  const lastZoomRange = useRef(null);
  const isUserZooming = useRef(false);
  const lastMapUpdate = useRef(0);
  const isInitialLoad = useRef(true);
  const isMapReady = useRef(false);
  const suppressZoomUpdatesRef = useRef(false);

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

  // Update suppressZoomUpdatesRef when prop changes
  useEffect(() => {
    suppressZoomUpdatesRef.current = suppressZoomUpdates;
  }, [suppressZoomUpdates]);

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
          p.lat &&
          p.lon &&
          p.distanceKm >= range[0] &&
          p.distanceKm <= range[1],
      );

      if (pointsInRange.length === 0) return false;

      const rangeBounds = L.latLngBounds(
        pointsInRange.map((p) => [p.lat, p.lon]),
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
      !isMapReady.current ||
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
            p.distanceKm <= zoomRange[1],
        );

        if (pointsInRange.length > 0) {
          const bounds = L.latLngBounds(
            pointsInRange.map((p) => [p.lat, p.lon]),
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
    }, 100);
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
      // Skip if this move was triggered by elevation profile update or if updates are suppressed
      if (isUpdatingFromZoomRange.current || suppressZoomUpdatesRef.current)
        return;

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
      }, 200); // Wait 400ms after user stops panning
    };

    const handleZoomEnd = () => {
      // Skip if this zoom was triggered by elevation profile update or if updates are suppressed
      if (isUpdatingFromZoomRange.current || suppressZoomUpdatesRef.current) {
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
      }, 200); // Wait 600ms after user stops zooming
    };

    // Function to update elevation profile based on current map bounds
    const updateElevationProfileFromBounds = (bounds, isZoom) => {
      // Find points within the current map bounds
      const pointsInBounds = elevationProfile.filter(
        (p) => p.lat && p.lon && bounds.contains([p.lat, p.lon]),
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
            Math.pow(point.lon - clickedLon, 2),
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

  // Handle double-tap to zoom in on mobile
  useEffect(() => {
    if (!map || !isMapReady.current) return;

    const mapContainer = map.getContainer();
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        // Only handle single touch
        const touch = e.touches[0];
        const currentTime = Date.now();
        const timeDiff = currentTime - lastTapTime;
        const xDiff = Math.abs(touch.clientX - lastTapX);
        const yDiff = Math.abs(touch.clientY - lastTapY);

        if (timeDiff < 300 && xDiff < 30 && yDiff < 30) {
          // Double tap detected
          e.preventDefault();
          map.zoomIn();
        }

        lastTapTime = currentTime;
        lastTapX = touch.clientX;
        lastTapY = touch.clientY;
      }
    };

    mapContainer.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });

    return () => {
      mapContainer.removeEventListener("touchstart", handleTouchStart);
    };
  }, [map, isMapReady.current]);

  return null;
}

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
              positions={elevationProfile
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
