import { useMemo, useState } from 'react'
import { getAllowance, getPortionViews } from '../utils/demographicEngine'
import { DEMOGRAPHIC_ORDER, DEMOGRAPHIC_REFERENCE, NUTRIENT_REFERENCE_META } from '../data/nutrientReference'
import { useProfile } from '../utils/profile'
import { useT } from '../i18n'

const STATUS_BAR = {
  good: 'bg-green-500',
  ok: 'bg-amber-400',
  high: 'bg-orange-500',
  veryhigh: 'bg-red-500',
  low: 'bg-red-400',
  unknown: 'bg-gray-300',
}

const STATUS_TEXT = {
  good: 'text-green-700',
  ok: 'text-amber-700',
  high: 'text-orange-700',
  veryhigh: 'text-red-700',
  low: 'text-red-600',
  unknown: 'text-gray-500',
}

function AllowanceRow({ row, label }) {
  const width = row.pct === null ? 4 : Math.min(Math.max(row.pct, 2), 100)
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className={`text-xs font-mono ${STATUS_TEXT[row.status]}`}>
          {row.amount}{row.unit}
          {row.teaspoons ? <span className="text-gray-400"> ≈ {row.teaspoons} tsp</span> : null}
          {row.pct !== null && <span className="font-bold"> · {row.pct}%</span>}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full animate-barGrow ${STATUS_BAR[row.status]}`} style={{ width: `${width}%` }} />
      </div>
      {row.pct === null && (
        <p className="text-[10px] text-gray-400 mt-0.5">Reference value not available for this group.</p>
      )}
    </div>
  )
}

export default function NutrientAllowanceCard({ result }) {
  const profile = useProfile()
  const { t } = useT()
  const [demo, setDemo] = useState(profile.demographic || 'adultMen')

  // Portion views (§6.1): per serving / per 100 g / whole pack / Indian portion.
  const views = useMemo(() => getPortionViews(result), [result])
  const [viewKey, setViewKey] = useState('serving')
  const activeView = views.find(v => v.key === viewKey) || views[0]
  const nutrition = activeView?.nutrition

  const { rows, demographic } = useMemo(() => getAllowance(nutrition, demo), [nutrition, demo])

  if (!nutrition || rows.length === 0) return null

  const ref = DEMOGRAPHIC_REFERENCE[demo]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-fadeSlideIn" style={{ animationDelay: '350ms' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">📊</span>
        <span className="font-semibold text-gray-800">{t('allowance.title')}</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        {t('allowance.subtitle')}
      </p>

      {/* Portion view selector (§6.1) */}
      {views.length > 1 && (
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-2 overflow-x-auto">
          {views.map(v => (
            <button
              key={v.key}
              onClick={() => setViewKey(v.key)}
              className={`shrink-0 text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                activeView.key === v.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
      {activeView?.note && (
        <p className="text-[11px] text-gray-500 mb-2">{activeView.note}</p>
      )}

      {/* Demographic selector */}
      <select
        value={demo}
        onChange={(e) => setDemo(e.target.value)}
        className="w-full mb-3 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {DEMOGRAPHIC_ORDER.map(k => (
          <option key={k} value={k}>{t(`demographic.${k}`)}</option>
        ))}
      </select>

      <div className="divide-y divide-gray-100">
        {rows.map(row => <AllowanceRow key={row.key} row={row} label={t(`nutrient.${row.label}`)} />)}
      </div>

      {/* Caution for children / elderly / general */}
      {ref?.caution && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5 mt-3 leading-relaxed">
          ⚠️ {ref.caution}
        </p>
      )}
      {ref?.isChild && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5 mt-2 leading-relaxed">
          Child references use age bands — pick the closest age. General child caution applies if unsure.
        </p>
      )}

      <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
        {demographic.note} {NUTRIENT_REFERENCE_META.caveat} Sources: {NUTRIENT_REFERENCE_META.sources.join('; ')}.
      </p>
    </div>
  )
}
