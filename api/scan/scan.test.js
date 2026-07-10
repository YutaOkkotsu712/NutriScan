// End-to-end test of the paywall boundary: real signed tokens + a fetch mock
// that routes JWKS (our test public key), OFF product, and KV to a fake store.
// Proves the 401 → 402 → 200 chain without a live Firebase or KV.
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

// One fetch mock, dispatched by URL.
function installFetch({ productFound = true, upstreamStatus = 200, upstreamBody = null, upstreamHeaders = null } = {}) {
  globalThis.fetch = (url, opts) => {
    const u = typeof url === 'string' ? url : url.url
    if (u.startsWith(KV_URL)) return kv.fetchImpl(u, opts)
    if (u === JWKS_URL) return Promise.resolve(new Response(JSON.stringify({ keys: [jwkPublic] }), { status: 200, headers: { 'content-type': 'application/json' } }))
    if (u.startsWith(OFF)) {
      if (upstreamBody !== null) {
        return Promise.resolve(new Response(upstreamBody, { status: upstreamStatus, headers: upstreamHeaders || {} }))
      }
      const body = productFound
        ? { status: 1, product: { product_name: 'Parle-G', nutriments: { sugars_100g: 20 } } }
        : { status: 0 }
      return Promise.resolve(new Response(JSON.stringify(body), { status: upstreamStatus, headers: { 'content-type': 'application/json' } }))
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

async function token(sub = 'user-1', overrides = {}) {
  return new SignJWT({ email: `${sub}@x.com`, email_verified: true })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setIssuer(overrides.iss ?? `https://securetoken.google.com/${PROJECT}`)
    .setAudience(overrides.aud ?? PROJECT)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(overrides.exp ?? '1h')
    .sign(privateKey)
}

const req = (barcode, auth) => handler(new Request(`https://zoco.app/api/scan/${barcode}`, {
  headers: auth ? { authorization: `Bearer ${auth}` } : {},
}))

describe('gated scan endpoint', () => {
  it('401 without a token', async () => {
    const r = await req('8901719101045', null)
    expect(r.status).toBe(401)
    expect((await r.json()).code).toBe('unauthenticated')
  })

  it('401 with an invalid token', async () => {
    const r = await req('8901719101045', 'not-a-jwt')
    expect(r.status).toBe(401)
  })

  it('200 + product + entitlement for a valid first scan', async () => {
    const r = await req('8901719101045', await token())
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.product.product_name).toBe('Parle-G')
    expect(body.entitlement).toMatchObject({ subscribed: false, used: 1, limit: 100, remaining: 99 })
  })

  it('does not consume a scan when OFF returns a genuine product miss', async () => {
    installFetch({ productFound: false })
    const r = await req('8901719101045', await token('missing-user'))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body).toMatchObject({ status: 0, error: 'Product not found' })
    expect(kv.strings.get('scans:missing-user')).toBeUndefined()
  })

  it('does not consume a scan when OFF returns non-JSON', async () => {
    installFetch({
      upstreamBody: '<!doctype html><title>temporarily unavailable</title>',
      upstreamHeaders: { 'content-type': 'text/html' },
    })
    const r = await req('8901719101045', await token('html-user'))
    expect(r.status).toBe(502)
    const body = await r.json()
    expect(body).toMatchObject({ status: 0, error: 'non-json-api-response' })
    expect(kv.strings.get('scans:html-user')).toBeUndefined()
  })

  it('blocks the 101st scan with 402 (paywall)', async () => {
    process.env.FIREBASE_PROJECT_ID = PROJECT
    // burn the allowance directly in KV, then attempt one more
    kv.strings.set('scans:heavy-user', '100')
    const r = await req('8901719101045', await token('heavy-user'))
    expect(r.status).toBe(402)
    const body = await r.json()
    expect(body.code).toBe('limit_reached')
    expect(body.entitlement.remaining).toBe(0)
  })

  it('meters per user — one user hitting the wall does not affect another', async () => {
    kv.strings.set('scans:capped', '100')
    expect((await req('8901719101045', await token('capped'))).status).toBe(402)
    expect((await req('8901719101045', await token('fresh'))).status).toBe(200)
  })

  it('rejects a token minted for another Firebase project', async () => {
    const r = await req('8901719101045', await token('u', { aud: 'evil-project' }))
    expect(r.status).toBe(401)
  })

  it('rejects a bad barcode after auth (no scan consumed on 400)', async () => {
    const r = await req('abc', await token('user-x'))
    expect(r.status).toBe(400)
    // consume happened before fetch? No — barcode is validated before consume.
    expect(kv.strings.get('scans:user-x')).toBeUndefined()
  })
})

describe('CORS for the native app (Capacitor)', () => {
  it('answers preflight OPTIONS from the app origin', async () => {
    const r = await handler(new Request('https://zoco.app/api/scan/8901719101045', {
      method: 'OPTIONS', headers: { origin: 'https://localhost' },
    }))
    expect(r.status).toBe(204)
    expect(r.headers.get('access-control-allow-origin')).toBe('https://localhost')
  })

  it('carries CORS headers on real responses to the app origin', async () => {
    const r = await handler(new Request('https://zoco.app/api/scan/8901719101045', {
      headers: { origin: 'https://localhost', authorization: `Bearer ${await token('cors-user')}` },
    }))
    expect(r.status).toBe(200)
    expect(r.headers.get('access-control-allow-origin')).toBe('https://localhost')
  })

  it('gives no ACAO to an arbitrary web origin (browser blocks the read)', async () => {
    const r = await handler(new Request('https://zoco.app/api/scan/8901719101045', {
      headers: { origin: 'https://evil.example.com', authorization: `Bearer ${await token('cors-user2')}` },
    }))
    expect(r.headers.get('access-control-allow-origin')).toBeNull()
  })
})
