import { useState, useCallback } from 'react'
import LandingScreen from './components/LandingScreen'
import BarcodeScanner from './components/BarcodeScanner'
import SearchScreen from './components/SearchScreen'
import LoadingScreen from './components/LoadingScreen'
import ResultsScreen from './components/ResultsScreen'
import CompareScreen from './components/CompareScreen'

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [loadingStatus, setLoadingStatus] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  // Compare state
  const [compareA, setCompareA] = useState(null)
  const [comparePending, setComparePending] = useState(false)

  // --- Barcode / product lookup ---
  const lookupProduct = useCallback(async (barcode) => {
    setScreen('loading')
    setLoadingStatus('Looking up product...')

    try {
      const { lookupBarcode } = await import('./utils/barcodeEngine')
      const analysisResult = await lookupBarcode(barcode, setLoadingStatus)

      if (!analysisResult) {
        setError(`Product not found in database (barcode: ${barcode}). Try searching by name instead.`)
        setScreen('not-found')
        return
      }

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
      setError('Could not look up product — check your internet connection and try again.')
      setScreen('error')
    }
  }, [comparePending, compareA])

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
          <span className="text-xl">🔬</span>
          <h1 className="text-lg font-bold text-gray-900">NutriScan</h1>
          {screen !== 'landing' && (
            <button
              onClick={handleReset}
              className="ml-auto text-sm text-green-600 hover:text-green-700 font-medium"
            >
              Home
            </button>
          )}
        </div>
      </header>

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
            Pick a product to compare with
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Comparing against: <span className="font-semibold">{compareA?.productName}</span>
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
              Scan Barcode
            </button>
            <button
              onClick={() => setScreen('search')}
              className="py-3 px-6 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border-2 border-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search by Name
            </button>
            <button
              onClick={handleReset}
              className="py-3 px-4 text-gray-500 hover:text-gray-700 font-medium transition-colors text-sm"
            >
              Cancel
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
              Search by Name
            </button>
            <button
              onClick={handleReset}
              className="py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
            >
              Try Another Product
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
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
