import { useState } from 'react'
import { WHO_DAILY_LIMITS } from '../utils/scoreEngine'

// --- WHO Daily Limit Progress Bars ---
function DailyLimitBar({ nutrientKey, value }) {
  const info = WHO_DAILY_LIMITS[nutrientKey]
  if (!info || value === undefined) return null

  const pct = Math.min((value / info.limit) * 100, 100)
  const isPositive = info.positive // fiber, protein = higher is better

  let barColor = 'bg-green-500'
  if (isPositive) {
    barColor = pct >= 20 ? 'bg-green-500' : pct >= 10 ? 'bg-amber-400' : 'bg-red-400'
  } else {
    barColor = pct <= 15 ? 'bg-green-500' : pct <= 30 ? 'bg-amber-400' : 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-xs text-gray-600 w-16 shrink-0 text-right">{info.label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2.5 relative overflow-hidden">
        <div
          className={`h-2.5 rounded-full animate-barGrow ${barColor}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="text-xs font-mono text-gray-700 w-20 shrink-0">
        {value}{info.unit} <span className="text-gray-400">({Math.round(pct)}%)</span>
      </span>
    </div>
  )
}

// --- Macro Ratio Donut ---
function MacroDonut({ macroRatio }) {
  if (!macroRatio) return null

  const { protein, carbs, fat } = macroRatio
  // SVG donut chart
  const r = 40
  const circumference = 2 * Math.PI * r

  const proteinArc = (protein / 100) * circumference
  const carbsArc = (carbs / 100) * circumference
  const fatArc = (fat / 100) * circumference

  const proteinOffset = 0
  const carbsOffset = -proteinArc
  const fatOffset = -(proteinArc + carbsArc)

  return (
    <div className="flex items-center gap-4">
      <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
        {/* Fat (yellow) */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#facc15" strokeWidth="14"
          strokeDasharray={`${fatArc} ${circumference - fatArc}`}
          strokeDashoffset={fatOffset}
          transform="rotate(-90 50 50)" />
        {/* Carbs (blue) */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#60a5fa" strokeWidth="14"
          strokeDasharray={`${carbsArc} ${circumference - carbsArc}`}
          strokeDashoffset={carbsOffset}
          transform="rotate(-90 50 50)" />
        {/* Protein (green) */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#34d399" strokeWidth="14"
          strokeDasharray={`${proteinArc} ${circumference - proteinArc}`}
          strokeDashoffset={proteinOffset}
          transform="rotate(-90 50 50)" />
      </svg>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-sm text-gray-700">Protein <span className="font-bold">{protein}%</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-400 shrink-0" />
          <span className="text-sm text-gray-700">Carbs <span className="font-bold">{carbs}%</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-400 shrink-0" />
          <span className="text-sm text-gray-700">Fat <span className="font-bold">{fat}%</span></span>
        </div>
      </div>
    </div>
  )
}

// --- Red / Green Flags ---
const FLAG_LABELS = {
  calories: 'Calories',
  sugars: 'Sugar',
  fats: 'Fat',
  sodium: 'Sodium',
  protein: 'Protein',
  fiber: 'Fiber',
  processing: 'Processing',
  additives: 'Additives',
  'good sugar:fiber ratio': 'Sugar:Fiber ratio',
  'terrible sugar:fiber ratio': 'Sugar:Fiber ratio',
  'high protein density': 'Protein density',
}

function FlagBadges({ flags }) {
  if (!flags) return null
  const { red, green } = flags
  if (red.length === 0 && green.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {green.map(f => (
        <span key={f} className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">
          <span>✅</span> {FLAG_LABELS[f] || f}
        </span>
      ))}
      {red.map(f => (
        <span key={f} className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-2 py-1 rounded-full">
          <span>🔴</span> {FLAG_LABELS[f] || f}
        </span>
      ))}
    </div>
  )
}

// --- Main Detail Component ---
export default function NutritionDetail({ result }) {
  const [view, setView] = useState('serving') // 'serving' | 'per100g'
  const nutrition = view === 'per100g' && result.nutrition100g
    ? result.nutrition100g
    : result.parsedNutrition

  const hasPer100g = !!result.nutrition100g

  if (!nutrition || Object.keys(nutrition).length === 0) return null

  return (
    <div className="space-y-4 mt-4">
      {/* Red/Green flags */}
      {result.flags && <div className="animate-fadeSlideIn" style={{ animationDelay: '400ms' }}><FlagBadges flags={result.flags} /></div>}

      {/* Macro ratio */}
      {result.macroRatio && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 animate-fadeSlideIn" style={{ animationDelay: '450ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📊</span>
            <span className="font-semibold text-gray-800 text-sm">Macro Split (by calories)</span>
          </div>
          <MacroDonut macroRatio={result.macroRatio} />
        </div>
      )}

      {/* WHO daily limit bars */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 animate-fadeSlideIn" style={{ animationDelay: '500ms' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📏</span>
            <span className="font-semibold text-gray-800 text-sm">% of WHO Daily Limit</span>
          </div>

          {hasPer100g && (
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setView('serving')}
                className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                  view === 'serving' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Per serving
              </button>
              <button
                onClick={() => setView('per100g')}
                className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                  view === 'per100g' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Per 100g
              </button>
            </div>
          )}
        </div>

        <div className="space-y-0.5">
          <DailyLimitBar nutrientKey="calories" value={nutrition.calories} />
          <DailyLimitBar nutrientKey="sugars" value={nutrition.sugars} />
          <DailyLimitBar nutrientKey="totalFat" value={nutrition.totalFat} />
          <DailyLimitBar nutrientKey="saturatedFat" value={nutrition.saturatedFat} />
          <DailyLimitBar nutrientKey="transFat" value={nutrition.transFat} />
          <DailyLimitBar nutrientKey="sodium" value={nutrition.sodium} />
          <DailyLimitBar nutrientKey="fiber" value={nutrition.fiber} />
          <DailyLimitBar nutrientKey="protein" value={nutrition.protein} />
          <DailyLimitBar nutrientKey="totalCarbs" value={nutrition.totalCarbs} />
        </div>

        <p className="text-[10px] text-gray-400 mt-2">
          Based on WHO guidelines for a 2000 kcal/day diet. Green ≤15%, Amber ≤30%, Red &gt;30% of daily limit.
        </p>
      </div>
    </div>
  )
}
