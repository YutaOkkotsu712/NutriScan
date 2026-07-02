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

import { sanitizeOverride, fetchOverrides, overridesKey } from '../_lib/overrides.js'
import { authenticate, adminConfigured, kvConfigured, authThrottled, recordAuthFailure } from '../_lib/auth.js'

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
  if (!adminConfigured(env)) {
    return json({ error: 'Admin API disabled — set the ADMIN_TOKEN or ADMIN_TOKENS env var.' }, 503)
  }
  if (await authThrottled(request, env)) {
    return json({ error: 'Too many failed attempts — try again later.' }, 429)
  }
  // Both roles may review corrections (spec §11); auth resolves env bootstrap
  // tokens and console-created KV users.
  const user = await authenticate(request, env)
  if (!user) {
    await recordAuthFailure(request, env)
    return json({ error: 'Unauthorized' }, 401)
  }
  const reviewer = user.name
  if (!kvConfigured(env)) {
    return json({ error: 'Storage not configured — create a Vercel KV store.' }, 503)
  }

  try {
    if (request.method === 'GET') {
      const viewParam = new URL(request.url).searchParams.get('view')
      const view = VIEWS.has(viewParam) ? viewParam : 'queue'
      const items = parseRecords(await kv(['LRANGE', KEYS[view], 0, 199]))
      return json({ view, count: items.length, items, me: { name: user.name, role: user.role } })
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

      // Optional structured data override, only on approve (spec §11: the
      // fix users see is the reviewed value, never the raw submission).
      let override = null
      if (body.override !== undefined && body.override !== null) {
        if (action !== 'approve') {
          return json({ error: 'Overrides can only accompany an approval.' }, 400)
        }
        override = sanitizeOverride(body.override)
        if (!override) {
          return json({ error: 'Invalid override — unknown field or bad value.' }, 400)
        }
      }

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
        reviewedBy: reviewer,
        reviewNote: note,
        ...(override ? { override } : {}),
      }
      const audit = {
        ts: record.reviewedAt,
        correctionId: id,
        action,
        reviewer,
        note,
        barcode: record.barcode || '',
        type: record.type || '',
        ...(override ? { override } : {}),
      }

      // An override needs a barcode to attach to. Versioned upsert: read the
      // current record, add/replace the field entry, bump the version.
      if (override && !/^\d{6,14}$/.test(record.barcode || '')) {
        return json({ error: 'Override requires a correction with a valid barcode.' }, 400)
      }
      if (override) {
        const existing = (await fetchOverrides(record.barcode, env)) || { barcode: record.barcode, fields: {}, version: 0 }
        existing.fields[override.field] = {
          value: override.value,
          correctionId: id,
          reviewer,
          ts: record.reviewedAt,
        }
        existing.version = (existing.version || 0) + 1
        existing.updatedAt = record.reviewedAt
        await kv(['SET', overridesKey(record.barcode), JSON.stringify(existing)])
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
