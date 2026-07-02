import { useState } from 'react'
import { useT } from '../i18n'
import CorrectionSheet from './CorrectionSheet'

// Data confidence & source card (spec §4). Shows where the data came from,
// when it was last updated, FSSAI licence field (licensing status, NOT a health
// approval — §20), and a report/correct action that opens the in-app
// correction form (which posts to /api/corrections for admin review).
export default function DataConfidenceCard({ result }) {
  const { t } = useT()
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const dc = result.dataConfidence
  if (!dc) return null

  // Confidence heuristic from OFF completeness.
  let level = t('data.medium'), tone = 'amber'
  if (typeof dc.completeness === 'number') {
    if (dc.completeness >= 75) { level = t('data.high'); tone = 'green' }
    else if (dc.completeness < 40) { level = t('data.low'); tone = 'red' }
  }

  const toneStyle = {
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
  }[tone]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-fadeSlideIn" style={{ animationDelay: '450ms' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <span className="font-semibold text-gray-800">{t('data.title')}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${toneStyle}`}>
          {level}
        </span>
      </div>

      {dc.corrected && (
        <div className="mb-3 flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span className="text-sm">✅</span>
          <p className="text-xs text-green-800 leading-relaxed">
            {t('data.correctedBanner')}
            {dc.corrected.updatedAt && (
              <span className="block text-[10px] text-green-600">
                {t('data.correctedOn')} {dc.corrected.updatedAt.slice(0, 10)} · v{dc.corrected.version}
              </span>
            )}
          </p>
        </div>
      )}

      <dl className="space-y-2 text-sm">
        <Row label={t('data.source')} value={dc.sourceName} />
        {dc.lastUpdated && <Row label={t('data.lastUpdated')} value={dc.lastUpdated} />}
        {typeof dc.completeness === 'number' && <Row label={t('data.completeness')} value={`${dc.completeness}%`} />}
        <Row
          label={t('data.fssai')}
          value={dc.fssai
            ? dc.fssai
            : t('data.notFound')}
          hint={dc.fssai ? t('data.fssaiHint') : null}
        />
      </dl>

      <button
        onClick={() => setCorrectionOpen(true)}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        {t('data.reportCorrect')}
      </button>
      <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
        Data is community-contributed via Open Food Facts and may be incomplete. Corrections update the shared database.
      </p>

      <CorrectionSheet open={correctionOpen} onClose={() => setCorrectionOpen(false)} result={result} />
    </div>
  )
}

function Row({ label, value, hint }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-800 text-right">
        {value}
        {hint && <span className="block text-[10px] text-gray-400 font-normal">{hint}</span>}
      </dd>
    </div>
  )
}
