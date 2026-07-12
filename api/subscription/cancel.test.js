// Tests subscription cancel: it cancels once at Razorpay, records the pending
// cancellation locally (willRenew=false, access kept), and is IDEMPOTENT — a
// second cancel does NOT hit Razorpay again (which would fire a repeat
// "cancelled" SMS/email). Same rig as create.test.js.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { generateKeyPair, SignJWT, exportJWK } from 'jose'
import handler from './cancel.js'
import { createFakeKv } from '../_lib/fakeKv.js'
import { setSubscription, getEntitlement } from '../_lib/entitlement.js'

const PROJECT = 'zoco-test'
const KV_URL = 'https://fake-kv.test'
const RZP = 'https://api.razorpay.com/v1/subscriptions'
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

const kv = createFakeKv()
const env = { KV_REST_API_URL: KV_URL, KV_REST_API_TOKEN: 'x' }
const realFetch = globalThis.fetch
let privateKey, jwkPublic
let cancelCalls = 0

beforeAll(async () => {
  const { publicKey, privateKey: pk } = await generateKeyPair('RS256')
  privateKey = pk
  jwkPublic = await exportJWK(publicKey)
  jwkPublic.kid = 'test-kid'; jwkPublic.alg = 'RS256'; jwkPublic.use = 'sig'
})

beforeEach(() => {
  kv.reset()
  cancelCalls = 0
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
      cancelCalls += 1
      return Promise.resolve(new Response(JSON.stringify({ status: 'cancelled' }), { status: 200 }))
    }
    return Promise.resolve(new Response('{}', { status: 404 }))
  }
})
afterAll(() => {
  globalThis.fetch = realFetch
  for (const k of ['FIREBASE_PROJECT_ID', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'RAZORPAY_KEY_SECRET', 'VITE_RAZORPAY_KEY_ID', 'RAZORPAY_PLAN_ID']) delete process.env[k]
})

async function token(sub = 'member-1') {
  return new SignJWT({ email: `${sub}@x.com`, email_verified: true })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setIssuer(`https://securetoken.google.com/${PROJECT}`).setAudience(PROJECT)
    .setSubject(sub).setIssuedAt().setExpirationTime('1h').sign(privateKey)
}
const req = (auth) => handler(new Request('https://zoco.app/api/subscription/cancel', {
  method: 'POST', headers: auth ? { authorization: `Bearer ${auth}` } : {},
}))

describe('subscription cancel', () => {
  it('401 without a token', async () => {
    expect((await req(null)).status).toBe(401)
    expect(cancelCalls).toBe(0)
  })

  it('404 when there is no subscription to cancel', async () => {
    expect((await req(await token())).status).toBe(404)
  })

  it('cancels at Razorpay, keeps access, flips willRenew, returns entitlement', async () => {
    await setSubscription(env, 'member-1', { status: 'active', until: '2099-01-01T00:00:00Z', subscriptionId: 'sub_1' })
    const r = await req(await token())
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(cancelCalls).toBe(1)
    expect(body.entitlement).toMatchObject({ subscribed: true, willRenew: false })
    expect((await getEntitlement('member-1', env)).willRenew).toBe(false)
  })

  it('is idempotent — a second cancel does NOT hit Razorpay again (no repeat SMS)', async () => {
    await setSubscription(env, 'member-1', { status: 'active', until: '2099-01-01T00:00:00Z', subscriptionId: 'sub_1' })
    await req(await token())
    expect(cancelCalls).toBe(1)
    const r2 = await req(await token())
    expect(r2.status).toBe(200)
    expect((await r2.json()).alreadyCancelled).toBe(true)
    expect(cancelCalls).toBe(1) // unchanged — Razorpay not called again
  })
})
