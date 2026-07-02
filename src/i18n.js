// ============================================================================
// i18n — English + Hindi (spec §13 MVP languages).
//
// The framework is config-driven: add a language by adding its dictionary to
// STRINGS and an entry to LANGUAGES. Dynamic/generated prose (score-explainer
// sentences, ingredient descriptions, per-group reasons) is intentionally NOT
// translated here — in a non-English language those show English with a
// "translation pending" note (spec §5.4).
//
// Usage:  const { t, lang } = useT();  t('results.share')
//         Enumerated values use namespaced keys, e.g. t(`sverdict.${verdict}`)
// ============================================================================

import { useProfile } from './utils/profile'

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'hi-en', label: 'Hinglish' },
  { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
]

const STRINGS = {
  en: {
    common: {
      appName: 'NutriScan',
      tagline: "Know exactly what's in your food. WHO-aligned health scores with detailed breakdown.",
      home: 'Home', done: 'Done', reset: 'Reset', back: 'Back',
      showDetails: 'Show details', hideDetails: 'Hide details',
      translationPending: 'Shown in English — Hindi translation coming soon.',
      outOf10: 'out of 10',
      offline: "You're offline — showing saved data where available.",
    },
    landing: {
      scanBarcode: 'Scan Barcode',
      searchByName: 'Search by Name',
      uploadPhoto: 'Upload Barcode Photo',
      readingBarcode: 'Reading barcode...',
      footer: 'Barcode & search use Open Food Facts. All analysis happens instantly.',
    },
    verdict: {
      Buy: 'Buy', Limit: 'Limit', Avoid: 'Avoid',
      BuyDesc: 'Good everyday choice',
      LimitDesc: 'Okay occasionally',
      AvoidDesc: 'Best kept as a rare treat',
    },
    results: {
      containsYourAllergens: 'Contains your allergens',
      mayContainTraces: 'May contain traces of',
      whyThisScore: 'Why This Score?',
      share: 'Share', compare: 'Compare', scanAnother: 'Scan Another',
      dataFromOFF: 'Data from Open Food Facts — verified nutrition database',
      containsAllergens: 'Contains Allergens',
      mayContainTracesOf: 'May Contain Traces Of',
    },
    suitability: {
      title: 'Who is this for?',
      subtitle: 'Tap a group to see the verdict, portion and frequency.',
      why: 'Why',
      howMuch: 'How much is okay?',
      howOften: 'How often?',
      pairWith: 'Pair with',
      guidanceNote: "This is additional guidance for this group and does not change the product's general score.",
      suffix: 'suitability',
    },
    group: {
      kids: 'Kids', jain: 'Jain', adultMen: 'Adult men', adultWomen: 'Adult women',
      elderly: 'Elderly', 'bp-sodium': 'BP / Sodium', diabetes: 'Diabetes caution', 'weight-loss': 'Weight loss',
    },
    sverdict: {
      Suitable: 'Suitable', 'Good choice': 'Good choice', Occasional: 'Occasional',
      Limit: 'Limit', Avoid: 'Avoid', Depends: 'Depends', Unknown: 'Unknown',
    },
    allowance: {
      title: 'How much of your daily limit?',
      subtitle: "Amount in one serving vs a day's reference for the selected group.",
    },
    nutrient: {
      Calories: 'Calories', Sodium: 'Sodium', 'Added sugar': 'Added sugar', 'Total sugar': 'Total sugar',
      'Saturated fat': 'Saturated fat', 'Trans fat': 'Trans fat', Protein: 'Protein', Fibre: 'Fibre',
    },
    demographic: {
      adultMen: 'Adult man', adultWomen: 'Adult woman', elderly: 'Elderly',
      child_4_6: 'Child (4–6 yrs)', child_7_9: 'Child (7–9 yrs)',
      child_10_12: 'Child (10–12 yrs)', child_13_15: 'Teen (13–15 yrs)',
    },
    fasting: {
      title: 'Fasting / Upvas compatibility',
      notFasting: 'Not fasting',
      Suitable: 'Suitable', 'Not suitable': 'Not suitable',
      'Depends on family': 'Depends on family', 'Needs label check': 'Needs label check',
      conflicting: 'Conflicting:', dependsOnPractice: 'Depends on practice:',
      customOption: 'My family rules (custom)',
    },
    data: {
      title: 'Data & trust',
      source: 'Source', lastUpdated: 'Last updated', completeness: 'Data completeness',
      fssai: 'FSSAI licence', notFound: 'Not found on label',
      reportCorrect: 'Report or correct this data',
      high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence',
      fssaiHint: 'Licensing/registration status — not a health approval.',
      correctedBanner: 'This product’s data includes a correction verified by NutriScan review.',
      correctedOn: 'Reviewed',
    },
    // Score-explainer templates (spec §5.4) — the "Why this score?" paragraph
    // is assembled from these, so it translates like any other string.
    explain: {
      openStrong: '{name} scores {score}/10 — a strong result. This is a genuinely healthy choice by WHO standards.',
      openDecent: '{name} scores {score}/10 — a decent product with some room for improvement.',
      openAverage: '{name} scores {score}/10 — an average product with notable nutritional concerns.',
      openPoor: '{name} scores {score}/10 — this product has significant health concerns based on WHO guidelines.',
      strongestArea: 'Its strongest area is {desc}.',
      strengthsInclude: 'Its strengths include {list} and {last}.',
      mainConcern: 'The main concern is that {desc}.',
      keyConcerns: 'Key concerns: {list}; and {last}.',
      claimsWarnOne: 'Watch out — the {claims} claim is misleading based on the actual nutrition data.',
      claimsWarnMany: 'Watch out — the {claims} claims are misleading based on the actual nutrition data.',
      'cat.calories': 'calorie content', 'cat.sugars': 'sugar levels', 'cat.fats': 'fat profile',
      'cat.sodium': 'sodium/salt content', 'cat.protein': 'protein content', 'cat.fiber': 'fiber content',
      'cat.processing': 'processing level', 'cat.additives': 'additive profile',
      'level.excellent': 'excellent', 'level.good': 'good', 'level.moderate': 'moderate',
      'level.poor': 'poor', 'level.concerning': 'concerning',
      phraseVeryHigh: 'very high {name}', phraseVeryLow: 'very low {name}',
      phraseSolid: 'solid {name}', phraseReasonable: 'reasonable {name}', phraseLevel: '{level} {name}',
      weakSugar: "sugar is high at {g}g per serving ({pct}% of WHO's daily limit)",
      weakSodium: 'sodium is {mg}mg ({pct}% of the daily limit)',
      weakSatFat: 'saturated fat is {g}g per serving — WHO recommends limiting saturated fat intake',
      weakFat: 'the fat profile is a concern',
      weakCalories: 'it packs {kcal} kcal per serving ({pct}% of daily energy)',
      weakFiber: 'fiber content is low — WHO recommends at least 25g/day',
      weakProtein: 'protein content is minimal',
      weakProcessingNova: "it's classified as NOVA {nova} (ultra-processed)",
      weakProcessing: "it's classified as highly processed",
      weakAdditives: 'it contains multiple flagged additives',
      'advice.sugars': 'Look for unsweetened or reduced-sugar alternatives.',
      'advice.fats': 'Consider options with less saturated fat, like baked variants.',
      'advice.sodium': 'Try lower-sodium versions or season with herbs instead.',
      'advice.calories': 'A smaller portion or lighter alternative might be better.',
      'advice.processing': 'Whole-food alternatives with fewer ingredients would be healthier.',
      'advice.additives': 'Products with shorter, recognizable ingredient lists are preferable.',
      'advice.fiber': 'Adding whole grains, fruits, or vegetables can help meet fiber goals.',
      'advice.protein': 'Pair this with a protein-rich food for a more balanced meal.',
      and: 'and',
    },
    profile: {
      title: 'My family profile',
      intro: 'Set this once — NutriScan will highlight your allergens, use the right daily references, and check your fast on every scan. Saved only on this device.',
      language: 'Language',
      whoShoppingFor: 'Who are you shopping for?',
      dietPref: 'Diet preference',
      myAllergens: 'My allergens',
      fastingUpvas: 'Fasting / Upvas',
      notAllowed: 'Not allowed in our fast',
      allowed: 'Specifically allowed',
    },
    diet: { none: 'No preference', veg: 'Vegetarian', jain: 'Jain', vegan: 'Vegan' },
    correction: {
      title: 'Report or correct data',
      intro: 'Spotted wrong or missing information? Tell us — it goes to review and helps everyone.',
      whatType: "What's wrong?",
      typeNutrition: 'Nutrition values', typeIngredient: 'Ingredients', typeAllergen: 'Allergens',
      typeRegulation: 'Regulatory info', typeOther: 'Something else',
      detailLabel: 'Describe the issue',
      detailPlaceholder: 'e.g. Sugar should be 12g per serving, not 2g.',
      submit: 'Submit correction', submitting: 'Submitting...',
      thanks: 'Thanks! Your correction was submitted for review.',
      failed: "Couldn't submit right now.",
      editOnOFF: 'Or edit directly on Open Food Facts',
      needDetail: 'Please describe what is wrong.',
      reviewNote: 'Corrections are reviewed before they change what anyone sees.',
    },
    search: {
      title: 'Search Products', subtitle: 'Search by product name, brand, or type',
      placeholder: 'e.g. Parle-G, Maggi, Pringles...',
      productsFound: '{count} products found', noResults: 'No products found. Try another name.',
      searching: 'Searching...',
    },
    loading: { analyzing: 'Analyzing...' },
    compare: {
      title: 'Product Comparison', swapSides: 'Swap sides',
      winsOverall: 'wins overall', tie: 'Both products scored equally — a tie!',
      better: 'Better', tieShort: 'Tie', whoBetterFor: 'Who is each better for?',
      scanAnother: 'Scan Another',
    },
    category: {
      calories: 'Calories', sugars: 'Sugars', fats: 'Fats', sodium: 'Sodium',
      protein: 'Protein', fiber: 'Fiber', processing: 'Processing', additives: 'Additives',
    },
    ingredients: {
      title: 'Ingredient Deep Dive', items: '{n} items', avoid: 'Avoid', review: 'Review', ok: 'OK',
      tapHint: 'Tap any ingredient for details. Classification is based on FSSAI/CODEX guidelines.',
    },
    notFound: {
      searchByName: 'Search by Name', tryAnother: 'Try Another Product', tryAgain: 'Try Again',
    },
    comparePick: {
      prompt: 'Pick a product to compare with', comparingAgainst: 'Comparing against:',
      scanBarcode: 'Scan Barcode', searchByName: 'Search by Name', cancel: 'Cancel',
    },
  },

  hi: {
    common: {
      appName: 'न्यूट्रीस्कैन',
      tagline: 'जानिए आपके भोजन में वास्तव में क्या है। WHO-आधारित स्वास्थ्य स्कोर, पूरी जानकारी के साथ।',
      home: 'होम', done: 'हो गया', reset: 'रीसेट', back: 'वापस',
      showDetails: 'विवरण देखें', hideDetails: 'विवरण छिपाएँ',
      translationPending: 'अंग्रेज़ी में दिखाया गया — हिन्दी अनुवाद जल्द आ रहा है।',
      outOf10: '10 में से',
      offline: 'आप ऑफ़लाइन हैं — जहाँ उपलब्ध है वहाँ सहेजा डेटा दिखाया जा रहा है।',
    },
    landing: {
      scanBarcode: 'बारकोड स्कैन करें',
      searchByName: 'नाम से खोजें',
      uploadPhoto: 'बारकोड फ़ोटो अपलोड करें',
      readingBarcode: 'बारकोड पढ़ा जा रहा है...',
      footer: 'बारकोड और खोज Open Food Facts का उपयोग करते हैं। सारा विश्लेषण तुरंत होता है।',
    },
    verdict: {
      Buy: 'खरीदें', Limit: 'सीमित करें', Avoid: 'टालें',
      BuyDesc: 'रोज़ के लिए अच्छा विकल्प',
      LimitDesc: 'कभी-कभी ठीक है',
      AvoidDesc: 'कभी-कभार ही लें',
    },
    results: {
      containsYourAllergens: 'आपके एलर्जन मौजूद हैं',
      mayContainTraces: 'इनके अंश हो सकते हैं',
      whyThisScore: 'यह स्कोर क्यों?',
      share: 'साझा करें', compare: 'तुलना करें', scanAnother: 'दूसरा स्कैन करें',
      dataFromOFF: 'डेटा Open Food Facts से — सत्यापित पोषण डेटाबेस',
      containsAllergens: 'एलर्जन मौजूद हैं',
      mayContainTracesOf: 'इनके अंश हो सकते हैं',
    },
    suitability: {
      title: 'यह किसके लिए है?',
      subtitle: 'फ़ैसला, मात्रा और आवृत्ति देखने के लिए किसी समूह पर टैप करें।',
      why: 'क्यों',
      howMuch: 'कितना ठीक है?',
      howOften: 'कितनी बार?',
      pairWith: 'इसके साथ लें',
      guidanceNote: 'यह इस समूह के लिए अतिरिक्त मार्गदर्शन है और उत्पाद के सामान्य स्कोर को नहीं बदलता।',
      suffix: 'उपयुक्तता',
    },
    group: {
      kids: 'बच्चे', jain: 'जैन', adultMen: 'वयस्क पुरुष', adultWomen: 'वयस्क महिला',
      elderly: 'बुज़ुर्ग', 'bp-sodium': 'BP / सोडियम', diabetes: 'मधुमेह सावधानी', 'weight-loss': 'वज़न घटाना',
    },
    sverdict: {
      Suitable: 'उपयुक्त', 'Good choice': 'अच्छा विकल्प', Occasional: 'कभी-कभी',
      Limit: 'सीमित करें', Avoid: 'टालें', Depends: 'निर्भर करता है', Unknown: 'अज्ञात',
    },
    allowance: {
      title: 'आपकी दैनिक सीमा का कितना?',
      subtitle: 'एक सर्विंग की मात्रा बनाम चुने हुए समूह की दैनिक संदर्भ मात्रा।',
    },
    nutrient: {
      Calories: 'कैलोरी', Sodium: 'सोडियम', 'Added sugar': 'मिलाई गई शक्कर', 'Total sugar': 'कुल शक्कर',
      'Saturated fat': 'संतृप्त वसा', 'Trans fat': 'ट्रांस वसा', Protein: 'प्रोटीन', Fibre: 'फ़ाइबर',
    },
    demographic: {
      adultMen: 'वयस्क पुरुष', adultWomen: 'वयस्क महिला', elderly: 'बुज़ुर्ग',
      child_4_6: 'बच्चा (4–6 वर्ष)', child_7_9: 'बच्चा (7–9 वर्ष)',
      child_10_12: 'बच्चा (10–12 वर्ष)', child_13_15: 'किशोर (13–15 वर्ष)',
    },
    fasting: {
      title: 'व्रत / उपवास अनुकूलता',
      notFasting: 'व्रत नहीं',
      Suitable: 'उपयुक्त', 'Not suitable': 'उपयुक्त नहीं',
      'Depends on family': 'परिवार पर निर्भर', 'Needs label check': 'लेबल जाँचें',
      conflicting: 'विरोधी सामग्री:', dependsOnPractice: 'प्रथा पर निर्भर:',
      customOption: 'मेरे परिवार के नियम (कस्टम)',
    },
    data: {
      title: 'डेटा और भरोसा',
      source: 'स्रोत', lastUpdated: 'अंतिम अपडेट', completeness: 'डेटा पूर्णता',
      fssai: 'FSSAI लाइसेंस', notFound: 'लेबल पर नहीं मिला',
      reportCorrect: 'यह डेटा रिपोर्ट करें या सुधारें',
      high: 'उच्च भरोसा', medium: 'मध्यम भरोसा', low: 'कम भरोसा',
      fssaiHint: 'लाइसेंस/पंजीकरण स्थिति — स्वास्थ्य स्वीकृति नहीं।',
      correctedBanner: 'इस उत्पाद के डेटा में NutriScan समीक्षा द्वारा सत्यापित सुधार शामिल है।',
      correctedOn: 'समीक्षा',
    },
    profile: {
      title: 'मेरा परिवार प्रोफ़ाइल',
      intro: 'एक बार सेट करें — न्यूट्रीस्कैन हर स्कैन पर आपके एलर्जन दिखाएगा, सही दैनिक संदर्भ इस्तेमाल करेगा और आपका व्रत जाँचेगा। केवल इस डिवाइस पर सहेजा जाता है।',
      language: 'भाषा',
      whoShoppingFor: 'आप किसके लिए खरीद रहे हैं?',
      dietPref: 'आहार वरीयता',
      myAllergens: 'मेरे एलर्जन',
      fastingUpvas: 'व्रत / उपवास',
      notAllowed: 'हमारे व्रत में मना',
      allowed: 'विशेष रूप से अनुमति',
    },
    diet: { none: 'कोई वरीयता नहीं', veg: 'शाकाहारी', jain: 'जैन', vegan: 'वीगन' },
    correction: {
      title: 'डेटा रिपोर्ट करें या सुधारें',
      intro: 'गलत या अधूरी जानकारी दिखी? हमें बताएँ — इसकी समीक्षा होगी और सबको लाभ मिलेगा।',
      whatType: 'क्या गलत है?',
      typeNutrition: 'पोषण मान', typeIngredient: 'सामग्री', typeAllergen: 'एलर्जन',
      typeRegulation: 'नियामक जानकारी', typeOther: 'कुछ और',
      detailLabel: 'समस्या बताएँ',
      detailPlaceholder: 'जैसे: शक्कर प्रति सर्विंग 12g होनी चाहिए, 2g नहीं।',
      submit: 'सुधार भेजें', submitting: 'भेजा जा रहा है...',
      thanks: 'धन्यवाद! आपका सुधार समीक्षा के लिए भेज दिया गया।',
      failed: 'अभी भेज नहीं सके।',
      editOnOFF: 'या सीधे Open Food Facts पर संपादित करें',
      needDetail: 'कृपया बताएँ कि क्या गलत है।',
      reviewNote: 'सुधारों की समीक्षा होती है, तभी वे सबको दिखते हैं।',
    },
    search: {
      title: 'उत्पाद खोजें', subtitle: 'नाम, ब्रांड या प्रकार से खोजें',
      placeholder: 'जैसे: पारले-जी, मैगी, प्रिंगल्स...',
      productsFound: '{count} उत्पाद मिले', noResults: 'कोई उत्पाद नहीं मिला। दूसरा नाम आज़माएँ।',
      searching: 'खोजा जा रहा है...',
    },
    loading: { analyzing: 'विश्लेषण हो रहा है...' },
    compare: {
      title: 'उत्पाद तुलना', swapSides: 'पक्ष बदलें',
      winsOverall: 'कुल मिलाकर आगे', tie: 'दोनों उत्पाद बराबर — टाई!',
      better: 'बेहतर', tieShort: 'टाई', whoBetterFor: 'हर एक किसके लिए बेहतर?',
      scanAnother: 'दूसरा स्कैन करें',
    },
    category: {
      calories: 'कैलोरी', sugars: 'शक्कर', fats: 'वसा', sodium: 'सोडियम',
      protein: 'प्रोटीन', fiber: 'फ़ाइबर', processing: 'प्रसंस्करण', additives: 'योजक',
    },
    ingredients: {
      title: 'सामग्री विस्तार', items: '{n} सामग्री', avoid: 'टालें', review: 'जाँचें', ok: 'ठीक',
      tapHint: 'विवरण के लिए किसी सामग्री पर टैप करें। वर्गीकरण FSSAI/CODEX दिशानिर्देशों पर आधारित है।',
    },
    notFound: {
      searchByName: 'नाम से खोजें', tryAnother: 'दूसरा उत्पाद आज़माएँ', tryAgain: 'फिर कोशिश करें',
    },
    comparePick: {
      prompt: 'तुलना के लिए एक उत्पाद चुनें', comparingAgainst: 'इससे तुलना:',
      scanBarcode: 'बारकोड स्कैन करें', searchByName: 'नाम से खोजें', cancel: 'रद्द करें',
    },
    explain: {
      openStrong: '{name} को 10 में से {score} अंक — एक मज़बूत नतीजा। WHO मानकों के अनुसार यह वाक़ई एक सेहतमंद विकल्प है।',
      openDecent: '{name} को 10 में से {score} अंक — ठीक-ठाक उत्पाद, कुछ सुधार की गुंजाइश है।',
      openAverage: '{name} को 10 में से {score} अंक — औसत उत्पाद, कुछ पोषण संबंधी चिंताएँ हैं।',
      openPoor: '{name} को 10 में से {score} अंक — WHO दिशानिर्देशों के अनुसार इस उत्पाद में गंभीर स्वास्थ्य चिंताएँ हैं।',
      strongestArea: 'इसका सबसे मज़बूत पक्ष है {desc}।',
      strengthsInclude: 'इसकी खूबियों में {list} और {last} शामिल हैं।',
      mainConcern: 'मुख्य चिंता यह है कि {desc}।',
      keyConcerns: 'मुख्य चिंताएँ: {list}; और {last}।',
      claimsWarnOne: 'सावधान — {claims} का दावा वास्तविक पोषण डेटा के आधार पर भ्रामक है।',
      claimsWarnMany: 'सावधान — {claims} के दावे वास्तविक पोषण डेटा के आधार पर भ्रामक हैं।',
      'cat.calories': 'कैलोरी मात्रा', 'cat.sugars': 'चीनी स्तर', 'cat.fats': 'फैट प्रोफ़ाइल',
      'cat.sodium': 'सोडियम/नमक मात्रा', 'cat.protein': 'प्रोटीन मात्रा', 'cat.fiber': 'फाइबर मात्रा',
      'cat.processing': 'प्रोसेसिंग स्तर', 'cat.additives': 'एडिटिव प्रोफ़ाइल',
      'level.excellent': 'बेहतरीन', 'level.good': 'अच्छा', 'level.moderate': 'मध्यम',
      'level.poor': 'कमज़ोर', 'level.concerning': 'चिंताजनक',
      phraseVeryHigh: 'बहुत अधिक {name}', phraseVeryLow: 'बहुत कम {name}',
      phraseSolid: 'अच्छा-खासा {name}', phraseReasonable: 'ठीक-ठाक {name}', phraseLevel: '{level} {name}',
      weakSugar: 'चीनी अधिक है — {g}g प्रति सर्विंग (WHO की दैनिक सीमा का {pct}%)',
      weakSodium: 'सोडियम {mg}mg है (दैनिक सीमा का {pct}%)',
      weakSatFat: 'सैचुरेटेड फैट {g}g प्रति सर्विंग है — WHO इसे सीमित रखने की सलाह देता है',
      weakFat: 'फैट प्रोफ़ाइल चिंता का विषय है',
      weakCalories: 'इसमें {kcal} kcal प्रति सर्विंग है (दैनिक ऊर्जा का {pct}%)',
      weakFiber: 'फाइबर कम है — WHO कम से कम 25g/दिन की सलाह देता है',
      weakProtein: 'प्रोटीन बहुत कम है',
      weakProcessingNova: 'यह NOVA {nova} (अल्ट्रा-प्रोसेस्ड) श्रेणी में है',
      weakProcessing: 'यह अत्यधिक प्रोसेस्ड श्रेणी में है',
      weakAdditives: 'इसमें कई चिह्नित एडिटिव हैं',
      'advice.sugars': 'बिना चीनी या कम चीनी वाले विकल्प देखें।',
      'advice.fats': 'कम सैचुरेटेड फैट वाले विकल्प चुनें, जैसे बेक्ड वेरिएंट।',
      'advice.sodium': 'कम सोडियम वाले विकल्प आज़माएँ या हर्ब्स/मसालों से स्वाद बढ़ाएँ।',
      'advice.calories': 'छोटा पोर्शन या हल्का विकल्प बेहतर रहेगा।',
      'advice.processing': 'कम सामग्री वाले होल-फूड विकल्प ज़्यादा सेहतमंद होंगे।',
      'advice.additives': 'छोटी, पहचानी जा सकने वाली सामग्री सूची वाले उत्पाद बेहतर हैं।',
      'advice.fiber': 'साबुत अनाज, फल या सब्ज़ियाँ जोड़ने से फाइबर लक्ष्य पूरा हो सकता है।',
      'advice.protein': 'संतुलित भोजन के लिए इसे किसी प्रोटीन-युक्त चीज़ के साथ लें।',
      and: 'और',
    },
    // Generated-prose dictionary: exact English sentence (numbers → {0},{1}…) → translation.
    prose: {
      'High in sugar — not ideal for daily tiffin.': 'चीनी अधिक है — रोज़ के टिफ़िन के लिए ठीक नहीं।',
      'High sodium for a child portion.': 'बच्चे के पोर्शन के हिसाब से सोडियम अधिक है।',
      'Provides useful protein.': 'अच्छी मात्रा में प्रोटीन देता है।',
      'Low fibre — pair with fruit or nuts.': 'फाइबर कम है — फल या मेवों के साथ दें।',
      'Okay occasionally in a balanced tiffin.': 'संतुलित टिफ़िन में कभी-कभार ठीक है।',
      'A few times a week': 'हफ़्ते में कुछ बार',
      'Occasional treat, not daily': 'कभी-कभार का ट्रीट, रोज़ नहीं',
      'Pair with fruit or a protein source': 'फल या किसी प्रोटीन स्रोत के साथ लें',
      'For child nutrition concerns, consult a qualified professional.': 'बच्चों के पोषण संबंधी चिंता के लिए योग्य विशेषज्ञ से सलाह लें।',
      'Contains non-vegetarian ingredients.': 'इसमें मांसाहारी सामग्री है।',
      'Contains gelatin/rennet (animal-derived).': 'इसमें जिलेटिन/रेनेट (पशु-स्रोत) है।',
      'Ingredient list not available to verify Jain suitability.': 'जैन उपयुक्तता जाँचने के लिए सामग्री सूची उपलब्ध नहीं है।',
      'Source of some additives is not verified — check flavours/emulsifiers/enzymes.': 'कुछ एडिटिव का स्रोत सत्यापित नहीं है — फ्लेवर/इमल्सीफायर/एंज़ाइम जाँचें।',
      'No animal-derived or root ingredients detected.': 'कोई पशु-स्रोत या कंदमूल सामग्री नहीं मिली।',
      'No obvious conflicts, but vegetarian/Jain source is not fully verified.': 'कोई स्पष्ट विरोध नहीं, पर शाकाहारी/जैन स्रोत पूरी तरह सत्यापित नहीं है।',
      'Jain rules vary by family. Ambiguous additive/flavour sources are shown as Depends/Unknown.': 'जैन नियम परिवार के अनुसार अलग होते हैं। अस्पष्ट एडिटिव/फ्लेवर स्रोत "निर्भर"/"अज्ञात" दिखाए जाते हैं।',
      'Decent protein for the portion.': 'पोर्शन के हिसाब से ठीक-ठाक प्रोटीन।',
      'Fits an adult diet in normal portions.': 'सामान्य पोर्शन में वयस्क आहार के अनुकूल।',
      'Fine in regular portions': 'सामान्य पोर्शन में ठीक',
      'Watch portion size': 'पोर्शन साइज़ का ध्यान रखें',
      'Pregnancy/lactation needs differ — a separate profile is planned.': 'गर्भावस्था/स्तनपान की ज़रूरतें अलग होती हैं — अलग प्रोफ़ाइल की योजना है।',
      'Sodium is high — a concern for blood pressure in older adults.': 'सोडियम अधिक है — बुज़ुर्गों में ब्लड प्रेशर के लिए चिंता की बात।',
      'High saturated fat.': 'सैचुरेटेड फैट अधिक है।',
      'Protein supports muscle maintenance.': 'प्रोटीन मांसपेशियों को बनाए रखने में मदद करता है।',
      'Low fibre — may not aid digestion.': 'फाइबर कम है — पाचन में मदद नहीं करेगा।',
      'Reasonable for older adults in moderate portions.': 'सीमित पोर्शन में बुज़ुर्गों के लिए ठीक है।',
      'Limit frequency': 'कम बार लें',
      'Moderate portions': 'सीमित पोर्शन',
      'For heart, kidney or BP conditions, consult a healthcare professional.': 'हृदय, किडनी या BP की स्थिति में डॉक्टर से सलाह लें।',
      'Sodium value not available.': 'सोडियम की मात्रा उपलब्ध नहीं है।',
      'Balance with fresh, low-salt foods the rest of the day': 'दिन भर ताज़े, कम नमक वाले खाने से संतुलन बनाएँ',
      'For diagnosed hypertension, follow your doctor’s sodium advice.': 'डायग्नोस्ड हाई BP में डॉक्टर की सोडियम सलाह मानें।',
      'Low fibre — refined carbs raise blood sugar faster.': 'फाइबर कम है — रिफाइंड कार्ब्स ब्लड शुगर तेज़ी से बढ़ाते हैं।',
      'Made with refined flour (maida).': 'रिफाइंड आटे (मैदा) से बना है।',
      'Sugar value not available.': 'चीनी की मात्रा उपलब्ध नहीं है।',
      'Sugar is not the only factor — refined carbs, fibre and portion all matter.': 'सिर्फ़ चीनी ही नहीं — रिफाइंड कार्ब्स, फाइबर और पोर्शन सब मायने रखते हैं।',
      'Pair with protein/fibre to slow the sugar spike': 'शुगर स्पाइक धीमा करने के लिए प्रोटीन/फाइबर के साथ लें',
      'Not medical advice — follow your diabetes care plan.': 'यह चिकित्सा सलाह नहीं है — अपना डायबिटीज़ केयर प्लान मानें।',
      'Protein helps satiety.': 'प्रोटीन पेट भरा रखने में मदद करता है।',
      'Low fibre — less filling, easy to overeat.': 'फाइबर कम — पेट कम भरता है, ज़्यादा खाना आसान।',
      'High sugar adds empty calories.': 'अधिक चीनी खाली कैलोरी जोड़ती है।',
      'Fits a weight-loss plan in controlled portions.': 'नियंत्रित पोर्शन में वेट-लॉस प्लान के अनुकूल।',
      'Mind the portion and overall daily calories': 'पोर्शन और कुल दैनिक कैलोरी का ध्यान रखें',
      '3–4 biscuits': '3–4 बिस्कुट',
      'a small bowl (about 30 g)': 'एक छोटी कटोरी (लगभग 30 g)',
      'half a pack': 'आधा पैक',
      '2–3 small squares': '2–3 छोटे टुकड़े',
      'one small glass (200 ml)': 'एक छोटा गिलास (200 ml)',
      'one bowl (about 30 g)': 'एक कटोरी (लगभग 30 g)',
      'a small serving': 'एक छोटी सर्विंग',
      'Ingredient list not available to verify against this fast.': 'इस व्रत के लिए जाँचने हेतु सामग्री सूची उपलब्ध नहीं है।',
      'No conflicting ingredients detected for this fasting profile.': 'इस व्रत प्रोफ़ाइल के लिए कोई विरोधी सामग्री नहीं मिली।',
      'Very high sodium: {0} mg ({1}% of daily reference).': 'सोडियम बहुत अधिक: {0} mg (दैनिक संदर्भ का {1}%)।',
      'High sodium: {0} mg ({1}% of daily reference).': 'सोडियम अधिक: {0} mg (दैनिक संदर्भ का {1}%)।',
      'Sodium is {0} mg ({1}% of daily reference).': 'सोडियम {0} mg है (दैनिक संदर्भ का {1}%)।',
      'Sugar: {0} g per serving.': 'चीनी: {0} g प्रति सर्विंग।',
      '{0} kcal per serving.': '{0} kcal प्रति सर्विंग।',
      'Contains root vegetables ({0}) avoided in Jain diets.': 'इसमें कंदमूल ({0}) हैं, जो जैन आहार में वर्जित हैं।',
      '"{0}" has an unverified source.': '"{0}" का स्रोत सत्यापित नहीं है।',
      "{0} is {1}% of an adult man's daily reference.": '{0} एक वयस्क पुरुष के दैनिक संदर्भ का {1}% है।',
      "{0} is {1}% of an adult woman's daily reference.": '{0} एक वयस्क महिला के दैनिक संदर्भ का {1}% है।',
      'Very high {0} caps the overall score.': 'बहुत अधिक {0} के कारण कुल स्कोर सीमित किया गया।',
      'High {0} limits the overall score.': 'अधिक {0} कुल स्कोर को सीमित करता है।',
      'Contains {0}, which most {1} profiles do not allow.': 'इसमें {0} है, जिसकी अनुमति अधिकांश {1} प्रोफ़ाइल नहीं देतीं।',
      'Contains {0} — accepted by some families and not others.': 'इसमें {0} है — कुछ परिवार मानते हैं, कुछ नहीं।',
    },
    // Word-level replacements applied inside captured template variables
    // (nutrient labels, cap labels, fasting profile names, joiners).
    proseWords: {
      'Saturated fat': 'सैचुरेटेड फैट', 'Trans fat': 'ट्रांस फैट', 'Added sugar': 'एडेड शुगर',
      'Total sugar': 'कुल चीनी', 'Calories': 'कैलोरी', 'Sodium': 'सोडियम', 'Protein': 'प्रोटीन', 'Fibre': 'फाइबर',
      'saturated fat': 'सैचुरेटेड फैट', 'sodium': 'सोडियम', 'sugar': 'चीनी',
      'Generic Hindu Upvas': 'सामान्य हिन्दू उपवास', 'Navratri fasting': 'नवरात्रि व्रत',
      'Ekadashi fasting': 'एकादशी व्रत', 'Shravan fasting': 'श्रावण व्रत', 'Jain / Satvik preference': 'जैन/सात्विक',
      ' and ': ' और ',
    },
  },

  // Hinglish — romanised Hindi/English (full).
  'hi-en': {
    common: { appName: 'NutriScan', tagline: 'Jaaniye aapke khaane mein actually kya hai. WHO-based health scores, poori detail ke saath.', home: 'Home', done: 'Done', reset: 'Reset', back: 'Back', showDetails: 'Details dekhein', hideDetails: 'Details chhupayein', translationPending: 'English mein dikhaya gaya.', outOf10: '10 mein se', offline: 'Aap offline hain — jahan available hai wahan saved data dikha rahe hain.' },
    landing: { scanBarcode: 'Barcode Scan Karein', searchByName: 'Naam se Search Karein', uploadPhoto: 'Barcode Photo Upload Karein', readingBarcode: 'Barcode padh rahe hain...', footer: 'Barcode aur search Open Food Facts use karte hain. Analysis turant hota hai.' },
    verdict: { Buy: 'Khareedein', Limit: 'Limit Karein', Avoid: 'Avoid Karein', BuyDesc: 'Rozana ke liye achha', LimitDesc: 'Kabhi-kabhi theek', AvoidDesc: 'Kabhi-kabhaar hi' },
    results: { containsYourAllergens: 'Aapke allergens maujood hain', mayContainTraces: 'Inke ansh ho sakte hain', whyThisScore: 'Yeh score kyun?', share: 'Share', compare: 'Compare', scanAnother: 'Doosra Scan Karein', dataFromOFF: 'Data Open Food Facts se — verified nutrition database', containsAllergens: 'Allergens maujood hain', mayContainTracesOf: 'Inke ansh ho sakte hain' },
    suitability: { title: 'Yeh kiske liye hai?', subtitle: 'Verdict, quantity aur frequency dekhne ke liye group par tap karein.', why: 'Kyun', howMuch: 'Kitna theek hai?', howOften: 'Kitni baar?', pairWith: 'Iske saath lein', guidanceNote: 'Yeh is group ke liye extra guidance hai, general score change nahi karta.', suffix: 'suitability' },
    group: { kids: 'Bachche', jain: 'Jain', adultMen: 'Vayask Purush', adultWomen: 'Vayask Mahila', elderly: 'Buzurg', 'bp-sodium': 'BP / Sodium', diabetes: 'Diabetes savdhani', 'weight-loss': 'Weight loss' },
    sverdict: { Suitable: 'Suitable', 'Good choice': 'Achha choice', Occasional: 'Kabhi-kabhi', Limit: 'Limit', Avoid: 'Avoid', Depends: 'Depend karta hai', Unknown: 'Unknown' },
    allowance: { title: 'Aapki daily limit ka kitna?', subtitle: 'Ek serving ki quantity vs chune hue group ki daily reference.' },
    nutrient: { Calories: 'Calories', Sodium: 'Sodium', 'Added sugar': 'Added sugar', 'Total sugar': 'Total sugar', 'Saturated fat': 'Saturated fat', 'Trans fat': 'Trans fat', Protein: 'Protein', Fibre: 'Fibre' },
    category: { calories: 'Calories', sugars: 'Sugar', fats: 'Fat', sodium: 'Sodium', protein: 'Protein', fiber: 'Fibre', processing: 'Processing', additives: 'Additives' },
    fasting: { title: 'Vrat / Upvas compatibility', notFasting: 'Vrat nahi', Suitable: 'Suitable', 'Not suitable': 'Suitable nahi', 'Depends on family': 'Family par depend', 'Needs label check': 'Label check karein', conflicting: 'Conflicting:', dependsOnPractice: 'Practice par depend:', customOption: 'Mere family ke rules (custom)' },
    profile: { title: 'Mera family profile', intro: 'Ek baar set karein — har scan par aapke allergens, sahi daily references aur vrat check hoga. Sirf is device par save hota hai.', language: 'Bhasha', whoShoppingFor: 'Aap kiske liye shopping kar rahe hain?', dietPref: 'Diet preference', myAllergens: 'Mere allergens', fastingUpvas: 'Vrat / Upvas', notAllowed: 'Hamare vrat mein mana', allowed: 'Specifically allowed' },
    diet: { none: 'Koi preference nahi', veg: 'Vegetarian', jain: 'Jain', vegan: 'Vegan' },
    search: { title: 'Products Search Karein', subtitle: 'Naam, brand ya type se search karein', placeholder: 'jaise Parle-G, Maggi, Pringles...', productsFound: '{count} products mile', noResults: 'Koi product nahi mila. Doosra naam try karein.', searching: 'Search ho raha hai...' },
    compare: { title: 'Product Comparison', swapSides: 'Sides swap karein', winsOverall: 'overall jeet', tie: 'Dono barabar — tie!', better: 'Behtar', tieShort: 'Tie', whoBetterFor: 'Har ek kiske liye behtar?', scanAnother: 'Doosra Scan Karein' },
    ingredients: { title: 'Ingredient Deep Dive', items: '{n} items', avoid: 'Avoid', review: 'Review', ok: 'OK', tapHint: 'Details ke liye ingredient par tap karein. Classification FSSAI/CODEX par based hai.' },
    notFound: { searchByName: 'Naam se Search Karein', tryAnother: 'Doosra Product Try Karein', tryAgain: 'Phir se Try Karein' },
    comparePick: { prompt: 'Compare karne ke liye ek product chunein', comparingAgainst: 'Isse compare:', scanBarcode: 'Barcode Scan Karein', searchByName: 'Naam se Search Karein', cancel: 'Cancel' },
    loading: { analyzing: 'Analyze ho raha hai...' },
    explain: {
      openStrong: '{name} ka score {score}/10 — strong result. WHO standards ke hisaab se yeh genuinely healthy choice hai.',
      openDecent: '{name} ka score {score}/10 — decent product, thodi improvement ki gunjaish hai.',
      openAverage: '{name} ka score {score}/10 — average product, kuch nutritional concerns hain.',
      openPoor: '{name} ka score {score}/10 — WHO guidelines ke hisaab se is product mein serious health concerns hain.',
      strongestArea: 'Iska sabse strong area hai {desc}.',
      strengthsInclude: 'Iski strengths mein {list} aur {last} shamil hain.',
      mainConcern: 'Main concern yeh hai ki {desc}.',
      keyConcerns: 'Key concerns: {list}; aur {last}.',
      claimsWarnOne: 'Dhyaan dein — {claims} ka claim actual nutrition data ke hisaab se misleading hai.',
      claimsWarnMany: 'Dhyaan dein — {claims} ke claims actual nutrition data ke hisaab se misleading hain.',
      'cat.calories': 'calorie content', 'cat.sugars': 'sugar level', 'cat.fats': 'fat profile',
      'cat.sodium': 'sodium/namak content', 'cat.protein': 'protein content', 'cat.fiber': 'fibre content',
      'cat.processing': 'processing level', 'cat.additives': 'additive profile',
      'level.excellent': 'excellent', 'level.good': 'achha', 'level.moderate': 'moderate',
      'level.poor': 'kamzor', 'level.concerning': 'chinta-janak',
      phraseVeryHigh: 'bahut zyada {name}', phraseVeryLow: 'bahut kam {name}',
      phraseSolid: 'solid {name}', phraseReasonable: 'theek-thaak {name}', phraseLevel: '{level} {name}',
      weakSugar: 'sugar zyada hai — {g}g per serving (WHO ki daily limit ka {pct}%)',
      weakSodium: 'sodium {mg}mg hai (daily limit ka {pct}%)',
      weakSatFat: 'saturated fat {g}g per serving hai — WHO ise limit karne ki salah deta hai',
      weakFat: 'fat profile ek concern hai',
      weakCalories: 'ismein {kcal} kcal per serving hai (daily energy ka {pct}%)',
      weakFiber: 'fibre kam hai — WHO kam se kam 25g/din recommend karta hai',
      weakProtein: 'protein bahut kam hai',
      weakProcessingNova: 'yeh NOVA {nova} (ultra-processed) category mein hai',
      weakProcessing: 'yeh highly processed category mein hai',
      weakAdditives: 'ismein kai flagged additives hain',
      'advice.sugars': 'Unsweetened ya kam sugar wale options dekhein.',
      'advice.fats': 'Kam saturated fat wale options chunein, jaise baked variants.',
      'advice.sodium': 'Kam sodium wale versions try karein ya herbs/masalon se taste badhayein.',
      'advice.calories': 'Chhota portion ya lighter option behtar rahega.',
      'advice.processing': 'Kam ingredients wale whole-food options zyada healthy honge.',
      'advice.additives': 'Chhoti, pehchani ja sakne wali ingredient list wale products behtar hain.',
      'advice.fiber': 'Whole grains, phal ya sabziyan jodne se fibre goal poora ho sakta hai.',
      'advice.protein': 'Balanced meal ke liye ise kisi protein-rich cheez ke saath lein.',
      and: 'aur',
    },
    prose: {
      'High in sugar — not ideal for daily tiffin.': 'Sugar zyada hai — daily tiffin ke liye ideal nahi.',
      'High sodium for a child portion.': 'Bachche ke portion ke hisaab se sodium zyada hai.',
      'Provides useful protein.': 'Achhi maatra mein protein deta hai.',
      'Low fibre — pair with fruit or nuts.': 'Fibre kam hai — phal ya nuts ke saath dein.',
      'Okay occasionally in a balanced tiffin.': 'Balanced tiffin mein kabhi-kabhi theek hai.',
      'A few times a week': 'Hafte mein kuch baar',
      'Occasional treat, not daily': 'Kabhi-kabhaar ka treat, daily nahi',
      'Pair with fruit or a protein source': 'Phal ya kisi protein source ke saath lein',
      'For child nutrition concerns, consult a qualified professional.': 'Bachchon ke nutrition concerns ke liye qualified professional se salah lein.',
      'Contains non-vegetarian ingredients.': 'Ismein non-vegetarian ingredients hain.',
      'Contains gelatin/rennet (animal-derived).': 'Ismein gelatin/rennet (animal-derived) hai.',
      'Ingredient list not available to verify Jain suitability.': 'Jain suitability verify karne ke liye ingredient list available nahi hai.',
      'Source of some additives is not verified — check flavours/emulsifiers/enzymes.': 'Kuch additives ka source verified nahi hai — flavours/emulsifiers/enzymes check karein.',
      'No animal-derived or root ingredients detected.': 'Koi animal-derived ya root ingredients nahi mile.',
      'No obvious conflicts, but vegetarian/Jain source is not fully verified.': 'Koi clear conflict nahi, par vegetarian/Jain source poori tarah verified nahi hai.',
      'Jain rules vary by family. Ambiguous additive/flavour sources are shown as Depends/Unknown.': 'Jain rules family ke hisaab se alag hote hain. Ambiguous additive/flavour sources Depends/Unknown dikhaye jaate hain.',
      'Decent protein for the portion.': 'Portion ke hisaab se decent protein.',
      'Fits an adult diet in normal portions.': 'Normal portions mein adult diet ke liye theek.',
      'Fine in regular portions': 'Regular portions mein theek',
      'Watch portion size': 'Portion size ka dhyaan rakhein',
      'Pregnancy/lactation needs differ — a separate profile is planned.': 'Pregnancy/lactation ki zarooratein alag hoti hain — alag profile planned hai.',
      'Sodium is high — a concern for blood pressure in older adults.': 'Sodium zyada hai — buzurgon mein BP ke liye concern.',
      'High saturated fat.': 'Saturated fat zyada hai.',
      'Protein supports muscle maintenance.': 'Protein muscles maintain karne mein madad karta hai.',
      'Low fibre — may not aid digestion.': 'Fibre kam hai — digestion mein madad nahi karega.',
      'Reasonable for older adults in moderate portions.': 'Moderate portions mein buzurgon ke liye theek hai.',
      'Limit frequency': 'Kam baar lein',
      'Moderate portions': 'Moderate portions',
      'For heart, kidney or BP conditions, consult a healthcare professional.': 'Heart, kidney ya BP conditions mein doctor se salah lein.',
      'Sodium value not available.': 'Sodium value available nahi hai.',
      'Balance with fresh, low-salt foods the rest of the day': 'Din bhar fresh, kam namak wale khaane se balance karein',
      'For diagnosed hypertension, follow your doctor’s sodium advice.': 'Diagnosed hypertension mein apne doctor ki sodium advice follow karein.',
      'Low fibre — refined carbs raise blood sugar faster.': 'Fibre kam hai — refined carbs blood sugar tezi se badhate hain.',
      'Made with refined flour (maida).': 'Refined flour (maida) se bana hai.',
      'Sugar value not available.': 'Sugar value available nahi hai.',
      'Sugar is not the only factor — refined carbs, fibre and portion all matter.': 'Sirf sugar hi nahi — refined carbs, fibre aur portion sab matter karte hain.',
      'Pair with protein/fibre to slow the sugar spike': 'Sugar spike slow karne ke liye protein/fibre ke saath lein',
      'Not medical advice — follow your diabetes care plan.': 'Yeh medical advice nahi hai — apna diabetes care plan follow karein.',
      'Protein helps satiety.': 'Protein pet bhara rakhne mein madad karta hai.',
      'Low fibre — less filling, easy to overeat.': 'Fibre kam — pet kam bharta hai, overeat karna aasaan.',
      'High sugar adds empty calories.': 'Zyada sugar empty calories jodti hai.',
      'Fits a weight-loss plan in controlled portions.': 'Controlled portions mein weight-loss plan ke liye theek.',
      'Mind the portion and overall daily calories': 'Portion aur total daily calories ka dhyaan rakhein',
      '3–4 biscuits': '3–4 biscuit',
      'a small bowl (about 30 g)': 'ek chhoti katori (lagbhag 30 g)',
      'half a pack': 'aadha pack',
      '2–3 small squares': '2–3 chhote tukde',
      'one small glass (200 ml)': 'ek chhota glass (200 ml)',
      'one bowl (about 30 g)': 'ek katori (lagbhag 30 g)',
      'a small serving': 'ek chhoti serving',
      'Ingredient list not available to verify against this fast.': 'Is vrat ke liye check karne hetu ingredient list available nahi hai.',
      'No conflicting ingredients detected for this fasting profile.': 'Is vrat profile ke liye koi conflicting ingredient nahi mila.',
      'Very high sodium: {0} mg ({1}% of daily reference).': 'Sodium bahut zyada: {0} mg (daily reference ka {1}%).',
      'High sodium: {0} mg ({1}% of daily reference).': 'Sodium zyada: {0} mg (daily reference ka {1}%).',
      'Sodium is {0} mg ({1}% of daily reference).': 'Sodium {0} mg hai (daily reference ka {1}%).',
      'Sugar: {0} g per serving.': 'Sugar: {0} g per serving.',
      '{0} kcal per serving.': '{0} kcal per serving.',
      'Contains root vegetables ({0}) avoided in Jain diets.': 'Ismein root vegetables ({0}) hain, jo Jain diet mein avoid kiye jaate hain.',
      '"{0}" has an unverified source.': '"{0}" ka source verified nahi hai.',
      "{0} is {1}% of an adult man's daily reference.": '{0} ek adult purush ke daily reference ka {1}% hai.',
      "{0} is {1}% of an adult woman's daily reference.": '{0} ek adult mahila ke daily reference ka {1}% hai.',
      'Very high {0} caps the overall score.': 'Bahut zyada {0} ki wajah se overall score cap kiya gaya.',
      'High {0} limits the overall score.': 'Zyada {0} overall score ko limit karta hai.',
      'Contains {0}, which most {1} profiles do not allow.': 'Ismein {0} hai, jise zyaadatar {1} profiles allow nahi karte.',
      'Contains {0} — accepted by some families and not others.': 'Ismein {0} hai — kuch families maanti hain, kuch nahi.',
    },
    proseWords: {
      ' and ': ' aur ',
    },
  },

  // Marathi (core; falls back to English for uncovered keys).
  mr: {
    common: { appName: 'न्यूट्रीस्कॅन', tagline: 'तुमच्या अन्नात नेमकं काय आहे ते जाणून घ्या. WHO-आधारित आरोग्य स्कोअर, संपूर्ण माहितीसह.', home: 'होम', done: 'झाले', reset: 'रीसेट', back: 'मागे', showDetails: 'तपशील पाहा', hideDetails: 'तपशील लपवा', translationPending: 'इंग्रजीत दाखवले — मराठी अनुवाद लवकरच.', outOf10: '10 पैकी', offline: 'तुम्ही ऑफलाइन आहात — उपलब्ध असेल तिथे साठवलेला डेटा दाखवत आहोत.' },
    landing: { scanBarcode: 'बारकोड स्कॅन करा', searchByName: 'नावाने शोधा', uploadPhoto: 'बारकोड फोटो अपलोड करा', readingBarcode: 'बारकोड वाचत आहे...', footer: 'बारकोड आणि शोध Open Food Facts वापरतात. विश्लेषण त्वरित होते.' },
    verdict: { Buy: 'घ्या', Limit: 'मर्यादित करा', Avoid: 'टाळा', BuyDesc: 'रोजच्यासाठी चांगला पर्याय', LimitDesc: 'कधीकधी ठीक', AvoidDesc: 'क्वचितच घ्या' },
    results: { containsYourAllergens: 'तुमचे अ‍ॅलर्जन आहेत', whyThisScore: 'हा स्कोअर का?', share: 'शेअर करा', compare: 'तुलना करा', scanAnother: 'दुसरे स्कॅन करा', dataFromOFF: 'डेटा Open Food Facts कडून — पडताळलेला पोषण डेटाबेस', containsAllergens: 'अ‍ॅलर्जन आहेत', mayContainTracesOf: 'यांचे अंश असू शकतात' },
    suitability: { title: 'हे कोणासाठी आहे?', subtitle: 'निर्णय, प्रमाण आणि वारंवारता पाहण्यासाठी गटावर टॅप करा.', why: 'का', howMuch: 'किती योग्य आहे?', howOften: 'किती वेळा?', pairWith: 'यासोबत घ्या', guidanceNote: 'हे या गटासाठी अतिरिक्त मार्गदर्शन आहे, सामान्य स्कोअर बदलत नाही.', suffix: 'उपयुक्तता' },
    group: { kids: 'मुले', jain: 'जैन', adultMen: 'प्रौढ पुरुष', adultWomen: 'प्रौढ स्त्री', elderly: 'वृद्ध', 'bp-sodium': 'BP / सोडियम', diabetes: 'मधुमेह काळजी', 'weight-loss': 'वजन कमी' },
    sverdict: { Suitable: 'योग्य', 'Good choice': 'चांगला पर्याय', Occasional: 'कधीकधी', Limit: 'मर्यादित करा', Avoid: 'टाळा', Depends: 'अवलंबून', Unknown: 'अज्ञात' },
    allowance: { title: 'तुमच्या दैनिक मर्यादेचा किती?', subtitle: 'एका सर्व्हिंगचे प्रमाण vs निवडलेल्या गटाची दैनिक संदर्भ मर्यादा.' },
    nutrient: { Calories: 'कॅलरी', Sodium: 'सोडियम', 'Added sugar': 'जोडलेली साखर', 'Total sugar': 'एकूण साखर', 'Saturated fat': 'सॅच्युरेटेड फॅट', 'Trans fat': 'ट्रान्स फॅट', Protein: 'प्रथिने', Fibre: 'फायबर' },
    category: { calories: 'कॅलरी', sugars: 'साखर', fats: 'फॅट', sodium: 'सोडियम', protein: 'प्रथिने', fiber: 'फायबर', processing: 'प्रक्रिया', additives: 'अ‍ॅडिटिव्ह' },
    fasting: { title: 'उपवास सुसंगतता', notFasting: 'उपवास नाही', Suitable: 'योग्य', 'Not suitable': 'योग्य नाही', 'Depends on family': 'कुटुंबावर अवलंबून', 'Needs label check': 'लेबल तपासा', conflicting: 'विरोधी:', dependsOnPractice: 'प्रथेवर अवलंबून:', customOption: 'माझ्या कुटुंबाचे नियम (कस्टम)' },
    profile: { title: 'माझे कुटुंब प्रोफाइल', intro: 'एकदा सेट करा — प्रत्येक स्कॅनवर तुमचे अ‍ॅलर्जन, योग्य दैनिक संदर्भ आणि उपवास तपासले जातील. फक्त या डिव्हाइसवर सेव्ह होते.', language: 'भाषा', whoShoppingFor: 'तुम्ही कोणासाठी खरेदी करत आहात?', dietPref: 'आहार पसंती', myAllergens: 'माझे अ‍ॅलर्जन', fastingUpvas: 'उपवास', notAllowed: 'आमच्या उपवासात मनाई', allowed: 'विशेषतः परवानगी' },
    diet: { none: 'पसंती नाही', veg: 'शाकाहारी', jain: 'जैन', vegan: 'व्हेगन' },
    search: { title: 'उत्पादने शोधा', subtitle: 'नाव, ब्रँड किंवा प्रकाराने शोधा', placeholder: 'उदा. पारले-जी, मॅगी, प्रिंगल्स...', productsFound: '{count} उत्पादने मिळाली', noResults: 'उत्पादन मिळाले नाही. दुसरे नाव वापरा.', searching: 'शोधत आहे...' },
    compare: { title: 'उत्पादन तुलना', swapSides: 'बाजू बदला', winsOverall: 'एकूण विजयी', tie: 'दोन्ही समान — टाय!', better: 'चांगले', tieShort: 'टाय', whoBetterFor: 'प्रत्येक कोणासाठी चांगले?', scanAnother: 'दुसरे स्कॅन करा' },
    ingredients: { title: 'घटक तपशील', items: '{n} घटक', avoid: 'टाळा', review: 'तपासा', ok: 'ठीक', tapHint: 'तपशीलासाठी घटकावर टॅप करा. वर्गीकरण FSSAI/CODEX नुसार आहे.' },
    notFound: { searchByName: 'नावाने शोधा', tryAnother: 'दुसरे उत्पादन वापरा', tryAgain: 'पुन्हा प्रयत्न करा' },
    comparePick: { prompt: 'तुलनेसाठी एक उत्पादन निवडा', comparingAgainst: 'याच्याशी तुलना:', scanBarcode: 'बारकोड स्कॅन करा', searchByName: 'नावाने शोधा', cancel: 'रद्द करा' },
    loading: { analyzing: 'विश्लेषण होत आहे...' },
  },

  // Gujarati (core).
  gu: {
    common: { appName: 'ન્યુટ્રીસ્કૅન', tagline: 'તમારા ખોરાકમાં ખરેખર શું છે તે જાણો. WHO-આધારિત આરોગ્ય સ્કોર, સંપૂર્ણ વિગત સાથે.', home: 'હોમ', done: 'થઈ ગયું', reset: 'રીસેટ', back: 'પાછળ', showDetails: 'વિગત જુઓ', hideDetails: 'વિગત છુપાવો', translationPending: 'અંગ્રેજીમાં બતાવ્યું — ગુજરાતી અનુવાદ ટૂંક સમયમાં.', outOf10: '10 માંથી', offline: 'તમે ઑફલાઇન છો — જ્યાં ઉપલબ્ધ હોય ત્યાં સાચવેલ ડેટા બતાવીએ છીએ.' },
    landing: { scanBarcode: 'બારકોડ સ્કૅન કરો', searchByName: 'નામથી શોધો', uploadPhoto: 'બારકોડ ફોટો અપલોડ કરો', readingBarcode: 'બારકોડ વાંચી રહ્યા છીએ...', footer: 'બારકોડ અને શોધ Open Food Facts વાપરે છે. વિશ્લેષણ તરત થાય છે.' },
    verdict: { Buy: 'ખરીદો', Limit: 'મર્યાદિત કરો', Avoid: 'ટાળો', BuyDesc: 'રોજ માટે સારો વિકલ્પ', LimitDesc: 'ક્યારેક ઠીક', AvoidDesc: 'ભાગ્યે જ લો' },
    results: { containsYourAllergens: 'તમારા એલર્જન છે', whyThisScore: 'આ સ્કોર કેમ?', share: 'શેર કરો', compare: 'સરખાવો', scanAnother: 'બીજું સ્કૅન કરો', dataFromOFF: 'ડેટા Open Food Facts તરફથી — ચકાસાયેલ પોષણ ડેટાબેઝ', containsAllergens: 'એલર્જન છે', mayContainTracesOf: 'આના અંશ હોઈ શકે' },
    suitability: { title: 'આ કોના માટે છે?', subtitle: 'ચુકાદો, જથ્થો અને આવર્તન જોવા માટે જૂથ પર ટૅપ કરો.', why: 'કેમ', howMuch: 'કેટલું યોગ્ય છે?', howOften: 'કેટલી વાર?', pairWith: 'આ સાથે લો', guidanceNote: 'આ આ જૂથ માટે વધારાનું માર્ગદર્શન છે, સામાન્ય સ્કોર બદલતું નથી.', suffix: 'યોગ્યતા' },
    group: { kids: 'બાળકો', jain: 'જૈન', adultMen: 'પુખ્ત પુરુષ', adultWomen: 'પુખ્ત સ્ત્રી', elderly: 'વૃદ્ધ', 'bp-sodium': 'BP / સોડિયમ', diabetes: 'ડાયાબિટીસ સાવધાની', 'weight-loss': 'વજન ઘટાડો' },
    sverdict: { Suitable: 'યોગ્ય', 'Good choice': 'સારો વિકલ્પ', Occasional: 'ક્યારેક', Limit: 'મર્યાદિત કરો', Avoid: 'ટાળો', Depends: 'આધાર રાખે', Unknown: 'અજ્ઞાત' },
    allowance: { title: 'તમારી દૈનિક મર્યાદાનું કેટલું?', subtitle: 'એક સર્વિંગનો જથ્થો vs પસંદ કરેલ જૂથની દૈનિક સંદર્ભ મર્યાદા.' },
    nutrient: { Calories: 'કૅલરી', Sodium: 'સોડિયમ', 'Added sugar': 'ઉમેરેલી ખાંડ', 'Total sugar': 'કુલ ખાંડ', 'Saturated fat': 'સૅચ્યુરેટેડ ફૅટ', 'Trans fat': 'ટ્રાન્સ ફૅટ', Protein: 'પ્રોટીન', Fibre: 'ફાઇબર' },
    category: { calories: 'કૅલરી', sugars: 'ખાંડ', fats: 'ફૅટ', sodium: 'સોડિયમ', protein: 'પ્રોટીન', fiber: 'ફાઇબર', processing: 'પ્રક્રિયા', additives: 'એડિટિવ્સ' },
    fasting: { title: 'ઉપવાસ સુસંગતતા', notFasting: 'ઉપવાસ નથી', Suitable: 'યોગ્ય', 'Not suitable': 'યોગ્ય નથી', 'Depends on family': 'કુટુંબ પર આધાર', 'Needs label check': 'લેબલ તપાસો', conflicting: 'વિરોધી:', dependsOnPractice: 'પ્રથા પર આધાર:', customOption: 'મારા કુટુંબના નિયમો (કસ્ટમ)' },
    profile: { title: 'મારી કુટુંબ પ્રોફાઇલ', intro: 'એકવાર સેટ કરો — દરેક સ્કૅન પર તમારા એલર્જન, યોગ્ય દૈનિક સંદર્ભ અને ઉપવાસ તપાસાશે. ફક્ત આ ડિવાઇસ પર સેવ થાય છે.', language: 'ભાષા', whoShoppingFor: 'તમે કોના માટે ખરીદી કરો છો?', dietPref: 'આહાર પસંદગી', myAllergens: 'મારા એલર્જન', fastingUpvas: 'ઉપવાસ', notAllowed: 'અમારા ઉપવાસમાં મનાઈ', allowed: 'ખાસ પરવાનગી' },
    diet: { none: 'કોઈ પસંદગી નહીં', veg: 'શાકાહારી', jain: 'જૈન', vegan: 'વેગન' },
    search: { title: 'ઉત્પાદનો શોધો', subtitle: 'નામ, બ્રાન્ડ કે પ્રકારથી શોધો', placeholder: 'દા.ત. પારલે-જી, મૅગી, પ્રિંગલ્સ...', productsFound: '{count} ઉત્પાદનો મળ્યાં', noResults: 'કોઈ ઉત્પાદન મળ્યું નથી. બીજું નામ અજમાવો.', searching: 'શોધી રહ્યા છીએ...' },
    compare: { title: 'ઉત્પાદન સરખામણી', swapSides: 'બાજુ બદલો', winsOverall: 'એકંદરે જીત', tie: 'બંને સમાન — ટાઇ!', better: 'સારું', tieShort: 'ટાઇ', whoBetterFor: 'દરેક કોના માટે સારું?', scanAnother: 'બીજું સ્કૅન કરો' },
    ingredients: { title: 'ઘટક વિગત', items: '{n} ઘટકો', avoid: 'ટાળો', review: 'તપાસો', ok: 'ઠીક', tapHint: 'વિગત માટે ઘટક પર ટૅપ કરો. વર્ગીકરણ FSSAI/CODEX મુજબ છે.' },
    notFound: { searchByName: 'નામથી શોધો', tryAnother: 'બીજું ઉત્પાદન અજમાવો', tryAgain: 'ફરી પ્રયાસ કરો' },
    comparePick: { prompt: 'સરખામણી માટે એક ઉત્પાદન પસંદ કરો', comparingAgainst: 'આની સાથે સરખામણી:', scanBarcode: 'બારકોડ સ્કૅન કરો', searchByName: 'નામથી શોધો', cancel: 'રદ કરો' },
    loading: { analyzing: 'વિશ્લેષણ થઈ રહ્યું છે...' },
  },

  // Bengali (core).
  bn: {
    common: { appName: 'নিউট্রিস্ক্যান', tagline: 'আপনার খাবারে আসলে কী আছে জানুন। WHO-ভিত্তিক স্বাস্থ্য স্কোর, বিস্তারিত সহ।', home: 'হোম', done: 'সম্পন্ন', reset: 'রিসেট', back: 'পিছনে', showDetails: 'বিস্তারিত দেখুন', hideDetails: 'বিস্তারিত লুকান', translationPending: 'ইংরেজিতে দেখানো হয়েছে — বাংলা অনুবাদ শীঘ্রই।', outOf10: '10 এর মধ্যে', offline: 'আপনি অফলাইন — যেখানে সম্ভব সংরক্ষিত ডেটা দেখানো হচ্ছে।' },
    landing: { scanBarcode: 'বারকোড স্ক্যান করুন', searchByName: 'নাম দিয়ে খুঁজুন', uploadPhoto: 'বারকোড ছবি আপলোড করুন', readingBarcode: 'বারকোড পড়া হচ্ছে...', footer: 'বারকোড ও অনুসন্ধান Open Food Facts ব্যবহার করে। বিশ্লেষণ তৎক্ষণাৎ হয়।' },
    verdict: { Buy: 'কিনুন', Limit: 'সীমিত করুন', Avoid: 'এড়িয়ে চলুন', BuyDesc: 'প্রতিদিনের জন্য ভালো', LimitDesc: 'মাঝে মাঝে ঠিক', AvoidDesc: 'কদাচিৎ নিন' },
    results: { containsYourAllergens: 'আপনার অ্যালার্জেন আছে', whyThisScore: 'এই স্কোর কেন?', share: 'শেয়ার', compare: 'তুলনা', scanAnother: 'আরেকটি স্ক্যান করুন', dataFromOFF: 'ডেটা Open Food Facts থেকে — যাচাইকৃত পুষ্টি ডেটাবেস', containsAllergens: 'অ্যালার্জেন আছে', mayContainTracesOf: 'এগুলির অংশ থাকতে পারে' },
    suitability: { title: 'এটি কার জন্য?', subtitle: 'রায়, পরিমাণ ও কতবার দেখতে গ্রুপে ট্যাপ করুন।', why: 'কেন', howMuch: 'কতটা ঠিক?', howOften: 'কতবার?', pairWith: 'এর সাথে নিন', guidanceNote: 'এটি এই গ্রুপের জন্য অতিরিক্ত নির্দেশনা, সাধারণ স্কোর বদলায় না।', suffix: 'উপযুক্ততা' },
    group: { kids: 'শিশু', jain: 'জৈন', adultMen: 'প্রাপ্তবয়স্ক পুরুষ', adultWomen: 'প্রাপ্তবয়স্ক নারী', elderly: 'বয়স্ক', 'bp-sodium': 'BP / সোডিয়াম', diabetes: 'ডায়াবেটিস সতর্কতা', 'weight-loss': 'ওজন কমানো' },
    sverdict: { Suitable: 'উপযুক্ত', 'Good choice': 'ভালো পছন্দ', Occasional: 'মাঝে মাঝে', Limit: 'সীমিত করুন', Avoid: 'এড়িয়ে চলুন', Depends: 'নির্ভর করে', Unknown: 'অজানা' },
    allowance: { title: 'আপনার দৈনিক সীমার কতটা?', subtitle: 'এক সার্ভিংয়ের পরিমাণ vs নির্বাচিত গ্রুপের দৈনিক রেফারেন্স।' },
    nutrient: { Calories: 'ক্যালরি', Sodium: 'সোডিয়াম', 'Added sugar': 'যোগ করা চিনি', 'Total sugar': 'মোট চিনি', 'Saturated fat': 'স্যাচুরেটেড ফ্যাট', 'Trans fat': 'ট্রান্স ফ্যাট', Protein: 'প্রোটিন', Fibre: 'ফাইবার' },
    category: { calories: 'ক্যালরি', sugars: 'চিনি', fats: 'ফ্যাট', sodium: 'সোডিয়াম', protein: 'প্রোটিন', fiber: 'ফাইবার', processing: 'প্রক্রিয়াকরণ', additives: 'অ্যাডিটিভ' },
    fasting: { title: 'উপবাস সামঞ্জস্য', notFasting: 'উপবাস নয়', Suitable: 'উপযুক্ত', 'Not suitable': 'উপযুক্ত নয়', 'Depends on family': 'পরিবারের উপর নির্ভর', 'Needs label check': 'লেবেল দেখুন', conflicting: 'বিরোধী:', dependsOnPractice: 'প্রথার উপর নির্ভর:', customOption: 'আমার পরিবারের নিয়ম (কাস্টম)' },
    profile: { title: 'আমার পরিবার প্রোফাইল', intro: 'একবার সেট করুন — প্রতিটি স্ক্যানে আপনার অ্যালার্জেন, সঠিক দৈনিক রেফারেন্স ও উপবাস যাচাই হবে। শুধু এই ডিভাইসে সংরক্ষিত।', language: 'ভাষা', whoShoppingFor: 'আপনি কার জন্য কিনছেন?', dietPref: 'খাদ্য পছন্দ', myAllergens: 'আমার অ্যালার্জেন', fastingUpvas: 'উপবাস', notAllowed: 'আমাদের উপবাসে নিষেধ', allowed: 'বিশেষভাবে অনুমোদিত' },
    diet: { none: 'কোনো পছন্দ নেই', veg: 'নিরামিষ', jain: 'জৈন', vegan: 'ভেগান' },
    search: { title: 'পণ্য খুঁজুন', subtitle: 'নাম, ব্র্যান্ড বা ধরন দিয়ে খুঁজুন', placeholder: 'যেমন পারলে-জি, ম্যাগি, প্রিংলস...', productsFound: '{count} পণ্য পাওয়া গেছে', noResults: 'কোনো পণ্য পাওয়া যায়নি। অন্য নাম চেষ্টা করুন।', searching: 'খোঁজা হচ্ছে...' },
    compare: { title: 'পণ্য তুলনা', swapSides: 'পাশ বদলান', winsOverall: 'সামগ্রিকভাবে এগিয়ে', tie: 'দুটোই সমান — টাই!', better: 'ভালো', tieShort: 'টাই', whoBetterFor: 'প্রতিটি কার জন্য ভালো?', scanAnother: 'আরেকটি স্ক্যান করুন' },
    ingredients: { title: 'উপাদান বিশদ', items: '{n} উপাদান', avoid: 'এড়িয়ে চলুন', review: 'দেখুন', ok: 'ঠিক', tapHint: 'বিশদের জন্য উপাদানে ট্যাপ করুন। শ্রেণিবিভাগ FSSAI/CODEX অনুযায়ী।' },
    notFound: { searchByName: 'নাম দিয়ে খুঁজুন', tryAnother: 'অন্য পণ্য চেষ্টা করুন', tryAgain: 'আবার চেষ্টা করুন' },
    comparePick: { prompt: 'তুলনার জন্য একটি পণ্য বাছুন', comparingAgainst: 'এর সাথে তুলনা:', scanBarcode: 'বারকোড স্ক্যান করুন', searchByName: 'নাম দিয়ে খুঁজুন', cancel: 'বাতিল' },
    loading: { analyzing: 'বিশ্লেষণ হচ্ছে...' },
  },

  // Tamil (core).
  ta: {
    common: { appName: 'நியூட்ரிஸ்கேன்', tagline: 'உங்கள் உணவில் உண்மையில் என்ன இருக்கிறது என்பதை அறியுங்கள். WHO அடிப்படையிலான சுகாதார மதிப்பெண்கள், முழு விவரங்களுடன்.', home: 'முகப்பு', done: 'முடிந்தது', reset: 'மீட்டமை', back: 'பின்', showDetails: 'விவரங்களைக் காட்டு', hideDetails: 'விவரங்களை மறை', translationPending: 'ஆங்கிலத்தில் காட்டப்பட்டது — தமிழ் மொழிபெயர்ப்பு விரைவில்.', outOf10: '10 இல்', offline: 'நீங்கள் ஆஃப்லைனில் உள்ளீர்கள் — கிடைக்கும் இடத்தில் சேமித்த தரவைக் காட்டுகிறோம்.' },
    landing: { scanBarcode: 'பார்கோடு ஸ்கேன்', searchByName: 'பெயரால் தேடு', uploadPhoto: 'பார்கோடு படத்தை பதிவேற்று', readingBarcode: 'பார்கோடு படிக்கிறது...', footer: 'பார்கோடு மற்றும் தேடல் Open Food Facts பயன்படுத்துகிறது. பகுப்பாய்வு உடனடியாக நடக்கிறது.' },
    verdict: { Buy: 'வாங்கு', Limit: 'கட்டுப்படுத்து', Avoid: 'தவிர்', BuyDesc: 'தினசரிக்கு நல்லது', LimitDesc: 'எப்போதாவது சரி', AvoidDesc: 'அரிதாகவே எடு' },
    results: { containsYourAllergens: 'உங்கள் ஒவ்வாமைப் பொருட்கள் உள்ளன', whyThisScore: 'இந்த மதிப்பெண் ஏன்?', share: 'பகிர்', compare: 'ஒப்பிடு', scanAnother: 'மற்றொன்றை ஸ்கேன் செய்', dataFromOFF: 'தரவு Open Food Facts இலிருந்து — சரிபார்க்கப்பட்ட ஊட்டச்சத்து தரவுத்தளம்', containsAllergens: 'ஒவ்வாமைப் பொருட்கள் உள்ளன', mayContainTracesOf: 'இவற்றின் தடயங்கள் இருக்கலாம்' },
    suitability: { title: 'இது யாருக்கானது?', subtitle: 'தீர்ப்பு, அளவு மற்றும் அடிக்கடி பார்க்க குழுவைத் தட்டவும்.', why: 'ஏன்', howMuch: 'எவ்வளவு சரி?', howOften: 'எத்தனை முறை?', pairWith: 'இதனுடன் எடு', guidanceNote: 'இது இந்தக் குழுவிற்கான கூடுதல் வழிகாட்டுதல், பொது மதிப்பெண்ணை மாற்றாது.', suffix: 'பொருத்தம்' },
    group: { kids: 'குழந்தைகள்', jain: 'ஜைன்', adultMen: 'வயது வந்த ஆண்', adultWomen: 'வயது வந்த பெண்', elderly: 'முதியோர்', 'bp-sodium': 'BP / சோடியம்', diabetes: 'நீரிழிவு எச்சரிக்கை', 'weight-loss': 'எடை குறைப்பு' },
    sverdict: { Suitable: 'பொருத்தம்', 'Good choice': 'நல்ல தேர்வு', Occasional: 'எப்போதாவது', Limit: 'கட்டுப்படுத்து', Avoid: 'தவிர்', Depends: 'சார்ந்தது', Unknown: 'தெரியாது' },
    allowance: { title: 'உங்கள் தினசரி வரம்பில் எவ்வளவு?', subtitle: 'ஒரு சர்விங் அளவு vs தேர்ந்தெடுத்த குழுவின் தினசரி குறிப்பு.' },
    nutrient: { Calories: 'கலோரி', Sodium: 'சோடியம்', 'Added sugar': 'சேர்க்கப்பட்ட சர்க்கரை', 'Total sugar': 'மொத்த சர்க்கரை', 'Saturated fat': 'நிறைவுற்ற கொழுப்பு', 'Trans fat': 'டிரான்ஸ் கொழுப்பு', Protein: 'புரதம்', Fibre: 'நார்ச்சத்து' },
    category: { calories: 'கலோரி', sugars: 'சர்க்கரை', fats: 'கொழுப்பு', sodium: 'சோடியம்', protein: 'புரதம்', fiber: 'நார்ச்சத்து', processing: 'செயலாக்கம்', additives: 'சேர்க்கைகள்' },
    fasting: { title: 'விரத பொருத்தம்', notFasting: 'விரதம் இல்லை', Suitable: 'பொருத்தம்', 'Not suitable': 'பொருத்தமில்லை', 'Depends on family': 'குடும்பத்தைப் பொறுத்தது', 'Needs label check': 'லேபிளைச் சரிபார்', conflicting: 'முரண்பாடு:', dependsOnPractice: 'பழக்கத்தைப் பொறுத்தது:', customOption: 'என் குடும்ப விதிகள் (தனிப்பயன்)' },
    profile: { title: 'என் குடும்ப சுயவிவரம்', intro: 'ஒருமுறை அமைக்கவும் — ஒவ்வொரு ஸ்கேனிலும் உங்கள் ஒவ்வாமை, சரியான தினசரி குறிப்புகள் மற்றும் விரதம் சரிபார்க்கப்படும். இந்த சாதனத்தில் மட்டுமே சேமிக்கப்படும்.', language: 'மொழி', whoShoppingFor: 'நீங்கள் யாருக்காக வாங்குகிறீர்கள்?', dietPref: 'உணவு விருப்பம்', myAllergens: 'என் ஒவ்வாமைகள்', fastingUpvas: 'விரதம்', notAllowed: 'எங்கள் விரதத்தில் அனுமதி இல்லை', allowed: 'குறிப்பாக அனுமதிக்கப்பட்டது' },
    diet: { none: 'விருப்பம் இல்லை', veg: 'சைவம்', jain: 'ஜைன்', vegan: 'வீகன்' },
    search: { title: 'பொருட்களைத் தேடு', subtitle: 'பெயர், பிராண்ட் அல்லது வகையால் தேடு', placeholder: 'எ.கா. பார்லே-ஜி, மேகி, பிரிங்கிள்ஸ்...', productsFound: '{count} பொருட்கள் கிடைத்தன', noResults: 'பொருள் எதுவும் இல்லை. வேறு பெயரை முயற்சிக்கவும்.', searching: 'தேடுகிறது...' },
    compare: { title: 'பொருள் ஒப்பீடு', swapSides: 'பக்கங்களை மாற்று', winsOverall: 'மொத்தத்தில் வெற்றி', tie: 'இரண்டும் சமம் — சமன்!', better: 'சிறந்தது', tieShort: 'சமன்', whoBetterFor: 'ஒவ்வொன்றும் யாருக்கு சிறந்தது?', scanAnother: 'மற்றொன்றை ஸ்கேன் செய்' },
    ingredients: { title: 'மூலப்பொருள் விவரம்', items: '{n} பொருட்கள்', avoid: 'தவிர்', review: 'சரிபார்', ok: 'சரி', tapHint: 'விவரங்களுக்கு மூலப்பொருளைத் தட்டவும். வகைப்பாடு FSSAI/CODEX படி.' },
    notFound: { searchByName: 'பெயரால் தேடு', tryAnother: 'வேறு பொருளை முயற்சி', tryAgain: 'மீண்டும் முயற்சி' },
    comparePick: { prompt: 'ஒப்பிட ஒரு பொருளைத் தேர்ந்தெடு', comparingAgainst: 'இதனுடன் ஒப்பீடு:', scanBarcode: 'பார்கோடு ஸ்கேன்', searchByName: 'பெயரால் தேடு', cancel: 'ரத்து' },
    loading: { analyzing: 'பகுப்பாய்வு நடக்கிறது...' },
  },

  // Telugu (core).
  te: {
    common: { appName: 'న్యూట్రిస్కాన్', tagline: 'మీ ఆహారంలో నిజంగా ఏముందో తెలుసుకోండి. WHO ఆధారిత ఆరోగ్య స్కోర్‌లు, పూర్తి వివరాలతో.', home: 'హోమ్', done: 'పూర్తయింది', reset: 'రీసెట్', back: 'వెనుకకు', showDetails: 'వివరాలు చూపు', hideDetails: 'వివరాలు దాచు', translationPending: 'ఆంగ్లంలో చూపబడింది — తెలుగు అనువాదం త్వరలో.', outOf10: '10 లో', offline: 'మీరు ఆఫ్‌లైన్‌లో ఉన్నారు — అందుబాటులో ఉన్న చోట సేవ్ చేసిన డేటాను చూపుతున్నాము.' },
    landing: { scanBarcode: 'బార్‌కోడ్ స్కాన్', searchByName: 'పేరుతో వెతుకు', uploadPhoto: 'బార్‌కోడ్ ఫోటో అప్‌లోడ్', readingBarcode: 'బార్‌కోడ్ చదువుతోంది...', footer: 'బార్‌కోడ్ మరియు శోధన Open Food Facts ఉపయోగిస్తాయి. విశ్లేషణ వెంటనే జరుగుతుంది.' },
    verdict: { Buy: 'కొను', Limit: 'పరిమితం చేయి', Avoid: 'తప్పించు', BuyDesc: 'రోజువారీకి మంచిది', LimitDesc: 'అప్పుడప్పుడు సరే', AvoidDesc: 'అరుదుగా తీసుకో' },
    results: { containsYourAllergens: 'మీ అలర్జీ పదార్థాలు ఉన్నాయి', whyThisScore: 'ఈ స్కోర్ ఎందుకు?', share: 'షేర్', compare: 'పోల్చు', scanAnother: 'మరొకటి స్కాన్ చేయి', dataFromOFF: 'డేటా Open Food Facts నుండి — ధృవీకరించిన పోషకాహార డేటాబేస్', containsAllergens: 'అలర్జీ పదార్థాలు ఉన్నాయి', mayContainTracesOf: 'వీటి అంశాలు ఉండవచ్చు' },
    suitability: { title: 'ఇది ఎవరి కోసం?', subtitle: 'తీర్పు, పరిమాణం మరియు తరచుదనం చూడటానికి గ్రూప్‌పై నొక్కండి.', why: 'ఎందుకు', howMuch: 'ఎంత సరైనది?', howOften: 'ఎన్నిసార్లు?', pairWith: 'దీనితో తీసుకో', guidanceNote: 'ఇది ఈ గ్రూప్ కోసం అదనపు మార్గదర్శకం, సాధారణ స్కోర్‌ను మార్చదు.', suffix: 'అనుకూలత' },
    group: { kids: 'పిల్లలు', jain: 'జైన్', adultMen: 'వయోజన పురుషుడు', adultWomen: 'వయోజన స్త్రీ', elderly: 'వృద్ధులు', 'bp-sodium': 'BP / సోడియం', diabetes: 'మధుమేహ జాగ్రత్త', 'weight-loss': 'బరువు తగ్గింపు' },
    sverdict: { Suitable: 'అనుకూలం', 'Good choice': 'మంచి ఎంపిక', Occasional: 'అప్పుడప్పుడు', Limit: 'పరిమితం చేయి', Avoid: 'తప్పించు', Depends: 'ఆధారపడి ఉంటుంది', Unknown: 'తెలియదు' },
    allowance: { title: 'మీ రోజువారీ పరిమితిలో ఎంత?', subtitle: 'ఒక సర్వింగ్ పరిమాణం vs ఎంచుకున్న గ్రూప్ రోజువారీ సూచన.' },
    nutrient: { Calories: 'కేలరీలు', Sodium: 'సోడియం', 'Added sugar': 'జోడించిన చక్కెర', 'Total sugar': 'మొత్తం చక్కెర', 'Saturated fat': 'సంతృప్త కొవ్వు', 'Trans fat': 'ట్రాన్స్ కొవ్వు', Protein: 'ప్రోటీన్', Fibre: 'ఫైబర్' },
    category: { calories: 'కేలరీలు', sugars: 'చక్కెర', fats: 'కొవ్వు', sodium: 'సోడియం', protein: 'ప్రోటీన్', fiber: 'ఫైబర్', processing: 'ప్రాసెసింగ్', additives: 'సంకలనాలు' },
    fasting: { title: 'ఉపవాస అనుకూలత', notFasting: 'ఉపవాసం కాదు', Suitable: 'అనుకూలం', 'Not suitable': 'అనుకూలం కాదు', 'Depends on family': 'కుటుంబంపై ఆధారపడి', 'Needs label check': 'లేబుల్ తనిఖీ', conflicting: 'విరుద్ధం:', dependsOnPractice: 'ఆచారంపై ఆధారపడి:', customOption: 'నా కుటుంబ నియమాలు (కస్టమ్)' },
    profile: { title: 'నా కుటుంబ ప్రొఫైల్', intro: 'ఒకసారి సెట్ చేయండి — ప్రతి స్కాన్‌లో మీ అలర్జీలు, సరైన రోజువారీ సూచనలు మరియు ఉపవాసం తనిఖీ అవుతాయి. ఈ పరికరంలో మాత్రమే సేవ్ అవుతుంది.', language: 'భాష', whoShoppingFor: 'మీరు ఎవరి కోసం కొనుగోలు చేస్తున్నారు?', dietPref: 'ఆహార ప్రాధాన్యత', myAllergens: 'నా అలర్జీలు', fastingUpvas: 'ఉపవాసం', notAllowed: 'మా ఉపవాసంలో నిషేధం', allowed: 'ప్రత్యేకంగా అనుమతి' },
    diet: { none: 'ప్రాధాన్యత లేదు', veg: 'శాకాహారం', jain: 'జైన్', vegan: 'వేగన్' },
    search: { title: 'ఉత్పత్తులను వెతుకు', subtitle: 'పేరు, బ్రాండ్ లేదా రకంతో వెతుకు', placeholder: 'ఉదా. పార్లే-జీ, మ్యాగీ, ప్రింగిల్స్...', productsFound: '{count} ఉత్పత్తులు దొరికాయి', noResults: 'ఉత్పత్తి దొరకలేదు. మరో పేరు ప్రయత్నించండి.', searching: 'వెతుకుతోంది...' },
    compare: { title: 'ఉత్పత్తి పోలిక', swapSides: 'వైపులు మార్చు', winsOverall: 'మొత్తంగా గెలుపు', tie: 'రెండూ సమానం — టై!', better: 'మెరుగైనది', tieShort: 'టై', whoBetterFor: 'ప్రతిది ఎవరికి మెరుగు?', scanAnother: 'మరొకటి స్కాన్ చేయి' },
    ingredients: { title: 'పదార్థ వివరాలు', items: '{n} పదార్థాలు', avoid: 'తప్పించు', review: 'తనిఖీ', ok: 'సరే', tapHint: 'వివరాల కోసం పదార్థంపై నొక్కండి. వర్గీకరణ FSSAI/CODEX ప్రకారం.' },
    notFound: { searchByName: 'పేరుతో వెతుకు', tryAnother: 'మరో ఉత్పత్తి ప్రయత్నించు', tryAgain: 'మళ్లీ ప్రయత్నించు' },
    comparePick: { prompt: 'పోల్చడానికి ఒక ఉత్పత్తిని ఎంచుకో', comparingAgainst: 'దీనితో పోలిక:', scanBarcode: 'బార్‌కోడ్ స్కాన్', searchByName: 'పేరుతో వెతుకు', cancel: 'రద్దు' },
    loading: { analyzing: 'విశ్లేషణ జరుగుతోంది...' },
  },

  // Kannada (core).
  kn: {
    common: { appName: 'ನ್ಯೂಟ್ರಿಸ್ಕ್ಯಾನ್', tagline: 'ನಿಮ್ಮ ಆಹಾರದಲ್ಲಿ ನಿಜವಾಗಿ ಏನಿದೆ ಎಂದು ತಿಳಿಯಿರಿ. WHO ಆಧಾರಿತ ಆರೋಗ್ಯ ಸ್ಕೋರ್‌ಗಳು, ಪೂರ್ಣ ವಿವರಗಳೊಂದಿಗೆ.', home: 'ಹೋಮ್', done: 'ಮುಗಿಯಿತು', reset: 'ರೀಸೆಟ್', back: 'ಹಿಂದೆ', showDetails: 'ವಿವರ ತೋರಿಸು', hideDetails: 'ವಿವರ ಮರೆಮಾಡು', translationPending: 'ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ತೋರಿಸಲಾಗಿದೆ — ಕನ್ನಡ ಅನುವಾದ ಶೀಘ್ರದಲ್ಲೇ.', outOf10: '10 ರಲ್ಲಿ', offline: 'ನೀವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ — ಲಭ್ಯವಿರುವಲ್ಲಿ ಉಳಿಸಿದ ಡೇಟಾವನ್ನು ತೋರಿಸುತ್ತಿದ್ದೇವೆ.' },
    landing: { scanBarcode: 'ಬಾರ್‌ಕೋಡ್ ಸ್ಕ್ಯಾನ್', searchByName: 'ಹೆಸರಿನಿಂದ ಹುಡುಕಿ', uploadPhoto: 'ಬಾರ್‌ಕೋಡ್ ಫೋಟೋ ಅಪ್‌ಲೋಡ್', readingBarcode: 'ಬಾರ್‌ಕೋಡ್ ಓದುತ್ತಿದೆ...', footer: 'ಬಾರ್‌ಕೋಡ್ ಮತ್ತು ಹುಡುಕಾಟ Open Food Facts ಬಳಸುತ್ತವೆ. ವಿಶ್ಲೇಷಣೆ ತಕ್ಷಣ ನಡೆಯುತ್ತದೆ.' },
    verdict: { Buy: 'ಖರೀದಿಸಿ', Limit: 'ಮಿತಿಗೊಳಿಸಿ', Avoid: 'ತಪ್ಪಿಸಿ', BuyDesc: 'ದೈನಂದಿನಕ್ಕೆ ಒಳ್ಳೆಯದು', LimitDesc: 'ಕೆಲವೊಮ್ಮೆ ಸರಿ', AvoidDesc: 'ಅಪರೂಪವಾಗಿ ತೆಗೆದುಕೊಳ್ಳಿ' },
    results: { containsYourAllergens: 'ನಿಮ್ಮ ಅಲರ್ಜಿ ಪದಾರ್ಥಗಳಿವೆ', whyThisScore: 'ಈ ಸ್ಕೋರ್ ಏಕೆ?', share: 'ಹಂಚಿಕೊಳ್ಳಿ', compare: 'ಹೋಲಿಸಿ', scanAnother: 'ಇನ್ನೊಂದು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ', dataFromOFF: 'ಡೇಟಾ Open Food Facts ನಿಂದ — ಪರಿಶೀಲಿಸಿದ ಪೋಷಣೆ ಡೇಟಾಬೇಸ್', containsAllergens: 'ಅಲರ್ಜಿ ಪದಾರ್ಥಗಳಿವೆ', mayContainTracesOf: 'ಇವುಗಳ ಅಂಶಗಳಿರಬಹುದು' },
    suitability: { title: 'ಇದು ಯಾರಿಗಾಗಿ?', subtitle: 'ತೀರ್ಪು, ಪ್ರಮಾಣ ಮತ್ತು ಆವರ್ತನ ನೋಡಲು ಗುಂಪಿನ ಮೇಲೆ ಟ್ಯಾಪ್ ಮಾಡಿ.', why: 'ಏಕೆ', howMuch: 'ಎಷ್ಟು ಸರಿ?', howOften: 'ಎಷ್ಟು ಬಾರಿ?', pairWith: 'ಇದರೊಂದಿಗೆ ತೆಗೆದುಕೊಳ್ಳಿ', guidanceNote: 'ಇದು ಈ ಗುಂಪಿಗೆ ಹೆಚ್ಚುವರಿ ಮಾರ್ಗದರ್ಶನ, ಸಾಮಾನ್ಯ ಸ್ಕೋರ್ ಬದಲಾಯಿಸುವುದಿಲ್ಲ.', suffix: 'ಸೂಕ್ತತೆ' },
    group: { kids: 'ಮಕ್ಕಳು', jain: 'ಜೈನ್', adultMen: 'ವಯಸ್ಕ ಪುರುಷ', adultWomen: 'ವಯಸ್ಕ ಮಹಿಳೆ', elderly: 'ಹಿರಿಯರು', 'bp-sodium': 'BP / ಸೋಡಿಯಂ', diabetes: 'ಮಧುಮೇಹ ಎಚ್ಚರಿಕೆ', 'weight-loss': 'ತೂಕ ಇಳಿಕೆ' },
    sverdict: { Suitable: 'ಸೂಕ್ತ', 'Good choice': 'ಒಳ್ಳೆಯ ಆಯ್ಕೆ', Occasional: 'ಕೆಲವೊಮ್ಮೆ', Limit: 'ಮಿತಿಗೊಳಿಸಿ', Avoid: 'ತಪ್ಪಿಸಿ', Depends: 'ಅವಲಂಬಿತ', Unknown: 'ಅಜ್ಞಾತ' },
    allowance: { title: 'ನಿಮ್ಮ ದೈನಂದಿನ ಮಿತಿಯ ಎಷ್ಟು?', subtitle: 'ಒಂದು ಸರ್ವಿಂಗ್ ಪ್ರಮಾಣ vs ಆಯ್ದ ಗುಂಪಿನ ದೈನಂದಿನ ಉಲ್ಲೇಖ.' },
    nutrient: { Calories: 'ಕ್ಯಾಲೋರಿ', Sodium: 'ಸೋಡಿಯಂ', 'Added sugar': 'ಸೇರಿಸಿದ ಸಕ್ಕರೆ', 'Total sugar': 'ಒಟ್ಟು ಸಕ್ಕರೆ', 'Saturated fat': 'ಸ್ಯಾಚುರೇಟೆಡ್ ಕೊಬ್ಬು', 'Trans fat': 'ಟ್ರಾನ್ಸ್ ಕೊಬ್ಬು', Protein: 'ಪ್ರೋಟೀನ್', Fibre: 'ಫೈಬರ್' },
    category: { calories: 'ಕ್ಯಾಲೋರಿ', sugars: 'ಸಕ್ಕರೆ', fats: 'ಕೊಬ್ಬು', sodium: 'ಸೋಡಿಯಂ', protein: 'ಪ್ರೋಟೀನ್', fiber: 'ಫೈಬರ್', processing: 'ಸಂಸ್ಕರಣೆ', additives: 'ಸೇರ್ಪಡೆಗಳು' },
    fasting: { title: 'ಉಪವಾಸ ಹೊಂದಾಣಿಕೆ', notFasting: 'ಉಪವಾಸವಿಲ್ಲ', Suitable: 'ಸೂಕ್ತ', 'Not suitable': 'ಸೂಕ್ತವಲ್ಲ', 'Depends on family': 'ಕುಟುಂಬದ ಮೇಲೆ ಅವಲಂಬಿತ', 'Needs label check': 'ಲೇಬಲ್ ಪರಿಶೀಲಿಸಿ', conflicting: 'ವಿರುದ್ಧ:', dependsOnPractice: 'ಆಚರಣೆಯ ಮೇಲೆ ಅವಲಂಬಿತ:', customOption: 'ನನ್ನ ಕುಟುಂಬದ ನಿಯಮಗಳು (ಕಸ್ಟಂ)' },
    profile: { title: 'ನನ್ನ ಕುಟುಂಬ ಪ್ರೊಫೈಲ್', intro: 'ಒಮ್ಮೆ ಹೊಂದಿಸಿ — ಪ್ರತಿ ಸ್ಕ್ಯಾನ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಅಲರ್ಜಿಗಳು, ಸರಿಯಾದ ದೈನಂದಿನ ಉಲ್ಲೇಖಗಳು ಮತ್ತು ಉಪವಾಸ ಪರಿಶೀಲಿಸಲಾಗುತ್ತದೆ. ಈ ಸಾಧನದಲ್ಲಿ ಮಾತ್ರ ಉಳಿಸಲಾಗುತ್ತದೆ.', language: 'ಭಾಷೆ', whoShoppingFor: 'ನೀವು ಯಾರಿಗಾಗಿ ಖರೀದಿಸುತ್ತಿದ್ದೀರಿ?', dietPref: 'ಆಹಾರ ಆದ್ಯತೆ', myAllergens: 'ನನ್ನ ಅಲರ್ಜಿಗಳು', fastingUpvas: 'ಉಪವಾಸ', notAllowed: 'ನಮ್ಮ ಉಪವಾಸದಲ್ಲಿ ನಿಷೇಧ', allowed: 'ವಿಶೇಷವಾಗಿ ಅನುಮತಿ' },
    diet: { none: 'ಆದ್ಯತೆ ಇಲ್ಲ', veg: 'ಸಸ್ಯಾಹಾರಿ', jain: 'ಜೈನ್', vegan: 'ವೀಗನ್' },
    search: { title: 'ಉತ್ಪನ್ನಗಳನ್ನು ಹುಡುಕಿ', subtitle: 'ಹೆಸರು, ಬ್ರಾಂಡ್ ಅಥವಾ ಪ್ರಕಾರದಿಂದ ಹುಡುಕಿ', placeholder: 'ಉದಾ. ಪಾರ್ಲೆ-ಜಿ, ಮ್ಯಾಗಿ, ಪ್ರಿಂಗಲ್ಸ್...', productsFound: '{count} ಉತ್ಪನ್ನಗಳು ಸಿಕ್ಕಿವೆ', noResults: 'ಯಾವುದೇ ಉತ್ಪನ್ನ ಸಿಗಲಿಲ್ಲ. ಬೇರೆ ಹೆಸರು ಪ್ರಯತ್ನಿಸಿ.', searching: 'ಹುಡುಕುತ್ತಿದೆ...' },
    compare: { title: 'ಉತ್ಪನ್ನ ಹೋಲಿಕೆ', swapSides: 'ಬದಿಗಳನ್ನು ಬದಲಿಸಿ', winsOverall: 'ಒಟ್ಟಾರೆ ಗೆಲುವು', tie: 'ಎರಡೂ ಸಮ — ಟೈ!', better: 'ಉತ್ತಮ', tieShort: 'ಟೈ', whoBetterFor: 'ಪ್ರತಿಯೊಂದೂ ಯಾರಿಗೆ ಉತ್ತಮ?', scanAnother: 'ಇನ್ನೊಂದು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ' },
    ingredients: { title: 'ಘಟಕ ವಿವರ', items: '{n} ಘಟಕಗಳು', avoid: 'ತಪ್ಪಿಸಿ', review: 'ಪರಿಶೀಲಿಸಿ', ok: 'ಸರಿ', tapHint: 'ವಿವರಗಳಿಗಾಗಿ ಘಟಕದ ಮೇಲೆ ಟ್ಯಾಪ್ ಮಾಡಿ. ವರ್ಗೀಕರಣ FSSAI/CODEX ಪ್ರಕಾರ.' },
    notFound: { searchByName: 'ಹೆಸರಿನಿಂದ ಹುಡುಕಿ', tryAnother: 'ಬೇರೆ ಉತ್ಪನ್ನ ಪ್ರಯತ್ನಿಸಿ', tryAgain: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ' },
    comparePick: { prompt: 'ಹೋಲಿಸಲು ಒಂದು ಉತ್ಪನ್ನ ಆಯ್ಕೆಮಾಡಿ', comparingAgainst: 'ಇದರೊಂದಿಗೆ ಹೋಲಿಕೆ:', scanBarcode: 'ಬಾರ್‌ಕೋಡ್ ಸ್ಕ್ಯಾನ್', searchByName: 'ಹೆಸರಿನಿಂದ ಹುಡುಕಿ', cancel: 'ರದ್ದು' },
    loading: { analyzing: 'ವಿಶ್ಲೇಷಣೆ ನಡೆಯುತ್ತಿದೆ...' },
  },
}

// Resolve a "namespace.key" path where the key part may contain spaces/dots.
function resolve(dict, path) {
  const i = path.indexOf('.')
  if (i < 0) return dict?.[path]
  const ns = path.slice(0, i)
  const key = path.slice(i + 1)
  return dict?.[ns]?.[key]
}

function interpolate(str, vars) {
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`))
}

export function translate(lang, path, vars) {
  const val = resolve(STRINGS[lang], path) ?? resolve(STRINGS.en, path) ?? path
  return typeof val === 'string' ? interpolate(val, vars) : val
}

// ---------------------------------------------------------------------------
// Generated-prose translation (spec §5.4). Engines emit English sentences from
// finite template sets; we translate at render by normalising each sentence
// back to its template key:
//   1. exact match against the language's `prose` dict
//   2. numbers → {0},{1}… placeholders, then match
//   3. word-carrying patterns (nutrient labels, ingredient lists) via regexes
// Unmatched sentences fall back to English (the pending note covers them).
// ---------------------------------------------------------------------------

// Patterns for sentences that interpolate words, not just numbers. Each key
// must exist verbatim in every covered language's `prose` dict; captured
// groups become {0},{1}… and pass through the language's proseWords map.
const PROSE_PATTERNS = [
  { re: /^Contains root vegetables \((.+)\) avoided in Jain diets\.$/, key: 'Contains root vegetables ({0}) avoided in Jain diets.' },
  { re: /^"([^"]+)" has an unverified source\.$/, key: '"{0}" has an unverified source.' },
  { re: /^(.+) is (\d+)% of an adult man's daily reference\.$/, key: "{0} is {1}% of an adult man's daily reference." },
  { re: /^(.+) is (\d+)% of an adult woman's daily reference\.$/, key: "{0} is {1}% of an adult woman's daily reference." },
  { re: /^Very high (.+) caps the overall score\.$/, key: 'Very high {0} caps the overall score.' },
  { re: /^High (.+) limits the overall score\.$/, key: 'High {0} limits the overall score.' },
  { re: /^Contains (.+), which most (.+) profiles do not allow\.$/, key: 'Contains {0}, which most {1} profiles do not allow.' },
  { re: /^Contains (.+) — accepted by some families and not others\.$/, key: 'Contains {0} — accepted by some families and not others.' },
]

function applyProseWords(text, words) {
  if (!words) return text
  let out = String(text)
  // Longest keys first so "Saturated fat" wins over "fat"/"sugar" substrings.
  for (const key of Object.keys(words).sort((a, b) => b.length - a.length)) {
    out = out.split(key).join(words[key])
  }
  return out
}

export function translateProse(lang, text) {
  if (!text || lang === 'en') return text
  const dict = STRINGS[lang]?.prose
  if (!dict) return text
  if (Object.hasOwn(dict, text)) return dict[text]

  const fill = (key, vars) => {
    if (!Object.hasOwn(dict, key)) return null
    const words = STRINGS[lang]?.proseWords
    return dict[key].replace(/\{(\d+)\}/g, (_, i) =>
      vars[Number(i)] !== undefined ? applyProseWords(vars[Number(i)], words) : '')
  }

  // Numbers → indexed placeholders ("Sugar: 12.5 g per serving." → "Sugar: {0} g per serving.")
  {
    const vars = []
    const key = text.replace(/\d+(?:[.,]\d+)?/g, (m) => { vars.push(m); return `{${vars.length - 1}}` })
    const out = fill(key, vars)
    if (out) return out
  }

  // Word-carrying templates (nutrient labels, ingredient lists, profile names).
  for (const { re, key } of PROSE_PATTERNS) {
    const m = text.match(re)
    if (!m) continue
    const out = fill(key, m.slice(1))
    if (out) return out
  }

  return text
}

// Languages with full generated-prose coverage; others show English prose
// with the "translation pending" note.
export const PROSE_LANGS = ['en', 'hi', 'hi-en']

export function useT() {
  const profile = useProfile()
  const lang = profile.language || 'en'
  return {
    lang,
    t: (path, vars) => translate(lang, path, vars),
    tProse: (text) => translateProse(lang, text),
    isEnglish: lang === 'en',
    proseReady: PROSE_LANGS.includes(lang),
  }
}
