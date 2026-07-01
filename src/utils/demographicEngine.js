// ============================================================================
// Demographic Engine — nutrient amount vs daily reference by demographic (§6).
//
// Turns raw nutrition numbers into "X% of the selected group's daily reference"
// with a colour-coded status. The percentage is always computed from the
// reference database, never hardcoded (§6.3).
// ============================================================================

import {
  DEMOGRAPHIC_REFERENCE,
  NUTRIENT_DIRECTION,
  NUTRIENT_UNITS,
  NUTRIENT_LABELS,
  ALLOWANCE_NUTRIENT_ORDER,
  getReference,
} from '../data/nutrientReference'

// Map our internal nutrition keys -> reference nutrient keys.
// nutrition object uses: calories, sugars, saturatedFat, transFat, sodium, protein, fiber, totalCarbs
function readNutritionValue(nutrition, nutrientKey) {
  switch (nutrientKey) {
    case 'calories': return nutrition.calories
    case 'sodium': return nutrition.sodium
    case 'addedSugar': return nutrition.addedSugars // often absent in OFF
    case 'totalSugar': return nutrition.sugars
    case 'saturatedFat': return nutrition.saturatedFat
    case 'transFat': return nutrition.transFat
    case 'protein': return nutrition.protein
    case 'fibre': return nutrition.fiber
    default: return undefined
  }
}

function statusFor(direction, pct) {
  if (direction === 'goal') {
    // higher is better
    if (pct >= 25) return 'good'
    if (pct >= 10) return 'ok'
    return 'low'
  }
  // limit: lower is better
  if (pct <= 15) return 'good'
  if (pct <= 30) return 'ok'
  if (pct <= 50) return 'high'
  return 'veryhigh'
}

/**
 * Build the allowance rows for one demographic.
 * @param {object} nutrition per-serving (or chosen amount) nutrition object
 * @param {string} demographicKey key into DEMOGRAPHIC_REFERENCE
 * @returns {{ demographic, rows[], meta }}
 */
export function getAllowance(nutrition, demographicKey) {
  const ref = getReference(demographicKey)
  const rows = []

  if (!nutrition) return { demographic: ref, rows, incomplete: true }

  for (const nutrientKey of ALLOWANCE_NUTRIENT_ORDER) {
    const amount = readNutritionValue(nutrition, nutrientKey)
    const limit = ref.values[nutrientKey]

    // Skip nutrients we don't have data for on this product.
    if (amount === undefined || amount === null || isNaN(amount)) continue
    // If reference is missing for this group, mark unavailable rather than guess.
    const hasRef = typeof limit === 'number' && limit > 0

    const direction = NUTRIENT_DIRECTION[nutrientKey]
    const pct = hasRef ? Math.round((amount / limit) * 100) : null

    rows.push({
      key: nutrientKey,
      label: NUTRIENT_LABELS[nutrientKey],
      unit: NUTRIENT_UNITS[nutrientKey],
      amount,
      limit: hasRef ? limit : null,
      pct,
      direction,
      status: hasRef ? statusFor(direction, pct) : 'unknown',
      // teaspoons of sugar helper (§6.4)
      teaspoons: (nutrientKey === 'totalSugar' || nutrientKey === 'addedSugar')
        ? Math.round((amount / 4) * 10) / 10
        : null,
    })
  }

  return { demographic: ref, rows, incomplete: rows.length === 0 }
}

export const DEMOGRAPHIC_KEYS = Object.keys(DEMOGRAPHIC_REFERENCE)

// --- Portion views (spec §6.1): per serving, per 100 g, whole pack, realistic
//     Indian portion. Pack/portion are scaled from per-100 g data. ---

function parseGrams(str) {
  if (!str) return null
  const m = String(str).match(/(\d+(?:\.\d+)?)\s*(g|ml|kg|l)\b/i)
  if (!m) return null
  let v = parseFloat(m[1])
  const unit = m[2].toLowerCase()
  if (unit === 'kg' || unit === 'l') v *= 1000
  return v
}

const NUTR_KEYS = ['calories', 'sugars', 'addedSugars', 'totalFat', 'saturatedFat', 'transFat', 'sodium', 'fiber', 'protein', 'totalCarbs']

function scaleNutrition(base, factor) {
  const out = {}
  for (const k of NUTR_KEYS) {
    if (base[k] === undefined || base[k] === null) continue
    const v = base[k] * factor
    out[k] = (k === 'calories' || k === 'sodium') ? Math.round(v) : Math.round(v * 10) / 10
  }
  return out
}

// Realistic Indian portion by category (grams + a familiar label).
function indianPortion(categoryTags = []) {
  const c = categoryTags.join(' ').toLowerCase()
  if (/biscuit|cookie/.test(c)) return { grams: 24, label: '≈ 4 biscuits (chai-time)' }
  if (/chip|crisp|namkeen|snack/.test(c)) return { grams: 30, label: '≈ one small bowl (30 g)' }
  if (/chocolate/.test(c)) return { grams: 20, label: '≈ 2–3 small squares (20 g)' }
  if (/noodle|pasta/.test(c)) return { grams: 35, label: '≈ half a cake (35 g)' }
  if (/juice|drink|soda|beverage|cola/.test(c)) return { grams: 200, label: '≈ one glass (200 ml)' }
  if (/cereal|flake|muesli/.test(c)) return { grams: 30, label: '≈ one bowl (30 g)' }
  if (/bread|rusk/.test(c)) return { grams: 30, label: '≈ 2 slices (30 g)' }
  return { grams: 30, label: '≈ a small serving (30 g)' }
}

/**
 * Available portion views for a product, each with its own nutrition object.
 * @returns {Array<{key,label,nutrition,note}>}
 */
export function getPortionViews(result) {
  const perServing = result.parsedNutrition
  const per100 = result.nutrition100g
  const views = []

  if (perServing && Object.keys(perServing).length) {
    views.push({ key: 'serving', label: 'Per serving', nutrition: perServing, note: result.servingSize ? `Serving: ${result.servingSize}` : null })
  }
  if (per100 && Object.keys(per100).length) {
    views.push({ key: '100g', label: 'Per 100 g', nutrition: per100 })
  }
  // Whole pack — scale per-100 g by the pack size.
  const packG = parseGrams(result.quantity)
  if (per100 && packG && packG !== 100) {
    views.push({ key: 'pack', label: 'Whole pack', nutrition: scaleNutrition(per100, packG / 100), note: `Full pack: ${result.quantity}` })
  }
  // Realistic Indian portion.
  if (per100) {
    const p = indianPortion(result.categoryTags)
    views.push({ key: 'indian', label: 'Indian portion', nutrition: scaleNutrition(per100, p.grams / 100), note: p.label })
  }

  return views
}
