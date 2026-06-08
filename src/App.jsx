import { useState, useCallback } from 'react'
import LandingScreen from './components/LandingScreen'
import ImageCollector from './components/ImageCollector'
import LoadingScreen from './components/LoadingScreen'
import ResultsScreen from './components/ResultsScreen'

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [loadingStatus, setLoadingStatus] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [initialImage, setInitialImage] = useState(null)

  const handleImageSelected = useCallback((file) => {
    setInitialImage(file)
    setScreen('collect')
  }, [])

  const runScan = useCallback(async (files) => {
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

      {screen === 'landing' && <LandingScreen onImageSelected={handleImageSelected} />}
      {screen === 'collect' && (
        <ImageCollector
          initialImage={initialImage}
          onScan={runScan}
        />
      )}
      {screen === 'loading' && <LoadingScreen status={loadingStatus} />}
      {screen === 'results' && result && <ResultsScreen result={result} onReset={handleReset} />}
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
