// Vercel Function — caching proxy for Open Food Facts product lookup.
//
// Why this exists:
//  - Removes the browser→OFF CORS dependency (requests are now same-origin)
//  - Caches responses on Vercel's edge CDN via s-maxage, so 100k lookups of
//    the same product become 1 upstream call to OFF
//  - Insulates the app from OFF rate-limiting: OFF only sees cache-miss traffic
//
// Products almost never change, so we cache aggressively (1 day fresh,
// 1 week stale-while-revalidate).

import { fetchOverrides, applyOverrides } from '../_lib/overrides.js'

const env = (typeof process !== 'undefined' && process.env) || {}

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product'

export async function GET(request) {
  const url = new URL(request.url)
  // Path is /api/product/<barcode>
  const barcode = url.pathname.split('/').filter(Boolean).pop()

  // Validate: OFF barcodes are 8–14 digit numbers
  if (!barcode || !/^\d{6,14}$/.test(barcode)) {
    return json({ error: 'Invalid barcode' }, 400, 'no-store')
  }

  try {
    const upstream = await fetch(`${OFF_BASE}/${barcode}.json`, {
      headers: {
        'User-Agent': 'NutriScan/1.0 (https://nutriscan.app)',
        'Accept': 'application/json',
      },
    })

    if (!upstream.ok) {
      // Don't cache upstream failures for long
      return json({ status: 0, error: 'Upstream error' }, 502, 'no-store')
    }

    const data = await upstream.json()

    // Merge reviewed corrections (spec §11) so users always see the reviewed
    // value. Corrected products get a short edge cache so a fresh approval
    // becomes visible quickly; untouched products keep the aggressive cache.
    // (A response cached before its first override can stay stale for up to
    // its original TTL — acceptable for day-scale correction latency.)
    let corrected = false
    if (data.status === 1 && data.product) {
      const overrides = await fetchOverrides(barcode, env)
      if (overrides) {
        applyOverrides(data.product, overrides)
        corrected = Boolean(data.product.nutriscan_corrected)
      }
    }

    return json(data, 200, corrected
      ? 'public, s-maxage=300, stale-while-revalidate=3600'
      : 'public, s-maxage=86400, stale-while-revalidate=604800')
  } catch {
    return json({ status: 0, error: 'Lookup failed' }, 502, 'no-store')
  }
}

export default { fetch: GET }

function json(body, status, cacheControl) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
      'access-control-allow-origin': '*',
    },
  })
}
