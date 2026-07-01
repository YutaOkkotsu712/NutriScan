import { describe, it, expect } from 'vitest'
import { analyzeFood, getMacroRatio, WHO_DAILY_LIMITS } from './scoreEngine'

describe('analyzeFood', () => {
  it('scores a healthy low-sugar high-fibre food well', () => {
    const r = analyzeFood({ calories: 120, sugars: 2, saturatedFat: 0.5, sodium: 50, fiber: 8, protein: 10, totalCarbs: 20, totalFat: 2 }, 'oats, water', 1)
    expect(r.overallScore).toBeGreaterThanOrEqual(7)
    expect(r.scoreLabel).toBeDefined()
    expect(r.categories.sugars.score).toBeGreaterThanOrEqual(8)
  })

  it('penalises a sugary ultra-processed food', () => {
    const r = analyzeFood({ calories: 500, sugars: 40, saturatedFat: 12, sodium: 400, fiber: 0.5, protein: 3, totalCarbs: 60, totalFat: 25 }, 'sugar, palm oil, maida, INS 471, flavour', 4)
    expect(r.overallScore).toBeLessThan(5)
    expect(r.categories.sugars.score).toBeLessThanOrEqual(3)
    expect(r.categories.processing.score).toBeLessThanOrEqual(3)
  })

  it('clamps overall score into 1..10', () => {
    const r = analyzeFood({ calories: 0, sugars: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 }, '', 1)
    expect(r.overallScore).toBeGreaterThanOrEqual(1)
    expect(r.overallScore).toBeLessThanOrEqual(10)
  })

  it('flags industrial trans fat hard', () => {
    const r = analyzeFood({ calories: 200, sugars: 5, saturatedFat: 3, transFat: 2, sodium: 100, fiber: 2, protein: 4 }, 'x', 4)
    expect(r.categories.fats.score).toBeLessThanOrEqual(2)
  })

  it('handles missing nutrition without throwing', () => {
    expect(() => analyzeFood({}, '', null)).not.toThrow()
  })
})

describe('getMacroRatio', () => {
  it('returns percentages summing to ~100', () => {
    const m = getMacroRatio({ protein: 10, totalCarbs: 20, totalFat: 10 })
    expect(m.protein + m.carbs + m.fat).toBeGreaterThanOrEqual(98)
    expect(m.protein + m.carbs + m.fat).toBeLessThanOrEqual(102)
  })
  it('returns null when no macros', () => {
    expect(getMacroRatio({})).toBeNull()
  })
})

describe('WHO_DAILY_LIMITS', () => {
  it('marks fibre and protein as positive nutrients', () => {
    expect(WHO_DAILY_LIMITS.fiber.positive).toBe(true)
    expect(WHO_DAILY_LIMITS.protein.positive).toBe(true)
    expect(WHO_DAILY_LIMITS.sodium.positive).toBeUndefined()
  })
})
