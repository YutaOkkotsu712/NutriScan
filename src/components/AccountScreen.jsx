// Membership / account — src/components/AccountScreen.jsx (full replacement)
// Adds a sign-out button here (removed from the app header in the redesign).
import { useState } from 'react'
import { useT } from '../i18n'
import { useAuth, deleteAccount } from '../utils/useAuth'
import { startCheckout, cancelMembership } from '../utils/subscription'
import { isNativeApp } from '../utils/platform'
import PlanPicker from './PlanPicker'
import LegalNote from './LegalNote'

// Membership / account screen: shows the plan status, and lets a free user
// subscribe or a member cancel. Server is the source of truth; this only
// reflects and triggers.
//
// PLAY STORE COMPLIANCE: the native Android app shows membership status but
// no subscribe button (website-only billing). Cancelling and account deletion
// stay available everywhere: deletion is a hard Play requirement.
export default function AccountScreen({ entitlement, onBack, onEntitlementChange }) {
  const { t } = useT()
  const { email, user, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const native = isNativeApp()

  // Tap-to-copy for the uid. Support looks up users by this id.
  function copyUid() {
    navigator.clipboard?.writeText(user.uid)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
      .catch(() => {})
  }

  const subscribed = entitlement?.subscribed
  const until = entitlement?.subscription?.until
  const used = entitlement?.used ?? 0
  const limit = entitlement?.limit ?? 10
  const remaining = entitlement?.remaining ?? Math.max(0, limit - used)
  // Subscribed but cancellation scheduled: keep access until `until`, but offer
  // Renew (not Cancel) and show a "won't renew" status.
  const cancelScheduled = subscribed && entitlement?.willRenew === false

  // Renew === start a fresh subscription checkout (Razorpay can't un-cancel a
  // cancel-at-cycle-end sub; the new one's webhook overwrites the record).
  function subscribe(plan) {
    setBusy(true); setError(''); setNotice('')
    startCheckout({
      plan,
      onActivated: (e) => { setBusy(false); if (e) onEntitlementChange?.(e) },
      onDismiss: () => setBusy(false),
      onError: () => { setBusy(false); setError(t('auth.checkoutFailed')) },
    })
  }

  async function cancel() {
    if (!window.confirm(t('account.cancelConfirm'))) return
    setBusy(true); setError(''); setNotice('')
    try {
      const res = await cancelMembership()
      if (res?.entitlement) onEntitlementChange?.(res.entitlement)
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
        <h2 className="font-display font-bold text-lg text-ink">{t('account.title')}</h2>
      </div>

      {/* Plan card */}
      <div className="bg-gradient-to-br from-brand-hi to-brand-lo rounded-[20px] p-4.5 text-white shadow-lg shadow-brand-lo/25">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-[.14em] text-white/65 uppercase">
            {t('plan.current')}
          </span>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${subscribed ? 'bg-white text-deep' : 'bg-marigold text-spice'}`}>
            {subscribed ? t('account.memberActive') : t('plan.free')}
          </span>
        </div>
        {subscribed ? (
          <>
            <p className="font-display font-extrabold text-[23px] mt-2">{t('auth.subscribed')}</p>
            {until && (
              <p className="text-xs text-white/70 mt-1.5">
                {cancelScheduled
                  ? t('account.accessUntil', { date: String(until).slice(0, 10) })
                  : t('account.memberUntil', { date: String(until).slice(0, 10) })}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="font-display font-extrabold text-[23px] mt-2">
              {t('account.scansUsed', { used, limit })}
            </p>
            <div className="h-1.5 bg-white/20 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-marigold animate-barGrow"
                style={{ width: `${Math.max(0, Math.min(100, (used / limit) * 100))}%` }}
              />
            </div>
            <p className="text-xs text-white/70 mt-2">{t('auth.freeScansLeft', { n: remaining })}</p>
          </>
        )}
      </div>

      {/* Account details */}
      <div className="bg-white border border-line rounded-[18px] px-4 mt-3">
        {email && (
          <div className="py-3 border-b border-hairline">
            <p className="text-[11.5px] text-faint">{t('account.signedInAs')}</p>
            <p className="text-sm font-semibold text-leaf mt-0.5">{email}</p>
          </div>
        )}
        {user?.uid && (
          <div className="py-3 border-b border-hairline">
            <p className="text-[11.5px] text-faint">{t('account.userId')}</p>
            <button
              onClick={copyUid}
              className="text-left font-mono text-[11px] text-moss break-all select-all hover:text-sage transition-colors mt-0.5"
              title={user.uid}
            >
              {user.uid}{copied && <span className="ml-2 font-sans font-semibold text-brand">✓ {t('account.copied')}</span>}
            </button>
          </div>
        )}
        <div className="py-3">
          <p className="text-[11.5px] text-faint">{t('account.status')}</p>
          <p className="text-sm font-semibold text-leaf mt-0.5">
            {cancelScheduled ? t('account.wontRenew') : subscribed ? t('account.memberActive') : t('account.freeTier')}
          </p>
        </div>
      </div>

      {notice && <p className="text-sm text-deep bg-mint rounded-xl px-3.5 py-2.5 mt-3">{notice}</p>}
      {error && <p className="text-sm text-chili-ink bg-blush rounded-xl px-3.5 py-2.5 mt-3">{error}</p>}

      {/* Primary action: active member → Cancel; cancelled or free → pick a
          plan (Renew / Subscribe). The picker hides itself on native per Play
          billing policy. */}
      <div className="mt-3">
        {subscribed && !cancelScheduled ? (
          <button
            onClick={cancel} disabled={busy}
            className="w-full py-3.5 text-sm font-semibold text-chili-ink border border-blush-line rounded-2xl hover:bg-blush disabled:opacity-50 transition-colors"
          >
            {t('account.cancel')}
          </button>
        ) : (
          <div className="space-y-2.5">
            {!native && (
              <p className="text-[12.5px] font-semibold text-fern">
                {cancelScheduled ? t('account.renew') : t('plan.choosePlan')}
              </p>
            )}
            <PlanPicker onPick={subscribe} busy={busy} />
          </div>
        )}
      </div>

      {/* Sign out / delete */}
      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
        <button
          onClick={() => signOut()}
          className="py-3.5 bg-white border border-edge text-fern text-[13.5px] font-semibold rounded-[14px] transition-all active:scale-[.98]"
        >
          {t('auth.signOut')}
        </button>
        <button
          onClick={removeAccount} disabled={busy}
          className="py-3.5 border border-blush-line text-chili-ink text-[13.5px] font-semibold rounded-[14px] hover:bg-blush disabled:opacity-50 transition-colors"
        >
          {t('account.deleteAccount')}
        </button>
      </div>

      <LegalNote className="mt-6" />
    </div>
  )
}
