// Report-feeding analytics events (scan / lookup_fail / product_search) must
// only count toward the admin report when a VERIFIED Firebase token is present
// — otherwise anyone could inflate the metrics. Non-report events stay
// anonymous. Same rig as scan.test.js: real signed tokens + a fetch mock.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { generateKeyPair, SignJWT, exportJWK } from 'jose'
import handler from './analytics.js'
import { readReports } from './_lib/reports.js'
import { createFakeKv } from './_lib/fakeKv.js'

const PROJECT = 'zoco-test'
const KV_URL = 'https://fake-kv.test'
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

const kv = createFakeKv()
const env = { KV_REST_API_URL: KV_URL, KV_REST_API_TOKEN: 'x' }
const realFetch = globalThis.fetch
let privateKey, jwkPublic

beforeAll(async () => {
  const { publicKey, privateKey: pk } = await generateKeyPair('RS256')
  privateKey = pk
  jwkPublic = await exportJWK(publicKey)
  jwkPublic.kid = 'test-kid'; jwkPublic.alg = 'RS256'; jwkPublic.use = 'sig'
})

beforeEach(() => {
  kv.reset()
  process.env.FIREBASE_PROJECT_ID = PROJECT
  process.env.KV_REST_API_URL = KV_URL
  process.env.KV_REST_API_TOKEN = 'x'
  globalThis.fetch = (url, opts) => {
    const u = typeof url === 'string' ? url : url.url
    if (u.startsWith(KV_URL)) return kv.fetchImpl(u, opts)
    if (u === JWKS_URL) return Promise.resolve(new Response(JSON.stringify({ keys: [jwkPublic] }), { status: 200, headers: { 'content-type': 'application/json' } }))
    return Promise.resolve(new Response('{}', { status: 404 }))
  }
})
afterAll(() => {
  globalThis.fetch = realFetch
  for (const k of ['FIREBASE_PROJECT_ID', 'KV_REST_API_URL', 'KV_REST_API_TOKEN']) delete process.env[k]
})

async function token(sub = 'u') {
  return new SignJWT({ email: `${sub}@x.com`, email_verified: true })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setIssuer(`https://securetoken.google.com/${PROJECT}`).setAudience(PROJECT)
    .setSubject(sub).setIssuedAt().setExpirationTime('1h').sign(privateKey)
}
const post = (event, props, auth) => handler(new Request('https://zoco.app/api/analytics', {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${auth}` } : {}) },
  body: JSON.stringify({ event, props }),
}))

describe('analytics report gating', () => {
  it('counts scans/searches ONLY with a valid token', async () => {
    await post('scan', {}, await token())
    await post('product_search', { term: 'maggi' }, await token())
    const r = await readReports(env)
    expect(r.scans).toBe(1)
    expect(r.topSearches[0]).toEqual({ term: 'maggi', count: 1 })
  })

  it('drops report events with no token (anonymous cannot inflate metrics)', async () => {
    expect((await post('scan', {}, null)).status).toBe(204) // still accepted...
    await post('product_search', { term: 'spam' }, null)
    const r = await readReports(env)
    expect(r.scans).toBe(0) // ...but not counted
    expect(r.topSearches).toHaveLength(0)
  })

  it('drops report events with an invalid token', async () => {
    await post('scan', {}, 'not-a-jwt')
    expect((await readReports(env)).scans).toBe(0)
  })

  it('still accepts anonymous non-report events', async () => {
    const r = await post('chip_click', { group: 'kids' }, null)
    expect(r.status).toBe(204)
    expect(kv.list('analytics:events').length).toBe(1)
  })
})
