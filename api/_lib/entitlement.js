// Server-side scan entitlement — the 100-free-scans meter (ZOCO membership).
//
// SECURITY MODEL: the count is authoritative on the server, keyed to the
// verified Firebase uid. The client never decides whether a scan is allowed;
// it calls a gated endpoint, this module atomically consumes one unit, and the
// endpoint only returns product data when `allowed` is true. Clearing app
// storage, new device ids, or spoofed headers cannot grant extra scans because
// the counter lives in KV under the authenticated uid.
//
// Model: 100 free scans are LIFETIME (no monthly reset); after that the user
// must hold an active subscription. Admin can change the limit or comp a user.

import { kvCmd, kvConfigured } from './auth.js'

export const DEFAULT_FREE_LIMIT = 100
const LIMIT_KEY = 'config:freeScanLimit'
const scansKey = (uid) => `scans:${uid}`
const subKey = (uid) => `sub:${uid}`

// Admin-configurable free-scan limit (falls back to the default).
export async function getFreeScanLimit(env) {
  if (!kvConfigured(env)) return DEFAULT_FREE_LIMIT
  try {
    const raw = await kvCmd(env, ['GET', LIMIT_KEY])
    // An unset key reads back as null; Number(null) === 0, which would wrongly
    // mean "0 free scans" and block everyone. Only trust an explicit value.
    if (raw === null || raw === undefined || raw === '') return DEFAULT_FREE_LIMIT
    const n = Number(raw)
    return Number.isInteger(n) && n >= 0 ? n : DEFAULT_FREE_LIMIT
  } catch {
    return DEFAULT_FREE_LIMIT
  }
}

export async function setFreeScanLimit(env, limit) {
  const n = Number(limit)
  if (!Number.isInteger(n) || n < 0 || n > 100000) throw new Error('Invalid limit')
  await kvCmd(env, ['SET', LIMIT_KEY, String(n)])
  return n
}

// Parse a stored subscription record and decide if it's currently active.
function subActive(raw) {
  if (!raw) return { active: false, record: null }
  let record
  try { record = JSON.parse(raw) } catch { return { active: false, record: null } }
  if (record.status !== 'active') return { active: false, record }
  // `until` null = active with no known end (treat as active); else must be future.
  const active = !record.until || new Date(record.until).getTime() > Date.now()
  return { active, record }
}

/**
 * Read entitlement WITHOUT consuming a scan (account page, showing "N left").
 * @returns {{ subscribed, used, limit, remaining, subscription }}
 */
export async function getEntitlement(uid, env) {
  const limit = await getFreeScanLimit(env)
  const [scansRaw, subRaw] = await Promise.all([
    kvCmd(env, ['GET', scansKey(uid)]),
    kvCmd(env, ['GET', subKey(uid)]),
  ])
  const { active, record } = subActive(subRaw)
  const used = Math.max(0, Number(scansRaw) || 0)
  return {
    subscribed: active,
    used: Math.min(used, limit),
    limit,
    remaining: active ? null : Math.max(0, limit - used),
    subscription: record,
  }
}

/**
 * Atomically consume one scan. Subscribed users are never metered. Free users
 * get `limit` total; the (limit+1)-th call is blocked. Race-safe: the decision
 * rides on the atomic INCR result, and the stored value is pinned at limit+1 so
 * repeated blocked attempts can't grow it without bound.
 * @returns {{ allowed, subscribed, used, limit, remaining, reason? }}
 */
export async function consumeScan(uid, env) {
  const limit = await getFreeScanLimit(env)

  // Subscribers: allow, do not meter.
  const { active } = subActive(await kvCmd(env, ['GET', subKey(uid)]))
  if (active) {
    return { allowed: true, subscribed: true, used: 0, limit, remaining: null }
  }

  const count = Number(await kvCmd(env, ['INCR', scansKey(uid)])) || 0
  if (count <= limit) {
    return { allowed: true, subscribed: false, used: count, limit, remaining: limit - count }
  }
  // Over the free limit — pin the counter so scripted retries can't inflate it.
  if (count > limit + 1) {
    await kvCmd(env, ['SET', scansKey(uid), String(limit + 1)])
  }
  return { allowed: false, subscribed: false, used: limit, limit, remaining: 0, reason: 'limit_reached' }
}

// --- Subscription state (written by the Razorpay webhook, read on lookups) ---

export async function setSubscription(env, uid, { status = 'active', until = null, plan = null, subscriptionId = null }) {
  const record = { status, until, plan, subscriptionId, updatedAt: new Date().toISOString() }
  await kvCmd(env, ['SET', subKey(uid), JSON.stringify(record)])
  return record
}

export async function clearSubscription(env, uid) {
  const raw = await kvCmd(env, ['GET', subKey(uid)])
  const record = raw ? { ...JSON.parse(raw), status: 'cancelled', updatedAt: new Date().toISOString() } : { status: 'cancelled' }
  await kvCmd(env, ['SET', subKey(uid), JSON.stringify(record)])
  return record
}

// Admin: comp a user (reset their free-scan count to zero).
export async function resetScans(env, uid) {
  await kvCmd(env, ['SET', scansKey(uid), '0'])
}

export { subKey, scansKey }
