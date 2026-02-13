/* eslint-disable no-undef */
importScripts("/firebase-config.js");
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js",
);

if (!self.__FIREBASE_CONFIG__) {
  console.warn("Firebase config not found for messaging service worker.");
} else {
  firebase.initializeApp(self.__FIREBASE_CONFIG__);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title =
      payload?.notification?.title || payload?.data?.title || "New GR5 update";
    const options = {
      body: payload?.notification?.body || payload?.data?.body || "",
      icon: payload?.notification?.icon || payload?.data?.icon || "/hiker.png",
      data: payload?.data || {},
    };

    self.registration.showNotification(title, options);
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow("/");
        }
        return null;
      }),
  );
});
