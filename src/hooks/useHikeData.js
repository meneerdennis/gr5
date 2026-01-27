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
  const HIKE_LIMIT = Number(process.env.REACT_APP_HIKE_LIMIT || 200);
  const PHOTO_LIMIT = Number(process.env.REACT_APP_PHOTO_LIMIT || 500);
  const HIKE_CACHE_TTL_MS = 5 * 60 * 1000;
  const PHOTO_CACHE_TTL_MS = 2 * 60 * 1000;

  // Load all data including photos in parallel
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Load route + hikes first, then photos using the hikes data to avoid extra reads
      const [routeData, hikesData] = await Promise.all([
        getRouteData(),
        getStravaHikes({
          limit: HIKE_LIMIT,
          useCache: true,
          cacheTtlMs: HIKE_CACHE_TTL_MS,
        }),
      ]);
      const photosData = await getAllPhotosWithHikes(PHOTO_LIMIT, {
        useCache: true,
        cacheTtlMs: PHOTO_CACHE_TTL_MS,
        hikes: hikesData,
      });
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
  }, [HIKE_LIMIT, HIKE_CACHE_TTL_MS, PHOTO_LIMIT, PHOTO_CACHE_TTL_MS]);

  // Selective photo reload - only reload photos, not all data
  const reloadPhotos = useCallback(async () => {
    try {
      setPhotosLoading(true);
      const photosData = await getAllPhotosWithHikes(PHOTO_LIMIT, {
        useCache: false,
        hikes,
      });
      setPhotos(photosData);
    } catch (e) {
      console.error("Error reloading photos:", e);
    } finally {
      setPhotosLoading(false);
    }
  }, [PHOTO_LIMIT, hikes]);

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
      HIKE_LIMIT,
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
  }, [loadData, reloadPhotos, HIKE_LIMIT]);

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
