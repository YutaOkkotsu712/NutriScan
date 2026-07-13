// Tests the subscription-create guardrails: a signed-in user repeatedly
// hitting the endpoint must reuse their still-pending Razorpay subscription
// (not mint one per click), and outright hammering is throttled per uid.
// Same rig as scan.test.js: real signed tokens + a URL-dispatched fetch mock.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { generateKeyPair, SignJWT, exportJWK } from 'jose'
import handler from './create.js'
import { createFakeKv } from '../_lib/fakeKv.js'

const PROJECT = 'zoco-test'
const KV_URL = 'https://fake-kv.test'
const RZP = 'https://api.razorpay.com/v1/subscriptions'
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

const kv = createFakeKv()
const realFetch = globalThis.fetch
let privateKey, jwkPublic
let createCalls = 0
let subStatus = 'created' // status Razorpay reports for fetched subscriptions
let createFailsWith = null // Razorpay error description → POST /subscriptions fails
let lastCreateBody = null // body sent to Razorpay POST /subscriptions

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
  createCalls = 0
  subStatus = 'created'
  createFailsWith = null
  process.env.FIREBASE_PROJECT_ID = PROJECT
  process.env.KV_REST_API_URL = KV_URL
  process.env.KV_REST_API_TOKEN = 'x'
  process.env.RAZORPAY_KEY_SECRET = 'secret'
  process.env.VITE_RAZORPAY_KEY_ID = 'rzp_test_key'
  process.env.RAZORPAY_PLAN_ID = 'plan_x'
  process.env.RAZORPAY_PLAN_ID_MONTHLY = 'plan_m'
  process.env.RAZORPAY_PLAN_ID_QUARTERLY = 'plan_q'
  process.env.RAZORPAY_PLAN_ID_YEARLY = 'plan_y'
  lastCreateBody = null
  globalThis.fetch = (url, opts) => {
    const u = typeof url === 'string' ? url : url.url
    if (u.startsWith(KV_URL)) return kv.fetchImpl(u, opts)
    if (u === JWKS_URL) return Promise.resolve(new Response(JSON.stringify({ keys: [jwkPublic] }), { status: 200, headers: { 'content-type': 'application/json' } }))
    if (u === RZP && opts?.method === 'POST') {
      lastCreateBody = JSON.parse(opts.body)
      if (createFailsWith) {
        return Promise.resolve(new Response(JSON.stringify({ error: { description: createFailsWith } }), { status: 401 }))
      }
      createCalls += 1
      return Promise.resolve(new Response(JSON.stringify({ id: `sub_${createCalls}`, status: 'created' }), { status: 200 }))
    }
    if (u.startsWith(`${RZP}/`)) {
      const id = u.slice(RZP.length + 1)
      return Promise.resolve(new Response(JSON.stringify({ id, status: subStatus }), { status: 200 }))
    }
    return Promise.resolve(new Response('{}', { status: 404 }))
  }
})
afterAll(() => {
  globalThis.fetch = realFetch
  for (const k of ['FIREBASE_PROJECT_ID', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'RAZORPAY_KEY_SECRET', 'VITE_RAZORPAY_KEY_ID', 'RAZORPAY_PLAN_ID', 'RAZORPAY_PLAN_ID_MONTHLY', 'RAZORPAY_PLAN_ID_QUARTERLY', 'RAZORPAY_PLAN_ID_YEARLY']) delete process.env[k]
})

async function token(sub = 'payer-1') {
  return new SignJWT({ email: `${sub}@x.com`, email_verified: true })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setIssuer(`https://securetoken.google.com/${PROJECT}`)
    .setAudience(PROJECT)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey)
}

const req = (auth, plan) => handler(new Request('https://zoco.app/api/subscription/create', {
  method: 'POST',
  headers: { ...(auth ? { authorization: `Bearer ${auth}` } : {}), 'content-type': 'application/json' },
  body: JSON.stringify(plan ? { plan } : {}),
}))

describe('subscription create guardrails', () => {
  it('401 without a token', async () => {
    const r = await req(null)
    expect(r.status).toBe(401)
    expect(createCalls).toBe(0)
  })

  it('maps the chosen plan tier to the right Razorpay plan id', async () => {
    await req(await token('p-monthly'), 'monthly')
    expect(lastCreateBody.plan_id).toBe('plan_m')
    await req(await token('p-quarter'), 'quarterly')
    expect(lastCreateBody.plan_id).toBe('plan_q')
    await req(await token('p-yearly'), 'yearly')
    expect(lastCreateBody.plan_id).toBe('plan_y')
  })

  it('defaults to the yearly plan when none/invalid is given', async () => {
    await req(await token('p-default'), 'bogus')
    expect(lastCreateBody.plan_id).toBe('plan_y')
  })

  it('keeps the pending pointer per plan (different tiers do not collide)', async () => {
    await req(await token('multi'), 'monthly')
    await req(await token('multi'), 'yearly')
    expect(createCalls).toBe(2) // two different tiers → two subscriptions
    expect(kv.strings.get('rzpsub:pending:multi:monthly')).toBeTruthy()
    expect(kv.strings.get('rzpsub:pending:multi:yearly')).toBeTruthy()
  })

  it('creates a subscription and stores the uid mapping + pending pointer', async () => {
    const r = await req(await token())
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.subscriptionId).toBe('sub_1')
    expect(kv.strings.get('rzpsub:sub_1')).toBe('payer-1')
    expect(kv.strings.get('rzpsub:pending:payer-1:yearly')).toBe('sub_1')
  })

  it('reuses the pending subscription instead of creating another', async () => {
    const t = await token()
    const first = await (await req(t)).json()
    const second = await (await req(t)).json()
    expect(second.subscriptionId).toBe(first.subscriptionId)
    expect(createCalls).toBe(1)
  })

  it('creates a fresh subscription when the pending one is no longer payable', async () => {
    const t = await token()
    await req(t)
    subStatus = 'cancelled'
    const r = await (await req(t)).json()
    expect(r.subscriptionId).toBe('sub_2')
    expect(createCalls).toBe(2)
  })

  it('throttles repeated creates per uid with 429', async () => {
    const t = await token('hammer')
    kv.strings.set('rl:subcreate:hammer', '8') // window already exhausted
    const r = await req(t)
    expect(r.status).toBe(429)
    expect((await r.json()).code).toBe('rate_limited')
    expect(createCalls).toBe(0)
  })

  it('502 carries Razorpay’s error description for self-diagnosis', async () => {
    createFailsWith = 'Authentication failed'
    const r = await req(await token())
    expect(r.status).toBe(502)
    expect((await r.json()).detail).toBe('Authentication failed')
  })

  it('throttle is per uid — another user can still subscribe', async () => {
    kv.strings.set('rl:subcreate:hammer', '99')
    expect((await req(await token('hammer'))).status).toBe(429)
    expect((await req(await token('other'))).status).toBe(200)
  })
})
