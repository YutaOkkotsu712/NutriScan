const SEARCH_API = 'https://world.openfoodfacts.org/cgi/search.pl'

/**
 * Search Open Food Facts by product name.
 * Returns an array of product summaries.
 */
export async function searchProducts(query, page = 1, pageSize = 20) {
  const params = new URLSearchParams({
    search_terms: query,
    json: 'true',
    page: String(page),
    page_size: String(pageSize),
    fields: 'code,product_name,brands,image_front_small_url,nutriscore_grade,nutriments,categories_tags,serving_size,ingredients_text',
  })

  const res = await fetch(`${SEARCH_API}?${params}`, {
    headers: { 'User-Agent': 'NutriScan/1.0 (PWA food scanner)' },
  })

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
    })),
    totalResults: data.count || 0,
    page,
    pageSize,
  }
}

/**
 * Find better alternatives to a product in the same category.
 * Searches OFF for products in the same category with a better nutriscore.
 */
export async function findAlternatives(product, limit = 5) {
  // Get the most specific category tag
  const categories = product.categories || []
  if (categories.length === 0) return []

  // Try the most specific category first (last in the array)
  const category = categories[categories.length - 1]

  const params = new URLSearchParams({
    tagtype_0: 'categories',
    tag_contains_0: 'contains',
    tag_0: category.replace('en:', ''),
    sort_by: 'nutriscore_score',
    json: 'true',
    page_size: String(limit + 5), // fetch extra to filter out the same product
    fields: 'code,product_name,brands,image_front_small_url,nutriscore_grade,nutriments,serving_size',
  })

  try {
    const res = await fetch(`${SEARCH_API}?${params}`, {
      headers: { 'User-Agent': 'NutriScan/1.0 (PWA food scanner)' },
    })

    if (!res.ok) return []

    const data = await res.json()
    const alternatives = (data.products || [])
      .filter(p => p.code !== product.barcode && p.product_name)
      .map(p => ({
        barcode: p.code,
        name: p.product_name || 'Unknown',
        brand: p.brands || '',
        image: p.image_front_small_url || null,
        nutriScore: p.nutriscore_grade || null,
        nutriments: p.nutriments || {},
        servingSize: p.serving_size || null,
      }))
      .slice(0, limit)

    return alternatives
  } catch {
    return []
  }
}
