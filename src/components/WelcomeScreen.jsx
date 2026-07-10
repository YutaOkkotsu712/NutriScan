import { useT } from '../i18n'
import { setProfile } from '../utils/profile'

// Public marketing landing — the first thing a logged-out visitor sees.
// Sells the product before asking for anything; both CTAs hand off to
// LoginScreen (sign-up vs sign-in mode). No purchase language here: the same
// screen ships inside the Play Store app, where steering to external payment
// is a policy violation — "free scans" is fine, pricing talk is not.
export default function WelcomeScreen({ onGetStarted, onSignIn }) {
  const { t, lang } = useT()

  const features = [
    { icon: '🧪', title: t('welcome.f1t'), desc: t('welcome.f1d') },
    { icon: '🥗', title: t('welcome.f2t'), desc: t('welcome.f2d') },
    { icon: '🪔', title: t('welcome.f3t'), desc: t('welcome.f3d') },
    { icon: '🔄', title: t('welcome.f4t'), desc: t('welcome.f4d') },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-white flex flex-col">
      {/* Top bar */}
      <header className="max-w-lg mx-auto w-full px-6 pt-5 flex items-center">
        <span className="text-2xl mr-2">🔬</span>
        <span className="text-lg font-bold text-gray-900">{t('common.appName')}</span>
        <button
          onClick={() => setProfile({ language: lang === 'en' ? 'hi' : 'en' })}
          className="ml-auto px-3 py-1.5 text-sm font-semibold text-green-700 bg-green-100 hover:bg-green-200 rounded-full transition-colors"
          aria-label="Switch language"
        >
          {lang === 'en' ? 'हिं' : 'EN'}
        </button>
      </header>

      {/* Hero */}
      <main className="max-w-lg mx-auto w-full px-6 flex-1 flex flex-col justify-center py-10">
        <div className="text-center mb-10">
          <div className="text-6xl mb-5 animate-fadeSlideIn">🔬</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            {t('welcome.headline')}
          </h1>
          <p className="text-base text-gray-600 leading-relaxed max-w-md mx-auto">
            {t('welcome.sub')}
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 mb-12">
          <button
            onClick={onGetStarted}
            className="w-full max-w-xs py-4 px-6 bg-green-600 hover:bg-green-700 active:scale-[.98] text-white text-lg font-bold rounded-2xl shadow-lg shadow-green-600/25 transition-all"
          >
            {t('welcome.cta')}
          </button>
          <p className="text-xs text-gray-400">{t('welcome.freeNote')}</p>
          <button
            onClick={onSignIn}
            className="text-sm text-green-700 hover:text-green-800 font-medium mt-1"
          >
            {t('welcome.signIn')}
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((f) => (
            <div key={f.title} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto w-full px-6 pb-8 text-center">
        <p className="text-[11px] text-gray-400 leading-relaxed mb-2">{t('auth.trust')}</p>
        <a href="/privacy.html" className="text-[11px] text-gray-400 underline hover:text-gray-600">
          {t('welcome.privacy')}
        </a>
      </footer>
    </div>
  )
}
