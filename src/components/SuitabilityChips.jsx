// Suitability chips ("Suitable for whom?") — src/components/SuitabilityChips.jsx
// (full replacement) Emoji chips → dot chips per the ZOCO design; BottomSheet
// detail flow and all engine/i18n logic unchanged.
import { useMemo, useState } from 'react'
import BottomSheet from './BottomSheet'
import { getSuitability } from '../utils/suitabilityEngine'
import { useT } from '../i18n'
import { track } from '../utils/analytics'

const TONE_CHIP = {
  good: 'bg-mint text-deep',
  warn: 'bg-sand text-ochre',
  bad: 'bg-blush text-chili-ink',
  neutral: 'bg-stone text-sage',
}

const TONE_DOT = {
  good: 'bg-brand',
  warn: 'bg-amberdot',
  bad: 'bg-chili',
  neutral: 'bg-mute',
}

const TONE_BADGE = {
  good: 'bg-brand text-white',
  warn: 'bg-marigold text-spice',
  bad: 'bg-chili text-white',
  neutral: 'bg-mute text-white',
}

function SuitabilityDetail({ group }) {
  const { t, tProse, proseReady } = useT()
  return (
    <div className="space-y-4">
      {/* Verdict badge */}
      <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${TONE_BADGE[group.tone]}`}>
        {t(`sverdict.${group.verdict}`)}
      </span>

      {/* Reasons (generated prose — translated per sentence where covered) */}
      {group.reasons?.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-faint uppercase tracking-[.14em] mb-1.5">{t('suitability.why')}</p>
          <ul className="space-y-1.5">
            {group.reasons.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-fern">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${TONE_DOT[group.tone]}`} />
                <span className="leading-snug">{tProse(r)}</span>
              </li>
            ))}
          </ul>
          {!proseReady && <p className="text-[10px] text-faint mt-1.5 italic">{t('common.translationPending')}</p>}
        </div>
      )}

      {/* Portion / frequency / pairing (§7.2) */}
      <div className="grid grid-cols-1 gap-2">
        {group.portion && <InfoRow label={t('suitability.howMuch')} value={tProse(group.portion)} />}
        {group.frequency && <InfoRow label={t('suitability.howOften')} value={tProse(group.frequency)} />}
        {group.pairWith && <InfoRow label={t('suitability.pairWith')} value={tProse(group.pairWith)} />}
      </div>

      {/* Caveat */}
      {group.caveat && (
        <p className="text-xs text-moss bg-cream rounded-xl p-2.5 leading-relaxed">
          {tProse(group.caveat)}
        </p>
      )}

      <p className="text-[11px] text-faint leading-relaxed">
        {t('suitability.guidanceNote')}
      </p>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="bg-cream rounded-xl p-2.5">
      <p className="text-[11px] font-semibold text-faint">{label}</p>
      <p className="text-sm text-leaf leading-snug mt-0.5">{value}</p>
    </div>
  )
}

export default function SuitabilityChips({ result }) {
  const groups = useMemo(() => getSuitability(result), [result])
  const [active, setActive] = useState(null)
  const { t } = useT()

  if (!groups || groups.length === 0) return null

  return (
    <div className="bg-white border border-line rounded-[18px] p-4 animate-fadeSlideIn" style={{ animationDelay: '250ms' }}>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display font-bold text-[15.5px] text-ink">{t('suitability.title')}</span>
        <span className="text-[11.5px] text-faint">{t('suitability.subtitle')}</span>
      </div>

      {/* Horizontal scroll chips on mobile, wrap on larger */}
      <div className="flex gap-2 overflow-x-auto sm:flex-wrap pb-1 -mx-1 px-1">
        {groups.map(g => (
          <button
            key={g.key}
            onClick={() => { setActive(g); track('chip_click', { group: g.key }) }}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-all active:scale-95 ${TONE_CHIP[g.tone]}`}
            style={{ minHeight: '44px' }}
          >
            <span className={`w-[7px] h-[7px] rounded-full ${TONE_DOT[g.tone]}`} />
            <span>{t(`group.${g.key}`)}</span>
            <span className="opacity-70">·</span>
            <span className="text-[11px] font-bold opacity-80">{t(`sverdict.${g.verdict}`)}</span>
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
