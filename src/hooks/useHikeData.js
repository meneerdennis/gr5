import { useEffect, useState, useCallback, useRef } from "react";
import { getRouteData } from "../services/routeService";
import { getStravaHikes } from "../services/stravaService";
import {
  getAllPhotosWithHikes,
  subscribeToHikes,
  decodePolyline,
} from "../services/firebaseService";

export function useHikeData() {
  const [route, setRoute] = useState(null);
  const [hikes, setHikes] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [error, setError] = useState(null);
  const photoUploadTimeoutRef = useRef(null);

  // Load all data including photos in parallel
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Load route, hikes, AND photos in parallel for better performance
      const [routeData, hikesData, photosData] = await Promise.all([
        getRouteData(),
        getStravaHikes(),
        getAllPhotosWithHikes(),
      ]);
      setRoute(routeData);
      setHikes(hikesData);
      setPhotos(photosData);
      console.log("Hikes data:", hikesData);
      console.log("Extracted photos (including standalone):", photosData);
    } catch (e) {
      console.error(e);
      setError(e);
    } finally {
      setLoading(false);
      setPhotosLoading(false);
    }
  }, []);

  // Selective photo reload - only reload photos, not all data
  const reloadPhotos = useCallback(async () => {
    try {
      setPhotosLoading(true);
      const photosData = await getAllPhotosWithHikes();
      setPhotos(photosData);
    } catch (e) {
      console.error("Error reloading photos:", e);
    } finally {
      setPhotosLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeToHikes(
      (hikesData) => {
        const mapped = hikesData.map((hike) => ({
          id: hike.id || hike.stravaId,
          stravaId: hike.stravaId,
          distanceKm: hike.distanceKm,
          startDate: hike.startDate,
          type: hike.type,
          name: hike.name,
          description: hike.description,
          commentsCount: hike.commentsCount || 0,
          polyline: hike.polyline ? decodePolyline(hike.polyline) : [],
          latlng: hike.latlng || [],
          altitude: hike.altitude || [],
          time: hike.time || [],
          photos: hike.photos || [],
          note: hike.note || "",
          start: hike.start || "",
          end: hike.end || "",
        }));
        setHikes(mapped);
      },
      (error) => {
        console.error("Error receiving live hikes:", error);
      },
    );

    // Listen for photo upload events with debouncing to prevent multiple rapid reloads
    const handlePhotoUpload = () => {
      // Clear existing timeout
      if (photoUploadTimeoutRef.current) {
        clearTimeout(photoUploadTimeoutRef.current);
      }
      // Debounce: only reload after 1 second of no new upload events
      photoUploadTimeoutRef.current = setTimeout(() => {
        reloadPhotos();
      }, 1000);
    };

    window.addEventListener("photoUploaded", handlePhotoUpload);

    return () => {
      window.removeEventListener("photoUploaded", handlePhotoUpload);
      if (photoUploadTimeoutRef.current) {
        clearTimeout(photoUploadTimeoutRef.current);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [loadData, reloadPhotos]);

  return {
    route,
    hikes,
    photos,
    loading,
    photosLoading,
    error,
    refetch: loadData,
    reloadPhotos,
  };
}
