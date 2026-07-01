import { describe, it, expect } from 'vitest'
import { getAllowance, getPortionViews } from './demographicEngine'

describe('getAllowance', () => {
  it('computes % of daily reference from the reference table (not hardcoded)', () => {
    const { rows } = getAllowance({ sodium: 1000, sugars: 25 }, 'adultMen')
    const sodium = rows.find(r => r.key === 'sodium')
    // adultMen sodium ref = 2000 -> 1000 is 50%
    expect(sodium.pct).toBe(50)
    const sugar = rows.find(r => r.key === 'totalSugar')
    expect(sugar.pct).toBe(50) // ref 50 -> 25 is 50%
  })

  it('gives children a stricter percentage than adults for the same amount', () => {
    const adult = getAllowance({ sodium: 750 }, 'adultMen').rows.find(r => r.key === 'sodium')
    const child = getAllowance({ sodium: 750 }, 'child_4_6').rows.find(r => r.key === 'sodium')
    expect(child.pct).toBeGreaterThan(adult.pct)
  })

  it('colours high limit nutrients as veryhigh past 50%', () => {
    const { rows } = getAllowance({ sodium: 1500 }, 'adultMen')
    expect(rows.find(r => r.key === 'sodium').status).toBe('veryhigh')
  })

  it('returns teaspoons for sugar', () => {
    const { rows } = getAllowance({ sugars: 20 }, 'adultMen')
    expect(rows.find(r => r.key === 'totalSugar').teaspoons).toBe(5)
  })
})

describe('getPortionViews', () => {
  const result = {
    parsedNutrition: { calories: 100, sugars: 6, sodium: 40 },
    nutrition100g: { calories: 500, sugars: 30, sodium: 200 },
    quantity: '50 g',
    servingSize: '20 g',
    categoryTags: ['en:biscuits'],
  }

  it('always offers serving and 100g views', () => {
    const keys = getPortionViews(result).map(v => v.key)
    expect(keys).toContain('serving')
    expect(keys).toContain('100g')
  })

  it('computes whole-pack values by scaling per-100 g', () => {
    const pack = getPortionViews(result).find(v => v.key === 'pack')
    // 50 g pack -> half of per-100 g
    expect(pack.nutrition.calories).toBe(250)
  })

  it('offers a realistic Indian portion with a label', () => {
    const indian = getPortionViews(result).find(v => v.key === 'indian')
    expect(indian).toBeTruthy()
    expect(indian.note).toMatch(/biscuit/i)
  })
})
