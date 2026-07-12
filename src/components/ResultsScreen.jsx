// Scan result — src/components/ResultsScreen.jsx (full replacement)
// Verdict-first shell per the ZOCO doc: the numeric score is never rendered
// (it still drives the verdict internally). Child cards (SuitabilityChips,
// NutrientAllowanceCard, FastingCard, CategoryCard, NutritionDetail,
// IngredientDeepDive, DataConfidenceCard, SmartSwapCard) are kept as-is.
import { useState, useEffect, useRef } from 'react'
import CategoryCard from './CategoryCard'
import SmartSwapCard from './SmartSwapCard'
import NutritionDetail from './NutritionDetail'
import ScoreExplainer from './ScoreExplainer'
import IngredientDeepDive from './IngredientDeepDive'
import SuitabilityChips from './SuitabilityChips'
import NutrientAllowanceCard from './NutrientAllowanceCard'
import LegalNote from './LegalNote'
import FastingCard from './FastingCard'
import DataConfidenceCard from './DataConfidenceCard'
import { useProfile } from '../utils/profile'
import { useT } from '../i18n'
import { VegMark, ImageStripe } from './ZocoBrand'

const CATEGORY_ORDER = ['calories', 'sugars', 'fats', 'sodium', 'protein', 'fiber', 'processing', 'additives']

// Buy / Limit / Avoid verdict — a presentation of the existing score (§2.1),
// it does NOT change the general product score (§9). Restyled to the ZOCO
// readout treatment; label copy still comes from i18n (verdict.*).
function getVerdict(score) {
  if (score >= 7) {
    return {
      label: 'Buy',
      pill: 'bg-mint text-deep',
      hero: 'bg-mint border-mint',
      kicker: 'text-deep/70', title: 'text-deep', desc: 'text-mint-ink',
      iconBg: 'bg-brand text-white',
      icon: <path d="M9 12l2 2 4-4M12 21a9 9 0 100-18 9 9 0 000 18z" />,
    }
  }
  if (score >= 4) {
    return {
      label: 'Limit',
      pill: 'bg-sand text-ochre',
      hero: 'bg-sand border-sand-line',
      kicker: 'text-ochre-lt', title: 'text-ochre', desc: 'text-[#7C6A45]',
      iconBg: 'bg-marigold text-spice',
      icon: <><path d="M12 8v5m0 3.5h.01" /><circle cx="12" cy="12" r="9" /></>,
    }
  }
  return {
    label: 'Avoid',
    pill: 'bg-blush text-chili-ink',
    hero: 'bg-blush border-blush-line',
    kicker: 'text-chili-ink/70', title: 'text-chili-ink', desc: 'text-chili-ink/80',
    iconBg: 'bg-chili text-white',
    icon: <><path d="M12 8v5m0 3.5h.01" /><circle cx="12" cy="12" r="9" /></>,
  }
}

// Quick veg/non-veg/vegan badge from OFF ingredient analysis.
function getDietBadge(result) {
  const tags = result.ingredientsAnalysisTags || []
  if (tags.includes('en:non-vegetarian')) return { label: 'Non-veg', cls: 'bg-blush text-chili-ink', veg: false }
  if (tags.includes('en:vegan')) return { label: 'Vegan', cls: 'bg-mint text-deep', veg: true }
  if (tags.includes('en:vegetarian')) return { label: 'Veg', cls: 'bg-mint text-deep', veg: true }
  return null
}

const ALLERGEN_LABELS = {
  gluten: 'Gluten', milk: 'Milk / Dairy', eggs: 'Eggs', nuts: 'Tree Nuts',
  peanuts: 'Peanuts', soybeans: 'Soy', fish: 'Fish', crustaceans: 'Crustaceans',
  molluscs: 'Molluscs', celery: 'Celery', mustard: 'Mustard', sesame: 'Sesame',
  sulphites: 'Sulphites', lupin: 'Lupin', wheat: 'Wheat',
}

function allergenLabel(key) {
  return ALLERGEN_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1)
}

function concernStyle(concern) {
  if (concern === 'high') return 'bg-blush text-chili-ink'
  if (concern === 'medium') return 'bg-sand text-ochre'
  return 'bg-mint text-deep'
}

function concernLabel(concern) {
  if (concern === 'high') return 'limit'
  if (concern === 'medium') return 'review'
  return 'low concern'
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
    const contains = (result.allergens || []).filter(a => profile.allergens.includes(a))
    const traces = (result.traces || []).filter(a => profile.allergens.includes(a) && !contains.includes(a))
    return { contains, traces, any: contains.length > 0 || traces.length > 0 }
  })()

  // Sticky compact header (§12.1): appears once the readout hero scrolls away.
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
    <div className="max-w-lg md:max-w-5xl mx-auto px-5 md:px-10 py-5 pb-40 md:pb-16">
      {/* Sticky compact header (§12.1) — no numeric score, verdict pill only */}
      {showStickyBar && (
        <div className="fixed top-[56px] left-0 right-0 z-30 bg-cream/95 backdrop-blur-sm border-b border-line animate-fadeIn">
          <div className="max-w-lg md:max-w-5xl mx-auto px-5 md:px-10 py-2 flex items-center gap-3">
            {result.imageUrl && (
              <img src={result.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            )}
            <span className="text-sm font-semibold text-leaf truncate flex-1">{result.productName}</span>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${verdict.pill}`}>
              {t(`verdict.${verdict.label}`)}
            </span>
          </div>
        </div>
      )}

      {/* PERSONAL ALLERGEN ALERT (P1) — your own allergens, shown first */}
      {personalAllergenHits.any && (
        <div className="bg-chili text-white rounded-[18px] p-4 mb-3 animate-fadeSlideIn shadow-md">
          <div className="flex items-center gap-2.5 mb-1">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
            </svg>
            <span className="font-display font-bold">{t('results.containsYourAllergens')}</span>
          </div>
          {personalAllergenHits.contains.length > 0 && (
            <p className="text-sm text-white/90">
              This product contains{' '}
              <span className="font-bold">
                {personalAllergenHits.contains.map(allergenLabel).join(', ')}
              </span>.
            </p>
          )}
          {personalAllergenHits.traces.length > 0 && (
            <p className="text-sm text-white/80 mt-0.5">
              May contain traces of {personalAllergenHits.traces.map(allergenLabel).join(', ')}.
            </p>
          )}
        </div>
      )}

      {/* ===== Desktop two-column layout — mobile keeps single DOM order ===== */}
      <div className="md:grid md:grid-cols-[1fr_360px] md:gap-x-5 md:grid-flow-row-dense md:items-start">

      {/* Product summary card */}
      {isBarcode && (
        <div className="md:col-start-1 flex items-center gap-3.5 mb-3 bg-white border border-line rounded-[18px] p-4 shadow-sm animate-fadeSlideIn">
          {result.imageUrl ? (
            <img
              src={result.imageUrl}
              alt={result.productName}
              className="w-16 h-16 rounded-[14px] object-cover shrink-0"
            />
          ) : (
            <ImageStripe className="w-16 h-16 rounded-[14px]" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {dietBadge?.veg && <VegMark size={15} />}
              <h2 className="font-display font-bold text-[17px] leading-tight text-ink truncate">
                {result.productName}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {dietBadge && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${dietBadge.cls}`}>
                  {dietBadge.label}
                </span>
              )}
              {result.novaGroup && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  result.novaGroup <= 2 ? 'bg-mint text-deep' : 'bg-blush text-chili-ink'
                }`}>
                  NOVA {result.novaGroup}
                </span>
              )}
              {result.servingSize && (
                <span className="text-[11px] text-moss">Serving: {result.servingSize}</span>
              )}
            </div>
            {result.barcode && (
              <p className="text-[11px] text-faint tracking-wider mt-1">CODE {result.barcode}</p>
            )}
          </div>
        </div>
      )}

      {/* ZOCO READOUT — verdict hero (replaces the numeric score dial) */}
      <div
        ref={scoreAnchorRef}
        className={`md:col-start-1 border rounded-[18px] p-4.5 mb-3 flex gap-3.5 items-start animate-scaleIn ${verdict.hero}`}
        style={{ animationDelay: '100ms' }}
      >
        <span className={`w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 mt-0.5 ${verdict.iconBg}`}>
          <svg className="w-[21px] h-[21px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {verdict.icon}
          </svg>
        </span>
        <div className="min-w-0">
          <p className={`text-[11px] font-bold tracking-[.14em] uppercase ${verdict.kicker}`}>
            {t('results.readout')}
          </p>
          <p className={`font-display font-extrabold text-[25px] leading-[1.1] mt-0.5 ${verdict.title}`}>
            {t(`verdict.${verdict.label}`)}
          </p>
          <p className={`text-[13px] leading-relaxed mt-1 ${verdict.desc}`}>
            {t(`verdict.${verdict.label}Desc`)}
          </p>
        </div>
      </div>

      {/* ALLERGEN WARNING */}
      {(hasAllergens || hasTraces) && (
        <div className="md:col-start-1 bg-blush border border-blush-line rounded-[18px] p-4 mb-3 animate-fadeSlideIn" style={{ animationDelay: '50ms' }}>
          {hasAllergens && (
            <div className={hasTraces ? 'mb-3' : ''}>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-[18px] h-[18px] text-chili shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
                </svg>
                <span className="font-display font-bold text-chili-ink text-sm">{t('results.containsAllergens')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.allergens.map(a => (
                  <span key={a} className="bg-white/70 text-chili-ink text-[12.5px] font-semibold px-2.5 py-1 rounded-full">
                    {allergenLabel(a)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {hasTraces && (
            <div>
              <p className="font-semibold text-chili-ink/80 text-[13px] mb-2">{t('results.mayContainTracesOf')}</p>
              <div className="flex flex-wrap gap-2">
                {result.traces.map(tr => (
                  <span key={tr} className="bg-white/50 text-chili-ink/80 text-xs font-medium px-2 py-0.5 rounded-full">
                    {allergenLabel(tr)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MISLEADING CLAIMS */}
      {misleadingClaims.length > 0 && (
        <div className="md:col-start-1 bg-blush border border-blush-line rounded-[18px] p-4 mb-3 animate-fadeSlideIn" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-[18px] h-[18px] text-chili shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21V5a2 2 0 012-2h11l-2 4 2 4H5" />
            </svg>
            <span className="font-display font-bold text-chili-ink text-sm">
              {misleadingClaims.length} Misleading Claim{misleadingClaims.length > 1 ? 's' : ''} Detected
            </span>
          </div>
          <div className="space-y-2.5">
            {misleadingClaims.map((c, i) => (
              <div key={i} className="bg-white/80 rounded-xl p-3 border border-blush-line">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="bg-chili text-white text-[10px] font-bold tracking-wider px-2 py-0.5 rounded uppercase">
                    Misleading
                  </span>
                  <span className="font-semibold text-chili-ink text-sm">"{c.claim}"</span>
                </div>
                <p className="text-[13px] text-chili-ink/90 leading-snug">{c.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified claims */}
      {verifiedClaims.length > 0 && (
        <div className="md:col-start-1 bg-mint rounded-[18px] p-3.5 mb-3 animate-fadeSlideIn" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-deep shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-display font-bold text-deep text-sm">Verified Claims</span>
          </div>
          <div className="space-y-1.5">
            {verifiedClaims.map((c, i) => (
              <div key={i} className="text-[13px] text-mint-ink">
                <span className="font-semibold">"{c.claim}"</span>
                <span> — {c.explanation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Why This Score? explainer (top findings) */}
      <div className="mb-3 md:col-start-1">
        <ScoreExplainer result={result} />
      </div>

      {/* === India-first interactive layer === */}
      {isBarcode && (
        <div className="space-y-3 mb-3 md:col-start-1">
          <SuitabilityChips result={result} />
          <NutrientAllowanceCard result={result} />
          <FastingCard result={result} />
        </div>
      )}

      {/* Share + Compare buttons */}
      <div className="flex gap-2.5 mb-3 md:col-start-1 animate-fadeSlideIn" style={{ animationDelay: '300ms' }}>
        <button
          onClick={handleShare}
          disabled={shareStatus === 'generating'}
          className="flex-1 py-3 px-4 bg-white border border-edge text-fern font-semibold rounded-2xl transition-all active:scale-[.98] flex items-center justify-center gap-2 text-[13.5px]"
        >
          {shareStatus === 'generating' ? (
            <>
              <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : shareStatus ? (
            <>{shareStatus}</>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {t('results.share')}
            </>
          )}
        </button>
        {onCompare && (
          <button
            onClick={() => onCompare(result)}
            className="flex-1 py-3 px-4 bg-white border border-dashed border-edge text-sage font-semibold rounded-2xl transition-all active:scale-[.98] flex items-center justify-center gap-2 text-[13.5px]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t('results.compare')}
          </button>
        )}
      </div>

      {/* Category scores — staggered */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3 md:col-start-1">
        {CATEGORY_ORDER.map((cat, i) => (
          result.categories[cat] && (
            <CategoryCard key={cat} category={cat} data={result.categories[cat]} index={i} />
          )
        ))}
      </div>

      {/* Detailed nutrition breakdown — flags, macros, WHO bars */}
      <div className="md:col-start-2 mb-3">
        <NutritionDetail result={result} />
      </div>

      {/* Ingredient Deep Dive — each ingredient opens a detail sheet (§5) */}
      {result.parsedIngredients && (
        <div className="mt-3 md:mt-0 md:col-start-2">
          <IngredientDeepDive ingredientText={result.parsedIngredients} barcode={result.barcode} />
        </div>
      )}

      {/* Data & trust card (§4) */}
      {isBarcode && (
        <div className="mt-3 md:col-start-2">
          <DataConfidenceCard result={result} />
        </div>
      )}

      {/* Smart swap suggestions */}
      <div className="mt-3 md:col-start-1 animate-fadeSlideIn" style={{ animationDelay: '600ms' }}>
        <SmartSwapCard result={result} onSelectProduct={onSelectProduct || (() => {})} />
      </div>

      {/* Flagged ingredients */}
      {result.flaggedItems?.length > 0 && (
        <div className="mt-3 md:col-start-1 bg-white border border-line rounded-[18px] p-4 animate-fadeSlideIn" style={{ animationDelay: '700ms' }}>
          <p className="font-display font-bold text-[15.5px] text-ink mb-2.5">Ingredient Review</p>
          <div className="space-y-2">
            {result.flaggedItems.map((item, i) => (
              <div key={i} className="rounded-xl border border-hairline bg-cream/60 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-fern capitalize">{item.name}</span>
                  <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full font-bold ${concernStyle(item.concern)}`}>
                    {concernLabel(item.concern)}
                  </span>
                </div>
                {item.reason && (
                  <p className="mt-1 text-xs leading-snug text-moss">{item.reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nutri-Score */}
      {result.nutriScore && (
        <div className="mt-3 md:col-start-2 bg-stone/60 rounded-[18px] p-3 text-center animate-fadeIn" style={{ animationDelay: '800ms' }}>
          <p className="text-xs text-moss">
            Open Food Facts Nutri-Score: <span className="font-bold text-sage uppercase">{result.nutriScore}</span>
          </p>
        </div>
      )}
      </div>{/* end desktop two-column grid */}

      {/* Legal-safe disclaimer (spec §15.2 / §20) — bottom of every result */}
      <LegalNote className="mt-6 mb-20 md:mb-6" />

      {/* Scan another — floats above the bottom nav on mobile */}
      <button
        onClick={onReset}
        className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 py-3.5 px-8 bg-gradient-to-br from-brand-hi to-brand-lo text-white font-display font-bold rounded-2xl shadow-lg shadow-brand-lo/35 transition-all active:scale-[.97] whitespace-nowrap z-20"
      >
        {t('results.scanAnother')}
      </button>
    </div>
  )
}
