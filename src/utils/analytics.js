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
