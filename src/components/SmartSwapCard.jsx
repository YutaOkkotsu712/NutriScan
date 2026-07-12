// Smart swap / alternatives — src/components/SmartSwapCard.jsx (full replacement)
// Verdict-first: the numeric score badge and "+1.2" diff badges are replaced
// with the scoreword pill and a "Better" tag (score still drives sorting
// internally). All fetching/filter logic unchanged. Needs i18n keys
// swap.better + swap.neverSponsored (see i18n-additions).
import { useState, useEffect } from 'react'
import { useProfile } from '../utils/profile'
import { useT } from '../i18n'
import { ImageStripe } from './ZocoBrand'

function DeltaBadge({ value, label, positive }) {
  if (value === undefined) return null
  const isBetter = positive ? value > 0 : value < 0
  const absVal = Math.abs(value)
  if (absVal < 5) return null

  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
      isBetter ? 'bg-mint text-deep' : 'bg-blush text-chili-ink'
    }`}>
      {value > 0 ? '+' : ''}{value}% {label}
    </span>
  )
}

// Verdict pill from the score (numeric score never rendered).
function ScoreWordPill({ score, label }) {
  let cls = 'bg-blush text-chili-ink'
  if (score > 7) cls = 'bg-mint text-deep'
  else if (score > 4) cls = 'bg-sand text-ochre'

  return (
    <span className={`shrink-0 text-[10.5px] font-bold px-2 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  )
}

export default function SmartSwapCard({ result, onSelectProduct }) {
  const profile = useProfile()
  const { t } = useT()
  const diet = profile.diet || 'none'
  const allergens = profile.allergens
  const fastingProfile = profile.fastingProfile && profile.fastingProfile !== 'none' ? profile.fastingProfile : 'none'
  const [alternatives, setAlternatives] = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const applicable = result.source === 'openfoodfacts' && Boolean(result.barcode)

  useEffect(() => {
    if (!applicable) return

    let cancelled = false

    async function fetchAlternatives() {
      setLoading(true)
      try {
        const { findAlternatives } = await import('../utils/searchEngine')
        const alts = await findAlternatives(
          {
            barcode: result.barcode,
            categories: result.categoryTags || [],
            name: result.productName || '',
          },
          result.nutrition100g || result.parsedNutrition,
          result.worstCategory,
          5,
          { diet, allergens, fastingProfile, customFasting: profile.customFasting },
        )
        if (!cancelled) {
          setAlternatives(alts)
          setLoaded(true)
        }
      } catch {
        if (!cancelled) setLoaded(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAlternatives()
    return () => { cancelled = true }
  }, [applicable, result.barcode, result.categoryTags, result.worstCategory, result.parsedNutrition, result.nutrition100g, result.productName, diet, allergens, fastingProfile, profile.customFasting])

  const betterAlts = alternatives.filter(a => a.nutriscanScore > result.overallScore)
  const similarAlts = alternatives.filter(a => a.nutriscanScore <= result.overallScore)

  return (
    <div className="bg-white border border-line rounded-[18px] p-4">
      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
        <span className="font-display font-bold text-[15.5px] text-ink">
          {betterAlts.length > 0 ? t('swap.healthier') : t('swap.similar')}
        </span>
        <span className="text-[11.5px] text-faint">{t('swap.neverSponsored')}</span>
        <span className="ml-auto flex items-center gap-1 flex-wrap justify-end">
          {diet !== 'none' && (
            <span className="text-[10px] font-bold bg-mint text-deep px-2 py-0.5 rounded-full">
              {t('swap.onlyChip', { label: t(`diet.${diet}`) })}
            </span>
          )}
          {allergens?.length > 0 && (
            <span className="text-[10px] font-bold bg-blush text-chili-ink px-2 py-0.5 rounded-full">
              {t('swap.allergenChip')}
            </span>
          )}
          {fastingProfile !== 'none' && (
            <span className="text-[10px] font-bold bg-sand text-ochre px-2 py-0.5 rounded-full">
              {t('swap.fastingChip')}
            </span>
          )}
        </span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-moss py-4">
          <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          {t('swap.finding')}
        </div>
      )}

      {(loaded || !applicable) && alternatives.length === 0 && (
        <div className="py-2">
          <p className="text-sm text-sage leading-relaxed">{result.swapSuggestion}</p>
        </div>
      )}

      {!loading && betterAlts.length > 0 && (
        <>
          <p className="text-xs text-moss mb-3">
            {t('swap.scoreHigher')}
          </p>
          <div className="space-y-2 mb-3">
            {betterAlts.map((alt) => (
              <AlternativeCard
                key={alt.barcode}
                alt={alt}
                currentScore={result.overallScore}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        </>
      )}

      {!loading && betterAlts.length > 0 && similarAlts.length > 0 && (
        <div className="border-t border-hairline pt-3 mt-2">
          <p className="text-xs text-faint mb-2">{t('swap.otherInCategory')}</p>
          <div className="space-y-2">
            {similarAlts.slice(0, 3).map((alt) => (
              <AlternativeCard
                key={alt.barcode}
                alt={alt}
                currentScore={result.overallScore}
                onSelect={onSelectProduct}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {!loading && betterAlts.length === 0 && similarAlts.length > 0 && (
        <>
          <p className="text-xs text-moss mb-3">
            {t('swap.sameCategoryTap')}
          </p>
          <div className="space-y-2">
            {similarAlts.map((alt) => (
              <AlternativeCard
                key={alt.barcode}
                alt={alt}
                currentScore={result.overallScore}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function AlternativeCard({ alt, currentScore, onSelect, compact = false }) {
  const { t } = useT()
  const isBetter = alt.nutriscanScore > currentScore

  return (
    <button
      onClick={() => onSelect(alt.barcode)}
      className={`w-full rounded-2xl p-3 text-left transition-all active:scale-[.99] border ${
        isBetter ? 'bg-mint/50 border-mint' : 'bg-cream/60 border-hairline'
      }`}
    >
      <div className="flex items-center gap-3">
        {alt.image ? (
          <img src={alt.image} alt="" className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-[10px] object-cover shrink-0`} />
        ) : (
          <ImageStripe className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-[10px]`} />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-leaf truncate`}>{alt.name}</p>
            {isBetter && (
              <span className="shrink-0 text-[10px] font-bold bg-brand text-white px-1.5 py-0.5 rounded-full">
                {t('swap.better')}
              </span>
            )}
          </div>
          {alt.brand && !compact && (
            <p className="text-xs text-moss truncate mt-0.5">{alt.brand}</p>
          )}
        </div>

        <ScoreWordPill score={alt.nutriscanScore} label={t(`scoreword.${alt.scoreLabel}`)} />
      </div>

      {/* Improvement badges */}
      {!compact && alt.improvements && alt.improvements.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-deep font-semibold">
            {alt.improvements.slice(0, 3).map(imp =>
              `${imp.pct > 0 ? '+' : ''}${imp.pct}% ${t(`swapn.${imp.key}`)}`
            ).join(' · ')}
          </p>
        </div>
      )}

      {/* Nutrient deltas */}
      {!compact && Object.keys(alt.deltas).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          <DeltaBadge value={alt.deltas.sugars} label={t('swapn.sugars')} />
          <DeltaBadge value={alt.deltas.saturatedFat} label={t('swapn.saturatedFat')} />
          <DeltaBadge value={alt.deltas.sodium} label={t('swapn.sodium')} />
          <DeltaBadge value={alt.deltas.calories} label={t('swapn.calories')} />
          <DeltaBadge value={alt.deltas.fiber} label={t('swapn.fiber')} positive />
          <DeltaBadge value={alt.deltas.protein} label={t('swapn.protein')} positive />
        </div>
      )}
    </button>
  )
}
