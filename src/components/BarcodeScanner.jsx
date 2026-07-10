import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { extractBarcode } from '../utils/barcodeExtract'
import { useT } from '../i18n'

export default function BarcodeScanner({ onScan, onCancel, onManualEntry }) {
  const html5QrRef = useRef(null)
  const { t } = useT()
  // Errors/hints are stored as i18n keys and translated at render, so a
  // language switch mid-scan re-translates them.
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [showManual, setShowManual] = useState(false)
  const hasScannedRef = useRef(false)
  const mountedRef = useRef(true)
  const isNative = Capacitor.isNativePlatform()

  useEffect(() => {
    mountedRef.current = true
    let scanner = null

    // Native app (Capacitor): use ML Kit's native scanner — dramatically better
    // than browser scanning in low light and on low-end phones. Same
    // extractBarcode validation as the web path, so promo QR codes are still
    // rejected. On any failure we fall back to manual entry, never a dead end.
    async function startNativeScan() {
      try {
        const { BarcodeScanner: MLKit, BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning')
        const perm = await MLKit.requestPermissions().catch(() => ({ camera: 'granted' }))
        if (perm.camera === 'denied') {
          setError('scan.permissionDenied')
          setShowManual(true)
          return
        }
        const { barcodes } = await MLKit.scan({
          formats: [
            BarcodeFormat.Ean13, BarcodeFormat.Ean8,
            BarcodeFormat.UpcA, BarcodeFormat.UpcE,
            BarcodeFormat.Code128, BarcodeFormat.Code39,
            BarcodeFormat.QrCode,
          ],
        })
        if (!mountedRef.current) return
        for (const b of barcodes || []) {
          const code = extractBarcode(b.rawValue || b.displayValue)
          if (code) {
            hasScannedRef.current = true
            if (navigator.vibrate) navigator.vibrate(100)
            onScan(code)
            return
          }
        }
        // Scanned something that isn't a product barcode (promo QR) or nothing.
        if (barcodes?.length) setHint('scan.qrHint')
        setShowManual(true)
      } catch (err) {
        if (!mountedRef.current) return
        // User closed the native scanner, or the ML Kit module is unavailable
        // on this device — degrade to manual entry.
        if (!/cancel/i.test(String(err?.message || err))) setError('scan.cameraFailed')
        setShowManual(true)
      }
    }

    async function startScanner() {
      if (Capacitor.isNativePlatform()) return startNativeScan()
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')

        if (!mountedRef.current) return

        // Make sure the DOM element exists
        const el = document.getElementById('barcode-reader')
        if (!el) {
          setShowManual(true)
          setError('scan.elementMissing')
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

            const barcode = extractBarcode(decodedText)
            if (!barcode) {
              // Decoded a promo QR/URL — keep scanning and tell the user.
              setHint('scan.qrHint')
              return
            }
            hasScannedRef.current = true

            // Vibrate on successful scan
            if (navigator.vibrate) navigator.vibrate(100)

            // Stop scanner before navigating away
            if (scanner) {
              scanner.stop().catch(() => {})
            }

            onScan(barcode)
          },
          () => {} // ignore scan failures (normal during scanning)
        )
      } catch (err) {
        console.error('[NutriScan] Camera error:', err)
        if (!mountedRef.current) return

        const msg = String(err)
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          setError('scan.permissionDenied')
        } else if (msg.includes('NotFoundError')) {
          setError('scan.noCamera')
        } else {
          setError('scan.cameraFailed')
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
        <h2 className="text-lg font-bold text-gray-900 mb-1">{t('scan.title')}</h2>
        <p className="text-sm text-gray-500">
          {t('scan.subtitle')}
        </p>
      </div>

      {/* Camera viewport — always render the div so html5-qrcode can find it */}
      <div className={`relative rounded-2xl overflow-hidden bg-black mb-4 ${showManual || isNative ? 'hidden' : ''}`}>
        <div id="barcode-reader" className="w-full" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-red-700">{t(error)}</p>
        </div>
      )}

      {!error && hint && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-amber-700">{t(hint)}</p>
        </div>
      )}

      {/* Manual entry toggle */}
      {!showManual && (
        <button
          onClick={() => setShowManual(true)}
          className="w-full text-sm text-green-600 hover:text-green-700 font-medium mb-4"
        >
          {t('scan.cantScan')}
        </button>
      )}

      {/* Manual barcode entry */}
      {showManual && (
        <form onSubmit={handleManualSubmit} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('scan.enterBarcode')}
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
              {t('scan.go')}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {t('scan.barcodeHelp')}
          </p>
        </form>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
        >
          {t('common.back')}
        </button>
        <button
          onClick={onManualEntry}
          className="flex-1 py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border-2 border-gray-200 transition-colors text-sm"
        >
          {t('scan.searchInstead')}
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
