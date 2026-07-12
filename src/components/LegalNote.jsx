// Legal-safe disclaimer + policy links (spec §15.2, §20 "Disclaimer visible").
// Shown on the result page and the subscription/account screens. Neutral,
// educational-only wording; links to the full Privacy and Terms pages.
import { useT } from '../i18n'

export default function LegalNote({ className = '' }) {
  const { t } = useT()
  return (
    <div className={`text-center ${className}`}>
      <p className="text-[11px] text-faint leading-relaxed max-w-[320px] mx-auto">
        {t('legal.disclaimer')}
      </p>
      <div className="mt-1.5 flex items-center justify-center gap-2.5 text-[11px] text-moss">
        <a href="/privacy.html" className="underline hover:text-fern">{t('legal.privacy')}</a>
        <span className="text-edge">·</span>
        <a href="/terms.html" className="underline hover:text-fern">{t('legal.terms')}</a>
      </div>
    </div>
  )
}
