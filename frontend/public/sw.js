const CACHE_NAME = 'bluelight-sms-v3'
const STATIC_CACHE = 'static-v3'
const DYNAMIC_CACHE = 'dynamic-v3'
const IMAGE_CACHE = 'images-v3'

// Essential resources that must be cached for offline functionality
const ESSENTIAL_RESOURCES = [
  '/',
  '/dashboard',
  '/profile',
  '/settings',
  '/login',
  '/students',
  '/employees',
  '/payments',
  '/inactive-students',
  '/inactive-employees',
  '/notifications',
  '/admins',
  '/activity-logs',
  '/manifest.json',
  '/log.png'
]

// Network-first resources (try network, fallback to cache)
const NETWORK_FIRST = [
  '/api/'
]

// Cache-first resources (try cache, fallback to network)
const CACHE_FIRST = [
  '.js',
  '.css',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache essential resources
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(ESSENTIAL_RESOURCES.map(url => {
          return new Request(url, { cache: 'reload' })
        }))
      }),
      // Pre-cache Next.js static files
      caches.open(STATIC_CACHE).then((cache) => {
        const staticResources = [
          '/_next/static/css/app/layout.css',
          '/_next/static/chunks/webpack.js',
          '/_next/static/chunks/main-app.js',
          '/_next/static/chunks/pages/_app.js'
        ]
        return Promise.allSettled(
          staticResources.map(url => cache.add(url).catch(() => {}))
        )
      })
    ]).then(() => {
      return self.skipWaiting()
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![
              CACHE_NAME,
              STATIC_CACHE,
              DYNAMIC_CACHE,
              IMAGE_CACHE
            ].includes(cacheName)) {
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Return mock offline data for essential API calls
            if (url.pathname.includes('/auth/me')) {
              return new Response(JSON.stringify({
                user: {
                  name: 'Offline User',
                  email: 'offline@example.com',
                  role: 'superadmin',
                  profilePhoto: null
                }
              }), {
                headers: { 'Content-Type': 'application/json' }
              })
            }
            return new Response(JSON.stringify({ 
              error: 'Offline', 
              message: 'No internet connection',
              data: []
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            })
          })
        })
    )
    return
  }

  // Handle images with cache-first strategy
  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse
          }
          return fetch(request).then(response => {
            if (response.ok) {
              cache.put(request, response.clone())
            }
            return response
          }).catch(() => {
            // Return placeholder image for offline
            return new Response(
              '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f3f4f6"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="#9ca3af">Offline</text></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            )
          })
        })
      })
    )
    return
  }

  // Handle static assets with cache-first strategy
  if (CACHE_FIRST.some(ext => url.pathname.includes(ext))) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then(response => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(request, response.clone())
            })
          }
          return response
        })
      })
    )
    return
  }

  // Handle navigation requests (pages)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, response.clone())
            })
          }
          return response
        })
        .catch(() => {
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Return cached homepage as fallback
            return caches.match('/').then(homeResponse => {
              if (homeResponse) {
                return homeResponse
              }
              // Ultimate fallback offline page
              return new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Bluelight SMS - Offline</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #f9fafb; }
                    .container { max-width: 400px; margin: 0 auto; }
                    h1 { color: #1f2937; margin-bottom: 20px; }
                    p { color: #6b7280; margin-bottom: 30px; }
                    button { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; }
                    button:hover { background: #1d4ed8; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>You're Offline</h1>
                    <p>Bluelight SMS is not available right now. Please check your internet connection.</p>
                    <button onclick="window.location.reload()">Try Again</button>
                  </div>
                </body>
                </html>
              `, {
                headers: { 'Content-Type': 'text/html' }
              })
            })
          })
        })
    )
    return
  }

  // Default: try network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, response.clone())
          })
        }
        return response
      })
      .catch(() => {
        return caches.match(request)
      })
  )
})