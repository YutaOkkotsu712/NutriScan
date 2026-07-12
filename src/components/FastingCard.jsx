// Fasting / Upvas card (§8) — src/components/FastingCard.jsx (full replacement)
import { useMemo, useState } from 'react'
import { evaluateFasting } from '../utils/fastingEngine'
import { FASTING_PROFILE_ORDER, FASTING_PROFILES, FASTING_STATUS, FASTING_META } from '../data/fastingProfiles'
import { useProfile } from '../utils/profile'
import { useT } from '../i18n'

const STATUS_STYLE = {
  [FASTING_STATUS.SUITABLE]: { badge: 'bg-brand text-white', label: 'Suitable' },
  [FASTING_STATUS.NOT_SUITABLE]: { badge: 'bg-chili text-white', label: 'Not suitable' },
  [FASTING_STATUS.DEPENDS]: { badge: 'bg-marigold text-spice', label: 'Depends on family' },
  [FASTING_STATUS.UNKNOWN]: { badge: 'bg-mute text-white', label: 'Needs label check' },
}

export default function FastingCard({ result }) {
  const profile = useProfile()
  const { t, tProse, proseReady } = useT()
  const [profileKey, setProfileKey] = useState(
    profile.fastingProfile && profile.fastingProfile !== 'none' ? profile.fastingProfile : 'hindu_upvas_generic'
  )
  const [expanded, setExpanded] = useState(false)
  const evalResult = useMemo(
    () => evaluateFasting(result.parsedIngredients, profileKey, profile.customFasting),
    [result.parsedIngredients, profileKey, profile.customFasting]
  )

  if (!evalResult) return null
  const style = STATUS_STYLE[evalResult.status] || STATUS_STYLE[FASTING_STATUS.UNKNOWN]

  return (
    <div className="bg-white border border-line rounded-[18px] p-4 animate-fadeSlideIn" style={{ animationDelay: '400ms' }}>
      <p className="font-display font-bold text-[15.5px] text-ink mb-2">{t('fasting.title')}</p>

      {/* Profile selector */}
      <select
        value={profileKey}
        onChange={(e) => setProfileKey(e.target.value)}
        className="w-full mb-2 text-sm text-fern border border-edge rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:border-brand"
      >
        {FASTING_PROFILE_ORDER.map(k => (
          <option key={k} value={k}>{FASTING_PROFILES[k].label}</option>
        ))}
        {(profile.customFasting.restrict.length > 0 || profile.customFasting.allow.length > 0) && (
          <option value="custom">{t('fasting.customOption')}</option>
        )}
      </select>

      {/* Status badge */}
      <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full mt-1 ${style.badge}`}>
        {t(`fasting.${style.label}`)}
      </span>

      <p className="text-[13.5px] text-fern mt-2 leading-snug">{tProse(evalResult.reason)}</p>
      {!proseReady && <p className="text-[10px] text-faint italic mt-1">{t('common.translationPending')}</p>}

      {/* Expandable explanation */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-brand font-bold mt-2 flex items-center gap-1"
      >
        {expanded ? t('common.hideDetails') : t('common.showDetails')}
        <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {evalResult.restrictedHits.length > 0 && (
            <div className="text-xs">
              <span className="font-bold text-chili-ink">{t('fasting.conflicting')} </span>
              <span className="text-fern">{evalResult.restrictedHits.join(', ')}</span>
            </div>
          )}
          {evalResult.dependsHits.length > 0 && (
            <div className="text-xs">
              <span className="font-bold text-ochre">{t('fasting.dependsOnPractice')} </span>
              <span className="text-fern">{evalResult.dependsHits.join(', ')}</span>
            </div>
          )}
          {evalResult.note && (
            <p className="text-xs text-sage leading-relaxed bg-cream rounded-xl p-2.5">{evalResult.note}</p>
          )}
        </div>
      )}

      <p className="text-[11px] text-ochre bg-sand rounded-xl p-2.5 mt-3 leading-relaxed">
        {FASTING_META.globalCaveat}
      </p>
      <p className="text-[10px] text-faint mt-1.5 leading-relaxed">
        {t('fasting.confidenceLabel')}: {evalResult.confidence} · {t('fasting.sourceLabel')}: {(evalResult.sources || [])[0]} · {t('fasting.reviewedLabel')} {evalResult.lastReviewed}
      </p>
    </div>
  )
}
