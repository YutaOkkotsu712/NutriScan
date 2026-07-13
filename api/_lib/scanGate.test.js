// The paywall gate must FAIL CLOSED: no configuration → no product data,
// never "everything is free". (Product decision: no free version exists.)
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { generateKeyPair, SignJWT, exportJWK } from 'jose'
import { gateProductRequest } from './scanGate.js'
import { createFakeKv } from './fakeKv.js'

const PROJECT = 'zoco-test'
const KV_URL = 'https://fake-kv.test'
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

const kv = createFakeKv()
const realFetch = globalThis.fetch
let privateKey, jwkPublic

beforeAll(async () => {
  const { publicKey, privateKey: pk } = await generateKeyPair('RS256')
  privateKey = pk
  jwkPublic = await exportJWK(publicKey)
  Object.assign(jwkPublic, { kid: 'k', alg: 'RS256', use: 'sig' })
})

beforeEach(() => {
  kv.reset()
  globalThis.fetch = (url, opts) => {
    const u = typeof url === 'string' ? url : url.url
    if (u.startsWith(KV_URL)) return kv.fetchImpl(u, opts)
    if (u === JWKS_URL) return Promise.resolve(new Response(JSON.stringify({ keys: [jwkPublic] }), { status: 200, headers: { 'content-type': 'application/json' } }))
    return Promise.resolve(new Response('{}', { status: 404 }))
  }
})
afterAll(() => { globalThis.fetch = realFetch })

const env = { FIREBASE_PROJECT_ID: PROJECT, KV_REST_API_URL: KV_URL, KV_REST_API_TOKEN: 'x' }

async function token(sub = 'u1') {
  return new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'k' })
    .setIssuer(`https://securetoken.google.com/${PROJECT}`).setAudience(PROJECT)
    .setSubject(sub).setIssuedAt().setExpirationTime('1h').sign(privateKey)
}
const req = (auth) => new Request('https://zoco.app/api/product-info/123', {
  headers: auth ? { authorization: `Bearer ${auth}` } : {},
})

describe('gateProductRequest (fail-closed paywall)', () => {
  it('BLOCKS with 503 when membership is not configured — never public', async () => {
    const g = await gateProductRequest(req(null), {})
    expect(g.blocked?.status).toBe(503)
  })

  it('blocks 401 without a token', async () => {
    const g = await gateProductRequest(req(null), env)
    expect(g.blocked?.status).toBe(401)
  })

  it('consumes a scan for a valid token', async () => {
    const g = await gateProductRequest(req(await token()), env)
    expect(g.blocked).toBeUndefined()
    expect(g.entitlement).toMatchObject({ allowed: true, used: 1, remaining: 9 })
  })

  it('blocks 402 at the limit', async () => {
    kv.strings.set('scans:u1', '100')
    const g = await gateProductRequest(req(await token()), env)
    expect(g.blocked?.status).toBe(402)
  })
})
