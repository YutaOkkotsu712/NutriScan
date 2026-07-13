// Client analytics — fire-and-forget, privacy-safe (spec §14).
//
// Sends only interaction signals (never health data / free text). Uses
// sendBeacon when available so events survive navigation; failures are ignored
// so analytics can never break or slow the app.

import { apiUrl } from './apiBase.js'

const ENDPOINT = apiUrl('/api/analytics')

export function track(event, props = {}) {
  try {
    const body = JSON.stringify({ event, props })
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
      return
    }
    fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {})
  } catch {
    // never throw from analytics
  }
}

// Authenticated variant for events that feed the admin report (scan,
// lookup_fail, product_search). sendBeacon can't set an Authorization header,
// so we use keepalive fetch with the Firebase token — the server only counts
// these when the token verifies, so the metrics can't be gamed anonymously.
export async function trackAuthed(event, props = {}) {
  try {
    const { authHeader } = await import('./useAuth')
    const headers = { 'content-type': 'application/json', ...(await authHeader()) }
    fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ event, props }), keepalive: true }).catch(() => {})
  } catch {
    // never throw from analytics
  }
}
