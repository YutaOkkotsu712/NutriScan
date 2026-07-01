const CACHE_NAME = 'nutriscan-v4'
const DATA_CACHE = 'nutriscan-data-v4'
const PRECACHE = ['/', '/index.html']

// Same-origin API paths whose GET responses are safe to cache for offline use:
// previously-scanned products and the reference database. Search, corrections
// and analytics are intentionally excluded (dynamic / write / privacy).
const CACHEABLE_API = ['/api/product/', '/api/ingredients/', '/api/reference/']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== DATA_CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

function isCacheableApi(pathname) {
  return CACHEABLE_API.some((p) => pathname.startsWith(p))
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/node_modules')) return

  // --- Cacheable API: network-first, fall back to cache when offline ---
  if (url.pathname.startsWith('/api/')) {
    if (!isCacheableApi(url.pathname)) return // search / corrections / analytics: pass through
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone()
            caches.open(DATA_CACHE).then((cache) => cache.put(e.request, clone))
          }
          return res
        })
        .catch(() => caches.match(e.request)) // offline → last-known product/reference data
    )
    return
  }

  // --- App shell / static assets: network-first, cache fallback ---
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
