// ============================================================================
// Fasting / Upvas Profiles — rule tables for religious & cultural fasts.
//
// Powers the fasting compatibility card (spec §8). CRITICAL SAFETY RULE:
// fasting rules vary by family, region and sect. We ALWAYS surface that
// caveat, never assume one national standard, and default to "Unknown" when
// an ingredient's source is ambiguous (§8.3).
//
// Each profile lists ingredient TOKENS (matched against the ingredient text):
//   restricted -> makes the product "Not suitable"
//   depends    -> "Depends on family practice"
// Anything not matched, with adequate ingredient data, is treated as allowed.
// ============================================================================

export const FASTING_META = {
  version: '2024.1',
  lastReviewed: '2026-06-01',
  confidence: 'medium',
  sources: [
    'Curated from widely-followed Hindu vrat/Upvas and Jain dietary practice',
    'Community and dietitian review',
  ],
  globalCaveat: 'Fasting rules vary by family, region and sect. This is general guidance — verify against your own practice.',
}

// Per-profile confidence (spec §8, §11). Rules are curated, not legally defined,
// so confidence is capped at "medium" and always shown with the vary-by-family caveat.
export const FASTING_CONFIDENCE = {
  hindu_upvas_generic: 'medium',
  navratri: 'medium',
  ekadashi: 'medium',
  shravan: 'low',
  jain_satvik: 'high',
}

export const FASTING_PROFILES = {
  hindu_upvas_generic: {
    label: 'Generic Hindu Upvas',
    description: 'Common vrat/fasting pattern — grains, most cereals, regular salt and onion/garlic are usually avoided.',
    // Grains, cereals, legumes commonly disallowed; sendha namak preferred.
    restricted: [
      'wheat', 'maida', 'refined wheat flour', 'atta', 'rice', 'rice flour', 'semolina', 'suji', 'rava',
      'maize', 'corn', 'corn flour', 'oats', 'besan', 'gram flour', 'chickpea', 'lentil', 'dal',
      'soya', 'soy', 'millet', 'bajra', 'jowar', 'ragi', 'barley',
    ],
    depends: [
      'salt', 'iodised salt', 'iodized salt', 'sugar', 'milk', 'milk solids', 'palm oil', 'refined oil',
      'onion', 'garlic',
    ],
    note: 'Many families use sendha namak (rock salt) instead of regular salt, and allow potato, sabudana, singhara, kuttu and dairy.',
  },

  navratri: {
    label: 'Navratri fasting',
    description: 'Nine-day fast — similar to generic Upvas, grains and regular salt typically avoided.',
    restricted: [
      'wheat', 'maida', 'refined wheat flour', 'atta', 'rice', 'rice flour', 'semolina', 'suji', 'rava',
      'maize', 'corn', 'corn flour', 'oats', 'besan', 'gram flour', 'chickpea', 'lentil', 'dal',
      'soya', 'soy', 'millet', 'bajra', 'jowar', 'ragi', 'barley',
    ],
    depends: ['salt', 'iodised salt', 'iodized salt', 'sugar', 'milk', 'palm oil', 'onion', 'garlic'],
    note: 'Kuttu (buckwheat), singhara (water chestnut), sabudana and sendha namak are the typical allowed staples.',
  },

  ekadashi: {
    label: 'Ekadashi fasting',
    description: 'Grains and beans/legumes are traditionally avoided on Ekadashi.',
    restricted: [
      'wheat', 'maida', 'refined wheat flour', 'atta', 'rice', 'rice flour', 'semolina', 'suji', 'rava',
      'maize', 'corn', 'oats', 'besan', 'gram flour', 'chickpea', 'lentil', 'dal', 'soya', 'soy',
      'millet', 'bajra', 'jowar', 'ragi', 'barley', 'beans',
    ],
    depends: ['salt', 'sugar', 'milk', 'onion', 'garlic'],
    note: 'Rules are strict about all grains and pulses. Fruits, dairy and nuts are commonly allowed.',
  },

  shravan: {
    label: 'Shravan fasting',
    description: 'During Shravan many avoid non-veg, onion and garlic; some avoid grains on specific days.',
    restricted: [
      'gelatin', 'meat', 'chicken', 'fish', 'egg', 'egg powder',
    ],
    depends: [
      'onion', 'garlic', 'wheat', 'maida', 'rice', 'salt', 'palm oil',
    ],
    note: 'Practices vary widely — some observe full vegetarianism, others also drop grains on Mondays.',
  },

  jain_satvik: {
    label: 'Jain / Satvik preference',
    description: 'No animal products, and no root vegetables (onion, garlic, potato, ginger, carrot, radish).',
    restricted: [
      'onion', 'garlic', 'potato', 'ginger', 'carrot', 'radish', 'beetroot', 'turnip',
      'gelatin', 'meat', 'chicken', 'fish', 'egg', 'egg powder', 'rennet',
    ],
    depends: [
      'mono and diglycerides', 'ins 471', 'e471', 'flavour', 'flavouring', 'natural flavour',
      'enzymes', 'lecithin',
    ],
    note: 'Strict Jain diets also avoid root vegetables entirely. Ambiguous additives/flavours default to Unknown.',
  },
}

export const FASTING_PROFILE_ORDER = [
  'hindu_upvas_generic',
  'navratri',
  'ekadashi',
  'shravan',
  'jain_satvik',
]

// Verdict statuses for the fasting card (§8.1).
export const FASTING_STATUS = {
  SUITABLE: 'suitable',
  NOT_SUITABLE: 'not_suitable',
  DEPENDS: 'depends',
  UNKNOWN: 'unknown',
}
