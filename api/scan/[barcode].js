// Gated product lookup — the paywall enforcement point (ZOCO membership).
//
// GET /api/scan/<barcode>   Authorization: Bearer <firebase-id-token>
//
// This is the ONLY product-data path the app uses once membership is on. It:
//   1. verifies the Firebase ID token         → 401 if missing/invalid
//   2. atomically consumes one scan allowance  → 402 if the free limit is hit
//   3. only then fetches + returns the product
//
// Because the consume happens server-side against the authenticated uid, the
// meter cannot be bypassed by clearing app storage, faking a device id, or
// calling this endpoint directly — no token, no product; no allowance, no
// product. The response carries the remaining count so the UI can show it.
//
// Note: unlike the old public /api/product proxy, responses here are per-user
// (auth-gated) so they are NOT shared-cached. OFF is still shielded because a
// given product is normally resolved once per user session.

import { authenticateUser, authConfigured } from '../_lib/firebaseAuth.js'
import { consumeScan } from '../_lib/entitlement.js'
import { kvConfigured } from '../_lib/auth.js'
import { fetchOverrides, applyOverrides } from '../_lib/overrides.js'
import { corsHeadersFor, handlePreflight } from '../_lib/cors.js'

export const config = { runtime: 'edge' }

const env = (typeof process !== 'undefined' && process.env) || {}
const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product'

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders },
  })
}

export default async function handler(request) {
  const pre = handlePreflight(request, env)
  if (pre) return pre
  const cors = corsHeadersFor(request, env)
  const jsonC = (body, status = 200) => json(body, status, cors)
  if (request.method !== 'GET') return jsonC({ error: 'Method not allowed' }, 405)

  if (!authConfigured(env)) {
    return jsonC({ error: 'Membership not configured — set FIREBASE_PROJECT_ID.' }, 503)
  }
  if (!kvConfigured(env)) {
    return jsonC({ error: 'Storage not configured — create a KV store.' }, 503)
  }

  // 1. Authenticate.
  const user = await authenticateUser(request, env)
  if (!user) return jsonC({ error: 'Sign in to scan.', code: 'unauthenticated' }, 401)

  const barcode = new URL(request.url).pathname.split('/').filter(Boolean).pop()
  if (!barcode || !/^\d{6,14}$/.test(barcode)) {
    return jsonC({ error: 'Invalid barcode' }, 400)
  }

  // 2. Consume one scan (subscribers are never metered).
  const entitlement = await consumeScan(user.uid, env)
  if (!entitlement.allowed) {
    return jsonC({
      error: 'You have used all your free scans.',
      code: 'limit_reached',
      entitlement: { subscribed: false, used: entitlement.used, limit: entitlement.limit, remaining: 0 },
    }, 402) // Payment Required → client shows the paywall
  }

  // 3. Fetch the product (same OFF + reviewed-override logic as the public proxy).
  try {
    const upstream = await fetch(`${OFF_BASE}/${barcode}.json`, {
      headers: { 'User-Agent': 'ZOCO/1.0 (https://zoco.app)', Accept: 'application/json' },
    })
    if (!upstream.ok) return jsonC({ status: 0, error: 'Upstream error' }, 502)
    const data = await upstream.json()
    if (data.status === 1 && data.product) {
      const overrides = await fetchOverrides(barcode, env)
      if (overrides) applyOverrides(data.product, overrides)
    }
    return jsonC({
      ...data,
      entitlement: {
        subscribed: entitlement.subscribed,
        used: entitlement.used,
        limit: entitlement.limit,
        remaining: entitlement.remaining,
      },
    })
  } catch {
    return jsonC({ status: 0, error: 'Lookup failed' }, 502)
  }
}
