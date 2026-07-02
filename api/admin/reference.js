// Vercel Edge Function — versioned ingredient reference database (spec §10,
// §14: "admin-managed reference database").
//
//   GET  /api/admin/reference                     list: base + published entries
//   GET  /api/admin/reference?id=<id>             one entry: { base, published }
//   GET  /api/admin/reference?id=<id>&history=1   full version history
//   POST /api/admin/reference { id, entry }              publish a new version
//   POST /api/admin/reference { action:'revert', id, version }   restore old version
//   POST /api/admin/reference { action:'unpublish', id }         fall back to base
//
// Admin role only. Storage model:
//   ref:ingredients:published   JSON { [id]: { entry, version, updatedAt, updatedBy } }
//                               — the live override set, merged over the static
//                               src/data module by /api/ingredients/*
//   refhist:ingredient:<id>     append-only version history (newest first)
//
// Versioning is append-only: a revert creates a NEW version whose content is
// the old one (revertedFrom marks it), so the audit trail never rewrites.

import { authenticate, adminConfigured, kvConfigured, kvCmd, authThrottled, recordAuthFailure } from '../_lib/auth.js'
import { sanitizeIngredientEntry, INGREDIENT_ID_RE } from '../_lib/referenceSchema.js'
import { PUBLISHED_KEY } from '../_lib/publishedIngredients.js'
import { INGREDIENT_ENCYCLOPEDIA, ENCYCLOPEDIA_META } from '../../src/data/ingredientEncyclopedia.js'

export const config = { runtime: 'edge' }

const env = (typeof process !== 'undefined' && process.env) || {}

const historyKey = (id) => `refhist:ingredient:${id}`

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

async function loadPublished() {
  try {
    const raw = await kvCmd(env, ['GET', PUBLISHED_KEY])
    const map = raw ? JSON.parse(raw) : {}
    return map && typeof map === 'object' ? map : {}
  } catch {
    return {}
  }
}

async function audit(actor, action, target, note = '') {
  const entry = { ts: new Date().toISOString(), kind: 'reference', reviewer: actor, action, target, note }
  await kvCmd(env, ['LPUSH', 'corrections:audit', JSON.stringify(entry)])
  await kvCmd(env, ['LTRIM', 'corrections:audit', 0, 1999])
}

export default async function handler(request) {
  if (!adminConfigured(env)) {
    return json({ error: 'Admin API disabled — set the ADMIN_TOKEN or ADMIN_TOKENS env var.' }, 503)
  }
  if (await authThrottled(request, env)) {
    return json({ error: 'Too many failed attempts — try again later.' }, 429)
  }
  const user = await authenticate(request, env)
  if (!user) {
    await recordAuthFailure(request, env)
    return json({ error: 'Unauthorized' }, 401)
  }
  if (user.role !== 'admin') return json({ error: 'Admin role required' }, 403)
  if (!kvConfigured(env)) {
    return json({ error: 'Storage not configured — create a Vercel KV store.' }, 503)
  }

  try {
    if (request.method === 'GET') {
      const url = new URL(request.url)
      const id = url.searchParams.get('id')
      const published = await loadPublished()

      if (!id) {
        // List view: every base id + every published id, with edit status.
        const ids = new Set([...Object.keys(INGREDIENT_ENCYCLOPEDIA), ...Object.keys(published)])
        const list = [...ids].sort().map(key => {
          const pub = published[key]
          const base = INGREDIENT_ENCYCLOPEDIA[key]
          return {
            id: key,
            canonicalName: pub?.entry?.canonicalName || base?.canonicalName || key,
            inBase: Boolean(base),
            published: pub ? { version: pub.version, updatedAt: pub.updatedAt, updatedBy: pub.updatedBy } : null,
          }
        })
        return json({ meta: ENCYCLOPEDIA_META, count: list.length, entries: list, me: { name: user.name, role: user.role } })
      }

      if (!INGREDIENT_ID_RE.test(id)) return json({ error: 'Invalid id' }, 400)

      if (url.searchParams.get('history')) {
        const raw = (await kvCmd(env, ['LRANGE', historyKey(id), 0, 49])) || []
        const history = raw.map(r => { try { return JSON.parse(r) } catch { return null } }).filter(Boolean)
        return json({ id, count: history.length, history })
      }

      const base = Object.hasOwn(INGREDIENT_ENCYCLOPEDIA, id) ? INGREDIENT_ENCYCLOPEDIA[id] : null
      const pub = Object.hasOwn(published, id) ? published[id] : null
      if (!base && !pub) return json({ error: 'Ingredient not found', id }, 404)
      return json({ id, base, published: pub })
    }

    if (request.method === 'POST') {
      let body
      try {
        body = await request.json()
      } catch {
        return json({ error: 'Invalid JSON' }, 400)
      }

      const id = typeof body.id === 'string' ? body.id.trim() : ''
      if (!INGREDIENT_ID_RE.test(id)) {
        return json({ error: 'id must be 2–60 chars: lowercase letters, digits, _' }, 400)
      }
      const published = await loadPublished()
      const current = Object.hasOwn(published, id) ? published[id] : null

      // --- Unpublish: the static base entry (if any) shows again ---
      if (body.action === 'unpublish') {
        if (!current) return json({ error: 'No published version to unpublish', id }, 404)
        delete published[id]
        await kvCmd(env, ['SET', PUBLISHED_KEY, JSON.stringify(published)])
        await audit(user.name, 'ref_unpublish', id, `was v${current.version}`)
        return json({ ok: true, id, action: 'unpublish' })
      }

      // --- Revert: republish an old version as a new one (append-only) ---
      if (body.action === 'revert') {
        const version = Number(body.version)
        const raw = (await kvCmd(env, ['LRANGE', historyKey(id), 0, 49])) || []
        const past = raw.map(r => { try { return JSON.parse(r) } catch { return null } })
          .find(r => r && r.version === version)
        if (!past) return json({ error: `Version ${body.version} not found in history`, id }, 404)
        const record = {
          entry: past.entry,
          version: (current?.version || 0) + 1,
          revertedFrom: version,
          updatedAt: new Date().toISOString(),
          updatedBy: user.name,
        }
        published[id] = record
        await kvCmd(env, ['SET', PUBLISHED_KEY, JSON.stringify(published)])
        await kvCmd(env, ['LPUSH', historyKey(id), JSON.stringify(record)])
        await kvCmd(env, ['LTRIM', historyKey(id), 0, 49])
        await audit(user.name, 'ref_revert', id, `v${record.version} ← v${version}`)
        return json({ ok: true, id, published: record })
      }

      if (body.action) return json({ error: "action must be 'revert' or 'unpublish'" }, 400)

      // --- Publish a new version ---
      const { entry, errors } = sanitizeIngredientEntry(body.entry)
      if (errors.length) return json({ error: 'Entry failed validation', errors }, 400)

      const record = {
        entry,
        version: (current?.version || 0) + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: user.name,
      }
      published[id] = record
      await kvCmd(env, ['SET', PUBLISHED_KEY, JSON.stringify(published)])
      await kvCmd(env, ['LPUSH', historyKey(id), JSON.stringify(record)])
      await kvCmd(env, ['LTRIM', historyKey(id), 0, 49])
      await audit(user.name, 'ref_publish', id, `v${record.version} ${entry.canonicalName}`)

      return json({ ok: true, id, published: record })
    }

    return json({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('[NutriScan admin/reference] error', err)
    return json({ error: 'Storage error — try again.' }, 502)
  }
}
