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
// Returns { blocked: Response } to short-circuit, or { entitlement } to
// proceed. `entitlement` is always a consumed-scan record (or subscriber).

import { authenticateUser, authConfigured } from './firebaseAuth.js'
import { consumeScan } from './entitlement.js'
import { kvConfigured } from './auth.js'

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export async function gateProductRequest(request, env) {
  if (!authConfigured(env)) {
    return { blocked: json({ error: 'Membership not configured — set FIREBASE_PROJECT_ID.' }, 503) }
  }
  if (!kvConfigured(env)) {
    return { blocked: json({ error: 'Storage not configured.' }, 503) }
  }
  const user = await authenticateUser(request, env)
  if (!user) {
    return { blocked: json({ error: 'Sign in to scan.', code: 'unauthenticated' }, 401) }
  }
  const entitlement = await consumeScan(user.uid, env)
  if (!entitlement.allowed) {
    return {
      blocked: json({
        error: 'You have used all your free scans.',
        code: 'limit_reached',
        entitlement: { subscribed: false, used: entitlement.used, limit: entitlement.limit, remaining: 0 },
      }, 402),
    }
  }
  return { entitlement }
}
