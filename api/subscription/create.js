// POST /api/subscription/create   Authorization: Bearer <firebase-id-token>
//
// Authenticated user asks to subscribe. We create a Razorpay subscription
// tagged with their uid (so the webhook can map the payment back to them) and
// return the subscription id + public key for the client to open Checkout.
// Membership is NOT granted here — only the signature-verified webhook flips
// the user to "member".

import { authenticateUser, authConfigured } from '../_lib/firebaseAuth.js'
import { kvConfigured, kvCmd } from '../_lib/auth.js'
import { razorpayConfigured, createSubscription, fetchSubscription } from '../_lib/razorpay.js'
import { corsHeadersFor, handlePreflight } from '../_lib/cors.js'

export const config = { runtime: 'edge' }

const env = (typeof process !== 'undefined' && process.env) || {}

// Abuse guard: creating a Razorpay subscription is an external write, so a
// signed-in user hammering this endpoint must not mint one per request.
// Two layers (both KV-backed, both fail-open so payments never break on a
// limiter hiccup):
//   1. reuse — the last still-"created" subscription for this uid is returned
//      instead of a new one (pendingKey, PENDING_TTL_SEC)
//   2. throttle — hard cap on creates per uid per window
const PENDING_TTL_SEC = 1800 // reuse window; Checkout links stay valid well beyond this
const CREATE_LIMIT = 8 // new subscriptions per uid per window
const CREATE_WINDOW_SEC = 3600
const pendingKey = (uid) => `rzpsub:pending:${uid}`
const rateKey = (uid) => `rl:subcreate:${uid}`

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders },
  })
}

export default async function handler(request) {
  const pre = handlePreflight(request, env)
  if (pre) return pre
  const cors = corsHeadersFor(request, env)
  const jsonC = (body, status = 200) => json(body, status, cors)
  if (request.method !== 'POST') return jsonC({ error: 'Method not allowed' }, 405)
  if (!authConfigured(env)) return jsonC({ error: 'Membership not configured.' }, 503)
  if (!razorpayConfigured(env)) return jsonC({ error: 'Payments not configured — set RAZORPAY_* env vars.' }, 503)

  const user = await authenticateUser(request, env)
  if (!user) return jsonC({ error: 'Sign in required.', code: 'unauthenticated' }, 401)

  const kv = kvConfigured(env)

  // 1. Reuse: if this uid already has a recent subscription that is still
  // awaiting payment ("created"), hand that back instead of minting another.
  if (kv) {
    try {
      const pendingId = await kvCmd(env, ['GET', pendingKey(user.uid)])
      if (pendingId) {
        const existing = await fetchSubscription(env, pendingId)
        if (existing?.status === 'created') {
          return jsonC({ subscriptionId: existing.id, keyId: env.VITE_RAZORPAY_KEY_ID })
        }
      }
    } catch { /* fall through to a fresh create */ }
  }

  // 2. Throttle actual creates per uid.
  if (kv) {
    try {
      const n = await kvCmd(env, ['INCR', rateKey(user.uid)])
      if (Number(n) === 1) await kvCmd(env, ['EXPIRE', rateKey(user.uid), CREATE_WINDOW_SEC])
      if (Number(n) > CREATE_LIMIT) {
        return jsonC({ error: 'Too many attempts. Please try again later.', code: 'rate_limited' }, 429)
      }
    } catch { /* never block payments on limiter errors */ }
  }

  try {
    const sub = await createSubscription(env, { uid: user.uid })
    if (kv && sub.id) {
      // Map subscription → uid as a fallback in case a webhook arrives without
      // notes (belt and braces; the webhook prefers notes.uid).
      await kvCmd(env, ['SET', `rzpsub:${sub.id}`, user.uid]).catch(() => {})
      await kvCmd(env, ['SET', pendingKey(user.uid), sub.id, 'EX', PENDING_TTL_SEC]).catch(() => {})
    }
    return jsonC({ subscriptionId: sub.id, keyId: env.VITE_RAZORPAY_KEY_ID })
  } catch (err) {
    console.error('[ZOCO subscription/create]', err)
    // Surface Razorpay's own error text: it is generic and safe
    // ("Authentication failed", "The id provided does not exist") and turns a
    // blind 502 into a self-diagnosing one — misconfigured keys/plan ids on a
    // fresh deployment are otherwise only visible in server logs.
    return jsonC({ error: 'Could not start subscription. Please try again.', detail: err?.message || undefined }, 502)
  }
}
