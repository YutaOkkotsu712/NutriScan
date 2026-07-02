// Vercel Edge Function — reviewer console backend for the corrections queue
// (spec §11 review workflow, §14 admin tooling).
//
//   GET  /api/admin/corrections            list the review queue
//   GET  /api/admin/corrections?view=archive   reviewed records
//   GET  /api/admin/corrections?view=audit     audit log
//   POST /api/admin/corrections            { id, action: 'approve'|'reject', note? }
//
// Auth: `Authorization: Bearer <ADMIN_TOKEN>` (env var). Without ADMIN_TOKEN
// the whole API is disabled (503) — there is no default credential.
//
// Approving a correction marks it reviewed and records an audit entry; it
// does NOT auto-apply anything to what users see (§11). Reference-data
// changes still ship as a reviewed config release in src/data/.
//
// Storage: same Vercel KV lists as api/corrections.js —
//   corrections:queue   pending records (LPUSH by the public endpoint)
//   corrections:archive reviewed records
//   corrections:audit   append-only audit trail (who-free: token is shared,
//                       so entries record action + timestamp + record id)

export const config = { runtime: 'edge' }

const env = (typeof process !== 'undefined' && process.env) || {}

const ACTIONS = new Set(['approve', 'reject'])
const VIEWS = new Set(['queue', 'archive', 'audit'])
const KEYS = {
  queue: 'corrections:queue',
  archive: 'corrections:archive',
  audit: 'corrections:audit',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

// Constant-time token comparison — a plain === leaks match length via timing.
function authorized(request) {
  const token = env.ADMIN_TOKEN
  if (!token) return false
  const provided = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (provided.length !== token.length) return false
  let diff = 0
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ provided.charCodeAt(i)
  return diff === 0
}

async function kv(cmd) {
  const res = await fetch(env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.KV_REST_API_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(cmd),
  })
  if (!res.ok) throw new Error(`KV command failed: ${cmd[0]}`)
  const data = await res.json()
  return data.result
}

function parseRecords(rawList) {
  return (rawList || []).map(raw => {
    try { return JSON.parse(raw) } catch { return { corrupt: true, raw } }
  })
}

export default async function handler(request) {
  if (!env.ADMIN_TOKEN) {
    return json({ error: 'Admin API disabled — set the ADMIN_TOKEN env var.' }, 503)
  }
  if (!authorized(request)) {
    return json({ error: 'Unauthorized' }, 401)
  }
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) {
    return json({ error: 'Storage not configured — create a Vercel KV store.' }, 503)
  }

  try {
    if (request.method === 'GET') {
      const viewParam = new URL(request.url).searchParams.get('view')
      const view = VIEWS.has(viewParam) ? viewParam : 'queue'
      const items = parseRecords(await kv(['LRANGE', KEYS[view], 0, 199]))
      return json({ view, count: items.length, items })
    }

    if (request.method === 'POST') {
      let body
      try {
        body = await request.json()
      } catch {
        return json({ error: 'Invalid JSON' }, 400)
      }

      const id = typeof body.id === 'string' ? body.id.slice(0, 60) : ''
      const action = body.action
      if (!id || !ACTIONS.has(action)) {
        return json({ error: "Need { id, action: 'approve' | 'reject' }" }, 400)
      }
      const note = typeof body.note === 'string'
        ? body.note.replace(/<[^>]*>/g, '').replace(/[\x00-\x1F\x7F]/g, ' ').trim().slice(0, 500)
        : ''

      // Locate the raw entry so LREM can remove that exact string.
      const rawQueue = await kv(['LRANGE', KEYS.queue, 0, 999])
      const rawEntry = (rawQueue || []).find(raw => {
        try { return JSON.parse(raw).id === id } catch { return false }
      })
      if (!rawEntry) return json({ error: 'Correction not found in queue', id }, 404)

      const record = {
        ...JSON.parse(rawEntry),
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedAt: new Date().toISOString(),
        reviewNote: note,
      }
      const audit = {
        ts: record.reviewedAt,
        correctionId: id,
        action,
        note,
        barcode: record.barcode || '',
        type: record.type || '',
      }

      await kv(['LREM', KEYS.queue, 1, rawEntry])
      await kv(['LPUSH', KEYS.archive, JSON.stringify(record)])
      await kv(['LPUSH', KEYS.audit, JSON.stringify(audit)])
      // Bound the audit/archive lists so they can't grow without limit.
      await kv(['LTRIM', KEYS.audit, 0, 1999])
      await kv(['LTRIM', KEYS.archive, 0, 1999])

      return json({ ok: true, record })
    }

    return json({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('[NutriScan admin] KV error', err)
    return json({ error: 'Storage error — try again.' }, 502)
  }
}
