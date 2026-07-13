// Razorpay webhook — the authoritative "is this user a paying member" signal.
//
// POST /api/subscription/webhook   (called by Razorpay, not the app)
//
// Razorpay signs each delivery with HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)
// in the x-razorpay-signature header. We verify that BEFORE trusting anything —
// otherwise a forged POST could hand out free membership. Then we map the
// subscription back to our uid (stored in the subscription's `notes.uid` at
// creation) and flip the KV subscription record. Idempotent: Razorpay may
// deliver an event more than once, and re-applying the same state is safe.

import { verifyWebhook } from '../_lib/razorpay.js'
import { setSubscription, clearSubscription } from '../_lib/entitlement.js'
import { planKeyFor } from '../_lib/plans.js'
import { kvConfigured } from '../_lib/auth.js'

export const config = { runtime: 'edge' }

const env = (typeof process !== 'undefined' && process.env) || {}

// Events that mean "membership is active" vs "membership ended".
const ACTIVATE = new Set(['subscription.activated', 'subscription.charged', 'subscription.resumed', 'subscription.authenticated'])
const DEACTIVATE = new Set(['subscription.cancelled', 'subscription.halted', 'subscription.completed', 'subscription.expired', 'subscription.paused'])

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!env.RAZORPAY_WEBHOOK_SECRET) return json({ error: 'Webhook not configured' }, 503)
  if (!kvConfigured(env)) return json({ error: 'Storage not configured' }, 503)

  // Read the RAW body — required for a correct HMAC.
  const raw = await request.text()
  const signature = request.headers.get('x-razorpay-signature')
  if (!(await verifyWebhook(raw, signature, env.RAZORPAY_WEBHOOK_SECRET))) {
    return json({ error: 'Invalid signature' }, 400)
  }

  let event
  try { event = JSON.parse(raw) } catch { return json({ error: 'Invalid JSON' }, 400) }

  const entity = event?.payload?.subscription?.entity
  const type = event?.event
  const uid = entity?.notes?.uid
  // No uid to act on (e.g. a non-subscription event) — acknowledge so Razorpay
  // stops retrying, but change nothing.
  if (!uid || (!ACTIVATE.has(type) && !DEACTIVATE.has(type))) {
    return json({ ok: true, ignored: type || 'unknown' })
  }

  try {
    if (ACTIVATE.has(type)) {
      // current_end is a unix timestamp (seconds) for the paid-through date.
      const until = entity.current_end ? new Date(entity.current_end * 1000).toISOString() : null
      await setSubscription(env, uid, {
        status: 'active', until, plan: entity.plan_id || null,
        planKey: planKeyFor(env, entity.plan_id), subscriptionId: entity.id || null,
      })
    } else {
      // Only clear if this event is for the subscription we currently track —
      // a stale cancel of a replaced/old subscription must not revoke a newer one.
      await clearSubscription(env, uid, entity.id || null)
    }
    return json({ ok: true, event: type, uid })
  } catch (err) {
    console.error('[ZOCO webhook] state update failed', err)
    return json({ error: 'Update failed' }, 502)
  }
}
