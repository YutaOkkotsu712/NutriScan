import { useState, useCallback } from 'react'
import LandingScreen from './components/LandingScreen'
import BarcodeScanner from './components/BarcodeScanner'
import ImageCollector from './components/ImageCollector'
import LoadingScreen from './components/LoadingScreen'
import ResultsScreen from './components/ResultsScreen'

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [loadingStatus, setLoadingStatus] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [initialImage, setInitialImage] = useState(null)

  // --- Barcode flow ---
  const handleScanBarcode = useCallback(() => {
    setScreen('barcode')
  }, [])

  const handleBarcodeScanned = useCallback(async (barcode) => {
    setScreen('loading')
    setLoadingStatus('Looking up product...')

    try {
      const { lookupBarcode } = await import('./utils/barcodeEngine')
      const analysisResult = await lookupBarcode(barcode, setLoadingStatus)

      if (!analysisResult) {
        // Product not found — offer OCR fallback
        setError(`Product not found in database (barcode: ${barcode}). Try scanning the nutrition label instead.`)
        setScreen('not-found')
        return
      }

      setResult(analysisResult)
      setScreen('results')
    } catch (err) {
      console.error('[NutriScan] Barcode lookup failed:', err)
      setError('Could not look up product — check your internet connection and try again.')
      setScreen('error')
    }
  }, [])

  // --- OCR label flow ---
  const handleImageSelected = useCallback((file) => {
    setInitialImage(file)
    setScreen('collect')
  }, [])

  const handleScanLabel = useCallback(() => {
    // Go to OCR label flow from barcode scanner
    setScreen('landing')
    // Small delay to let state reset, then trigger camera
    setTimeout(() => {
      setInitialImage(null)
      setScreen('collect')
    }, 50)
  }, [])

  const runOcrScan = useCallback(async (files) => {
    setScreen('loading')
    setLoadingStatus('Preparing images...')

    try {
      const { scanImage } = await import('./utils/ocrEngine')
      const analysisResult = await scanImage(files, setLoadingStatus)
      setResult(analysisResult)
      setScreen('results')
    } catch (err) {
      if (err.message === 'UNREADABLE' || err.message === 'NO_NUTRITION_DATA') {
        setError("Couldn't read a nutrition label — try clearer, well-lit photos")
      } else {
        setError('Analysis failed — please try again')
      }
      setScreen('error')
    }
  }, [])

  const handleReset = useCallback(() => {
    setScreen('landing')
    setResult(null)
    setError('')
    setInitialImage(null)
  }, [])

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
              New Scan
            </button>
          )}
        </div>
      </header>

      {screen === 'landing' && (
        <LandingScreen
          onScanBarcode={handleScanBarcode}
          onImageSelected={handleImageSelected}
        />
      )}

      {screen === 'barcode' && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onCancel={handleReset}
          onManualEntry={handleScanLabel}
        />
      )}

      {screen === 'collect' && (
        <ImageCollector
          initialImage={initialImage}
          onScan={runOcrScan}
        />
      )}

      {screen === 'loading' && <LoadingScreen status={loadingStatus} />}

      {screen === 'results' && result && (
        <ResultsScreen result={result} onReset={handleReset} />
      )}

      {screen === 'not-found' && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-3xl">🔍</span>
          </div>
          <p className="text-lg font-medium text-gray-700 mb-2">{error}</p>
          <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
            <button
              onClick={() => {
                setInitialImage(null)
                setScreen('collect')
              }}
              className="py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
            >
              Scan Label with Camera
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
