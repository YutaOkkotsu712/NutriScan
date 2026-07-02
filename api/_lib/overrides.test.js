import { describe, it, expect } from 'vitest'
import { sanitizeOverride, applyOverrides } from './overrides.js'

describe('sanitizeOverride', () => {
  it('accepts whitelisted numeric fields and coerces the value', () => {
    expect(sanitizeOverride({ field: 'sugars_100g', value: '12.5' })).toEqual({ field: 'sugars_100g', value: 12.5 })
  })
  it('accepts string fields and strips HTML', () => {
    expect(sanitizeOverride({ field: 'product_name', value: '<b>Parle-G</b> Gold' }))
      .toEqual({ field: 'product_name', value: 'Parle-G Gold' })
  })
  it('rejects unknown fields, NaN, negatives, and empty strings', () => {
    expect(sanitizeOverride({ field: 'code', value: 1 })).toBeNull()
    expect(sanitizeOverride({ field: 'sodium_100g', value: 'high' })).toBeNull()
    expect(sanitizeOverride({ field: 'sodium_100g', value: -3 })).toBeNull()
    expect(sanitizeOverride({ field: 'product_name', value: '<script></script>' })).toBeNull()
    expect(sanitizeOverride(null)).toBeNull()
  })
})

describe('applyOverrides', () => {
  const overrides = {
    barcode: '123456',
    version: 3,
    updatedAt: '2026-07-02T00:00:00Z',
    fields: {
      'sodium_100g': { value: 1.15, correctionId: 'c1', reviewer: 'asha', ts: '2026-07-02T00:00:00Z' },
      'product_name': { value: 'Fixed Name', correctionId: 'c2', reviewer: 'asha', ts: '2026-07-02T00:00:00Z' },
    },
  }

  it('merges nutriments (suffixed + alias) and top-level fields, stamps provenance', () => {
    const product = { product_name: 'Old', nutriments: { sodium_100g: 1.05, sodium: 1.05 } }
    applyOverrides(product, overrides)
    expect(product.nutriments.sodium_100g).toBe(1.15)
    expect(product.nutriments.sodium).toBe(1.15)
    expect(product.product_name).toBe('Fixed Name')
    expect(product.nutriscan_corrected).toEqual({ fields: ['sodium_100g', 'product_name'], version: 3, updatedAt: '2026-07-02T00:00:00Z' })
  })

  it('ignores non-whitelisted fields smuggled into a stored record', () => {
    const product = { nutriments: {} }
    applyOverrides(product, { fields: { code: { value: '999' }, '__proto__x': { value: 1 } } })
    expect(product.nutriscan_corrected).toBeUndefined()
  })

  it('is a no-op without overrides', () => {
    const product = { nutriments: {} }
    expect(applyOverrides(product, null)).toBe(product)
    expect(product.nutriscan_corrected).toBeUndefined()
  })
})
