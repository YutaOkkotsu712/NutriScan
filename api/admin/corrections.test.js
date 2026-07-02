import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import handler from './corrections.js'

// --- In-memory fake of the Upstash/Vercel KV REST API -----------------------
const lists = new Map()
const strings = new Map()
const list = (key) => {
  if (!lists.has(key)) lists.set(key, [])
  return lists.get(key)
}

function fakeKvFetch(url, opts) {
  const [cmd, key, ...args] = JSON.parse(opts.body)
  let result = null
  if (cmd === 'SET') { strings.set(key, String(args[0])); result = 'OK' }
  if (cmd === 'GET') result = strings.has(key) ? strings.get(key) : null
  if (cmd === 'LPUSH') { list(key).unshift(args[0]); result = list(key).length }
  if (cmd === 'LRANGE') { const [s, e] = args.map(Number); result = list(key).slice(s, e + 1) }
  if (cmd === 'LREM') { const i = list(key).indexOf(args[1]); if (i >= 0) list(key).splice(i, 1); result = i >= 0 ? 1 : 0 }
  if (cmd === 'LTRIM') { lists.set(key, list(key).slice(Number(args[0]), Number(args[1]) + 1)); result = 'OK' }
  if (cmd === 'INCR') { const n = Number(strings.get(key) || 0) + 1; strings.set(key, String(n)); result = n }
  if (cmd === 'EXPIRE') result = 1
  return Promise.resolve(new Response(JSON.stringify({ result }), { status: 200 }))
}

const realFetch = globalThis.fetch
const savedEnv = { ...process.env }

const TOKEN = 'test-admin-token'

function req(method, { token = TOKEN, body, query = '' } = {}) {
  return new Request(`http://localhost/api/admin/corrections${query}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  lists.clear()
  strings.clear()
  globalThis.fetch = fakeKvFetch
  process.env.ADMIN_TOKEN = TOKEN
  delete process.env.ADMIN_TOKENS
  process.env.KV_REST_API_URL = 'https://fake-kv.test'
  process.env.KV_REST_API_TOKEN = 'fake-kv-token'
})

afterAll(() => {
  globalThis.fetch = realFetch
  delete process.env.ADMIN_TOKEN
  delete process.env.KV_REST_API_URL
  delete process.env.KV_REST_API_TOKEN
  Object.assign(process.env, savedEnv)
})

const queued = (id = 'rec-1') => JSON.stringify({
  id, ts: '2026-07-01T00:00:00Z', status: 'needs_review',
  type: 'nutrition', barcode: '8901719101090', detail: 'Sugar should be 12g.',
})

describe('/api/admin/corrections auth', () => {
  it('503 when no credential source exists at all', async () => {
    delete process.env.ADMIN_TOKEN
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
    expect((await handler(req('GET'))).status).toBe(503)
  })

  it('401 when ADMIN_TOKEN is unset but KV users could exist', async () => {
    delete process.env.ADMIN_TOKEN
    expect((await handler(req('GET'))).status).toBe(401)
  })

  it('401 without a token', async () => {
    expect((await handler(req('GET', { token: null }))).status).toBe(401)
  })

  it('401 with a wrong token', async () => {
    expect((await handler(req('GET', { token: 'wrong-token-value!' }))).status).toBe(401)
  })

  it('503 when KV is not configured', async () => {
    delete process.env.KV_REST_API_URL
    expect((await handler(req('GET'))).status).toBe(503)
  })
})

describe('GET /api/admin/corrections', () => {
  it('lists the queue, parsed', async () => {
    list('corrections:queue').unshift(queued())
    const r = await handler(req('GET'))
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(j.view).toBe('queue')
    expect(j.count).toBe(1)
    expect(j.items[0].id).toBe('rec-1')
  })

  it('serves archive and audit views', async () => {
    list('corrections:audit').unshift(JSON.stringify({ action: 'approve' }))
    const j = await (await handler(req('GET', { query: '?view=audit' }))).json()
    expect(j.view).toBe('audit')
    expect(j.items[0].action).toBe('approve')
  })
})

describe('POST /api/admin/corrections', () => {
  it('approve moves the record to archive with an audit entry', async () => {
    list('corrections:queue').unshift(queued())
    const r = await handler(req('POST', { body: { id: 'rec-1', action: 'approve', note: 'Verified vs label <b>photo</b>' } }))
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(j.record.status).toBe('approved')
    expect(j.record.reviewNote).toBe('Verified vs label photo') // HTML stripped
    expect(list('corrections:queue')).toHaveLength(0)
    expect(JSON.parse(list('corrections:archive')[0]).id).toBe('rec-1')
    const audit = JSON.parse(list('corrections:audit')[0])
    expect(audit).toMatchObject({ correctionId: 'rec-1', action: 'approve', barcode: '8901719101090' })
  })

  it('reject marks the record rejected', async () => {
    list('corrections:queue').unshift(queued('rec-2'))
    const j = await (await handler(req('POST', { body: { id: 'rec-2', action: 'reject' } }))).json()
    expect(j.record.status).toBe('rejected')
  })

  it('404 for an unknown id', async () => {
    expect((await handler(req('POST', { body: { id: 'nope', action: 'approve' } }))).status).toBe(404)
  })

  it('400 for a bad action or missing id', async () => {
    expect((await handler(req('POST', { body: { id: 'rec-1', action: 'delete-everything' } }))).status).toBe(400)
    expect((await handler(req('POST', { body: { action: 'approve' } }))).status).toBe(400)
  })

  it('405 for other methods', async () => {
    expect((await handler(req('DELETE'))).status).toBe(405)
  })
})

describe('auth brute-force guard', () => {
  const attempt = (token, ip) => handler(new Request('http://localhost/api/admin/corrections', {
    method: 'GET',
    headers: { authorization: `Bearer ${token}`, 'x-real-ip': ip },
  }))

  it('blocks an IP after 30 failed attempts, even with a valid token', async () => {
    for (let i = 0; i < 31; i++) {
      expect((await attempt('wrong-token-guess!!', '203.0.113.9')).status).toBe(401)
    }
    // Window tripped: further attempts from this IP are throttled...
    expect((await attempt('wrong-token-guess!!', '203.0.113.9')).status).toBe(429)
    expect((await attempt(TOKEN, '203.0.113.9')).status).toBe(429)
    // ...but another IP is unaffected.
    expect((await attempt(TOKEN, '198.51.100.7')).status).toBe(200)
  })
})

describe('named reviewer tokens (ADMIN_TOKENS)', () => {
  it('authenticates a named reviewer and records identity in archive + audit', async () => {
    process.env.ADMIN_TOKENS = 'asha:asha-secret-token,ravi:ravi-secret-token'
    list('corrections:queue').unshift(queued('rec-3'))
    const r = await handler(req('POST', { token: 'ravi-secret-token', body: { id: 'rec-3', action: 'approve' } }))
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(j.record.reviewedBy).toBe('ravi')
    expect(JSON.parse(list('corrections:audit')[0]).reviewer).toBe('ravi')
  })

  it('shared ADMIN_TOKEN still works and audits as "admin"', async () => {
    list('corrections:queue').unshift(queued('rec-4'))
    const j = await (await handler(req('POST', { body: { id: 'rec-4', action: 'reject' } }))).json()
    expect(j.record.reviewedBy).toBe('admin')
  })

  it('works with ADMIN_TOKENS alone (no ADMIN_TOKEN)', async () => {
    delete process.env.ADMIN_TOKEN
    process.env.ADMIN_TOKENS = 'asha:asha-secret-token'
    expect((await handler(req('GET', { token: 'asha-secret-token' }))).status).toBe(200)
    expect((await handler(req('GET', { token: 'wrong' }))).status).toBe(401)
  })
})

describe('data overrides on approve', () => {
  it('approve with a valid override writes a versioned overrides record', async () => {
    list('corrections:queue').unshift(queued('rec-5'))
    const r = await handler(req('POST', {
      body: { id: 'rec-5', action: 'approve', override: { field: 'sodium_100g', value: '1.15' } },
    }))
    expect(r.status).toBe(200)
    const stored = JSON.parse(strings.get('overrides:8901719101090'))
    expect(stored.version).toBe(1)
    expect(stored.fields['sodium_100g']).toMatchObject({ value: 1.15, correctionId: 'rec-5', reviewer: 'admin' })
  })

  it('a second override on the same product bumps the version and keeps both fields', async () => {
    list('corrections:queue').unshift(queued('rec-6'))
    await handler(req('POST', { body: { id: 'rec-6', action: 'approve', override: { field: 'sugars_100g', value: 12 } } }))
    list('corrections:queue').unshift(queued('rec-7'))
    await handler(req('POST', { body: { id: 'rec-7', action: 'approve', override: { field: 'product_name', value: 'Corrected Name' } } }))
    const stored = JSON.parse(strings.get('overrides:8901719101090'))
    expect(stored.version).toBe(2)
    expect(stored.fields['sugars_100g'].value).toBe(12)
    expect(stored.fields['product_name'].value).toBe('Corrected Name')
  })

  it('rejects overrides on non-whitelisted fields or bad values', async () => {
    list('corrections:queue').unshift(queued('rec-8'))
    expect((await handler(req('POST', {
      body: { id: 'rec-8', action: 'approve', override: { field: '__proto__', value: 1 } },
    }))).status).toBe(400)
    expect((await handler(req('POST', {
      body: { id: 'rec-8', action: 'approve', override: { field: 'sodium_100g', value: 'lots' } },
    }))).status).toBe(400)
  })

  it('rejects overrides attached to a reject action', async () => {
    list('corrections:queue').unshift(queued('rec-9'))
    expect((await handler(req('POST', {
      body: { id: 'rec-9', action: 'reject', override: { field: 'sodium_100g', value: 1 } },
    }))).status).toBe(400)
  })
})
