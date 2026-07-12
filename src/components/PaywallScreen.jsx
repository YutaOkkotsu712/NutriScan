// Paywall — src/components/PaywallScreen.jsx (full replacement)
import { useT } from '../i18n'
import { isNativeApp } from '../utils/platform'

// Shown when a free user hits the scan limit (server returned 402). The server
// is the source of truth — this screen never controls access.
//
// PLAY STORE COMPLIANCE: in the native Android app there is NO subscribe
// button and NO link to purchase. Members who subscribed on the web get
// unlimited scans here automatically via the same account.
export default function PaywallScreen({ entitlement, onSubscribe, onHome, onSignOut }) {
  const { t } = useT()
  const limit = entitlement?.limit ?? 100
  const native = isNativeApp()
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-7 text-center bg-cream">
      {/* Full ring — all scans used */}
      <div className="relative w-[76px] h-[76px] mb-5 animate-scaleIn">
        <svg width="76" height="76" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r="34" fill="none" stroke="var(--color-hairline)" strokeWidth="7" />
          <circle cx="38" cy="38" r="34" fill="none" stroke="var(--color-marigold)" strokeWidth="7" strokeLinecap="round" transform="rotate(-90 38 38)" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-extrabold text-[21px] text-ochre leading-none">{limit}</span>
          <span className="text-[9.5px] font-semibold text-faint mt-0.5">/ {limit}</span>
        </div>
      </div>

      <h2 className="font-display font-extrabold text-2xl leading-tight tracking-tight text-ink mb-2.5">
        {t('auth.paywallTitle')}
      </h2>
      <p className="text-[13.5px] text-moss mb-6 max-w-[270px] leading-relaxed">
        {t('auth.paywallBody', { limit })}
      </p>

      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        {native ? (
          <p className="text-sm text-moss leading-relaxed">{t('auth.webOnlyPurchase')}</p>
        ) : (
          <button
            onClick={onSubscribe}
            className="py-4 px-6 bg-gradient-to-br from-brand-hi to-brand-lo text-white font-display font-bold text-base rounded-2xl shadow-lg shadow-brand-lo/30 transition-all active:scale-[.98]"
          >
            {t('auth.subscribeCta')}
          </button>
        )}
        <button
          onClick={onHome}
          className="py-3.5 px-6 bg-white border border-edge text-fern text-sm font-semibold rounded-2xl transition-all active:scale-[.98]"
        >
          {t('auth.backHome')}
        </button>
        <button
          onClick={onSignOut}
          className="py-1.5 text-[13px] text-faint hover:text-moss font-semibold transition-colors"
        >
          {t('auth.signOut')}
        </button>
      </div>

      <p className="text-[11px] text-faint mt-6 leading-relaxed max-w-[260px]">{t('auth.trust')}</p>
    </div>
  )
}
