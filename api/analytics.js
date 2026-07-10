// Vercel Edge Function — privacy-safe product analytics (spec §14).
//
// POST /api/analytics  Body: { event, props }
//
// Tracks ONLY interaction signals — which chips are clicked, failed searches,
// correction submissions, and language usage. It deliberately does NOT accept
// or store any personal health data (allergens, diet, profile) or free text.
// Unknown event types and any non-whitelisted props are dropped.

import { clientIp } from './_lib/auth.js'
import { corsHeadersFor } from './_lib/cors.js'

export const config = { runtime: 'edge' }

// Cap the event list so a flood can't grow KV without bound.
const EVENTS_CAP = 19999

const ALLOWED_EVENTS = new Set([
  'chip_click', 'search_fail', 'language_change', 'correction_submit', 'scan',
])

// Only these prop keys are kept, and values are coerced to safe primitives.
const ALLOWED_PROPS = {
  group: 'string',      // suitability chip key
  lang: 'string',       // language code
  type: 'string',       // correction type
  source: 'string',     // scan source
  queryLen: 'number',   // length only, never the query text
}

function sanitizeProps(props) {
  const out = {}
  if (!props || typeof props !== 'object') return out
  for (const [k, type] of Object.entries(ALLOWED_PROPS)) {
    const v = props[k]
    if (v === undefined || v === null) continue
    if (type === 'string' && typeof v === 'string') out[k] = v.slice(0, 40).replace(/[^\w.-]/g, '')
    else if (type === 'number' && typeof v === 'number' && isFinite(v)) out[k] = Math.min(Math.round(v), 9999)
  }
  return out
}

const env = (typeof process !== 'undefined' && process.env) || {}

// CORS: deny cross-origin unless the request Origin matches env ALLOWED_ORIGIN.
function corsHeaders(request) {
  // Shared allowlist: Capacitor app origins + ALLOWED_APP_ORIGINS/ALLOWED_ORIGIN.
  return corsHeadersFor(request, env)
}

function res(status = 204, request = null) {
  return new Response(null, {
    status,
    headers: { 'cache-control': 'no-store', ...(request ? corsHeaders(request) : {}) },
  })
}

// Best-effort per-IP rate limit (KV-backed; no-op without KV).
async function rateLimited(request, limit, windowSec) {
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) return false
  const ip = clientIp(request)
  const key = `rl:analytics:${ip}`
  try {
    const r = await fetch(env.KV_REST_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.KV_REST_API_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify(['INCR', key]),
    })
    const data = await r.json().catch(() => null)
    const count = Number(data?.result ?? 0)
    if (count === 1) {
      await fetch(env.KV_REST_API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.KV_REST_API_TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify(['EXPIRE', key, windowSec]),
      })
    }
    return count > limit
  } catch {
    return false
  }
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') return res(204, request)
  if (request.method !== 'POST') return res(405, request)

  // 600 events per IP per hour — generous for one user, blocks flooding.
  if (await rateLimited(request, 600, 3600)) return res(429, request)

  let body
  try { body = await request.json() } catch { return res(400, request) }

  if (!ALLOWED_EVENTS.has(body.event)) return res(204, request) // silently drop unknown

  const record = {
    ts: new Date().toISOString(),
    event: body.event,
    props: sanitizeProps(body.props),
  }

  try {
    if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) {
      await fetch(env.KV_REST_API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.KV_REST_API_TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify(['LPUSH', 'analytics:events', JSON.stringify(record)]),
      })
      // Awaited: edge runtimes may cancel unawaited work when the handler
      // returns; the outer try swallows any error.
      await fetch(env.KV_REST_API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.KV_REST_API_TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify(['LTRIM', 'analytics:events', 0, EVENTS_CAP]),
      })
    } else {
      console.log('[NutriScan analytics]', JSON.stringify(record))
    }
  } catch {
    // analytics must never break the app — swallow errors
  }
  return res(204, request)
}
