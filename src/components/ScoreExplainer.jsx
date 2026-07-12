// "Why this score" / top findings — src/components/ScoreExplainer.jsx (full replacement)
import { useMemo } from 'react'
import { generateExplanation } from '../utils/scoreExplainer'
import { useT } from '../i18n'

export default function ScoreExplainer({ result }) {
  const { t, lang, proseReady } = useT()
  const explanation = useMemo(() => generateExplanation(result, lang), [result, lang])

  if (!explanation) return null

  const tone =
    result.overallScore >= 7 ? { card: 'bg-mint border-mint', text: 'text-mint-ink', icon: 'text-deep' }
      : result.overallScore >= 4 ? { card: 'bg-sand border-sand-line', text: 'text-[#7C6A45]', icon: 'text-ochre' }
        : { card: 'bg-blush border-blush-line', text: 'text-chili-ink/90', icon: 'text-chili-ink' }

  return (
    <div className={`rounded-[18px] border p-4 animate-fadeSlideIn ${tone.card}`}
      style={{ animationDelay: '100ms' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <svg className={`w-[17px] h-[17px] shrink-0 ${tone.icon}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.7 17h4.6M10 20h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1.2 2.1h4.6c.2-.9.6-1.6 1.2-2.1A6 6 0 0012 3z" />
        </svg>
        <span className="font-display font-bold text-sm text-ink">{t('results.whyThisScore')}</span>
      </div>
      <p className={`text-[13.5px] leading-relaxed ${tone.text}`}>
        {explanation}
      </p>
      {!proseReady && <p className="text-[10px] text-faint mt-2 italic">{t('common.translationPending')}</p>}
    </div>
  )
}
