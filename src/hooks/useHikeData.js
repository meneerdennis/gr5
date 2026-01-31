import { useEffect, useState, useCallback, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getRouteData } from "../services/routeService";
import { getStravaHikes } from "../services/stravaService";
import {
  getAllPhotosWithHikes,
  getHikesSince,
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
  // Reduced initial limits for faster first-time loading
  const INITIAL_HIKE_LIMIT = Number(
    process.env.REACT_APP_INITIAL_HIKE_LIMIT || 10,
  );
  const INITIAL_PHOTO_LIMIT = Number(
    process.env.REACT_APP_INITIAL_PHOTO_LIMIT || 20,
  );
  const HIKE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const PHOTO_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const FOCUS_REFRESH_COOLDOWN_MS = 10 * 60 * 1000;
  const COMMENT_POLL_INTERVAL_MS = 10 * 60 * 1000;

  const loadCommentCounts = useCallback(async () => {
    try {
      const countsRef = collection(db, "hikeCommentCounts");
      const snapshot = await getDocs(countsRef);

      const updates = new Map();
      snapshot.forEach((doc) => {
        const data = doc.data() || {};
        const count = Number(data.count || 0);
        commentCountsRef.current.set(doc.id, count);
        updates.set(doc.id, count);
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
    } catch (error) {
      console.error("Error loading comment counts:", error);
    }
  }, []);

  // Load all data including photos in parallel
  const loadData = useCallback(
    async (useFullLimits = false) => {
      const hikeLimit = useFullLimits ? HIKE_LIMIT : INITIAL_HIKE_LIMIT;
      const photoLimit = useFullLimits ? PHOTO_LIMIT : INITIAL_PHOTO_LIMIT;

      try {
        setLoading(true);
        // Load hikes first, then photos, then route data (route data can load slower)
        let hikesData = await getStravaHikes({
          limit: hikeLimit,
          useCache: true,
          cacheTtlMs: HIKE_CACHE_TTL_MS,
        });
        if (!hikesData.length) {
          const freshHikes = await getStravaHikes({
            limit: hikeLimit,
            useCache: false,
          });
          if (freshHikes.length) {
            hikesData = freshHikes;
            updateHikeCache(hikeLimit, freshHikes);
          }
        }

        const mergedHikes = hikesData.map((hike) => {
          const override = commentCountsRef.current.get(hike.id);
          return typeof override === "number"
            ? { ...hike, commentsCount: override }
            : hike;
        });

        // Set hikes first so app can show
        setHikes(mergedHikes);
        hikesRef.current = mergedHikes;
        setLoading(false); // Allow app to show with just hikes

        // Load photos asynchronously
        try {
          const photosData = await getAllPhotosWithHikes(photoLimit, {
            useCache: true,
            cacheTtlMs: PHOTO_CACHE_TTL_MS,
            hikes: mergedHikes,
          });
          setPhotos(photosData);
        } catch (photoError) {
          console.error("Error loading photos:", photoError);
          setPhotos([]); // Set empty array so photos loading state can end
        }
        try {
          const routeData = await getRouteData({ hikes: mergedHikes });
          setRoute(routeData);
        } catch (routeError) {
          console.error("Error loading route data:", routeError);
          // Set a fallback route so the app can still function
          setRoute({
            polyline: [
              [51.979, 4.133],
              [50.85, 4.35],
              [49.6, 6.1],
              [46.5, 6.6],
              [45.0, 6.0],
              [43.7, 7.26],
            ],
            elevationProfile: [
              { distanceKm: 0, elevationM: 0, lat: 51.979, lon: 4.133 },
              { distanceKm: 200, elevationM: 200, lat: 50.85, lon: 4.35 },
              { distanceKm: 400, elevationM: 500, lat: 49.6, lon: 6.1 },
              { distanceKm: 600, elevationM: 1500, lat: 46.5, lon: 6.6 },
              { distanceKm: 800, elevationM: 1000, lat: 45.0, lon: 6.0 },
              { distanceKm: 1000, elevationM: 0, lat: 43.7, lon: 7.26 },
            ],
            totalDistanceKm: 1000,
            walkedDistanceKm: 0,
          });
        }
      } catch (e) {
        console.error(e);
        setError(e);
        setLoading(false);
      } finally {
        setPhotosLoading(false);
      }
    },
    [
      HIKE_LIMIT,
      HIKE_CACHE_TTL_MS,
      PHOTO_LIMIT,
      PHOTO_CACHE_TTL_MS,
      INITIAL_HIKE_LIMIT,
      INITIAL_PHOTO_LIMIT,
    ],
  );

  // Load full dataset after initial load
  const loadFullData = useCallback(async () => {
    const currentHikes = hikesRef.current;
    const currentPhotos = photos; // Use current state

    if (
      currentHikes.length >= HIKE_LIMIT &&
      currentPhotos.length >= PHOTO_LIMIT
    )
      return; // Already loaded

    try {
      setPhotosLoading(true);
      // Load additional hikes if needed
      let additionalHikes = [];
      if (currentHikes.length < HIKE_LIMIT) {
        additionalHikes = await getStravaHikes({
          limit: HIKE_LIMIT,
          useCache: true,
          cacheTtlMs: HIKE_CACHE_TTL_MS,
        });
        if (additionalHikes.length > currentHikes.length) {
          additionalHikes = additionalHikes.slice(currentHikes.length);
        } else {
          additionalHikes = [];
        }
      }

      // Load additional photos if needed
      let additionalPhotos = [];
      if (currentPhotos.length < PHOTO_LIMIT) {
        const allHikes = [...currentHikes, ...additionalHikes];
        additionalPhotos = await getAllPhotosWithHikes(PHOTO_LIMIT, {
          useCache: true,
          cacheTtlMs: PHOTO_CACHE_TTL_MS,
          hikes: allHikes,
        });
        if (additionalPhotos.length > currentPhotos.length) {
          additionalPhotos = additionalPhotos.slice(currentPhotos.length);
        } else {
          additionalPhotos = [];
        }
      }

      // Update state with additional data
      if (additionalHikes.length > 0) {
        const mergedAdditionalHikes = additionalHikes.map((hike) => {
          const override = commentCountsRef.current.get(hike.id);
          return typeof override === "number"
            ? { ...hike, commentsCount: override }
            : hike;
        });
        setHikes((prev) => [...prev, ...mergedAdditionalHikes]);
        hikesRef.current = [...hikesRef.current, ...mergedAdditionalHikes];
      }

      if (additionalPhotos.length > 0) {
        setPhotos((prev) => [...prev, ...additionalPhotos]);
      }
    } catch (e) {
      console.error("Error loading full data:", e);
    } finally {
      setPhotosLoading(false);
    }
  }, [HIKE_LIMIT, PHOTO_LIMIT, HIKE_CACHE_TTL_MS, PHOTO_CACHE_TTL_MS]);

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
    loadData(false); // Load initial data

    // Load full dataset after initial load completes (with delay to prioritize initial render)
    const fullDataTimer = setTimeout(() => {
      loadFullData();
    }, 2000); // Load full data after 2 seconds

    // Load comment counts after initial data is loaded
    const commentTimer = setTimeout(() => {
      loadCommentCounts();
    }, 1000); // Load comments after 1 second

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
      clearTimeout(fullDataTimer);
      clearTimeout(commentTimer);
      window.removeEventListener("photoUploaded", handlePhotoUpload);
      if (photoUploadTimeoutRef.current) {
        clearTimeout(photoUploadTimeoutRef.current);
      }
    };
  }, [loadData, loadFullData, reloadPhotos]);

  useEffect(() => {
    const pollComments = () => {
      if (document?.visibilityState !== "visible") return;
      loadCommentCounts();
    };

    const intervalId = setInterval(pollComments, COMMENT_POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document?.visibilityState === "visible") {
        pollComments();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [COMMENT_POLL_INTERVAL_MS, loadCommentCounts]);

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
        const existingIds = new Set();
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

      await loadCommentCounts();
    } catch (e) {
      console.error("Error refreshing updates:", e);
    } finally {
      setRefreshing(false);
    }
  }, [HIKE_LIMIT, PHOTO_LIMIT, photos, refreshing, loadCommentCounts]);

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
