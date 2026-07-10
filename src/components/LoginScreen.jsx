import { useState } from 'react'
import { useAuth } from '../utils/useAuth'
import { useT } from '../i18n'
import { isNativeApp } from '../utils/platform'

// Consumer login gate (ZOCO). Google one-tap + email/password fallback.
// Shown whenever auth is enabled and no user is signed in; on success the
// useAuth store updates and App renders the app.
//
// Native app: the Google button is hidden — signInWithPopup cannot open a
// popup inside the Capacitor WebView. Email/password works everywhere; native
// Google sign-in needs @capacitor-firebase/authentication (follow-up).
export default function LoginScreen() {
  const { t } = useT()
  const native = isNativeApp()
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🔬</div>
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.welcome')}</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">{t('auth.subtitle')}</p>
        </div>

        {!native && (
          <>
            <button
              onClick={() => run(signInWithGoogle)}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z"/></svg>
              {t('auth.google')}
            </button>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs text-gray-400 uppercase">{t('auth.or')}</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
          </>
        )}

        <form onSubmit={submitEmail} className="space-y-3">
          <input
            type="email" inputMode="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.email')}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
          />
          <input
            type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.password')}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit" disabled={busy}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl disabled:opacity-50 transition-colors"
          >
            {busy ? t('auth.working') : mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}
          className="w-full text-sm text-green-600 hover:text-green-700 font-medium mt-4"
        >
          {mode === 'signin' ? t('auth.noAccount') : t('auth.haveAccount')}
        </button>

        <p className="text-[11px] text-gray-400 text-center mt-8 leading-relaxed">{t('auth.trust')}</p>
      </div>
    </div>
  )
}
