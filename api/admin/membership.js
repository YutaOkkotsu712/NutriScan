// Vercel Edge Function — membership admin controls (ZOCO).
//
//   GET  /api/admin/membership              → { freeScanLimit }
//   POST { action: 'setLimit', limit }      → change the global free-scan limit
//   POST { action: 'resetScans', uid }      → comp a user (reset their count)
//   POST { action: 'lookupUser', uid }      → view a user's scan/membership status
//
// Admin role only — uses the CONSOLE auth (ADMIN_TOKEN / KV admin users, see
// api/_lib/auth.js), NOT consumer Firebase auth. The `uid` here is a consumer's
// Firebase uid (from their account). Every change writes an audit entry.

import {
  authenticate, adminConfigured, kvConfigured, kvCmd,
  authThrottled, recordAuthFailure,
} from '../_lib/auth.js'
import {
  getFreeScanLimit, setFreeScanLimit, resetScans, getEntitlement,
} from '../_lib/entitlement.js'

export const config = { runtime: 'edge' }

const env = (typeof process !== 'undefined' && process.env) || {}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

async function audit(actor, action, target, note = '') {
  const entry = { ts: new Date().toISOString(), kind: 'membership', reviewer: actor, action, target, note }
  await kvCmd(env, ['LPUSH', 'corrections:audit', JSON.stringify(entry)])
  await kvCmd(env, ['LTRIM', 'corrections:audit', 0, 1999])
}

export default async function handler(request) {
  if (!adminConfigured(env)) return json({ error: 'Admin API disabled.' }, 503)
  if (await authThrottled(request, env)) return json({ error: 'Too many failed attempts — try again later.' }, 429)
  const user = await authenticate(request, env)
  if (!user) { await recordAuthFailure(request, env); return json({ error: 'Unauthorized' }, 401) }
  if (user.role !== 'admin') return json({ error: 'Admin role required' }, 403)
  if (!kvConfigured(env)) return json({ error: 'Storage not configured.' }, 503)

  try {
    if (request.method === 'GET') {
      return json({ freeScanLimit: await getFreeScanLimit(env), me: { name: user.name, role: user.role } })
    }

    if (request.method === 'POST') {
      let body
      try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
      const uid = typeof body.uid === 'string' ? body.uid.trim().slice(0, 128) : ''

      if (body.action === 'setLimit') {
        let limit
        try { limit = await setFreeScanLimit(env, body.limit) }
        catch { return json({ error: 'Limit must be a whole number between 0 and 100000.' }, 400) }
        await audit(user.name, 'set_free_scan_limit', String(limit))
        return json({ ok: true, freeScanLimit: limit })
      }

      if (body.action === 'lookupUser') {
        if (!uid) return json({ error: 'uid required' }, 400)
        return json({ ok: true, uid, entitlement: await getEntitlement(uid, env) })
      }

      if (body.action === 'resetScans') {
        if (!uid) return json({ error: 'uid required' }, 400)
        await resetScans(env, uid)
        await audit(user.name, 'reset_scans', uid)
        return json({ ok: true, uid, entitlement: await getEntitlement(uid, env) })
      }

      return json({ error: "action must be 'setLimit', 'lookupUser' or 'resetScans'" }, 400)
    }

    return json({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('[ZOCO admin/membership]', err)
    return json({ error: 'Storage error — try again.' }, 502)
  }
}
