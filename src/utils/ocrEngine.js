import { preprocessImage, preprocessImageInverted, getOriginalDataUrl } from './imagePreprocess'
import { parseNutrition, parseIngredients, mergeNutrition, normalizeNutritionForServing } from './nutritionParser'
import { analyzeFood } from './scoreEngine'

let worker = null

async function getWorker() {
  if (worker) return worker

  const Tesseract = await import('tesseract.js')
  worker = await Tesseract.createWorker('eng', 1, {
    logger: () => {},
  })
  return worker
}

async function ocrPass(w, imageDataUrl, psm) {
  await w.setParameters({
    tessedit_pageseg_mode: String(psm),
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  })
  const { data } = await w.recognize(imageDataUrl, {}, { text: true, tsv: true })
  return {
    text: data.text || '',
    tsv: data.tsv || '',
  }
}

function scoreExtraction(nutrition, ingredients) {
  let score = Object.keys(nutrition).length * 3
  if (ingredients.length > 10) score += 2
  if (nutrition.calories) score += 6
  if (nutrition.protein !== undefined) score += 2
  if (nutrition.sugars !== undefined) score += 2
  if (nutrition.sodium) score += 2
  if (nutrition.saturatedFat !== undefined) score += 2
  return score
}

function isStrongNutritionPass(result) {
  const nutrition = result.nutrition
  return Object.keys(nutrition).length >= 5 &&
    nutrition.calories !== undefined &&
    nutrition.protein !== undefined
}

function hasPer100gTable(text) {
  return /\bper\s*100\s*[g9q]\b/i.test(text)
}

function shouldFillFromConsensus(key, value, rawText) {
  if (!hasPer100gTable(rawText)) return true

  if (key === 'sugars') return value === 0
  if (key === 'fiber') return value === 0
  if (key === 'sodium') return value === 0 || value >= 40

  return true
}

function fixCrossPassRowSlides(merged, results, rawText) {
  const fixed = { ...merged }
  if (!hasPer100gTable(rawText)) return fixed

  // --- Protein-leak detection ---
  // If protein has a value and 2+ other nutrients have suspiciously similar
  // values (within ±1), those nutrients likely got protein's value from
  // OCR column confusion. Replace with better values from other passes.
  let proteinLeakDetected = false
  if (fixed.protein !== undefined && fixed.protein > 0) {
    const proteinVal = Math.floor(fixed.protein)
    const leakKeys = ['sugars', 'saturatedFat', 'transFat', 'fiber', 'totalFat', 'totalCarbs']
    const leaked = leakKeys.filter(key =>
      fixed[key] !== undefined &&
      Math.abs(Math.floor(fixed[key]) - proteinVal) <= 1 &&
      fixed[key] > 0
    )

    if (leaked.length >= 2) {
      proteinLeakDetected = true
      // Strong signal of column confusion — fix each leaked nutrient
      for (const key of leaked) {
        // Look for a non-protein-like value from any pass
        const altValues = results
          .map(r => r.nutrition[key])
          .filter(v => v !== undefined && Math.abs(Math.floor(v) - proteinVal) > 1)

        // Prefer decimal values, then zeros
        const withDec = altValues.filter(v => v !== Math.floor(v))
        const zeros = altValues.filter(v => v === 0)

        if (withDec.length > 0) {
          fixed[key] = withDec[0]
        } else if (zeros.length > 0) {
          fixed[key] = 0
        } else if (altValues.length > 0) {
          fixed[key] = altValues[0]
        }
      }
    }
  }

  // --- Trans fat: only force to 0 if protein-leak confirmed ---
  // (Pringles legitimately has 0.3g trans fat, so don't blanket-zero)
  if (proteinLeakDetected && fixed.transFat !== undefined && fixed.transFat > 0 && fixed.transFat < 2) {
    fixed.transFat = 0
  }

  // --- Sugar fixes ---
  const sugarValues = results
    .map(result => result.nutrition.sugars)
    .filter(value => Number.isFinite(value) && value >= 0)
  const lowDecimalSugar = sugarValues
    .filter(value => value > 0 && value < 10 && value !== Math.floor(value))
    .sort((a, b) => a - b)[0]
  const hasSugarZero = sugarValues.some(value => value === 0)

  if (
    fixed.sugars !== undefined &&
    (
      fixed.sugars > 20 ||
      (fixed.totalCarbs !== undefined && fixed.sugars > fixed.totalCarbs * 0.6)
    )
  ) {
    if (lowDecimalSugar !== undefined) {
      fixed.sugars = lowDecimalSugar
    } else if (hasSugarZero) {
      fixed.sugars = 0
    }
  }

  const anySugarZero = results.some(result => result.nutrition.sugars === 0)
  if (
    anySugarZero &&
    fixed.sugars !== undefined &&
    fixed.fiber !== undefined &&
    Math.abs(fixed.sugars - fixed.fiber) <= Math.max(fixed.fiber * 0.05, 0.2)
  ) {
    fixed.sugars = 0
  }

  // --- Fiber fixes ---
  const fiberValues = results
    .map(result => result.nutrition.fiber)
    .filter(value => value !== undefined && value > 0)
    .sort((a, b) => a - b)
  const decimalFiberValues = fiberValues.filter(value => value !== Math.floor(value))
  const lowerFiberCandidate = decimalFiberValues.find(value =>
    fixed.fiber !== undefined &&
    value < fixed.fiber &&
    value >= fixed.fiber * 0.75
  )

  if (lowerFiberCandidate !== undefined) {
    fixed.fiber = lowerFiberCandidate
  }

  // --- Sat fat cross-check against total fat ---
  if (fixed.totalFat && fixed.saturatedFat && fixed.saturatedFat > fixed.totalFat) {
    // Sat fat can't exceed total fat — look for a better value
    const altSatFat = results
      .map(r => r.nutrition.saturatedFat)
      .filter(v => v !== undefined && v <= fixed.totalFat && v !== fixed.saturatedFat)
      .sort((a, b) => b - a)
    if (altSatFat.length > 0) {
      fixed.saturatedFat = altSatFat[0]
    }
  }

  return fixed
}

async function addIngredientFallbackPass(imageSource, w, onProgress, label, results) {
  const hasIngredients = results.some(result => result.ingredients.length > 25)
  if (hasIngredients) return

  onProgress?.(`${label} (reading ingredient text)...`)

  try {
    const inverted = await preprocessImageInverted(imageSource)
    // Try multiple PSM modes for inverted text
    for (const psm of [3, 6, 4]) {
      const { text } = await ocrPass(w, inverted, psm)
      const ingredients = parseIngredients(text)
      console.log(`[NutriScan] Ingredient fallback PSM ${psm}: "${ingredients.slice(0, 80)}"`)
      results.push({
        text,
        nutrition: {},
        ingredients,
        score: scoreExtraction({}, ingredients),
      })
      if (ingredients.length > 25) break
    }
  } catch (error) {
    console.warn('[NutriScan] Ingredient fallback OCR failed:', error)
  }
}

function consensusMerge(nutritionResults) {
  const allKeys = new Set(nutritionResults.flatMap(n => Object.keys(n)))
  const merged = {}

  for (const key of allKeys) {
    const values = nutritionResults
      .map(n => n[key])
      .filter(v => v !== undefined)

    if (values.length === 0) continue
    if (values.length === 1) { merged[key] = values[0]; continue }

    // If any pass read 0 and others read a small single digit (1-9),
    // the 0 is likely correct — OCR commonly misreads "0" as other digits
    const zeros = values.filter(v => v === 0).length
    const smallNonZero = values.filter(v => v > 0 && v < 10 && v === Math.floor(v)).length
    if (zeros > 0 && smallNonZero > 0 && zeros + smallNonZero === values.length) {
      merged[key] = 0
      continue
    }

    // Group similar values (within 15% or ±1 of each other)
    const groups = []
    for (const v of values) {
      let found = false
      for (const g of groups) {
        const ref = g[0]
        if (Math.abs(v - ref) <= Math.max(ref * 0.15, 1)) { g.push(v); found = true; break }
      }
      if (!found) groups.push([v])
    }

    // Pick the group with most votes
    groups.sort((a, b) => b.length - a.length)
    const bestGroup = groups[0]

    // Within the winning group, prefer values with decimals —
    // BUT if the majority voted 0, use 0 (don't let 0.9 override four 0s)
    const zeroCount = bestGroup.filter(v => v === 0).length
    if (zeroCount > bestGroup.length / 2) {
      merged[key] = 0
    } else {
      const withDec = bestGroup.filter(v => v !== Math.floor(v))
      merged[key] = withDec.length > 0 ? withDec[0] : bestGroup[0]
    }
  }

  return merged
}

async function scanSingleImage(imageSource, w, onProgress, label) {
  const [enhanced, inverted, original] = await Promise.all([
    preprocessImage(imageSource),
    preprocessImageInverted(imageSource),
    getOriginalDataUrl(imageSource),
  ])

  const passes = [
    { img: enhanced, psm: 6 },
    { img: original, psm: 3 },
    { img: inverted, psm: 6 },
    { img: original, psm: 6 },
  ]

  const results = []
  for (let i = 0; i < passes.length; i++) {
    onProgress?.(`${label} (pass ${i + 1} of ${passes.length})...`)
    const { text, tsv } = await ocrPass(w, passes[i].img, passes[i].psm)
    const nutrition = parseNutrition(text, tsv)
    const ingredients = parseIngredients(text)
    results.push({ text, nutrition, ingredients, score: scoreExtraction(nutrition, ingredients) })
  }

  await addIngredientFallbackPass(imageSource, w, onProgress, label, results)

  // Sort by extraction quality
  results.sort((a, b) => b.score - a.score)

  // Consensus merge: for each nutrient, collect all values across passes and vote
  const consensus = consensusMerge(results.map(r => r.nutrition))
  const best = results[0]
  const combinedRawText = results.map(r => r.text).join('\n')
  let merged = consensus

  if (isStrongNutritionPass(best)) {
    merged = { ...best.nutrition }
    for (const [key, value] of Object.entries(consensus)) {
      if (merged[key] === undefined && shouldFillFromConsensus(key, value, combinedRawText)) {
        merged[key] = value
      }
    }
  }

  merged = fixCrossPassRowSlides(merged, results, combinedRawText)
  merged = normalizeNutritionForServing(merged, combinedRawText)
  console.log('[NutriScan] Final nutrition:', JSON.stringify(merged))

  // Pick longest ingredients from any pass
  const bestIng = results.map(r => r.ingredients).sort((a, b) => b.length - a.length)[0]

  return {
    nutrition: merged,
    ingredients: bestIng,
    rawText: combinedRawText,
  }
}

export async function scanImage(imageSource, onProgress) {
  const images = Array.isArray(imageSource) ? imageSource : [imageSource]
  const total = images.length

  onProgress?.('Loading OCR engine...')
  const w = await getWorker()

  const allNutritions = []
  const allIngredients = []
  const allTexts = []

  for (let i = 0; i < total; i++) {
    const label = total > 1 ? `Scanning image ${i + 1} of ${total}` : 'Scanning label'

    const result = await scanSingleImage(images[i], w, onProgress, label)
    allNutritions.push(result.nutrition)
    allIngredients.push(result.ingredients)
    allTexts.push(result.rawText)
  }

  onProgress?.('Merging results...')

  // Log per-image results for debugging
  for (let i = 0; i < total; i++) {
    console.log(`[NutriScan] Image ${i + 1} nutrition:`, JSON.stringify(allNutritions[i]))
    console.log(`[NutriScan] Image ${i + 1} ingredients (${allIngredients[i].length} chars):`, allIngredients[i].slice(0, 100))
  }

  // Smart multi-image merge: find the image with strongest nutrition data
  // and use it as primary. Only fill GAPS from other images — don't let
  // a weaker image's stray numbers override a stronger image's real values.
  let mergedNutrition
  if (total === 1) {
    mergedNutrition = allNutritions[0]
  } else {
    // Score each image's nutrition extraction
    const scored = allNutritions.map((n, i) => ({
      nutrition: n,
      index: i,
      keyCount: Object.keys(n).length,
      hasCalories: n.calories !== undefined,
      hasMacros: (n.totalFat !== undefined) + (n.totalCarbs !== undefined) + (n.protein !== undefined),
    }))
    scored.sort((a, b) => {
      // Prefer images with calories
      if (a.hasCalories && !b.hasCalories) return -1
      if (!a.hasCalories && b.hasCalories) return 1
      // Then by macro count
      if (a.hasMacros !== b.hasMacros) return b.hasMacros - a.hasMacros
      // Then by total key count
      return b.keyCount - a.keyCount
    })

    // Start with the strongest image's nutrition
    mergedNutrition = { ...scored[0].nutrition }
    // Fill gaps from other images (don't replace existing values)
    for (let i = 1; i < scored.length; i++) {
      for (const [key, value] of Object.entries(scored[i].nutrition)) {
        if (mergedNutrition[key] === undefined) {
          mergedNutrition[key] = value
        }
      }
    }
  }

  console.log('[NutriScan] Merged nutrition:', JSON.stringify(mergedNutrition))

  const bestIngredients = allIngredients.sort((a, b) => b.length - a.length)[0]
  const combinedText = allTexts.join('\n')

  if (combinedText.trim().length < 15) {
    throw new Error('UNREADABLE')
  }

  const hasAnyNutrient = Object.keys(mergedNutrition).length > 0
  if (!hasAnyNutrient && !bestIngredients) {
    throw new Error('NO_NUTRITION_DATA')
  }

  onProgress?.('Calculating health score...')

  const result = analyzeFood(mergedNutrition, bestIngredients)
  result.rawText = combinedText
  result.parsedNutrition = mergedNutrition
  result.parsedIngredients = bestIngredients
  result.imageCount = total

  return result
}
