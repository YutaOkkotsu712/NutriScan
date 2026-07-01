// ============================================================================
// Ingredient Encyclopedia — structured reference for clickable ingredients.
//
// Powers the ingredient detail sheet (spec §5): Simple / Safety / Regulation /
// Cultural / Sources tabs. Every entry carries a confidence level and sources.
//
// Regulatory data (spec §5.4, §21): the `regulation` block is structured with
// category, maxLevel, unit, condition, effectiveDate, source and confidence.
// Where a verified category-specific FSSAI limit is not known, maxLevel is
// null with a "verification pending" condition — we NEVER guess a number.
//
// Versioned config module; shape mirrors the future `Ingredient` +
// `AdditiveRegulation` tables (§10). Keyed by canonical id; matched against
// label text via `aliases` and against INS/E codes via `insCodes`.
// ============================================================================

export const ENCYCLOPEDIA_META = {
  version: '2024.2',
  lastReviewed: '2026-06-01',
  entryCount: 0, // filled at export
}

export const CONFIDENCE = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }

// FSSAI regulation reference used across additive entries.
const FSSAI_FA = 'FSSAI Food Safety and Standards (Food Products Standards and Food Additives) Regulations, 2011'
const FSSAI_FA_DATE = '2011-08-01'

// Helper to keep regulation objects consistent.
function reg({ status, category, maxLevel = null, unit = null, condition = null, confidence = CONFIDENCE.MEDIUM, source = FSSAI_FA, effectiveDate = FSSAI_FA_DATE }) {
  return { status, category, maxLevel, unit, condition, confidence, source, effectiveDate }
}

// cultural: veg / jain / vegan / upvas => 'yes' | 'no' | 'depends' | 'unknown'
export const INGREDIENT_ENCYCLOPEDIA = {
  // ---------- Base foods ----------
  refined_wheat_flour: {
    canonicalName: 'Refined Wheat Flour (Maida)',
    aliases: ['maida', 'refined wheat flour', 'refined flour', 'wheat flour (refined)'],
    insCodes: [],
    function: 'Main flour base in biscuits, breads and snacks.',
    plainDescription: 'Finely milled wheat with the bran and germ removed. Low in fibre and digested quickly.',
    riskSummary: 'Low fibre, refined carbohydrate — spikes blood sugar faster than whole grain.',
    safety: { caution: ['diabetes', 'weight-loss'], allergen: 'gluten', note: 'Contains gluten. Refined carb — pair with fibre/protein.' },
    regulation: reg({ status: 'permitted', category: 'Cereal product / general food', confidence: CONFIDENCE.HIGH, source: 'FSSAI Food Products Standards' }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'no', upvasNote: 'Grains/wheat are not allowed in most Upvas profiles.' },
    confidence: CONFIDENCE.HIGH,
    sources: ['FSSAI Food Products Standards', 'ICMR-NIN 2020'],
    lastReviewed: '2026-06-01',
  },
  whole_wheat_flour: {
    canonicalName: 'Whole Wheat Flour (Atta)',
    aliases: ['atta', 'whole wheat flour', 'wholewheat flour', 'whole grain wheat flour'],
    insCodes: [],
    function: 'Whole-grain flour base for rotis, breads and healthier baked goods.',
    plainDescription: 'Flour milled from the whole wheat grain, keeping the bran and germ — more fibre than maida.',
    riskSummary: 'Better than refined flour thanks to its fibre, but still contains gluten.',
    safety: { caution: [], allergen: 'gluten', note: 'Contains gluten.' },
    regulation: reg({ status: 'permitted', category: 'Cereal product', confidence: CONFIDENCE.HIGH, source: 'FSSAI Food Products Standards' }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'no' },
    confidence: CONFIDENCE.HIGH,
    sources: ['FSSAI Food Products Standards', 'ICMR-NIN 2020'],
    lastReviewed: '2026-06-01',
  },
  sugar: {
    canonicalName: 'Sugar (Sucrose)',
    aliases: ['sugar', 'sucrose', 'cane sugar', 'refined sugar'],
    insCodes: [],
    function: 'Sweetener.',
    plainDescription: 'Refined table sugar. Adds sweetness and calories with no fibre or nutrients.',
    riskSummary: 'Added/free sugar — contributes to daily sugar limit. Limit for diabetes and weight goals.',
    safety: { caution: ['diabetes', 'weight-loss', 'kids'], allergen: null, note: 'Counts toward WHO added-sugar limit.' },
    regulation: reg({ status: 'permitted', category: 'Sweetener', confidence: CONFIDENCE.HIGH, source: 'WHO sugar guideline / FSSAI' }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'depends', veganNote: 'Some sugar is refined using bone char; source usually unverified.', upvas: 'yes' },
    confidence: CONFIDENCE.HIGH,
    sources: ['WHO sugar guideline', 'FSSAI'],
    lastReviewed: '2026-06-01',
  },
  salt: {
    canonicalName: 'Salt (Sodium Chloride)',
    aliases: ['salt', 'iodised salt', 'iodized salt', 'sodium chloride', 'common salt'],
    insCodes: [],
    function: 'Flavour and preservative.',
    plainDescription: 'Table salt, the main source of sodium in packaged foods.',
    riskSummary: 'Main sodium source — high intake raises blood pressure. Watch in namkeen, noodles, sauces.',
    safety: { caution: ['bp-sodium', 'elderly'], allergen: null, note: 'Compare sodium amount to your daily reference.' },
    regulation: reg({ status: 'permitted', category: 'General', confidence: CONFIDENCE.HIGH, source: 'WHO sodium guideline / FSSAI' }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'depends', upvasNote: 'Many fasts require sendha namak (rock salt) instead of regular/iodised salt. Rules vary by family.' },
    confidence: CONFIDENCE.HIGH,
    sources: ['WHO sodium guideline', 'FSSAI'],
    lastReviewed: '2026-06-01',
  },
  palm_oil: {
    canonicalName: 'Palm Oil / Palmolein',
    aliases: ['palm oil', 'palmolein', 'palm olein', 'refined palm oil'],
    insCodes: [],
    function: 'Cheap processed fat used for frying and texture.',
    plainDescription: 'A vegetable oil high in saturated fat, common in packaged snacks.',
    riskSummary: 'High in saturated fat — limit frequent intake, especially with BP or heart concerns.',
    safety: { caution: ['bp-sodium', 'weight-loss', 'elderly'], allergen: null, note: 'Evaluate alongside the saturated-fat panel.' },
    regulation: reg({ status: 'permitted', category: 'Edible oil', confidence: CONFIDENCE.HIGH, source: 'FSSAI Edible Oil Standards' }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'depends', upvasNote: 'Some profiles allow specific oils; others restrict. Rules vary.' },
    confidence: CONFIDENCE.HIGH,
    sources: ['FSSAI Edible Oil Standards'],
    lastReviewed: '2026-06-01',
  },
  edible_vegetable_oil: {
    canonicalName: 'Edible Vegetable Oil',
    aliases: ['vegetable oil', 'edible vegetable oil', 'refined vegetable oil', 'sunflower oil', 'soyabean oil', 'soybean oil', 'rice bran oil', 'groundnut oil'],
    insCodes: [],
    function: 'Cooking/frying fat and texture.',
    plainDescription: 'Refined plant oil. Fat quality depends on the specific oil used.',
    riskSummary: 'Calorie-dense fat. Healthier oils are lower in saturated fat.',
    safety: { caution: ['weight-loss'], allergen: null, note: 'Check the saturated-fat panel.' },
    regulation: reg({ status: 'permitted', category: 'Edible oil', confidence: CONFIDENCE.HIGH, source: 'FSSAI Edible Oil Standards' }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'depends' },
    confidence: CONFIDENCE.HIGH,
    sources: ['FSSAI Edible Oil Standards'],
    lastReviewed: '2026-06-01',
  },
  milk_solids: {
    canonicalName: 'Milk Solids',
    aliases: ['milk solids', 'milk solid', 'skimmed milk powder', 'milk powder', 'whey', 'milk fat'],
    insCodes: [],
    function: 'Dairy ingredient for creaminess and flavour.',
    plainDescription: 'Dried milk components used in chocolates, biscuits and beverages.',
    riskSummary: 'Dairy-derived. Not vegan. Relevant for lactose sensitivity and milk allergy.',
    safety: { caution: [], allergen: 'milk', note: 'Milk allergen.' },
    regulation: reg({ status: 'permitted', category: 'Dairy ingredient', confidence: CONFIDENCE.HIGH, source: 'FSSAI Food Products Standards' }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'no', upvas: 'depends', upvasNote: 'Dairy is allowed in many fasts but not all. Rules vary.' },
    confidence: CONFIDENCE.HIGH,
    sources: ['Brand label', 'FSSAI Food Products Standards'],
    lastReviewed: '2026-06-01',
  },
  cocoa_solids: {
    canonicalName: 'Cocoa Solids',
    aliases: ['cocoa solids', 'cocoa', 'cocoa mass', 'cocoa powder', 'cocoa butter'],
    insCodes: [],
    function: 'Chocolate flavour and colour.',
    plainDescription: 'Components of the cacao bean used to make chocolate.',
    riskSummary: 'Generally fine; chocolate products are often high in sugar and fat.',
    safety: { caution: [], allergen: null, note: 'Evaluate the sugar and fat of the whole product.' },
    regulation: reg({ status: 'permitted', category: 'Cocoa product', confidence: CONFIDENCE.HIGH, source: 'FSSAI Food Products Standards' }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'no' },
    confidence: CONFIDENCE.HIGH,
    sources: ['FSSAI Food Products Standards'],
    lastReviewed: '2026-06-01',
  },
  gelatin: {
    canonicalName: 'Gelatin',
    aliases: ['gelatin', 'gelatine'],
    insCodes: [],
    function: 'Gelling agent for texture in jellies, gummies and some dairy.',
    plainDescription: 'A protein usually made from animal collagen (bones/skin).',
    riskSummary: 'Almost always animal-derived — not vegetarian, not Jain, not vegan unless stated plant-based.',
    safety: { caution: [], allergen: null, note: 'Animal-derived ingredient.' },
    regulation: reg({ status: 'permitted', category: 'Gelling agent', confidence: CONFIDENCE.HIGH, source: FSSAI_FA }),
    cultural: { veg: 'no', jain: 'no', vegan: 'no', upvas: 'no' },
    confidence: CONFIDENCE.HIGH,
    sources: ['FSSAI', 'Brand label'],
    lastReviewed: '2026-06-01',
  },

  // ---------- Additives (INS coded) ----------
  ins_471: {
    canonicalName: 'Mono- and Diglycerides of Fatty Acids (INS 471)',
    aliases: ['mono and diglycerides', 'monoglycerides', 'diglycerides', 'ins 471', 'e471'],
    insCodes: ['471'],
    function: 'Emulsifier — keeps fat and water mixed, improves texture.',
    plainDescription: 'A common emulsifier in biscuits, breads and ice cream.',
    riskSummary: 'Generally permitted. Main concern is that it can be animal- or plant-derived.',
    safety: { caution: [], allergen: null, note: 'Processing marker; not a major safety concern within limits.' },
    regulation: reg({ status: 'permitted', category: 'Emulsifier', maxLevel: null, unit: 'mg/kg', condition: 'GMP / quantum satis for most categories; category-specific limits apply.' }),
    cultural: { veg: 'depends', jain: 'depends', vegan: 'depends', culturalNote: 'Can be derived from animal or plant fat. Source is usually not stated — treat as Unknown for Jain/vegetarian unless the brand confirms plant origin.', upvas: 'unknown' },
    confidence: CONFIDENCE.MEDIUM,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_500: {
    canonicalName: 'Raising Agent (INS 500 — Sodium Bicarbonate/Carbonate)',
    aliases: ['raising agent', 'sodium bicarbonate', 'baking soda', 'ins 500', 'e500'],
    insCodes: ['500', '500i', '500ii'],
    function: 'Raising agent — helps baked goods rise.',
    plainDescription: 'Baking soda / washing soda type raising agent.',
    riskSummary: 'Widely used and considered safe within normal amounts. Adds a little sodium.',
    safety: { caution: ['bp-sodium'], allergen: null, note: 'Minor sodium contribution.' },
    regulation: reg({ status: 'permitted', category: 'Raising agent', condition: 'GMP / quantum satis.', confidence: CONFIDENCE.HIGH }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'unknown' },
    confidence: CONFIDENCE.HIGH,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_503: {
    canonicalName: 'Ammonium Carbonates (INS 503)',
    aliases: ['ammonium carbonate', 'ammonium bicarbonate', 'ins 503', 'e503'],
    insCodes: ['503', '503i', '503ii'],
    function: 'Raising agent for biscuits and crackers.',
    plainDescription: 'A traditional raising agent that breaks down into gas when heated.',
    riskSummary: 'Permitted and considered safe in baking; leaves no residue after baking.',
    safety: { caution: [], allergen: null, note: 'Processing aid; safe in normal use.' },
    regulation: reg({ status: 'permitted', category: 'Raising agent', condition: 'GMP / quantum satis.' }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'unknown' },
    confidence: CONFIDENCE.MEDIUM,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_322_lecithin: {
    canonicalName: 'Lecithin (INS 322)',
    aliases: ['lecithin', 'soy lecithin', 'soya lecithin', 'ins 322', 'e322'],
    insCodes: ['322'],
    function: 'Emulsifier, usually from soy or sunflower.',
    plainDescription: 'A natural emulsifier that keeps ingredients blended, common in chocolate.',
    riskSummary: 'Generally safe. Soy lecithin can be an allergen concern for soy-sensitive people.',
    safety: { caution: [], allergen: 'soy', note: 'Soy-derived lecithin may matter for soy allergy.' },
    regulation: reg({ status: 'permitted', category: 'Emulsifier', condition: 'GMP / quantum satis.', confidence: CONFIDENCE.HIGH }),
    cultural: { veg: 'yes', jain: 'depends', jainNote: 'Soy lecithin is plant-based; acceptability depends on family view of soy.', vegan: 'yes', upvas: 'unknown' },
    confidence: CONFIDENCE.HIGH,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_621_msg: {
    canonicalName: 'Monosodium Glutamate (INS 621, MSG)',
    aliases: ['monosodium glutamate', 'msg', 'ins 621', 'e621', 'flavour enhancer 621'],
    insCodes: ['621'],
    function: 'Flavour enhancer.',
    plainDescription: 'A flavour enhancer common in noodles, snacks and seasoning.',
    riskSummary: 'Permitted within limits. Adds sodium; some people prefer to limit it.',
    safety: { caution: ['bp-sodium'], allergen: null, note: 'Contributes sodium; flavour enhancer / processing marker.' },
    regulation: reg({ status: 'permitted', category: 'Flavour enhancer', condition: 'Permitted with category limits; not permitted in food for infants below 12 months (FSSAI).' }),
    cultural: { veg: 'yes', jain: 'depends', vegan: 'yes', upvas: 'no' },
    confidence: CONFIDENCE.MEDIUM,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_150d_caramel: {
    canonicalName: 'Caramel Colour Class IV (INS 150d)',
    aliases: ['caramel colour', 'caramel color', 'ins 150d', 'e150d', 'sulphite ammonia caramel'],
    insCodes: ['150d'],
    function: 'Colouring — brown colour in colas and sauces.',
    plainDescription: 'A processed brown colouring used in soft drinks and sauces.',
    riskSummary: 'Permitted, but Class IV caramel is a processing marker best limited in frequent intake.',
    safety: { caution: ['kids'], allergen: null, note: 'Colour additive; limit frequency for children.' },
    regulation: reg({ status: 'permitted', category: 'Colour', maxLevel: null, unit: 'mg/kg', condition: 'Category-specific limit — verification pending.', confidence: CONFIDENCE.LOW }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'no' },
    confidence: CONFIDENCE.MEDIUM,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_102_tartrazine: {
    canonicalName: 'Tartrazine (INS 102)',
    aliases: ['tartrazine', 'ins 102', 'e102'],
    insCodes: ['102'],
    function: 'Synthetic yellow colour.',
    plainDescription: 'A bright yellow synthetic food colour used in snacks, drinks and sweets.',
    riskSummary: 'Permitted but restricted for children; a synthetic colour best limited.',
    safety: { caution: ['kids'], allergen: null, note: 'Synthetic colour; some sensitivity reported. Limit frequency for children.' },
    regulation: reg({ status: 'permitted', category: 'Synthetic food colour', maxLevel: 100, unit: 'mg/kg', condition: 'Up to 100 mg/kg in specified categories under FSSAI; category-specific.', confidence: CONFIDENCE.MEDIUM }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'no' },
    confidence: CONFIDENCE.MEDIUM,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_110_sunset_yellow: {
    canonicalName: 'Sunset Yellow FCF (INS 110)',
    aliases: ['sunset yellow', 'ins 110', 'e110'],
    insCodes: ['110'],
    function: 'Synthetic orange-yellow colour.',
    plainDescription: 'A synthetic colour used in snacks, sweets and beverages.',
    riskSummary: 'Permitted with limits; synthetic colour, limit frequency especially for children.',
    safety: { caution: ['kids'], allergen: null, note: 'Synthetic colour. Limit for children.' },
    regulation: reg({ status: 'permitted', category: 'Synthetic food colour', maxLevel: 100, unit: 'mg/kg', condition: 'Up to 100 mg/kg in specified categories under FSSAI; category-specific.', confidence: CONFIDENCE.MEDIUM }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'no' },
    confidence: CONFIDENCE.MEDIUM,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_211_sodium_benzoate: {
    canonicalName: 'Sodium Benzoate (INS 211)',
    aliases: ['sodium benzoate', 'ins 211', 'e211'],
    insCodes: ['211'],
    function: 'Preservative against yeast and mould.',
    plainDescription: 'A common preservative in soft drinks, sauces and pickles.',
    riskSummary: 'Permitted within limits. Avoid pairing with vitamin C in drinks (benzene concern) — a processing marker.',
    safety: { caution: ['kids'], allergen: null, note: 'Preservative; permitted within category limits.' },
    regulation: reg({ status: 'permitted', category: 'Preservative', maxLevel: 200, unit: 'mg/kg', condition: 'Commonly up to ~200 mg/kg in carbonated beverages; category-specific under FSSAI.', confidence: CONFIDENCE.MEDIUM }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'no' },
    confidence: CONFIDENCE.MEDIUM,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_330_citric_acid: {
    canonicalName: 'Citric Acid (INS 330)',
    aliases: ['citric acid', 'ins 330', 'e330'],
    insCodes: ['330'],
    function: 'Acidity regulator and mild preservative.',
    plainDescription: 'A naturally occurring acid (as in citrus fruit) used to add tartness and preserve.',
    riskSummary: 'Widely used and considered safe.',
    safety: { caution: [], allergen: null, note: 'Generally recognised as safe.' },
    regulation: reg({ status: 'permitted', category: 'Acidity regulator', condition: 'GMP / quantum satis.', confidence: CONFIDENCE.HIGH }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'unknown' },
    confidence: CONFIDENCE.HIGH,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_296_malic_acid: {
    canonicalName: 'Malic Acid (INS 296)',
    aliases: ['malic acid', 'ins 296', 'e296'],
    insCodes: ['296'],
    function: 'Acidity regulator for a tart taste.',
    plainDescription: 'An acid found naturally in apples, used to add sourness.',
    riskSummary: 'Permitted and considered safe.',
    safety: { caution: [], allergen: null, note: 'Generally recognised as safe.' },
    regulation: reg({ status: 'permitted', category: 'Acidity regulator', condition: 'GMP / quantum satis.', confidence: CONFIDENCE.MEDIUM }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'unknown' },
    confidence: CONFIDENCE.MEDIUM,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_300_ascorbic: {
    canonicalName: 'Ascorbic Acid / Vitamin C (INS 300)',
    aliases: ['ascorbic acid', 'vitamin c', 'ins 300', 'e300'],
    insCodes: ['300'],
    function: 'Antioxidant and flour treatment.',
    plainDescription: 'Vitamin C, used to protect food from going off and to condition dough.',
    riskSummary: 'Safe and often nutritionally beneficial.',
    safety: { caution: [], allergen: null, note: 'Generally recognised as safe.' },
    regulation: reg({ status: 'permitted', category: 'Antioxidant', condition: 'GMP / quantum satis.', confidence: CONFIDENCE.HIGH }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'unknown' },
    confidence: CONFIDENCE.HIGH,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_319_tbhq: {
    canonicalName: 'TBHQ (INS 319)',
    aliases: ['tbhq', 'tertiary butylhydroquinone', 'ins 319', 'e319'],
    insCodes: ['319'],
    function: 'Synthetic antioxidant that stops fats going rancid.',
    plainDescription: 'A preservative used in fried snacks and instant noodles to extend shelf life.',
    riskSummary: 'Permitted with strict limits; best limited in frequent intake of fried packaged foods.',
    safety: { caution: ['kids'], allergen: null, note: 'Synthetic antioxidant; keep frequent intake modest.' },
    regulation: reg({ status: 'permitted', category: 'Antioxidant', maxLevel: 200, unit: 'mg/kg fat', condition: 'Commonly up to ~200 mg/kg of fat; category-specific under FSSAI.', confidence: CONFIDENCE.MEDIUM }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'no' },
    confidence: CONFIDENCE.MEDIUM,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_412_guar: {
    canonicalName: 'Guar Gum (INS 412)',
    aliases: ['guar gum', 'ins 412', 'e412'],
    insCodes: ['412'],
    function: 'Thickener and stabiliser.',
    plainDescription: 'A plant-based thickener from guar beans, used for texture.',
    riskSummary: 'Permitted and generally safe; a source of soluble fibre.',
    safety: { caution: [], allergen: null, note: 'Generally recognised as safe.' },
    regulation: reg({ status: 'permitted', category: 'Thickener', condition: 'GMP / quantum satis.', confidence: CONFIDENCE.HIGH }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'unknown' },
    confidence: CONFIDENCE.HIGH,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_407_carrageenan: {
    canonicalName: 'Carrageenan (INS 407)',
    aliases: ['carrageenan', 'ins 407', 'e407'],
    insCodes: ['407'],
    function: 'Thickener and stabiliser from seaweed.',
    plainDescription: 'A seaweed-derived gelling/thickening agent used in dairy and plant milks.',
    riskSummary: 'Permitted, but a processing marker some prefer to limit.',
    safety: { caution: [], allergen: null, note: 'Texture additive; usually permitted.' },
    regulation: reg({ status: 'permitted', category: 'Thickener / stabiliser', maxLevel: null, unit: 'mg/kg', condition: 'Category-specific limit — verification pending.', confidence: CONFIDENCE.LOW }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'unknown' },
    confidence: CONFIDENCE.MEDIUM,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_415_xanthan: {
    canonicalName: 'Xanthan Gum (INS 415)',
    aliases: ['xanthan gum', 'ins 415', 'e415'],
    insCodes: ['415'],
    function: 'Thickener and stabiliser.',
    plainDescription: 'A fermentation-derived thickener used for texture and to prevent separation.',
    riskSummary: 'Permitted and generally safe.',
    safety: { caution: [], allergen: null, note: 'Generally recognised as safe.' },
    regulation: reg({ status: 'permitted', category: 'Thickener', condition: 'GMP / quantum satis.', confidence: CONFIDENCE.MEDIUM }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'unknown' },
    confidence: CONFIDENCE.MEDIUM,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_950_acesulfame: {
    canonicalName: 'Acesulfame Potassium (INS 950)',
    aliases: ['acesulfame', 'acesulfame potassium', 'acesulfame k', 'ins 950', 'e950'],
    insCodes: ['950'],
    function: 'High-intensity artificial sweetener.',
    plainDescription: 'A calorie-free sweetener used in "diet"/"sugar-free" products.',
    riskSummary: 'Permitted within an Acceptable Daily Intake; common in sugar-free drinks.',
    safety: { caution: ['kids'], allergen: null, note: 'Non-sugar sweetener; within ADI limits.' },
    regulation: reg({ status: 'permitted', category: 'Sweetener (non-nutritive)', maxLevel: null, unit: 'mg/kg', condition: 'Category-specific max levels apply; within ADI — verification pending for exact category.', confidence: CONFIDENCE.LOW }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'no' },
    confidence: CONFIDENCE.MEDIUM,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_955_sucralose: {
    canonicalName: 'Sucralose (INS 955)',
    aliases: ['sucralose', 'ins 955', 'e955'],
    insCodes: ['955'],
    function: 'High-intensity artificial sweetener.',
    plainDescription: 'A calorie-free sweetener made from sugar, used in sugar-free products.',
    riskSummary: 'Permitted within an Acceptable Daily Intake.',
    safety: { caution: ['kids'], allergen: null, note: 'Non-sugar sweetener; within ADI limits.' },
    regulation: reg({ status: 'permitted', category: 'Sweetener (non-nutritive)', maxLevel: null, unit: 'mg/kg', condition: 'Category-specific max levels apply; within ADI — verification pending for exact category.', confidence: CONFIDENCE.LOW }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'no' },
    confidence: CONFIDENCE.MEDIUM,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_160b_annatto: {
    canonicalName: 'Annatto (INS 160b)',
    aliases: ['annatto', 'ins 160b', 'e160b', 'bixin', 'norbixin'],
    insCodes: ['160b'],
    function: 'Natural yellow-orange colour from annatto seeds.',
    plainDescription: 'A plant-based colour used in cheese, snacks and butter.',
    riskSummary: 'Natural colour, generally regarded as low concern.',
    safety: { caution: [], allergen: null, note: 'Natural colour; low concern.' },
    regulation: reg({ status: 'permitted', category: 'Natural colour', maxLevel: null, unit: 'mg/kg', condition: 'Category-specific limit — verification pending.', confidence: CONFIDENCE.LOW }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'no' },
    confidence: CONFIDENCE.MEDIUM,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
  ins_202_potassium_sorbate: {
    canonicalName: 'Potassium Sorbate (INS 202)',
    aliases: ['potassium sorbate', 'ins 202', 'e202'],
    insCodes: ['202'],
    function: 'Preservative against mould and yeast.',
    plainDescription: 'A widely used preservative in baked goods, cheese and drinks.',
    riskSummary: 'Permitted within limits and considered low concern.',
    safety: { caution: [], allergen: null, note: 'Preservative; low concern within limits.' },
    regulation: reg({ status: 'permitted', category: 'Preservative', maxLevel: null, unit: 'mg/kg', condition: 'Category-specific limit — verification pending.', confidence: CONFIDENCE.LOW }),
    cultural: { veg: 'yes', jain: 'yes', vegan: 'yes', upvas: 'no' },
    confidence: CONFIDENCE.MEDIUM,
    sources: [FSSAI_FA],
    lastReviewed: '2026-06-01',
  },
}

ENCYCLOPEDIA_META.entryCount = Object.keys(INGREDIENT_ENCYCLOPEDIA).length

// Flat lookup: alias/ins-code -> encyclopedia key, built once.
const ALIAS_INDEX = (() => {
  const idx = new Map()
  for (const [key, entry] of Object.entries(INGREDIENT_ENCYCLOPEDIA)) {
    for (const a of entry.aliases || []) idx.set(a.toLowerCase().trim(), key)
    for (const c of entry.insCodes || []) {
      idx.set(c.toLowerCase(), key)
      idx.set(`ins${c}`.toLowerCase(), key)
      idx.set(`e${c}`.toLowerCase(), key)
    }
  }
  return idx
})()

export function lookupEncyclopedia(rawIngredient) {
  if (!rawIngredient) return null
  const lower = rawIngredient.toLowerCase().trim()

  // 1. Direct alias hit
  if (ALIAS_INDEX.has(lower)) return INGREDIENT_ENCYCLOPEDIA[ALIAS_INDEX.get(lower)]

  // 2. INS/E code inside the text, e.g. "raising agent (ins 500(ii))"
  const codeMatch = lower.match(/\b(?:ins|e)\s*(\d{3,4}[a-z]?)/i)
  if (codeMatch) {
    const code = codeMatch[1].toLowerCase()
    if (ALIAS_INDEX.has(code)) return INGREDIENT_ENCYCLOPEDIA[ALIAS_INDEX.get(code)]
    if (ALIAS_INDEX.has(`ins${code}`)) return INGREDIENT_ENCYCLOPEDIA[ALIAS_INDEX.get(`ins${code}`)]
  }

  // 3. Substring match against known aliases (longest alias first)
  for (const [alias, key] of [...ALIAS_INDEX.entries()].sort((a, b) => b[0].length - a[0].length)) {
    if (alias.length >= 4 && lower.includes(alias)) return INGREDIENT_ENCYCLOPEDIA[key]
  }

  return null
}

// Return a single entry by its canonical key (for the /api/ingredients/:id API).
export function getEncyclopediaEntry(id) {
  return INGREDIENT_ENCYCLOPEDIA[id] || null
}
