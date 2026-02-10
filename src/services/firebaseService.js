import { db, auth } from "./firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
  where,
  runTransaction,
  limit,
} from "firebase/firestore";
import { getAllPhotos, clearPhotoCache } from "./photoService";

const HIKE_CACHE_KEY = "gr5_hikes_cache";
const PHOTO_CACHE_KEY = "gr5_all_photos_cache";
const cacheStore = new Map();

function getCacheKey(baseKey, limitCount) {
  return `${baseKey}_${limitCount ?? "all"}`;
}

function readCachedValue(cacheKey, ttlMs) {
  const now = Date.now();
  const memoryEntry = cacheStore.get(cacheKey);
  if (memoryEntry && now - memoryEntry.timestamp < ttlMs) {
    return memoryEntry.value;
  }

  try {
    const cached = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(`${cacheKey}_ts`);
    if (cached && cachedTimestamp) {
      const age = now - Number(cachedTimestamp);
      if (age >= 0 && age < ttlMs) {
        const parsed = JSON.parse(cached);
        cacheStore.set(cacheKey, { timestamp: now, value: parsed });
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Cache read failed:", error);
  }

  return null;
}

function writeCachedValue(cacheKey, value) {
  const now = Date.now();
  cacheStore.set(cacheKey, { timestamp: now, value });
  try {
    localStorage.setItem(cacheKey, JSON.stringify(value));
    localStorage.setItem(`${cacheKey}_ts`, String(now));
  } catch (error) {
    console.warn("Cache write failed:", error);
  }
}

export function updateHikeCache(limitCount, hikes) {
  const cacheKey = getCacheKey(HIKE_CACHE_KEY, limitCount);
  writeCachedValue(cacheKey, hikes);
}

export function clearHikeCache() {
  // Clear all hike cache entries
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(HIKE_CACHE_KEY)) {
      keysToRemove.push(key);
      if (key.endsWith("_ts")) {
        // Remove timestamp too
        continue;
      }
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));

  // Clear memory cache
  cacheStore.clear();
}

export async function getHikesFromFirebase(limitCount = null, options = {}) {
  try {
    const { useCache = true, cacheTtlMs = 30 * 60 * 1000 } = options; // Reduced to 30 minutes
    const cacheKey = getCacheKey(HIKE_CACHE_KEY, limitCount);

    if (useCache) {
      const cached = readCachedValue(cacheKey, cacheTtlMs);
      if (cached) {
        return cached;
      }
    }

    const hikesCollection = collection(db, "hikes");
    let q = query(hikesCollection, orderBy("startDate", "asc"));
    if (limitCount) {
      q = query(
        hikesCollection,
        orderBy("startDate", "asc"),
        limit(limitCount),
      );
    }
    const querySnapshot = await getDocs(q);

    const hikes = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Reconstruct latlng from lat and lng arrays
      const latlng = [];
      if (data.lat && data.lng && data.lat.length === data.lng.length) {
        for (let i = 0; i < data.lat.length; i++) {
          latlng.push([data.lat[i], data.lng[i]]);
        }
      }
      hikes.push({
        id: doc.id,
        stravaId: data.stravaId,
        name: data.name,
        description: data.description,
        distanceKm: data.distanceKm,
        movingTimeSec: data.movingTimeSec,
        elapsedTimeSec: data.elapsedTimeSec,
        startDate: data.startDate,
        type: data.type,
        commentsCount: data.commentsCount || 0,
        polyline: data.polyline,
        photos: data.photos || [],
        latlng,
        altitude: data.altitude || [],
        time: data.time || [],
        note: data.note || "",
        start: data.start || "",
        end: data.end || "",
        notifiedAt: data.notifiedAt || null,
      });
    });

    if (useCache) {
      writeCachedValue(cacheKey, hikes);
    }

    return hikes;
  } catch (error) {
    console.error("Error fetching hikes from Firebase:", error);
    return [];
  }
}

export async function getHikesSince(startDate, limitCount = null) {
  try {
    if (!startDate) return [];
    const hikesCollection = collection(db, "hikes");
    let q = query(
      hikesCollection,
      orderBy("startDate", "asc"),
      where("startDate", ">", startDate),
    );
    if (limitCount) {
      q = query(
        hikesCollection,
        orderBy("startDate", "asc"),
        where("startDate", ">", startDate),
        limit(limitCount),
      );
    }

    const querySnapshot = await getDocs(q);
    const hikes = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const latlng = [];
      if (data.lat && data.lng && data.lat.length === data.lng.length) {
        for (let i = 0; i < data.lat.length; i++) {
          latlng.push([data.lat[i], data.lng[i]]);
        }
      }
      hikes.push({
        id: doc.id,
        stravaId: data.stravaId,
        name: data.name,
        description: data.description,
        distanceKm: data.distanceKm,
        movingTimeSec: data.movingTimeSec,
        elapsedTimeSec: data.elapsedTimeSec,
        startDate: data.startDate,
        type: data.type,
        commentsCount: data.commentsCount || 0,
        polyline: data.polyline,
        photos: data.photos || [],
        latlng,
        altitude: data.altitude || [],
        time: data.time || [],
        note: data.note || "",
        start: data.start || "",
        end: data.end || "",
        notifiedAt: data.notifiedAt || null,
      });
    });

    return hikes;
  } catch (error) {
    console.error("Error fetching new hikes from Firebase:", error);
    return [];
  }
}

export function subscribeToHikes(onUpdate, onError, limitCount = null) {
  try {
    const hikesCollection = collection(db, "hikes");
    let q = query(hikesCollection, orderBy("startDate", "asc"));
    if (limitCount) {
      q = query(
        hikesCollection,
        orderBy("startDate", "asc"),
        limit(limitCount),
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const hikes = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const latlng = [];
          if (data.lat && data.lng && data.lat.length === data.lng.length) {
            for (let i = 0; i < data.lat.length; i++) {
              latlng.push([data.lat[i], data.lng[i]]);
            }
          }
          hikes.push({
            id: doc.id,
            stravaId: data.stravaId,
            name: data.name,
            description: data.description,
            distanceKm: data.distanceKm,
            movingTimeSec: data.movingTimeSec,
            elapsedTimeSec: data.elapsedTimeSec,
            startDate: data.startDate,
            type: data.type,
            commentsCount: data.commentsCount || 0,
            polyline: data.polyline,
            photos: data.photos || [],
            latlng,
            altitude: data.altitude || [],
            time: data.time || [],
            note: data.note || "",
            start: data.start || "",
            end: data.end || "",
            notifiedAt: data.notifiedAt || null,
          });
        });
        const cacheKey = getCacheKey(HIKE_CACHE_KEY, limitCount);
        writeCachedValue(cacheKey, hikes);
        onUpdate(hikes);
      },
      (error) => {
        console.error("Error subscribing to hikes:", error);
        if (onError) onError(error);
      },
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up hike subscription:", error);
    if (onError) onError(error);
    return () => {};
  }
}

export async function addHikeToFirebase(hikeData) {
  try {
    const hikesCollection = collection(db, "hikes");
    const docRef = await addDoc(hikesCollection, hikeData);
    // Clear cache to ensure fresh data on next fetch
    clearHikeCache();
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding hike to Firebase:", error);
    return { success: false, error: error.message };
  }
}

// Calculate total walked distance from hikes
export function calculateTotalWalkedDistance(hikes) {
  return hikes.reduce((total, hike) => {
    return total + (hike.distanceKm || 0);
  }, 0);
}

// Extract all photos from hikes with enhanced functionality
export function getPhotosFromHikes(hikes) {
  const photos = [];

  hikes.forEach((hike) => {
    if (hike.photos && Array.isArray(hike.photos)) {
      hike.photos.forEach((photo) => {
        // Ensure photo has required properties for map markers
        if (photo.lat && photo.lng) {
          photos.push({
            id: photo.id || `${hike.id}-${photo.lat}-${photo.lng}`,
            lat: photo.lat,
            lng: photo.lng,
            url: photo.url || photo.photoUrl || "",
            thumbnailUrl: photo.thumbnailUrl || null,
            caption: photo.caption || photo.description || "",
            date: photo.date || hike.startDate,
            hikeId: hike.id,
            hikeName: hike.name,
          });
        }
      });
    }
  });
  return photos;
}

// Enhanced photo function that combines hike photos and standalone photos
export async function getAllPhotosWithHikes(limit = null, options = {}) {
  try {
    const {
      useCache = true,
      cacheTtlMs = 2 * 60 * 1000,
      hikes: providedHikes = null,
    } = options;
    const cacheKey = getCacheKey(PHOTO_CACHE_KEY, limit);

    if (useCache) {
      const cached = readCachedValue(cacheKey, cacheTtlMs);
      if (cached) {
        return cached;
      }
    }

    // Get photos from hikes
    const hikes = Array.isArray(providedHikes)
      ? providedHikes
      : await getHikesFromFirebase(null, { useCache, cacheTtlMs });
    const hikePhotos = getPhotosFromHikes(hikes);

    // Get photos from the standalone photos collection
    const standalonePhotos = await getAllPhotos({
      limitCount: limit || null,
      useCache,
      cacheTtlMs,
    });

    // Convert standalone photos to the same format as hike photos
    const formattedStandalonePhotos = standalonePhotos.map((photo) => ({
      id: photo.id,
      lat: photo.lat,
      lng: photo.lng,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl || null,
      caption: photo.caption || "",
      date: photo.date || photo.uploadedAt,
      hikeId: photo.hikeId,
      hikeName:
        hikes.find((h) => h.id === photo.hikeId)?.name || "Unknown Hike",
    }));

    // Combine both sources and remove duplicates based on ID
    const photoMap = new Map();

    // Add hike photos first
    hikePhotos.forEach((photo) => {
      photoMap.set(photo.id, photo);
    });

    // Add standalone photos (will overwrite if same ID exists)
    formattedStandalonePhotos.forEach((photo) => {
      photoMap.set(photo.id, photo);
    });

    let allPhotos = Array.from(photoMap.values());

    // Apply limit if specified
    if (limit && allPhotos.length > limit) {
      // Sort by date descending (newest first) and take limit
      allPhotos = allPhotos
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, limit);
    }

    console.log(
      "Total photos after deduplication:",
      allPhotos.length,
      "(hike:",
      hikePhotos.length,
      ", standalone:",
      formattedStandalonePhotos.length,
      limit ? `, limited to ${limit}` : "",
      ")",
    );
    if (useCache) {
      writeCachedValue(cacheKey, allPhotos);
    }

    return allPhotos;
  } catch (error) {
    console.error("Error getting all photos:", error);
    return getPhotosFromHikes([]);
  }
}

// Convert polyline string to array of coordinates (if needed)
export function decodePolyline(polylineStr) {
  if (!polylineStr) return [];

  // This is a simplified polyline decoder
  // In a real implementation, you'd use a proper polyline library
  const points = [];
  let index = 0;
  const len = polylineStr.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = polylineStr.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = polylineStr.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

// Encode array of coordinates to polyline string
export function encodePolyline(points) {
  if (!points || points.length === 0) return "";

  let polyline = "";
  let prevLat = 0;
  let prevLng = 0;

  points.forEach(([lat, lng]) => {
    const latInt = Math.round(lat * 1e5);
    const lngInt = Math.round(lng * 1e5);

    const dLat = latInt - prevLat;
    const dLng = lngInt - prevLng;

    polyline += encodeValue(dLat);
    polyline += encodeValue(dLng);

    prevLat = latInt;
    prevLng = lngInt;
  });

  return polyline;
}

function encodeValue(value) {
  value = value < 0 ? ~(value << 1) : value << 1;
  let encoded = "";
  while (value >= 0x20) {
    encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
    value >>= 5;
  }
  encoded += String.fromCharCode(value + 63);
  return encoded;
}

// Parse GPX file content and extract track data
export function parseGPX(gpxContent) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxContent, "text/xml");

  const trackPoints = xmlDoc.querySelectorAll("trkpt");
  if (trackPoints.length === 0) {
    throw new Error("No track points found in GPX file");
  }

  const lat = [];
  const lng = [];
  const altitude = [];
  const time = [];

  trackPoints.forEach((point) => {
    const latVal = parseFloat(point.getAttribute("lat"));
    const lonVal = parseFloat(point.getAttribute("lon"));
    const ele = point.querySelector("ele");
    const timeEl = point.querySelector("time");

    if (!isNaN(latVal) && !isNaN(lonVal)) {
      lat.push(latVal);
      lng.push(lonVal);
      altitude.push(ele ? parseFloat(ele.textContent) : 0);
      time.push(timeEl ? new Date(timeEl.textContent).toISOString() : null);
    }
  });

  if (lat.length === 0) {
    throw new Error("No valid track points found");
  }

  // Downsample to max 1000 points to avoid Firestore index limits
  const maxPoints = 1000;
  let sampledLat = lat;
  let sampledLng = lng;
  let sampledAltitude = altitude;
  let sampledTime = time;

  if (lat.length > maxPoints) {
    const step = Math.floor(lat.length / maxPoints);
    sampledLat = [];
    sampledLng = [];
    sampledAltitude = [];
    sampledTime = [];
    for (let i = 0; i < lat.length; i += step) {
      sampledLat.push(lat[i]);
      sampledLng.push(lng[i]);
      sampledAltitude.push(altitude[i]);
      sampledTime.push(time[i]);
    }
    // Ensure last point is included
    if (sampledLat[sampledLat.length - 1] !== lat[lat.length - 1]) {
      sampledLat.push(lat[lat.length - 1]);
      sampledLng.push(lng[lng.length - 1]);
      sampledAltitude.push(altitude[altitude.length - 1]);
      sampledTime.push(time[time.length - 1]);
    }
  }

  const startDate = sampledTime[0] || new Date().toISOString();
  const endDate = sampledTime[sampledTime.length - 1] || startDate;

  // Calculate distance
  let distance = 0;
  for (let i = 1; i < sampledLat.length; i++) {
    distance += haversineDistance(
      [sampledLat[i - 1], sampledLng[i - 1]],
      [sampledLat[i], sampledLng[i]],
    );
  }

  // Calculate moving time (simplified: total time if timestamps available)
  let movingTimeSec = 0;
  if (sampledTime[0] && sampledTime[sampledTime.length - 1]) {
    movingTimeSec = (new Date(endDate) - new Date(startDate)) / 1000;
  }

  const latlng = sampledLat.map((l, i) => [l, sampledLng[i]]);
  const polyline = encodePolyline(latlng);

  return {
    lat: sampledLat,
    lng: sampledLng,
    altitude: sampledAltitude,
    time: sampledTime,
    distanceKm: distance,
    movingTimeSec,
    elapsedTimeSec: movingTimeSec,
    startDate,
    polyline,
    type: "Hike",
    name: `GPX Import - ${new Date(startDate).toLocaleDateString()}`,
  };
}

// Haversine distance calculation
function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Parse FIT file content (requires fit-parser library)
export async function parseFIT(fitBuffer) {
  // Note: Requires 'fit-parser' npm package: npm install fit-parser
  try {
    // Convert ArrayBuffer to base64 string
    const bytes = new Uint8Array(fitBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64String = btoa(binary);

    const FitParser = (await import("fit-parser")).default;
    const fitParser = new FitParser({
      mode: "list",
    });
    const data = fitParser.parse(base64String);

    // Extract records (assuming activity data)
    const records = data.records || [];
    if (records.length === 0) {
      throw new Error("No records found in FIT file");
    }

    const lat = [];
    const lng = [];
    const altitude = [];
    const time = [];

    records.forEach((record) => {
      if (record.position_lat != null && record.position_long != null) {
        const latVal = record.position_lat * (180 / Math.pow(2, 31)); // Convert from semicircles
        const lonVal = record.position_long * (180 / Math.pow(2, 31));
        lat.push(latVal);
        lng.push(lonVal);
        altitude.push(record.altitude || 0);
        time.push(
          record.timestamp
            ? new Date(record.timestamp * 1000).toISOString()
            : null,
        );
      }
    });

    if (lat.length === 0) {
      throw new Error("No valid track points found in FIT file");
    }

    // Downsample to max 1000 points to avoid Firestore index limits
    const maxPoints = 1000;
    let sampledLat = lat;
    let sampledLng = lng;
    let sampledAltitude = altitude;
    let sampledTime = time;

    if (lat.length > maxPoints) {
      const step = Math.floor(lat.length / maxPoints);
      sampledLat = [];
      sampledLng = [];
      sampledAltitude = [];
      sampledTime = [];
      for (let i = 0; i < lat.length; i += step) {
        sampledLat.push(lat[i]);
        sampledLng.push(lng[i]);
        sampledAltitude.push(altitude[i]);
        sampledTime.push(time[i]);
      }
      // Ensure last point is included
      if (sampledLat[sampledLat.length - 1] !== lat[lat.length - 1]) {
        sampledLat.push(lat[lat.length - 1]);
        sampledLng.push(lng[lng.length - 1]);
        sampledAltitude.push(altitude[altitude.length - 1]);
        sampledTime.push(time[time.length - 1]);
      }
    }

    const startDate = sampledTime[0] || new Date().toISOString();
    const endDate = sampledTime[sampledTime.length - 1] || startDate;

    // Calculate distance
    let distance = 0;
    for (let i = 1; i < sampledLat.length; i++) {
      distance += haversineDistance(
        [sampledLat[i - 1], sampledLng[i - 1]],
        [sampledLat[i], sampledLng[i]],
      );
    }

    let movingTimeSec = 0;
    if (sampledTime[0] && sampledTime[sampledTime.length - 1]) {
      movingTimeSec = (new Date(endDate) - new Date(startDate)) / 1000;
    }

    const latlng = sampledLat.map((l, i) => [l, sampledLng[i]]);
    const polyline = encodePolyline(latlng);

    return {
      lat: sampledLat,
      lng: sampledLng,
      altitude: sampledAltitude,
      time: sampledTime,
      distanceKm: distance,
      movingTimeSec,
      elapsedTimeSec: movingTimeSec,
      startDate,
      polyline,
      type: "Hike",
      name: `FIT Import - ${new Date(startDate).toLocaleDateString()}`,
    };
  } catch (error) {
    console.error("FIT parsing error:", error);
    if (
      error.message.includes("fit-parser") ||
      error.message.includes("stringToParse")
    ) {
      throw new Error(
        "FIT file parsing is not supported in the browser. Please use GPX files instead, or install a browser-compatible FIT parser library.",
      );
    }
    throw error;
  }
}

// Update note for a specific hike
export async function updateHikeNote(hikeId, note) {
  try {
    const { doc, updateDoc } = await import("firebase/firestore");
    const hikeRef = doc(db, "hikes", hikeId);
    await updateDoc(hikeRef, { note: note });
    // Clear cache to ensure fresh data on next fetch
    clearHikeCache();
    return { success: true };
  } catch (error) {
    console.error("Error updating hike note:", error);
    return { success: false, error: error.message };
  }
}

// Update hike fields
export async function updateHike(hikeId, updates) {
  try {
    const { doc, updateDoc } = await import("firebase/firestore");
    const hikeRef = doc(db, "hikes", hikeId);
    await updateDoc(hikeRef, updates);
    // Clear cache to ensure fresh data on next fetch
    clearHikeCache();
    return { success: true };
  } catch (error) {
    console.error("Error updating hike:", error);
    return { success: false, error: error.message };
  }
}

// Mark a hike as notified for users
export async function markHikeAsNotified(hikeId) {
  try {
    const { doc, updateDoc, serverTimestamp } =
      await import("firebase/firestore");
    const hikeRef = doc(db, "hikes", hikeId);
    await updateDoc(hikeRef, { notifiedAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    console.error("Error marking hike as notified:", error);
    return { success: false, error: error.message };
  }
}

// Social features for activities

export async function toggleLike(activityId, uid) {
  const likeRef = doc(db, "hikes", activityId, "likes", uid);
  const activityRef = doc(db, "hikes", activityId);
  try {
    return await runTransaction(db, async (transaction) => {
      const likeDoc = await transaction.get(likeRef);
      const activityDoc = await transaction.get(activityRef);
      if (likeDoc.exists()) {
        // Unlike
        transaction.delete(likeRef);
        const currentCount = activityDoc.exists()
          ? activityDoc.data().likesCount || 0
          : 0;
        transaction.set(
          activityRef,
          { likesCount: Math.max(0, currentCount - 1) },
          { merge: true },
        );
        return false;
      } else {
        // Like
        transaction.set(likeRef, { createdAt: serverTimestamp() });
        const currentCount = activityDoc.exists()
          ? activityDoc.data().likesCount || 0
          : 0;
        transaction.set(
          activityRef,
          { likesCount: currentCount + 1 },
          { merge: true },
        );
        return true;
      }
    });
  } catch (error) {
    console.error("Error toggling like:", error);
    throw error;
  }
}

export async function addComment(
  activityId,
  uid,
  text,
  nickname = "Anonymous hiker",
) {
  const commentsRef = collection(db, "hikes", activityId, "comments");
  try {
    const docRef = await addDoc(commentsRef, {
      text,
      nickname,
      uid,
      createdAt: serverTimestamp(),
      approved: true,
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
}

export async function deleteComment(activityId, commentId, uid) {
  const commentRef = doc(db, "hikes", activityId, "comments", commentId);
  try {
    const commentDoc = await getDoc(commentRef);
    if (commentDoc.exists() && commentDoc.data().uid === uid) {
      await deleteDoc(commentRef);
      return true;
    } else {
      throw new Error("Comment not found or not owned by user");
    }
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
}

// User preferences and viewed activities functions

export async function getViewedActivitiesFromFirebase(uid) {
  try {
    if (!auth.currentUser || auth.currentUser.uid !== uid) {
      return [];
    }
    await auth.currentUser.getIdToken();
    const userPrefsRef = doc(db, "userPreferences", uid);
    const userPrefsDoc = await getDoc(userPrefsRef);

    if (userPrefsDoc.exists()) {
      const data = userPrefsDoc.data();
      return data.viewedActivities || [];
    }

    return [];
  } catch (error) {
    if (error?.code !== "permission-denied") {
      console.error("Error fetching viewed activities from Firebase:", error);
    }
    return [];
  }
}

export async function saveViewedActivitiesToFirebase(uid, viewedActivities) {
  try {
    if (!auth.currentUser || auth.currentUser.uid !== uid) {
      return { success: false, error: "Not authenticated" };
    }
    await auth.currentUser.getIdToken();
    const userPrefsRef = doc(db, "userPreferences", uid);
    await setDoc(
      userPrefsRef,
      {
        viewedActivities: viewedActivities,
        lastUpdated: serverTimestamp(),
      },
      { merge: true },
    );
    return { success: true };
  } catch (error) {
    if (error?.code !== "permission-denied") {
      console.error("Error saving viewed activities to Firebase:", error);
    }
    return { success: false, error: error.message };
  }
}

export async function markActivityAsViewedInFirebase(uid, activityId) {
  try {
    const viewedActivities = await getViewedActivitiesFromFirebase(uid);
    if (!viewedActivities.includes(activityId)) {
      viewedActivities.push(activityId);
      await saveViewedActivitiesToFirebase(uid, viewedActivities);
    }
    return { success: true };
  } catch (error) {
    console.error("Error marking activity as viewed:", error);
    return { success: false, error: error.message };
  }
}

export async function markMultipleActivitiesAsViewedInFirebase(
  uid,
  activityIds,
) {
  try {
    const viewedActivities = await getViewedActivitiesFromFirebase(uid);
    const newViewedActivities = [...viewedActivities];

    activityIds.forEach((id) => {
      if (!newViewedActivities.includes(id)) {
        newViewedActivities.push(id);
      }
    });

    await saveViewedActivitiesToFirebase(uid, newViewedActivities);
    return { success: true };
  } catch (error) {
    console.error("Error marking multiple activities as viewed:", error);
    return { success: false, error: error.message };
  }
}

// Real-time listeners for hikes and photos
let hikesListener = null;
let photosListener = null;
let hikesDebounceTimeout = null;
let photosDebounceTimeout = null;
const DEBOUNCE_DELAY_MS = 3000; // 3 seconds debounce

export function setupHikesRealtimeListener(onHikesChange) {
  if (hikesListener) {
    hikesListener(); // Unsubscribe previous listener
  }

  const hikesCollection = collection(db, "hikes");
  const q = query(hikesCollection, orderBy("startDate", "desc"), limit(1000));

  hikesListener = onSnapshot(
    q,
    (querySnapshot) => {
      // Only process changes if page is visible to the user
      if (document?.visibilityState !== "visible") {
        console.log("Hikes changed but page not visible, skipping refresh");
        return;
      }

      // Analyze changes for incremental updates
      const changes = [];
      querySnapshot.docChanges().forEach((change) => {
        const hikeData = {
          id: change.doc.id,
          ...change.doc.data(),
        };

        changes.push({
          type: change.type, // 'added', 'modified', 'removed'
          hike: hikeData,
          oldIndex: change.oldIndex,
          newIndex: change.newIndex,
        });
      });

      if (changes.length === 0) return; // No actual changes

      console.log(
        `Hikes collection changed: ${changes.length} changes detected`,
        changes,
      );

      // Clear any existing timeout
      if (hikesDebounceTimeout) {
        clearTimeout(hikesDebounceTimeout);
      }

      // Debounce the incremental update
      hikesDebounceTimeout = setTimeout(() => {
        console.log("Executing debounced hikes incremental update");
        if (onHikesChange) onHikesChange(changes);
        hikesDebounceTimeout = null;
      }, DEBOUNCE_DELAY_MS);
    },
    (error) => {
      console.error("Hikes realtime listener error:", error);
    },
  );

  return () => {
    if (hikesListener) {
      hikesListener();
      hikesListener = null;
    }
    // Clear any pending debounce timeout
    if (hikesDebounceTimeout) {
      clearTimeout(hikesDebounceTimeout);
      hikesDebounceTimeout = null;
    }
  };
}

export function setupPhotosRealtimeListener(onPhotosChange) {
  if (photosListener) {
    photosListener(); // Unsubscribe previous listener
  }

  const photosCollection = collection(db, "photos");
  const q = query(photosCollection, orderBy("uploadedAt", "desc"), limit(1000));

  photosListener = onSnapshot(
    q,
    (querySnapshot) => {
      // Only process changes if page is visible to the user
      if (document?.visibilityState !== "visible") {
        console.log("Photos changed but page not visible, skipping refresh");
        return;
      }

      // Analyze changes for incremental updates
      const changes = [];
      querySnapshot.docChanges().forEach((change) => {
        const photoData = {
          id: change.doc.id,
          ...change.doc.data(),
        };

        changes.push({
          type: change.type, // 'added', 'modified', 'removed'
          photo: photoData,
          oldIndex: change.oldIndex,
          newIndex: change.newIndex,
        });
      });

      if (changes.length === 0) return; // No actual changes

      console.log(
        `Photos collection changed: ${changes.length} changes detected`,
        changes,
      );

      // Clear any existing timeout
      if (photosDebounceTimeout) {
        clearTimeout(photosDebounceTimeout);
      }

      // Debounce the incremental update
      photosDebounceTimeout = setTimeout(() => {
        console.log("Executing debounced photos incremental update");
        if (onPhotosChange) onPhotosChange(changes);
        photosDebounceTimeout = null;
      }, DEBOUNCE_DELAY_MS);
    },
    (error) => {
      console.error("Photos realtime listener error:", error);
    },
  );

  return () => {
    if (photosListener) {
      photosListener();
      photosListener = null;
    }
    // Clear any pending debounce timeout
    if (photosDebounceTimeout) {
      clearTimeout(photosDebounceTimeout);
      photosDebounceTimeout = null;
    }
  };
}
