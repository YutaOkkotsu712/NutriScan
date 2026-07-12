// Sign in / sign up — src/components/LoginScreen.jsx (full replacement)
import { useState } from 'react'
import { useAuth } from '../utils/useAuth'
import { useT } from '../i18n'
import { isNativeApp } from '../utils/platform'
import { BrandMark } from './ZocoBrand'

// Consumer login gate (ZOCO). Google one-tap + email/password fallback.
// Native app: the Google button is hidden — signInWithPopup cannot open a
// popup inside the Capacitor WebView.
export default function LoginScreen({ initialMode = 'signin', onBack }) {
  const { t } = useT()
  const native = isNativeApp()
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const [mode, setMode] = useState(initialMode) // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Map Firebase error codes to friendly, translated copy.
  function friendly(code) {
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return t('auth.errInvalid')
    if (code === 'auth/email-already-in-use') return t('auth.errExists')
    if (code === 'auth/weak-password') return t('auth.errWeak')
    return t('auth.errGeneric')
  }

  async function run(fn) {
    setBusy(true); setError('')
    try {
      await fn()
    } catch (err) {
      setError(friendly(err?.code))
    } finally {
      setBusy(false)
    }
  }

  const submitEmail = (e) => {
    e.preventDefault()
    run(() => (mode === 'signin' ? signInWithEmail(email, password) : signUpWithEmail(email, password)))
  }

  const fieldCls = 'w-full px-4 py-3.5 bg-white border border-edge rounded-[14px] text-[14px] text-leaf placeholder:text-faint focus:border-brand focus:outline-none'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-7 bg-cream">
      <div className="w-full max-w-sm">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-moss font-semibold mb-5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            {t('account.back')}
          </button>
        )}
        <div className="text-center mb-7">
          <div className="flex justify-center mb-3.5"><BrandMark size={46} /></div>
          <h1 className="font-display font-extrabold text-2xl tracking-tight text-ink">{t('auth.welcome')}</h1>
          <p className="text-[13.5px] text-moss mt-2 leading-relaxed">{t('auth.subtitle')}</p>
        </div>

        {!native && (
          <>
            <button
              onClick={() => run(signInWithGoogle)}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-white border border-edge rounded-[14px] text-[14px] font-semibold text-fern disabled:opacity-50 transition-all active:scale-[.98]"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z"/></svg>
              {t('auth.google')}
            </button>

            <div className="flex items-center gap-3 my-4.5">
              <div className="h-px bg-edge flex-1" />
              <span className="text-[11px] font-semibold tracking-widest text-faint uppercase">{t('auth.or')}</span>
              <div className="h-px bg-edge flex-1" />
            </div>
          </>
        )}

        <form onSubmit={submitEmail} className="space-y-2.5">
          <input
            type="email" inputMode="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.email')}
            className={fieldCls}
          />
          <input
            type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.password')}
            className={fieldCls}
          />
          {error && <p className="text-sm text-chili-ink">{error}</p>}
          <button
            type="submit" disabled={busy}
            className="w-full py-3.5 bg-gradient-to-br from-brand-hi to-brand-lo text-white font-display font-bold text-base rounded-[14px] shadow-lg shadow-brand-lo/25 disabled:opacity-50 transition-all active:scale-[.98] mt-0.5"
          >
            {busy ? t('auth.working') : mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}
          className="w-full text-[13px] text-brand font-semibold mt-4"
        >
          {mode === 'signin' ? t('auth.noAccount') : t('auth.haveAccount')}
        </button>

        <p className="text-[11px] text-faint text-center mt-7 leading-relaxed">{t('auth.trust')}</p>
      </div>
    </div>
  )
}
