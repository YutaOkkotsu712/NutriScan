import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import handler from './corrections.js'

// --- In-memory fake of the Upstash/Vercel KV REST API -----------------------
const lists = new Map()
const list = (key) => {
  if (!lists.has(key)) lists.set(key, [])
  return lists.get(key)
}

function fakeKvFetch(url, opts) {
  const [cmd, key, ...args] = JSON.parse(opts.body)
  let result = null
  if (cmd === 'LPUSH') { list(key).unshift(args[0]); result = list(key).length }
  if (cmd === 'LRANGE') { const [s, e] = args.map(Number); result = list(key).slice(s, e + 1) }
  if (cmd === 'LREM') { const i = list(key).indexOf(args[1]); if (i >= 0) list(key).splice(i, 1); result = i >= 0 ? 1 : 0 }
  if (cmd === 'LTRIM') { lists.set(key, list(key).slice(Number(args[0]), Number(args[1]) + 1)); result = 'OK' }
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
  globalThis.fetch = fakeKvFetch
  process.env.ADMIN_TOKEN = TOKEN
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
  it('503 when ADMIN_TOKEN is not configured', async () => {
    delete process.env.ADMIN_TOKEN
    expect((await handler(req('GET'))).status).toBe(503)
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
