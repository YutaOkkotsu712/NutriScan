// Help & About (spec §6.1/§6.2 "Help"). Explains how ZOCO works, what the
// readouts mean, and the independence/no-sponsorship promise. Static content;
// readout meanings reuse the verdict.* strings so they never drift.
import { useT } from '../i18n'
import LegalNote from './LegalNote'

const READOUTS = [
  { label: 'LooksClear', dot: 'bg-brand' },
  { label: 'ReviewBeforeBuying', dot: 'bg-marigold' },
  { label: 'LimitFrequentUse', dot: 'bg-chili' },
  { label: 'NotEnough', dot: 'bg-sage' },
]

export default function HelpScreen({ onBack }) {
  const { t } = useT()
  return (
    <div className="max-w-lg md:max-w-2xl mx-auto px-5 py-5 md:py-10 pb-28 md:pb-10">
      {/* Title row */}
      <div className="flex items-center gap-2.5 mb-4">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-white border border-edge"
          aria-label={t('account.back')}
        >
          <svg className="w-[17px] h-[17px] text-fern" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-display font-bold text-lg text-ink">{t('help.title')}</h2>
      </div>

      {/* How it works */}
      <div className="bg-white border border-line rounded-[18px] p-4">
        <h3 className="font-display font-bold text-[15px] text-ink mb-2.5">{t('help.how')}</h3>
        <ol className="space-y-2.5">
          {[1, 2, 3].map((n) => (
            <li key={n} className="flex gap-2.5 items-start text-[13.5px] text-fern leading-relaxed">
              <span className="shrink-0 w-5 h-5 rounded-full bg-mint text-deep text-[11px] font-bold flex items-center justify-center mt-0.5">{n}</span>
              {t(`help.how${n}`)}
            </li>
          ))}
        </ol>
      </div>

      {/* What the readouts mean */}
      <div className="bg-white border border-line rounded-[18px] p-4 mt-3">
        <h3 className="font-display font-bold text-[15px] text-ink mb-2.5">{t('help.readouts')}</h3>
        <div className="space-y-2.5">
          {READOUTS.map((r) => (
            <div key={r.label} className="flex gap-2.5 items-start">
              <span className={`shrink-0 w-2.5 h-2.5 rounded-full mt-1.5 ${r.dot}`} />
              <div>
                <p className="text-sm font-semibold text-leaf">{t(`verdict.${r.label}`)}</p>
                <p className="text-xs text-moss leading-relaxed">{t(`verdict.${r.label}Desc`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Independence */}
      <div className="bg-mint/50 border border-mint rounded-[18px] p-4 mt-3">
        <h3 className="font-display font-bold text-[15px] text-deep mb-1">{t('help.trustTitle')}</h3>
        <p className="text-[13px] text-mint-ink leading-relaxed">{t('help.trustBody')}</p>
      </div>

      <LegalNote className="mt-6" />
    </div>
  )
}
