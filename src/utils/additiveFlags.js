export const HIDDEN_SUGARS = [
  'dextrose', 'maltose', 'fructose', 'hfcs', 'high fructose corn syrup',
  'corn syrup', 'fruit juice concentrate', 'maltodextrin', 'sucrose',
  'glucose', 'evaporated cane juice', 'agave', 'agave nectar',
  'brown rice syrup', 'barley malt', 'caramel', 'cane sugar',
  'coconut sugar', 'date syrup', 'honey', 'invert sugar', 'molasses',
  'maple syrup', 'palm sugar', 'raw sugar', 'turbinado',
  'jaggery', 'gur', 'khandsari', 'liquid glucose',
  'golden syrup', 'treacle', 'rice syrup',
]

export const INGREDIENT_FLAGS = [
  {
    terms: ['hydrogenated', 'partially hydrogenated'],
    concern: 'high',
    reason: 'Possible industrial trans-fat source; best avoided.',
  },
  {
    terms: ['artificial color', 'artificial colour'],
    concern: 'medium',
    reason: 'Synthetic colour; mostly a processing marker unless a specific colour is restricted.',
  },
  {
    terms: ['artificial flavor', 'artificial flavour', 'added flavour', 'added flavor', 'nature identical flavour', 'nature identical flavor'],
    concern: 'medium',
    reason: 'Added flavouring; not automatically unsafe, but it is a processing marker.',
  },
  {
    terms: ['carrageenan', 'xanthan gum'],
    concern: 'medium',
    reason: 'Texture additive; usually permitted, but worth flagging in heavily processed foods.',
  },
  {
    terms: ['bha', 'bht', 'tbhq', 'propyl gallate'],
    concern: 'high',
    reason: 'Synthetic antioxidant/preservative; limit frequent intake.',
  },
  {
    terms: ['sodium nitrite', 'sodium nitrate'],
    concern: 'high',
    reason: 'Curing preservative associated with processed meat concerns.',
  },
  {
    terms: ['potassium bromate'],
    concern: 'high',
    reason: 'Flour treatment additive restricted or banned in several regions.',
  },
  {
    terms: ['sodium benzoate'],
    concern: 'medium',
    reason: 'Preservative; permitted within limits, but a processing marker.',
  },
  {
    terms: ['aspartame', 'acesulfame'],
    concern: 'medium',
    reason: 'Non-sugar sweetener; acceptable within intake limits, but flagged for review.',
  },
  {
    terms: ['monosodium glutamate', 'msg'],
    concern: 'medium',
    reason: 'Flavour enhancer and processing marker; sodium load may matter.',
  },
  {
    terms: ['palm oil', 'palmolein', 'palm olein'],
    concern: 'medium',
    reason: 'Often high in saturated fat; evaluate alongside the fat panel.',
  },
  {
    terms: ['interesterified', 'refined vegetable oil'],
    concern: 'medium',
    reason: 'Processed fat source; evaluate alongside saturated/trans fat values.',
  },
]

export const HARMFUL_ADDITIVES = INGREDIENT_FLAGS.flatMap(flag => flag.terms)

// INS numbers commonly found on Indian FSSAI labels
// Maps INS numbers to human-readable names and concern level
const INS_DATABASE = {
  '100': { name: 'Curcumin', concern: 'low' },
  '110': { name: 'Sunset Yellow', concern: 'high' },
  '120': { name: 'Cochineal/Carmine', concern: 'medium' },
  '122': { name: 'Azorubine', concern: 'high' },
  '124': { name: 'Ponceau 4R', concern: 'high' },
  '127': { name: 'Erythrosine', concern: 'high' },
  '129': { name: 'Allura Red', concern: 'high' },
  '131': { name: 'Patent Blue V', concern: 'high' },
  '132': { name: 'Indigotine', concern: 'medium' },
  '133': { name: 'Brilliant Blue', concern: 'medium' },
  '141': { name: 'Chlorophyll', concern: 'low' },
  '150a': { name: 'Caramel Color I', concern: 'low' },
  '150d': { name: 'Caramel Color IV', concern: 'high' },
  '160a': { name: 'Beta-Carotene', concern: 'low' },
  '160b': { name: 'Annatto', concern: 'low' },
  '171': { name: 'Titanium Dioxide', concern: 'high' },
  '211': { name: 'Sodium Benzoate', concern: 'high' },
  '220': { name: 'Sulphur Dioxide', concern: 'medium' },
  '223': { name: 'Sodium Metabisulphite', concern: 'medium' },
  '249': { name: 'Potassium Nitrite', concern: 'high' },
  '250': { name: 'Sodium Nitrite', concern: 'high' },
  '251': { name: 'Sodium Nitrate', concern: 'high' },
  '270': { name: 'Lactic Acid', concern: 'low' },
  '296': { name: 'Malic Acid', concern: 'low' },
  '300': { name: 'Ascorbic Acid', concern: 'low' },
  '306': { name: 'Tocopherol', concern: 'low' },
  '319': { name: 'TBHQ', concern: 'high' },
  '320': { name: 'BHA', concern: 'high' },
  '321': { name: 'BHT', concern: 'high' },
  '322': { name: 'Lecithin', concern: 'low' },
  '330': { name: 'Citric Acid', concern: 'low' },
  '331': { name: 'Sodium Citrate', concern: 'low' },
  '334': { name: 'Tartaric Acid', concern: 'low' },
  '339': { name: 'Sodium Phosphate', concern: 'medium' },
  '341': { name: 'Calcium Phosphate', concern: 'low' },
  '392': { name: 'Rosemary Extract', concern: 'low' },
  '400': { name: 'Alginic Acid', concern: 'low' },
  '407': { name: 'Carrageenan', concern: 'high' },
  '410': { name: 'Locust Bean Gum', concern: 'low' },
  '412': { name: 'Guar Gum', concern: 'low' },
  '414': { name: 'Gum Arabic', concern: 'low' },
  '415': { name: 'Xanthan Gum', concern: 'medium' },
  '420': { name: 'Sorbitol', concern: 'low' },
  '422': { name: 'Glycerol', concern: 'low' },
  '433': { name: 'Polysorbate 80', concern: 'high' },
  '440': { name: 'Pectin', concern: 'low' },
  '450': { name: 'Diphosphates', concern: 'medium' },
  '451': { name: 'Triphosphates', concern: 'medium' },
  '452': { name: 'Polyphosphates', concern: 'medium' },
  '460': { name: 'Cellulose', concern: 'low' },
  '466': { name: 'Sodium CMC', concern: 'low' },
  '471': { name: 'Mono/Diglycerides', concern: 'medium' },
  '472e': { name: 'DATEM', concern: 'medium' },
  '481': { name: 'Sodium Stearoyl Lactylate', concern: 'medium' },
  '500': { name: 'Sodium Bicarbonate', concern: 'low' },
  '501': { name: 'Potassium Carbonate', concern: 'low' },
  '508': { name: 'Potassium Chloride', concern: 'low' },
  '621': { name: 'MSG', concern: 'high' },
  '627': { name: 'Disodium Guanylate', concern: 'medium' },
  '631': { name: 'Disodium Inosinate', concern: 'medium' },
  '635': { name: 'Disodium Ribonucleotides', concern: 'medium' },
  '950': { name: 'Acesulfame K', concern: 'high' },
  '951': { name: 'Aspartame', concern: 'high' },
  '955': { name: 'Sucralose', concern: 'medium' },
  '960': { name: 'Steviol Glycosides', concern: 'low' },
  '962': { name: 'Aspartame-Acesulfame salt', concern: 'high' },
}

// Matches both INS and E number formats
const INS_E_REGEX = /\b(?:INS|E)\s*(\d{3,4}[a-z]?(?:\s*\([a-z]*\))?)\b/gi

export function countHiddenSugars(ingredientText) {
  const lower = ingredientText.toLowerCase()
  return HIDDEN_SUGARS.filter(s => lower.includes(s)).length
}

export function countAdditives(ingredientText) {
  return getFlaggedItems(ingredientText)
    .filter(item => item.type !== 'hidden_sugar' && item.concern !== 'low')
    .length
}

export function getFlaggedItems(ingredientText) {
  const lower = ingredientText.toLowerCase()
  const items = []

  for (const s of HIDDEN_SUGARS) {
    if (lower.includes(s)) {
      items.push({
        type: 'hidden_sugar',
        name: s,
        concern: 'medium',
        reason: 'Added/free sugar source; evaluate alongside total sugars.',
      })
    }
  }

  for (const flag of INGREDIENT_FLAGS) {
    for (const term of flag.terms) {
      if (lower.includes(term)) {
        items.push({
          type: 'additive',
          name: term,
          concern: flag.concern,
          reason: flag.reason,
        })
      }
    }
  }

  const insMatches = ingredientText.matchAll(INS_E_REGEX)
  for (const match of insMatches) {
    const raw = match[0]
    const num = match[1].replace(/\s*\(.*\)/, '').trim()
    const entry = INS_DATABASE[num] || INS_DATABASE[num.toLowerCase()]
    if (entry) {
      if (entry.concern !== 'low') {
        items.push({
          type: 'additive',
          name: `${raw} (${entry.name})`,
          concern: entry.concern,
          reason: `${entry.name}; permitted additive, flagged because concern level is ${entry.concern}.`,
        })
      }
    } else {
      items.push({
        type: 'additive',
        name: raw,
        concern: 'medium',
        reason: 'Unknown additive code from OCR; review the package label manually.',
      })
    }
  }

  return items
}
