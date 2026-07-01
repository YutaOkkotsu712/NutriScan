// ============================================================================
// Fasting Engine — evaluate a product against a fasting/Upvas profile (§8).
//
// Returns a verdict (suitable / not_suitable / depends / unknown) with the
// specific ingredients that triggered it. Always conservative: ambiguous
// sources become "depends"/"unknown", never a false "suitable".
// ============================================================================

import { FASTING_PROFILES, FASTING_STATUS, FASTING_META, FASTING_CONFIDENCE } from '../data/fastingProfiles'

function matchTokens(ingredientText, tokens) {
  const lower = ingredientText.toLowerCase()
  const hits = []
  for (const token of tokens) {
    // word-ish boundary match to avoid e.g. "corn" in "acorn"
    const re = new RegExp(`(^|[^a-z])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i')
    if (re.test(lower)) hits.push(token)
  }
  return hits
}

/**
 * @param {string} ingredientText raw ingredient string from the product
 * @param {string} profileKey key into FASTING_PROFILES, or 'custom'
 * @param {{allow:string[],restrict:string[]}} [customRules] personal family rules
 */
export function evaluateFasting(ingredientText, profileKey, customRules) {
  // Custom family rules (spec §8.3): user-defined allow/restrict lists.
  const profile = profileKey === 'custom'
    ? {
        label: 'My family rules',
        description: 'Your saved personal fasting rules.',
        restricted: customRules?.restrict || [],
        depends: [],
        allow: customRules?.allow || [],
        note: 'Based on the ingredients you marked as not allowed for your family.',
      }
    : FASTING_PROFILES[profileKey]
  if (!profile) return null

  const base = {
    profileKey,
    label: profile.label,
    description: profile.description,
    note: profile.note,
    caveat: FASTING_META.globalCaveat,
    confidence: profileKey === 'custom' ? 'high' : (FASTING_CONFIDENCE[profileKey] || 'medium'),
    sources: FASTING_META.sources,
    lastReviewed: FASTING_META.lastReviewed,
  }

  // No ingredient data — cannot verify.
  if (!ingredientText || ingredientText.trim().length < 3) {
    return {
      ...base,
      status: FASTING_STATUS.UNKNOWN,
      reason: 'Ingredient list not available to verify against this fast.',
      restrictedHits: [],
      dependsHits: [],
    }
  }

  const restrictedHits = matchTokens(ingredientText, profile.restricted || [])
  const dependsHits = matchTokens(ingredientText, profile.depends || [])

  let status, reason
  if (restrictedHits.length > 0) {
    status = FASTING_STATUS.NOT_SUITABLE
    reason = `Contains ${restrictedHits.slice(0, 3).join(', ')}, which most ${profile.label} profiles do not allow.`
  } else if (dependsHits.length > 0) {
    status = FASTING_STATUS.DEPENDS
    reason = `Contains ${dependsHits.slice(0, 3).join(', ')} — accepted by some families and not others.`
  } else {
    status = FASTING_STATUS.SUITABLE
    reason = 'No conflicting ingredients detected for this fasting profile.'
  }

  return { ...base, status, reason, restrictedHits, dependsHits }
}
