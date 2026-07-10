// GET /api/me/entitlement   Authorization: Bearer <firebase-id-token>
//
// Read-only membership status for the logged-in user — powers the "N free
// scans left" indicator and the account page. Does NOT consume a scan.

import { authenticateUser, authConfigured } from '../_lib/firebaseAuth.js'
import { getEntitlement } from '../_lib/entitlement.js'
import { kvConfigured } from '../_lib/auth.js'
import { corsHeadersFor, handlePreflight } from '../_lib/cors.js'

export const config = { runtime: 'edge' }

const env = (typeof process !== 'undefined' && process.env) || {}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders },
  })
}

export default async function handler(request) {
  const pre = handlePreflight(request, env)
  if (pre) return pre
  const cors = corsHeadersFor(request, env)
  const jsonC = (body, status = 200) => json(body, status, cors)
  if (request.method !== 'GET') return jsonC({ error: 'Method not allowed' }, 405)
  if (!authConfigured(env)) return jsonC({ error: 'Membership not configured.' }, 503)
  if (!kvConfigured(env)) return jsonC({ error: 'Storage not configured.' }, 503)

  const user = await authenticateUser(request, env)
  if (!user) return jsonC({ error: 'Sign in required.', code: 'unauthenticated' }, 401)

  const entitlement = await getEntitlement(user.uid, env)
  return jsonC({
    user: { uid: user.uid, email: user.email },
    entitlement,
  })
}
