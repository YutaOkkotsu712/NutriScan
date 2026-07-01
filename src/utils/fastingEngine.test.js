import { describe, it, expect } from 'vitest'
import { evaluateFasting } from './fastingEngine'
import { FASTING_STATUS } from '../data/fastingProfiles'

describe('evaluateFasting', () => {
  it('marks wheat/maida products not suitable for generic Upvas', () => {
    const r = evaluateFasting('refined wheat flour, sugar, palm oil', 'hindu_upvas_generic')
    expect(r.status).toBe(FASTING_STATUS.NOT_SUITABLE)
    expect(r.restrictedHits.length).toBeGreaterThan(0)
  })

  it('marks onion/garlic root products not suitable for Jain', () => {
    const r = evaluateFasting('potato, onion, salt', 'jain_satvik')
    expect(r.status).toBe(FASTING_STATUS.NOT_SUITABLE)
  })

  it('returns depends when only ambiguous ingredients present', () => {
    const r = evaluateFasting('milk solids, sugar', 'hindu_upvas_generic')
    expect(r.status).toBe(FASTING_STATUS.DEPENDS)
  })

  it('returns unknown when no ingredient data', () => {
    const r = evaluateFasting('', 'navratri')
    expect(r.status).toBe(FASTING_STATUS.UNKNOWN)
  })

  it('carries source and confidence metadata', () => {
    const r = evaluateFasting('salt', 'ekadashi')
    expect(r.confidence).toBeDefined()
    expect(Array.isArray(r.sources)).toBe(true)
    expect(r.caveat).toMatch(/vary/i)
  })

  it('supports custom family rules', () => {
    const r = evaluateFasting('regular salt, potato', 'custom', { restrict: ['salt'], allow: ['potato'] })
    expect(r.status).toBe(FASTING_STATUS.NOT_SUITABLE)
    expect(r.confidence).toBe('high')
  })

  it('does not false-match substrings (acorn vs corn)', () => {
    const r = evaluateFasting('acorn flour', 'hindu_upvas_generic')
    // "corn" should NOT match inside "acorn"
    expect(r.restrictedHits).not.toContain('corn')
  })
})
