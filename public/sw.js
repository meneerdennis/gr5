const CACHE_NAME = "gr5-cache-v3";
const STATIC_CACHE = "gr5-static-v3";
const IMAGE_CACHE = "gr5-images-v3";

// Cache durations (in milliseconds)
const STATIC_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
const IMAGE_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const GPX_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to check if cache entry is expired
function isCacheExpired(timestamp, duration) {
  return Date.now() - timestamp > duration;
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
  "/gr5.gpx",
  "/favicon.ico",
  "/appicon.png",
  "/hiker.png",
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

  // Handle Firebase Storage images
  if (
    url.hostname.includes("firebasestorage.googleapis.com") ||
    url.hostname.includes("storage.googleapis.com")
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          // Check if cache is still valid
          const cacheTimestamp =
            cachedResponse.headers.get("sw-cache-timestamp");
          if (
            cacheTimestamp &&
            !isCacheExpired(parseInt(cacheTimestamp), IMAGE_CACHE_DURATION)
          ) {
            return cachedResponse;
          }
          // Cache expired, remove it
          await cache.delete(request);
        }

        return fetch(request).then((response) => {
          // Cache successful GET responses with timestamp
          if (request.method === "GET" && response.status === 200) {
            const responseClone = response.clone();
            const responseWithTimestamp = new Response(responseClone.body, {
              status: responseClone.status,
              statusText: responseClone.statusText,
              headers: {
                ...Object.fromEntries(responseClone.headers.entries()),
                "sw-cache-timestamp": Date.now().toString(),
              },
            });
            cache.put(request, responseWithTimestamp);
          }
          return response;
        });
      }),
    );
    return;
  }

  // Handle static assets
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.url.includes("/static/") ||
    request.url.includes(".gpx")
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          // Check if cache is still valid
          const cacheTimestamp =
            cachedResponse.headers.get("sw-cache-timestamp");
          const duration = getCacheDuration(request.url);
          if (
            cacheTimestamp &&
            !isCacheExpired(parseInt(cacheTimestamp), duration)
          ) {
            return cachedResponse;
          }
          // Cache expired, remove it
          await cache.delete(request);
        }

        return fetch(request).then((response) => {
          // Cache successful responses with timestamp
          if (response.status === 200 && request.method === "GET") {
            const responseClone = response.clone();
            const responseWithTimestamp = new Response(responseClone.body, {
              status: responseClone.status,
              statusText: responseClone.statusText,
              headers: {
                ...Object.fromEntries(responseClone.headers.entries()),
                "sw-cache-timestamp": Date.now().toString(),
              },
            });
            cache.put(request, responseWithTimestamp);
          }
          return response;
        });
      }),
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
