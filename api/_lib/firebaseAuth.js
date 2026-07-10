// Server-side Firebase ID-token verification for consumer login (ZOCO
// membership). Runs on the Vercel Edge runtime — no Firebase Admin SDK
// (Node-only, heavy); we verify the RS256 token directly against Google's
// public keys with `jose`, which is Web-Crypto based and Edge-safe.
//
// A Firebase ID token is a JWT that must satisfy ALL of:
//   - signed (RS256) by one of Google's rotating securetoken keys
//   - iss === https://securetoken.google.com/<projectId>
//   - aud === <projectId>
//   - exp in the future, iat/auth_time in the past
//   - non-empty sub (the stable user id)
// Any failure ⇒ reject. The scan meter and payments key off `uid`, so this is
// the trust anchor for the whole paywall — it must never accept a bad token.

import { jwtVerify, createRemoteJWKSet } from 'jose'

// Google's public keys in JWK form (createRemoteJWKSet caches + honours the
// Cache-Control/rotation for us). Lazy so importing this module is free.
const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

let _jwks = null
function defaultJwks() {
  if (!_jwks) _jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL))
  return _jwks
}

export class AuthError extends Error {
  constructor(code, detail) {
    super(detail || code)
    this.code = code // 'auth_not_configured' | 'missing_token' | 'invalid_token'
  }
}

/**
 * Verify a Firebase ID token and return the identity.
 * @param idToken the raw JWT from the client
 * @param env     needs FIREBASE_PROJECT_ID
 * @param keyInput jose key/JWKS — defaults to Google's remote JWKS; tests
 *                 inject a local public key so verification runs fully offline.
 * @returns {{ uid, email, emailVerified }}
 */
export async function verifyFirebaseToken(idToken, env, keyInput) {
  const projectId = env.FIREBASE_PROJECT_ID
  if (!projectId) throw new AuthError('auth_not_configured', 'FIREBASE_PROJECT_ID not set')
  if (!idToken || typeof idToken !== 'string') throw new AuthError('missing_token')

  let payload
  try {
    ;({ payload } = await jwtVerify(idToken, keyInput || defaultJwks(), {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
      clockTolerance: 5, // seconds, for minor clock skew
    }))
  } catch (err) {
    throw new AuthError('invalid_token', err.message)
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new AuthError('invalid_token', 'missing subject')
  }
  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    emailVerified: payload.email_verified === true,
  }
}

// Pull the Bearer token from an incoming request and verify it.
// Returns the identity, or null when absent/invalid (callers send 401).
export async function authenticateUser(request, env, keyInput) {
  const header = request.headers.get('authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  try {
    return await verifyFirebaseToken(token, env, keyInput)
  } catch {
    return null
  }
}

export function authConfigured(env) {
  return Boolean(env.FIREBASE_PROJECT_ID)
}
