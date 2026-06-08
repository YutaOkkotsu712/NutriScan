// Handles FSSAI (Indian), US FDA, EU, and international nutrition label formats
// Key differences from US labels:
// - "Energy (kcal)" instead of "Calories"
// - "Saturated Fatty Acids" instead of "Saturated Fat"
// - "Trans Fatty Acids" instead of "Trans Fat"
// - Units in column headers: "Total Fat (g)" with value in next column
// - Per 100g AND per serve columns — %RDA column with percentage values
// - INS numbers instead of E-numbers

const HSPACE = '[ \\t]*'
const UNIT = '(?:m?c?g|kcal|kj|mg|g|9|q)'
const WORD_UNIT = '(?:m?c?g|kcal|kj|mg|g|q)'
const UNIT_BLOCK = `${HSPACE}(?:\\(${HSPACE}${UNIT}${HSPACE}\\)|${UNIT})?`
const SEP = `${HSPACE}[:\\-—|]?${HSPACE}`
const NUM = '(\\d+\\.?\\d*)'

// Structured regex patterns — try to match "keyword [unit] [sep] number"
const NUTRIENT_PATTERNS = [
  {
    key: 'calories',
    patterns: [
      new RegExp(`energy${UNIT_BLOCK}${SEP}${NUM}`, 'i'),
      new RegExp(`calori\\w*${SEP}${NUM}`, 'i'),
      new RegExp(`${NUM}\\s*kcal`, 'i'),
    ]
  },
  {
    key: 'totalFat',
    patterns: [
      new RegExp(`total\\s*fat${UNIT_BLOCK}${SEP}${NUM}`, 'i'),
      new RegExp(`(?:^|\\n)\\s*fat${UNIT_BLOCK}${SEP}${NUM}`, 'im'),
    ]
  },
  {
    key: 'saturatedFat',
    patterns: [
      new RegExp(`sat(?:urated|\\.)?\\.?\\s*fat(?:ty\\s*acids?)?${UNIT_BLOCK}${SEP}${NUM}`, 'i'),
    ]
  },
  {
    key: 'transFat',
    patterns: [
      new RegExp(`trans\\s*fat(?:ty\\s*acids?)?${UNIT_BLOCK}${SEP}${NUM}`, 'i'),
    ]
  },
  {
    key: 'cholesterol',
    patterns: [
      new RegExp(`cholesterol${UNIT_BLOCK}${SEP}${NUM}`, 'i'),
    ]
  },
  {
    key: 'sodium',
    patterns: [
      new RegExp(`sodium${UNIT_BLOCK}${SEP}${NUM}`, 'i'),
    ]
  },
  {
    key: 'totalCarbs',
    patterns: [
      new RegExp(`total\\s*carb(?:ohydrate)?s?${UNIT_BLOCK}${SEP}${NUM}`, 'i'),
      new RegExp(`carb(?:ohydrate)?s?${UNIT_BLOCK}${SEP}${NUM}`, 'i'),
    ]
  },
  {
    key: 'sugars',
    patterns: [
      new RegExp(`total\\s*sugars?${UNIT_BLOCK}${SEP}${NUM}`, 'i'),
      new RegExp(`(?:^|\\n)\\s*sugars?${UNIT_BLOCK}${SEP}${NUM}`, 'im'),
    ]
  },
  {
    key: 'addedSugars',
    patterns: [
      new RegExp(`added\\s*sugars?${UNIT_BLOCK}${SEP}${NUM}`, 'i'),
    ]
  },
  {
    key: 'fiber',
    patterns: [
      new RegExp(`(?:dietary\\s*)?fib(?:er|re)${UNIT_BLOCK}${SEP}${NUM}`, 'i'),
    ]
  },
  {
    key: 'protein',
    patterns: [
      new RegExp(`protein${UNIT_BLOCK}${SEP}${NUM}`, 'i'),
    ]
  },
]

// Line-by-line fallback — matches keyword anywhere in line, extracts number after it
const LINE_KEYWORDS = [
  { key: 'calories',     re: /(?:energy|calori\w*)\b/i,                        minVal: 10 },
  { key: 'totalFat',     re: /\btotal\s*fat\b/i,                               minVal: 0 },
  { key: 'saturatedFat', re: /\bsat(?:urated|\.?)?\s*fat(?:ty\s*acids?)?\b/i,  minVal: 0 },
  { key: 'transFat',     re: /\btrans\s*fat(?:ty\s*acids?)?\b/i,               minVal: 0 },
  { key: 'cholesterol',  re: /\bcholesterol\b/i,                               minVal: 0 },
  { key: 'sodium',       re: /\bsodium\b/i,                                    minVal: 0 },
  { key: 'totalCarbs',   re: /\b(?:total\s*)?carb(?:ohydrate)?s?\b/i,          minVal: 0 },
  { key: 'addedSugars',  re: /\badded\s*sugars?\b/i,                           minVal: 0 },
  { key: 'sugars',       re: /\b(?:total\s+)?sugars?\b(?!\s*alcohol)/i,        minVal: 0 },
  { key: 'fiber',        re: /\b(?:dietary\s*)?fib(?:er|re)\b/i,               minVal: 0 },
  { key: 'protein',      re: /\bprotein\b/i,                                   minVal: 0 },
]

// Per-serving sanity bounds (per 100g values can be higher, so these are generous)
const SANE_RANGES = {
  calories:     { min: 0, max: 1500 },
  totalFat:     { min: 0, max: 100 },
  saturatedFat: { min: 0, max: 60 },
  transFat:     { min: 0, max: 10 },
  cholesterol:  { min: 0, max: 1000 },
  sodium:       { min: 0, max: 8000 },
  totalCarbs:   { min: 0, max: 200 },
  sugars:       { min: 0, max: 150 },
  addedSugars:  { min: 0, max: 150 },
  fiber:        { min: 0, max: 80 },
  protein:      { min: 0, max: 100 },
}

const SERVING_NORMALIZED_KEYS = [
  'calories',
  'totalFat',
  'saturatedFat',
  'transFat',
  'cholesterol',
  'sodium',
  'totalCarbs',
  'sugars',
  'fiber',
  'protein',
]

function isSane(key, value) {
  const range = SANE_RANGES[key]
  if (!range) return true
  return value >= range.min && value <= range.max
}

function sanitize(nutrition) {
  const clean = {}
  for (const [key, value] of Object.entries(nutrition)) {
    if (isSane(key, value)) clean[key] = value
  }
  return clean
}

function hasPer100gTable(text) {
  return /\bper\s*100\s*[g9q]\b/i.test(text) ||
    /\bper\s*100\b/i.test(text) ||
    /\b100\s*[g9q]\s*(?:serv|per)\b/i.test(text)
}

function parseServingSizeGrams(text) {
  const patterns = [
    /\bserving\s*s(?:i|j|1)?z[e3]\D{0,24}(\d+(?:\.\d+)?)\s*(?:g|9|q|grams?)\b/i,
    /\bserving\s*s(?:i|j|1)?z[e3]\D{0,24}(\d+(?:\.\d+)?)\b/i,
    /\bserving[^\n]{0,36}?(\d+(?:\.\d+)?)\s*(?:g|9|q|grams?)\b/i,
    /\bper\s*serv(?:e|ing)\D{0,24}(\d+(?:\.\d+)?)\s*(?:g|9|q|grams?)\b/i,
    /\brda[^\n]{0,48}?\bserv(?:e|ing)?\D{0,24}(\d+(?:\.\d+)?)\s*(?:g|9|q|grams?)\b/i,
    /\b(\d+(?:\.\d+)?)\s*(?:g|9|q)\s*\(?\s*1\s*o(?:z|2)\b/i,
    // Fallback: "Serving size: 25" without unit
    /\bserving\b[^\n]{0,20}?(\d{2,3})\b/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match) continue

    const grams = parseFloat(match[1])
    // Minimum 5g serving — no food has a 2g serving; that's an OCR misread
    if (!isNaN(grams) && grams >= 5 && grams <= 500) return grams
  }

  return null
}

function roundServingValue(key, value) {
  if (value === 0) return 0
  if (key === 'sodium' || key === 'cholesterol') return Math.round(value * 10) / 10
  if (key === 'calories') return Math.round(value)
  return Math.round(value * 10) / 10
}

export function normalizeNutritionForServing(nutrition, ocrText) {
  const cleaned = cleanOcrText(ocrText)
  const isPer100g = hasPer100gTable(cleaned)
  const servingSizeGrams = parseServingSizeGrams(cleaned)
  console.log('[NutriScan] Normalization: per100g=', isPer100g, 'servingSize=', servingSizeGrams)
  if (!isPer100g) return nutrition
  if (!servingSizeGrams) return nutrition

  const factor = servingSizeGrams / 100
  const normalized = { ...nutrition }

  for (const key of SERVING_NORMALIZED_KEYS) {
    if (normalized[key] === undefined) continue
    normalized[key] = roundServingValue(key, normalized[key] * factor)
  }

  return sanitize(normalized)
}

function cleanOcrText(text) {
  let cleaned = text
    .replace(/[|¦]/g, ' ')
    .replace(/[{}[\]]/g, '')
    .replace(/ /g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Remove % RDA values that could leak as nutrient values
    .replace(/(\d+\.?\d*)\s*%/g, '($1%)')

  // Strip %RDA column: if a line has a nutrient keyword followed by
  // two numbers separated by 2+ spaces, keep only the first number
  cleaned = cleaned.replace(
    /^(.+?\d+\.?\d*)\s{2,}(\d+\.?\d*)$/gm,
    '$1'
  )

  return cleaned
}

function stripLeadingUnits(text) {
  return text
    .replace(new RegExp(`^\\s*(?:\\(\\s*${UNIT}\\s*\\)?|${WORD_UNIT}\\b)\\s*`, 'i'), '')
    .replace(/^[^\d.]{0,24}/, '')
}

function extractNumbers(text, minVal = 0) {
  const numbers = []
  const cleaned = text.replace(/(\d+\.?\d*)\s*%/g, '$1')
  const pureNumRe = /(\d+\.?\d*)/g
  let m
  while ((m = pureNumRe.exec(cleaned)) !== null) {
    const val = parseFloat(m[1])
    if (!isNaN(val) && val >= minVal) numbers.push(val)
  }
  return numbers
}

function numericOnlyValue(line, minVal = 0) {
  const numbers = extractNumbers(line, minVal)
  if (numbers.length !== 1) return null

  const residue = line
    .replace(/(\d+\.?\d*)/g, '')
    .replace(/[().,%\-\s]/g, '')

  return residue.length === 0 ? numbers[0] : null
}

function matchLineKeyword(line) {
  return LINE_KEYWORDS.find(({ re }) => re.test(line))
}

function isNutritionRowLabel(line) {
  return Boolean(matchLineKeyword(line)) ||
    /\b(?:vitamin|potassium|calcium|iron|salt|energy|calori\w*)\b/i.test(line)
}

function parseNumericToken(text) {
  const raw = text.trim()
  if (/^\(?\s*[g9q]\s*\)?$/i.test(raw)) return null
  if (/[A-Za-z]/.test(raw.replace(/[OoIl]/g, ''))) return null
  if (!/[0-9]/.test(raw) && !/^[OoIl.,()]+$/.test(raw)) return null

  const cleaned = raw
    .replace(/[Oo]/g, '0')
    .replace(/[Il]/g, '1')
    .replace(/[^\d.]/g, '')

  if (!/\d/.test(cleaned)) return null

  const value = parseFloat(cleaned)
  return isNaN(value) ? null : value
}

function parseTsvWords(tsv) {
  if (!tsv) return []

  const lines = tsv.split('\n').slice(1)
  const words = []

  for (const line of lines) {
    const cols = line.split('\t')
    if (cols.length < 12 || cols[0] !== '5') continue

    const text = cols.slice(11).join('\t').trim()
    if (!text) continue

    const left = Number(cols[6])
    const top = Number(cols[7])
    const width = Number(cols[8])
    const height = Number(cols[9])
    if ([left, top, width, height].some(Number.isNaN)) continue

    words.push({
      text,
      left,
      top,
      width,
      height,
      centerX: left + width / 2,
      centerY: top + height / 2,
      right: left + width,
    })
  }

  return words
}

function groupVisualRows(words) {
  const sorted = [...words].sort((a, b) => a.centerY - b.centerY)
  const rows = []
  const medianHeight = [...words]
    .map(word => word.height)
    .sort((a, b) => a - b)[Math.floor(words.length / 2)] || 28
  const threshold = Math.max(18, medianHeight * 0.65)

  for (const word of sorted) {
    let row = rows.find(candidate => Math.abs(candidate.centerY - word.centerY) <= threshold)
    if (!row) {
      row = { words: [], centerY: word.centerY }
      rows.push(row)
    }

    row.words.push(word)
    row.centerY = row.words.reduce((sum, item) => sum + item.centerY, 0) / row.words.length
  }

  return rows
    .map(row => ({
      ...row,
      words: row.words.sort((a, b) => a.left - b.left),
      text: row.words.sort((a, b) => a.left - b.left).map(word => word.text).join(' '),
    }))
    .sort((a, b) => a.centerY - b.centerY)
}

function estimateRdaBoundary(words, rows) {
  const pageWidth = Math.max(...words.map(word => word.right), 1)
  const rdaWords = words.filter(word => /rda|serve|serv/i.test(word.text))

  if (rdaWords.length > 0) {
    const rdaLeft = Math.min(...rdaWords.map(word => word.left))
    if (rdaLeft > pageWidth * 0.45) return Math.max(pageWidth * 0.55, rdaLeft - pageWidth * 0.06)
  }

  const per100Row = rows.find(row => /per\s*100/i.test(row.text))
  if (per100Row) {
    const headerRight = Math.max(...per100Row.words.map(word => word.right))
    return Math.max(pageWidth * 0.6, headerRight + pageWidth * 0.08)
  }

  return pageWidth * 0.68
}

function parseLayoutTable(tsv, text) {
  const words = parseTsvWords(tsv)
  if (words.length === 0 || !hasPer100gTable(text)) return {}

  const rows = groupVisualRows(words)
  const rdaBoundary = estimateRdaBoundary(words, rows)
  const startIndex = rows.findIndex(row =>
    /\bnutrition(?:al)?\b|\bper\s*100\b|\benergy\b/i.test(row.text)
  )
  const firstRow = startIndex === -1 ? 0 : startIndex
  const stopIndex = rows.findIndex((row, index) =>
    index > firstRow &&
    /\bingredients?\b|\bmanufactured\b|\bmarketed\b|\bimported\b|\bcountry\s*of\b|\bstore\s*away\b|\bcontains\b/i.test(row.text)
  )
  const tableRows = rows.slice(firstRow, stopIndex === -1 ? undefined : stopIndex)
  const nutrition = {}

  for (const row of tableRows) {
    const keyword = matchLineKeyword(row.text)
    if (!keyword || keyword.key in nutrition) continue

    const labelWords = row.words.filter(word => !parseNumericToken(word.text))
    const labelRight = labelWords.length > 0
      ? Math.max(...labelWords.map(word => word.right))
      : Math.min(...row.words.map(word => word.left))

    const candidates = row.words
      .map(word => ({ ...word, value: parseNumericToken(word.text) }))
      .filter(word => word.value !== null && word.value >= keyword.minVal && word.centerX > labelRight)
      .sort((a, b) => a.centerX - b.centerX)

    if (candidates.length === 0) continue

    const per100Candidate = candidates.find(word => word.centerX < rdaBoundary)
    const zeroCandidate = candidates.find(word => word.value === 0)
    const chosen = per100Candidate || zeroCandidate

    if (chosen) nutrition[keyword.key] = chosen.value
  }

  return nutrition
}

function parseWithRegex(cleaned) {
  const nutrition = {}
  for (const { key, patterns } of NUTRIENT_PATTERNS) {
    for (const pattern of patterns) {
      const match = cleaned.match(pattern)
      if (match) {
        const value = parseFloat(match[1])
        if (!isNaN(value)) { nutrition[key] = value; break }
      }
    }
  }
  return nutrition
}

function parseLineByLine(text) {
  const nutrition = {}
  const lines = text.split('\n')

  for (const line of lines) {
    for (const { key, re, minVal } of LINE_KEYWORDS) {
      if (key in nutrition) continue

      const keyMatch = re.exec(line)
      if (!keyMatch) continue

      // Get text AFTER the keyword match + strip unit markers
      const afterKey = line.slice(keyMatch.index + keyMatch[0].length)
      const afterUnits = stripLeadingUnits(afterKey)

      const cleaned = afterUnits.replace(/(\d+\.?\d*)\s*%/g, '')
      const numbers = extractNumbers(cleaned, minVal)

      if (numbers.length > 0) {
        // Take the first number. But if minVal is 0 and the raw text
        // starts with "0", prefer 0 even if we found other numbers
        const rawFirst = cleaned.match(/^\s*(\d+\.?\d*)/)
        if (rawFirst && parseFloat(rawFirst[1]) === 0 && minVal === 0) {
          nutrition[key] = 0
        } else {
          nutrition[key] = numbers[0]
        }
      }
    }
  }

  return nutrition
}

function parseSparseTable(text) {
  const nutrition = {}
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
  const usedValueLines = new Set()

  for (let i = 0; i < lines.length; i++) {
    const keyword = matchLineKeyword(lines[i])
    if (!keyword || keyword.key in nutrition) continue

    const prevValue = i > 0 ? numericOnlyValue(lines[i - 1], keyword.minVal) : null
    const prevPrevIsNumeric = i > 1 && numericOnlyValue(lines[i - 2]) !== null

    if (prevValue !== null && !prevPrevIsNumeric && !usedValueLines.has(i - 1)) {
      nutrition[keyword.key] = prevValue
      usedValueLines.add(i - 1)
      continue
    }

    for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
      if (isNutritionRowLabel(lines[j])) break

      const directValue = numericOnlyValue(lines[j], keyword.minVal)
      const value = directValue ?? extractNumbers(lines[j], keyword.minVal)[0]
      if (value !== undefined) {
        const looksLikeRdaOnly = /%/.test(lines[j]) && !/\b(?:g|9|q|mg)\b/i.test(lines[j])
        if ((keyword.key === 'sugars' || keyword.key === 'addedSugars') && value !== 0 && looksLikeRdaOnly) break
        nutrition[keyword.key] = value
        usedValueLines.add(j)
        break
      }
    }
  }

  return nutrition
}

export function parseNutrition(ocrText, tsv = '') {
  const cleaned = cleanOcrText(ocrText)

  const regexResult = parseWithRegex(cleaned)
  const lineResult = parseLineByLine(cleaned)
  const tableResult = parseSparseTable(cleaned)
  const layoutResult = parseLayoutTable(tsv, cleaned)

  // Merge: layout wins for tabular labels because it can distinguish Per 100g from %RDA.
  const merged = { ...lineResult, ...tableResult, ...regexResult, ...layoutResult }

  // If we have addedSugars but not total sugars, use addedSugars
  if (merged.sugars === undefined && merged.addedSugars !== undefined) {
    merged.sugars = merged.addedSugars
  }

  // Handle salt → sodium conversion (salt in grams × 400 = sodium in mg)
  if (merged.sodium === undefined) {
    const saltMatch = cleaned.match(/salt\s*\(?\s*g?\s*\)?\s*[:\-—]?\s*(\d+\.?\d*)/i)
    if (saltMatch) {
      const val = Math.round(parseFloat(saltMatch[1]) * 400)
      if (isSane('sodium', val)) merged.sodium = val
    }
  }

  // Clean up intermediate keys
  delete merged.addedSugars

  // Cross-validate: detect decimal-loss OCR errors
  // If totalFat + totalCarbs + protein > calories/4, some values likely lost decimals
  return sanitize(fixDecimalLoss(merged))
}

function fixDecimalLoss(nutrition) {
  const n = { ...nutrition }

  const divideByTenIfOver = (key, max) => {
    if (n[key] === undefined || n[key] <= max) return
    const fixed = n[key] / 10
    if (fixed <= max) n[key] = Math.round(fixed * 10) / 10
  }

  // OCR often drops the decimal in tabular labels: 55.7 -> 557, 30.9 -> 309.
  divideByTenIfOver('calories', 1500)
  divideByTenIfOver('totalFat', 100)
  divideByTenIfOver('saturatedFat', 60)
  divideByTenIfOver('totalCarbs', 100)
  divideByTenIfOver('sugars', 100)
  divideByTenIfOver('fiber', 80)
  divideByTenIfOver('protein', 100)

  // Weight sum check: fat + carbs + protein ≤ 100g per 100g
  // If sum exceeds 100, the largest value likely lost its decimal point
  const weightSum = (n.totalFat || 0) + (n.totalCarbs || 0) + (n.protein || 0)
  if (weightSum > 105) {
    // Find the value that, divided by 10, brings sum under 100
    for (const key of ['protein', 'totalCarbs', 'totalFat']) {
      if (n[key] && n[key] > 10) {
        const fixed = n[key] / 10
        const newSum = weightSum - n[key] + fixed
        if (newSum <= 105 && newSum > 10) {
          n[key] = Math.round(fixed * 10) / 10
          break
        }
      }
    }
  }

  // Macro sum check: fat*9 + carbs*4 + protein*4 ≈ calories
  // If sum is wildly over calories, some values probably lost their decimal point
  if (n.calories) {
    const macroCalories = (n.totalFat || 0) * 9 + (n.totalCarbs || 0) * 4 + (n.protein || 0) * 4
    if (macroCalories > n.calories * 2.5) {
      // Something is way off — try dividing large values by 10
      for (const key of ['totalFat', 'saturatedFat', 'protein', 'fiber', 'sugars', 'totalCarbs']) {
        if (n[key] && n[key] > 10) {
          const fixed = n[key] / 10
          const newMacro = ((key === 'totalFat' ? fixed : n.totalFat || 0) * 9 +
            (key === 'totalCarbs' ? fixed : n.totalCarbs || 0) * 4 +
            (key === 'protein' ? fixed : n.protein || 0) * 4)
          if (newMacro < n.calories * 2) {
            n[key] = Math.round(fixed * 10) / 10
          }
        }
      }
    }
  }

  // Trans fat + saturated fat shouldn't exceed total fat
  if (n.totalFat && n.transFat && n.saturatedFat !== undefined) {
    if (n.transFat + n.saturatedFat > n.totalFat * 1.2) {
      const fixed = n.transFat / 10
      if (fixed + n.saturatedFat <= n.totalFat * 1.1) {
        n.transFat = Math.round(fixed * 10) / 10
      } else {
        n.transFat = 0
      }
    }
  }

  // Sodium: values like 5261 are likely 526.1 with lost decimal
  // Most foods have <2500mg sodium per 100g; if over that, try /10
  if (n.sodium && n.sodium > 2500) {
    const fixed = n.sodium / 10
    if (fixed > 50 && fixed < 2500) n.sodium = Math.round(fixed * 10) / 10
  }

  // Component check: saturatedFat + transFat shouldn't exceed totalFat
  if (n.totalFat && n.saturatedFat && n.saturatedFat > n.totalFat * 1.1) {
    const fixed = n.saturatedFat / 10
    if (fixed <= n.totalFat) n.saturatedFat = Math.round(fixed * 10) / 10
  }

  // Sugars shouldn't exceed total carbs
  if (n.totalCarbs && n.sugars && n.sugars > n.totalCarbs * 1.1) {
    const fixed = n.sugars / 10
    if (fixed <= n.totalCarbs) n.sugars = Math.round(fixed * 10) / 10
  }

  // Fiber shouldn't exceed total carbs
  if (n.totalCarbs && n.fiber && n.fiber > n.totalCarbs * 0.6) {
    const fixed = n.fiber / 10
    if (fixed <= n.totalCarbs) n.fiber = Math.round(fixed * 10) / 10
  }

  return n
}

export function parseIngredients(ocrText) {
  const cleaned = cleanOcrText(ocrText)
    .replace(/\(\((\d+\.?\d*%)\)\)/g, '($1)')
    .replace(/\s+/g, ' ')

  // FSSAI labels often have: "Ingredients: ..." followed by "Contains ...", "Allergen ...", etc.
  const boundaries = [
    'contains', 'allergen', 'manufactured', 'distributed', 'best\\s*before',
    'exp', 'storage', 'warning', 'may contain', 'produced', 'keep',
    'ready[\\s-]to', 'store\\s*away', 'country\\s*of', 'fssai',
    'nutritional?\\s*(?:info|fact|value)', 'packed\\s*by', 'marketed\\s*by',
    'imported\\s*by', 'net\\s*(?:wt|weight|qty|quantity)',
  ]
  const ingredientMarker = 'ingredients?\\s*(?:[:\\-—.]|\\s)\\s*'
  const boundaryRe = new RegExp(
    `${ingredientMarker}(.*?)(?:\\.\\s*(?:${boundaries.join('|')}))`,
    'is'
  )

  const match = cleaned.match(boundaryRe)
  if (match) return match[1].trim()

  const markerRe = new RegExp(
    `${ingredientMarker}(.*?)(?=\\b(?:${boundaries.join('|')})\\b)`,
    'is'
  )

  const markerMatch = cleaned.match(markerRe)
  if (markerMatch) return markerMatch[1].trim()

  // Fallback: everything after "Ingredients:"
  const altMatch = cleaned.match(new RegExp(`${ingredientMarker}(.*)`, 'is'))
  if (altMatch) return altMatch[1].trim().slice(0, 800)

  return ''
}

export function countIngredients(ingredientText) {
  if (!ingredientText) return 0
  return ingredientText.split(/,/).filter(s => s.trim().length > 1).length
}

export function mergeNutrition(a, b) {
  const merged = {}
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)])

  for (const key of allKeys) {
    const va = a[key]
    const vb = b[key]

    if (va === undefined) { merged[key] = vb; continue }
    if (vb === undefined) { merged[key] = va; continue }

    const aSane = isSane(key, va)
    const bSane = isSane(key, vb)

    if (aSane && !bSane) { merged[key] = va; continue }
    if (bSane && !aSane) { merged[key] = vb; continue }

    // Prefer values with decimals (OCR that preserved the period)
    const aHasDec = va !== Math.floor(va)
    const bHasDec = vb !== Math.floor(vb)
    if (aHasDec && !bHasDec) { merged[key] = va; continue }
    if (bHasDec && !aHasDec) { merged[key] = vb; continue }

    // Both same — prefer first (a)
    merged[key] = va
  }

  return merged
}
