import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import handler from './membership.js'
import { createFakeKv } from '../_lib/fakeKv.js'
import { consumeScan, getEntitlement } from '../_lib/entitlement.js'

const kv = createFakeKv()
const realFetch = globalThis.fetch
const ADMIN = 'test-admin-token'
const env = { KV_REST_API_URL: 'https://fake-kv.test', KV_REST_API_TOKEN: 'x' }

function req(method, { token = ADMIN, body } = {}) {
  return new Request('http://localhost/api/admin/membership', {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  kv.reset()
  globalThis.fetch = kv.fetchImpl
  process.env.ADMIN_TOKEN = ADMIN
  process.env.KV_REST_API_URL = env.KV_REST_API_URL
  process.env.KV_REST_API_TOKEN = env.KV_REST_API_TOKEN
})
afterAll(() => {
  globalThis.fetch = realFetch
  delete process.env.ADMIN_TOKEN; delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN
})

describe('/api/admin/membership auth', () => {
  it('401 without a token; 403 for a reviewer', async () => {
    expect((await handler(req('GET', { token: null }))).status).toBe(401)
    // reviewer via ADMIN_TOKENS would be role reviewer → 403; simulate a wrong token → 401
    expect((await handler(req('GET', { token: 'nope' }))).status).toBe(401)
  })
})

describe('free-scan limit control', () => {
  it('GET returns the current limit (default 100)', async () => {
    const j = await (await handler(req('GET'))).json()
    expect(j.freeScanLimit).toBe(100)
  })

  it('setLimit changes it and it takes effect on the meter', async () => {
    const r = await handler(req('POST', { body: { action: 'setLimit', limit: 3 } }))
    expect((await r.json()).freeScanLimit).toBe(3)
    // meter now blocks after 3
    for (let i = 0; i < 3; i++) await consumeScan('u1', env)
    expect((await consumeScan('u1', env)).allowed).toBe(false)
    // audit written
    expect(JSON.parse(kv.list('corrections:audit')[0])).toMatchObject({ kind: 'membership', action: 'set_free_scan_limit' })
  })

  it('rejects a bad limit', async () => {
    expect((await handler(req('POST', { body: { action: 'setLimit', limit: -1 } }))).status).toBe(400)
  })
})

describe('comp a user', () => {
  it('resetScans clears a user back to zero used', async () => {
    await handler(req('POST', { body: { action: 'setLimit', limit: 2 } }))
    await consumeScan('u2', env); await consumeScan('u2', env)
    expect((await consumeScan('u2', env)).allowed).toBe(false)
    const r = await handler(req('POST', { body: { action: 'resetScans', uid: 'u2' } }))
    expect(r.status).toBe(200)
    expect((await consumeScan('u2', env)).allowed).toBe(true)
    expect(JSON.parse(kv.list('corrections:audit')[0])).toMatchObject({ action: 'reset_scans', target: 'u2' })
  })

  it('lookupUser reports a user status without consuming', async () => {
    await consumeScan('u3', env)
    const j = await (await handler(req('POST', { body: { action: 'lookupUser', uid: 'u3' } }))).json()
    expect(j.entitlement).toMatchObject({ used: 1, remaining: 99 })
    expect((await getEntitlement('u3', env)).used).toBe(1) // unchanged
  })

  it('requires a uid for user actions', async () => {
    expect((await handler(req('POST', { body: { action: 'resetScans' } }))).status).toBe(400)
  })

  it('405 for other methods; 400 for unknown action', async () => {
    expect((await handler(req('DELETE'))).status).toBe(405)
    expect((await handler(req('POST', { body: { action: 'nuke' } }))).status).toBe(400)
  })
})
