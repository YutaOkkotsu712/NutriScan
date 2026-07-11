const CACHE_NAME = 'nutriscan-v7'
const DATA_CACHE = 'nutriscan-data-v7'
const PRECACHE = ['/', '/index.html']

// Same-origin API paths whose GET responses are safe to cache for offline use:
// the PUBLIC reference database only. Authenticated/metered responses
// (/api/scan, entitlement, subscriptions) are deliberately NOT cached: the
// server marks them no-store, and caching them would expose one user's scan
// history to another profile user and keep metered data readable after
// sign-out. Search, corrections and analytics are excluded too.
const CACHEABLE_API = ['/api/ingredients/', '/api/reference/']

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

function isJsonResponse(res) {
  return (res.headers.get('content-type') || '').toLowerCase().includes('application/json')
}

function isStaticAsset(pathname) {
  return pathname.startsWith('/assets/')
    || /\.(?:js|mjs|css|png|jpe?g|webp|svg|ico|json|webmanifest|wasm|woff2?)$/i.test(pathname)
}

function isUsableStaticResponse(url, res) {
  if (!res || res.status !== 200 || res.type !== 'basic') return false
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  if (url.pathname.endsWith('.js')) {
    return contentType.includes('javascript') || contentType.includes('ecmascript')
  }
  if (url.pathname.endsWith('.css')) return contentType.includes('text/css')
  // A missing hashed asset used to be rewritten to index.html and cached under
  // the asset URL, which makes future module loads fail with a text/html MIME.
  return !contentType.includes('text/html')
}

async function staticAssetError(request, url, status = 404) {
  const cached = await caches.match(request)
  if (cached && isUsableStaticResponse(url, cached)) return cached
  return new Response('Asset not found', {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

async function cachedJsonOrError(request, body, status = 503) {
  const cached = await caches.match(request)
  if (cached && isJsonResponse(cached)) return cached
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
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
        .then(async (res) => {
          if (!isJsonResponse(res)) {
            return cachedJsonOrError(e.request, { status: 0, error: 'non-json-api-response' }, 502)
          }
          if (res.status === 200) {
            const clone = res.clone()
            caches.open(DATA_CACHE).then((cache) => cache.put(e.request, clone))
          }
          return res
        })
        // Offline → last-known product/reference data. On a cache miss we must
        // still return a Response: resolving undefined makes the page's fetch
        // reject ("Failed to fetch"), which showed users a bogus network error.
        .catch(async () => {
          return cachedJsonOrError(e.request, { status: 0, error: 'offline' })
        })
    )
    return
  }

  // --- Static assets: never cache the app shell as a JS/CSS/image asset ---
  if (isStaticAsset(url.pathname)) {
    e.respondWith(
      fetch(e.request)
        .then(async (res) => {
          if (!isUsableStaticResponse(url, res)) {
            return staticAssetError(e.request, url, res?.status && res.status !== 200 ? res.status : 404)
          }
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone))
          return res
        })
        .catch(() => staticAssetError(e.request, url))
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
      .catch(async () => {
        const cached = await caches.match(e.request)
        if (cached) return cached
        // Offline navigation to an uncached route → serve the app shell.
        if (e.request.mode === 'navigate') {
          const shell = await caches.match('/index.html')
          if (shell) return shell
        }
        return Response.error()
      })
  )
})
