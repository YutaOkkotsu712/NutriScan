// Nutrition detail — src/components/NutritionDetail.jsx (full replacement)
// Token restyle; all data logic unchanged.
import { useState } from 'react'
import { WHO_DAILY_LIMITS } from '../utils/scoreEngine'

// --- WHO Daily Limit Progress Bars ---
function DailyLimitBar({ nutrientKey, value }) {
  const info = WHO_DAILY_LIMITS[nutrientKey]
  if (!info || value === undefined) return null

  const pct = Math.min((value / info.limit) * 100, 100)
  const isPositive = info.positive // fiber, protein = higher is better

  let barColor
  if (isPositive) {
    barColor = pct >= 20 ? 'bg-brand' : pct >= 10 ? 'bg-amberdot' : 'bg-chili'
  } else {
    barColor = pct <= 15 ? 'bg-brand' : pct <= 30 ? 'bg-amberdot' : 'bg-chili'
  }

  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className="text-xs text-sage w-16 shrink-0 text-right">{info.label}</span>
      <div className="flex-1 bg-hairline rounded-full h-[5px] relative overflow-hidden">
        <div
          className={`h-full rounded-full animate-barGrow ${barColor}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="text-xs font-mono text-fern w-20 shrink-0">
        {value}{info.unit} <span className="text-faint">({Math.round(pct)}%)</span>
      </span>
    </div>
  )
}

// --- Macro Ratio Donut ---
function MacroDonut({ macroRatio }) {
  if (!macroRatio) return null

  const { protein, carbs, fat } = macroRatio
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
        {/* Fat (marigold) */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#F2A93B" strokeWidth="14"
          strokeDasharray={`${fatArc} ${circumference - fatArc}`}
          strokeDashoffset={fatOffset}
          transform="rotate(-90 50 50)" />
        {/* Carbs (sage) */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#8B917E" strokeWidth="14"
          strokeDasharray={`${carbsArc} ${circumference - carbsArc}`}
          strokeDashoffset={carbsOffset}
          transform="rotate(-90 50 50)" />
        {/* Protein (brand green) */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1C7A4A" strokeWidth="14"
          strokeDasharray={`${proteinArc} ${circumference - proteinArc}`}
          strokeDashoffset={proteinOffset}
          transform="rotate(-90 50 50)" />
      </svg>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-brand shrink-0" />
          <span className="text-sm text-fern">Protein <span className="font-bold text-leaf">{protein}%</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-mute shrink-0" />
          <span className="text-sm text-fern">Carbs <span className="font-bold text-leaf">{carbs}%</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-marigold shrink-0" />
          <span className="text-sm text-fern">Fat <span className="font-bold text-leaf">{fat}%</span></span>
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
        <span key={f} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-mint text-deep px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-brand" /> {FLAG_LABELS[f] || f}
        </span>
      ))}
      {red.map(f => (
        <span key={f} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blush text-chili-ink px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-chili" /> {FLAG_LABELS[f] || f}
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
    <div className="space-y-3 mt-3">
      {/* Red/Green flags */}
      {result.flags && <div className="animate-fadeSlideIn" style={{ animationDelay: '400ms' }}><FlagBadges flags={result.flags} /></div>}

      {/* Macro ratio */}
      {result.macroRatio && (
        <div className="bg-white border border-line rounded-[18px] p-4 animate-fadeSlideIn" style={{ animationDelay: '450ms' }}>
          <p className="font-display font-bold text-[15.5px] text-ink mb-3">Macro Split (by calories)</p>
          <MacroDonut macroRatio={result.macroRatio} />
        </div>
      )}

      {/* WHO daily limit bars */}
      <div className="bg-white border border-line rounded-[18px] p-4 animate-fadeSlideIn" style={{ animationDelay: '500ms' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-bold text-[15.5px] text-ink">% of WHO Daily Limit</p>

          {hasPer100g && (
            <div className="flex bg-hairline rounded-full p-[3px]">
              <button
                onClick={() => setView('serving')}
                className={`text-[11px] px-2.5 py-1 rounded-full font-bold transition-colors ${
                  view === 'serving' ? 'bg-ink text-cream' : 'text-moss font-semibold'
                }`}
              >
                Per serving
              </button>
              <button
                onClick={() => setView('per100g')}
                className={`text-[11px] px-2.5 py-1 rounded-full font-bold transition-colors ${
                  view === 'per100g' ? 'bg-ink text-cream' : 'text-moss font-semibold'
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

        <p className="text-[10px] text-faint mt-2">
          Based on WHO guidelines for a 2000 kcal/day diet. Green ≤15%, Amber ≤30%, Red &gt;30% of daily limit.
        </p>
      </div>
    </div>
  )
}
