// CORS for the auth-gated consumer endpoints (scan, entitlement, subscription).
//
// Same-origin web requests send no Origin header (or the site's own) and are
// unaffected. The Capacitor apps bundle the web assets, so their WebView
// origin is https://localhost (Android) / capacitor://localhost (iOS) — those
// are allowed by default, plus anything in ALLOWED_APP_ORIGINS (comma list).
//
// SECURITY: CORS is a browser read-permission, not authentication. Every one
// of these endpoints still requires a verified Firebase token; allowing the
// localhost app origins does not open any data to unauthenticated callers.
// The Authorization header makes browsers send an OPTIONS preflight, so each
// endpoint must answer that too (handlePreflight).

const NATIVE_APP_ORIGINS = new Set([
  'https://localhost',      // Capacitor Android (androidScheme: https)
  'capacitor://localhost',  // Capacitor iOS
  'http://localhost',       // older Capacitor Android default
])

export function corsHeadersFor(request, env = {}) {
  const origin = request.headers.get('origin')
  if (!origin) return {} // same-origin or server-to-server: nothing needed
  // ALLOWED_APP_ORIGINS (comma list) + legacy single ALLOWED_ORIGIN both work.
  const extra = `${env.ALLOWED_APP_ORIGINS || ''},${env.ALLOWED_ORIGIN || ''}`
    .split(',').map(s => s.trim()).filter(Boolean)
  if (!NATIVE_APP_ORIGINS.has(origin) && !extra.includes(origin)) {
    return { vary: 'Origin' } // not allowed: no ACAO header → browser blocks the read
  }
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'Authorization, Content-Type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

// Returns a 204 preflight response for OPTIONS requests, else null.
export function handlePreflight(request, env = {}) {
  if (request.method !== 'OPTIONS') return null
  return new Response(null, { status: 204, headers: corsHeadersFor(request, env) })
}
