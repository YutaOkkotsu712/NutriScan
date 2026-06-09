import { useRef, useState } from 'react'

export default function LandingScreen({ onScanBarcode, onBarcodeDetected, onSearch }) {
  const fileRef = useRef()
  const [decoding, setDecoding] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setDecoding(true)
    setError('')

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('file-scanner-tmp')
      const result = await scanner.scanFile(file, /* showImage */ false)
      scanner.clear()
      onBarcodeDetected(result)
    } catch {
      setError('No barcode found in image. Try a clearer photo of the barcode.')
    } finally {
      setDecoding(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <div className="mb-8 animate-scaleIn">
        <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🔬</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">NutriScan</h1>
        <p className="text-gray-500 max-w-xs mx-auto">
          Know exactly what's in your food. WHO-aligned health scores with detailed breakdown.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {/* Primary: Barcode scan */}
        <button
          onClick={onScanBarcode}
          className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 animate-fadeSlideIn"
          style={{ animationDelay: '100ms' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 4h3v16H3V4zm5 0h1v16H8V4zm3 0h2v16h-2V4zm4 0h1v16h-1V4zm3 0h3v16h-3V4z" />
          </svg>
          Scan Barcode
        </button>

        {/* Search */}
        <button
          onClick={onSearch}
          className="w-full py-4 px-6 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border-2 border-gray-200 transition-all active:scale-95 flex items-center justify-center gap-2 animate-fadeSlideIn"
          style={{ animationDelay: '200ms' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search by Name
        </button>

        {/* Upload barcode photo */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={decoding}
          className="w-full py-3 px-6 text-gray-500 hover:text-gray-700 font-medium transition-all active:scale-95 flex items-center justify-center gap-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 animate-fadeSlideIn"
          style={{ animationDelay: '300ms' }}
        >
          {decoding ? (
            <>
              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              Reading barcode...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Upload Barcode Photo
            </>
          )}
        </button>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {/* Hidden element for html5-qrcode file scanner */}
      <div id="file-scanner-tmp" className="hidden" />

      <p className="text-xs text-gray-400 mt-8 max-w-xs">
        Barcode & search use Open Food Facts. All analysis happens instantly.
      </p>
    </div>
  )
}
