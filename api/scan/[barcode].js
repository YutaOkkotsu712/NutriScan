// Gated product lookup — the paywall enforcement point (ZOCO membership).
//
// GET /api/scan/<barcode>   Authorization: Bearer <firebase-id-token>
//
// This is the ONLY product-data path the app uses once membership is on. It:
//   1. verifies the Firebase ID token         → 401 if missing/invalid
//   2. verifies scan allowance                → 402 if the free limit is hit
//   3. fetches the product from OFF
//   4. atomically consumes one scan only when returning a real product
//
// Because the final consume happens server-side against the authenticated uid,
// the meter cannot be bypassed by clearing app storage, faking a device id, or
// calling this endpoint directly — no token, no product; no allowance, no
// product. Upstream outages and genuine not-found results do not spend a scan.
// The response carries the remaining count so the UI can show it.
//
// Note: unlike the old public /api/product proxy, responses here are per-user
// (auth-gated) so they are NOT shared-cached. OFF is still shielded because a
// given product is normally resolved once per user session.

import { fetchOverrides, applyOverrides } from '../_lib/overrides.js'
import { corsHeadersFor, handlePreflight } from '../_lib/cors.js'
import { authenticateProductRequest, ensureScanAvailable, consumeAuthorizedScan } from '../_lib/scanGate.js'

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

  const auth = await authenticateProductRequest(request, env, cors)
  if (auth.blocked) return auth.blocked

  const barcode = new URL(request.url).pathname.split('/').filter(Boolean).pop()
  if (!barcode || !/^\d{6,14}$/.test(barcode)) {
    return jsonC({ error: 'Invalid barcode' }, 400)
  }

  const available = await ensureScanAvailable(auth.user, env, cors)
  if (available.blocked) return available.blocked

  // Fetch the product (same OFF + reviewed-override logic as the public proxy).
  try {
    const upstream = await fetch(`${OFF_BASE}/${barcode}.json`, {
      headers: { 'User-Agent': 'ZOCO/1.0 (https://zoco.app)', Accept: 'application/json' },
    })
    if (!upstream.ok) return jsonC({ status: 0, error: 'Upstream error' }, 502)
    const data = await upstream.json().catch(() => null)
    if (!data || typeof data !== 'object') {
      return jsonC({ status: 0, error: 'non-json-api-response' }, 502)
    }
    if (data.status !== 1 || !data.product) {
      return jsonC({ status: 0, error: 'Product not found', barcode })
    }

    const overrides = await fetchOverrides(barcode, env)
    if (overrides) applyOverrides(data.product, overrides)

    const consumed = await consumeAuthorizedScan(auth.user, env, cors)
    if (consumed.blocked) return consumed.blocked

    return jsonC({
      ...data,
      entitlement: {
        subscribed: consumed.entitlement.subscribed,
        used: consumed.entitlement.used,
        limit: consumed.entitlement.limit,
        remaining: consumed.entitlement.remaining,
      },
    })
  } catch {
    return jsonC({ status: 0, error: 'Lookup failed' }, 502)
  }
}
