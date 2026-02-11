import { useEffect, useState, useCallback, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getRouteData } from "../services/routeService";
import { getStravaHikes } from "../services/stravaService";
import {
  getAllPhotosWithHikes,
  getHikesSince,
  getPhotosFromHikes,
  updateHikeCache,
  clearHikeCache,
  setupHikesRealtimeListener,
  setupPhotosRealtimeListener,
  setupHikesChangeListener,
  getHikesFromFirebase,
  getHikeById,
  setLastSeenFromData,
} from "../services/firebaseService";
import { db } from "../services/firebase";
import {
  getPhotosSince,
  updatePhotoCache,
  clearPhotoCache,
} from "../services/photoService";
import { useAuth } from "./useAuth";

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
  const HIKE_CACHE_TTL_MS = 10 * 60 * 1000; // Reduced to 10 minutes (Firestore handles most caching now)
  const PHOTO_CACHE_TTL_MS = 10 * 60 * 1000; // Reduced to 10 minutes (Firestore handles most caching now)
  const COMMENT_POLL_INTERVAL_MS = 10 * 60 * 1000;

  const { user, loading: authLoading } = useAuth();

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

        // Load route data synchronously before showing the app
        let routeData;
        try {
          routeData = await getRouteData({ hikes: mergedHikes });
        } catch (routeError) {
          console.error("Error loading route data:", routeError);
          // Set a fallback route so the app can still function
          routeData = {
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
          };
        }
        setRoute(routeData);

        setLoading(false); // Allow app to show with hikes and route

        // Load initial photos for NoteModal functionality
        try {
          const photosData = await getAllPhotosWithHikes(INITIAL_PHOTO_LIMIT, {
            useCache: true,
            cacheTtlMs: PHOTO_CACHE_TTL_MS,
            hikes: mergedHikes,
          });
          setPhotos(photosData);

          // Initialize last-seen timestamps in the realtime listener module to avoid duplicate triggers
          try {
            setLastSeenFromData({ photos: photosData, hikes: mergedHikes });
          } catch (err) {
            console.warn("Failed to set last-seen timestamps:", err);
          }
        } catch (photoError) {
          console.error("Error loading initial photos:", photoError);
          setPhotos([]); // Set empty array so photos loading state can end
        }
      } catch (e) {
        console.error(e);
        setError(e);
        // Set fallback data so app can still show something
        setHikes([]);
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
      });
      setPhotos(photosData);
    } catch (e) {
      console.error("Error reloading photos:", e);
    } finally {
      setPhotosLoading(false);
    }
  }, [PHOTO_LIMIT]);

  // Selective hike reload - only reload hikes, not photos
  const reloadHikes = useCallback(async () => {
    try {
      setLoading(true);
      const hikesData = await getHikesFromFirebase(HIKE_LIMIT, {
        useCache: false,
      });
      const hikesWithOverrides = hikesData.map((hike) => {
        const override = commentCountsRef.current.get(hike.id);
        return typeof override === "number"
          ? { ...hike, commentsCount: override }
          : hike;
      });
      setHikes(hikesWithOverrides);
      hikesRef.current = hikesWithOverrides;
      updateHikeCache(HIKE_LIMIT, hikesWithOverrides);
    } catch (e) {
      console.error("Error reloading hikes:", e);
    } finally {
      setLoading(false);
    }
  }, [HIKE_LIMIT]);

  // Handle incremental hike updates from real-time listener
  const handleHikeChanges = useCallback((changes) => {
    console.log("Processing incremental hike changes:", changes.length);

    setHikes((prevHikes) => {
      let updatedHikes = [...prevHikes];

      changes.forEach((change) => {
        const { type, hike } = change;

        // Apply comment count override if available
        const hikeWithOverrides = {
          ...hike,
          commentsCount:
            commentCountsRef.current.get(hike.id) ?? hike.commentsCount ?? 0,
        };

        switch (type) {
          case "added":
            // Only add if not already present (avoid duplicates)
            if (!updatedHikes.find((h) => h.id === hike.id)) {
              updatedHikes.unshift(hikeWithOverrides); // Add to beginning (newest first)
            }
            break;

          case "modified":
            // Update existing hike
            updatedHikes = updatedHikes.map((existingHike) =>
              existingHike.id === hike.id
                ? { ...existingHike, ...hikeWithOverrides }
                : existingHike,
            );
            break;

          case "removed":
            // Remove hike
            updatedHikes = updatedHikes.filter(
              (existingHike) => existingHike.id !== hike.id,
            );
            break;

          default:
            console.warn("Unknown hike change type:", type);
        }
      });

      // Sort by date (newest first) after changes
      updatedHikes.sort(
        (a, b) => new Date(b.startDate) - new Date(a.startDate),
      );

      // Update the ref
      hikesRef.current = updatedHikes;

      return updatedHikes;
    });
  }, []);

  // Handle incremental photo updates from real-time listener
  const handlePhotoChanges = useCallback((changes) => {
    console.log("Processing incremental photo changes:", changes.length);

    setPhotos((prevPhotos) => {
      let updatedPhotos = [...prevPhotos];

      changes.forEach((change) => {
        const { type, photo } = change;

        // Convert standalone photo to the same format as hike photos
        const formattedPhoto = {
          id: photo.id,
          lat: photo.lat,
          lng: photo.lng,
          url: photo.url,
          thumbnailUrl: photo.thumbnailUrl || null,
          caption: photo.caption || "",
          date: photo.date || photo.uploadedAt,
          hikeId: photo.hikeId,
          hikeName:
            hikesRef.current.find((h) => h.id === photo.hikeId)?.name ||
            "Unknown Hike",
        };

        switch (type) {
          case "added":
            // Only add if not already present (avoid duplicates)
            if (!updatedPhotos.find((p) => p.id === photo.id)) {
              updatedPhotos.unshift(formattedPhoto); // Add to beginning (newest first)
            }
            break;

          case "modified":
            // Update existing photo
            updatedPhotos = updatedPhotos.map((existingPhoto) =>
              existingPhoto.id === photo.id
                ? { ...existingPhoto, ...formattedPhoto }
                : existingPhoto,
            );
            break;

          case "removed":
            // Remove photo
            updatedPhotos = updatedPhotos.filter(
              (existingPhoto) => existingPhoto.id !== photo.id,
            );
            break;

          default:
            console.warn("Unknown photo change type:", type);
        }
      });

      return updatedPhotos;
    });
  }, []);

  useEffect(() => {
    hikesRef.current = hikes;
  }, [hikes]);

  useEffect(() => {
    // Only set up listeners and load data when user is authenticated
    if (!user || authLoading) {
      return;
    }

    loadData(true); // Load full data directly

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
      // Debounce: only reload after 5 seconds of no new upload events
      photoUploadTimeoutRef.current = setTimeout(() => {
        reloadPhotos();
      }, 5000);
    };

    const handlePhotoDeleted = () => {
      // Clear existing timeout
      if (photoUploadTimeoutRef.current) {
        clearTimeout(photoUploadTimeoutRef.current);
      }
      // Debounce: only reload after 5 seconds of no new delete events
      photoUploadTimeoutRef.current = setTimeout(() => {
        reloadPhotos();
      }, 5000);
    };

    const handleHikeUpdated = () => {
      // Clear existing timeout
      if (photoUploadTimeoutRef.current) {
        clearTimeout(photoUploadTimeoutRef.current);
      }
      // Debounce: only reload after 5 seconds of no new update events
      photoUploadTimeoutRef.current = setTimeout(() => {
        reloadHikes();
      }, 5000);
    };

    window.addEventListener("photoUploaded", handlePhotoUpload);
    window.addEventListener("photoDeleted", handlePhotoDeleted);
    window.addEventListener("hikeUpdated", handleHikeUpdated);

    let unsubscribeHikes = null;
    let unsubscribePhotos = null;
    let unsubscribeHikeChange = null;
    let hiddenDetachTimer = null;

    const attachListeners = () => {
      if (!unsubscribeHikes) {
        unsubscribeHikes = setupHikesRealtimeListener((changes) => {
          handleHikeChanges(changes);
        });
      }
      if (!unsubscribePhotos) {
        unsubscribePhotos = setupPhotosRealtimeListener((changes) => {
          handlePhotoChanges(changes);
        });
      }
      if (!unsubscribeHikeChange) {
        unsubscribeHikeChange = setupHikesChangeListener(async (change) => {
          if (!change || !change.id) return;
          const { id, type } = change;
          // Handle removal
          if (type === "removed") {
            setHikes((prev) => prev.filter((h) => h.id !== id));
            hikesRef.current = hikesRef.current.filter((h) => h.id !== id);
            // Clear cached hikes so future fetches reflect deletion
            try {
              clearHikeCache();
            } catch (err) {
              console.warn("Error clearing hike cache after deletion:", err);
            }
            // Notify other parts of the app (triggers a debounced reload if needed)
            try {
              window.dispatchEvent(
                new CustomEvent("hikeUpdated", { detail: { hikeId: id, type: "removed" } }),
              );
            } catch (err) {}
            return;
          }

          // For added or modified, fetch single hike and upsert
          try {
            const hike = await getHikeById(id);
            if (!hike) return;
            setHikes((prev) => {
              const exists = prev.some((p) => p.id === hike.id);
              if (exists) {
                const next = prev.map((p) => (p.id === hike.id ? hike : p));
                hikesRef.current = next;
                return next;
              } else {
                const next = [hike, ...prev];
                hikesRef.current = next;
                return next;
              }
            });
          } catch (err) {
            console.error("Error handling hike change:", err);
          }
        });
      }
    };

    const detachListeners = () => {
      if (unsubscribeHikes) {
        try {
          unsubscribeHikes();
        } catch (e) {}
        unsubscribeHikes = null;
      }
      if (unsubscribePhotos) {
        try {
          unsubscribePhotos();
        } catch (e) {}
        unsubscribePhotos = null;
      }
      if (unsubscribeHikeChange) {
        try {
          unsubscribeHikeChange();
        } catch (e) {}
        unsubscribeHikeChange = null;
      }
    };

    const handleVisibility = () => {
      if (document?.visibilityState === "visible") {
        // Clear any pending detach timer and attach listeners
        if (hiddenDetachTimer) {
          clearTimeout(hiddenDetachTimer);
          hiddenDetachTimer = null;
        }
        attachListeners();
      } else {
        // If hidden, detach listeners after short delay to avoid churn (1 minute)
        if (hiddenDetachTimer) clearTimeout(hiddenDetachTimer);
        hiddenDetachTimer = setTimeout(() => {
          detachListeners();
          hiddenDetachTimer = null;
        }, 60 * 1000);
      }
    };

    // Attach immediately if visible
    if (document?.visibilityState === "visible") {
      attachListeners();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(commentTimer);
      window.removeEventListener("photoUploaded", handlePhotoUpload);
      window.removeEventListener("photoDeleted", handlePhotoDeleted);
      window.removeEventListener("hikeUpdated", handleHikeUpdated);
      if (photoUploadTimeoutRef.current) {
        clearTimeout(photoUploadTimeoutRef.current);
      }
      // Clean up real-time listeners
      if (hiddenDetachTimer) clearTimeout(hiddenDetachTimer);
      detachListeners();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [
    loadData,
    loadFullData,
    reloadPhotos,
    reloadHikes,
    handleHikeChanges,
    handlePhotoChanges,
    user,
    authLoading,
  ]);

  // Clean up listeners and data when user logs out
  useEffect(() => {
    if (!user && !authLoading) {
      console.log("User logged out, clearing data");
      // Clear data when user logs out
      setHikes([]);
      setPhotos([]);
      setRoute(null);
      hikesRef.current = [];
      commentCountsRef.current.clear();
    }
  }, [user, authLoading]);

  // Visibility cleanup handled in the main listener effect (attach/detach with a short delay)

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
      // Clear caches to ensure fresh data
      clearHikeCache();
      clearPhotoCache();

      // For refresh, do a full refetch to get updated data
      const allHikes = await getStravaHikes({
        limit: HIKE_LIMIT,
        useCache: false, // Bypass cache for refresh
      });
      const newHikes = allHikes.map((hike) => {
        const override = commentCountsRef.current.get(hike.id);
        return typeof override === "number"
          ? { ...hike, commentsCount: override }
          : hike;
      });

      let mergedHikes = newHikes; // Use the full refreshed data
      setHikes(mergedHikes);
      hikesRef.current = mergedHikes;
      updateHikeCache(HIKE_LIMIT, mergedHikes);

      // For refresh, refetch all photos
      const allPhotos = await getAllPhotosWithHikes(PHOTO_LIMIT, {
        useCache: false, // Bypass cache for refresh
        hikes: mergedHikes,
      });

      // For refresh, use the full refreshed photos data
      setPhotos(allPhotos);
      updatePhotoCache(PHOTO_LIMIT, allPhotos);

      // Update last-seen timestamps after a manual refresh so listeners won't treat these as new
      try {
        setLastSeenFromData({ photos: allPhotos, hikes: mergedHikes });
      } catch (err) {
        console.warn("Failed to set last-seen timestamps after refresh:", err);
      }

      // Also fetch a fresh full hikes list from the server to pick up deletions
      try {
        const freshHikes = await getStravaHikes({
          limit: HIKE_LIMIT,
          useCache: false,
        });
        // If the fresh list differs from the merged list (e.g. a hike was deleted), replace local state and update cache
        const freshIds = new Set(freshHikes.map((h) => h.id));
        const mergedIds = new Set(mergedHikes.map((h) => h.id));
        let listsDiffer = false;
        if (freshIds.size !== mergedIds.size) listsDiffer = true;
        if (!listsDiffer) {
          for (const id of freshIds) {
            if (!mergedIds.has(id)) {
              listsDiffer = true;
              break;
            }
          }
        }

        if (listsDiffer) {
          const mergedWithComments = freshHikes.map((hike) => {
            const override = commentCountsRef.current.get(hike.id);
            return typeof override === "number"
              ? { ...hike, commentsCount: override }
              : hike;
          });
          setHikes(mergedWithComments);
          hikesRef.current = mergedWithComments;
          updateHikeCache(HIKE_LIMIT, mergedWithComments);
        }
      } catch (e) {
        console.error("Error fetching fresh hikes during refresh:", e);
      }

      await loadCommentCounts();
    } catch (e) {
      console.error("Error refreshing updates:", e);
    } finally {
      setRefreshing(false);
    }
  }, [HIKE_LIMIT, PHOTO_LIMIT, photos, refreshing, loadCommentCounts]);

  // Load photos within map bounds for lazy loading
  const loadPhotosWithinBounds = useCallback(
    async (bounds, zoomLevel) => {
      if (!bounds || zoomLevel <= 8) return; // Only load when zoomed in enough

      try {
        setPhotosLoading(true);

        // Get all photos (we'll filter by bounds client-side for simplicity)
        const allPhotos = await getAllPhotosWithHikes(PHOTO_LIMIT, {
          useCache: true,
          cacheTtlMs: PHOTO_CACHE_TTL_MS,
          hikes: hikesRef.current,
        });

        // Filter photos within bounds
        const photosInBounds = allPhotos.filter((photo) => {
          const lat = parseFloat(photo.lat);
          const lng = parseFloat(photo.lng);
          return (
            lat >= bounds.south &&
            lat <= bounds.north &&
            lng >= bounds.west &&
            lng <= bounds.east
          );
        });

        // Merge with existing photos (avoid duplicates)
        setPhotos((prevPhotos) => {
          const existingIds = new Set(prevPhotos.map((p) => p.id));
          const newPhotos = photosInBounds.filter(
            (p) => !existingIds.has(p.id),
          );
          console.log(
            `Loaded ${newPhotos.length} additional photos within bounds (total: ${prevPhotos.length + newPhotos.length})`,
          );
          return [...prevPhotos, ...newPhotos];
        });
      } catch (error) {
        console.error("Error loading photos within bounds:", error);
      } finally {
        setPhotosLoading(false);
      }
    },
    [PHOTO_LIMIT, PHOTO_CACHE_TTL_MS],
  );

  // Load photos for a specific hike (used by NoteModal)
  const loadPhotosForHike = useCallback(
    async (hikeId) => {
      if (!hikeId) return;

      try {
        setPhotosLoading(true);

        // Check if we already have photos for this hike
        const existingPhotos = photos.filter((p) => p.hikeId === hikeId);
        if (existingPhotos.length > 0) {
          // Already have photos for this hike
          setPhotosLoading(false);
          return;
        }

        // Load all photos and filter for this hike
        const allPhotos = await getAllPhotosWithHikes(PHOTO_LIMIT, {
          useCache: true,
          cacheTtlMs: PHOTO_CACHE_TTL_MS,
          hikes: hikesRef.current,
        });

        const hikePhotos = allPhotos.filter((photo) => photo.hikeId === hikeId);

        // Add to existing photos
        setPhotos((prevPhotos) => {
          const existingIds = new Set(prevPhotos.map((p) => p.id));
          const newPhotos = hikePhotos.filter((p) => !existingIds.has(p.id));
          console.log(`Loaded ${newPhotos.length} photos for hike ${hikeId}`);
          return [...prevPhotos, ...newPhotos];
        });
      } catch (error) {
        console.error("Error loading photos for hike:", error);
      } finally {
        setPhotosLoading(false);
      }
    },
    [PHOTO_LIMIT, PHOTO_CACHE_TTL_MS, photos],
  );

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
    loadPhotosWithinBounds,
  };
}
