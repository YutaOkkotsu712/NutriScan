// Shared CMS authentication + roles (spec §14 admin tooling).
//
// Two credential sources, checked in order:
//   1. Env bootstrap tokens — ADMIN_TOKEN (single, audits as "admin") and
//      ADMIN_TOKENS ("asha:tok1,ravi:tok2"). Env users are always role
//      "admin" and cannot be edited from the console; they exist so a fresh
//      deployment can bootstrap its first real users.
//   2. KV users — created through the console (api/admin/users.js), stored
//      as a single JSON object under `cms:users`:
//        { [name]: { tokenHash, role, disabled, createdAt, createdBy } }
//      Only the SHA-256 hash of a token is stored; the plain token is shown
//      exactly once at creation.
//
// Roles:
//   admin    — everything: corrections review, reference publishing, users
//   reviewer — corrections review (approve/reject + data overrides) only

export const ROLES = ['admin', 'reviewer']
export const USERS_KEY = 'cms:users'

const enc = new TextEncoder()

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// Constant-time string comparison — plain === leaks match length via timing.
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Single-command KV REST call (Upstash/Vercel KV). Throws on transport error.
export async function kvCmd(env, cmd) {
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

export function kvConfigured(env) {
  return Boolean(env.KV_REST_API_URL && env.KV_REST_API_TOKEN)
}

// Client IP for rate limiting. x-real-ip is set by the platform (Vercel) and
// not client-forgeable; the FIRST x-forwarded-for element is attacker-supplied
// when the client sends its own header, so fall back to the LAST hop instead.
export function clientIp(request) {
  return request.headers.get('x-real-ip')
    || (request.headers.get('x-forwarded-for') || '').split(',').pop().trim()
    || 'unknown'
}

// --- Brute-force guard for admin auth (best-effort, KV-backed) -------------
// More than AUTH_RL_LIMIT failed auth attempts from one IP inside the window
// blocks further attempts (even with a valid token) until the window expires.
// No-ops without KV so it can never lock out a fresh deployment.
const AUTH_RL_LIMIT = 30
const AUTH_RL_WINDOW_SEC = 900

export async function authThrottled(request, env) {
  if (!kvConfigured(env)) return false
  try {
    const raw = await kvCmd(env, ['GET', `rl:adminauth:${clientIp(request)}`])
    return Number(raw || 0) > AUTH_RL_LIMIT
  } catch {
    return false
  }
}

export async function recordAuthFailure(request, env) {
  if (!kvConfigured(env)) return
  try {
    const key = `rl:adminauth:${clientIp(request)}`
    const n = await kvCmd(env, ['INCR', key])
    if (Number(n) === 1) await kvCmd(env, ['EXPIRE', key, AUTH_RL_WINDOW_SEC])
  } catch { /* never block on limiter errors */ }
}

// The admin API is enabled when any credential source can exist.
export function adminConfigured(env) {
  return Boolean(env.ADMIN_TOKEN || env.ADMIN_TOKENS || kvConfigured(env))
}

export async function loadUsers(env) {
  if (!kvConfigured(env)) return {}
  try {
    const raw = await kvCmd(env, ['GET', USERS_KEY])
    const users = raw ? JSON.parse(raw) : {}
    return users && typeof users === 'object' ? users : {}
  } catch {
    return {}
  }
}

export async function saveUsers(env, users) {
  await kvCmd(env, ['SET', USERS_KEY, JSON.stringify(users)])
}

/**
 * Resolve the caller from the Authorization header.
 * @returns {{ name, role, source: 'env'|'kv' } | null}
 */
export async function authenticate(request, env) {
  const provided = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!provided) return null

  // 1. Env bootstrap tokens (always admins)
  for (const pair of (env.ADMIN_TOKENS || '').split(',')) {
    const sep = pair.indexOf(':')
    if (sep <= 0) continue
    const name = pair.slice(0, sep).trim()
    const token = pair.slice(sep + 1).trim()
    if (name && token && timingSafeEqual(token, provided)) return { name, role: 'admin', source: 'env' }
  }
  if (env.ADMIN_TOKEN && timingSafeEqual(env.ADMIN_TOKEN, provided)) {
    return { name: 'admin', role: 'admin', source: 'env' }
  }

  // 2. KV users — compare hashes (comparing digests also avoids timing leaks
  //    on the secret itself).
  if (kvConfigured(env)) {
    const users = await loadUsers(env)
    const providedHash = await sha256Hex(provided)
    for (const [name, u] of Object.entries(users)) {
      if (!u || u.disabled || !u.tokenHash) continue
      if (timingSafeEqual(u.tokenHash, providedHash)) {
        return { name, role: ROLES.includes(u.role) ? u.role : 'reviewer', source: 'kv' }
      }
    }
  }

  return null
}
