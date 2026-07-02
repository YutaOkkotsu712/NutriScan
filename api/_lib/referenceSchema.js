// Schema validation for CMS-published ingredient encyclopedia entries.
//
// Mirrors the shape of src/data/ingredientEncyclopedia.js entries. Everything
// is whitelisted: unknown fields are dropped, strings are stripped of HTML and
// control characters and length-capped, enums are enforced. Returns the clean
// entry plus a list of human-readable errors (publish is rejected on errors).

const CONFIDENCE_VALUES = ['high', 'medium', 'low']
const CULTURAL_VALUES = ['yes', 'no', 'depends', 'unknown']

export const INGREDIENT_ID_RE = /^[a-z0-9][a-z0-9_]{1,59}$/

function clean(value, max) {
  if (typeof value !== 'string') return ''
  return value.replace(/<[^>]*>/g, '').replace(/[\x00-\x1F\x7F]/g, ' ').trim().slice(0, max)
}

function cleanArray(value, maxItems, maxLen) {
  if (!Array.isArray(value)) return []
  return value.map(v => clean(v, maxLen)).filter(Boolean).slice(0, maxItems)
}

export function sanitizeIngredientEntry(raw) {
  const errors = []
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { entry: null, errors: ['Entry must be a JSON object.'] }
  }

  const entry = {}

  entry.canonicalName = clean(raw.canonicalName, 120)
  if (entry.canonicalName.length < 2) errors.push('canonicalName is required (2–120 chars).')

  entry.aliases = cleanArray(raw.aliases, 25, 80).map(a => a.toLowerCase())
  entry.insCodes = cleanArray(raw.insCodes, 10, 20)
  entry.function = clean(raw.function, 500)
  entry.plainDescription = clean(raw.plainDescription, 500)
  entry.riskSummary = clean(raw.riskSummary, 500)

  const s = raw.safety && typeof raw.safety === 'object' ? raw.safety : {}
  entry.safety = {
    caution: cleanArray(s.caution, 10, 30),
    allergen: s.allergen == null ? null : clean(s.allergen, 40) || null,
    note: clean(s.note, 300),
  }

  const r = raw.regulation && typeof raw.regulation === 'object' ? raw.regulation : {}
  const maxLevel = r.maxLevel == null ? null : Number(r.maxLevel)
  if (maxLevel !== null && (!Number.isFinite(maxLevel) || maxLevel < 0 || maxLevel > 1e6)) {
    errors.push('regulation.maxLevel must be null or a number ≥ 0.')
  }
  entry.regulation = {
    status: clean(r.status, 40) || 'unknown',
    category: clean(r.category, 120) || null,
    maxLevel: Number.isFinite(maxLevel) ? maxLevel : null,
    unit: r.unit == null ? null : clean(r.unit, 20) || null,
    condition: r.condition == null ? null : clean(r.condition, 300) || null,
    confidence: CONFIDENCE_VALUES.includes(r.confidence) ? r.confidence : 'medium',
    source: clean(r.source, 200) || null,
    effectiveDate: clean(r.effectiveDate, 20) || null,
  }

  const c = raw.cultural && typeof raw.cultural === 'object' ? raw.cultural : {}
  entry.cultural = {}
  for (const key of ['veg', 'jain', 'vegan', 'upvas']) {
    entry.cultural[key] = CULTURAL_VALUES.includes(c[key]) ? c[key] : 'unknown'
    const note = clean(c[`${key}Note`], 300)
    if (note) entry.cultural[`${key}Note`] = note
  }

  entry.confidence = CONFIDENCE_VALUES.includes(raw.confidence) ? raw.confidence : 'medium'
  entry.sources = cleanArray(raw.sources, 10, 200)
  if (entry.sources.length === 0) errors.push('At least one source is required (never publish unsourced data).')
  entry.lastReviewed = clean(raw.lastReviewed, 20) || new Date().toISOString().slice(0, 10)

  return { entry: errors.length ? null : entry, errors }
}
