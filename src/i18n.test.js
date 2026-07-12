import { describe, it, expect } from 'vitest'
import { translateProse, translate, PROSE_LANGS, getProseKeys, getNamespaceKeys } from './i18n'
import { generateExplanation } from './utils/scoreExplainer'
import { analyzeFood } from './utils/scoreEngine'

describe('translateProse', () => {
  it('translates exact engine sentences to Hindi', () => {
    expect(translateProse('hi', 'High in sugar — not ideal for daily tiffin.'))
      .toBe('चीनी अधिक है — रोज़ के टिफ़िन के लिए ठीक नहीं।')
    expect(translateProse('hi', 'Watch portion size')).toBe('पोर्शन साइज़ का ध्यान रखें')
  })

  it('translates number-bearing templates, keeping the numbers', () => {
    const out = translateProse('hi', 'High sodium: 864 mg (43% of daily reference).')
    expect(out).toBe('सोडियम अधिक: 864 mg (दैनिक संदर्भ का 43%)।')
  })

  it('translates word-bearing patterns and maps nutrient labels', () => {
    const out = translateProse('hi', "Sodium is 43% of an adult man's daily reference.")
    expect(out).toBe('सोडियम एक वयस्क पुरुष के दैनिक संदर्भ का 43% है।')
  })

  it('translates severity-cap reasons with mapped labels and joiner', () => {
    const out = translateProse('hi', 'Very high sugar and saturated fat caps the overall score.')
    expect(out).toBe('बहुत अधिक चीनी और सैचुरेटेड फैट के कारण कुल स्कोर सीमित किया गया।')
  })

  it('translates fasting sentences with profile-label mapping', () => {
    const out = translateProse('hi', 'Contains sabudana, potato, which most Navratri fasting profiles do not allow.')
    expect(out).toBe('इसमें sabudana, potato है, जिसकी अनुमति अधिकांश नवरात्रि व्रत प्रोफ़ाइल नहीं देतीं।')
  })

  it('covers Hinglish too', () => {
    expect(translateProse('hi-en', 'High in sugar — not ideal for daily tiffin.'))
      .toBe('Sugar zyada hai — daily tiffin ke liye ideal nahi.')
  })

  it('covers all regional languages', () => {
    expect(translateProse('ta', 'High in sugar — not ideal for daily tiffin.')).toBe('சர்க்கரை அதிகம் — தினசரி டிபனுக்கு ஏற்றதல்ல.')
    expect(translateProse('mr', 'Watch portion size')).toBe('पोर्शन आकाराकडे लक्ष द्या')
    expect(translateProse('gu', 'Very high sodium: 864 mg (43% of daily reference).')).toBe('સોડિયમ ખૂબ વધારે: 864 mg (દૈનિક સંદર્ભના 43%).')
    expect(translateProse('bn', 'Very high sugar and saturated fat caps the overall score.')).toBe('খুব বেশি চিনি এবং স্যাচুরেটেড ফ্যাট-এর কারণে মোট স্কোর সীমিত করা হয়েছে।')
    expect(translateProse('te', "Sodium is 43% of an adult man's daily reference.")).toBe('సోడియం ఒక వయోజన పురుషుడి రోజువారీ ప్రమాణంలో 43%.')
    expect(translateProse('kn', 'Contains sabudana, which most Navratri fasting profiles do not allow.')).toBe('ಇದರಲ್ಲಿ sabudana ಇದೆ; ಹೆಚ್ಚಿನ ನವರಾತ್ರಿ ಉಪವಾಸ ಪ್ರೊಫೈಲ್‌ಗಳು ಇದನ್ನು ಅನುಮತಿಸುವುದಿಲ್ಲ.')
  })

  it('falls back to English for unknown sentences', () => {
    expect(translateProse('hi', 'A sentence the engines never emit.')).toBe('A sentence the engines never emit.')
    expect(translateProse('en', 'Watch portion size')).toBe('Watch portion size')
  })

  it('every language carries the full UI chrome namespaces', () => {
    // Guards against a language missing keys added later (translate() would
    // silently fall back to English, hiding the gap).
    const NAMESPACES = ['scan', 'loadingStatus', 'errors', 'swap', 'swapn', 'ingsheet', 'data', 'correction', 'demographic', 'share', 'scoreword', 'auth', 'account', 'welcome', 'nav', 'plan', 'legal']
    for (const ns of NAMESPACES) {
      const reference = getNamespaceKeys('en', ns)
      expect(reference, `en has ${ns}`).not.toBeNull()
      for (const lang of PROSE_LANGS.filter(l => l !== 'en')) {
        const keys = getNamespaceKeys(lang, ns)
        expect(keys, `${lang} has ${ns}`).not.toBeNull()
        expect(keys.sort(), `${lang}.${ns} keys match en`).toEqual([...reference].sort())
      }
    }
  })

  it('every covered language carries the same prose sentence set', () => {
    // Guards against a language dict missing a sentence added later.
    const reference = getProseKeys('hi').sort()
    for (const lang of PROSE_LANGS.filter(l => l !== 'en')) {
      const keys = getProseKeys(lang)
      expect(keys, `${lang} has a prose dict`).not.toBeNull()
      expect(keys.sort(), `${lang} prose keys match hi`).toEqual(reference)
    }
  })
})

describe('generateExplanation i18n', () => {
  // Sugary drink — capped score, sugar weakness.
  const result = analyzeFood(
    { calories: 180, sugars: 22, totalFat: 0, saturatedFat: 0, sodium: 15, protein: 0, fiber: 0 },
    'carbonated water, sugar, acidity regulator (338), caffeine', 4
  )
  result.productName = 'Cola Test'

  it('produces English by default', () => {
    const en = generateExplanation(result)
    expect(en).toContain('Cola Test scores')
    expect(en).toContain('/10')
  })

  it('produces Hindi with numbers preserved and no stray English template text', () => {
    const hi = generateExplanation(result, 'hi')
    expect(hi).toContain('Cola Test')
    expect(hi).toContain('10 में से')
    expect(hi).toMatch(/[ऀ-ॿ]/) // Devanagari present
    expect(hi).not.toContain('scores')
    expect(hi).not.toContain('Key concerns')
  })

  it('produces Hinglish', () => {
    const hin = generateExplanation(result, 'hi-en')
    expect(hin).toContain('ka score')
  })

  it('every explain key used in English exists for all PROSE_LANGS', () => {
    for (const lang of PROSE_LANGS) {
      // spot-check a few structural keys resolve to non-key strings
      for (const key of ['explain.openAverage', 'explain.mainConcern', 'explain.weakSugar', 'explain.advice.sugars']) {
        const val = translate(lang, key, { name: 'X', score: 5, desc: 'd', g: 1, pct: 2 })
        expect(val).not.toBe(key)
      }
    }
  })
})
