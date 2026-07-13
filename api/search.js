// Vercel Edge Function — caching proxy for Open Food Facts search.
//
// Forwards a CLAMPED, server-controlled query to OFF's v2 search endpoint and
// caches the result on the edge. Search results change more often than
// individual products and the query space is larger, so we cache for a shorter
// window (1 hour fresh, 1 day stale-while-revalidate).
//
// SECURITY: search returns the same nutrition/ingredient fields the metered
// /api/scan endpoint does (the app needs them for result scoring and the
// alternatives feature), so an open proxy here would be a paywall bypass and a
// free scraping relay. Therefore:
//   - a verified Firebase ID token is required whenever auth is configured
//   - `fields` is server-owned — the caller cannot request extra data
//   - page / page_size / query length are clamped, sort_by is allowlisted
// The edge cache stays public: the payload is public OFF reference data, and
// every cache MISS (i.e. every new query) still runs the auth check, so bulk
// scraping of arbitrary queries needs a valid signed-in user.

import { authenticateUser, authConfigured } from './_lib/firebaseAuth.js'
import { corsHeadersFor, handlePreflight } from './_lib/cors.js'

export const config = { runtime: 'edge' }

const env = (typeof process !== 'undefined' && process.env) || {}

const OFF_SEARCH = 'https://world.openfoodfacts.org/api/v2/search'

// The one set of fields the app needs (see src/utils/searchEngine.js). The
// client's `fields` param is ignored — this constant is what OFF receives.
const SEARCH_FIELDS = 'code,product_name,brands,image_front_small_url,nutriscore_grade,nutriments,categories_tags,countries_tags,serving_size,ingredients_text,nova_group,ingredients_analysis_tags,allergens_tags,traces_tags'

const MAX_QUERY_LEN = 150
const MAX_PAGE = 50
const MAX_PAGE_SIZE = 50
const ALLOWED_SORT = new Set(['nutriscore_score', 'popularity_key'])

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10)
  if (Number.isNaN(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export default async function handler(request) {
  const pre = handlePreflight(request, env)
  if (pre) return pre
  const cors = corsHeadersFor(request, env)
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, 'no-store', cors)

  // Search is part of the gated app surface: require a signed-in user whenever
  // membership auth is configured (mirrors /api/scan; dev without Firebase
  // stays open, matching the app skipping the login screen there).
  if (authConfigured(env)) {
    const user = await authenticateUser(request, env)
    if (!user) return json({ error: 'Sign in required.', code: 'unauthenticated' }, 401, 'no-store', cors)
  }

  const incoming = new URL(request.url)
  const q = incoming.searchParams

  // Rebuild the upstream query from scratch — nothing client-supplied is
  // forwarded verbatim, which also keeps the edge cache key space small.
  const params = new URLSearchParams()
  const searchTerms = (q.get('search_terms') || '').trim().slice(0, MAX_QUERY_LEN)
  const categoriesTags = (q.get('categories_tags') || '').trim().slice(0, MAX_QUERY_LEN)
  if (searchTerms) params.set('search_terms', searchTerms)
  else if (categoriesTags) params.set('categories_tags', categoriesTags)
  else return json({ error: 'Missing search_terms or categories_tags' }, 400, 'no-store', cors)

  params.set('page', String(clampInt(q.get('page'), 1, MAX_PAGE, 1)))
  params.set('page_size', String(clampInt(q.get('page_size'), 1, MAX_PAGE_SIZE, 20)))
  params.set('fields', SEARCH_FIELDS)
  const sortBy = q.get('sort_by')
  if (ALLOWED_SORT.has(sortBy)) params.set('sort_by', sortBy)

  // Optional market filter (e.g. en:india so suggested alternatives are
  // actually on Indian shelves). Strict shape check — it's the only param
  // where the client picks the value.
  const countries = (q.get('countries_tags') || '').trim()
  if (/^en:[a-z-]{2,40}$/.test(countries)) params.set('countries_tags', countries)

  try {
    const upstream = await fetch(`${OFF_SEARCH}?${params}`, {
      headers: {
        'User-Agent': 'NutriScan/1.0 (https://nutriscan.app)',
        'Accept': 'application/json',
      },
    })

    if (!upstream.ok) {
      console.error('[search] OFF returned', upstream.status)
      // Pass OFF throttling through as 503 — the client's fetchWithRetry
      // backs off and retries on 503, but treats 502 as a hard failure.
      const throttled = upstream.status === 429 || upstream.status === 503
      return json({ products: [], count: 0, error: 'Upstream error' }, throttled ? 503 : 502, 'no-store', cors)
    }

    const data = await upstream.json()

    return json(data, 200, 'public, s-maxage=3600, stale-while-revalidate=86400', cors)
  } catch (err) {
    console.error('[search] upstream fetch failed:', err?.message || err)
    return json({ products: [], count: 0, error: 'Search failed' }, 502, 'no-store', cors)
  }
}

function json(body, status, cacheControl, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
      ...extraHeaders,
    },
  })
}
