// Reviewed data overrides (spec §11, §14) — the "admin-managed reference
// database" for product-level facts.
//
// When a reviewer approves a correction they may attach one structured
// override (a whitelisted field + value). Overrides live in KV under
// `overrides:<barcode>` with full provenance and a version counter, and are
// merged onto the raw Open Food Facts payload by /api/product and
// /api/product-info before anything is scored — so users see reviewed data,
// never raw unreviewed submissions.
//
// The underscore prefix keeps this directory out of Vercel's function routing.

// OFF fields a reviewer may override. Numeric nutriments are per-100g (the
// unit OFF stores); strings are display fields.
export const OVERRIDE_FIELDS = {
  'energy-kcal_100g': 'number',
  'fat_100g': 'number',
  'saturated-fat_100g': 'number',
  'trans-fat_100g': 'number',
  'carbohydrates_100g': 'number',
  'sugars_100g': 'number',
  'fiber_100g': 'number',
  'proteins_100g': 'number',
  'sodium_100g': 'number',
  'salt_100g': 'number',
  'product_name': 'string',
  'serving_size': 'string',
  'quantity': 'string',
}

// Validate a { field, value } override from the admin console.
// Returns { field, value } normalized, or null when invalid.
export function sanitizeOverride(override) {
  if (!override || typeof override !== 'object') return null
  const field = override.field
  // Object.hasOwn: a bare lookup would let prototype keys ("__proto__",
  // "constructor") through, since they resolve to truthy built-ins.
  if (typeof field !== 'string' || !Object.hasOwn(OVERRIDE_FIELDS, field)) return null
  const kind = OVERRIDE_FIELDS[field]
  if (kind === 'number') {
    const value = Number(override.value)
    if (!Number.isFinite(value) || value < 0 || value > 100000) return null
    return { field, value }
  }
  const value = String(override.value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .trim()
    .slice(0, 200)
  if (!value) return null
  return { field, value }
}

export const overridesKey = (barcode) => `overrides:${barcode}`

// Read the override record for a barcode from KV. Best-effort: returns null
// when KV is unconfigured, empty, or errors — lookups must never fail because
// the override store is down.
export async function fetchOverrides(barcode, env) {
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN || !/^\d{6,14}$/.test(barcode || '')) return null
  try {
    const res = await fetch(env.KV_REST_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.KV_REST_API_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify(['GET', overridesKey(barcode)]),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.result) return null
    const parsed = JSON.parse(data.result)
    return parsed && typeof parsed.fields === 'object' ? parsed : null
  } catch {
    return null
  }
}

// Merge an override record onto a raw OFF product object (in place) and stamp
// provenance so clients can show "verified correction applied".
export function applyOverrides(product, overrides) {
  if (!product || !overrides || !overrides.fields) return product
  const applied = []
  for (const [field, entry] of Object.entries(overrides.fields)) {
    if (!Object.hasOwn(OVERRIDE_FIELDS, field) || entry == null) continue
    const kind = OVERRIDE_FIELDS[field]
    if (kind === 'number') {
      product.nutriments = product.nutriments || {}
      product.nutriments[field] = entry.value
      // Keep the unsuffixed alias in sync — our normalizer reads both.
      product.nutriments[field.replace(/_100g$/, '')] = entry.value
    } else {
      product[field] = entry.value
    }
    applied.push(field)
  }
  if (applied.length) {
    product.nutriscan_corrected = {
      fields: applied,
      version: overrides.version || 1,
      updatedAt: overrides.updatedAt || null,
    }
  }
  return product
}
