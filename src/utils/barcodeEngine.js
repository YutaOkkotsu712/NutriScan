import { analyzeFood } from './scoreEngine'

const OFF_API = 'https://world.openfoodfacts.org/api/v2/product'

/**
 * Look up a barcode on Open Food Facts and return structured nutrition data.
 * Returns null if the product isn't found.
 */
export async function lookupBarcode(barcode, onProgress) {
  onProgress?.('Looking up product...')

  const res = await fetch(`${OFF_API}/${barcode}.json`, {
    headers: { 'User-Agent': 'NutriScan/1.0 (PWA food scanner)' },
  })

  if (!res.ok) return null

  const data = await res.json()

  if (data.status !== 1 || !data.product) return null

  const product = data.product

  onProgress?.('Analyzing nutrition...')

  // Extract nutrition per 100g (preferred) or per serving
  const nutri = product.nutriments || {}

  const nutrition = {}

  // Map Open Food Facts fields → our internal format
  // OFF stores values per 100g with _100g suffix
  const val = (key) => {
    const v = nutri[`${key}_100g`] ?? nutri[key]
    return typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v) : undefined)
  }

  const cal = val('energy-kcal')
  if (cal !== undefined && !isNaN(cal)) nutrition.calories = Math.round(cal)

  const totalFat = val('fat')
  if (totalFat !== undefined && !isNaN(totalFat)) nutrition.totalFat = round1(totalFat)

  const satFat = val('saturated-fat')
  if (satFat !== undefined && !isNaN(satFat)) nutrition.saturatedFat = round1(satFat)

  const transFat = val('trans-fat')
  if (transFat !== undefined && !isNaN(transFat)) nutrition.transFat = round1(transFat)

  const carbs = val('carbohydrates')
  if (carbs !== undefined && !isNaN(carbs)) nutrition.totalCarbs = round1(carbs)

  const sugars = val('sugars')
  if (sugars !== undefined && !isNaN(sugars)) nutrition.sugars = round1(sugars)

  const fiber = val('fiber')
  if (fiber !== undefined && !isNaN(fiber)) nutrition.fiber = round1(fiber)

  const protein = val('proteins')
  if (protein !== undefined && !isNaN(protein)) nutrition.protein = round1(protein)

  const sodium = val('sodium')
  if (sodium !== undefined && !isNaN(sodium)) {
    // OFF stores sodium in g, we need mg
    nutrition.sodium = Math.round(sodium * 1000)
  }
  // Some products have salt instead of sodium
  if (nutrition.sodium === undefined) {
    const salt = val('salt')
    if (salt !== undefined && !isNaN(salt)) {
      // salt (g) → sodium (mg): sodium = salt * 1000 / 2.5
      nutrition.sodium = Math.round(salt * 400)
    }
  }

  // Serving size normalization
  // If we have per-100g data and a serving size, normalize to per-serving
  const servingSize = parseServingGrams(product.serving_size)
  if (servingSize && servingSize > 0 && servingSize !== 100) {
    const factor = servingSize / 100
    for (const key of Object.keys(nutrition)) {
      if (key === 'calories') {
        nutrition[key] = Math.round(nutrition[key] * factor)
      } else if (key === 'sodium') {
        nutrition[key] = Math.round(nutrition[key] * factor)
      } else {
        nutrition[key] = round1(nutrition[key] * factor)
      }
    }
  }

  // Get ingredients text
  const ingredientText = product.ingredients_text || product.ingredients_text_en || ''

  // Get product name
  const productName = product.product_name || product.product_name_en || 'Unknown Product'
  const brand = product.brands || ''
  const displayName = brand ? `${productName} (${brand})` : productName

  // Get image
  const imageUrl = product.image_front_url || product.image_url || null

  // Nutri-Score from OFF (for comparison)
  const nutriScore = product.nutriscore_grade || null

  onProgress?.('Calculating health score...')

  console.log('[NutriScan] OFF product:', productName)
  console.log('[NutriScan] OFF nutrition:', JSON.stringify(nutrition))
  console.log('[NutriScan] OFF ingredients:', ingredientText.slice(0, 100))

  const result = analyzeFood(nutrition, ingredientText)
  result.productName = displayName
  result.parsedNutrition = nutrition
  result.parsedIngredients = ingredientText
  result.imageUrl = imageUrl
  result.nutriScore = nutriScore
  result.source = 'openfoodfacts'
  result.barcode = barcode
  result.servingSize = product.serving_size || null
  result.categoryTags = product.categories_tags || []
  result.imageCount = 0

  return result
}

function round1(v) {
  return Math.round(v * 10) / 10
}

function parseServingGrams(servingStr) {
  if (!servingStr) return null
  // Match patterns like "30g", "30 g", "1 serving (30g)", etc.
  const match = servingStr.match(/(\d+(?:\.\d+)?)\s*g/i)
  return match ? parseFloat(match[1]) : null
}
