import { describe, it, expect } from 'vitest'
import { dietConflict } from './searchEngine.js'

// Alternatives must never conflict with the family diet profile — OFF's
// analysis tags are missing on many Indian products, so name/ingredients/
// category signals must catch what the tags don't ("can't show a Jain user
// bacon").
describe('dietConflict', () => {
  const p = (over = {}) => ({ product_name: '', ingredients_text: '', ingredients_analysis_tags: [], categories_tags: [], ...over })

  it('no diet preference → nothing conflicts', () => {
    expect(dietConflict(p({ product_name: 'Smoked Bacon Rashers' }), 'none')).toBe(false)
    expect(dietConflict(p(), undefined)).toBe(false)
  })

  describe('vegetarian', () => {
    it('catches explicit OFF tags', () => {
      expect(dietConflict(p({ ingredients_analysis_tags: ['en:non-vegetarian'] }), 'veg')).toBe(true)
    })
    it('catches meat by product name alone (no tags at all)', () => {
      expect(dietConflict(p({ product_name: 'Smoked Bacon Rashers' }), 'veg')).toBe(true)
      expect(dietConflict(p({ product_name: 'Chicken Seekh Kabab' }), 'veg')).toBe(true)
    })
    it('catches meat/fish/egg/gelatin in ingredients', () => {
      expect(dietConflict(p({ ingredients_text: 'sugar, gelatine, colour' }), 'veg')).toBe(true)
      expect(dietConflict(p({ ingredients_text: 'wheat flour, egg powder' }), 'veg')).toBe(true)
      expect(dietConflict(p({ ingredients_text: 'anchovy extract' }), 'veg')).toBe(true)
    })
    it('catches non-veg categories', () => {
      expect(dietConflict(p({ categories_tags: ['en:meats', 'en:hams'] }), 'veg')).toBe(true)
    })
    it('does not false-positive on eggplant, graham, or plain products', () => {
      expect(dietConflict(p({ product_name: 'Roasted Eggplant Dip' }), 'veg')).toBe(false)
      expect(dietConflict(p({ product_name: 'Graham Crackers' }), 'veg')).toBe(false)
      expect(dietConflict(p({ product_name: 'Parle-G Biscuits', ingredients_text: 'wheat flour, sugar, palm oil' }), 'veg')).toBe(false)
    })
  })

  describe('jain', () => {
    it('excludes everything a vegetarian excludes', () => {
      expect(dietConflict(p({ product_name: 'Pork Salami' }), 'jain')).toBe(true)
    })
    it('additionally excludes root vegetables and honey', () => {
      expect(dietConflict(p({ ingredients_text: 'potato, salt, oil' }), 'jain')).toBe(true)
      expect(dietConflict(p({ ingredients_text: 'onion powder, garlic powder' }), 'jain')).toBe(true)
      expect(dietConflict(p({ product_name: 'Honey Oats' }), 'jain')).toBe(true)
    })
    it('allows plain grain products', () => {
      expect(dietConflict(p({ ingredients_text: 'wheat flour, sugar, salt' }), 'jain')).toBe(false)
    })
  })

  describe('vegan', () => {
    it('catches dairy by tags, name, or ingredients', () => {
      expect(dietConflict(p({ ingredients_analysis_tags: ['en:non-vegan'] }), 'vegan')).toBe(true)
      expect(dietConflict(p({ product_name: 'Milk Chocolate Bar' }), 'vegan')).toBe(true)
      expect(dietConflict(p({ ingredients_text: 'sugar, ghee, khoya' }), 'vegan')).toBe(true)
      expect(dietConflict(p({ ingredients_text: 'oats, honey' }), 'vegan')).toBe(true)
    })
    it('allows plant milks and butters (carve-outs)', () => {
      expect(dietConflict(p({ product_name: 'Peanut Butter Crunchy' }), 'vegan')).toBe(false)
      expect(dietConflict(p({ ingredients_text: 'water, coconut milk, oat milk' }), 'vegan')).toBe(false)
      expect(dietConflict(p({ ingredients_text: 'cocoa butter, sugar' }), 'vegan')).toBe(false)
    })
    it('still flags real dairy next to plant dairy', () => {
      expect(dietConflict(p({ ingredients_text: 'coconut milk, milk solids' }), 'vegan')).toBe(true)
    })
  })
})
