// Tests the hardened search proxy: auth gate (it returns the same rich fields
// as the metered scan endpoint), server-owned `fields`, and param clamping —
// with real signed tokens and a fetch mock, same rig as scan.test.js.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { generateKeyPair, SignJWT, exportJWK } from 'jose'
import handler from './search.js'

const PROJECT = 'zoco-test'
const OFF_SEARCH = 'https://world.openfoodfacts.org/api/v2/search'
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

const realFetch = globalThis.fetch
let privateKey, jwkPublic
let lastUpstreamUrl = null

beforeAll(async () => {
  const { publicKey, privateKey: pk } = await generateKeyPair('RS256')
  privateKey = pk
  jwkPublic = await exportJWK(publicKey)
  jwkPublic.kid = 'test-kid'
  jwkPublic.alg = 'RS256'
  jwkPublic.use = 'sig'
})

beforeEach(() => {
  process.env.FIREBASE_PROJECT_ID = PROJECT
  lastUpstreamUrl = null
  globalThis.fetch = (url) => {
    const u = typeof url === 'string' ? url : url.url
    if (u === JWKS_URL) return Promise.resolve(new Response(JSON.stringify({ keys: [jwkPublic] }), { status: 200, headers: { 'content-type': 'application/json' } }))
    if (u.startsWith(OFF_SEARCH)) {
      lastUpstreamUrl = new URL(u)
      return Promise.resolve(new Response(JSON.stringify({ products: [{ code: '1' }], count: 1 }), { status: 200 }))
    }
    return Promise.resolve(new Response('{}', { status: 404 }))
  }
})
afterAll(() => {
  globalThis.fetch = realFetch
  delete process.env.FIREBASE_PROJECT_ID
})

async function token(sub = 'user-1') {
  return new SignJWT({ email: `${sub}@x.com`, email_verified: true })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setIssuer(`https://securetoken.google.com/${PROJECT}`)
    .setAudience(PROJECT)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey)
}

const req = (qs, auth) => handler(new Request(`https://zoco.app/api/search?${qs}`, {
  headers: auth ? { authorization: `Bearer ${auth}` } : {},
}))

describe('search proxy auth gate', () => {
  it('401 without a token when auth is configured', async () => {
    const r = await req('search_terms=maggi', null)
    expect(r.status).toBe(401)
    expect((await r.json()).code).toBe('unauthenticated')
    expect(lastUpstreamUrl).toBeNull() // OFF never contacted
  })

  it('401 with an invalid token', async () => {
    expect((await req('search_terms=maggi', 'not-a-jwt')).status).toBe(401)
  })

  it('200 with a valid token', async () => {
    const r = await req('search_terms=maggi', await token())
    expect(r.status).toBe(200)
    expect((await r.json()).count).toBe(1)
  })

  it('stays open when auth is not configured (dev without Firebase)', async () => {
    delete process.env.FIREBASE_PROJECT_ID
    expect((await req('search_terms=maggi', null)).status).toBe(200)
  })
})

describe('search proxy param hardening', () => {
  it('400 without search_terms or categories_tags', async () => {
    expect((await req('page=2', await token())).status).toBe(400)
  })

  it('fields is server-owned — caller cannot request extra data', async () => {
    await req('search_terms=maggi&fields=code,emb_codes,owner', await token())
    const fields = lastUpstreamUrl.searchParams.get('fields')
    expect(fields).toContain('nutriments') // the app's field set
    expect(fields).not.toContain('emb_codes')
    expect(fields).not.toContain('owner')
  })

  it('clamps page_size and page, drops unknown sort_by', async () => {
    await req('search_terms=maggi&page_size=9999&page=-5&sort_by=last_modified_t', await token())
    expect(lastUpstreamUrl.searchParams.get('page_size')).toBe('50')
    expect(lastUpstreamUrl.searchParams.get('page')).toBe('1')
    expect(lastUpstreamUrl.searchParams.get('sort_by')).toBeNull()
  })

  it('keeps the allowlisted sort and caps query length', async () => {
    await req(`search_terms=${'a'.repeat(500)}&sort_by=nutriscore_score`, await token())
    expect(lastUpstreamUrl.searchParams.get('sort_by')).toBe('nutriscore_score')
    expect(lastUpstreamUrl.searchParams.get('search_terms').length).toBe(150)
  })

  it('forwards a well-formed countries_tags market filter', async () => {
    await req('search_terms=maggi&countries_tags=en:india', await token())
    expect(lastUpstreamUrl.searchParams.get('countries_tags')).toBe('en:india')
  })

  it('drops a malformed countries_tags value', async () => {
    await req('search_terms=maggi&countries_tags=en:<script>alert(1)</script>', await token())
    expect(lastUpstreamUrl.searchParams.get('countries_tags')).toBeNull()
  })

  it('combines countries_tags with a categories_tags query (alternatives path)', async () => {
    await req('categories_tags=en:snacks&countries_tags=en:india&sort_by=nutriscore_score', await token())
    expect(lastUpstreamUrl.searchParams.get('categories_tags')).toBe('en:snacks')
    expect(lastUpstreamUrl.searchParams.get('countries_tags')).toBe('en:india')
  })

  it('does not forward arbitrary params', async () => {
    await req('search_terms=maggi&tagtype_0=states&json=1', await token())
    expect(lastUpstreamUrl.searchParams.get('tagtype_0')).toBeNull()
    expect(lastUpstreamUrl.searchParams.get('json')).toBeNull()
  })
})
