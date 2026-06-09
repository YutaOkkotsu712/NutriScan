import { useState, useCallback } from 'react'
import ScoreDial from './ScoreDial'

const CATEGORY_ORDER = ['calories', 'sugars', 'fats', 'sodium', 'fiber', 'processing', 'additives']

const CATEGORY_LABELS = {
  calories: 'Calories',
  sugars: 'Sugars',
  fats: 'Fats',
  sodium: 'Sodium',
  fiber: 'Fiber',
  processing: 'Processing',
  additives: 'Additives',
}

const CATEGORY_ICONS = {
  calories: '🔥',
  sugars: '🍬',
  fats: '🧈',
  sodium: '🧂',
  fiber: '🌾',
  processing: '⚙️',
  additives: '🧪',
}

function WinnerBadge({ side }) {
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
      side === 'left' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
    }`}>
      Better
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

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Product Comparison</h2>
        <button
          onClick={() => setFlipped(!flipped)}
          className="text-xs text-green-600 hover:text-green-700 font-medium"
        >
          Swap sides
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
            <><span className="font-bold text-blue-700">{left.productName}</span> wins overall ({leftWins} of {CATEGORY_ORDER.length} categories)</>
          ) : right.overallScore > left.overallScore ? (
            <><span className="font-bold text-purple-700">{right.productName}</span> wins overall ({rightWins} of {CATEGORY_ORDER.length} categories)</>
          ) : (
            <>Both products scored equally — it's a tie!</>
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
                  <span className="font-medium text-gray-800 text-sm">{CATEGORY_LABELS[cat]}</span>
                </div>
                {leftWins && <WinnerBadge side="left" />}
                {rightWins && <WinnerBadge side="right" />}
                {!leftWins && !rightWins && (
                  <span className="text-xs text-gray-400 font-medium">Tie</span>
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

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onScanAnother}
          className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
        >
          Scan Another
        </button>
        <button
          onClick={onReset}
          className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
        >
          Home
        </button>
      </div>
    </div>
  )
}
