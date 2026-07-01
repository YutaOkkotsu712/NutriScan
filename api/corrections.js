// Vercel Edge Function — accept a user data correction (spec §15, §14).
//
// POST /api/corrections
// Body: { barcode, productName, type, field, detail, sourceUrl }
//
// Security (§14): validates and sanitizes every field, caps lengths, accepts
// POST only. Persists to Vercel KV when configured (KV_REST_API_URL +
// KV_REST_API_TOKEN env vars); otherwise logs to the function output so
// nothing is silently lost. No PII is requested or stored.
//
// Corrections are queued for admin review (workflow status "needs expert
// review" per §11) — they are NOT auto-applied to what users see.

export const config = { runtime: 'edge' }

const MAX = { field: 60, detail: 1000, name: 200, url: 300, barcode: 14 }
const ALLOWED_TYPES = new Set(['nutrition', 'ingredient', 'allergen', 'regulation', 'other'])

// Strip anything HTML/script-ish and clamp length. Corrections are free text.
function clean(value, max) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<[^>]*>/g, '')            // strip HTML tags
    .replace(/[\x00-\x1F\x7F]/g, ' ') // strip control chars
    .trim()
    .slice(0, max)
}

const env = (typeof process !== 'undefined' && process.env) || {}

// CORS: deny cross-origin by default. Only echo Allow-Origin when the request
// Origin matches an explicit allowlist (env ALLOWED_ORIGIN). Same-origin calls
// from the app don't need CORS headers, so this closes cross-origin abuse.
function corsHeaders(request) {
  const allowed = env.ALLOWED_ORIGIN
  const origin = request.headers.get('origin')
  if (allowed && origin === allowed) {
    return {
      'access-control-allow-origin': allowed,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type',
      'vary': 'Origin',
    }
  }
  return { vary: 'Origin' }
}

function json(body, status = 200, request = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(request ? corsHeaders(request) : {}),
    },
  })
}

// Best-effort per-IP fixed-window rate limit backed by KV. No-op (allows) when
// KV isn't configured or on any error, so it can never take the endpoint down.
async function rateLimited(request, bucket, limit, windowSec) {
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) return false
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const key = `rl:${bucket}:${ip}`
  try {
    const res = await fetch(env.KV_REST_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.KV_REST_API_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify(['INCR', key]),
    })
    const data = await res.json().catch(() => null)
    const count = Number(data?.result ?? 0)
    if (count === 1) {
      // First hit in the window — set the expiry.
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
  if (request.method === 'OPTIONS') return json({}, 204, request)
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, request)

  // 20 corrections per IP per hour.
  if (await rateLimited(request, 'corrections', 20, 3600)) {
    return json({ error: 'Too many submissions — please try again later.' }, 429, request)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400, request)
  }

  const type = ALLOWED_TYPES.has(body.type) ? body.type : 'other'
  const detail = clean(body.detail, MAX.detail)
  const barcode = clean(body.barcode, MAX.barcode).replace(/\D/g, '')

  // Require some detail to be actionable.
  if (!detail || detail.length < 3) {
    return json({ error: 'Please describe what is wrong.' }, 400, request)
  }

  const record = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    status: 'needs_review',
    type,
    barcode,
    productName: clean(body.productName, MAX.name),
    field: clean(body.field, MAX.field),
    detail,
    sourceUrl: clean(body.sourceUrl, MAX.url),
  }

  const kvUrl = env.KV_REST_API_URL || null
  const kvToken = env.KV_REST_API_TOKEN || null

  try {
    if (kvUrl && kvToken) {
      // Upstash/Vercel KV REST: push onto a review queue list.
      const res = await fetch(kvUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}`, 'content-type': 'application/json' },
        body: JSON.stringify(['LPUSH', 'corrections:queue', JSON.stringify(record)]),
      })
      if (!res.ok) throw new Error('KV write failed')
      return json({ ok: true, id: record.id, stored: 'kv' }, 200, request)
    }
    // No store configured — log so it is captured in function output.
    console.log('[NutriScan correction]', JSON.stringify(record))
    return json({ ok: true, id: record.id, stored: 'log' }, 200, request)
  } catch (err) {
    console.error('[NutriScan correction] store failed', err)
    console.log('[NutriScan correction:fallback]', JSON.stringify(record))
    return json({ ok: true, id: record.id, stored: 'log' }, 200, request)
  }
}
