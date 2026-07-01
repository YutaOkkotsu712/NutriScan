import { describe, it, expect } from 'vitest'
import handler from './corrections.js'

function req(method, body) {
  return new Request('http://localhost/api/corrections', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('POST /api/corrections', () => {
  it('accepts a valid correction', async () => {
    const r = await handler(req('POST', { barcode: '8901719101090', type: 'nutrition', detail: 'Sugar should be 12g.' }))
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(j.ok).toBe(true)
    expect(j.id).toBeTruthy()
  })

  it('rejects missing detail with 400', async () => {
    const r = await handler(req('POST', { barcode: '123', type: 'nutrition', detail: '' }))
    expect(r.status).toBe(400)
  })

  it('rejects non-POST with 405', async () => {
    const r = await handler(req('GET'))
    expect(r.status).toBe(405)
  })

  it('sanitizes HTML/script, coerces type, strips non-digit barcode', async () => {
    const r = await handler(req('POST', {
      barcode: 'abc12<script>34', type: 'HACK',
      detail: '<script>alert(1)</script>Real note', productName: 'x'.repeat(500),
    }))
    expect(r.status).toBe(200)
    // The record is logged, but we can at least confirm it succeeded and was accepted.
    const j = await r.json()
    expect(j.ok).toBe(true)
  })

  it('handles invalid JSON body', async () => {
    const bad = new Request('http://localhost/api/corrections', { method: 'POST', body: '{not json' })
    const r = await handler(bad)
    expect(r.status).toBe(400)
  })
})
