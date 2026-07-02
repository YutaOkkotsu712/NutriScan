/**
 * Generate the "Why This Score?" explanation from the category scores and
 * nutrition data. Every sentence is assembled from i18n templates
 * (STRINGS[lang].explain), so the paragraph renders in any covered language
 * (spec §5.4); uncovered languages fall back to English per template.
 */

import { translate, translateProse } from '../i18n'

function describeScore(score) {
  if (score >= 9) return 'excellent'
  if (score >= 7) return 'good'
  if (score >= 5) return 'moderate'
  if (score >= 3) return 'poor'
  return 'concerning'
}

export function generateExplanation(result, lang = 'en') {
  const t = (key, vars) => translate(lang, `explain.${key}`, vars)
  const { overallScore, categories, parsedNutrition, claims, novaGroup } = result
  const cats = categories || {}

  const catName = (cat) => t(`cat.${cat}`)
  const strengthPhrase = (cat, score) => {
    const name = catName(cat)
    const positive = cat === 'protein' || cat === 'fiber'
    if (score >= 9) return t(positive ? 'phraseVeryHigh' : 'phraseVeryLow', { name })
    if (score >= 7) return t(positive ? 'phraseSolid' : 'phraseReasonable', { name })
    return t('phraseLevel', { level: t(`level.${describeScore(score)}`), name })
  }

  // Sort categories into strengths and weaknesses
  const sorted = Object.entries(cats).sort((a, b) => b[1].score - a[1].score)
  const strengths = sorted.filter(([, d]) => d.score >= 7)
  const weaknesses = sorted.filter(([, d]) => d.score <= 4)

  const parts = []

  // Opening line based on overall score
  const productName = result.productName?.split('(')[0]?.trim() || 'This product'
  const openKey = overallScore >= 8 ? 'openStrong'
    : overallScore >= 6 ? 'openDecent'
      : overallScore >= 4 ? 'openAverage' : 'openPoor'
  parts.push(t(openKey, { name: productName, score: overallScore }))

  // Severity cap explanation — why an otherwise-okay looking product is
  // limited. The cap reason is engine prose; translate it as prose.
  if (result.capped && result.capReason) {
    parts.push(translateProse(lang, result.capReason))
  }

  // Strengths
  if (strengths.length > 0) {
    const strengthDescs = strengths.slice(0, 3).map(([cat, d]) => strengthPhrase(cat, d.score))
    if (strengthDescs.length === 1) {
      parts.push(t('strongestArea', { desc: strengthDescs[0] }))
    } else {
      const last = strengthDescs.pop()
      parts.push(t('strengthsInclude', { list: strengthDescs.join(', '), last }))
    }
  }

  // Weaknesses — the main value-add
  if (weaknesses.length > 0) {
    const weakDescs = []
    for (const [cat] of weaknesses.slice(0, 3)) {
      const n = parsedNutrition || {}
      if (cat === 'sugars' && n.sugars !== undefined) {
        weakDescs.push(t('weakSugar', { g: n.sugars, pct: Math.round((n.sugars / 50) * 100) }))
      } else if (cat === 'sodium' && n.sodium !== undefined) {
        weakDescs.push(t('weakSodium', { mg: n.sodium, pct: Math.round((n.sodium / 2000) * 100) }))
      } else if (cat === 'fats') {
        weakDescs.push(n.saturatedFat !== undefined ? t('weakSatFat', { g: n.saturatedFat }) : t('weakFat'))
      } else if (cat === 'calories' && n.calories !== undefined) {
        weakDescs.push(t('weakCalories', { kcal: n.calories, pct: Math.round((n.calories / 2000) * 100) }))
      } else if (cat === 'fiber') {
        weakDescs.push(t('weakFiber'))
      } else if (cat === 'protein') {
        weakDescs.push(t('weakProtein'))
      } else if (cat === 'processing') {
        weakDescs.push(novaGroup ? t('weakProcessingNova', { nova: novaGroup }) : t('weakProcessing'))
      } else if (cat === 'additives') {
        weakDescs.push(t('weakAdditives'))
      }
    }

    if (weakDescs.length === 1) {
      parts.push(t('mainConcern', { desc: weakDescs[0] }))
    } else if (weakDescs.length > 1) {
      const last = weakDescs.pop()
      parts.push(t('keyConcerns', { list: weakDescs.join('; '), last }))
    }
  }

  // Misleading claims callout (claim text is label data — stays as printed)
  const misleading = (claims || []).filter(c => c.isMisleading)
  if (misleading.length > 0) {
    const claimNames = misleading.map(c => `"${c.claim}"`).join(` ${t('and')} `)
    parts.push(t(misleading.length > 1 ? 'claimsWarnMany' : 'claimsWarnOne', { claims: claimNames }))
  }

  // Closing with actionable takeaway
  if (overallScore < 5 && weaknesses.length > 0) {
    const worst = weaknesses[0][0]
    const adviceKeys = ['sugars', 'fats', 'sodium', 'calories', 'processing', 'additives', 'fiber', 'protein']
    if (adviceKeys.includes(worst)) parts.push(t(`advice.${worst}`))
  }

  return parts.join(' ')
}
