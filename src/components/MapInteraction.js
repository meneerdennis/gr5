import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

export default function MapInteraction({
  elevationProfile,
  onHover,
  zoomRange,
  onZoomChange,
  suppressZoomUpdates = false,
}) {
  // This file mirrors the original MapInteraction implementation from MapView
  const map = useMap();
  const isUpdatingFromZoomRange = useRef(false);
  const lastZoomRange = useRef(null);
  const isUserZooming = useRef(false);
  const lastMapUpdate = useRef(0);
  const isInitialLoad = useRef(true);
  const isMapReady = useRef(false);
  const suppressZoomUpdatesRef = useRef(false);

  useEffect(() => {
    if (map && map.getZoom && !isMapReady.current) {
      try {
        map.getZoom();
        isMapReady.current = true;
      } catch (error) {
        console.warn("Map not ready yet:", error);
      }
    }
  }, [map]);

  useEffect(() => {
    suppressZoomUpdatesRef.current = suppressZoomUpdates;
  }, [suppressZoomUpdates]);

  const doesMapViewMatchZoomRange = (mapObj, range) => {
    if (!range || !mapObj || !elevationProfile || elevationProfile.length === 0)
      return true;
    try {
      const bounds = mapObj.getBounds();
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
      const mapSw = bounds.getSouthWest();
      const mapNe = bounds.getNorthEast();
      const rangeSw = rangeBounds.getSouthWest();
      const rangeNe = rangeBounds.getNorthEast();
      const tolerance = 0.01;
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

  useEffect(() => {
    if (
      !map ||
      !isMapReady.current ||
      !elevationProfile ||
      elevationProfile.length === 0
    )
      return;

    const mapObj = map;
    const rangeChanged =
      !lastZoomRange.current ||
      !zoomRange ||
      (zoomRange &&
        lastZoomRange.current &&
        (zoomRange[0] !== lastZoomRange.current[0] ||
          zoomRange[1] !== lastZoomRange.current[1]));
    if (!rangeChanged) return;

    if (
      !isInitialLoad.current &&
      doesMapViewMatchZoomRange(mapObj, zoomRange)
    ) {
      lastZoomRange.current = zoomRange;
      return;
    }

    lastZoomRange.current = zoomRange;
    const timeSinceLastMapUpdate = Date.now() - lastMapUpdate.current;
    if (timeSinceLastMapUpdate < 1000 && !isInitialLoad.current) return;

    isUpdatingFromZoomRange.current = true;

    try {
      if (zoomRange) {
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
          mapObj.fitBounds(bounds, {
            padding: [5, 5],
            maxZoom: mapObj.getZoom(),
          });
        }
      } else {
        const allPoints = elevationProfile.filter((p) => p.lat && p.lon);
        if (allPoints.length > 0) {
          const bounds = L.latLngBounds(allPoints.map((p) => [p.lat, p.lon]));
          mapObj.fitBounds(bounds, { padding: [5, 5] });
        }
      }
    } catch (error) {
      console.warn("Error updating map bounds:", error);
    }

    isInitialLoad.current = false;
    setTimeout(() => {
      isUpdatingFromZoomRange.current = false;
    }, 100);
  }, [map, elevationProfile, zoomRange]);

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

    const updateElevationProfileFromBounds = (bounds, isZoom) => {
      const pointsInBounds = elevationProfile.filter(
        (p) => p.lat && p.lon && bounds.contains([p.lat, p.lon]),
      );
      if (pointsInBounds.length > 0) {
        const minKm = Math.min(...pointsInBounds.map((p) => p.distanceKm));
        const maxKm = Math.max(...pointsInBounds.map((p) => p.distanceKm));
        const totalRouteKm =
          elevationProfile[elevationProfile.length - 1].distanceKm;
        const visiblePercentage = ((maxKm - minKm) / totalRouteKm) * 100;

        if (isZoom) {
          if (
            visiblePercentage < 90 &&
            maxKm - minKm > 10 &&
            (!lastZoomRange.current ||
              Math.abs(minKm - lastZoomRange.current[0]) > 15 ||
              Math.abs(maxKm - lastZoomRange.current[1]) > 15)
          ) {
            onZoomChange && onZoomChange([minKm, maxKm]);
          }
        } else {
          if (
            visiblePercentage < 95 &&
            maxKm - minKm > 5 &&
            (!lastZoomRange.current ||
              Math.abs(minKm - lastZoomRange.current[0]) > 10 ||
              Math.abs(maxKm - lastZoomRange.current[1]) > 10)
          ) {
            onZoomChange && onZoomChange([minKm, maxKm]);
          }
        }
      }
    };

    const handleMoveEnd = () => {
      if (isUpdatingFromZoomRange.current || suppressZoomUpdatesRef.current)
        return;
      if (interactionTimeout) clearTimeout(interactionTimeout);
      interactionTimeout = setTimeout(() => {
        try {
          lastMapUpdate.current = Date.now();
          const bounds = map.getBounds();
          updateElevationProfileFromBounds(bounds, false);
        } catch (error) {
          console.warn("Error handling move end:", error);
        }
      }, 200);
    };

    const handleZoomEnd = () => {
      if (isUpdatingFromZoomRange.current || suppressZoomUpdatesRef.current) {
        isUserZooming.current = false;
        return;
      }
      if (interactionTimeout) clearTimeout(interactionTimeout);
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
      }, 200);
    };

    map.on && map.on("zoomstart", handleZoomStart);
    map.on && map.on("zoomend", handleZoomEnd);
    map.on && map.on("moveend", handleMoveEnd);

    return () => {
      if (interactionTimeout) clearTimeout(interactionTimeout);
      map.off && map.off("zoomstart", handleZoomStart);
      map.off && map.off("zoomend", handleZoomEnd);
      map.off && map.off("moveend", handleMoveEnd);
    };
  }, [map, elevationProfile, onZoomChange]);

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
      if (closestPoint && minDistance < 0.1) onHover && onHover(closestPoint);
    };

    map.on && map.on("click", handleMapClick);
    return () => {
      map.off && map.off("click", handleMapClick);
    };
  }, [map, elevationProfile, onHover]);

  useEffect(() => {
    if (!map || !isMapReady.current) return;
    const mapContainer = map.getContainer();
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const currentTime = Date.now();
        const timeDiff = currentTime - lastTapTime;
        const xDiff = Math.abs(touch.clientX - lastTapX);
        const yDiff = Math.abs(touch.clientY - lastTapY);
        if (timeDiff < 300 && xDiff < 30 && yDiff < 30) {
          e.preventDefault();
          map.zoomIn();
        }
        lastTapTime = currentTime;
        lastTapX = touch.clientX;
        lastTapY = touch.clientY;
      }
    };
    mapContainer.addEventListener &&
      mapContainer.addEventListener("touchstart", handleTouchStart, {
        passive: false,
      });
    return () => {
      mapContainer.removeEventListener &&
        mapContainer.removeEventListener("touchstart", handleTouchStart);
    };
  }, [map, isMapReady.current]);

  return null;
}
