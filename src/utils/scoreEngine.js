import { countHiddenSugars, countAdditives, getFlaggedItems } from './additiveFlags'
import { countIngredients } from './nutritionParser'

// WHO-aligned weights — 7 categories
const WEIGHTS = {
  calories: 0.12,
  sugars: 0.18,
  fats: 0.18,
  sodium: 0.17,
  fiber: 0.12,
  processing: 0.13,
  additives: 0.10,
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

// --- WHO: Free sugars <10% of energy ≈ <50g/day (<12.5g per serving, 4 servings/day) ---
function scoreSugars(nutrition) {
  const sugars = nutrition.sugars ?? null
  if (sugars === null) return { score: 5, verdict: 'Sugar content not detected on label' }

  if (sugars <= 1) return { score: 10, verdict: `Negligible sugar at ${sugars}g` }
  if (sugars <= 3) return { score: 9, verdict: `Very low sugar at ${sugars}g per serving` }
  if (sugars <= 6) return { score: 7, verdict: `Low sugar at ${sugars}g per serving` }
  if (sugars <= 10) return { score: 5, verdict: `Moderate sugar at ${sugars}g — approaching WHO limit` }
  if (sugars <= 15) return { score: 3, verdict: `${sugars}g sugar exceeds the WHO per-serving guideline (~12.5g)` }
  if (sugars <= 25) return { score: 2, verdict: `High sugar at ${sugars}g — over half the WHO daily limit of 50g` }
  return { score: 1, verdict: `Very high sugar at ${sugars}g — exceeds the WHO daily limit of 50g in one serving` }
}

// --- WHO: Total fat <30% energy ≈ <67g/day; Sat fat <10% ≈ <22g/day; Trans fat <1% ≈ <2.2g/day ---
function scoreFats(nutrition) {
  const satFat = nutrition.saturatedFat ?? null
  const transFat = nutrition.transFat ?? 0
  const totalFat = nutrition.totalFat ?? null

  // Trans fat is the worst — WHO says eliminate industrial trans fats
  if (transFat >= 1) {
    return { score: 1, verdict: `${transFat}g trans fat — WHO recommends eliminating industrial trans fats entirely` }
  }
  if (transFat >= 0.5) {
    return { score: 2, verdict: `${transFat}g trans fat is significant — WHO limit is <2.2g/day total` }
  }

  // Saturated fat check
  let satScore = 10
  let satVerdict = ''
  if (satFat !== null) {
    // WHO: <22g/day ≈ <5.5g per serving (4 servings/day)
    if (satFat <= 1) { satScore = 10; satVerdict = `Very low saturated fat at ${satFat}g` }
    else if (satFat <= 2.5) { satScore = 8; satVerdict = `Low saturated fat at ${satFat}g` }
    else if (satFat <= 5) { satScore = 6; satVerdict = `Moderate saturated fat at ${satFat}g` }
    else if (satFat <= 7) { satScore = 4; satVerdict = `${satFat}g saturated fat is above the WHO per-serving guideline (~5.5g)` }
    else { satScore = 2; satVerdict = `High saturated fat at ${satFat}g — significantly above WHO limits` }
  } else {
    satScore = 5
    satVerdict = 'Saturated fat not detected'
  }

  // Total fat check — WHO: <67g/day ≈ <17g per serving
  let fatScore = satScore
  let fatVerdict = satVerdict
  if (totalFat !== null && satFat !== null) {
    if (totalFat > 20) {
      // Very high total fat overrides a decent sat fat score
      fatScore = Math.min(fatScore, 3)
      fatVerdict = `${totalFat}g total fat is very high (WHO: <67g/day). ${satVerdict}`
    } else if (totalFat > 15) {
      fatScore = Math.min(fatScore, 5)
      fatVerdict = `${totalFat}g total fat is elevated. ${satVerdict}`
    }
  } else if (totalFat !== null && satFat === null) {
    if (totalFat <= 3) { fatScore = 9; fatVerdict = `Low total fat at ${totalFat}g` }
    else if (totalFat <= 8) { fatScore = 7; fatVerdict = `Moderate total fat at ${totalFat}g` }
    else if (totalFat <= 15) { fatScore = 5; fatVerdict = `${totalFat}g total fat` }
    else { fatScore = 3; fatVerdict = `High total fat at ${totalFat}g` }
  }

  // Trans fat trace penalty
  if (transFat > 0) {
    fatScore = Math.min(fatScore, 4)
    fatVerdict = `Trace trans fat (${transFat}g); ${fatVerdict}`
  }

  return { score: fatScore, verdict: fatVerdict }
}

// --- WHO: <2000mg sodium/day (<5g salt/day) ≈ <500mg per serving ---
function scoreSodium(nutrition) {
  const sodium = nutrition.sodium ?? null
  if (sodium === null) return { score: 5, verdict: 'Sodium content not detected on label' }

  if (sodium <= 100) return { score: 10, verdict: `Very low sodium at ${sodium}mg per serving` }
  if (sodium <= 250) return { score: 8, verdict: `Low sodium at ${sodium}mg per serving` }
  if (sodium <= 400) return { score: 6, verdict: `Moderate sodium at ${sodium}mg — within WHO guidelines` }
  if (sodium <= 600) return { score: 4, verdict: `${sodium}mg sodium is 25-30% of the WHO daily limit (2000mg)` }
  if (sodium <= 900) return { score: 2, verdict: `High sodium at ${sodium}mg — over 30% of the WHO daily limit` }
  return { score: 1, verdict: `Very high sodium at ${sodium}mg — nearly half the WHO daily limit in one serving` }
}

// --- WHO: ≥25g fiber/day ≈ ≥6g per serving (positive scoring) ---
function scoreFiber(nutrition) {
  const fiber = nutrition.fiber ?? null
  if (fiber === null) return { score: 5, verdict: 'Fiber content not detected on label' }

  if (fiber >= 8) return { score: 10, verdict: `Excellent fiber at ${fiber}g — helps meet WHO target of 25g/day` }
  if (fiber >= 5) return { score: 9, verdict: `Very good fiber at ${fiber}g per serving` }
  if (fiber >= 3) return { score: 7, verdict: `Good fiber at ${fiber}g per serving` }
  if (fiber >= 1.5) return { score: 5, verdict: `${fiber}g fiber — moderate, aim for 25g/day total` }
  if (fiber > 0) return { score: 4, verdict: `Low fiber at ${fiber}g per serving` }
  return { score: 3, verdict: `No fiber — WHO recommends ≥25g/day from whole grains, fruits, vegetables` }
}

// --- Calories/energy density scoring ---
// Based on per-serving energy. WHO doesn't set a per-product limit, but
// energy density is a key factor in obesity prevention.
function scoreCalories(nutrition) {
  const cal = nutrition.calories ?? null
  if (cal === null) return { score: 5, verdict: 'Calorie content not detected' }

  // Per-serving basis (~4 meals+snacks = ~500 kcal per eating occasion for 2000 kcal diet)
  if (cal <= 50) return { score: 10, verdict: `Very low calorie at ${cal} kcal per serving` }
  if (cal <= 120) return { score: 8, verdict: `Low calorie at ${cal} kcal per serving` }
  if (cal <= 200) return { score: 7, verdict: `Moderate calorie at ${cal} kcal — reasonable for a snack` }
  if (cal <= 350) return { score: 5, verdict: `${cal} kcal — a significant portion of daily intake (2000 kcal)` }
  if (cal <= 500) return { score: 3, verdict: `High calorie at ${cal} kcal — over a quarter of daily needs` }
  return { score: 1, verdict: `Very high calorie at ${cal} kcal per serving — over 25% of daily needs` }
}

// --- NOVA-inspired processing score ---
function scoreProcessing(ingredientText) {
  if (!ingredientText) return { score: 5, verdict: 'Ingredients list not detected — processing level unknown' }

  const count = countIngredients(ingredientText)

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
  if (score <= 6) return 'Decent'
  if (score < 8.5) return 'Good'
  return 'Excellent'
}

function getSwapSuggestion(categories) {
  const worst = Object.entries(categories).sort((a, b) => a[1].score - b[1].score)[0]

  const swaps = {
    calories: 'Look for lighter versions or smaller serving sizes to reduce calorie intake without sacrificing taste.',
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
    calories: scoreCalories(nutrition),
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
