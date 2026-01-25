try {
  importScripts(
    "https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js",
  );
  importScripts(
    "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js",
  );

  // Initialize Firebase in the service worker (only if not already initialized)
  if (self.firebase && !firebase.apps.length) {
    firebase.initializeApp({
      apiKey: "AIzaSyBpLt_m7gVJqHqQLBh-9qjWI0YFNVH5K3I",
      authDomain: "gr-5-4df65.firebaseapp.com",
      projectId: "gr-5-4df65",
      storageBucket: "gr-5-4df65.appspot.com",
      messagingSenderId: "604938319065",
      appId: "1:604938319065:web:e9e8c0c5c4e6e4c7e4c7c7",
    });
  }

  if (self.firebase) {
    const messaging = firebase.messaging();

    // Handle background notifications
    messaging.onBackgroundMessage((payload) => {
      console.log("Background notification received:", payload);

      const notificationTitle =
        payload.notification?.title || "GR5 Notification";
      const notificationOptions = {
        body: payload.notification?.body || "New update available",
        icon: "/hiker.png",
        badge: "/hikersmall.png",
        tag: payload.data?.hikeId || "gr5-notification",
        data: payload.data || {},
      };

      return self.registration.showNotification(
        notificationTitle,
        notificationOptions,
      );
    });
  }
} catch (e) {
  // If Firebase scripts fail to load (some browsers/platforms), continue without push
  console.warn("SW: Firebase messaging not available:", e);
}

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event.notification);

  event.notification.close();

  const data = event.notification.data;
  const urlToOpen = data?.link || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window with the target URL open
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});

// Bump cache versions to force fresh assets after deploy
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
  "/hikersmall.png",
  "/hiker.png",
  "/hiker2.png",
  "/hikersmall2.png",
  "/hikersmall3.png",
  "/travel_journal_button_transparent.png",
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

  // Handle navigation requests: app-shell fallback to index.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((resp) => resp)
        .catch(() => caches.match("/index.html")),
    );
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
          // Cache successful responses with timestamp
          if (response.status === 200) {
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
