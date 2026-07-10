import { useT } from '../i18n'
import { isNativeApp } from '../utils/platform'

// Shown when a free user hits the scan limit (server returned 402). The server
// is the source of truth — this screen never controls access.
//
// PLAY STORE COMPLIANCE: in the native Android app there is NO subscribe
// button and NO link to purchase (Google Play forbids in-app purchase of
// digital subscriptions outside Play Billing, and "steering" users to an
// external purchase page is also disallowed). Members who subscribed on the
// web get unlimited scans here automatically via the same account.
export default function PaywallScreen({ entitlement, onSubscribe, onHome, onSignOut }) {
  const { t } = useT()
  const limit = entitlement?.limit ?? 100
  const native = isNativeApp()
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
        <span className="text-3xl">✨</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{t('auth.paywallTitle')}</h2>
      <p className="text-sm text-gray-600 mb-6 max-w-xs leading-relaxed">
        {t('auth.paywallBody', { limit })}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {native ? (
          <p className="text-sm text-gray-500 leading-relaxed">{t('auth.webOnlyPurchase')}</p>
        ) : (
          <button
            onClick={onSubscribe}
            className="py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
          >
            {t('auth.subscribeCta')}
          </button>
        )}
        <button
          onClick={onHome}
          className="py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
        >
          {t('auth.backHome')}
        </button>
        <button
          onClick={onSignOut}
          className="py-2 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
        >
          {t('auth.signOut')}
        </button>
      </div>

      <p className="text-[11px] text-gray-400 mt-8 leading-relaxed max-w-xs">{t('auth.trust')}</p>
    </div>
  )
}
