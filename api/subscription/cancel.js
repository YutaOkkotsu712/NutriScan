// POST /api/subscription/cancel   Authorization: Bearer <firebase-id-token>
//
// The signed-in user cancels their own subscription. We look up their stored
// subscription id and tell Razorpay to cancel at cycle end (they keep access
// until the paid-through date). The webhook will later flip the record to
// inactive; we don't clear it here so the user keeps access until then.

import { authenticateUser, authConfigured } from '../_lib/firebaseAuth.js'
import { kvConfigured, kvCmd } from '../_lib/auth.js'
import { razorpayConfigured, cancelSubscription } from '../_lib/razorpay.js'
import { corsHeadersFor, handlePreflight } from '../_lib/cors.js'
import { subKey } from '../_lib/entitlement.js'

export const config = { runtime: 'edge' }

const env = (typeof process !== 'undefined' && process.env) || {}

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
  if (!razorpayConfigured(env) || !kvConfigured(env)) return jsonC({ error: 'Payments not configured.' }, 503)

  const user = await authenticateUser(request, env)
  if (!user) return jsonC({ error: 'Sign in required.', code: 'unauthenticated' }, 401)

  let record
  try {
    const raw = await kvCmd(env, ['GET', subKey(user.uid)])
    record = raw ? JSON.parse(raw) : null
  } catch { record = null }

  if (!record?.subscriptionId) return jsonC({ error: 'No active subscription found.' }, 404)

  try {
    await cancelSubscription(env, record.subscriptionId, true)
    return jsonC({ ok: true, cancelAtCycleEnd: true })
  } catch (err) {
    console.error('[ZOCO subscription/cancel]', err)
    return jsonC({ error: 'Could not cancel. Please try again.' }, 502)
  }
}
