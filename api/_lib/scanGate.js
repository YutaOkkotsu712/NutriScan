// Shared paywall gate for product-data endpoints (ZOCO).
//
// SECURITY: /api/scan is metered, and any other endpoint serving the same
// product data must honor the same meter or it becomes a paywall bypass.
//
// FAIL-CLOSED by design (product decision: there is NO free/ungated version):
// if membership isn't configured (missing FIREBASE_PROJECT_ID or KV), product
// data is unavailable (503) rather than silently free. A misconfigured deploy
// therefore degrades to "closed", never to "everything is free".
//
// The safe flow for product lookups is:
//   1. authenticateProductRequest()
//   2. validate/fetch/prepare the product data
//   3. consumeAuthorizedScan() immediately before returning product data
//
// This prevents database outages, HTML error pages, and genuine not-found
// results from spending a user's free scans, while still fail-closing at the
// point where product data would be returned.

import { authenticateUser, authConfigured } from './firebaseAuth.js'
import { consumeScan, getEntitlement } from './entitlement.js'
import { kvConfigured } from './auth.js'

function json(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders },
  })
}

function limitReachedResponse(entitlement, extraHeaders = {}) {
  return json({
    error: 'You have used all your free scans.',
    code: 'limit_reached',
    entitlement: {
      subscribed: false,
      used: entitlement.used,
      limit: entitlement.limit,
      remaining: 0,
    },
  }, 402, extraHeaders)
}

export async function authenticateProductRequest(request, env, extraHeaders = {}) {
  if (!authConfigured(env)) {
    return { blocked: json({ error: 'Membership not configured — set FIREBASE_PROJECT_ID.' }, 503, extraHeaders) }
  }
  if (!kvConfigured(env)) {
    return { blocked: json({ error: 'Storage not configured.' }, 503, extraHeaders) }
  }
  const user = await authenticateUser(request, env)
  if (!user) {
    return { blocked: json({ error: 'Sign in to scan.', code: 'unauthenticated' }, 401, extraHeaders) }
  }
  return { user }
}

export async function ensureScanAvailable(user, env, extraHeaders = {}) {
  const entitlement = await getEntitlement(user.uid, env)
  if (!entitlement.subscribed && entitlement.remaining <= 0) {
    return { blocked: limitReachedResponse(entitlement, extraHeaders) }
  }
  return { entitlement }
}

export async function consumeAuthorizedScan(user, env, extraHeaders = {}) {
  const entitlement = await consumeScan(user.uid, env)
  if (!entitlement.allowed) {
    return { blocked: limitReachedResponse(entitlement, extraHeaders) }
  }
  return { entitlement }
}

// Back-compat helper for older endpoints/tests that want the original
// authenticate-and-consume behavior in one call.
export async function gateProductRequest(request, env, extraHeaders = {}) {
  const auth = await authenticateProductRequest(request, env, extraHeaders)
  if (auth.blocked) return auth
  const available = await ensureScanAvailable(auth.user, env, extraHeaders)
  if (available.blocked) return available
  return consumeAuthorizedScan(auth.user, env, extraHeaders)
}
