import { analyzeFood } from './scoreEngine'
import { evaluateFasting } from './fastingEngine'
import { FASTING_STATUS } from '../data/fastingProfiles'
import { apiUrl } from './apiBase.js'
import { authHeader } from './useAuth'

// Same-origin caching proxy (api/search.js, both prod and dev). Auth-gated
// like /api/scan — the returned fields are server-owned, so no `fields` param
// is sent; requests carry the Firebase ID token when auth is enabled.
const SEARCH_API = apiUrl('/api/search')

// ---------------------------------------------------------------------------
// Diet filtering for suggested alternatives (P1). OFF's analysis tags
// (en:non-vegetarian / en:non-vegan) are missing on many Indian products, so
// tags alone let a bacon product through to a Jain user. We therefore check
// FOUR signals: analysis tags, product name, ingredients text, and category
// tags — and deliberately over-exclude on ambiguity (never suggest a product
// we can't defend; the user can always find it via explicit search).
// Indian convention: "Vegetarian" = green dot = no meat/fish AND no egg.
// ---------------------------------------------------------------------------

const NON_VEG_RE = /\b(chicken|mutton|lamb|pork|bacon|ham|beef|buffalo|fish|prawns?|shrimps?|crab|squid|octopus|anchovy|anchovies|sardines?|tuna|salmon|cod|mackerel|meat|salami|sausages?|pepperoni|turkey|duck|quail|eggs?|omelette|gelatine?|rennet|lard|caviar|oysters?)\b/i

// Dairy/animal terms for vegan. Plant-based "milk/butter/cream" phrases are
// stripped first (no regex lookbehind — it breaks module parsing on older
// iOS Safari, a real audience on hand-me-down phones).
const PLANT_DAIRY_RE = /\b(coconut|almond|soya?|oat|rice|cashew|peanut|shea|cocoa)\s+(milk|butter|cream)\b/gi
const NON_VEGAN_RE = /\b(milk|butter|ghee|paneer|cheese|cream|curd|dahi|yogh?urt|whey|casein|lactose|khoya|malai|honey)\b/i

// Root/underground vegetables (and honey) avoided in Jain diets.
const JAIN_AVOID_RE = /\b(onions?|garlic|potato(?:es)?|ginger|carrots?|radish(?:es)?|beetroots?|turnips?|leeks?|shallots?|yam|honey)\b/i

const NON_VEG_CATEGORY_RE = /\ben:(meats?|poultry|fishes|fish|seafood|eggs|hams|bacons?|sausages|charcuteries)\b/

// Does a product conflict with the user's diet preference? Checked against
// everything OFF gives us, not just the (often missing) analysis tags.
export function dietConflict(product, diet) {
  if (!diet || diet === 'none') return false
  const p = product || {}
  const tags = p.ingredients_analysis_tags || []
  const haystack = `${p.product_name || ''} ${p.ingredients_text || ''}`
  const cats = (p.categories_tags || []).join(' ')

  const nonVeg = tags.includes('en:non-vegetarian')
    || NON_VEG_RE.test(haystack)
    || NON_VEG_CATEGORY_RE.test(cats)

  if (diet === 'veg') return nonVeg
  if (diet === 'jain') return nonVeg || JAIN_AVOID_RE.test(haystack)
  if (diet === 'vegan') {
    const withoutPlantDairy = haystack.replace(PLANT_DAIRY_RE, '')
    return nonVeg || tags.includes('en:non-vegan') || NON_VEGAN_RE.test(withoutPlantDairy)
  }
  return false
}

// Does a product contain (or risk traces of) any of the user's allergens?
// Strict on traces too: never *suggest* something that "may contain" the
// family's allergen — the user can still find such products via search.
export function allergenConflict(product, allergens) {
  if (!allergens || allergens.length === 0) return false
  const p = product || {}
  const inProduct = new Set(
    [...(p.allergens_tags || []), ...(p.traces_tags || [])].map(t => String(t).replace(/^[a-z]{2}:/, ''))
  )
  return allergens.some(a => inProduct.has(a))
}

// During an active fast, don't suggest products that clearly conflict with
// the selected fasting profile. Only a definite conflict excludes — most
// packaged products evaluate to "unknown" and excluding those would leave
// the list empty; the fasting card on the product page stays authoritative.
export function fastingConflict(product, fastingProfile, customFasting) {
  if (!fastingProfile || fastingProfile === 'none') return false
  const text = (product || {}).ingredients_text
  if (!text) return false
  const verdict = evaluateFasting(text, fastingProfile, customFasting)
  return verdict?.status === FASTING_STATUS.NOT_SUITABLE
}

/**
 * Fetch with retry for OFF API rate limiting (503 errors).
 * Retries up to 2 times with a short delay.
 */
async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, options)
    // If rate-limited (503) or server error, retry after a delay
    if (res.status === 503 && i < retries) {
      await new Promise(r => setTimeout(r, 800 * (i + 1)))
      continue
    }
    // If we get HTML back instead of JSON (OFF returns HTML on some errors)
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('json') && i < retries) {
      await new Promise(r => setTimeout(r, 800 * (i + 1)))
      continue
    }
    return res
  }
  throw new Error('Search API unavailable')
}

/**
 * Search Open Food Facts by product name.
 * Uses the v2 API which has proper CORS headers (unlike /cgi/search.pl).
 */
export async function searchProducts(query, page = 1, pageSize = 20) {
  const params = new URLSearchParams({
    search_terms: query,
    page: String(page),
    page_size: String(pageSize),
  })

  const res = await fetchWithRetry(`${SEARCH_API}?${params}`, { headers: await authHeader() })

  if (!res.ok) throw new Error('Search failed')

  const data = await res.json()

  return {
    products: (data.products || []).map(p => ({
      barcode: p.code,
      name: p.product_name || 'Unknown',
      brand: p.brands || '',
      image: p.image_front_small_url || null,
      nutriScore: p.nutriscore_grade || null,
      categories: p.categories_tags || [],
      servingSize: p.serving_size || null,
      nutriments: p.nutriments || {},
      ingredients: p.ingredients_text || '',
      novaGroup: p.nova_group || null,
    })),
    totalResults: data.count || 0,
    page,
    pageSize,
  }
}

/**
 * Find alternatives with full nutrition comparison.
 * Tries multiple strategies to always return results.
 */
export async function findAlternatives(product, originalNutrition, worstCategory, limit = 5, profileFilters = {}) {
  const categories = product.categories || []
  const productName = product.name || ''
  const productBrand = product.brand || ''

  // Strategy 1: Search by category tags (try from most specific to broadest)
  // Strategy 2: Search by product name keywords as fallback
  const attempts = []

  // Add category-based searches (most specific first, then broader)
  for (let i = categories.length - 1; i >= Math.max(0, categories.length - 3); i--) {
    attempts.push({ type: 'category', value: categories[i] })
  }

  // Add name-based search as fallback
  // Extract the food type from the product name (e.g., "Nutella" → "chocolate spread")
  const nameWords = productName.split(/[\s(),]+/).filter(w => w.length > 3)
  if (nameWords.length > 0) {
    attempts.push({ type: 'search', value: nameWords.slice(0, 2).join(' ') })
  }

  // If we have a broad category like "snacks" or "chips", also try that
  const broadCategory = categories.find(c =>
    /snack|chip|biscuit|cookie|chocolate|cereal|juice|drink|bread|yogurt|noodle/i.test(c)
  )
  if (broadCategory) {
    attempts.push({ type: 'category', value: broadCategory })
  }

  // Normalize the original product name for dedup
  const origNameNorm = normalizeName(productName, productBrand)

  for (const attempt of attempts) {
    const results = await tryFetchAlternatives(attempt, product.barcode, origNameNorm, originalNutrition, worstCategory, limit, profileFilters)
    if (results.length > 0) {
      console.log(`[NutriScan] Found ${results.length} alternatives via ${attempt.type}: ${attempt.value}`)
      return results
    }
  }

  console.log('[NutriScan] No alternatives found after all attempts')
  return []
}

// Normalize product name for dedup — strips size, weight, flavor variants
function normalizeName(name, brand) {
  return (name || '')
    .toLowerCase()
    .replace(/\d+\s*(g|ml|kg|l|oz|lb)\b/gi, '') // remove sizes
    .replace(/\(.*?\)/g, '')  // remove parenthetical
    .replace(brand?.toLowerCase() || '___', '') // remove brand from name
    .replace(/[^a-z0-9]/g, '') // only alphanum
    .trim()
}

async function tryFetchAlternatives(attempt, excludeBarcode, origNameNorm, originalNutrition, worstCategory, limit, profileFilters = {}) {
  const { diet = 'none', allergens = [], fastingProfile = 'none', customFasting } = profileFilters
  const params = new URLSearchParams({
    page_size: String(limit + 15), // fetch extra to filter
    sort_by: 'nutriscore_score',
    // Only suggest swaps the user can actually buy — restrict alternatives to
    // products sold in India (OFF countries taxonomy). Explicit search stays
    // unfiltered; this only narrows the SmartSwap suggestions.
    countries_tags: 'en:india',
  })

  if (attempt.type === 'category') {
    // v2 API uses categories_tags for category filtering (needs en: prefix)
    const tag = attempt.value.startsWith('en:') ? attempt.value : `en:${attempt.value}`
    params.set('categories_tags', tag)
  } else {
    params.set('search_terms', attempt.value)
  }

  try {
    const res = await fetchWithRetry(`${SEARCH_API}?${params}`, { headers: await authHeader() })

    if (!res.ok) return []

    const data = await res.json()

    // Deduplicate: skip same barcode, same product name, and same brand+name combos
    const seenNames = new Set()
    seenNames.add(origNameNorm) // exclude the original product

    const products = (data.products || [])
      .filter(p => {
        if (p.code === excludeBarcode || !p.product_name || !p.nutriments) return false
        // Family-profile filters (P1): never suggest an alternative that
        // conflicts with the diet, contains/traces a family allergen, or
        // clearly breaks the active fasting profile.
        if (dietConflict(p, diet)) return false
        if (allergenConflict(p, allergens)) return false
        if (fastingConflict(p, fastingProfile, customFasting)) return false
        const norm = normalizeName(p.product_name, p.brands)
        if (!norm || seenNames.has(norm)) return false
        seenNames.add(norm)
        return true
      })

    if (products.length === 0) return []

    const alternatives = products.map(p => {
      const nutri = p.nutriments || {}
      const altNutrition = {
        calories: numOr(nutri['energy-kcal_100g']),
        sugars: numOr(nutri.sugars_100g),
        totalFat: numOr(nutri.fat_100g),
        saturatedFat: numOr(nutri['saturated-fat_100g']),
        sodium: numOr(nutri.sodium_100g, 1000),
        fiber: numOr(nutri.fiber_100g),
        protein: numOr(nutri.proteins_100g),
        totalCarbs: numOr(nutri.carbohydrates_100g),
      }

      // Skip products with no meaningful nutrition data
      const hasData = Object.values(altNutrition).some(v => v !== undefined && v > 0)
      if (!hasData) return null

      const analysis = analyzeFood(altNutrition, p.ingredients_text || '', p.nova_group)

      // Calculate deltas vs original (per 100g). Improvements are structured
      // {pct, key} so the UI can render the nutrient label in the user's
      // language rather than baked-in English.
      const deltas = {}
      const improvements = []
      if (originalNutrition) {
        for (const key of ['calories', 'sugars', 'totalFat', 'saturatedFat', 'sodium', 'fiber', 'protein']) {
          const orig = originalNutrition[key]
          const alt = altNutrition[key]
          if (orig !== undefined && alt !== undefined && orig > 0) {
            const pct = Math.round(((alt - orig) / orig) * 100)
            deltas[key] = pct
            // Track what's better
            const isPositive = key === 'fiber' || key === 'protein'
            if ((isPositive && pct > 10) || (!isPositive && pct < -10)) improvements.push({ pct, key })
          }
        }
      }

      return {
        barcode: p.code,
        name: p.product_name || 'Unknown',
        brand: p.brands || '',
        image: p.image_front_small_url || null,
        nutriScore: p.nutriscore_grade || null,
        nutriscanScore: analysis.overallScore,
        scoreLabel: analysis.scoreLabel,
        nutrition: altNutrition,
        deltas,
        improvements,
      }
    })
      .filter(Boolean)
      .sort((a, b) => b.nutriscanScore - a.nutriscanScore)
      .slice(0, limit)

    return alternatives
  } catch (err) {
    console.warn('[NutriScan] Alternative fetch failed:', err)
    return []
  }
}

function numOr(val, multiplier = 1) {
  if (val === undefined || val === null) return undefined
  const n = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(n) ? undefined : Math.round(n * multiplier * 10) / 10
}
