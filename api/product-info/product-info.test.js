import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { generateKeyPair, SignJWT, exportJWK } from 'jose'
import handler from './[barcode].js'
import { createFakeKv } from '../_lib/fakeKv.js'

const PROJECT = 'zoco-test'
const KV_URL = 'https://fake-kv.test'
const OFF = 'https://world.openfoodfacts.org'
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

const kv = createFakeKv()
const realFetch = globalThis.fetch
let privateKey, jwkPublic

beforeAll(async () => {
  const { publicKey, privateKey: pk } = await generateKeyPair('RS256')
  privateKey = pk
  jwkPublic = await exportJWK(publicKey)
  jwkPublic.kid = 'test-kid'
  jwkPublic.alg = 'RS256'
  jwkPublic.use = 'sig'
})

function installFetch({ productFound = true, upstreamBody = null, upstreamHeaders = null } = {}) {
  globalThis.fetch = (url, opts) => {
    const u = typeof url === 'string' ? url : url.url
    if (u.startsWith(KV_URL)) return kv.fetchImpl(u, opts)
    if (u === JWKS_URL) {
      return Promise.resolve(new Response(JSON.stringify({ keys: [jwkPublic] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
    }
    if (u.startsWith(OFF)) {
      if (upstreamBody !== null) {
        return Promise.resolve(new Response(upstreamBody, { status: 200, headers: upstreamHeaders || {} }))
      }
      const body = productFound
        ? {
            status: 1,
            product: {
              product_name: 'Parle-G',
              brands: 'Parle',
              nutriments: { sugars_100g: 20, 'energy-kcal_100g': 450 },
              ingredients_text: 'Wheat flour, sugar, palm oil',
            },
          }
        : { status: 0 }
      return Promise.resolve(new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
    }
    return Promise.resolve(new Response('{}', { status: 404 }))
  }
}

beforeEach(() => {
  kv.reset()
  process.env.FIREBASE_PROJECT_ID = PROJECT
  process.env.KV_REST_API_URL = KV_URL
  process.env.KV_REST_API_TOKEN = 'x'
  installFetch()
})

afterAll(() => {
  globalThis.fetch = realFetch
  delete process.env.FIREBASE_PROJECT_ID
  delete process.env.KV_REST_API_URL
  delete process.env.KV_REST_API_TOKEN
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

const req = (barcode, auth) => handler(new Request(`https://zoco.app/api/product-info/${barcode}`, {
  headers: auth ? { authorization: `Bearer ${auth}` } : {},
}))

describe('product-info paywall timing', () => {
  it('consumes a scan only when returning composed product data', async () => {
    const r = await req('8901719101045', await token('composed-user'))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.product.name).toBe('Parle-G (Parle)')
    expect(body.entitlement).toMatchObject({ used: 1, remaining: 9 })
    expect(kv.strings.get('scans:composed-user')).toBe('1')
  })

  it('does not consume a scan when OFF returns a genuine product miss', async () => {
    installFetch({ productFound: false })
    const r = await req('8901719101045', await token('missing-composed-user'))
    expect(r.status).toBe(404)
    expect(await r.json()).toMatchObject({ error: 'Product not found' })
    expect(kv.strings.get('scans:missing-composed-user')).toBeUndefined()
  })

  it('does not consume a scan when OFF returns non-JSON', async () => {
    installFetch({
      upstreamBody: '<!doctype html><title>temporarily unavailable</title>',
      upstreamHeaders: { 'content-type': 'text/html' },
    })
    const r = await req('8901719101045', await token('html-composed-user'))
    expect(r.status).toBe(502)
    expect(await r.json()).toMatchObject({ error: 'non-json-api-response' })
    expect(kv.strings.get('scans:html-composed-user')).toBeUndefined()
  })
})
