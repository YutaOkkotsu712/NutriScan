// Tests account deletion (Play Store requirement): server data is removed for
// the authenticated uid only, an active Razorpay subscription is cancelled
// first, and a Razorpay failure never blocks the deletion.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { generateKeyPair, SignJWT, exportJWK } from 'jose'
import handler from './delete.js'
import { createFakeKv } from '../_lib/fakeKv.js'

const PROJECT = 'zoco-test'
const KV_URL = 'https://fake-kv.test'
const RZP = 'https://api.razorpay.com/v1/subscriptions'
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

const kv = createFakeKv()
const realFetch = globalThis.fetch
let privateKey, jwkPublic
let cancelCalls = []
let cancelFails = false

beforeAll(async () => {
  const { publicKey, privateKey: pk } = await generateKeyPair('RS256')
  privateKey = pk
  jwkPublic = await exportJWK(publicKey)
  jwkPublic.kid = 'test-kid'
  jwkPublic.alg = 'RS256'
  jwkPublic.use = 'sig'
})

beforeEach(() => {
  kv.reset()
  cancelCalls = []
  cancelFails = false
  process.env.FIREBASE_PROJECT_ID = PROJECT
  process.env.KV_REST_API_URL = KV_URL
  process.env.KV_REST_API_TOKEN = 'x'
  process.env.RAZORPAY_KEY_SECRET = 'secret'
  process.env.VITE_RAZORPAY_KEY_ID = 'rzp_test_key'
  process.env.RAZORPAY_PLAN_ID = 'plan_x'
  globalThis.fetch = (url, opts) => {
    const u = typeof url === 'string' ? url : url.url
    if (u.startsWith(KV_URL)) return kv.fetchImpl(u, opts)
    if (u === JWKS_URL) return Promise.resolve(new Response(JSON.stringify({ keys: [jwkPublic] }), { status: 200, headers: { 'content-type': 'application/json' } }))
    if (u.startsWith(`${RZP}/`) && u.endsWith('/cancel')) {
      cancelCalls.push(u.slice(RZP.length + 1).replace('/cancel', ''))
      return Promise.resolve(new Response(JSON.stringify(cancelFails ? { error: { description: 'boom' } } : { status: 'cancelled' }), { status: cancelFails ? 500 : 200 }))
    }
    return Promise.resolve(new Response('{}', { status: 404 }))
  }
})
afterAll(() => {
  globalThis.fetch = realFetch
  for (const k of ['FIREBASE_PROJECT_ID', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'RAZORPAY_KEY_SECRET', 'VITE_RAZORPAY_KEY_ID', 'RAZORPAY_PLAN_ID']) delete process.env[k]
})

async function token(sub = 'leaver-1') {
  return new SignJWT({ email: `${sub}@x.com`, email_verified: true })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setIssuer(`https://securetoken.google.com/${PROJECT}`)
    .setAudience(PROJECT)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey)
}

const req = (auth, method = 'POST') => handler(new Request('https://zoco.app/api/me/delete', {
  method,
  headers: auth ? { authorization: `Bearer ${auth}` } : {},
}))

describe('account deletion endpoint', () => {
  it('401 without a token', async () => {
    expect((await req(null)).status).toBe(401)
  })

  it('405 for GET', async () => {
    expect((await req(await token(), 'GET')).status).toBe(405)
  })

  it('deletes the uid’s account records and nothing else', async () => {
    kv.strings.set('rzpsub:pending:leaver-1', 'sub_p')
    kv.strings.set('scans:other-user', '7')
    const r = await req(await token())
    expect(r.status).toBe(200)
    expect((await r.json()).deleted).toBe(true)
    expect(kv.strings.get('rzpsub:pending:leaver-1')).toBeUndefined()
    expect(kv.strings.get('scans:other-user')).toBe('7') // untouched
  })

  it('does NOT reset the scan meter (paywall-bypass guard) — it only expires', async () => {
    // If deletion wiped scans:<uid>, calling this endpoint and skipping the
    // client-side Firebase delete would grant a fresh free allowance.
    kv.strings.set('scans:leaver-1', '100')
    const r = await req(await token())
    expect(r.status).toBe(200)
    expect(kv.strings.get('scans:leaver-1')).toBe('100') // still metered
  })

  it('cancels an active Razorpay subscription and removes its mapping', async () => {
    kv.strings.set('sub:leaver-1', JSON.stringify({ status: 'active', subscriptionId: 'sub_live' }))
    kv.strings.set('rzpsub:sub_live', 'leaver-1')
    const r = await req(await token())
    expect(r.status).toBe(200)
    expect(cancelCalls).toEqual(['sub_live'])
    expect(kv.strings.get('sub:leaver-1')).toBeUndefined()
    expect(kv.strings.get('rzpsub:sub_live')).toBeUndefined()
  })

  it('still deletes account records when the Razorpay cancel fails', async () => {
    cancelFails = true
    kv.strings.set('sub:leaver-1', JSON.stringify({ status: 'active', subscriptionId: 'sub_live' }))
    const r = await req(await token())
    expect(r.status).toBe(200)
    expect(kv.strings.get('sub:leaver-1')).toBeUndefined()
  })
})
