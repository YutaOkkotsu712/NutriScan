import { useEffect, useRef, useState } from 'react'

export default function BarcodeScanner({ onScan, onCancel, onManualEntry }) {
  const html5QrRef = useRef(null)
  const [error, setError] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [showManual, setShowManual] = useState(false)
  const hasScannedRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    let scanner = null

    async function startScanner() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')

        if (!mountedRef.current) return

        // Make sure the DOM element exists
        const el = document.getElementById('barcode-reader')
        if (!el) {
          setShowManual(true)
          setError('Scanner element not found. Enter barcode manually.')
          return
        }

        scanner = new Html5Qrcode('barcode-reader')
        html5QrRef.current = scanner

        const formats = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ].filter(Boolean) // filter out undefined in case lib version differs

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 150 },
            formatsToSupport: formats.length > 0 ? formats : undefined,
          },
          (decodedText) => {
            if (hasScannedRef.current || !mountedRef.current) return
            hasScannedRef.current = true

            // Vibrate on successful scan
            if (navigator.vibrate) navigator.vibrate(100)

            // Stop scanner before navigating away
            if (scanner) {
              scanner.stop().catch(() => {})
            }

            onScan(decodedText)
          },
          () => {} // ignore scan failures (normal during scanning)
        )
      } catch (err) {
        console.error('[NutriScan] Camera error:', err)
        if (!mountedRef.current) return

        const msg = String(err)
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          setError('Camera permission denied. Please allow camera access or enter the barcode manually.')
        } else if (msg.includes('NotFoundError')) {
          setError('No camera found. Please enter the barcode manually.')
        } else {
          setError('Could not start camera. Try entering the barcode manually.')
        }
        setShowManual(true)
      }
    }

    startScanner()

    return () => {
      mountedRef.current = false
      if (scanner) {
        try {
          const state = scanner.getState()
          // 2 = SCANNING, 3 = PAUSED
          if (state === 2 || state === 3) {
            scanner.stop().catch(() => {})
          }
        } catch {
          // getState may throw if not initialized
          scanner.stop().catch(() => {})
        }
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleManualSubmit(e) {
    e.preventDefault()
    const code = manualCode.trim()
    if (code.length >= 8) {
      onScan(code)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 min-h-[80vh]">
      <div className="text-center mb-5">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Scan Barcode</h2>
        <p className="text-sm text-gray-500">
          Point your camera at the barcode on the product
        </p>
      </div>

      {/* Camera viewport — always render the div so html5-qrcode can find it */}
      <div className={`relative rounded-2xl overflow-hidden bg-black mb-4 ${showManual ? 'hidden' : ''}`}>
        <div id="barcode-reader" className="w-full" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Manual entry toggle */}
      {!showManual && (
        <button
          onClick={() => setShowManual(true)}
          className="w-full text-sm text-green-600 hover:text-green-700 font-medium mb-4"
        >
          Can't scan? Enter barcode manually
        </button>
      )}

      {/* Manual barcode entry */}
      {showManual && (
        <form onSubmit={handleManualSubmit} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter barcode number
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 8901058851854"
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-mono focus:border-green-500 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={manualCode.trim().length < 8}
              className={`px-5 py-3 rounded-xl font-semibold transition-colors ${
                manualCode.trim().length >= 8
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Go
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Find the 8 or 13 digit number below the barcode lines
          </p>
        </form>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
        >
          Back
        </button>
        <button
          onClick={onManualEntry}
          className="flex-1 py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border-2 border-gray-200 transition-colors text-sm"
        >
          Scan Label Instead
        </button>
      </div>

      {/* Styling for html5-qrcode */}
      <style>{`
        #barcode-reader {
          border: none !important;
        }
        #barcode-reader video {
          border-radius: 12px !important;
        }
        #barcode-reader__scan_region {
          min-height: 300px;
        }
        #barcode-reader__dashboard {
          display: none !important;
        }
        #barcode-reader img[alt="Info icon"] {
          display: none !important;
        }
        #barcode-reader__header_message {
          display: none !important;
        }
      `}</style>
    </div>
  )
}
