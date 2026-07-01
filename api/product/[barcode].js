// Vercel Edge Function — caching proxy for Open Food Facts product lookup.
//
// Why this exists:
//  - Removes the browser→OFF CORS dependency (requests are now same-origin)
//  - Caches responses on Vercel's edge CDN via s-maxage, so 100k lookups of
//    the same product become 1 upstream call to OFF
//  - Insulates the app from OFF rate-limiting: OFF only sees cache-miss traffic
//
// Products almost never change, so we cache aggressively (1 day fresh,
// 1 week stale-while-revalidate).

export const config = { runtime: 'edge' }

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product'

export default async function handler(request) {
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

    // Cache for 1 day at the edge, serve stale for up to a week while revalidating
    return json(data, 200, 'public, s-maxage=86400, stale-while-revalidate=604800')
  } catch {
    return json({ status: 0, error: 'Lookup failed' }, 502, 'no-store')
  }
}

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
