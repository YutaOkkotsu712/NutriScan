import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import handler from './webhook.js'
import { hmacSha256Hex } from '../_lib/razorpay.js'
import { createFakeKv } from '../_lib/fakeKv.js'
import { getEntitlement } from '../_lib/entitlement.js'

const kv = createFakeKv()
const realFetch = globalThis.fetch
const SECRET = 'whsec_test_123'
const env = { KV_REST_API_URL: 'https://fake-kv.test', KV_REST_API_TOKEN: 'x' }

beforeEach(() => {
  kv.reset()
  globalThis.fetch = kv.fetchImpl
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET
  process.env.KV_REST_API_URL = env.KV_REST_API_URL
  process.env.KV_REST_API_TOKEN = env.KV_REST_API_TOKEN
})
afterAll(() => {
  globalThis.fetch = realFetch
  delete process.env.RAZORPAY_WEBHOOK_SECRET
  delete process.env.KV_REST_API_URL
  delete process.env.KV_REST_API_TOKEN
})

function evt(type, entity = {}) {
  return JSON.stringify({ event: type, payload: { subscription: { entity: { id: 'sub_1', plan_id: 'plan_1', notes: { uid: 'user-1' }, ...entity } } } })
}

async function post(rawBody, signature) {
  return handler(new Request('https://zoco.app/api/subscription/webhook', {
    method: 'POST',
    headers: signature ? { 'x-razorpay-signature': signature } : {},
    body: rawBody,
  }))
}
const sign = (body) => hmacSha256Hex(SECRET, body)

describe('Razorpay webhook signature', () => {
  it('rejects a forged call with a bad signature — no membership granted', async () => {
    const body = evt('subscription.activated')
    const r = await post(body, 'deadbeef')
    expect(r.status).toBe(400)
    expect((await getEntitlement('user-1', env)).subscribed).toBe(false)
  })

  it('rejects a body tampered after signing', async () => {
    const body = evt('subscription.activated')
    const goodSig = await sign(body)
    const tampered = evt('subscription.activated', { notes: { uid: 'attacker' } })
    const r = await post(tampered, goodSig)
    expect(r.status).toBe(400)
  })

  it('503 when the webhook secret is not configured', async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET
    const body = evt('subscription.activated')
    expect((await post(body, await sign(body))).status).toBe(503)
  })
})

describe('Razorpay webhook state transitions', () => {
  it('activated → user becomes a member with a paid-through date', async () => {
    const until = 1893456000 // 2030-01-01
    const body = evt('subscription.activated', { current_end: until })
    const r = await post(body, await sign(body))
    expect(r.status).toBe(200)
    const e = await getEntitlement('user-1', env)
    expect(e.subscribed).toBe(true)
    expect(e.subscription).toMatchObject({ status: 'active', subscriptionId: 'sub_1', plan: 'plan_1' })
  })

  it('charged → extends membership (idempotent on repeat delivery)', async () => {
    const body = evt('subscription.charged', { current_end: 1893456000 })
    const s = await sign(body)
    expect((await post(body, s)).status).toBe(200)
    expect((await post(body, s)).status).toBe(200) // duplicate delivery is safe
    expect((await getEntitlement('user-1', env)).subscribed).toBe(true)
  })

  it('cancelled → membership ends', async () => {
    const on = evt('subscription.activated', { current_end: 1893456000 })
    await post(on, await sign(on))
    expect((await getEntitlement('user-1', env)).subscribed).toBe(true)
    const off = evt('subscription.cancelled')
    await post(off, await sign(off))
    expect((await getEntitlement('user-1', env)).subscribed).toBe(false)
  })

  it('acknowledges but ignores an event with no uid', async () => {
    const body = JSON.stringify({ event: 'subscription.charged', payload: { subscription: { entity: { id: 'sub_x' } } } })
    const r = await post(body, await sign(body))
    expect(r.status).toBe(200)
    expect((await r.json()).ignored).toBeTruthy()
  })

  it('405 for non-POST', async () => {
    const r = await handler(new Request('https://zoco.app/api/subscription/webhook', { method: 'GET' }))
    expect(r.status).toBe(405)
  })
})
