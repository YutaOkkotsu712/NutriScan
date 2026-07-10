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
import PaywallScreen from './components/PaywallScreen'
import AccountScreen from './components/AccountScreen'
import { useProfile, setProfile } from './utils/profile'
import { useAuth, authHeader } from './utils/useAuth'
import { startCheckout } from './utils/subscription'
import { apiUrl } from './utils/apiBase'
import { extractBarcode } from './utils/barcodeExtract'
import { useT } from './i18n'
import { track } from './utils/analytics'

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
  const { t, lang } = useT()

  // Load the membership status once signed in (drives the "N scans left"
  // badge). The badge is gated on `user`, so a value left over from a previous
  // session stays hidden while signed out and is overwritten on next sign-in.
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
    // Product codes are numeric (EAN/UPC/GTIN). Anything else — e.g. a promo
    // QR code URL — must not reach the API: in prod an unroutable path falls
    // through to the SPA rewrite and returns HTML, which used to surface as a
    // bogus "check your internet" error.
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
      // Paywall-only product: every lookup goes through the auth-gated,
      // metered /api/scan endpoint. There is no ungated path.
      const analysisResult = await lookupBarcode(barcode, setLoadingStatus, {
        endpoint: apiUrl('/api/scan'),
        headers: await authHeader(),
      })

      // Paywall: the server refused because the free-scan limit is used up.
      if (analysisResult?.limitReached) {
        if (analysisResult.entitlement) setEntitlement(analysisResult.entitlement)
        setScreen('paywall')
        return
      }
      // Token expired / not signed in — bounce to login (rare; token auto-refreshes).
      if (analysisResult?.unauthenticated) {
        setError(t('errors.dbNotResponding'))
        setScreen('error')
        return
      }

      if (!analysisResult) {
        setError(t('errors.notFound', { barcode }))
        setScreen('not-found')
        return
      }

      // A successful gated scan reports the remaining allowance — update the badge.
      if (analysisResult.entitlement) setEntitlement(analysisResult.entitlement)

      // If in compare mode (already have product A), set as B and show compare
      if (comparePending && compareA) {
        setComparePending(false)
        setResult(analysisResult)
        setScreen('compare')
        return
      }

      setResult(analysisResult)
      setScreen('results')
    } catch (err) {
      console.error('[NutriScan] Barcode lookup failed:', err)
      setError(navigator.onLine === false ? t('errors.offline') : t('errors.dbNotResponding'))
      setScreen('error')
    }
  }, [comparePending, compareA, t])

  // --- Subscribe (Razorpay checkout) ---
  const handleSubscribe = useCallback(() => {
    startCheckout({
      onActivated: (ent) => { if (ent) setEntitlement(ent); setScreen('landing') },
      onError: () => { setError(t('auth.checkoutFailed')); setScreen('error') },
    })
  }, [t])

  // --- Barcode scan flow ---
  const handleScanBarcode = useCallback(() => {
    setScreen('barcode')
  }, [])

  const handleBarcodeScanned = useCallback((barcode) => {
    lookupProduct(barcode)
  }, [lookupProduct])

  // --- Search flow ---
  const handleSearch = useCallback(() => {
    setScreen('search')
  }, [])

  const handleSearchSelect = useCallback((barcode) => {
    lookupProduct(barcode)
  }, [lookupProduct])

  // --- Compare flow ---
  const handleCompare = useCallback((productResult) => {
    setCompareA(productResult)
    setComparePending(true)
    setScreen('compare-pick')
  }, [])

  // --- Navigation ---
  const handleReset = useCallback(() => {
    setScreen('landing')
    setResult(null)
    setError('')
    setCompareA(null)
    setComparePending(false)
  }, [])

  // Navigate to a product from smart swap or comparison
  const handleSelectProduct = useCallback((barcode) => {
    setComparePending(false)
    setCompareA(null)
    lookupProduct(barcode)
  }, [lookupProduct])

  // --- Membership gate (ZOCO) ---
  // Paywall-only product: login is required before scan #1, always. If the
  // Firebase env vars are missing this build is misconfigured — show a plain
  // notice rather than silently running an ungated app (fail closed, matching
  // the server-side scanGate).
  if (!authEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 text-center">
        <p className="text-sm text-gray-600 max-w-sm">
          ZOCO is not configured — the Firebase environment variables
          (VITE_FIREBASE_*) are missing from this build. See .env.example.
        </p>
      </div>
    )
  }
  // Wait for the auth state to resolve to avoid a flash of the login screen
  // for already-signed-in users.
  if (!authReady) {
    return <div className="min-h-screen bg-gray-50" />
  }
  if (!user) {
    return <LoginScreen />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
          <span className="text-xl">🔬</span>
          <h1 className="text-lg font-bold text-gray-900">{t('common.appName')}</h1>
          <div className="ml-auto flex items-center gap-3">
            {screen !== 'landing' && (
              <button
                onClick={handleReset}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                {t('common.home')}
              </button>
            )}
            {/* Membership badge — tap to open the account screen */}
            {authEnabled && user && entitlement && (
              <button
                onClick={() => setScreen('account')}
                className={`text-[11px] font-semibold px-2 py-1 rounded-full transition-colors ${
                  entitlement.subscribed
                    ? 'bg-green-600 text-white'
                    : entitlement.remaining <= 10
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-50 text-green-700'
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
              className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              aria-label="Switch language"
            >
              {lang === 'en' ? 'हिं' : 'EN'}
            </button>
            {/* Sign out */}
            {authEnabled && user && (
              <button
                onClick={() => signOut()}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label={t('auth.signOut')}
                title={t('auth.signOut')}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
            {/* Profile button */}
            <button
              onClick={() => setProfileOpen(true)}
              className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="My family profile"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {profile.configured && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
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
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-3xl">⚖️</span>
          </div>
          <p className="text-lg font-medium text-gray-700 mb-2">
            {t('comparePick.prompt')}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {t('comparePick.comparingAgainst')} <span className="font-semibold">{compareA?.productName}</span>
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => setScreen('barcode')}
              className="py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 4h3v16H3V4zm5 0h1v16H8V4zm3 0h2v16h-2V4zm4 0h1v16h-1V4zm3 0h3v16h-3V4z" />
              </svg>
              {t('comparePick.scanBarcode')}
            </button>
            <button
              onClick={() => setScreen('search')}
              className="py-3 px-6 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border-2 border-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {t('comparePick.searchByName')}
            </button>
            <button
              onClick={handleReset}
              className="py-3 px-4 text-gray-500 hover:text-gray-700 font-medium transition-colors text-sm"
            >
              {t('comparePick.cancel')}
            </button>
          </div>
        </div>
      )}

      {screen === 'not-found' && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-3xl">🔍</span>
          </div>
          <p className="text-lg font-medium text-gray-700 mb-2">{error}</p>
          <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
            <button
              onClick={() => setScreen('search')}
              className="py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
            >
              {t('notFound.searchByName')}
            </button>
            <button
              onClick={handleReset}
              className="py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
            >
              {t('notFound.tryAnother')}
            </button>
          </div>
        </div>
      )}

      {screen === 'error' && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-3xl">📷</span>
          </div>
          <p className="text-lg font-medium text-gray-700 mb-2">{error}</p>
          <button
            onClick={handleReset}
            className="mt-4 py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
          >
            {t('notFound.tryAgain')}
          </button>
        </div>
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
    </div>
  )
}
