/**
 * Misleading Claims Detector
 * Cross-checks front-of-pack marketing claims against actual nutrition data.
 * Returns an array of { claim, verdict, isMisleading, explanation }
 */

// Map OFF label tags to human-readable claims
const CLAIM_MAP = {
  'en:no-sugar': 'Sugar Free',
  'en:no-added-sugar': 'No Added Sugar',
  'en:no-added-sugars': 'No Added Sugar',
  'en:sugar-free': 'Sugar Free',
  'en:low-sugar': 'Low Sugar',
  'en:reduced-sugar': 'Reduced Sugar',
  'en:no-artificial-flavors': 'No Artificial Flavors',
  'en:no-artificial-flavours': 'No Artificial Flavors',
  'en:no-artificial-colors': 'No Artificial Colors',
  'en:no-artificial-colours': 'No Artificial Colors',
  'en:no-colorings': 'No Artificial Colors',
  'en:no-preservatives': 'No Preservatives',
  'en:no-additives': 'No Additives',
  'en:natural': 'Natural',
  'en:all-natural': 'All Natural',
  'en:organic': 'Organic',
  'en:low-fat': 'Low Fat',
  'en:fat-free': 'Fat Free',
  'en:no-fat': 'Fat Free',
  'en:reduced-fat': 'Reduced Fat',
  'en:light': 'Light / Lite',
  'en:lite': 'Light / Lite',
  'en:low-calorie': 'Low Calorie',
  'en:low-sodium': 'Low Sodium',
  'en:no-salt': 'No Salt',
  'en:low-salt': 'Low Salt',
  'en:reduced-salt': 'Reduced Salt',
  'en:high-protein': 'High Protein',
  'en:source-of-protein': 'Source of Protein',
  'en:high-fiber': 'High Fiber',
  'en:high-fibre': 'High Fiber',
  'en:source-of-fiber': 'Source of Fiber',
  'en:source-of-fibre': 'Source of Fiber',
  'en:whole-grain': 'Whole Grain',
  'en:whole-wheat': 'Whole Wheat',
  'en:no-cholesterol': 'No Cholesterol',
  'en:cholesterol-free': 'Cholesterol Free',
  'en:no-trans-fat': 'No Trans Fat',
  'en:trans-fat-free': 'No Trans Fat',
  'en:vegetarian': 'Vegetarian',
  'en:vegan': 'Vegan',
  'en:no-gluten': 'Gluten Free',
  'en:gluten-free': 'Gluten Free',
  'en:no-lactose': 'Lactose Free',
  'en:lactose-free': 'Lactose Free',
  'en:contains-vitamins': 'Contains Vitamins',
  'en:fortified': 'Fortified',
  'en:enriched': 'Enriched',
  'en:heart-healthy': 'Heart Healthy',
  'en:Sans colorants': 'No Artificial Colors',
  'en:Sans conservateurs': 'No Preservatives',
  'en:Sans gluten': 'Gluten Free',
  'en:Sans matière grasse hydrogénée': 'No Hydrogenated Fat',
  'en:Végétarien': 'Vegetarian',
}

// Also detect claims from product name
const NAME_CLAIM_PATTERNS = [
  { pattern: /\bsugar\s*free\b/i, claim: 'Sugar Free' },
  { pattern: /\bno\s*added\s*sugar/i, claim: 'No Added Sugar' },
  { pattern: /\blow\s*fat\b/i, claim: 'Low Fat' },
  { pattern: /\bfat\s*free\b/i, claim: 'Fat Free' },
  { pattern: /\blight\b|\blite\b/i, claim: 'Light / Lite' },
  { pattern: /\bnatural\b/i, claim: 'Natural' },
  { pattern: /\bhigh\s*protein\b/i, claim: 'High Protein' },
  { pattern: /\bhigh\s*fibre?\b/i, claim: 'High Fiber' },
  { pattern: /\bwhole\s*grain\b|\bwhole\s*wheat\b/i, claim: 'Whole Grain' },
  { pattern: /\blow\s*calorie/i, claim: 'Low Calorie' },
  { pattern: /\bno\s*preservative/i, claim: 'No Preservatives' },
  { pattern: /\bhealthy\b|\bwholesome\b/i, claim: 'Healthy' },
  { pattern: /\bno\s*cholesterol\b/i, claim: 'No Cholesterol' },
  { pattern: /\bdigestive\b/i, claim: 'Digestive Health' },
  { pattern: /\bimmunit/i, claim: 'Immunity Boost' },
  { pattern: /\benergy\b/i, claim: 'Energy' },
  { pattern: /\bprotein\s*rich\b/i, claim: 'High Protein' },
  { pattern: /\bfibre?\s*rich\b/i, claim: 'High Fiber' },
  { pattern: /\blow\s*sodium\b/i, claim: 'Low Sodium' },
  { pattern: /\bzero\s*trans\s*fat/i, claim: 'No Trans Fat' },
  { pattern: /\bno\s*maida\b/i, claim: 'No Maida' },
  { pattern: /\bmultigrain\b/i, claim: 'Multigrain' },
]

// Checker functions — each returns { isMisleading, explanation } or null if not applicable
const CLAIM_CHECKERS = {
  'Sugar Free': (nutrition) => {
    const sugars = nutrition.sugars
    if (sugars === undefined) return null
    if (sugars > 0.5) {
      return {
        isMisleading: true,
        explanation: `Claims "sugar free" but contains ${sugars}g sugar per serving. FSSAI/FDA allows <0.5g to claim "sugar free".`,
      }
    }
    return { isMisleading: false, explanation: `Verified — sugar is ${sugars}g (under 0.5g limit).` }
  },

  'No Added Sugar': (nutrition, ingredients) => {
    const sugars = nutrition.sugars
    // Check ingredients for hidden sugar sources
    if (ingredients) {
      const lower = ingredients.toLowerCase()
      const hiddenSugars = ['corn syrup', 'hfcs', 'maltodextrin', 'dextrose', 'fruit juice concentrate', 'honey', 'jaggery', 'gur', 'invert sugar', 'glucose syrup']
      const found = hiddenSugars.filter(s => lower.includes(s))
      if (found.length > 0) {
        return {
          isMisleading: true,
          explanation: `Claims "no added sugar" but ingredients contain: ${found.join(', ')}. These are sugar by another name.`,
        }
      }
    }
    if (sugars !== undefined && sugars > 15) {
      return {
        isMisleading: true,
        explanation: `Claims "no added sugar" but has ${sugars}g sugar per serving — likely from concentrated fruit juice or other sugar sources.`,
      }
    }
    return null
  },

  'Low Sugar': (nutrition) => {
    const sugars = nutrition.sugars
    if (sugars === undefined) return null
    if (sugars > 5) {
      return {
        isMisleading: true,
        explanation: `Claims "low sugar" but has ${sugars}g per serving. FSSAI/CODEX "low sugar" means ≤5g per 100g.`,
      }
    }
    return { isMisleading: false, explanation: `Verified — ${sugars}g sugar is within "low sugar" limits.` }
  },

  'Low Fat': (nutrition) => {
    const fat = nutrition.totalFat
    if (fat === undefined) return null
    if (fat > 3) {
      return {
        isMisleading: true,
        explanation: `Claims "low fat" but has ${fat}g fat per serving. FSSAI/CODEX "low fat" means ≤3g per 100g.`,
      }
    }
    return { isMisleading: false, explanation: `Verified — ${fat}g total fat is within "low fat" limits.` }
  },

  'Fat Free': (nutrition) => {
    const fat = nutrition.totalFat
    if (fat === undefined) return null
    if (fat > 0.5) {
      return {
        isMisleading: true,
        explanation: `Claims "fat free" but contains ${fat}g fat per serving. Must be <0.5g to claim "fat free".`,
      }
    }
    return { isMisleading: false, explanation: `Verified — ${fat}g fat is effectively zero.` }
  },

  'Light / Lite': (nutrition) => {
    // "Light" should mean 30% less calories or fat than regular version
    // We can't compare to regular, but we can flag if it's still high
    const cal = nutrition.calories
    const fat = nutrition.totalFat
    const issues = []
    if (cal !== undefined && cal > 250) issues.push(`${cal} kcal is not "light"`)
    if (fat !== undefined && fat > 10) issues.push(`${fat}g fat is not "light"`)
    if (issues.length > 0) {
      return {
        isMisleading: true,
        explanation: `Labeled "light/lite" but ${issues.join(' and ')}. "Light" should mean 30% less calories or fat than the standard version.`,
      }
    }
    return null
  },

  'No Trans Fat': (nutrition) => {
    const transFat = nutrition.transFat
    if (transFat === undefined) return null
    if (transFat >= 0.5) {
      return {
        isMisleading: true,
        explanation: `Claims "no trans fat" but has ${transFat}g. Regulations allow rounding to 0 only if <0.5g per serving.`,
      }
    }
    return { isMisleading: false, explanation: 'Verified — trans fat is below 0.5g.' }
  },

  'High Protein': (nutrition) => {
    const protein = nutrition.protein
    const cal = nutrition.calories
    if (protein === undefined) return null
    // FSSAI: "High protein" = ≥20% of energy from protein
    // Protein has 4 kcal/g
    if (cal && cal > 0) {
      const proteinCalPct = (protein * 4 / cal) * 100
      if (proteinCalPct < 20) {
        return {
          isMisleading: true,
          explanation: `Claims "high protein" but only ${proteinCalPct.toFixed(0)}% of calories come from protein (${protein}g). "High protein" requires ≥20%.`,
        }
      }
      return { isMisleading: false, explanation: `Verified — ${proteinCalPct.toFixed(0)}% of calories from protein.` }
    }
    if (protein < 10) {
      return {
        isMisleading: true,
        explanation: `Claims "high protein" but only has ${protein}g protein per serving.`,
      }
    }
    return null
  },

  'High Fiber': (nutrition) => {
    const fiber = nutrition.fiber
    if (fiber === undefined) return null
    if (fiber < 6) {
      return {
        isMisleading: true,
        explanation: `Claims "high fiber" but has only ${fiber}g. FSSAI/CODEX "high fiber" requires ≥6g per 100g.`,
      }
    }
    return { isMisleading: false, explanation: `Verified — ${fiber}g fiber meets "high fiber" requirement.` }
  },

  'Source of Fiber': (nutrition) => {
    const fiber = nutrition.fiber
    if (fiber === undefined) return null
    if (fiber < 3) {
      return {
        isMisleading: true,
        explanation: `Claims "source of fiber" but has only ${fiber}g. Requires ≥3g per 100g.`,
      }
    }
    return { isMisleading: false, explanation: `Verified — ${fiber}g fiber qualifies as "source of fiber".` }
  },

  'Low Calorie': (nutrition) => {
    const cal = nutrition.calories
    if (cal === undefined) return null
    if (cal > 40) {
      return {
        isMisleading: true,
        explanation: `Claims "low calorie" but has ${cal} kcal per serving. "Low calorie" means ≤40 kcal per serving.`,
      }
    }
    return { isMisleading: false, explanation: `Verified — ${cal} kcal is within "low calorie" limits.` }
  },

  'Low Sodium': (nutrition) => {
    const sodium = nutrition.sodium
    if (sodium === undefined) return null
    if (sodium > 140) {
      return {
        isMisleading: true,
        explanation: `Claims "low sodium" but has ${sodium}mg. "Low sodium" means ≤140mg per serving.`,
      }
    }
    return { isMisleading: false, explanation: `Verified — ${sodium}mg sodium is within "low sodium" limits.` }
  },

  'Natural': (nutrition, ingredients, ingredientCount) => {
    if (ingredientCount > 15) {
      return {
        isMisleading: true,
        explanation: `Labeled "natural" but has ${ingredientCount} ingredients — that's ultra-processed food territory. "Natural" has no strict legal definition.`,
      }
    }
    if (ingredients) {
      const lower = ingredients.toLowerCase()
      const artificial = ['artificial', 'tbhq', 'bht', 'bha', 'aspartame', 'acesulfame', 'sodium benzoate']
      const found = artificial.filter(a => lower.includes(a))
      if (found.length > 0) {
        return {
          isMisleading: true,
          explanation: `Labeled "natural" but contains: ${found.join(', ')}. "Natural" is a loosely regulated marketing term.`,
        }
      }
    }
    return null
  },

  'No Preservatives': (nutrition, ingredients) => {
    if (!ingredients) return null
    const lower = ingredients.toLowerCase()
    const preservatives = ['sodium benzoate', 'potassium sorbate', 'sodium nitrite', 'sodium nitrate', 'bha', 'bht', 'tbhq', 'sulphur dioxide', 'sodium metabisulphite', 'ins 211', 'ins 202', 'ins 250', 'ins 251', 'ins 220', 'ins 223', 'e211', 'e202']
    const found = preservatives.filter(p => lower.includes(p))
    if (found.length > 0) {
      return {
        isMisleading: true,
        explanation: `Claims "no preservatives" but ingredients list contains: ${found.join(', ')}.`,
      }
    }
    return null
  },

  'No Artificial Colors': (nutrition, ingredients) => {
    if (!ingredients) return null
    const lower = ingredients.toLowerCase()
    const colors = ['artificial colo', 'tartrazine', 'sunset yellow', 'allura red', 'brilliant blue', 'ins 102', 'ins 110', 'ins 129', 'ins 133', 'e102', 'e110', 'e129', 'e133']
    const found = colors.filter(c => lower.includes(c))
    if (found.length > 0) {
      return {
        isMisleading: true,
        explanation: `Claims "no artificial colors" but ingredients contain: ${found.join(', ')}.`,
      }
    }
    return null
  },

  'Healthy': (nutrition, ingredients, ingredientCount, overallScore) => {
    if (overallScore !== undefined && overallScore <= 4) {
      return {
        isMisleading: true,
        explanation: `Marketed as "healthy" but scored only ${overallScore}/10 on WHO-aligned analysis. High in sugar, fat, sodium, or heavily processed.`,
      }
    }
    return null
  },

  'No Cholesterol': (nutrition) => {
    // Plant-based products never had cholesterol — this claim is meaningless
    const satFat = nutrition.saturatedFat
    if (satFat !== undefined && satFat > 5) {
      return {
        isMisleading: true,
        explanation: `"No cholesterol" is technically true but misleading — this product has ${satFat}g saturated fat, which raises blood cholesterol. The claim distracts from the real concern.`,
      }
    }
    return null
  },

  'Energy': (nutrition) => {
    const sugars = nutrition.sugars
    const cal = nutrition.calories
    if (sugars !== undefined && sugars > 15 && cal !== undefined) {
      return {
        isMisleading: true,
        explanation: `Marketed as "energy" but most of the ${cal} kcal comes from ${sugars}g of sugar — that's a sugar rush, not sustained energy.`,
      }
    }
    return null
  },

  'Digestive Health': (nutrition) => {
    const fiber = nutrition.fiber
    const sugars = nutrition.sugars
    if (fiber !== undefined && fiber < 3) {
      return {
        isMisleading: true,
        explanation: `Claims digestive benefits but has only ${fiber}g fiber. Genuine digestive health foods have ≥3g fiber.`,
      }
    }
    if (sugars !== undefined && sugars > 10) {
      return {
        isMisleading: true,
        explanation: `Claims digestive benefits but loaded with ${sugars}g sugar — excess sugar harms gut health.`,
      }
    }
    return null
  },

  'Immunity Boost': () => {
    return {
      isMisleading: true,
      explanation: `"Immunity boost" is not a recognized health claim. No single food product can boost immunity. This is a marketing buzzword.`,
    }
  },

  'Whole Grain': (nutrition) => {
    const fiber = nutrition.fiber
    if (fiber !== undefined && fiber < 2) {
      return {
        isMisleading: true,
        explanation: `Claims "whole grain" but has only ${fiber}g fiber. Genuine whole grain products are fiber-rich (≥3g).`,
      }
    }
    return null
  },

  'Multigrain': (nutrition) => {
    const fiber = nutrition.fiber
    if (fiber !== undefined && fiber < 2) {
      return {
        isMisleading: true,
        explanation: `"Multigrain" just means multiple grains — they can all be refined. Only ${fiber}g fiber suggests these aren't whole grains.`,
      }
    }
    return null
  },
}

/**
 * Check all claims on a product against its actual nutrition.
 * @param {string[]} labelTags - OFF labels_tags array
 * @param {string} productName - product name (for detecting claims in name)
 * @param {object} nutrition - parsed nutrition data
 * @param {string} ingredients - ingredients text
 * @param {number} overallScore - NutriScan overall score
 * @returns {Array<{claim, verdict, isMisleading, explanation}>}
 */
export function checkClaims(labelTags = [], productName = '', nutrition = {}, ingredients = '', overallScore) {
  const claimsFound = new Set()
  const results = []

  // Count ingredients for processing checks
  const ingredientCount = ingredients
    ? ingredients.split(/[,;]/).filter(s => s.trim().length > 0).length
    : 0

  // Extract claims from OFF label tags
  for (const tag of labelTags) {
    const claim = CLAIM_MAP[tag]
    if (claim && !claimsFound.has(claim)) {
      claimsFound.add(claim)
    }
  }

  // Extract claims from product name
  for (const { pattern, claim } of NAME_CLAIM_PATTERNS) {
    if (pattern.test(productName) && !claimsFound.has(claim)) {
      claimsFound.add(claim)
    }
  }

  // Run checkers for each found claim
  for (const claim of claimsFound) {
    const checker = CLAIM_CHECKERS[claim]
    if (checker) {
      const result = checker(nutrition, ingredients, ingredientCount, overallScore)
      if (result) {
        results.push({
          claim,
          isMisleading: result.isMisleading,
          explanation: result.explanation,
        })
      } else {
        // Claim found but no data to verify
        results.push({
          claim,
          isMisleading: false,
          explanation: 'Claim noted — insufficient data to fully verify.',
        })
      }
    } else {
      // No checker for this claim — just note it
      results.push({
        claim,
        isMisleading: false,
        explanation: 'Claim noted.',
      })
    }
  }

  // Sort: misleading claims first
  results.sort((a, b) => (b.isMisleading ? 1 : 0) - (a.isMisleading ? 1 : 0))

  return results
}
