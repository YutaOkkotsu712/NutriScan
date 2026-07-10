import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createFakeKv } from './fakeKv.js'
import {
  consumeScan, getEntitlement, setSubscription, clearSubscription,
  setFreeScanLimit, getFreeScanLimit, resetScans, DEFAULT_FREE_LIMIT,
} from './entitlement.js'

const kv = createFakeKv()
const realFetch = globalThis.fetch
const env = { KV_REST_API_URL: 'https://fake-kv.test', KV_REST_API_TOKEN: 'x' }

beforeEach(() => {
  kv.reset()
  globalThis.fetch = kv.fetchImpl
})
afterAll(() => { globalThis.fetch = realFetch })

const UID = 'user-1'

describe('free-scan meter', () => {
  it('defaults to a 100-scan lifetime allowance', async () => {
    expect(await getFreeScanLimit(env)).toBe(DEFAULT_FREE_LIMIT)
    expect(DEFAULT_FREE_LIMIT).toBe(100)
  })

  it('counts down: first scan leaves 99, tracks used', async () => {
    const r = await consumeScan(UID, env)
    expect(r).toMatchObject({ allowed: true, subscribed: false, used: 1, remaining: 99 })
  })

  it('allows exactly 100 then blocks the 101st (paywall)', async () => {
    await setFreeScanLimit(env, 100)
    let last
    for (let i = 0; i < 100; i++) last = await consumeScan(UID, env)
    expect(last).toMatchObject({ allowed: true, used: 100, remaining: 0 })
    const over = await consumeScan(UID, env)
    expect(over).toMatchObject({ allowed: false, reason: 'limit_reached', remaining: 0 })
  })

  it('pins the counter so repeated blocked attempts cannot inflate it', async () => {
    await setFreeScanLimit(env, 2)
    await consumeScan(UID, env); await consumeScan(UID, env) // uses 2
    for (let i = 0; i < 20; i++) await consumeScan(UID, env) // all blocked
    const stored = Number(kv.strings.get('scans:user-1'))
    expect(stored).toBeLessThanOrEqual(3) // limit + 1, not 22
  })

  it('never meters an active subscriber', async () => {
    await setSubscription(env, UID, { status: 'active', until: null, plan: 'yearly' })
    for (let i = 0; i < 500; i++) {
      const r = await consumeScan(UID, env)
      expect(r).toMatchObject({ allowed: true, subscribed: true })
    }
    expect(kv.strings.get('scans:user-1')).toBeUndefined() // no counter touched
  })

  it('treats an expired subscription as unsubscribed (meters again)', async () => {
    await setSubscription(env, UID, { status: 'active', until: '2000-01-01T00:00:00Z', plan: 'monthly' })
    const r = await consumeScan(UID, env)
    expect(r).toMatchObject({ allowed: true, subscribed: false, used: 1 })
  })

  it('re-subscribing after hitting the wall restores unlimited scans', async () => {
    await setFreeScanLimit(env, 1)
    await consumeScan(UID, env)
    expect((await consumeScan(UID, env)).allowed).toBe(false)
    await setSubscription(env, UID, { status: 'active', until: null })
    expect((await consumeScan(UID, env)).allowed).toBe(true)
  })
})

describe('getEntitlement (read-only, no consume)', () => {
  it('reports remaining without spending a scan', async () => {
    await consumeScan(UID, env) // used 1
    const before = kv.strings.get('scans:user-1')
    const e = await getEntitlement(UID, env)
    expect(e).toMatchObject({ subscribed: false, used: 1, limit: 100, remaining: 99 })
    expect(kv.strings.get('scans:user-1')).toBe(before) // unchanged
  })

  it('shows subscribed with null remaining', async () => {
    await setSubscription(env, UID, { status: 'active', until: null, plan: 'yearly' })
    const e = await getEntitlement(UID, env)
    expect(e).toMatchObject({ subscribed: true, remaining: null })
  })
})

describe('admin controls', () => {
  it('reset comps a user back to zero used', async () => {
    await setFreeScanLimit(env, 5)
    for (let i = 0; i < 5; i++) await consumeScan(UID, env)
    expect((await consumeScan(UID, env)).allowed).toBe(false)
    await resetScans(env, UID)
    expect((await consumeScan(UID, env)).allowed).toBe(true)
  })

  it('rejects an invalid limit', async () => {
    await expect(setFreeScanLimit(env, -5)).rejects.toThrow()
    await expect(setFreeScanLimit(env, 'lots')).rejects.toThrow()
  })

  it('clearSubscription marks cancelled', async () => {
    await setSubscription(env, UID, { status: 'active', until: null })
    await clearSubscription(env, UID)
    const e = await getEntitlement(UID, env)
    expect(e.subscribed).toBe(false)
  })
})
