// ============================================================================
// Suitability Engine — per-group verdicts for the clickable chips (§7).
//
// For each demographic/lifestyle group (Kids, Jain, Adult men/women, Elderly,
// BP/Sodium, Diabetes, Weight loss) it returns:
//   verdict, reasons[], portion guidance, frequency, pairWith, caveat.
//
// IMPORTANT (§9): none of this changes the general product score. These are
// separate "Additional guidance" verdicts derived from the same nutrition +
// ingredient data.
// ============================================================================

import { getAllowance } from './demographicEngine.js'
import { lookupEncyclopedia } from '../data/ingredientEncyclopedia.js'

export const VERDICT = {
  SUITABLE: 'Suitable',
  GOOD: 'Good choice',
  OCCASIONAL: 'Occasional',
  LIMIT: 'Limit',
  AVOID: 'Avoid',
  DEPENDS: 'Depends',
  UNKNOWN: 'Unknown',
}

const VERDICT_TONE = {
  [VERDICT.SUITABLE]: 'good',
  [VERDICT.GOOD]: 'good',
  [VERDICT.OCCASIONAL]: 'warn',
  [VERDICT.LIMIT]: 'warn',
  [VERDICT.AVOID]: 'bad',
  [VERDICT.DEPENDS]: 'neutral',
  [VERDICT.UNKNOWN]: 'neutral',
}

export function verdictTone(v) {
  return VERDICT_TONE[v] || 'neutral'
}

// Realistic Indian portion phrasing (§6.1, §13).
function portionPhrase(category = '') {
  const c = category.toLowerCase()
  if (/biscuit|cookie/.test(c)) return '3–4 biscuits'
  if (/chip|crisp|namkeen|snack/.test(c)) return 'a small bowl (about 30 g)'
  if (/noodle|pasta/.test(c)) return 'half a pack'
  if (/chocolate/.test(c)) return '2–3 small squares'
  if (/juice|drink|soda|beverage/.test(c)) return 'one small glass (200 ml)'
  if (/cereal|flake/.test(c)) return 'one bowl (about 30 g)'
  return 'a small serving'
}

// Pull the worst "limit" nutrients for a demographic to build reasons.
function limitConcerns(nutrition, demographicKey) {
  const { rows } = getAllowance(nutrition, demographicKey)
  return rows.filter(r => r.direction === 'limit' && (r.status === 'high' || r.status === 'veryhigh'))
}

// Detect animal-derived / root ingredients for Jain via encyclopedia + OFF analysis.
function jainAssessment(result) {
  const ing = result.parsedIngredients || ''
  const analysis = result.ingredientsAnalysisTags || [] // e.g. en:vegan, en:non-vegetarian

  if (analysis.includes('en:non-vegetarian')) {
    return { verdict: VERDICT.AVOID, reasons: ['Contains non-vegetarian ingredients.'] }
  }

  const roots = ['onion', 'garlic', 'potato', 'ginger', 'carrot', 'radish', 'beetroot']
  const rootHits = roots.filter(r => new RegExp(`(^|[^a-z])${r}`, 'i').test(ing))
  if (rootHits.length > 0) {
    return { verdict: VERDICT.AVOID, reasons: [`Contains root vegetables (${rootHits.join(', ')}) avoided in Jain diets.`] }
  }

  // Look for ambiguous additives (471, flavours, enzymes, gelatin)
  const reasons = []
  let ambiguous = false
  if (/gelatin|gelatine|rennet/i.test(ing)) {
    return { verdict: VERDICT.AVOID, reasons: ['Contains gelatin/rennet (animal-derived).'] }
  }
  for (const token of ['mono and diglycerides', 'ins 471', 'e471', 'flavour', 'flavouring', 'enzyme', 'lecithin']) {
    if (ing.toLowerCase().includes(token)) { ambiguous = true; reasons.push(`"${token}" has an unverified source.`) }
  }
  if (!ing || ing.trim().length < 3) {
    return { verdict: VERDICT.UNKNOWN, reasons: ['Ingredient list not available to verify Jain suitability.'] }
  }
  if (ambiguous) {
    return { verdict: VERDICT.DEPENDS, reasons: ['Source of some additives is not verified — check flavours/emulsifiers/enzymes.', ...reasons] }
  }
  if (analysis.includes('en:vegan') || analysis.includes('en:vegetarian')) {
    return { verdict: VERDICT.SUITABLE, reasons: ['No animal-derived or root ingredients detected.'] }
  }
  return { verdict: VERDICT.DEPENDS, reasons: ['No obvious conflicts, but vegetarian/Jain source is not fully verified.'] }
}

function buildGroup(key, label, verdict, reasons, extras = {}) {
  return {
    key,
    label,
    verdict,
    tone: verdictTone(verdict),
    reasons: reasons.filter(Boolean).slice(0, 4),
    portion: extras.portion || null,
    frequency: extras.frequency || null,
    pairWith: extras.pairWith || null,
    caveat: extras.caveat || null,
  }
}

/**
 * Compute all suitability groups for a product result.
 * @returns {Array} list of group objects for the chips + detail sheets.
 */
export function getSuitability(result) {
  const nutrition = result.parsedNutrition || {}
  const category = (result.categoryTags || []).join(' ')
  const score = result.overallScore ?? 5
  const groups = []

  const n = nutrition
  const highSugar = n.sugars !== undefined && n.sugars > 12
  const highSodium = n.sodium !== undefined && n.sodium > 400
  const highSatFat = n.saturatedFat !== undefined && n.saturatedFat > 5
  const lowFibre = n.fiber !== undefined && n.fiber < 2
  const goodProtein = n.protein !== undefined && n.protein >= 8

  // --- Kids ---
  {
    const reasons = []
    let verdict = VERDICT.OCCASIONAL
    if (highSugar) reasons.push('High in sugar — not ideal for daily tiffin.')
    if (highSodium) reasons.push('High sodium for a child portion.')
    if (goodProtein) reasons.push('Provides useful protein.')
    if (lowFibre) reasons.push('Low fibre — pair with fruit or nuts.')
    if (score >= 7 && !highSugar && !highSodium) verdict = VERDICT.SUITABLE
    else if (highSugar && highSodium) verdict = VERDICT.LIMIT
    if (reasons.length === 0) reasons.push('Okay occasionally in a balanced tiffin.')
    groups.push(buildGroup('kids', 'Kids', verdict, reasons, {
      portion: portionPhrase(category),
      frequency: verdict === VERDICT.SUITABLE ? 'A few times a week' : 'Occasional treat, not daily',
      pairWith: lowFibre ? 'Pair with fruit or a protein source' : null,
      caveat: 'For child nutrition concerns, consult a qualified professional.',
    }))
  }

  // --- Jain ---
  {
    const j = jainAssessment(result)
    groups.push(buildGroup('jain', 'Jain', j.verdict, j.reasons, {
      caveat: 'Jain rules vary by family. Ambiguous additive/flavour sources are shown as Depends/Unknown.',
    }))
  }

  // --- Adult men ---
  {
    const concerns = limitConcerns(n, 'adultMen')
    const reasons = concerns.map(c => `${c.label} is ${c.pct}% of an adult man's daily reference.`)
    let verdict = concerns.length >= 2 ? VERDICT.LIMIT : concerns.length === 1 ? VERDICT.OCCASIONAL : VERDICT.SUITABLE
    if (goodProtein) reasons.push('Decent protein for the portion.')
    if (reasons.length === 0) reasons.push('Fits an adult diet in normal portions.')
    groups.push(buildGroup('adultMen', 'Adult men', verdict, reasons, {
      portion: portionPhrase(category), frequency: verdict === VERDICT.SUITABLE ? 'Fine in regular portions' : 'Watch portion size',
    }))
  }

  // --- Adult women ---
  {
    const concerns = limitConcerns(n, 'adultWomen')
    const reasons = concerns.map(c => `${c.label} is ${c.pct}% of an adult woman's daily reference.`)
    let verdict = concerns.length >= 2 ? VERDICT.LIMIT : concerns.length === 1 ? VERDICT.OCCASIONAL : VERDICT.SUITABLE
    if (reasons.length === 0) reasons.push('Fits an adult diet in normal portions.')
    groups.push(buildGroup('adultWomen', 'Adult women', verdict, reasons, {
      portion: portionPhrase(category), frequency: verdict === VERDICT.SUITABLE ? 'Fine in regular portions' : 'Watch portion size',
      caveat: 'Pregnancy/lactation needs differ — a separate profile is planned.',
    }))
  }

  // --- Elderly ---
  {
    const reasons = []
    let verdict = VERDICT.SUITABLE
    if (highSodium) { reasons.push('Sodium is high — a concern for blood pressure in older adults.'); verdict = VERDICT.LIMIT }
    if (highSatFat) { reasons.push('High saturated fat.'); verdict = VERDICT.LIMIT }
    if (goodProtein) reasons.push('Protein supports muscle maintenance.')
    if (lowFibre) reasons.push('Low fibre — may not aid digestion.')
    if (reasons.length === 0) reasons.push('Reasonable for older adults in moderate portions.')
    groups.push(buildGroup('elderly', 'Elderly', verdict, reasons, {
      portion: portionPhrase(category), frequency: verdict === VERDICT.LIMIT ? 'Limit frequency' : 'Moderate portions',
      caveat: 'For heart, kidney or BP conditions, consult a healthcare professional.',
    }))
  }

  // --- BP / Sodium ---
  {
    const reasons = []
    let verdict = VERDICT.GOOD
    if (n.sodium !== undefined) {
      const pct = Math.round((n.sodium / 2000) * 100)
      if (n.sodium > 600) { verdict = VERDICT.AVOID; reasons.push(`Very high sodium: ${n.sodium} mg (${pct}% of daily reference).`) }
      else if (n.sodium > 400) { verdict = VERDICT.LIMIT; reasons.push(`High sodium: ${n.sodium} mg (${pct}% of daily reference).`) }
      else { reasons.push(`Sodium is ${n.sodium} mg (${pct}% of daily reference).`) }
    } else {
      verdict = VERDICT.UNKNOWN; reasons.push('Sodium value not available.')
    }
    groups.push(buildGroup('bp-sodium', 'BP / Sodium', verdict, reasons, {
      pairWith: 'Balance with fresh, low-salt foods the rest of the day',
      caveat: 'For diagnosed hypertension, follow your doctor’s sodium advice.',
    }))
  }

  // --- Diabetes ---
  {
    const reasons = []
    let verdict = VERDICT.LIMIT
    if (n.sugars !== undefined) reasons.push(`Sugar: ${n.sugars} g per serving.`)
    if (lowFibre) reasons.push('Low fibre — refined carbs raise blood sugar faster.')
    if (/maida|refined wheat flour|refined flour/i.test(result.parsedIngredients || '')) reasons.push('Made with refined flour (maida).')
    if (n.sugars !== undefined && n.sugars <= 5 && !lowFibre) verdict = VERDICT.OCCASIONAL
    if (n.sugars !== undefined && n.sugars > 15) verdict = VERDICT.AVOID
    if (n.sugars === undefined) { verdict = VERDICT.UNKNOWN; reasons.push('Sugar value not available.') }
    reasons.push('Sugar is not the only factor — refined carbs, fibre and portion all matter.')
    groups.push(buildGroup('diabetes', 'Diabetes caution', verdict, reasons, {
      pairWith: 'Pair with protein/fibre to slow the sugar spike',
      caveat: 'Not medical advice — follow your diabetes care plan.',
    }))
  }

  // --- Weight loss ---
  {
    const reasons = []
    let verdict = VERDICT.OCCASIONAL
    if (n.calories !== undefined) reasons.push(`${n.calories} kcal per serving.`)
    if (goodProtein) reasons.push('Protein helps satiety.')
    if (lowFibre) reasons.push('Low fibre — less filling, easy to overeat.')
    if (highSugar) reasons.push('High sugar adds empty calories.')
    if (n.calories !== undefined && n.calories <= 120 && goodProtein) verdict = VERDICT.GOOD
    if (n.calories !== undefined && n.calories > 350) verdict = VERDICT.LIMIT
    if (reasons.length === 0) reasons.push('Fits a weight-loss plan in controlled portions.')
    groups.push(buildGroup('weight-loss', 'Weight loss', verdict, reasons, {
      portion: portionPhrase(category), frequency: 'Mind the portion and overall daily calories',
    }))
  }

  return groups
}

// Resolve one ingredient string to its encyclopedia entry (used by the sheet).
export function resolveIngredient(rawIngredient) {
  return lookupEncyclopedia(rawIngredient)
}
