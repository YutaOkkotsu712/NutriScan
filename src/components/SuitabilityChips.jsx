import { useMemo, useState } from 'react'
import BottomSheet from './BottomSheet'
import { getSuitability } from '../utils/suitabilityEngine'
import { useT } from '../i18n'
import { track } from '../utils/analytics'

const CHIP_ICONS = {
  kids: '🧒',
  jain: '🪷',
  adultMen: '👨',
  adultWomen: '👩',
  elderly: '🧓',
  'bp-sodium': '🧂',
  diabetes: '🩸',
  'weight-loss': '⚖️',
}

const TONE_CHIP = {
  good: 'bg-green-50 border-green-300 text-green-800',
  warn: 'bg-amber-50 border-amber-300 text-amber-800',
  bad: 'bg-red-50 border-red-300 text-red-800',
  neutral: 'bg-gray-50 border-gray-300 text-gray-700',
}

const TONE_DOT = {
  good: 'bg-green-500',
  warn: 'bg-amber-500',
  bad: 'bg-red-500',
  neutral: 'bg-gray-400',
}

const TONE_BADGE = {
  good: 'bg-green-600 text-white',
  warn: 'bg-amber-500 text-white',
  bad: 'bg-red-600 text-white',
  neutral: 'bg-gray-500 text-white',
}

function SuitabilityDetail({ group }) {
  const { t, tProse, proseReady } = useT()
  return (
    <div className="space-y-4">
      {/* Verdict badge */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{CHIP_ICONS[group.key]}</span>
        <div>
          <span className={`inline-block text-sm font-bold px-2.5 py-1 rounded-full ${TONE_BADGE[group.tone]}`}>
            {t(`sverdict.${group.verdict}`)}
          </span>
        </div>
      </div>

      {/* Reasons (generated prose — translated per sentence where covered) */}
      {group.reasons?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('suitability.why')}</p>
          <ul className="space-y-1.5">
            {group.reasons.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${TONE_DOT[group.tone]}`} />
                <span className="leading-snug">{tProse(r)}</span>
              </li>
            ))}
          </ul>
          {!proseReady && <p className="text-[10px] text-gray-400 mt-1.5 italic">{t('common.translationPending')}</p>}
        </div>
      )}

      {/* Portion / frequency / pairing (§7.2) */}
      <div className="grid grid-cols-1 gap-2">
        {group.portion && (
          <InfoRow icon="🍽️" label={t('suitability.howMuch')} value={tProse(group.portion)} />
        )}
        {group.frequency && (
          <InfoRow icon="📅" label={t('suitability.howOften')} value={tProse(group.frequency)} />
        )}
        {group.pairWith && (
          <InfoRow icon="🤝" label={t('suitability.pairWith')} value={tProse(group.pairWith)} />
        )}
      </div>

      {/* Caveat */}
      {group.caveat && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5 leading-relaxed">
          ℹ️ {tProse(group.caveat)}
        </p>
      )}

      <p className="text-[11px] text-gray-400 leading-relaxed">
        {t('suitability.guidanceNote')}
      </p>
    </div>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-2.5">
      <span className="text-base shrink-0">{icon}</span>
      <div>
        <p className="text-[11px] font-medium text-gray-500">{label}</p>
        <p className="text-sm text-gray-800 leading-snug">{value}</p>
      </div>
    </div>
  )
}

export default function SuitabilityChips({ result }) {
  const groups = useMemo(() => getSuitability(result), [result])
  const [active, setActive] = useState(null)
  const { t } = useT()

  if (!groups || groups.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-fadeSlideIn" style={{ animationDelay: '250ms' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">👨‍👩‍👧‍👦</span>
        <span className="font-semibold text-gray-800">{t('suitability.title')}</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{t('suitability.subtitle')}</p>

      {/* Horizontal scroll chips on mobile, wrap on larger */}
      <div className="flex gap-2 overflow-x-auto sm:flex-wrap pb-1 -mx-1 px-1">
        {groups.map(g => (
          <button
            key={g.key}
            onClick={() => { setActive(g); track('chip_click', { group: g.key }) }}
            className={`shrink-0 inline-flex items-center gap-1.5 border rounded-full pl-2.5 pr-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${TONE_CHIP[g.tone]}`}
            style={{ minHeight: '44px' }}
          >
            <span className="text-base">{CHIP_ICONS[g.key]}</span>
            <span>{t(`group.${g.key}`)}</span>
            <span className={`w-2 h-2 rounded-full ${TONE_DOT[g.tone]}`} />
            <span className="text-[11px] font-semibold opacity-80">{t(`sverdict.${g.verdict}`)}</span>
          </button>
        ))}
      </div>

      <BottomSheet
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? `${t(`group.${active.key}`)} — ${t('suitability.suffix')}` : ''}
      >
        {active && <SuitabilityDetail group={active} />}
      </BottomSheet>
    </div>
  )
}
