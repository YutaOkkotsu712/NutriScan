// ============================================================================
// Nutrient Reference Database — daily reference values by demographic group.
//
// Powers the "How much of your daily limit?" card (spec §6).
// Values are drawn from ICMR-NIN Dietary Guidelines for Indians (2020) RDAs
// and WHO population nutrient intake goals. These are POPULATION REFERENCES,
// not personalised medical limits — every consumer of this data must surface
// the caveat that values vary by age, body size, activity and health status.
//
// This is a versioned config module (spec §14: config-driven, no app release
// needed to update). Shape mirrors the future `NutrientReference` table (§10).
// ============================================================================

export const NUTRIENT_REFERENCE_META = {
  version: '2024.1',
  lastReviewed: '2026-06-01',
  sources: [
    'ICMR-NIN Dietary Guidelines for Indians 2020 (RDA)',
    'WHO population nutrient intake goals',
  ],
  caveat:
    'Reference values vary by age, body size, activity level and health condition. This is general guidance, not medical advice.',
}

// Direction of each nutrient: 'limit' = lower is better (cap),
// 'goal' = higher is better (target intake).
export const NUTRIENT_DIRECTION = {
  calories: 'limit',
  sodium: 'limit',
  addedSugar: 'limit',
  totalSugar: 'limit',
  saturatedFat: 'limit',
  transFat: 'limit',
  protein: 'goal',
  fibre: 'goal',
}

export const NUTRIENT_UNITS = {
  calories: 'kcal',
  sodium: 'mg',
  addedSugar: 'g',
  totalSugar: 'g',
  saturatedFat: 'g',
  transFat: 'g',
  protein: 'g',
  fibre: 'g',
}

export const NUTRIENT_LABELS = {
  calories: 'Calories',
  sodium: 'Sodium',
  addedSugar: 'Added sugar',
  totalSugar: 'Total sugar',
  saturatedFat: 'Saturated fat',
  transFat: 'Trans fat',
  protein: 'Protein',
  fibre: 'Fibre',
}

// Daily reference values per demographic group.
// calories/protein/fibre from ICMR-NIN 2020; sodium/sugar/fats from WHO goals.
export const DEMOGRAPHIC_REFERENCE = {
  adultMen: {
    label: 'Adult man',
    note: 'Sedentary reference adult male, ICMR-NIN 2020.',
    values: {
      calories: 2110,
      sodium: 2000,
      addedSugar: 25,
      totalSugar: 50,
      saturatedFat: 22,
      transFat: 2.2,
      protein: 54,
      fibre: 40,
    },
  },
  adultWomen: {
    label: 'Adult woman',
    note: 'Sedentary reference adult female, ICMR-NIN 2020.',
    values: {
      calories: 1660,
      sodium: 2000,
      addedSugar: 25,
      totalSugar: 50,
      saturatedFat: 18,
      transFat: 2.0,
      protein: 46,
      fibre: 30,
    },
  },
  elderly: {
    label: 'Elderly',
    note: 'Older adults — no separate official cap for most nutrients; adult reference shown with caution.',
    caution:
      'Older adults are more sensitive to sodium and need adequate protein and fibre. Consult a professional for medical conditions.',
    values: {
      calories: 1700,
      sodium: 1500,
      addedSugar: 25,
      totalSugar: 50,
      saturatedFat: 18,
      transFat: 2.0,
      protein: 54,
      fibre: 30,
    },
  },
  // Children are handled via age bands — a single "child" limit is unsafe (§6.2).
  child_4_6: {
    label: 'Child (4–6 yrs)',
    isChild: true,
    note: 'ICMR-NIN 2020 age-band RDA.',
    values: {
      calories: 1360,
      sodium: 1200,
      addedSugar: 16,
      totalSugar: 34,
      saturatedFat: 15,
      transFat: 1.5,
      protein: 20,
      fibre: 22,
    },
  },
  child_7_9: {
    label: 'Child (7–9 yrs)',
    isChild: true,
    note: 'ICMR-NIN 2020 age-band RDA.',
    values: {
      calories: 1700,
      sodium: 1500,
      addedSugar: 20,
      totalSugar: 42,
      saturatedFat: 19,
      transFat: 1.7,
      protein: 29,
      fibre: 26,
    },
  },
  child_10_12: {
    label: 'Child (10–12 yrs)',
    isChild: true,
    note: 'ICMR-NIN 2020 age-band RDA (average of boys/girls).',
    values: {
      calories: 2100,
      sodium: 1800,
      addedSugar: 25,
      totalSugar: 50,
      saturatedFat: 22,
      transFat: 2.0,
      protein: 40,
      fibre: 32,
    },
  },
  child_13_15: {
    label: 'Teen (13–15 yrs)',
    isChild: true,
    note: 'ICMR-NIN 2020 age-band RDA (average of boys/girls).',
    values: {
      calories: 2500,
      sodium: 2000,
      addedSugar: 25,
      totalSugar: 55,
      saturatedFat: 25,
      transFat: 2.2,
      protein: 50,
      fibre: 38,
    },
  },
}

// Default order for the demographic selector.
export const DEMOGRAPHIC_ORDER = [
  'adultMen',
  'adultWomen',
  'elderly',
  'child_4_6',
  'child_7_9',
  'child_10_12',
  'child_13_15',
]

// Nutrients shown in the allowance card, in priority order for India (§6.4).
export const ALLOWANCE_NUTRIENT_ORDER = [
  'sodium',
  'addedSugar',
  'totalSugar',
  'saturatedFat',
  'transFat',
  'calories',
  'protein',
  'fibre',
]

export function getReference(demographicKey) {
  return DEMOGRAPHIC_REFERENCE[demographicKey] || DEMOGRAPHIC_REFERENCE.adultMen
}
