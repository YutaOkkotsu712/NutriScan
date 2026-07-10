import { describe, it, expect } from 'vitest'
import { corsHeadersFor, handlePreflight } from './cors.js'

const req = (origin, method = 'GET') => new Request('https://zoco.app/api/scan/123', {
  method, headers: origin ? { origin } : {},
})

describe('corsHeadersFor', () => {
  it('no Origin (same-origin web) → no CORS headers needed', () => {
    expect(corsHeadersFor(req(null), {})).toEqual({})
  })

  it('allows the Capacitor app origins', () => {
    for (const o of ['https://localhost', 'capacitor://localhost', 'http://localhost']) {
      const h = corsHeadersFor(req(o), {})
      expect(h['access-control-allow-origin']).toBe(o)
      expect(h['access-control-allow-headers']).toContain('Authorization')
    }
  })

  it('blocks arbitrary web origins (no ACAO header)', () => {
    const h = corsHeadersFor(req('https://evil.example.com'), {})
    expect(h['access-control-allow-origin']).toBeUndefined()
  })

  it('honours ALLOWED_APP_ORIGINS from env', () => {
    const env = { ALLOWED_APP_ORIGINS: 'https://zoco.app, https://staging.zoco.app' }
    expect(corsHeadersFor(req('https://staging.zoco.app'), env)['access-control-allow-origin']).toBe('https://staging.zoco.app')
    expect(corsHeadersFor(req('https://other.app'), env)['access-control-allow-origin']).toBeUndefined()
  })
})

describe('handlePreflight', () => {
  it('answers OPTIONS with 204 + CORS for an allowed origin', async () => {
    const r = handlePreflight(req('https://localhost', 'OPTIONS'), {})
    expect(r.status).toBe(204)
    expect(r.headers.get('access-control-allow-origin')).toBe('https://localhost')
    expect(r.headers.get('access-control-allow-headers')).toContain('Authorization')
  })

  it('answers OPTIONS for a blocked origin without ACAO (browser will refuse)', () => {
    const r = handlePreflight(req('https://evil.example.com', 'OPTIONS'), {})
    expect(r.status).toBe(204)
    expect(r.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('returns null for non-OPTIONS', () => {
    expect(handlePreflight(req('https://localhost', 'GET'), {})).toBeNull()
  })
})
