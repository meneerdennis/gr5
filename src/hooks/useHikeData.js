import { useEffect, useState, useCallback, useRef } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { getRouteData } from "../services/routeService";
import { getStravaHikes } from "../services/stravaService";
import {
  getAllPhotosWithHikes,
  getHikesSince,
  decodePolyline,
  getPhotosFromHikes,
  updateHikeCache,
} from "../services/firebaseService";
import { db } from "../services/firebase";
import { getPhotosSince, updatePhotoCache } from "../services/photoService";

export function useHikeData() {
  const [route, setRoute] = useState(null);
  const [hikes, setHikes] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const photoUploadTimeoutRef = useRef(null);
  const hikesRef = useRef([]);
  const commentCountsRef = useRef(new Map());
  const lastRefreshAtRef = useRef(0);
  const HIKE_LIMIT = Number(process.env.REACT_APP_HIKE_LIMIT || 200);
  const PHOTO_LIMIT = Number(process.env.REACT_APP_PHOTO_LIMIT || 500);
  const HIKE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const PHOTO_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const FOCUS_REFRESH_COOLDOWN_MS = 10 * 60 * 1000;

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
      const mergedHikes = hikesData.map((hike) => {
        const override = commentCountsRef.current.get(hike.id);
        return typeof override === "number"
          ? { ...hike, commentsCount: override }
          : hike;
      });
      const photosData = await getAllPhotosWithHikes(PHOTO_LIMIT, {
        useCache: true,
        cacheTtlMs: PHOTO_CACHE_TTL_MS,
        hikes: mergedHikes,
      });
      setRoute(routeData);
      setHikes(mergedHikes);
      hikesRef.current = mergedHikes;
      setPhotos(photosData);
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
        hikes: hikesRef.current,
      });
      setPhotos(photosData);
    } catch (e) {
      console.error("Error reloading photos:", e);
    } finally {
      setPhotosLoading(false);
    }
  }, [PHOTO_LIMIT]);

  useEffect(() => {
    hikesRef.current = hikes;
  }, [hikes]);

  useEffect(() => {
    loadData();

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
    };
  }, [loadData, reloadPhotos]);

  useEffect(() => {
    const countsRef = collection(db, "hikeCommentCounts");
    const unsubscribe = onSnapshot(
      countsRef,
      (snapshot) => {
        const updates = new Map();
        snapshot.docChanges().forEach((change) => {
          if (change.type === "removed") {
            updates.set(change.doc.id, 0);
            commentCountsRef.current.delete(change.doc.id);
            return;
          }
          const data = change.doc.data() || {};
          const count = Number(data.count || 0);
          commentCountsRef.current.set(change.doc.id, count);
          updates.set(change.doc.id, count);
        });

        if (updates.size === 0) return;
        setHikes((prev) => {
          const next = prev.map((hike) => {
            if (!updates.has(hike.id)) return hike;
            return { ...hike, commentsCount: updates.get(hike.id) };
          });
          hikesRef.current = next;
          return next;
        });
      },
      (error) => {
        console.error("Error subscribing to comment counts:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  const refreshUpdates = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    lastRefreshAtRef.current = Date.now();
    try {
      const currentHikes = hikesRef.current || [];
      const latestHikeDate = currentHikes
        .map((hike) => hike.startDate)
        .filter(Boolean)
        .sort()
        .slice(-1)[0];

      const fetchedHikes = latestHikeDate
        ? await getHikesSince(latestHikeDate, HIKE_LIMIT)
        : [];
      const newHikes = fetchedHikes.map((hike) => {
        const override = commentCountsRef.current.get(hike.id);
        return typeof override === "number"
          ? { ...hike, commentsCount: override }
          : hike;
      });

      let mergedHikes = currentHikes;
      if (newHikes.length > 0) {
        const existingIds = new Set(currentHikes.map((hike) => hike.id));
        const combined = [...currentHikes, ...newHikes].filter((hike) => {
          if (existingIds.has(hike.id)) return false;
          existingIds.add(hike.id);
          return true;
        });
        mergedHikes = combined;
        setHikes(mergedHikes);
        hikesRef.current = mergedHikes;
        updateHikeCache(HIKE_LIMIT, mergedHikes);
      }

      const currentPhotos = photos || [];
      const latestUploadedAt = currentPhotos
        .map((photo) => photo.uploadedAt)
        .filter(Boolean)
        .sort()
        .slice(-1)[0];

      const newStandalonePhotos = latestUploadedAt
        ? await getPhotosSince(latestUploadedAt)
        : [];
      const newHikePhotos = newHikes.length ? getPhotosFromHikes(newHikes) : [];

      if (newStandalonePhotos.length || newHikePhotos.length) {
        const photoMap = new Map();
        currentPhotos.forEach((photo) => photoMap.set(photo.id, photo));
        newHikePhotos.forEach((photo) => photoMap.set(photo.id, photo));
        newStandalonePhotos.forEach((photo) =>
          photoMap.set(photo.id, {
            id: photo.id,
            lat: photo.lat,
            lng: photo.lng,
            url: photo.url,
            thumbnailUrl: photo.thumbnailUrl || null,
            caption: photo.caption || "",
            date: photo.date || photo.uploadedAt,
            uploadedAt: photo.uploadedAt,
            hikeId: photo.hikeId,
            hikeName:
              mergedHikes.find((h) => h.id === photo.hikeId)?.name ||
              "Unknown Hike",
          }),
        );

        const mergedPhotos = Array.from(photoMap.values()).sort((a, b) => {
          const aDate = new Date(a.date || a.uploadedAt || 0);
          const bDate = new Date(b.date || b.uploadedAt || 0);
          return bDate - aDate;
        });

        setPhotos(mergedPhotos);
        updatePhotoCache(PHOTO_LIMIT, mergedPhotos);
      }
    } catch (e) {
      console.error("Error refreshing updates:", e);
    } finally {
      setRefreshing(false);
    }
  }, [HIKE_LIMIT, PHOTO_LIMIT, photos, refreshing]);

  useEffect(() => {
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastRefreshAtRef.current < FOCUS_REFRESH_COOLDOWN_MS) return;
      refreshUpdates();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshUpdates]);

  return {
    route,
    hikes,
    photos,
    loading,
    photosLoading,
    refreshing,
    error,
    refetch: loadData,
    refreshUpdates,
    reloadPhotos,
  };
}
