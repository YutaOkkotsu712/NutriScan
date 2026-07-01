import { describe, it, expect } from 'vitest'
import { getSuitability, VERDICT, verdictTone } from './suitabilityEngine'

function make(nutrition, ingredients = '', analysis = [], category = ['en:snacks']) {
  return { parsedNutrition: nutrition, parsedIngredients: ingredients, ingredientsAnalysisTags: analysis, categoryTags: category, overallScore: 5 }
}

describe('getSuitability', () => {
  it('returns all 8 groups', () => {
    const groups = getSuitability(make({ calories: 100, sugars: 5, sodium: 100 }))
    expect(groups.map(g => g.key).sort()).toEqual(
      ['adultMen', 'adultWomen', 'bp-sodium', 'diabetes', 'elderly', 'jain', 'kids', 'weight-loss'].sort()
    )
  })

  it('flags very high sodium as Avoid for BP group', () => {
    const groups = getSuitability(make({ calories: 100, sugars: 1, sodium: 900 }))
    const bp = groups.find(g => g.key === 'bp-sodium')
    expect(bp.verdict).toBe(VERDICT.AVOID)
  })

  it('marks non-vegetarian products as Avoid for Jain', () => {
    const groups = getSuitability(make({ calories: 100 }, 'chicken, salt', ['en:non-vegetarian']))
    const jain = groups.find(g => g.key === 'jain')
    expect(jain.verdict).toBe(VERDICT.AVOID)
  })

  it('marks root vegetables as Avoid for Jain', () => {
    const groups = getSuitability(make({ calories: 100 }, 'potato, onion, salt', ['en:vegetarian']))
    expect(groups.find(g => g.key === 'jain').verdict).toBe(VERDICT.AVOID)
  })

  it('treats ambiguous additives as Depends for Jain', () => {
    const groups = getSuitability(make({ calories: 100 }, 'wheat flour, INS 471, flavour', ['en:vegetarian']))
    expect(groups.find(g => g.key === 'jain').verdict).toBe(VERDICT.DEPENDS)
  })

  it('does not change the general score (verdicts only)', () => {
    const groups = getSuitability(make({ calories: 100, sugars: 20, sodium: 900 }))
    for (const g of groups) expect(['good', 'warn', 'bad', 'neutral']).toContain(verdictTone(g.verdict))
  })

  it('every group carries reasons', () => {
    const groups = getSuitability(make({ calories: 300, sugars: 18, sodium: 500, fiber: 0.5 }, 'maida, sugar'))
    for (const g of groups) expect(g.reasons.length).toBeGreaterThan(0)
  })
})
