// Razorpay subscription helpers (ZOCO membership payments).
//
// SECURITY: the webhook is the source of truth for "is this user a paying
// member". It's a public URL Razorpay POSTs to, so it MUST be authenticated by
// HMAC signature — never trust the body alone, or anyone could forge a
// "payment succeeded" call and unlock membership for free. verifyWebhook()
// recomputes HMAC-SHA256(rawBody, webhook_secret) and constant-time compares.

import { timingSafeEqual } from './auth.js'

const RZP_API = 'https://api.razorpay.com/v1'

export function razorpayConfigured(env) {
  return Boolean(env.RAZORPAY_KEY_SECRET && env.VITE_RAZORPAY_KEY_ID && env.RAZORPAY_PLAN_ID)
}

function basicAuth(env) {
  return 'Basic ' + btoa(`${env.VITE_RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)
}

// Create a subscription for a plan and tag it with our uid (in `notes`) so the
// webhook can map the payment back to the user. total_count is how many billing
// cycles Razorpay auto-charges before it auto-completes; default high so it
// behaves like an ongoing subscription until cancelled.
export async function createSubscription(env, { uid }) {
  const res = await fetch(`${RZP_API}/subscriptions`, {
    method: 'POST',
    headers: { Authorization: basicAuth(env), 'content-type': 'application/json' },
    body: JSON.stringify({
      plan_id: env.RAZORPAY_PLAN_ID,
      total_count: Number(env.RAZORPAY_TOTAL_COUNT) || 120,
      customer_notify: 1,
      notes: { uid },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.description || `Razorpay create failed (${res.status})`)
  }
  return data // { id: 'sub_...', short_url, status, ... }
}

// Look up a subscription's current state (used to reuse a still-pending
// subscription instead of creating a new one on every checkout attempt).
export async function fetchSubscription(env, subscriptionId) {
  const res = await fetch(`${RZP_API}/subscriptions/${subscriptionId}`, {
    headers: { Authorization: basicAuth(env) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.description || `Razorpay fetch failed (${res.status})`)
  return data
}

export async function cancelSubscription(env, subscriptionId, cancelAtCycleEnd = true) {
  const res = await fetch(`${RZP_API}/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: { Authorization: basicAuth(env), 'content-type': 'application/json' },
    body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.description || `Razorpay cancel failed (${res.status})`)
  return data
}

// HMAC-SHA256(message, secret) → lowercase hex, via Web Crypto (Edge-safe).
export async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// Verify a Razorpay webhook. `rawBody` MUST be the exact bytes received (not a
// re-serialized object) or the HMAC won't match.
export async function verifyWebhook(rawBody, signature, secret) {
  if (!secret || !signature) return false
  const expected = await hmacSha256Hex(secret, rawBody)
  return timingSafeEqual(expected, String(signature))
}
