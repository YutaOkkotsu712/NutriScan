import { useState, useCallback, useMemo } from 'react'
import ScoreDial from './ScoreDial'
import { getSuitability, verdictTone } from '../utils/suitabilityEngine'
import { useT } from '../i18n'

const CATEGORY_ORDER = ['calories', 'sugars', 'fats', 'sodium', 'protein', 'fiber', 'processing', 'additives']

const TONE_TEXT = {
  good: 'text-green-700 bg-green-50',
  warn: 'text-amber-700 bg-amber-50',
  bad: 'text-red-700 bg-red-50',
  neutral: 'text-gray-600 bg-gray-50',
}

const CATEGORY_LABELS = {
  calories: 'Calories',
  sugars: 'Sugars',
  fats: 'Fats',
  sodium: 'Sodium',
  protein: 'Protein',
  fiber: 'Fiber',
  processing: 'Processing',
  additives: 'Additives',
}

const CATEGORY_ICONS = {
  calories: '🔥',
  sugars: '🍬',
  fats: '🧈',
  sodium: '🧂',
  protein: '💪',
  fiber: '🌾',
  processing: '⚙️',
  additives: '🧪',
}

function WinnerBadge({ side }) {
  const { t } = useT()
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
      side === 'left' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
    }`}>
      {t('compare.better')}
    </span>
  )
}

function ScoreBar({ score, color }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${color}`}
        style={{ width: `${score * 10}%` }}
      />
    </div>
  )
}

export default function CompareScreen({ productA, productB, onReset, onScanAnother }) {
  const { t } = useT()
  const [flipped, setFlipped] = useState(false)
  const left = flipped ? productB : productA
  const right = flipped ? productA : productB

  // Count wins per side
  let leftWins = 0
  let rightWins = 0
  for (const cat of CATEGORY_ORDER) {
    const leftScore = left.categories?.[cat]?.score ?? 0
    const rightScore = right.categories?.[cat]?.score ?? 0
    if (leftScore > rightScore) leftWins++
    else if (rightScore > leftScore) rightWins++
  }

  // Suitability verdicts side-by-side (P1) — only for barcode products with data.
  const suitabilityRows = useMemo(() => {
    if (left.source !== 'openfoodfacts' || right.source !== 'openfoodfacts') return []
    const l = new Map(getSuitability(left).map(g => [g.key, g]))
    const r = new Map(getSuitability(right).map(g => [g.key, g]))
    const keys = [...l.keys()]
    return keys.map(k => ({ key: k, label: l.get(k).label, left: l.get(k), right: r.get(k) }))
  }, [left, right])

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-1">{t('compare.title')}</h2>
        <button
          onClick={() => setFlipped(!flipped)}
          className="text-xs text-green-600 hover:text-green-700 font-medium"
        >
          {t('compare.swapSides')}
        </button>
      </div>

      {/* Overall scores side by side */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          {left.imageUrl && (
            <img src={left.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover mx-auto mb-2" />
          )}
          <p className="text-sm font-semibold text-gray-900 truncate mb-2">{left.productName}</p>
          <div className="flex justify-center">
            <ScoreDial score={left.overallScore} label={left.scoreLabel} small />
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          {right.imageUrl && (
            <img src={right.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover mx-auto mb-2" />
          )}
          <p className="text-sm font-semibold text-gray-900 truncate mb-2">{right.productName}</p>
          <div className="flex justify-center">
            <ScoreDial score={right.overallScore} label={right.scoreLabel} small />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 text-center">
        <p className="text-sm text-gray-700">
          {left.overallScore > right.overallScore ? (
            <><span className="font-bold text-blue-700">{left.productName}</span> {t('compare.winsOverall')} ({leftWins}/{CATEGORY_ORDER.length})</>
          ) : right.overallScore > left.overallScore ? (
            <><span className="font-bold text-purple-700">{right.productName}</span> {t('compare.winsOverall')} ({rightWins}/{CATEGORY_ORDER.length})</>
          ) : (
            <>{t('compare.tie')}</>
          )}
        </p>
      </div>

      {/* Category-by-category comparison */}
      <div className="space-y-3 mb-6">
        {CATEGORY_ORDER.map(cat => {
          const leftScore = left.categories?.[cat]?.score ?? 0
          const rightScore = right.categories?.[cat]?.score ?? 0
          const leftWins = leftScore > rightScore
          const rightWins = rightScore > leftScore

          return (
            <div key={cat} className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{CATEGORY_ICONS[cat]}</span>
                  <span className="font-medium text-gray-800 text-sm">{t(`category.${cat}`)}</span>
                </div>
                {leftWins && <WinnerBadge side="left" />}
                {rightWins && <WinnerBadge side="right" />}
                {!leftWins && !rightWins && (
                  <span className="text-xs text-gray-400 font-medium">{t('compare.tieShort')}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 truncate">{left.productName}</span>
                    <span className={`text-xs font-bold ${leftWins ? 'text-green-600' : 'text-gray-500'}`}>
                      {leftScore}/10
                    </span>
                  </div>
                  <ScoreBar score={leftScore} color={leftWins ? 'bg-green-500' : 'bg-gray-400'} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 truncate">{right.productName}</span>
                    <span className={`text-xs font-bold ${rightWins ? 'text-green-600' : 'text-gray-500'}`}>
                      {rightScore}/10
                    </span>
                  </div>
                  <ScoreBar score={rightScore} color={rightWins ? 'bg-green-500' : 'bg-gray-400'} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Suitability comparison (P1) */}
      {suitabilityRows.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 mb-6">
          <p className="font-semibold text-gray-800 text-sm mb-3 text-center">{t('compare.whoBetterFor')}</p>
          <div className="space-y-1.5">
            {suitabilityRows.map(row => (
              <div key={row.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-xs">
                <span className="text-gray-600">{t(`group.${row.key}`)}</span>
                <span className={`px-2 py-0.5 rounded-full font-medium text-center w-20 ${TONE_TEXT[verdictTone(row.left.verdict)]}`}>
                  {t(`sverdict.${row.left.verdict}`)}
                </span>
                <span className={`px-2 py-0.5 rounded-full font-medium text-center w-20 ${TONE_TEXT[verdictTone(row.right.verdict)]}`}>
                  {t(`sverdict.${row.right.verdict}`)}
                </span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
            <span></span>
            <span className="w-20 text-center truncate">{left.productName}</span>
            <span className="w-20 text-center truncate">{right.productName}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onScanAnother}
          className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
        >
          {t('compare.scanAnother')}
        </button>
        <button
          onClick={onReset}
          className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
        >
          {t('common.home')}
        </button>
      </div>
    </div>
  )
}
