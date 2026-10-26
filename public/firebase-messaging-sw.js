importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// 1. Sofortige Aktivierung & Kontrolle übernehmen (Skip Waiting)
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 2. Standard Firebase Konfiguration
firebase.initializeApp({
  apiKey: "DEIN_VITE_FIREBASE_API_KEY",
  authDomain: "DEIN_VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "DEIN_VITE_FIREBASE_PROJECT_ID",
  storageBucket: "DEIN_VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "DEIN_VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "DEIN_VITE_FIREBASE_APP_ID"
});

const messaging = firebase.messaging();

// 3. Wird aufgerufen, wenn eine Push-Benachrichtigung im Hintergrund eingeht
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Dart Performance Platform';
  const notificationOptions = {
    body: payload.notification?.body || 'Neue Benachrichtigung erhalten.',
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    data: {
      url: payload.data?.link || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 4. Bei Klick auf die Push-Benachrichtigung auf dem Smartphone die App/Link öffnen
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});