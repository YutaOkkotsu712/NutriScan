// Nutrient allowance (§6) — src/components/NutrientAllowanceCard.jsx (full replacement)
import { useMemo, useState } from 'react'
import { getAllowance, getPortionViews } from '../utils/demographicEngine'
import { DEMOGRAPHIC_ORDER, DEMOGRAPHIC_REFERENCE, NUTRIENT_REFERENCE_META } from '../data/nutrientReference'
import { useProfile } from '../utils/profile'
import { useT } from '../i18n'

const STATUS_BAR = {
  good: 'bg-brand',
  ok: 'bg-amberdot',
  high: 'bg-marigold',
  veryhigh: 'bg-chili',
  low: 'bg-chili/70',
  unknown: 'bg-edge',
}

const STATUS_TEXT = {
  good: 'text-deep',
  ok: 'text-ochre',
  high: 'text-ochre',
  veryhigh: 'text-chili-ink',
  low: 'text-chili-ink',
  unknown: 'text-moss',
}

function AllowanceRow({ row, label }) {
  const width = row.pct === null ? 4 : Math.min(Math.max(row.pct, 2), 100)
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px] text-sage">{label}</span>
        <span className={`text-xs font-mono ${STATUS_TEXT[row.status]}`}>
          {row.amount}{row.unit}
          {row.teaspoons ? <span className="text-faint"> ≈ {row.teaspoons} tsp</span> : null}
          {row.pct !== null && <span className="font-bold"> · {row.pct}%</span>}
        </span>
      </div>
      <div className="w-full bg-hairline rounded-full h-[5px] overflow-hidden">
        <div className={`h-full rounded-full animate-barGrow ${STATUS_BAR[row.status]}`} style={{ width: `${width}%` }} />
      </div>
      {row.pct === null && (
        <p className="text-[10px] text-faint mt-0.5">Reference value not available for this group.</p>
      )}
    </div>
  )
}

const selectCls = 'w-full text-sm text-fern border border-edge rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:border-brand'

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
    <div className="bg-white border border-line rounded-[18px] p-4 animate-fadeSlideIn" style={{ animationDelay: '350ms' }}>
      <div className="flex items-baseline gap-2 mb-3 flex-wrap">
        <span className="font-display font-bold text-[15.5px] text-ink">{t('allowance.title')}</span>
        <span className="text-[11.5px] text-faint">{t('allowance.subtitle')}</span>
      </div>

      {/* Portion view selector (§6.1) */}
      {views.length > 1 && (
        <div className="flex gap-0.5 bg-hairline rounded-full p-[3px] mb-2 overflow-x-auto">
          {views.map(v => (
            <button
              key={v.key}
              onClick={() => setViewKey(v.key)}
              className={`shrink-0 text-[11px] px-2.5 py-1.5 rounded-full transition-colors ${
                activeView.key === v.key ? 'bg-ink text-cream font-bold' : 'text-moss font-semibold'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
      {activeView?.note && (
        <p className="text-[11px] text-moss mb-2">{activeView.note}</p>
      )}

      {/* Demographic selector */}
      <select value={demo} onChange={(e) => setDemo(e.target.value)} className={`${selectCls} mb-2`}>
        {DEMOGRAPHIC_ORDER.map(k => (
          <option key={k} value={k}>{t(`demographic.${k}`)}</option>
        ))}
      </select>

      <div className="divide-y divide-hairline">
        {rows.map(row => <AllowanceRow key={row.key} row={row} label={t(`nutrient.${row.label}`)} />)}
      </div>

      {/* Caution for children / elderly / general */}
      {ref?.caution && (
        <p className="text-xs text-ochre bg-sand rounded-xl p-2.5 mt-3 leading-relaxed">
          {ref.caution}
        </p>
      )}
      {ref?.isChild && (
        <p className="text-xs text-moss bg-cream rounded-xl p-2.5 mt-2 leading-relaxed">
          Child references use age bands — pick the closest age. General child caution applies if unsure.
        </p>
      )}

      <p className="text-[10px] text-faint mt-3 leading-relaxed">
        {demographic.note} {NUTRIENT_REFERENCE_META.caveat} Sources: {NUTRIENT_REFERENCE_META.sources.join('; ')}.
      </p>
    </div>
  )
}
