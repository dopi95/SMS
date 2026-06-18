const CACHE_NAME = 'bluelight-sms-v8'
const PRECACHE_URLS = ['/offline.html', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  // Skip ALL Next.js internals, API routes, and data fetching paths
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('__nextjs') ||
    url.pathname.includes('_rsc') ||
    url.pathname.includes('.json')
  ) {
    return
  }

  // For page navigations: network first, only fall back to offline.html when truly offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If we got a valid response, return it
          if (response.ok || response.status === 304) {
            return response
          }
          // For server errors (5xx), still return the response (don't show offline)
          return response
        })
        .catch(() =>
          // Only show offline page when there's a genuine network failure
          caches.match('/offline.html')
        )
    )
    return
  }

  // For static assets (images, icons): cache first, network fallback
  if (/\.(png|jpg|jpeg|svg|gif|ico|woff2?|ttf)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        }).catch(() => new Response('', { status: 404 }))
      })
    )
  }
})
