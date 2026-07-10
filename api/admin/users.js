// Vercel Edge Function — CMS user management (spec §14 multi-user admin).
//
//   GET  /api/admin/users                       list users (never exposes hashes)
//   POST /api/admin/users { name, role }        create user → returns token ONCE
//   POST /api/admin/users { action, name }      action: disable | enable | delete
//
// Admin role only. Users live in KV under `cms:users` (see api/_lib/auth.js);
// only SHA-256 token hashes are stored. Env bootstrap tokens (ADMIN_TOKEN/
// ADMIN_TOKENS) are managed on Vercel, not here.
//
// Every change writes an audit entry to the shared corrections:audit trail.

import {
  authenticate, adminConfigured, kvConfigured, kvCmd,
  loadUsers, saveUsers, sha256Hex, ROLES,
  authThrottled, recordAuthFailure,
} from '../_lib/auth.js'

export const config = { runtime: 'edge' }

const env = (typeof process !== 'undefined' && process.env) || {}

const NAME_RE = /^[a-z0-9][a-z0-9-_]{1,29}$/i
const MAX_USERS = 100

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function publicUser(name, u) {
  return { name, role: u.role, disabled: Boolean(u.disabled), createdAt: u.createdAt, createdBy: u.createdBy }
}

async function audit(actor, action, target, note = '') {
  const entry = { ts: new Date().toISOString(), kind: 'user', reviewer: actor, action, target, note }
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
      const users = await loadUsers(env)
      const list = Object.entries(users).map(([name, u]) => publicUser(name, u))
      return json({ count: list.length, users: list, me: { name: user.name, role: user.role } })
    }

    if (request.method === 'POST') {
      let body
      try {
        body = await request.json()
      } catch {
        return json({ error: 'Invalid JSON' }, 400)
      }

      const users = await loadUsers(env)

      // --- Lifecycle actions on an existing user ---
      if (body.action) {
        const name = typeof body.name === 'string' ? body.name : ''
        if (!Object.hasOwn(users, name)) return json({ error: 'User not found', name }, 404)
        // Lockout guard: without env bootstrap tokens (ADMIN_TOKEN/ADMIN_TOKENS),
        // KV users are the ONLY way in. Removing or disabling the last enabled
        // admin would lock the console forever — no credential could ever
        // authenticate again, and there is no recovery path.
        if ((body.action === 'delete' || body.action === 'disable')
          && !env.ADMIN_TOKEN && !env.ADMIN_TOKENS
          && users[name].role === 'admin' && !users[name].disabled) {
          const otherAdmins = Object.entries(users)
            .filter(([n, u]) => n !== name && u.role === 'admin' && !u.disabled)
          if (otherAdmins.length === 0) {
            return json({ error: 'Cannot remove the last active admin — the console would be locked out forever. Create another admin first.' }, 400)
          }
        }
        if (body.action === 'disable') users[name].disabled = true
        else if (body.action === 'enable') users[name].disabled = false
        else if (body.action === 'delete') delete users[name]
        else return json({ error: "action must be 'disable', 'enable' or 'delete'" }, 400)
        await saveUsers(env, users)
        await audit(user.name, `user_${body.action}`, name)
        return json({ ok: true, name, action: body.action })
      }

      // --- Create a new user ---
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      const role = body.role
      if (!NAME_RE.test(name)) {
        return json({ error: 'Name must be 2–30 chars: letters, digits, - or _' }, 400)
      }
      // Env bootstrap identities are reserved — a KV user with the same name
      // would make audit entries ambiguous about who acted.
      const envNames = new Set(['admin'])
      for (const pair of (env.ADMIN_TOKENS || '').split(',')) {
        const sep = pair.indexOf(':')
        if (sep > 0) envNames.add(pair.slice(0, sep).trim().toLowerCase())
      }
      if (envNames.has(name.toLowerCase())) {
        return json({ error: 'That name is reserved by an env-configured admin.', name }, 409)
      }
      if (!ROLES.includes(role)) {
        return json({ error: `Role must be one of: ${ROLES.join(', ')}` }, 400)
      }
      if (Object.hasOwn(users, name)) {
        return json({ error: 'A user with that name already exists', name }, 409)
      }
      if (Object.keys(users).length >= MAX_USERS) {
        return json({ error: 'User limit reached' }, 400)
      }

      // 32 random bytes → 64-char hex token. Only its hash is stored.
      const bytes = crypto.getRandomValues(new Uint8Array(32))
      const token = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
      users[name] = {
        tokenHash: await sha256Hex(token),
        role,
        disabled: false,
        createdAt: new Date().toISOString(),
        createdBy: user.name,
      }
      await saveUsers(env, users)
      await audit(user.name, 'user_create', name, `role=${role}`)

      return json({
        ok: true,
        user: publicUser(name, users[name]),
        token,
        note: 'Save this token now — it is shown only once and stored only as a hash.',
      })
    }

    return json({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('[NutriScan admin/users] error', err)
    return json({ error: 'Storage error — try again.' }, 502)
  }
}
