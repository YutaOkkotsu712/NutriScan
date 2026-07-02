import { useMemo, useState } from 'react'
import { evaluateFasting } from '../utils/fastingEngine'
import { FASTING_PROFILE_ORDER, FASTING_PROFILES, FASTING_STATUS, FASTING_META } from '../data/fastingProfiles'
import { useProfile } from '../utils/profile'
import { useT } from '../i18n'

const STATUS_STYLE = {
  [FASTING_STATUS.SUITABLE]: { badge: 'bg-green-600 text-white', label: 'Suitable', dot: 'bg-green-500' },
  [FASTING_STATUS.NOT_SUITABLE]: { badge: 'bg-red-600 text-white', label: 'Not suitable', dot: 'bg-red-500' },
  [FASTING_STATUS.DEPENDS]: { badge: 'bg-amber-500 text-white', label: 'Depends on family', dot: 'bg-amber-500' },
  [FASTING_STATUS.UNKNOWN]: { badge: 'bg-gray-500 text-white', label: 'Needs label check', dot: 'bg-gray-400' },
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
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-fadeSlideIn" style={{ animationDelay: '400ms' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🕉️</span>
        <span className="font-semibold text-gray-800">{t('fasting.title')}</span>
      </div>

      {/* Profile selector */}
      <select
        value={profileKey}
        onChange={(e) => setProfileKey(e.target.value)}
        className="w-full my-2 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {FASTING_PROFILE_ORDER.map(k => (
          <option key={k} value={k}>{FASTING_PROFILES[k].label}</option>
        ))}
        {(profile.customFasting.restrict.length > 0 || profile.customFasting.allow.length > 0) && (
          <option value="custom">{t('fasting.customOption')}</option>
        )}
      </select>

      {/* Status badge */}
      <div className="flex items-center gap-2 mt-2">
        <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-2.5 py-1 rounded-full ${style.badge}`}>
          {t(`fasting.${style.label}`)}
        </span>
      </div>

      <p className="text-sm text-gray-700 mt-2 leading-snug">{tProse(evalResult.reason)}</p>
      {!proseReady && <p className="text-[10px] text-gray-400 italic mt-1">{t('common.translationPending')}</p>}

      {/* Expandable explanation */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-green-600 hover:text-green-700 font-medium mt-2 flex items-center gap-1"
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
              <span className="font-semibold text-red-700">{t('fasting.conflicting')} </span>
              <span className="text-gray-700">{evalResult.restrictedHits.join(', ')}</span>
            </div>
          )}
          {evalResult.dependsHits.length > 0 && (
            <div className="text-xs">
              <span className="font-semibold text-amber-700">{t('fasting.dependsOnPractice')} </span>
              <span className="text-gray-700">{evalResult.dependsHits.join(', ')}</span>
            </div>
          )}
          {evalResult.note && (
            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-2.5">{evalResult.note}</p>
          )}
        </div>
      )}

      <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 mt-3 leading-relaxed">
        ⚠️ {FASTING_META.globalCaveat}
      </p>
      <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
        Confidence: {evalResult.confidence} · Source: {(evalResult.sources || [])[0]} · Reviewed {evalResult.lastReviewed}
      </p>
    </div>
  )
}
