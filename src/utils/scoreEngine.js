import { countHiddenSugars, countAdditives, getFlaggedItems } from './additiveFlags'

// Count distinct ingredients from a comma-separated ingredient string.
function countIngredients(ingredientText) {
  if (!ingredientText) return 0
  return ingredientText.split(/,/).filter(s => s.trim().length > 1).length
}

// WHO-aligned weights — 8 categories
const WEIGHTS = {
  calories: 0.10,
  sugars: 0.16,
  fats: 0.16,
  sodium: 0.14,
  protein: 0.10,
  fiber: 0.10,
  processing: 0.14,
  additives: 0.10,
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

// --- WHO daily limits for progress bar display ---
export const WHO_DAILY_LIMITS = {
  calories: { limit: 2000, unit: 'kcal', label: 'Calories' },
  sugars: { limit: 50, unit: 'g', label: 'Sugar' },
  totalFat: { limit: 65, unit: 'g', label: 'Total Fat' },
  saturatedFat: { limit: 22, unit: 'g', label: 'Sat. Fat' },
  transFat: { limit: 2.2, unit: 'g', label: 'Trans Fat' },
  sodium: { limit: 2000, unit: 'mg', label: 'Sodium' },
  fiber: { limit: 25, unit: 'g', label: 'Fiber', positive: true },
  protein: { limit: 50, unit: 'g', label: 'Protein', positive: true },
  totalCarbs: { limit: 300, unit: 'g', label: 'Carbs' },
}

// --- WHO: Free sugars <10% of energy ≈ <50g/day ---
function scoreSugars(nutrition) {
  const sugars = nutrition.sugars ?? null
  if (sugars === null) return { score: 5, verdict: 'Sugar content not detected on label' }

  // Also check sugar-to-fiber ratio (WHO indicator)
  const fiber = nutrition.fiber ?? 0
  const sugarFiberRatio = fiber > 0 ? sugars / fiber : sugars

  let score
  if (sugars <= 1) score = 10
  else if (sugars <= 3) score = 9
  else if (sugars <= 6) score = 7
  else if (sugars <= 10) score = 5
  else if (sugars <= 15) score = 3
  else if (sugars <= 25) score = 2
  else score = 1

  // Bonus/penalty for sugar-to-fiber ratio
  if (fiber > 0 && sugarFiberRatio < 2) score = Math.min(10, score + 1) // Good ratio
  if (sugarFiberRatio > 10) score = Math.max(1, score - 1) // Terrible ratio

  const pctDaily = Math.round((sugars / 50) * 100)
  let verdict = `${sugars}g sugar (${pctDaily}% of WHO daily limit)`
  if (fiber > 0) verdict += `. Sugar-to-fiber ratio: ${sugarFiberRatio.toFixed(1)}`

  return { score, verdict }
}

// --- WHO: Total fat <30% energy; Sat fat <10%; Trans fat <1% ---
function scoreFats(nutrition) {
  const satFat = nutrition.saturatedFat ?? null
  const transFat = nutrition.transFat ?? 0
  const totalFat = nutrition.totalFat ?? null

  if (transFat >= 1) {
    return { score: 1, verdict: `${transFat}g trans fat — WHO recommends eliminating industrial trans fats entirely` }
  }
  if (transFat >= 0.5) {
    return { score: 2, verdict: `${transFat}g trans fat is significant — WHO limit is <2.2g/day total` }
  }

  let satScore = 5
  if (satFat !== null) {
    const pctDaily = Math.round((satFat / 22) * 100)
    if (satFat <= 1) satScore = 10
    else if (satFat <= 2.5) satScore = 8
    else if (satFat <= 5) satScore = 6
    else if (satFat <= 7) satScore = 4
    else satScore = 2
  }

  let fatScore = satScore
  let parts = []

  if (totalFat !== null) {
    const fatPctDaily = Math.round((totalFat / 65) * 100)
    parts.push(`${totalFat}g total fat (${fatPctDaily}% daily)`)
    if (totalFat > 20) fatScore = Math.min(fatScore, 3)
    else if (totalFat > 15) fatScore = Math.min(fatScore, 5)
  }

  if (satFat !== null) {
    const satPctDaily = Math.round((satFat / 22) * 100)
    parts.push(`${satFat}g saturated (${satPctDaily}% daily)`)
  }

  if (transFat > 0) {
    fatScore = Math.min(fatScore, 4)
    parts.push(`${transFat}g trans fat`)
  }

  const verdict = parts.length > 0 ? parts.join(', ') : 'Fat data not detected'
  return { score: fatScore, verdict }
}

// --- WHO: <2000mg sodium/day ---
function scoreSodium(nutrition) {
  const sodium = nutrition.sodium ?? null
  if (sodium === null) return { score: 5, verdict: 'Sodium content not detected on label' }

  const pctDaily = Math.round((sodium / 2000) * 100)

  if (sodium <= 100) return { score: 10, verdict: `${sodium}mg sodium (${pctDaily}% of WHO daily limit)` }
  if (sodium <= 250) return { score: 8, verdict: `${sodium}mg sodium (${pctDaily}% daily)` }
  if (sodium <= 400) return { score: 6, verdict: `${sodium}mg sodium (${pctDaily}% daily) — within guidelines` }
  if (sodium <= 600) return { score: 4, verdict: `${sodium}mg sodium (${pctDaily}% daily) — approaching limit` }
  if (sodium <= 900) return { score: 2, verdict: `${sodium}mg sodium (${pctDaily}% daily) — high` }
  return { score: 1, verdict: `${sodium}mg sodium (${pctDaily}% daily) — very high` }
}

// --- WHO: ≥25g fiber/day (positive scoring) ---
function scoreFiber(nutrition) {
  const fiber = nutrition.fiber ?? null
  if (fiber === null) return { score: 5, verdict: 'Fiber content not detected on label' }

  const pctDaily = Math.round((fiber / 25) * 100)

  if (fiber >= 8) return { score: 10, verdict: `${fiber}g fiber (${pctDaily}% of WHO daily target of 25g)` }
  if (fiber >= 5) return { score: 9, verdict: `${fiber}g fiber (${pctDaily}% daily target)` }
  if (fiber >= 3) return { score: 7, verdict: `${fiber}g fiber (${pctDaily}% daily target)` }
  if (fiber >= 1.5) return { score: 5, verdict: `${fiber}g fiber (${pctDaily}% daily target) — moderate` }
  if (fiber > 0) return { score: 4, verdict: `${fiber}g fiber (${pctDaily}% daily target) — low` }
  return { score: 3, verdict: `No fiber — WHO recommends ≥25g/day` }
}

// --- Protein scoring (positive nutrient) ---
// WHO: 10-15% of energy ≈ 50-75g/day
function scoreProtein(nutrition) {
  const protein = nutrition.protein ?? null
  if (protein === null) return { score: 5, verdict: 'Protein content not detected' }

  const cal = nutrition.calories
  let proteinCalPct = null
  if (cal && cal > 0) {
    proteinCalPct = Math.round((protein * 4 / cal) * 100)
  }

  let score
  if (protein >= 15) score = 10
  else if (protein >= 10) score = 8
  else if (protein >= 5) score = 6
  else if (protein >= 2) score = 4
  else score = 3

  let verdict = `${protein}g protein`
  if (proteinCalPct !== null) {
    verdict += ` (${proteinCalPct}% of calories)`
    // Bonus for high protein-to-calorie ratio
    if (proteinCalPct >= 25) score = Math.min(10, score + 1)
  }

  return { score, verdict }
}

// --- Calories/energy density ---
function scoreCalories(nutrition) {
  const cal = nutrition.calories ?? null
  if (cal === null) return { score: 5, verdict: 'Calorie content not detected' }

  const pctDaily = Math.round((cal / 2000) * 100)

  if (cal <= 50) return { score: 10, verdict: `${cal} kcal (${pctDaily}% of daily 2000 kcal)` }
  if (cal <= 120) return { score: 8, verdict: `${cal} kcal (${pctDaily}% daily)` }
  if (cal <= 200) return { score: 7, verdict: `${cal} kcal (${pctDaily}% daily) — moderate snack` }
  if (cal <= 350) return { score: 5, verdict: `${cal} kcal (${pctDaily}% daily)` }
  if (cal <= 500) return { score: 3, verdict: `${cal} kcal (${pctDaily}% daily) — substantial` }
  return { score: 1, verdict: `${cal} kcal (${pctDaily}% daily) — very high for a single serving` }
}

// --- NOVA processing score ---
// Uses OFF's NOVA group if available, falls back to ingredient count
function scoreProcessing(ingredientText, novaGroup) {
  if (novaGroup) {
    const verdicts = {
      1: 'NOVA 1 — Unprocessed or minimally processed food',
      2: 'NOVA 2 — Processed culinary ingredient',
      3: 'NOVA 3 — Processed food',
      4: 'NOVA 4 — Ultra-processed food product',
    }
    const scores = { 1: 10, 2: 8, 3: 5, 4: 2 }
    return {
      score: scores[novaGroup] || 5,
      verdict: verdicts[novaGroup] || `NOVA group ${novaGroup}`,
    }
  }

  if (!ingredientText) return { score: 5, verdict: 'Ingredients list not detected — processing level unknown' }

  const count = countIngredients(ingredientText)

  if (count <= 3) return { score: 10, verdict: `Only ${count} ingredients — minimal processing` }
  if (count <= 6) return { score: 8, verdict: `${count} ingredients — lightly processed` }
  if (count <= 10) return { score: 6, verdict: `${count} ingredients — moderately processed` }
  if (count <= 15) return { score: 4, verdict: `${count} ingredients — highly processed` }
  if (count <= 25) return { score: 2, verdict: `${count} ingredients — ultra-processed` }
  return { score: 1, verdict: `${count} ingredients — heavily ultra-processed` }
}

function scoreAdditives(ingredientText) {
  if (!ingredientText) return { score: 7, verdict: 'Ingredients not detected — cannot check for additives' }

  const hiddenSugarCount = countHiddenSugars(ingredientText)
  const additiveCount = countAdditives(ingredientText)
  const total = hiddenSugarCount + additiveCount

  if (total === 0) return { score: 10, verdict: 'No hidden sugars or review-worthy additives detected' }
  if (total <= 2) return { score: 7, verdict: `${total} ingredient review item${total > 1 ? 's' : ''} found — minor concern` }
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
  return {
    worstCategory: worst[0],
    advice: SWAP_ADVICE[worst[0]] || 'Try whole, minimally processed foods when possible.',
  }
}

const SWAP_ADVICE = {
  calories: 'Look for lighter versions or smaller serving sizes.',
  sugars: 'Try fresh fruit, unsweetened yogurt, or nuts — natural sweetness without the sugar spike.',
  fats: 'Choose baked or air-fried versions with lower saturated fat.',
  sodium: 'Try herbs, spices, or lemon juice for flavor — look for "low sodium" versions.',
  protein: 'Add protein-rich foods like paneer, dal, eggs, or nuts to boost this meal.',
  fiber: 'Choose whole grain versions or add vegetables, legumes, or fruit.',
  processing: 'Look for whole-food alternatives with fewer ingredients.',
  additives: 'Choose products with recognizable ingredients.',
}

// --- Red flags / green flags ---
function getFlags(nutrition, categories) {
  const red = []
  const green = []

  for (const [key, data] of Object.entries(categories)) {
    if (data.score >= 8) {
      green.push(key)
    } else if (data.score <= 3) {
      red.push(key)
    }
  }

  // Special flags
  if (nutrition.sugars !== undefined && nutrition.fiber !== undefined && nutrition.fiber > 0) {
    const ratio = nutrition.sugars / nutrition.fiber
    if (ratio < 2) green.push('good sugar:fiber ratio')
    if (ratio > 10) red.push('terrible sugar:fiber ratio')
  }

  if (nutrition.protein !== undefined && nutrition.calories) {
    const protPct = (nutrition.protein * 4 / nutrition.calories) * 100
    if (protPct >= 25) green.push('high protein density')
  }

  return { red, green }
}

// --- Macro ratio calculation ---
export function getMacroRatio(nutrition) {
  const protein = nutrition.protein ?? 0
  const carbs = nutrition.totalCarbs ?? 0
  const fat = nutrition.totalFat ?? 0

  const proteinCal = protein * 4
  const carbsCal = carbs * 4
  const fatCal = fat * 9
  const total = proteinCal + carbsCal + fatCal

  if (total === 0) return null

  return {
    protein: Math.round((proteinCal / total) * 100),
    carbs: Math.round((carbsCal / total) * 100),
    fat: Math.round((fatCal / total) * 100),
  }
}

export function analyzeFood(nutrition, ingredientText, novaGroup) {
  const categories = {
    calories: scoreCalories(nutrition),
    sugars: scoreSugars(nutrition),
    fats: scoreFats(nutrition),
    sodium: scoreSodium(nutrition),
    protein: scoreProtein(nutrition),
    fiber: scoreFiber(nutrition),
    processing: scoreProcessing(ingredientText, novaGroup),
    additives: scoreAdditives(ingredientText),
  }

  const weighted = Math.round(
    Object.entries(WEIGHTS).reduce((sum, [key, weight]) => {
      return sum + categories[key].score * weight
    }, 0) * 10
  ) / 10

  // Severity cap: a food can't be "healthy overall" if it's extreme on a WHO
  // negative nutrient, even when a small serving keeps other categories high.
  // Without this, a cola (great on fat/sodium/calories per glass) averages ~5.3
  // despite 44% of the daily sugar limit. This is an intentional scoring
  // revision (spec §9 allows changes made deliberately in a new version).
  const cap = applySeverityCap(weighted, categories)
  const overallScore = clamp(cap.score, 1, 10)

  const flaggedItems = getFlaggedItems(ingredientText)
  const flags = getFlags(nutrition, categories)
  const swapInfo = getSwapSuggestion(categories)
  const macroRatio = getMacroRatio(nutrition)

  return {
    productName: 'Scanned Product',
    overallScore: Math.round(overallScore * 10) / 10,
    scoreLabel: getScoreLabel(overallScore),
    categories,
    swapSuggestion: swapInfo.advice,
    worstCategory: swapInfo.worstCategory,
    flaggedItems,
    flags,
    macroRatio,
    capped: cap.capped,
    capReason: cap.reason,
    source: 'offline',
  }
}

// The WHO "negative" nutrients that gate the overall score.
const CRITICAL_NEGATIVES = ['sugars', 'fats', 'sodium']

function applySeverityCap(weighted, categories) {
  const severe = CRITICAL_NEGATIVES.filter(k => (categories[k]?.score ?? 10) <= 2)
  const poor = CRITICAL_NEGATIVES.filter(k => (categories[k]?.score ?? 10) === 3)

  const labels = { sugars: 'sugar', fats: 'fat', sodium: 'sodium' }

  if (severe.length >= 2) {
    const names = severe.map(k => labels[k]).join(' and ')
    return { score: Math.min(weighted, 3.5), capped: true, reason: `Very high ${names} caps the overall score.` }
  }
  if (severe.length === 1) {
    return { score: Math.min(weighted, 4.5), capped: true, reason: `Very high ${labels[severe[0]]} caps the overall score.` }
  }
  if (poor.length >= 1) {
    return { score: Math.min(weighted, 6.0), capped: true, reason: `High ${poor.map(k => labels[k]).join(' and ')} limits the overall score.` }
  }
  return { score: weighted, capped: false, reason: null }
}
