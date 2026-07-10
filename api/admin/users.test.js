import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import handler from './users.js'
import { createFakeKv } from '../_lib/fakeKv.js'
import { sha256Hex, USERS_KEY } from '../_lib/auth.js'

const kv = createFakeKv()
const realFetch = globalThis.fetch
const ADMIN = 'test-admin-token'

function req(method, { token = ADMIN, body } = {}) {
  return new Request('http://localhost/api/admin/users', {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  kv.reset()
  globalThis.fetch = kv.fetchImpl
  process.env.ADMIN_TOKEN = ADMIN
  delete process.env.ADMIN_TOKENS
  process.env.KV_REST_API_URL = 'https://fake-kv.test'
  process.env.KV_REST_API_TOKEN = 'fake-kv-token'
})

afterAll(() => {
  globalThis.fetch = realFetch
  delete process.env.ADMIN_TOKEN
  delete process.env.KV_REST_API_URL
  delete process.env.KV_REST_API_TOKEN
})

describe('/api/admin/users', () => {
  it('401 without credentials, 405 on other methods', async () => {
    expect((await handler(req('GET', { token: null }))).status).toBe(401)
    expect((await handler(req('DELETE'))).status).toBe(405)
  })

  it('creates a user, returns the token exactly once, stores only the hash', async () => {
    const r = await handler(req('POST', { body: { name: 'asha', role: 'reviewer' } }))
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(j.token).toMatch(/^[0-9a-f]{64}$/)
    expect(j.user).toMatchObject({ name: 'asha', role: 'reviewer', disabled: false, createdBy: 'admin' })
    const stored = JSON.parse(kv.strings.get(USERS_KEY))
    expect(stored.asha.tokenHash).toBe(await sha256Hex(j.token))
    expect(JSON.stringify(stored)).not.toContain(j.token)
    // audit entry written
    expect(JSON.parse(kv.list('corrections:audit')[0])).toMatchObject({ kind: 'user', action: 'user_create', target: 'asha' })
  })

  it('created reviewer can authenticate on the corrections API but not manage users', async () => {
    const { token } = await (await handler(req('POST', { body: { name: 'ravi', role: 'reviewer' } }))).json()
    // reviewer can hit corrections (auth shared): reuse users handler to check 403 role gate
    const r = await handler(req('GET', { token }))
    expect(r.status).toBe(403)
    const corrections = (await import('./corrections.js')).default
    const c = await corrections(new Request('http://localhost/api/admin/corrections', {
      headers: { authorization: `Bearer ${token}` },
    }))
    expect(c.status).toBe(200)
    expect((await c.json()).me).toEqual({ name: 'ravi', role: 'reviewer' })
  })

  it('disabled users stop authenticating; enable restores them', async () => {
    const { token } = await (await handler(req('POST', { body: { name: 'meera', role: 'admin' } }))).json()
    expect((await handler(req('GET', { token }))).status).toBe(200)
    await handler(req('POST', { body: { action: 'disable', name: 'meera' } }))
    expect((await handler(req('GET', { token }))).status).toBe(401)
    await handler(req('POST', { body: { action: 'enable', name: 'meera' } }))
    expect((await handler(req('GET', { token }))).status).toBe(200)
  })

  it('rejects bad names, bad roles and duplicates', async () => {
    expect((await handler(req('POST', { body: { name: 'x', role: 'reviewer' } }))).status).toBe(400)
    expect((await handler(req('POST', { body: { name: 'valid-name', role: 'root' } }))).status).toBe(400)
    await handler(req('POST', { body: { name: 'dup', role: 'reviewer' } }))
    expect((await handler(req('POST', { body: { name: 'dup', role: 'admin' } }))).status).toBe(409)
  })

  it('reserves env bootstrap identities (audit ambiguity guard)', async () => {
    expect((await handler(req('POST', { body: { name: 'admin', role: 'reviewer' } }))).status).toBe(409)
    process.env.ADMIN_TOKENS = 'Asha:some-env-token'
    expect((await handler(req('POST', { body: { name: 'asha', role: 'reviewer' } }))).status).toBe(409)
    delete process.env.ADMIN_TOKENS
  })

  it('GET lists users without hashes', async () => {
    await handler(req('POST', { body: { name: 'asha', role: 'reviewer' } }))
    const j = await (await handler(req('GET'))).json()
    expect(j.count).toBe(1)
    expect(j.users[0].name).toBe('asha')
    expect(JSON.stringify(j)).not.toContain('tokenHash')
  })

  it('delete removes the user', async () => {
    const { token } = await (await handler(req('POST', { body: { name: 'temp', role: 'reviewer' } }))).json()
    await handler(req('POST', { body: { action: 'delete', name: 'temp' } }))
    const corrections = (await import('./corrections.js')).default
    const c = await corrections(new Request('http://localhost/api/admin/corrections', {
      headers: { authorization: `Bearer ${token}` },
    }))
    expect(c.status).toBe(401)
  })
})

describe('last-admin lockout guard (KV-only auth, no env tokens)', () => {
  // Seed KV users directly: { name: { token, role, disabled } }
  async function seedUsers(defs) {
    const users = {}
    for (const [name, def] of Object.entries(defs)) {
      users[name] = {
        tokenHash: await sha256Hex(def.token),
        role: def.role,
        disabled: Boolean(def.disabled),
        createdAt: '2026-01-01T00:00:00Z',
        createdBy: 'test',
      }
    }
    kv.strings.set(USERS_KEY, JSON.stringify(users))
  }

  beforeEach(() => {
    delete process.env.ADMIN_TOKEN // KV users are the only way in
  })

  it('refuses to delete or disable the last enabled admin', async () => {
    await seedUsers({ asha: { token: 'tok-asha', role: 'admin' } })
    const del = await handler(req('POST', { token: 'tok-asha', body: { action: 'delete', name: 'asha' } }))
    expect(del.status).toBe(400)
    expect((await del.json()).error).toMatch(/last active admin/)
    expect((await handler(req('POST', { token: 'tok-asha', body: { action: 'disable', name: 'asha' } }))).status).toBe(400)
  })

  it('a disabled admin does not count as a remaining way in', async () => {
    await seedUsers({
      asha: { token: 'tok-asha', role: 'admin' },
      ravi: { token: 'tok-ravi', role: 'admin', disabled: true },
    })
    expect((await handler(req('POST', { token: 'tok-asha', body: { action: 'delete', name: 'asha' } }))).status).toBe(400)
  })

  it('allows removal when another enabled admin exists', async () => {
    await seedUsers({
      asha: { token: 'tok-asha', role: 'admin' },
      ravi: { token: 'tok-ravi', role: 'admin' },
    })
    expect((await handler(req('POST', { token: 'tok-asha', body: { action: 'delete', name: 'ravi' } }))).status).toBe(200)
  })

  it('allows removing the last KV admin when an env bootstrap token exists', async () => {
    process.env.ADMIN_TOKEN = 'env-bootstrap'
    await seedUsers({ asha: { token: 'tok-asha', role: 'admin' } })
    expect((await handler(req('POST', { token: 'tok-asha', body: { action: 'delete', name: 'asha' } }))).status).toBe(200)
  })

  it('reviewers can always be removed', async () => {
    await seedUsers({
      asha: { token: 'tok-asha', role: 'admin' },
      maya: { token: 'tok-maya', role: 'reviewer' },
    })
    expect((await handler(req('POST', { token: 'tok-asha', body: { action: 'delete', name: 'maya' } }))).status).toBe(200)
  })
})
