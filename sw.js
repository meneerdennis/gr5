const CACHE_NAME = "gr5-cache-v1";
const STATIC_CACHE = "gr5-static-v1";
const IMAGE_CACHE = "gr5-images-v1";

// Files to cache immediately
const STATIC_FILES = [
  "/",
  "/static/js/bundle.js",
  "/static/css/main.css",
  "/gr5.gpx",
  "/favicon.ico",
  "/hikersmall.png",
  "/hiker.png",
  "/hiker2.png",
  "/hikersmall2.png",
  "/travel_journal_button_transparent.png",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_FILES);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== IMAGE_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle Firebase Storage images
  if (
    url.hostname.includes("firebasestorage.googleapis.com") ||
    url.hostname.includes("storage.googleapis.com")
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            return response;
          }

          return fetch(request).then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // Handle static assets
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.url.includes("/static/")
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(request).then((response) => {
          // Cache static assets
          if (response.status === 200 && request.method === "GET") {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Default - network first for dynamic content
  event.respondWith(
    fetch(request).catch(() => {
      // Fallback to cache for offline
      return caches.match(request);
    })
  );
});
