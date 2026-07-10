import { analyzeFood } from './scoreEngine.js'
import { checkClaims } from './claimsChecker.js'
import { apiUrl } from './apiBase.js'

// Default lookup path: the auth-gated, metered scan endpoint. Callers pass
// the Authorization header via opts.headers (see App.lookupProduct). There is
// no ungated product endpoint — the paywall is fail-closed server-side.
const SCAN_API = apiUrl('/api/scan')

/**
 * Look up a barcode and return structured nutrition data.
 *
 * @param opts.endpoint  base path (defaults to the gated /api/scan).
 * @param opts.headers   extra headers (e.g. Authorization for the gated path).
 * @returns the analyzed result, `null` for a genuine not-found, or a control
 *          object `{ limitReached, entitlement }` / `{ unauthenticated }` so
 *          the caller can show the paywall / re-auth instead of a product.
 *          A successful result carries `.entitlement` when the gated path
 *          reports it (drives the "N scans left" badge).
 */
export async function lookupBarcode(barcode, onProgress, opts = {}) {
  const { endpoint = SCAN_API, headers = {} } = opts
  onProgress?.('Looking up product...')

  const res = await fetch(`${endpoint}/${barcode}`, { headers })

  // Paywall / auth signals from the gated endpoint — not errors, not misses.
  if (res.status === 402) {
    const body = await res.json().catch(() => ({}))
    return { limitReached: true, entitlement: body.entitlement || null }
  }
  if (res.status === 401) return { unauthenticated: true }

  if (!res.ok) {
    throw new Error(`Product lookup failed with HTTP ${res.status}`)
  }

  // A non-JSON body usually means the deployment rewrote the route to the SPA
  // shell or the edge function failed. That is not a true product miss.
  const data = await res.json().catch(() => {
    throw new Error('Product lookup returned non-JSON')
  })

  if (!data || data.status !== 1 || !data.product) return null

  onProgress?.('Analyzing nutrition...')
  onProgress?.('Calculating health score...')

  const result = normalizeOffProduct(data.product, barcode)
  if (data.entitlement) result.entitlement = data.entitlement

  console.log('[NutriScan] OFF product:', result.productName)
  console.log('[NutriScan] OFF nutrition:', JSON.stringify(result.parsedNutrition))
  console.log('[NutriScan] OFF ingredients:', (result.parsedIngredients || '').slice(0, 100))
  console.log('[NutriScan] Allergens:', result.allergens)
  console.log('[NutriScan] Claims:', result.claims)

  return result
}

/**
 * Pure normalization of a raw Open Food Facts product object into our
 * analyzed result shape. Shared by the client (lookupBarcode) and the
 * composed edge endpoint (api/product-info/[barcode].js) so both stay in
 * lockstep — single source of truth for field mapping and scoring.
 */
export function normalizeOffProduct(product, barcode) {
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

  // NOVA processing group from OFF
  const novaGroup = product.nova_group || null

  const result = analyzeFood(nutrition, ingredientText, novaGroup)
  result.productName = displayName
  result.parsedNutrition = nutrition
  result.parsedIngredients = ingredientText
  result.imageUrl = imageUrl
  result.nutriScore = nutriScore
  result.source = 'openfoodfacts'
  result.barcode = barcode
  result.brand = brand
  result.quantity = product.quantity || null
  result.servingSize = product.serving_size || null
  result.categoryTags = product.categories_tags || []
  result.novaGroup = novaGroup
  result.imageCount = 0

  // Added sugar if OFF has it (rare on Indian products)
  const addedSug = val('added-sugars')
  if (addedSug !== undefined && !isNaN(addedSug)) result.parsedNutrition.addedSugars = round1(addedSug)

  // --- Fields powering the India-first interactive layer ---
  // Ingredient analysis (en:vegan, en:vegetarian, en:non-vegetarian, en:palm-oil…)
  result.ingredientsAnalysisTags = product.ingredients_analysis_tags || []
  result.ingredientsTags = product.ingredients_tags || []
  result.additivesTags = product.additives_tags || [] // e.g. ['en:e471']
  // Structured ingredient list (with %, order) when OFF provides it
  result.ingredientsList = (product.ingredients || []).map(i => ({
    id: i.id, text: i.text, percent: i.percent_estimate,
    vegan: i.vegan, vegetarian: i.vegetarian,
  }))

  // Data confidence & source (spec §4)
  result.dataConfidence = {
    lastUpdated: product.last_modified_t ? new Date(product.last_modified_t * 1000).toISOString().slice(0, 10) : null,
    completeness: typeof product.completeness === 'number' ? Math.round(product.completeness * 100) : null,
    editors: Array.isArray(product.editors_tags) ? product.editors_tags.length : null,
    // FSSAI/license number if present in packaging or labels (rarely structured)
    fssai: extractFssai(product),
    sourceName: 'Open Food Facts (community database)',
    // Set by /api/product when a reviewed correction override was merged (§11)
    corrected: product.nutriscan_corrected || null,
  }

  // Store per-100g nutrition for toggle view
  const nutrition100g = {}
  const val100 = (key) => {
    const v = nutri[`${key}_100g`]
    return typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v) : undefined)
  }
  const c100 = val100('energy-kcal'); if (c100 !== undefined && !isNaN(c100)) nutrition100g.calories = Math.round(c100)
  const f100 = val100('fat'); if (f100 !== undefined && !isNaN(f100)) nutrition100g.totalFat = round1(f100)
  const sf100 = val100('saturated-fat'); if (sf100 !== undefined && !isNaN(sf100)) nutrition100g.saturatedFat = round1(sf100)
  const tf100 = val100('trans-fat'); if (tf100 !== undefined && !isNaN(tf100)) nutrition100g.transFat = round1(tf100)
  const cb100 = val100('carbohydrates'); if (cb100 !== undefined && !isNaN(cb100)) nutrition100g.totalCarbs = round1(cb100)
  const su100 = val100('sugars'); if (su100 !== undefined && !isNaN(su100)) nutrition100g.sugars = round1(su100)
  const fi100 = val100('fiber'); if (fi100 !== undefined && !isNaN(fi100)) nutrition100g.fiber = round1(fi100)
  const pr100 = val100('proteins'); if (pr100 !== undefined && !isNaN(pr100)) nutrition100g.protein = round1(pr100)
  const so100 = val100('sodium'); if (so100 !== undefined && !isNaN(so100)) nutrition100g.sodium = Math.round(so100 * 1000)
  if (nutrition100g.sodium === undefined) { const sl100 = val100('salt'); if (sl100 !== undefined && !isNaN(sl100)) nutrition100g.sodium = Math.round(sl100 * 400) }
  result.nutrition100g = nutrition100g

  // Allergens & traces
  result.allergens = (product.allergens_tags || []).map(a => a.replace('en:', ''))
  result.traces = (product.traces_tags || []).map(t => t.replace('en:', ''))

  // Misleading claims check
  const labelTags = product.labels_tags || []
  result.labelTags = labelTags
  result.claims = checkClaims(
    labelTags,
    productName,
    nutrition,
    ingredientText,
    result.overallScore
  )

  return result
}

function round1(v) {
  return Math.round(v * 10) / 10
}

// Try to find an FSSAI licence number (14 digits) in packaging/label fields.
// FSSAI presence means licensing/registration status, NOT a health approval (§20).
function extractFssai(product) {
  const haystack = [
    product.packaging_text,
    product.labels,
    product.emb_codes,
    product.conservation_conditions,
  ].filter(Boolean).join(' ')
  const m = haystack.match(/\b(\d{14})\b/)
  return m ? m[1] : null
}

function parseServingGrams(servingStr) {
  if (!servingStr) return null
  // Match patterns like "30g", "30 g", "1 serving (30g)", etc.
  const match = servingStr.match(/(\d+(?:\.\d+)?)\s*g/i)
  return match ? parseFloat(match[1]) : null
}
