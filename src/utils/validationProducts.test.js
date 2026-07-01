import { describe, it, expect } from 'vitest'
import { VALIDATION_PRODUCTS } from '../data/validationProducts'
import { analyzeFood } from './scoreEngine'
import { getSuitability } from './suitabilityEngine'
import { evaluateFasting } from './fastingEngine'
import { getAllowance } from './demographicEngine'

// Spec §19: at least 20 common Indian products validated across categories.
describe('20-product validation set', () => {
  it('covers at least 20 products', () => {
    expect(VALIDATION_PRODUCTS.length).toBeGreaterThanOrEqual(20)
  })

  for (const p of VALIDATION_PRODUCTS) {
    describe(p.name, () => {
      const result = {
        ...analyzeFood(p.nutrition, p.ingredients, p.nova),
        parsedNutrition: p.nutrition,
        parsedIngredients: p.ingredients,
        categoryTags: p.category,
        novaGroup: p.nova,
        ingredientsAnalysisTags: [],
      }

      it('produces a valid overall score', () => {
        expect(result.overallScore).toBeGreaterThanOrEqual(1)
        expect(result.overallScore).toBeLessThanOrEqual(10)
        expect(Object.keys(result.categories)).toHaveLength(8)
      })

      if (p.expect.maxScore !== undefined) {
        it(`scores at or below ${p.expect.maxScore}`, () => {
          expect(result.overallScore).toBeLessThanOrEqual(p.expect.maxScore)
        })
      }
      if (p.expect.minScore !== undefined) {
        it(`scores at or above ${p.expect.minScore}`, () => {
          expect(result.overallScore).toBeGreaterThanOrEqual(p.expect.minScore)
        })
      }

      it('computes suitability for all 8 groups without throwing', () => {
        const groups = getSuitability(result)
        expect(groups).toHaveLength(8)
        for (const g of groups) expect(g.verdict).toBeTruthy()
      })

      it('evaluates fasting and allowance without throwing', () => {
        expect(() => evaluateFasting(p.ingredients, 'hindu_upvas_generic')).not.toThrow()
        expect(() => getAllowance(p.nutrition, 'adultMen')).not.toThrow()
      })
    })
  }

  it('rates a plain roasted-chana snack higher than a cola', () => {
    const chana = VALIDATION_PRODUCTS.find(p => /chana/i.test(p.name))
    const cola = VALIDATION_PRODUCTS.find(p => /cola/i.test(p.name))
    const cs = analyzeFood(chana.nutrition, chana.ingredients, chana.nova).overallScore
    const cols = analyzeFood(cola.nutrition, cola.ingredients, cola.nova).overallScore
    expect(cs).toBeGreaterThan(cols)
  })
})
