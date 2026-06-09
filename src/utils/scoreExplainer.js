/**
 * Generate a plain-English "Why This Score?" explanation
 * from the category scores and nutrition data.
 */

const CATEGORY_NAMES = {
  calories: 'calorie content',
  sugars: 'sugar levels',
  fats: 'fat profile',
  sodium: 'sodium/salt content',
  protein: 'protein content',
  fiber: 'fiber content',
  processing: 'processing level',
  additives: 'additive profile',
}

function describeScore(score) {
  if (score >= 9) return 'excellent'
  if (score >= 7) return 'good'
  if (score >= 5) return 'moderate'
  if (score >= 3) return 'poor'
  return 'concerning'
}

function strengthPhrase(cat, score) {
  const name = CATEGORY_NAMES[cat]
  if (score >= 9) return `very ${cat === 'protein' || cat === 'fiber' ? 'high' : 'low'} ${name}`
  if (score >= 7) return `${cat === 'protein' || cat === 'fiber' ? 'solid' : 'reasonable'} ${name}`
  return `${describeScore(score)} ${name}`
}

export function generateExplanation(result) {
  const { overallScore, categories, parsedNutrition, claims, novaGroup } = result
  const cats = categories || {}

  // Sort categories into strengths and weaknesses
  const sorted = Object.entries(cats).sort((a, b) => b[1].score - a[1].score)
  const strengths = sorted.filter(([, d]) => d.score >= 7)
  const weaknesses = sorted.filter(([, d]) => d.score <= 4)
  const midRange = sorted.filter(([, d]) => d.score > 4 && d.score < 7)

  const parts = []

  // Opening line based on overall score
  const productName = result.productName?.split('(')[0]?.trim() || 'This product'
  if (overallScore >= 8) {
    parts.push(`${productName} scores ${overallScore}/10 — a strong result. This is a genuinely healthy choice by WHO standards.`)
  } else if (overallScore >= 6) {
    parts.push(`${productName} scores ${overallScore}/10 — a decent product with some room for improvement.`)
  } else if (overallScore >= 4) {
    parts.push(`${productName} scores ${overallScore}/10 — an average product with notable nutritional concerns.`)
  } else {
    parts.push(`${productName} scores ${overallScore}/10 — this product has significant health concerns based on WHO guidelines.`)
  }

  // Strengths
  if (strengths.length > 0) {
    const top = strengths.slice(0, 3)
    const strengthDescs = top.map(([cat, d]) => strengthPhrase(cat, d.score))

    if (top.length === 1) {
      parts.push(`Its strongest area is ${strengthDescs[0]}.`)
    } else {
      const last = strengthDescs.pop()
      parts.push(`Its strengths include ${strengthDescs.join(', ')} and ${last}.`)
    }
  }

  // Weaknesses — the main value-add
  if (weaknesses.length > 0) {
    const bottom = weaknesses.slice(0, 3)
    const weakDescs = []

    for (const [cat, data] of bottom) {
      const n = parsedNutrition || {}
      if (cat === 'sugars' && n.sugars !== undefined) {
        const pct = Math.round((n.sugars / 50) * 100)
        weakDescs.push(`sugar is high at ${n.sugars}g per serving (${pct}% of WHO's daily limit)`)
      } else if (cat === 'sodium' && n.sodium !== undefined) {
        const pct = Math.round((n.sodium / 2000) * 100)
        weakDescs.push(`sodium is ${n.sodium}mg (${pct}% of the daily limit)`)
      } else if (cat === 'fats') {
        if (n.saturatedFat !== undefined) {
          weakDescs.push(`saturated fat is ${n.saturatedFat}g per serving — WHO recommends limiting saturated fat intake`)
        } else {
          weakDescs.push(`the fat profile is a concern`)
        }
      } else if (cat === 'calories' && n.calories !== undefined) {
        weakDescs.push(`it packs ${n.calories} kcal per serving (${Math.round((n.calories / 2000) * 100)}% of daily energy)`)
      } else if (cat === 'fiber') {
        weakDescs.push(`fiber content is low — WHO recommends at least 25g/day`)
      } else if (cat === 'protein') {
        weakDescs.push(`protein content is minimal`)
      } else if (cat === 'processing') {
        const novaText = novaGroup ? `NOVA ${novaGroup} (ultra-processed)` : 'highly processed'
        weakDescs.push(`it's classified as ${novaText}`)
      } else if (cat === 'additives') {
        weakDescs.push(`it contains multiple flagged additives`)
      }
    }

    if (weakDescs.length === 1) {
      parts.push(`The main concern is that ${weakDescs[0]}.`)
    } else if (weakDescs.length > 1) {
      const last = weakDescs.pop()
      parts.push(`Key concerns: ${weakDescs.join('; ')}; and ${last}.`)
    }
  }

  // Misleading claims callout
  const misleading = (claims || []).filter(c => c.isMisleading)
  if (misleading.length > 0) {
    const claimNames = misleading.map(c => `"${c.claim}"`).join(' and ')
    parts.push(`Watch out — the ${claimNames} claim${misleading.length > 1 ? 's are' : ' is'} misleading based on the actual nutrition data.`)
  }

  // Closing with actionable takeaway
  if (overallScore < 5 && weaknesses.length > 0) {
    const worst = weaknesses[0][0]
    const advice = {
      sugars: 'Look for unsweetened or reduced-sugar alternatives.',
      fats: 'Consider options with less saturated fat, like baked variants.',
      sodium: 'Try lower-sodium versions or season with herbs instead.',
      calories: 'A smaller portion or lighter alternative might be better.',
      processing: 'Whole-food alternatives with fewer ingredients would be healthier.',
      additives: 'Products with shorter, recognizable ingredient lists are preferable.',
      fiber: 'Adding whole grains, fruits, or vegetables can help meet fiber goals.',
      protein: 'Pair this with a protein-rich food for a more balanced meal.',
    }
    if (advice[worst]) parts.push(advice[worst])
  }

  return parts.join(' ')
}
