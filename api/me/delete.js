// POST /api/me/delete   Authorization: Bearer <firebase-id-token>
//
// Account deletion (Google Play requires in-app account deletion for apps
// with account creation). Removes everything the server keeps about the
// authenticated uid:
//   1. best-effort cancels any active Razorpay subscription (immediately —
//      the account is going away, keeping it billing would be worse)
//   2. deletes the KV records: scan meter, subscription, pending-checkout
//      pointer and the subscription→uid webhook fallback mapping
// The FIREBASE user is deleted by the client afterwards (`deleteUser` from the
// client SDK) — the Edge runtime has no Admin SDK, and client-side deletion
// enforces Firebase's recent-login requirement for us.
//
// Order matters: server data first, Firebase user second. If the client-side
// delete then fails, the user still exists and can retry; the reverse order
// would strand server records with no owner able to remove them.

import { authenticateUser, authConfigured } from '../_lib/firebaseAuth.js'
import { kvConfigured, kvCmd } from '../_lib/auth.js'
import { razorpayConfigured, cancelSubscription } from '../_lib/razorpay.js'
import { corsHeadersFor, handlePreflight } from '../_lib/cors.js'
import { asNodeHandler } from '../_lib/nodeAdapter.js'

// Node runtime (no edge config): this endpoint cancels Razorpay subscriptions,
// and Razorpay's WAF 406-rejects calls from edge runtimes — see subscription/create.js.

const env = (typeof process !== 'undefined' && process.env) || {}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders },
  })
}

export default asNodeHandler(async function handler(request) {
  const pre = handlePreflight(request, env)
  if (pre) return pre
  const cors = corsHeadersFor(request, env)
  const jsonC = (body, status = 200) => json(body, status, cors)
  if (request.method !== 'POST') return jsonC({ error: 'Method not allowed' }, 405)
  if (!authConfigured(env)) return jsonC({ error: 'Membership not configured.' }, 503)
  if (!kvConfigured(env)) return jsonC({ error: 'Storage not configured.' }, 503)

  const user = await authenticateUser(request, env)
  if (!user) return jsonC({ error: 'Sign in required.', code: 'unauthenticated' }, 401)

  // 1. Cancel any live Razorpay subscription so the deleted account is never
  // charged again. Best-effort: a Razorpay hiccup must not block deletion —
  // the user can also cancel from Razorpay's own emails/portal.
  let subscriptionId = null
  try {
    const raw = await kvCmd(env, ['GET', `sub:${user.uid}`])
    if (raw) subscriptionId = JSON.parse(raw)?.subscriptionId || null
  } catch { /* unreadable record — still delete it below */ }
  if (subscriptionId && razorpayConfigured(env)) {
    await cancelSubscription(env, subscriptionId, false).catch((err) =>
      console.error('[ZOCO me/delete] razorpay cancel failed:', err?.message || err))
  }

  // 2. Remove the server-side records.
  const keys = [`sub:${user.uid}`, `rzpsub:pending:${user.uid}`]
  if (subscriptionId) keys.push(`rzpsub:${subscriptionId}`)
  for (const key of keys) {
    await kvCmd(env, ['DEL', key]).catch(() => {})
  }

  // The scan METER is expired, not deleted. Deleting it here would be a
  // paywall bypass: call this endpoint, skip the client-side Firebase
  // deletion, keep the account — with a reset meter. Instead the counter
  // self-purges after 30 days: a genuinely deleted uid can never authenticate
  // again (so the orphan key is unreadable and simply ages out), while a
  // kept account keeps its count. Privacy page documents the 30-day purge.
  await kvCmd(env, ['EXPIRE', `scans:${user.uid}`, 30 * 24 * 3600]).catch(() => {})

  return jsonC({ deleted: true })
})
