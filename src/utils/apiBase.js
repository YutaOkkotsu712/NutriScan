// API base URL for all backend calls.
//
// - Web (Vercel): VITE_API_BASE is unset → '' → same-origin relative '/api/...'
//   exactly as before.
// - Native app (Capacitor): the web assets are bundled inside the APK/IPA, so
//   'relative' would hit the app shell, not the backend. The native build sets
//   VITE_API_BASE to the deployed backend (e.g. https://zoco.vercel.app) and
//   every call becomes absolute. The gated endpoints answer with CORS headers
//   for the Capacitor origins (see api/_lib/cors.js).
// `import.meta.env` only exists under Vite. This module is also imported by
// server code (api/product-info → barcodeEngine → here) where it's undefined —
// guard so the module never throws at load time outside the bundler.
const viteEnv = (typeof import.meta !== 'undefined' && import.meta.env) || {}

export const API_BASE = (viteEnv.VITE_API_BASE || '').replace(/\/+$/, '')

export function apiUrl(path) {
  return `${API_BASE}${path}`
}
