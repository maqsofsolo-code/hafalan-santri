// Service Worker untuk Push Notification - Daarus Salaf

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Saat notifikasi push diterima
self.addEventListener('push', (event) => {
  let data = { title: 'Daarus Salaf', body: 'Ada pembaruan baru', url: '/' }

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() }
    }
  } catch (e) {
    if (event.data) data.body = event.data.text()
  }

  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'daarus-notif',
    data: { url: data.url || '/' },
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Saat notifikasi diklik
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Kalau aplikasi sudah terbuka, fokuskan
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // Kalau belum, buka jendela baru
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})