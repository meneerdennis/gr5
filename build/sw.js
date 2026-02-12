const CACHE_NAME = "gr5-cache-v3";
const STATIC_CACHE = "gr5-static-v3";
const IMAGE_CACHE = "gr5-images-v3";

// Cache durations (in milliseconds)
const STATIC_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
const IMAGE_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const GPX_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Maximum entries to keep in each cache
const MAX_IMAGE_ENTRIES = 300;
const MAX_STATIC_ENTRIES = 300;

// Helper function to check if cache entry is expired
function isCacheExpired(timestamp, duration) {
  return Date.now() - timestamp > duration;
}

// Put a response in cache with a timestamp header
async function putResponseWithTimestamp(cache, request, response) {
  try {
    const clone = response.clone();
    const blob = await clone.blob();
    const headers = new Headers(clone.headers);
    headers.set("sw-cache-timestamp", Date.now().toString());
    const responseWithTimestamp = new Response(blob, {
      status: clone.status,
      statusText: clone.statusText,
      headers,
    });
    await cache.put(request, responseWithTimestamp);
  } catch (err) {
    // If caching fails, ignore to avoid breaking network response
    console.warn("Failed to cache response:", err);
  }
}

// Trim cache to a maximum number of entries (simple FIFO eviction)
async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    if (requests.length <= maxEntries) return;
    const deleteCount = requests.length - maxEntries;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(requests[i]);
    }
  } catch (err) {
    console.warn("Error trimming cache", cacheName, err);
  }
}

// Helper function to get cache duration for URL
function getCacheDuration(url) {
  if (url.includes(".gpx")) return GPX_CACHE_DURATION;
  if (url.includes("/static/") || url.includes(".js") || url.includes(".css"))
    return STATIC_CACHE_DURATION;
  if (url.includes("firebasestorage") || url.includes("storage.googleapis.com"))
    return IMAGE_CACHE_DURATION;
  return STATIC_CACHE_DURATION; // Default
}

// Files to cache immediately
const STATIC_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/appicon.png",
  "/hiker.png",
  "/gr5-polyline-simplified.txt",
  "/gr5-simplified.geojson",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_FILES);
    }),
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE &&
            cacheName !== IMAGE_CACHE &&
            cacheName !== CACHE_NAME
          ) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  // Trim caches on activate to ensure we don't keep too many entries
  event.waitUntil(trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES));
  event.waitUntil(trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES));
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for Firebase messaging service worker
  if (request.url.includes("firebase-messaging-sw.js")) {
    return;
  }

  // Handle Firebase Storage images with stale-while-revalidate
  if (
    url.hostname.includes("firebasestorage.googleapis.com") ||
    url.hostname.includes("storage.googleapis.com")
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGE_CACHE);
        const cachedResponse = await cache.match(request);

        // If we have a valid cached response, return it immediately and revalidate in background
        if (cachedResponse) {
          const cacheTimestamp = cachedResponse.headers.get("sw-cache-timestamp");
          const isValid =
            cacheTimestamp && !isCacheExpired(parseInt(cacheTimestamp), IMAGE_CACHE_DURATION);

          // Background revalidation: always attempt to update cache, but don't block response
          event.waitUntil(
            (async () => {
              try {
                const networkResponse = await fetch(request);
                if (networkResponse && networkResponse.status === 200) {
                  await putResponseWithTimestamp(cache, request, networkResponse);
                  // Trim image cache size
                  await trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES);
                }
              } catch (err) {
                /* Ignore network errors during background update */
              }
            })(),
          );

          if (isValid) return cachedResponse;

          // Stale cached response (expired) — still return it while revalidating
          return cachedResponse;
        }

        // No cached response: try network, then cache result; fallback to cache on failure
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            await putResponseWithTimestamp(cache, request, networkResponse);
            await trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES);
          }
          return networkResponse;
        } catch (err) {
          // Network failed, try cached fallback
          const fallback = await cache.match(request);
          return fallback || new Response(null, { status: 504, statusText: "Gateway Timeout" });
        }
      })(),
    );
    return;
  }

  // Handle static assets
  // Handle static assets and GPX with stale-while-revalidate
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.url.includes("/static/") ||
    request.url.includes(".gpx")
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match(request);
        const duration = getCacheDuration(request.url);

        if (cachedResponse) {
          const cacheTimestamp = cachedResponse.headers.get("sw-cache-timestamp");
          const isValid = cacheTimestamp && !isCacheExpired(parseInt(cacheTimestamp), duration);

          // Trigger background revalidation
          event.waitUntil(
            (async () => {
              try {
                const networkResponse = await fetch(request);
                if (networkResponse && networkResponse.status === 200) {
                  const clone = networkResponse.clone();
                  const blob = await clone.blob();
                  const headers = new Headers(clone.headers);
                  headers.set("sw-cache-timestamp", Date.now().toString());
                  const responseWithTimestamp = new Response(blob, {
                    status: clone.status,
                    statusText: clone.statusText,
                    headers,
                  });
                  await cache.put(request, responseWithTimestamp);
                }
              } catch (err) {
                /* ignore */
              }
            })(),
          );

          if (isValid) return cachedResponse;
          // Return stale while revalidating
          return cachedResponse;
        }

        // No cached response: try network and cache result; fallback to cache on failure
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200 && request.method === "GET") {
            await putResponseWithTimestamp(cache, request, networkResponse);
            await trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES);
          }
          return networkResponse;
        } catch (err) {
          const fallback = await cache.match(request);
          return fallback || new Response(null, { status: 504, statusText: "Gateway Timeout" });
        }
      })(),
    );
    return;
  }

  // Default - network first for dynamic content
  event.respondWith(
    fetch(request).catch(() => {
      // Fallback to cache for offline
      return caches.match(request);
    }),
  );
});
