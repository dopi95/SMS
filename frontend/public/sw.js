const CACHE_NAME = 'bluelight-sms-v1'
const urlsToCache = [
  '/',
  '/dashboard',
  '/profile',
  '/settings',
  '/login'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => console.log(`Failed to cache ${url}:`, err))
          )
        )
      })
      .catch(err => console.log('Cache installation failed:', err))
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response
        }
        return fetch(event.request).catch(() => {
          return new Response('Offline', { status: 503 })
        })
      })
      .catch(() => {
        return fetch(event.request).catch(() => {
          return new Response('Offline', { status: 503 })
        })
      })
  )
})