import { useState } from 'react'
import { useT } from '../i18n'
import { useAuth, deleteAccount } from '../utils/useAuth'
import { startCheckout, cancelMembership } from '../utils/subscription'
import { isNativeApp } from '../utils/platform'

// Membership / account screen: shows the plan status, and lets a free user
// subscribe or a member cancel. Server is the source of truth; this only
// reflects and triggers.
//
// PLAY STORE COMPLIANCE: the native Android app shows membership status but
// no subscribe button (website-only billing — see PaywallScreen). Cancelling
// and account deletion stay available everywhere: deletion is a hard Play
// requirement for apps with account creation.
export default function AccountScreen({ entitlement, onBack, onEntitlementChange }) {
  const { t } = useT()
  const { email, user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const native = isNativeApp()

  // Tap-to-copy for the uid. The admin Membership tab comps/looks up users by
  // this id — support asks the user to read it from here. Clipboard API can be
  // unavailable (old WebViews); the id stays selectable text either way.
  function copyUid() {
    navigator.clipboard?.writeText(user.uid)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
      .catch(() => {})
  }

  const subscribed = entitlement?.subscribed
  const until = entitlement?.subscription?.until

  function subscribe() {
    setBusy(true); setError(''); setNotice('')
    startCheckout({
      onActivated: (e) => { setBusy(false); if (e) onEntitlementChange?.(e) },
      onDismiss: () => setBusy(false),
      onError: () => { setBusy(false); setError(t('auth.checkoutFailed')) },
    })
  }

  async function cancel() {
    if (!window.confirm(t('account.cancelConfirm'))) return
    setBusy(true); setError(''); setNotice('')
    try {
      await cancelMembership()
      setNotice(t('account.cancelDone'))
    } catch {
      setError(t('account.cancelFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function removeAccount() {
    if (!window.confirm(t('account.deleteConfirm'))) return
    setBusy(true); setError(''); setNotice('')
    try {
      await deleteAccount() // on success Firebase signs the user out → login screen
    } catch (err) {
      setError(err?.code === 'auth/requires-recent-login' ? t('account.deleteReauth') : t('account.deleteFailed'))
      setBusy(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('account.title')}</h2>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        {email && (
          <div>
            <p className="text-xs text-gray-500">{t('account.signedInAs')}</p>
            <p className="text-sm font-medium text-gray-800">{email}</p>
          </div>
        )}

        {user?.uid && (
          <div>
            <p className="text-xs text-gray-500">{t('account.userId')}</p>
            <button
              onClick={copyUid}
              className="text-left font-mono text-[11px] text-gray-500 break-all select-all hover:text-gray-700 transition-colors"
              title={user.uid}
            >
              {user.uid}{copied && <span className="ml-2 font-sans text-green-600">✓ {t('account.copied')}</span>}
            </button>
          </div>
        )}

        <div>
          <p className="text-xs text-gray-500">{t('account.status')}</p>
          {subscribed ? (
            <>
              <p className="text-sm font-semibold text-green-700">{t('account.memberActive')}</p>
              {until && <p className="text-xs text-gray-500 mt-0.5">{t('account.memberUntil', { date: String(until).slice(0, 10) })}</p>}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-800">{t('account.freeTier')}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('account.scansUsed', { used: entitlement?.used ?? 0, limit: entitlement?.limit ?? 100 })}
              </p>
            </>
          )}
        </div>

        {notice && <p className="text-sm text-green-700">{notice}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {subscribed ? (
          <button
            onClick={cancel} disabled={busy}
            className="w-full py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {t('account.cancel')}
          </button>
        ) : native ? (
          <p className="text-sm text-gray-500 leading-relaxed">{t('auth.webOnlyPurchase')}</p>
        ) : (
          <button
            onClick={subscribe} disabled={busy}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl disabled:opacity-50 transition-colors"
          >
            {busy ? t('auth.activating') : t('account.subscribe')}
          </button>
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-gray-100">
        <button
          onClick={removeAccount} disabled={busy}
          className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50 transition-colors"
        >
          {t('account.deleteAccount')}
        </button>
      </div>

      <button onClick={onBack} className="mt-6 text-sm text-gray-500 hover:text-gray-700 font-medium">
        ← {t('account.back')}
      </button>
    </div>
  )
}
