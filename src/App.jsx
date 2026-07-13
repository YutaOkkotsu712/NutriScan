// App shell — src/App.jsx (full replacement)
// All logic (lookup flow, entitlement, auth gating, compare) is unchanged from
// the original; only the shell is restyled: brand header, desktop top-nav,
// mobile bottom-nav, token colors. Sign-out moved from the header into
// AccountScreen.
import { useState, useCallback, useEffect } from 'react'
import LandingScreen from './components/LandingScreen'
import BarcodeScanner from './components/BarcodeScanner'
import SearchScreen from './components/SearchScreen'
import LoadingScreen from './components/LoadingScreen'
import ResultsScreen from './components/ResultsScreen'
import CompareScreen from './components/CompareScreen'
import ProfileSheet from './components/ProfileSheet'
import OfflineBanner from './components/OfflineBanner'
import LoginScreen from './components/LoginScreen'
import WelcomeScreen from './components/WelcomeScreen'
import PaywallScreen from './components/PaywallScreen'
import AccountScreen from './components/AccountScreen'
import BottomNav from './components/BottomNav'
import { BrandMark, Wordmark, BarcodeIcon } from './components/ZocoBrand'
import { useProfile, setProfile } from './utils/profile'
import { useAuth, authHeader } from './utils/useAuth'
import { startCheckout } from './utils/subscription'
import { apiUrl } from './utils/apiBase'
import { extractBarcode } from './utils/barcodeExtract'
import { useT } from './i18n'
import { track } from './utils/analytics'

const STALE_ASSET_RELOAD_KEY = 'zoco:stale-asset-reload-at'

function isStaleAssetImportError(err) {
  const text = `${err?.message || ''} ${err?.stack || ''}`
  return /dynamically imported module|module script|MIME type|text\/html|failed to fetch/i.test(text)
    && /import|module|assets\/|barcodeEngine/i.test(text)
}

async function reloadFreshAppBundle() {
  if (typeof window === 'undefined') return false
  try {
    const last = Number(window.sessionStorage.getItem(STALE_ASSET_RELOAD_KEY) || 0)
    if (last && Date.now() - last < 60000) return false
    window.sessionStorage.setItem(STALE_ASSET_RELOAD_KEY, String(Date.now()))
  } catch {
    return false
  }

  try {
    if ('caches' in window) {
      const keys = await window.caches.keys()
      await Promise.all(keys.filter((key) => key.startsWith('nutriscan-')).map((key) => window.caches.delete(key)))
    }
  } catch { /* best-effort cache cleanup */ }

  try {
    const registration = await navigator.serviceWorker?.getRegistration?.()
    await registration?.update?.()
  } catch { /* reload is still the important part */ }

  window.location.reload()
  return true
}

// Full-screen notice shells (not-found / error / compare-pick)
function NoticeShell({ tone, icon, children }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${tone}`}>
        {icon}
      </div>
      {children}
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [loadingStatus, setLoadingStatus] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  // Compare state
  const [compareA, setCompareA] = useState(null)
  const [comparePending, setComparePending] = useState(false)
  // Profile sheet
  const [profileOpen, setProfileOpen] = useState(false)
  const profile = useProfile()
  const { user, ready: authReady, authEnabled, signOut } = useAuth()
  const [entitlement, setEntitlement] = useState(null)
  // Logged-out flow: marketing landing first, then the login form.
  const [authScreen, setAuthScreen] = useState(null)
  const { t, lang } = useT()

  // Load the membership status once signed in (drives the "N scans left" badge).
  useEffect(() => {
    if (!authEnabled || !user) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(apiUrl('/api/me/entitlement'), { headers: await authHeader() })
        if (res.ok && !cancelled) setEntitlement((await res.json()).entitlement)
      } catch { /* badge just stays hidden */ }
    })()
    return () => { cancelled = true }
  }, [authEnabled, user])

  // --- Barcode / product lookup ---
  const lookupProduct = useCallback(async (rawBarcode) => {
    const barcode = extractBarcode(rawBarcode)
    if (!barcode) {
      setError(t('errors.notABarcode', { code: String(rawBarcode).slice(0, 40) }))
      setScreen('not-found')
      return
    }

    setScreen('loading')
    setLoadingStatus('Looking up product...')

    try {
      const { lookupBarcode } = await import('./utils/barcodeEngine')
      const analysisResult = await lookupBarcode(barcode, setLoadingStatus, {
        endpoint: apiUrl('/api/scan'),
        headers: await authHeader(),
      })

      if (analysisResult?.limitReached) {
        if (analysisResult.entitlement) setEntitlement(analysisResult.entitlement)
        setScreen('paywall')
        return
      }
      if (analysisResult?.unauthenticated) {
        setAuthScreen('signin')
        await signOut().catch(() => {})
        return
      }

      if (!analysisResult) {
        setError(t('errors.notFound', { barcode }))
        setScreen('not-found')
        return
      }

      if (analysisResult.entitlement) setEntitlement(analysisResult.entitlement)

      if (comparePending && compareA) {
        setComparePending(false)
        setResult(analysisResult)
        setScreen('compare')
        return
      }

      setResult(analysisResult)
      setScreen('results')
    } catch (err) {
      if (isStaleAssetImportError(err)) {
        console.warn('[NutriScan] Stale app asset detected; reloading fresh bundle:', err)
        setLoadingStatus('Updating app...')
        if (await reloadFreshAppBundle()) return
        setError('The app updated while scanning. Please refresh and try again.')
        setScreen('error')
        return
      }
      console.error('[NutriScan] Barcode lookup failed:', err)
      setError(navigator.onLine === false ? t('errors.offline') : t('errors.dbNotResponding'))
      setScreen('error')
    }
  }, [comparePending, compareA, signOut, t])

  // --- Subscribe (Razorpay checkout) — plan is 'monthly' | 'quarterly' | 'yearly' ---
  const handleSubscribe = useCallback((plan) => {
    startCheckout({
      plan,
      onActivated: (ent) => { if (ent) setEntitlement(ent); setScreen('landing') },
      onError: () => { setError(t('auth.checkoutFailed')); setScreen('error') },
    })
  }, [t])

  const handleScanBarcode = useCallback(() => { setScreen('barcode') }, [])
  const handleBarcodeScanned = useCallback((barcode) => { lookupProduct(barcode) }, [lookupProduct])
  const handleSearch = useCallback(() => { setScreen('search') }, [])
  const handleSearchSelect = useCallback((barcode) => { lookupProduct(barcode) }, [lookupProduct])

  const handleCompare = useCallback((productResult) => {
    setCompareA(productResult)
    setComparePending(true)
    setScreen('compare-pick')
  }, [])

  const handleReset = useCallback(() => {
    setScreen('landing')
    setResult(null)
    setError('')
    setCompareA(null)
    setComparePending(false)
  }, [])

  const handleSelectProduct = useCallback((barcode) => {
    setComparePending(false)
    setCompareA(null)
    lookupProduct(barcode)
  }, [lookupProduct])

  // --- Membership gate (ZOCO) ---
  if (!authEnabled) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6 text-center">
        <p className="text-sm text-moss max-w-sm">
          ZOCO is not configured — the Firebase environment variables
          (VITE_FIREBASE_*) are missing from this build. See .env.example.
        </p>
      </div>
    )
  }
  if (!authReady) {
    return <div className="min-h-screen bg-cream" />
  }
  if (!user) {
    if (!authScreen) {
      return (
        <WelcomeScreen
          onGetStarted={() => setAuthScreen('signup')}
          onSignIn={() => setAuthScreen('signin')}
        />
      )
    }
    return <LoginScreen initialMode={authScreen} onBack={() => setAuthScreen(null)} />
  }

  // Which bottom-nav item is active
  const navActive = screen === 'search' ? 'search' : screen === 'account' ? 'plan' : profileOpen ? 'profile' : 'scan'
  const desktopNav = [
    { key: 'scan', label: t('nav.scan'), go: handleReset, active: !['search', 'account'].includes(screen) },
    { key: 'search', label: t('nav.search'), go: handleSearch, active: screen === 'search' },
    { key: 'plan', label: t('nav.membership'), go: () => setScreen('account'), active: screen === 'account' },
  ]

  return (
    <div className="min-h-screen bg-cream font-sans">
      <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur-sm border-b border-line">
        <div className="max-w-lg md:max-w-5xl mx-auto px-5 py-2.5 flex items-center gap-2.5">
          <button onClick={handleReset} className="flex items-center gap-2.5" aria-label={t('common.home')}>
            <BrandMark size={34} />
            <Wordmark />
          </button>

          {/* Desktop top-nav */}
          <nav className="hidden md:flex items-center gap-7 ml-9">
            {desktopNav.map((item) => (
              <button
                key={item.key}
                onClick={item.go}
                className={`text-sm pb-0.5 border-b-2 transition-colors ${
                  item.active ? 'font-bold text-deep border-brand' : 'font-semibold text-moss border-transparent hover:text-fern'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Membership badge — tap to open the account screen */}
            {authEnabled && user && entitlement && (
              <button
                onClick={() => setScreen('account')}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full transition-colors ${
                  entitlement.subscribed
                    ? 'bg-gradient-to-br from-brand-hi to-brand-lo text-white'
                    : entitlement.remaining <= 10
                      ? 'bg-sand text-ochre'
                      : 'bg-mint text-deep'
                }`}
              >
                {entitlement.subscribed
                  ? t('auth.subscribed')
                  : t('auth.freeScansLeft', { n: entitlement.remaining })}
              </button>
            )}
            {/* Quick language toggle */}
            <button
              onClick={() => { const next = lang === 'en' ? 'hi' : 'en'; setProfile({ language: next }); track('language_change', { lang: next }) }}
              className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white border border-edge text-fern transition-colors"
              aria-label="Switch language"
            >
              {lang === 'en' ? 'हिं' : 'EN'}
            </button>
            {/* Profile button */}
            <button
              onClick={() => setProfileOpen(true)}
              className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white border border-edge transition-colors"
              aria-label="My family profile"
            >
              <svg className="w-[17px] h-[17px] text-fern" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {profile.configured && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand border-2 border-white" />
              )}
            </button>
          </div>
        </div>
      </header>

      <OfflineBanner />

      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />

      {screen === 'landing' && (
        <div className="animate-fadeIn"><LandingScreen
          onScanBarcode={handleScanBarcode}
          onBarcodeDetected={handleBarcodeScanned}
          onSearch={handleSearch}
          entitlement={entitlement}
          onOpenAccount={() => setScreen('account')}
        /></div>
      )}

      {screen === 'barcode' && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onCancel={handleReset}
          onManualEntry={() => setScreen('search')}
        />
      )}

      {screen === 'search' && (
        <SearchScreen
          onSelectProduct={handleSearchSelect}
          onCancel={handleReset}
        />
      )}

      {screen === 'loading' && <LoadingScreen status={loadingStatus} />}

      {screen === 'results' && result && (
        <ResultsScreen
          result={result}
          onReset={handleReset}
          onCompare={handleCompare}
          onSelectProduct={handleSelectProduct}
        />
      )}

      {screen === 'compare' && compareA && result && (
        <CompareScreen
          productA={compareA}
          productB={result}
          onReset={handleReset}
          onScanAnother={handleReset}
        />
      )}

      {/* Compare pick — choose how to find the second product */}
      {screen === 'compare-pick' && (
        <NoticeShell
          tone="bg-mint"
          icon={
            <svg className="w-7 h-7 text-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        >
          <p className="font-display font-bold text-lg text-ink mb-1.5">{t('comparePick.prompt')}</p>
          <p className="text-sm text-moss mb-6">
            {t('comparePick.comparingAgainst')} <span className="font-semibold text-fern">{compareA?.productName}</span>
          </p>
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <button
              onClick={() => setScreen('barcode')}
              className="py-3.5 px-6 bg-gradient-to-br from-brand-hi to-brand-lo text-white font-display font-bold rounded-2xl shadow-lg shadow-brand-lo/25 transition-all active:scale-[.98] flex items-center justify-center gap-2"
            >
              <BarcodeIcon className="w-5 h-5" />
              {t('comparePick.scanBarcode')}
            </button>
            <button
              onClick={() => setScreen('search')}
              className="py-3.5 px-6 bg-white border border-edge text-fern font-semibold rounded-2xl transition-all active:scale-[.98] flex items-center justify-center gap-2"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {t('comparePick.searchByName')}
            </button>
            <button
              onClick={handleReset}
              className="py-2.5 px-4 text-moss hover:text-fern font-semibold transition-colors text-sm"
            >
              {t('comparePick.cancel')}
            </button>
          </div>
        </NoticeShell>
      )}

      {screen === 'not-found' && (
        <NoticeShell
          tone="bg-sand"
          icon={
            <svg className="w-7 h-7 text-ochre" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        >
          <p className="font-display font-bold text-lg text-ink mb-2">{error}</p>
          <div className="flex flex-col gap-2.5 w-full max-w-xs mt-4">
            <button
              onClick={() => setScreen('search')}
              className="py-3.5 px-6 bg-gradient-to-br from-brand-hi to-brand-lo text-white font-display font-bold rounded-2xl shadow-lg shadow-brand-lo/25 transition-all active:scale-[.98]"
            >
              {t('notFound.searchByName')}
            </button>
            <button
              onClick={handleReset}
              className="py-3.5 px-6 bg-white border border-edge text-fern font-semibold rounded-2xl transition-all active:scale-[.98]"
            >
              {t('notFound.tryAnother')}
            </button>
          </div>
        </NoticeShell>
      )}

      {screen === 'error' && (
        <NoticeShell
          tone="bg-blush"
          icon={
            <svg className="w-7 h-7 text-chili" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
            </svg>
          }
        >
          <p className="font-display font-bold text-lg text-ink mb-2">{error}</p>
          <button
            onClick={handleReset}
            className="mt-4 py-3.5 px-8 bg-gradient-to-br from-brand-hi to-brand-lo text-white font-display font-bold rounded-2xl shadow-lg shadow-brand-lo/25 transition-all active:scale-[.98]"
          >
            {t('notFound.tryAgain')}
          </button>
        </NoticeShell>
      )}

      {screen === 'paywall' && (
        <PaywallScreen
          entitlement={entitlement}
          onSubscribe={handleSubscribe}
          onHome={handleReset}
          onSignOut={() => signOut()}
        />
      )}

      {screen === 'account' && (
        <AccountScreen
          entitlement={entitlement}
          onBack={handleReset}
          onEntitlementChange={setEntitlement}
        />
      )}

      {/* Mobile bottom navigation — hidden while the full-screen scanner is up */}
      {screen !== 'barcode' && (
        <BottomNav
          active={navActive}
          onScan={handleReset}
          onSearch={handleSearch}
          onPlan={() => setScreen('account')}
          onProfile={() => setProfileOpen(true)}
        />
      )}
    </div>
  )
}
