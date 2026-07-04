import { useState, useEffect, useRef } from 'react'
import ScoreDial from './ScoreDial'
import CategoryCard from './CategoryCard'
import SmartSwapCard from './SmartSwapCard'
import NutritionDetail from './NutritionDetail'
import ScoreExplainer from './ScoreExplainer'
import IngredientDeepDive from './IngredientDeepDive'
import SuitabilityChips from './SuitabilityChips'
import NutrientAllowanceCard from './NutrientAllowanceCard'
import FastingCard from './FastingCard'
import DataConfidenceCard from './DataConfidenceCard'
import { useProfile } from '../utils/profile'
import { useT } from '../i18n'

const CATEGORY_ORDER = ['calories', 'sugars', 'fats', 'sodium', 'protein', 'fiber', 'processing', 'additives']

// Buy / Limit / Avoid verdict — a presentation of the existing score (§2.1),
// it does NOT change the general product score (§9).
function getVerdict(score) {
  if (score >= 7) return { label: 'Buy', cls: 'bg-green-600 text-white', desc: 'Good everyday choice' }
  if (score >= 4) return { label: 'Limit', cls: 'bg-amber-500 text-white', desc: 'Okay occasionally' }
  return { label: 'Avoid', cls: 'bg-red-600 text-white', desc: 'Best kept as a rare treat' }
}

// Quick veg/non-veg/vegan badge from OFF ingredient analysis.
function getDietBadge(result) {
  const tags = result.ingredientsAnalysisTags || []
  if (tags.includes('en:non-vegetarian')) return { label: 'Non-veg', cls: 'bg-red-100 text-red-700' }
  if (tags.includes('en:vegan')) return { label: 'Vegan', cls: 'bg-green-100 text-green-700' }
  if (tags.includes('en:vegetarian')) return { label: 'Veg', cls: 'bg-green-100 text-green-700' }
  return null
}

const ALLERGEN_LABELS = {
  gluten: { icon: '\u{1F33E}', label: 'Gluten' },
  milk: { icon: '\u{1F95B}', label: 'Milk / Dairy' },
  eggs: { icon: '\u{1F95A}', label: 'Eggs' },
  nuts: { icon: '\u{1F95C}', label: 'Tree Nuts' },
  peanuts: { icon: '\u{1F95C}', label: 'Peanuts' },
  soybeans: { icon: '\u{1FAD8}', label: 'Soy' },
  fish: { icon: '\u{1F41F}', label: 'Fish' },
  crustaceans: { icon: '\u{1F990}', label: 'Crustaceans' },
  molluscs: { icon: '\u{1F41A}', label: 'Molluscs' },
  celery: { icon: '\u{1F96C}', label: 'Celery' },
  mustard: { icon: '\u{1F7E1}', label: 'Mustard' },
  sesame: { icon: '\u{1FAD8}', label: 'Sesame' },
  sulphites: { icon: '\u{2697}\u{FE0F}', label: 'Sulphites' },
  lupin: { icon: '\u{1F33F}', label: 'Lupin' },
  wheat: { icon: '\u{1F33E}', label: 'Wheat' },
}

function concernStyle(concern) {
  if (concern === 'high') return 'bg-red-100 text-red-700'
  if (concern === 'medium') return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

function concernLabel(concern) {
  if (concern === 'high') return 'limit'
  if (concern === 'medium') return 'review'
  return 'low concern'
}

function getAllergenInfo(key) {
  return ALLERGEN_LABELS[key] || { icon: '\u{26A0}\u{FE0F}', label: key.charAt(0).toUpperCase() + key.slice(1) }
}

export default function ResultsScreen({ result, onReset, onCompare, onSelectProduct }) {
  const isBarcode = result.source === 'openfoodfacts'
  const [shareStatus, setShareStatus] = useState('')
  const [showStickyBar, setShowStickyBar] = useState(false)
  const scoreAnchorRef = useRef(null)

  const profile = useProfile()
  const { t, lang } = useT()
  const verdict = getVerdict(result.overallScore)
  const dietBadge = getDietBadge(result)

  // Personal allergen match (P1): intersect product allergens/traces with the
  // user's profile so their own allergens get a prominent, first-thing alert.
  const personalAllergenHits = (() => {
    if (!profile.allergens?.length) return { contains: [], traces: [] }
    const inProduct = new Set([...(result.allergens || []), ...(result.traces || [])])
    const contains = (result.allergens || []).filter(a => profile.allergens.includes(a))
    const traces = (result.traces || []).filter(a => profile.allergens.includes(a) && !contains.includes(a))
    return { contains, traces, any: contains.length > 0 || traces.length > 0, inProduct }
  })()

  // Sticky compact header (§12.1): appears once the main score scrolls away.
  useEffect(() => {
    const el = scoreAnchorRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { rootMargin: '-60px 0px 0px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const hasAllergens = result.allergens?.length > 0
  const hasTraces = result.traces?.length > 0
  const misleadingClaims = (result.claims || []).filter(c => c.isMisleading)
  const verifiedClaims = (result.claims || []).filter(c => !c.isMisleading && c.explanation !== 'Claim noted.')

  async function handleShare() {
    setShareStatus('generating')
    try {
      const { shareResult } = await import('./ShareCard.js')
      const status = await shareResult(result, lang)
      setShareStatus(status === 'downloaded' ? 'Image saved!' : '')
    } catch {
      setShareStatus('Failed to generate image')
    }
    setTimeout(() => setShareStatus(''), 3000)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Sticky compact header (§12.1) — appears after scrolling past the score */}
      {showStickyBar && (
        <div className="fixed top-[52px] left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 animate-fadeIn">
          <div className="max-w-lg mx-auto px-4 py-2 flex items-center gap-3">
            {result.imageUrl && (
              <img src={result.imageUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
            )}
            <span className="text-sm font-semibold text-gray-800 truncate flex-1">{result.productName}</span>
            <span className="text-sm font-bold text-gray-700 shrink-0">{result.overallScore}/10</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${verdict.cls}`}>{t(`verdict.${verdict.label}`)}</span>
          </div>
        </div>
      )}

      {/* PERSONAL ALLERGEN ALERT (P1) — your own allergens, shown first */}
      {personalAllergenHits.any && (
        <div className="bg-red-600 text-white rounded-xl p-4 mb-4 animate-fadeSlideIn shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🚨</span>
            <span className="font-bold">{t('results.containsYourAllergens')}</span>
          </div>
          {personalAllergenHits.contains.length > 0 && (
            <p className="text-sm text-red-50">
              This product contains{' '}
              <span className="font-bold">
                {personalAllergenHits.contains.map(a => getAllergenInfo(a).label).join(', ')}
              </span>.
            </p>
          )}
          {personalAllergenHits.traces.length > 0 && (
            <p className="text-sm text-red-100 mt-0.5">
              May contain traces of {personalAllergenHits.traces.map(a => getAllergenInfo(a).label).join(', ')}.
            </p>
          )}
        </div>
      )}

      {/* Product info */}
      {isBarcode && (
        <div className="flex items-center gap-4 mb-4 bg-white border border-gray-200 rounded-xl p-4 animate-fadeSlideIn">
          {result.imageUrl && (
            <img
              src={result.imageUrl}
              alt={result.productName}
              className="w-16 h-16 rounded-lg object-cover shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-gray-900 text-lg leading-tight truncate">
              {result.productName}
            </h2>
            {result.barcode && (
              <p className="text-xs text-gray-400 font-mono mt-0.5">{result.barcode}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* Buy / Limit / Avoid verdict */}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${verdict.cls}`}>
                {verdict.label}
              </span>
              {dietBadge && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${dietBadge.cls}`}>
                  {dietBadge.label}
                </span>
              )}
              {result.novaGroup && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  result.novaGroup <= 2 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  NOVA {result.novaGroup}
                </span>
              )}
              {result.servingSize && (
                <span className="text-xs text-gray-500">Serving: {result.servingSize}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ALLERGEN WARNING */}
      {(hasAllergens || hasTraces) && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4 animate-fadeSlideIn" style={{ animationDelay: '50ms' }}>
          {hasAllergens && (
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{'\u{26A0}\u{FE0F}'}</span>
                <span className="font-bold text-red-800">{t('results.containsAllergens')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.allergens.map(a => {
                  const info = getAllergenInfo(a)
                  return (
                    <span key={a} className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-sm font-medium px-2.5 py-1 rounded-full">
                      <span>{info.icon}</span>
                      {info.label}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
          {hasTraces && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{'\u{26A1}'}</span>
                <span className="font-semibold text-red-700 text-sm">{t('results.mayContainTracesOf')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.traces.map(t => {
                  const info = getAllergenInfo(t)
                  return (
                    <span key={t} className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-0.5 rounded-full">
                      <span>{info.icon}</span>
                      {info.label}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MISLEADING CLAIMS */}
      {misleadingClaims.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4 animate-fadeSlideIn" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{'\u{1F6A9}'}</span>
            <span className="font-bold text-red-800">
              {misleadingClaims.length} Misleading Claim{misleadingClaims.length > 1 ? 's' : ''} Detected
            </span>
          </div>
          <div className="space-y-3">
            {misleadingClaims.map((c, i) => (
              <div key={i} className="bg-white/80 rounded-lg p-3 border border-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                    MISLEADING
                  </span>
                  <span className="font-semibold text-red-900 text-sm">"{c.claim}"</span>
                </div>
                <p className="text-sm text-red-800 leading-snug">{c.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified claims */}
      {verifiedClaims.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 animate-fadeSlideIn" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">{'\u{2705}'}</span>
            <span className="font-semibold text-green-800 text-sm">Verified Claims</span>
          </div>
          <div className="space-y-1.5">
            {verifiedClaims.map((c, i) => (
              <div key={i} className="text-sm text-green-700">
                <span className="font-medium">"{c.claim}"</span>
                <span className="text-green-600"> — {c.explanation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source banner */}
      <div className={`border rounded-xl p-3 mb-6 text-center animate-fadeIn ${
        isBarcode ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
      }`} style={{ animationDelay: '150ms' }}>
        <p className={`text-sm ${isBarcode ? 'text-green-700' : 'text-amber-700'}`}>
          {isBarcode
            ? t('results.dataFromOFF')
            : 'Results based on local nutrition analysis — accuracy depends on the available product data'
          }
        </p>
      </div>

      {/* Score dial */}
      <div ref={scoreAnchorRef} className="flex flex-col items-center mb-4 animate-scaleIn" style={{ animationDelay: '200ms' }}>
        <ScoreDial score={result.overallScore} label={t(`scoreword.${result.scoreLabel}`)} />
        <div className="mt-2 text-center">
          <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${verdict.cls}`}>
            {verdict.label}
          </span>
          <p className="text-xs text-gray-500 mt-1">{t(`verdict.${verdict.label}Desc`)}</p>
        </div>
      </div>

      {/* Why This Score? explainer (top reasons) */}
      <div className="mb-4">
        <ScoreExplainer result={result} />
      </div>

      {/* === India-first interactive layer === */}
      {isBarcode && (
        <div className="space-y-4 mb-6">
          {/* Who is this for? — clickable suitability chips (§7) */}
          <SuitabilityChips result={result} />
          {/* How much of your daily limit? — demographic allowance (§6) */}
          <NutrientAllowanceCard result={result} />
          {/* Fasting / Upvas compatibility (§8) */}
          <FastingCard result={result} />
        </div>
      )}

      {/* Share + Compare buttons */}
      <div className="flex gap-2 mb-4 animate-fadeSlideIn" style={{ animationDelay: '300ms' }}>
        <button
          onClick={handleShare}
          disabled={shareStatus === 'generating'}
          className="flex-1 py-3 px-4 bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {shareStatus === 'generating' ? (
            <>
              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : shareStatus ? (
            <>{shareStatus}</>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {t('results.share')}
            </>
          )}
        </button>
        {onCompare && (
          <button
            onClick={() => onCompare(result)}
            className="flex-1 py-3 px-4 bg-white hover:bg-gray-50 border-2 border-dashed border-gray-300 text-gray-600 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t('results.compare')}
          </button>
        )}
      </div>

      {/* Category scores — staggered */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {CATEGORY_ORDER.map((cat, i) => (
          result.categories[cat] && (
            <CategoryCard key={cat} category={cat} data={result.categories[cat]} index={i} />
          )
        ))}
      </div>

      {/* Detailed nutrition breakdown — flags, macros, WHO bars */}
      <NutritionDetail result={result} />

      {/* Ingredient Deep Dive — each ingredient opens a detail sheet (§5) */}
      {result.parsedIngredients && (
        <div className="mt-4">
          <IngredientDeepDive ingredientText={result.parsedIngredients} barcode={result.barcode} />
        </div>
      )}

      {/* Data & trust card (§4) */}
      {isBarcode && (
        <div className="mt-4">
          <DataConfidenceCard result={result} />
        </div>
      )}

      {/* Smart swap suggestions */}
      <div className="mt-4 animate-fadeSlideIn" style={{ animationDelay: '600ms' }}>
        <SmartSwapCard result={result} onSelectProduct={onSelectProduct || (() => {})} />
      </div>

      {/* Flagged ingredients */}
      {result.flaggedItems?.length > 0 && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 animate-fadeSlideIn" style={{ animationDelay: '700ms' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{'\u{1F9FE}'}</span>
            <span className="font-semibold text-gray-800">Ingredient Review</span>
          </div>
          <div className="space-y-2">
            {result.flaggedItems.map((item, i) => (
              <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-800 capitalize">{item.name}</span>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${concernStyle(item.concern)}`}>
                    {concernLabel(item.concern)}
                  </span>
                </div>
                {item.reason && (
                  <p className="mt-1 text-xs leading-snug text-gray-600">{item.reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nutri-Score */}
      {result.nutriScore && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-3 text-center animate-fadeIn" style={{ animationDelay: '800ms' }}>
          <p className="text-xs text-gray-500">
            Open Food Facts Nutri-Score: <span className="font-bold text-gray-700 uppercase">{result.nutriScore}</span>
          </p>
        </div>
      )}

      <button
        onClick={onReset}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 py-3 px-8 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg transition-colors"
      >
        {t('results.scanAnother')}
      </button>
    </div>
  )
}
