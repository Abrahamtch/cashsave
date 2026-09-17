/**
 * Cash Save — Service Worker (Production)
 * 
 * Reçoit les Web Push notifications du serveur et les affiche
 * même quand l'application est complètement fermée.
 */

const SW_VERSION = '1.0.0';
const APP_URL = '/';
const HABITS_URL = '/habits';
const CASH_URL = '/cash';

// ─── Push Event: Receive & Display Notification ─────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      title: 'Cash Save',
      body: event.data.text() || 'Tu as un rappel Cash Save !',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: HABITS_URL },
    };
  }

  const title = payload.title || 'Cash Save — Rappel du soir';
  const options = {
    body: payload.body || "N'oublie pas de noter tes habitudes et dépenses du jour !",
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    tag: payload.tag || 'cashsave-reminder',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      url: payload.data?.url || HABITS_URL,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open_habits', title: '📋 Mes Habitudes' },
      { action: 'open_cash', title: '💰 My Cash' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ─── Notification Click: Open the App ───────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetUrl = HABITS_URL;
  
  if (event.action === 'open_cash') {
    targetUrl = CASH_URL;
  } else if (event.action === 'open_habits') {
    targetUrl = HABITS_URL;
  } else if (event.notification.data?.url) {
    targetUrl = event.notification.data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      return clients.openWindow(targetUrl);
    })
  );
});

// ─── Install & Activate: Claim clients immediately ──────────────
self.addEventListener('install', (event) => {
  console.log(`[Cash Save SW v${SW_VERSION}] Installing...`);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log(`[Cash Save SW v${SW_VERSION}] Activated`);
  event.waitUntil(self.clients.claim());
});
