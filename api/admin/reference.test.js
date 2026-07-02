import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import handler from './reference.js'
import ingredientsHandler from '../ingredients/[id].js'
import { createFakeKv } from '../_lib/fakeKv.js'
import { sanitizeIngredientEntry } from '../_lib/referenceSchema.js'

const kv = createFakeKv()
const realFetch = globalThis.fetch
const ADMIN = 'test-admin-token'

function req(method, { token = ADMIN, body, query = '' } = {}) {
  return new Request(`http://localhost/api/admin/reference${query}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const VALID_ENTRY = {
  canonicalName: 'Sugar (Sucrose)',
  aliases: ['sugar', 'sucrose'],
  plainDescription: 'Updated description from the CMS.',
  function: 'Sweetener.',
  riskSummary: 'Counts toward the added-sugar limit.',
  safety: { caution: ['diabetes'], allergen: null, note: 'Limit intake.' },
  regulation: { status: 'permitted', category: 'Sweetener', confidence: 'high', source: 'FSSAI' },
  cultural: { veg: 'yes', jain: 'yes', vegan: 'depends', upvas: 'yes', veganNote: 'Bone-char refining varies.' },
  confidence: 'high',
  sources: ['WHO sugar guideline'],
  lastReviewed: '2026-07-02',
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

describe('sanitizeIngredientEntry', () => {
  it('accepts a valid entry and strips HTML', () => {
    const { entry, errors } = sanitizeIngredientEntry({ ...VALID_ENTRY, plainDescription: '<b>Bold</b> text' })
    expect(errors).toEqual([])
    expect(entry.plainDescription).toBe('Bold text')
  })
  it('requires canonicalName and at least one source', () => {
    expect(sanitizeIngredientEntry({ ...VALID_ENTRY, canonicalName: '' }).errors.length).toBeGreaterThan(0)
    expect(sanitizeIngredientEntry({ ...VALID_ENTRY, sources: [] }).errors.length).toBeGreaterThan(0)
  })
  it('drops unknown fields and coerces enums', () => {
    const { entry } = sanitizeIngredientEntry({ ...VALID_ENTRY, evil: 'x', confidence: 'ultra', cultural: { veg: 'maybe' } })
    expect(entry.evil).toBeUndefined()
    expect(entry.confidence).toBe('medium')
    expect(entry.cultural.veg).toBe('unknown')
  })
})

describe('/api/admin/reference', () => {
  it('is admin-only', async () => {
    expect((await handler(req('GET', { token: 'wrong-token-value!!' }))).status).toBe(401)
  })

  it('publishes a version, bumps versions, keeps history', async () => {
    const r1 = await handler(req('POST', { body: { id: 'sugar', entry: VALID_ENTRY } }))
    expect(r1.status).toBe(200)
    expect((await r1.json()).published.version).toBe(1)

    const r2 = await handler(req('POST', { body: { id: 'sugar', entry: { ...VALID_ENTRY, riskSummary: 'v2' } } }))
    expect((await r2.json()).published.version).toBe(2)

    const hist = await (await handler(req('GET', { query: '?id=sugar&history=1' }))).json()
    expect(hist.history.map(h => h.version)).toEqual([2, 1])
  })

  it('rejects invalid entries and bad ids', async () => {
    expect((await handler(req('POST', { body: { id: 'sugar', entry: { canonicalName: '' } } }))).status).toBe(400)
    expect((await handler(req('POST', { body: { id: '__proto__', entry: VALID_ENTRY } }))).status).toBe(400)
    expect((await handler(req('POST', { body: { id: 'Bad Id!', entry: VALID_ENTRY } }))).status).toBe(400)
  })

  it('revert republishes an old version as a new one', async () => {
    await handler(req('POST', { body: { id: 'sugar', entry: { ...VALID_ENTRY, riskSummary: 'v1 text' } } }))
    await handler(req('POST', { body: { id: 'sugar', entry: { ...VALID_ENTRY, riskSummary: 'v2 text' } } }))
    const r = await handler(req('POST', { body: { action: 'revert', id: 'sugar', version: 1 } }))
    const j = await r.json()
    expect(j.published.version).toBe(3)
    expect(j.published.revertedFrom).toBe(1)
    expect(j.published.entry.riskSummary).toBe('v1 text')
  })

  it('unpublish falls back to the base module', async () => {
    await handler(req('POST', { body: { id: 'sugar', entry: VALID_ENTRY } }))
    expect((await handler(req('POST', { body: { action: 'unpublish', id: 'sugar' } }))).status).toBe(200)
    const detail = await (await handler(req('GET', { query: '?id=sugar' }))).json()
    expect(detail.published).toBeNull()
    expect(detail.base.canonicalName).toContain('Sugar')
  })

  it('list marks published and base status, including brand-new ids', async () => {
    await handler(req('POST', { body: { id: 'new_additive', entry: { ...VALID_ENTRY, canonicalName: 'New Additive' } } }))
    const list = await (await handler(req('GET'))).json()
    const added = list.entries.find(e => e.id === 'new_additive')
    expect(added).toMatchObject({ inBase: false, published: { version: 1 } })
    const base = list.entries.find(e => e.id === 'salt')
    expect(base).toMatchObject({ inBase: true, published: null })
  })
})

describe('public /api/ingredients merge', () => {
  it('serves the published version over base, with provenance and short cache', async () => {
    await handler(req('POST', { body: { id: 'sugar', entry: { ...VALID_ENTRY, plainDescription: 'CMS text.' } } }))
    const res = await ingredientsHandler(new Request('http://localhost/api/ingredients/sugar'))
    const j = await res.json()
    expect(j.plainDescription).toBe('CMS text.')
    expect(j.published.version).toBe(1)
    expect(res.headers.get('cache-control')).toContain('s-maxage=300')
  })

  it('serves base entries untouched when nothing is published', async () => {
    const res = await ingredientsHandler(new Request('http://localhost/api/ingredients/salt'))
    const j = await res.json()
    expect(j.canonicalName).toContain('Salt')
    expect(j.published).toBeUndefined()
    expect(res.headers.get('cache-control')).toContain('s-maxage=86400')
  })

  it('includes CMS-added ingredients in /all', async () => {
    await handler(req('POST', { body: { id: 'new_additive', entry: { ...VALID_ENTRY, canonicalName: 'New Additive' } } }))
    const j = await (await ingredientsHandler(new Request('http://localhost/api/ingredients/all'))).json()
    const added = j.ingredients.find(i => i.id === 'new_additive')
    expect(added.canonicalName).toBe('New Additive')
    expect(added.published.version).toBe(1)
  })
})
