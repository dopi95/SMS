const CACHE_NAME = 'bluelight-sms-v5'
const ESSENTIAL_RESOURCES = [
  '/',
  '/login',
  '/dashboard',
  '/profile',
  '/settings',
  '/manifest.json'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          ESSENTIAL_RESOURCES.map(url => 
            cache.add(url).catch(() => {})
          )
        )
      })
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Always fetch API requests from network (no caching for data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ 
          error: 'Network Error', 
          message: 'Please check your internet connection'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      })
    )
    return
  }

  // For pages and static assets: network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful responses that are not partial (status 200)
        if (response.ok && response.status === 200) {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache).catch(() => {
              // Silently fail if caching fails
            })
          })
        }
        return response
      })
      .catch(() => {
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse
          }
          if (request.destination === 'document') {
            return caches.match('/')
          }
        })
      })
  )
})