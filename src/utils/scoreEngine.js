import { countHiddenSugars, countAdditives, getFlaggedItems } from './additiveFlags'
import { countIngredients } from './nutritionParser'

const WEIGHTS = {
  sugars: 0.20,
  fats: 0.20,
  sodium: 0.20,
  fiber: 0.15,
  processing: 0.15,
  additives: 0.10,
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

function scoreSugars(nutrition) {
  const sugars = nutrition.sugars ?? null
  if (sugars === null) return { score: 5, verdict: 'Sugar content not detected on label' }

  // WHO: <10% daily energy ≈ 12g per serving as rough threshold
  if (sugars <= 2) return { score: 10, verdict: `Very low sugar at ${sugars}g per serving` }
  if (sugars <= 5) return { score: 8, verdict: `Low sugar at ${sugars}g per serving` }
  if (sugars <= 8) return { score: 7, verdict: `Moderate sugar at ${sugars}g per serving` }
  if (sugars <= 12) return { score: 5, verdict: `${sugars}g sugar is near the WHO limit of 12g per serving` }
  if (sugars <= 20) return { score: 3, verdict: `${sugars}g sugar exceeds the WHO recommended limit` }
  return { score: 1, verdict: `Very high sugar at ${sugars}g — over 1.5x the WHO limit per serving` }
}

function scoreFats(nutrition) {
  const satFat = nutrition.saturatedFat ?? null
  const transFat = nutrition.transFat ?? 0

  if (transFat >= 0.5) {
    return { score: 1, verdict: `Contains ${transFat}g trans fat — WHO recommends eliminating industrial trans fats` }
  }

  if (transFat > 0) {
    return { score: 4, verdict: `Trace trans fat at ${transFat}g; choose products with 0g trans fat when possible` }
  }

  if (satFat === null) return { score: 5, verdict: 'Saturated fat content not detected on label' }

  // WHO: <10% daily energy ≈ <4.4g per serving (based on ~20g/day over ~4.5 servings)
  if (satFat <= 1) return { score: 10, verdict: `Very low saturated fat at ${satFat}g` }
  if (satFat <= 2) return { score: 8, verdict: `Low saturated fat at ${satFat}g` }
  if (satFat <= 4) return { score: 6, verdict: `Moderate saturated fat at ${satFat}g per serving` }
  if (satFat <= 6) return { score: 4, verdict: `${satFat}g saturated fat is above the WHO guideline` }
  return { score: 2, verdict: `High saturated fat at ${satFat}g — significantly above WHO limits` }
}

function scoreSodium(nutrition) {
  const sodium = nutrition.sodium ?? null
  if (sodium === null) return { score: 5, verdict: 'Sodium content not detected on label' }

  // WHO: <2000mg/day — flag >600mg per serving (≈30% daily limit)
  if (sodium <= 140) return { score: 10, verdict: `Very low sodium at ${sodium}mg per serving` }
  if (sodium <= 300) return { score: 8, verdict: `Low sodium at ${sodium}mg per serving` }
  if (sodium <= 450) return { score: 6, verdict: `Moderate sodium at ${sodium}mg per serving` }
  if (sodium <= 600) return { score: 4, verdict: `${sodium}mg sodium is reaching 30% of the WHO daily limit` }
  if (sodium <= 900) return { score: 2, verdict: `High sodium at ${sodium}mg — over 30% of the WHO daily limit in one serving` }
  return { score: 1, verdict: `Very high sodium at ${sodium}mg — nearly half the WHO daily limit in one serving` }
}

function scoreFiber(nutrition) {
  const fiber = nutrition.fiber ?? null
  if (fiber === null) return { score: 5, verdict: 'Fiber content not detected on label' }

  // WHO: target 25g/day — reward >3g per serving
  if (fiber >= 7) return { score: 10, verdict: `Excellent fiber at ${fiber}g per serving` }
  if (fiber >= 5) return { score: 9, verdict: `Very good fiber content at ${fiber}g per serving` }
  if (fiber >= 3) return { score: 7, verdict: `Good fiber at ${fiber}g per serving` }
  if (fiber >= 1) return { score: 5, verdict: `${fiber}g fiber — moderate, could be higher` }
  return { score: 3, verdict: `Very low fiber at ${fiber}g per serving` }
}

function scoreProcessing(ingredientText) {
  if (!ingredientText) return { score: 5, verdict: 'Ingredients list not detected — processing level unknown' }

  const count = countIngredients(ingredientText)

  // NOVA-inspired: fewer ingredients = less processed
  if (count <= 3) return { score: 10, verdict: `Only ${count} ingredients — minimal processing (NOVA 1-2)` }
  if (count <= 6) return { score: 8, verdict: `${count} ingredients — lightly processed` }
  if (count <= 10) return { score: 6, verdict: `${count} ingredients — moderately processed` }
  if (count <= 15) return { score: 4, verdict: `${count} ingredients — highly processed (NOVA 3-4)` }
  if (count <= 25) return { score: 2, verdict: `${count} ingredients — ultra-processed food (NOVA 4)` }
  return { score: 1, verdict: `${count} ingredients — heavily ultra-processed (NOVA 4)` }
}

function scoreAdditives(ingredientText) {
  if (!ingredientText) return { score: 7, verdict: 'Ingredients not detected — cannot check for additives' }

  const hiddenSugarCount = countHiddenSugars(ingredientText)
  const additiveCount = countAdditives(ingredientText)
  const total = hiddenSugarCount + additiveCount

  if (total === 0) return { score: 10, verdict: 'No hidden sugars or review-worthy additives detected' }
  if (total === 1) return { score: 7, verdict: '1 ingredient review item found — minor concern' }
  if (total <= 2) return { score: 7, verdict: `${total} ingredient review items found — minor concern` }
  if (total <= 4) return { score: 5, verdict: `${total} ingredient review items found` }
  if (total <= 7) return { score: 3, verdict: `${total} concerning ingredient markers detected` }
  return { score: 1, verdict: `${total} flagged ingredient markers — heavily processed profile` }
}

function getScoreLabel(score) {
  if (score <= 2) return 'Avoid'
  if (score <= 3) return 'Poor'
  if (score <= 4) return 'Below Average'
  if (score <= 5) return 'Average'
  if (score < 8.5) return 'Good'
  return 'Excellent'
}

function getSwapSuggestion(categories) {
  const worst = Object.entries(categories).sort((a, b) => a[1].score - b[1].score)[0]

  const swaps = {
    sugars: 'Try fresh fruit, unsweetened yogurt, or nuts instead — natural sweetness without the added sugar spike.',
    fats: 'Look for baked or air-fried versions with lower saturated fat, or choose snacks cooked with minimal oil.',
    sodium: 'Try herbs, spices, or lemon juice for flavor instead — look for "low sodium" or "no salt added" versions.',
    fiber: 'Choose whole grain versions, or add a side of vegetables, legumes, or fruit to boost your fiber intake.',
    processing: 'Look for whole-food alternatives with fewer ingredients — the fewer items on the label, the better.',
    additives: 'Choose products with recognizable ingredients — if you can\'t pronounce it, your body probably doesn\'t need it.',
  }

  return swaps[worst[0]] || 'Try whole, minimally processed foods when possible for better nutrition.'
}

export function analyzeFood(nutrition, ingredientText) {
  const categories = {
    sugars: scoreSugars(nutrition),
    fats: scoreFats(nutrition),
    sodium: scoreSodium(nutrition),
    fiber: scoreFiber(nutrition),
    processing: scoreProcessing(ingredientText),
    additives: scoreAdditives(ingredientText),
  }

  const overallScore = Math.round(
    Object.entries(WEIGHTS).reduce((sum, [key, weight]) => {
      return sum + categories[key].score * weight
    }, 0) * 10
  ) / 10

  const flaggedItems = getFlaggedItems(ingredientText)

  return {
    productName: 'Scanned Product',
    overallScore: clamp(Math.round(overallScore * 10) / 10, 1, 10),
    scoreLabel: getScoreLabel(overallScore),
    categories,
    swapSuggestion: getSwapSuggestion(categories),
    flaggedItems,
    source: 'offline',
  }
}
