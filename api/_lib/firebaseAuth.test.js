import { describe, it, expect, beforeAll } from 'vitest'
import { generateKeyPair, SignJWT } from 'jose'
import { verifyFirebaseToken, authenticateUser, AuthError } from './firebaseAuth.js'

const PROJECT = 'zoco-test-project'
const env = { FIREBASE_PROJECT_ID: PROJECT }

let publicKey, privateKey

beforeAll(async () => {
  ;({ publicKey, privateKey } = await generateKeyPair('RS256'))
})

// Build a Firebase-shaped ID token, overriding any claim for negative tests.
async function makeToken({ iss, aud, sub = 'uid-abc', exp = '1h', email = 'a@b.com', key } = {}) {
  const jwt = new SignJWT({ email, email_verified: true })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(iss ?? `https://securetoken.google.com/${PROJECT}`)
    .setAudience(aud ?? PROJECT)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(exp)
  return jwt.sign(key || privateKey)
}

describe('verifyFirebaseToken', () => {
  it('accepts a valid token and returns the identity', async () => {
    const token = await makeToken()
    const id = await verifyFirebaseToken(token, env, publicKey)
    expect(id).toEqual({ uid: 'uid-abc', email: 'a@b.com', emailVerified: true })
  })

  it('rejects an expired token', async () => {
    const token = await makeToken({ exp: '-1h' })
    await expect(verifyFirebaseToken(token, env, publicKey)).rejects.toMatchObject({ code: 'invalid_token' })
  })

  it('rejects a wrong audience (token minted for another Firebase project)', async () => {
    const token = await makeToken({ aud: 'someone-elses-project' })
    await expect(verifyFirebaseToken(token, env, publicKey)).rejects.toMatchObject({ code: 'invalid_token' })
  })

  it('rejects a wrong issuer', async () => {
    const token = await makeToken({ iss: 'https://evil.example.com/' + PROJECT })
    await expect(verifyFirebaseToken(token, env, publicKey)).rejects.toMatchObject({ code: 'invalid_token' })
  })

  it('rejects a token signed by a different (attacker) key', async () => {
    const attacker = await generateKeyPair('RS256')
    const token = await makeToken({ key: attacker.privateKey })
    await expect(verifyFirebaseToken(token, env, publicKey)).rejects.toMatchObject({ code: 'invalid_token' })
  })

  it('rejects a tampered token body', async () => {
    const token = await makeToken()
    const [h, , s] = token.split('.')
    const forged = `${h}.${btoa(JSON.stringify({ sub: 'admin', aud: PROJECT })).replace(/=/g, '')}.${s}`
    await expect(verifyFirebaseToken(forged, env, publicKey)).rejects.toMatchObject({ code: 'invalid_token' })
  })

  it('rejects when the project is not configured', async () => {
    const token = await makeToken()
    await expect(verifyFirebaseToken(token, {}, publicKey)).rejects.toMatchObject({ code: 'auth_not_configured' })
  })

  it('rejects an empty token', async () => {
    await expect(verifyFirebaseToken('', env, publicKey)).rejects.toMatchObject({ code: 'missing_token' })
  })

  it('is an AuthError instance (so handlers can branch on it)', async () => {
    await expect(verifyFirebaseToken('', env, publicKey)).rejects.toBeInstanceOf(AuthError)
  })
})

describe('authenticateUser', () => {
  const req = (auth) => new Request('http://localhost/api/x', { headers: auth ? { authorization: auth } : {} })

  it('returns the identity for a valid Bearer token', async () => {
    const token = await makeToken()
    const id = await authenticateUser(req(`Bearer ${token}`), env, publicKey)
    expect(id.uid).toBe('uid-abc')
  })

  it('returns null (not throw) for missing or bad tokens', async () => {
    expect(await authenticateUser(req(null), env, publicKey)).toBeNull()
    expect(await authenticateUser(req('Bearer garbage'), env, publicKey)).toBeNull()
  })
})
