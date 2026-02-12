import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

// Small helper to pick thumbnail URL
const getPhotoThumbnailUrl = (photo) => photo.thumbnailUrl || photo.url;

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

// This component mirrors the original PhotoMarkers implementation from MapView
export default function PhotoMarkers({ photos = [], onPhotoClick }) {
  const map = useMap();
  const markersRef = useRef(null);

  useEffect(() => {
    // If react-leaflet is managing the map, try to access window.map created by the app
    const mapRefObj = map;
    if (!mapRefObj) return;

    // Group photos by location
    const photosByLocation = new Map();
    photos.forEach((photo) => {
      const key = `${photo.lat},${photo.lng}`;
      if (!photosByLocation.has(key)) photosByLocation.set(key, []);
      photosByLocation.get(key).push(photo);
    });

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

    const shouldCluster = locationMarkers.length >= 5;

    try {
      if (shouldCluster) {
        const markers = L.markerClusterGroup({
          spiderfyOnMaxZoom: false,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          removeOutsideVisibleBounds: true,
          disableClusteringAtZoom: 12,
          maxClusterRadius: 30,
        });

        locationMarkers.forEach((location) => {
          const marker = L.marker([location.lat, location.lng], {
            icon: createPhotoIcon(location.photos[0]),
          });

          const popupContent = document.createElement("div");
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
            } else {
              mediaElement = document.createElement("img");
              mediaElement.src = thumbnailUrl;
              mediaElement.alt = photo.caption || "photo";
              mediaElement.style.width = "100%";
              mediaElement.style.borderRadius = "4px";
              mediaElement.style.marginBottom = "0.5rem";
              mediaElement.style.cursor = "pointer";
              mediaElement.style.touchAction = "manipulation";
              mediaElement.loading = "lazy";
            }

            mediaElement.setAttribute("data-photo-url", photo.url || "");
            mediaElement.setAttribute(
              "data-photo-caption",
              photo.caption || "",
            );
            mediaElement.setAttribute("data-photo-date", photo.date || "");

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
              if (onPhotoClick)
                onPhotoClick({
                  url: photo.url,
                  caption: photo.caption,
                  date: photo.date,
                });
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

          marker.bindPopup(popupContent, {
            autoClose: false,
            closeButton: true,
            closeOnClick: false,
            closeOnEscapeKey: true,
          });

          markers.addLayer(marker);
        });

        mapRefObj.addLayer(markers);
        markersRef.current = markers;
      } else {
        const individualMarkers = [];
        locationMarkers.forEach((location) => {
          const marker = L.marker([location.lat, location.lng], {
            icon: createPhotoIcon(location.photos[0]),
          });

          const popupContent = document.createElement("div");
          const photoElements = location.photos.map((photo, index) => {
            const thumbnailUrl = getPhotoThumbnailUrl(photo);
            const photoDiv = document.createElement("div");
            photoDiv.style.maxWidth = "200px";
            if (index > 0) {
              photoDiv.style.marginTop = "1rem";
              photoDiv.style.borderTop = "1px solid #eee";
              photoDiv.style.paddingTop = "0.5rem";
            }

            let mediaElement = document.createElement("img");
            mediaElement.src = thumbnailUrl;
            mediaElement.alt = photo.caption || "photo";
            mediaElement.style.width = "100%";
            mediaElement.style.borderRadius = "4px";
            mediaElement.style.marginBottom = "0.5rem";
            mediaElement.style.cursor = "pointer";
            mediaElement.style.touchAction = "manipulation";
            mediaElement.loading = "lazy";

            mediaElement.setAttribute("data-photo-url", photo.url || "");
            mediaElement.setAttribute(
              "data-photo-caption",
              photo.caption || "",
            );
            mediaElement.setAttribute("data-photo-date", photo.date || "");

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
              if (onPhotoClick)
                onPhotoClick({
                  url: photo.url,
                  caption: photo.caption,
                  date: photo.date,
                });
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

          marker.bindPopup(popupContent, {
            autoClose: false,
            closeButton: true,
            closeOnClick: false,
            closeOnEscapeKey: true,
          });

          marker.addTo(mapRefObj);
          individualMarkers.push(marker);
        });

        markersRef.current = individualMarkers;
      }
    } catch (err) {
      console.warn("PhotoMarkers error:", err);
    }

    const handlePopupOpen = (e) => {
      try {
        const src = e && e.popup && e.popup._source;
        if (!src) return;
        const isPhotoMarker =
          src.options &&
          src.options.icon &&
          src.options.icon.options &&
          src.options.icon.options.className === "photo-marker-icon";
        if (!isPhotoMarker) return;

        let allMarkers = [];
        if (markersRef.current) {
          if (Array.isArray(markersRef.current))
            allMarkers = markersRef.current;
          else if (markersRef.current.getLayers)
            allMarkers = markersRef.current.getLayers();
        }

        allMarkers.forEach((m) => {
          if (!m || m === src) return;
          try {
            m.closePopup && m.closePopup();
          } catch (err) {}
        });
      } catch (err) {
        console.warn("Error in photo popupopen handler:", err);
      }
    };

    mapRefObj.on && mapRefObj.on("popupopen", handlePopupOpen);

    // Set up global close function
    const globalClose = () => {
      try {
        let allMarkers = [];
        if (markersRef.current) {
          if (Array.isArray(markersRef.current))
            allMarkers = markersRef.current;
          else if (markersRef.current.getLayers)
            allMarkers = markersRef.current.getLayers();
        }
        allMarkers.forEach((m) => {
          if (!m) return;
          try {
            m.closePopup && m.closePopup();
          } catch (err) {}
        });
      } catch (err) {
        console.warn("Error closing photo popups:", err);
      }
    };
    window.globalClosePhotoPopups = globalClose;

    return () => {
      try {
        mapRefObj.off && mapRefObj.off("popupopen", handlePopupOpen);
      } catch (e) {}
      window.globalClosePhotoPopups = null;
      if (markersRef.current) {
        if (Array.isArray(markersRef.current))
          markersRef.current.forEach(
            (m) => mapRefObj.removeLayer && mapRefObj.removeLayer(m),
          );
        else mapRefObj.removeLayer && mapRefObj.removeLayer(markersRef.current);
        markersRef.current = null;
      }
    };
  }, [photos, onPhotoClick]);

  return null;
}
