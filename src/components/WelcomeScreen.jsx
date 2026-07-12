// Welcome (logged out) — src/components/WelcomeScreen.jsx (full replacement)
import { useT } from '../i18n'
import { setProfile } from '../utils/profile'
import { BrandMark, Wordmark, VegMark } from './ZocoBrand'

// Public marketing landing — the first thing a logged-out visitor sees.
// Sells the product before asking for anything; both CTAs hand off to
// LoginScreen (sign-up vs sign-in mode). No purchase language here: the same
// screen ships inside the Play Store app, where steering to external payment
// is a policy violation — "free scans" is fine, pricing talk is not.

function FeatureIcon({ tint, children }) {
  return (
    <span className={`flex items-center justify-center w-[34px] h-[34px] rounded-full mb-2 ${tint}`}>
      {children}
    </span>
  )
}

export default function WelcomeScreen({ onGetStarted, onSignIn }) {
  const { t, lang } = useT()

  const features = [
    {
      title: t('welcome.f1t'), desc: t('welcome.f1d'),
      icon: (
        <FeatureIcon tint="bg-mint">
          <svg className="w-4 h-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 12h8M8 8h8M8 16h4" /><path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
          </svg>
        </FeatureIcon>
      ),
    },
    {
      title: t('welcome.f2t'), desc: t('welcome.f2d'),
      icon: <FeatureIcon tint="bg-mint"><VegMark size={15} /></FeatureIcon>,
    },
    {
      title: t('welcome.f3t'), desc: t('welcome.f3d'),
      icon: (
        <FeatureIcon tint="bg-sand">
          <svg className="w-4 h-4 text-ochre-lt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21a6 6 0 006-6c0-3-2.5-4.5-6-9-3.5 4.5-6 6-6 9a6 6 0 006 6z" />
          </svg>
        </FeatureIcon>
      ),
    },
    {
      title: t('welcome.f4t'), desc: t('welcome.f4d'),
      icon: (
        <FeatureIcon tint="bg-sand">
          <svg className="w-4 h-4 text-ochre-lt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </FeatureIcon>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Top bar */}
      <header className="max-w-lg mx-auto w-full px-5 pt-5 flex items-center gap-2.5">
        <BrandMark size={34} />
        <Wordmark />
        <button
          onClick={() => setProfile({ language: lang === 'en' ? 'hi' : 'en' })}
          className="ml-auto px-2.5 py-1.5 text-xs font-bold text-fern bg-white border border-edge rounded-full transition-colors"
          aria-label="Switch language"
        >
          {lang === 'en' ? 'हिं' : 'EN'}
        </button>
      </header>

      {/* Hero */}
      <main className="max-w-lg mx-auto w-full px-6 flex-1 flex flex-col justify-center py-8">
        <div className="text-center mb-7">
          <h1 className="font-display font-extrabold text-[32px] leading-[1.08] tracking-tight text-ink animate-fadeSlideIn">
            {t('welcome.headline')}
          </h1>
          <p className="text-[14.5px] text-moss leading-relaxed max-w-[300px] mx-auto mt-3">
            {t('welcome.sub')}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2.5 mb-8">
          <button
            onClick={onGetStarted}
            className="w-full max-w-xs py-4 px-6 bg-gradient-to-br from-brand-hi to-brand-lo active:scale-[.98] text-white font-display text-[17px] font-bold rounded-2xl shadow-lg shadow-brand-lo/30 transition-all"
          >
            {t('welcome.cta')}
          </button>
          <p className="text-xs text-faint">{t('welcome.freeNote')}</p>
          <button onClick={onSignIn} className="text-[13.5px] text-brand font-semibold mt-0.5">
            {t('welcome.signIn')}
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {features.map((f) => (
            <div key={f.title} className="bg-white border border-line rounded-2xl p-3.5">
              {f.icon}
              <h3 className="text-[13px] font-bold text-leaf mb-1">{f.title}</h3>
              <p className="text-[11.5px] text-moss leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto w-full px-6 pb-8 text-center">
        <p className="text-[11px] text-faint leading-relaxed mb-1.5">{t('auth.trust')}</p>
        <a href="/privacy.html" className="text-[11px] text-faint underline hover:text-moss">
          {t('welcome.privacy')}
        </a>
      </footer>
    </div>
  )
}
