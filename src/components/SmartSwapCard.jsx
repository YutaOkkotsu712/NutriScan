import { useState, useEffect } from 'react'
import { useProfile } from '../utils/profile'
import { useT } from '../i18n'

function DeltaBadge({ value, label, positive }) {
  if (value === undefined) return null
  const isBetter = positive ? value > 0 : value < 0
  const absVal = Math.abs(value)
  if (absVal < 5) return null

  return (
    <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${
      isBetter ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {value > 0 ? '+' : ''}{value}% {label}
    </span>
  )
}

function ScoreBadge({ score, label }) {
  let color = 'bg-red-500'
  if (score > 7) color = 'bg-green-500'
  else if (score > 4) color = 'bg-amber-500'

  return (
    <div className="flex flex-col items-center shrink-0">
      <span className={`${color} text-white text-xs font-bold w-9 h-9 rounded-full flex items-center justify-center`}>
        {score.toFixed(1)}
      </span>
      <span className="text-[10px] text-gray-500 mt-0.5">{label}</span>
    </div>
  )
}

export default function SmartSwapCard({ result, onSelectProduct }) {
  const profile = useProfile()
  const { t } = useT()
  const diet = profile.diet || 'none'
  // Stable reference from the profile store (defaults to [] there).
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
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="text-lg">🔄</span>
        <span className="font-semibold text-gray-800">
          {betterAlts.length > 0 ? t('swap.healthier') : t('swap.similar')}
        </span>
        <span className="ml-auto flex items-center gap-1 flex-wrap justify-end">
          {diet !== 'none' && (
            <span className="text-[10px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
              {t('swap.onlyChip', { label: t(`diet.${diet}`) })}
            </span>
          )}
          {allergens?.length > 0 && (
            <span className="text-[10px] font-medium bg-red-50 text-red-700 px-1.5 py-0.5 rounded-full">
              {t('swap.allergenChip')}
            </span>
          )}
          {fastingProfile !== 'none' && (
            <span className="text-[10px] font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">
              {t('swap.fastingChip')}
            </span>
          )}
        </span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          {t('swap.finding')}
        </div>
      )}

      {(loaded || !applicable) && alternatives.length === 0 && (
        <div className="py-2">
          <p className="text-sm text-gray-600 leading-relaxed">{result.swapSuggestion}</p>
        </div>
      )}

      {!loading && betterAlts.length > 0 && (
        <>
          <p className="text-xs text-gray-500 mb-3">
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
        <div className="border-t border-gray-100 pt-3 mt-2">
          <p className="text-xs text-gray-400 mb-2">{t('swap.otherInCategory')}</p>
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
          <p className="text-xs text-gray-500 mb-3">
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
  const scoreDiff = (alt.nutriscanScore - currentScore).toFixed(1)

  return (
    <button
      onClick={() => onSelect(alt.barcode)}
      className={`w-full rounded-lg p-3 text-left transition-colors border ${
        isBetter
          ? 'bg-green-50 hover:bg-green-100 border-green-200'
          : 'bg-gray-50 hover:bg-gray-100 border-gray-100'
      }`}
    >
      <div className="flex items-center gap-3">
        {alt.image ? (
          <img src={alt.image} alt="" className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg object-cover shrink-0`} />
        ) : (
          <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg bg-gray-100 flex items-center justify-center shrink-0`}>
            <span className="text-sm">📦</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-900 truncate`}>{alt.name}</p>
            {isBetter && (
              <span className="shrink-0 text-[10px] font-bold bg-green-600 text-white px-1.5 py-0.5 rounded">
                +{scoreDiff}
              </span>
            )}
          </div>
          {alt.brand && !compact && (
            <p className="text-xs text-gray-500 truncate">{alt.brand}</p>
          )}
        </div>

        <ScoreBadge score={alt.nutriscanScore} label={t(`scoreword.${alt.scoreLabel}`)} />
      </div>

      {/* Improvement badges */}
      {!compact && alt.improvements && alt.improvements.length > 0 && (
        <div className="mt-2 ml-13">
          <p className="text-xs text-green-700 font-medium">
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
