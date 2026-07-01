// Vercel Edge Function — caching proxy for Open Food Facts search.
//
// Forwards the incoming query string to OFF's v2 search endpoint and caches
// the result on the edge. Search results change more often than individual
// products and the query space is larger, so we cache for a shorter window
// (1 hour fresh, 1 day stale-while-revalidate).

export const config = { runtime: 'edge' }

const OFF_SEARCH = 'https://world.openfoodfacts.org/api/v2/search'

// Only forward params we actually use — prevents cache fragmentation and
// blocks arbitrary param injection.
const ALLOWED_PARAMS = new Set([
  'search_terms',
  'categories_tags',
  'page',
  'page_size',
  'fields',
  'sort_by',
])

export default async function handler(request) {
  const incoming = new URL(request.url)

  const params = new URLSearchParams()
  for (const [key, value] of incoming.searchParams) {
    if (ALLOWED_PARAMS.has(key)) params.set(key, value)
  }

  // Require at least one actual query dimension
  if (!params.has('search_terms') && !params.has('categories_tags')) {
    return json({ error: 'Missing search_terms or categories_tags' }, 400, 'no-store')
  }

  try {
    const upstream = await fetch(`${OFF_SEARCH}?${params}`, {
      headers: {
        'User-Agent': 'NutriScan/1.0 (https://nutriscan.app)',
        'Accept': 'application/json',
      },
    })

    if (!upstream.ok) {
      return json({ products: [], count: 0, error: 'Upstream error' }, 502, 'no-store')
    }

    const data = await upstream.json()

    return json(data, 200, 'public, s-maxage=3600, stale-while-revalidate=86400')
  } catch {
    return json({ products: [], count: 0, error: 'Search failed' }, 502, 'no-store')
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
