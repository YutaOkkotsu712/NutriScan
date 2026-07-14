// Barcode scanner — native ML Kit on Android/iOS, html5-qrcode on web.
import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { extractBarcode } from '../utils/barcodeExtract'
import { useT } from '../i18n'

function Bracket({ className }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className={`absolute ${className}`}>
      <path d="M3 15V7a4 4 0 0 1 4-4h8" stroke="#F2A93B" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default function BarcodeScanner({ onScan, onCancel, onManualEntry }) {
  const html5QrRef = useRef(null)
  const stopNativeScannerRef = useRef(() => Promise.resolve())
  const { t } = useT()
  // Errors/hints are stored as i18n keys and translated at render, so a
  // language switch mid-scan re-translates them.
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [nativeScannerActive, setNativeScannerActive] = useState(false)
  const hasScannedRef = useRef(false)
  const mountedRef = useRef(true)
  const isNative = Capacitor.isNativePlatform()

  useEffect(() => {
    mountedRef.current = true
    let scanner = null
    let nativePlugin = null
    let nativeScannerStarted = false
    let nativeListeners = []

    const nativeFormats = (BarcodeFormat) => [
      BarcodeFormat.Ean13, BarcodeFormat.Ean8,
      BarcodeFormat.UpcA, BarcodeFormat.UpcE,
      BarcodeFormat.Code128, BarcodeFormat.Code39,
      BarcodeFormat.QrCode,
    ].filter(Boolean)

    function readBarcodeFromNativeEvent(event) {
      const barcodes = event?.barcodes || (event?.barcode ? [event.barcode] : [])
      for (const barcode of barcodes) {
        const code = extractBarcode(barcode?.rawValue || barcode?.displayValue)
        if (code) return code
      }
      return null
    }

    async function stopNativeScanner() {
      document.documentElement.classList.remove('barcode-scanner-active')
      document.body.classList.remove('barcode-scanner-active')
      for (const listener of nativeListeners) {
        await listener?.remove?.().catch(() => {})
      }
      nativeListeners = []
      if (nativePlugin && nativeScannerStarted) {
        await nativePlugin.stopScan().catch(() => {})
      }
      nativeScannerStarted = false
      if (mountedRef.current) setNativeScannerActive(false)
    }
    stopNativeScannerRef.current = stopNativeScanner

    // Native app (Capacitor): use ML Kit's native scanner — dramatically better
    // than browser scanning in low light and on low-end phones. Same
    // extractBarcode validation as the web path, so promo QR codes are still
    // rejected. On any failure we fall back to manual entry, never a dead end.
    async function startNativeScan() {
      try {
        const {
          BarcodeScanner: MLKit,
          BarcodeFormat,
          LensFacing,
          Resolution,
        } = await import('@capacitor-mlkit/barcode-scanning')
        nativePlugin = MLKit

        const support = await MLKit.isSupported().catch(() => ({ supported: true }))
        if (support.supported === false) {
          setError('scan.noCamera')
          setShowManual(true)
          return
        }

        const perm = await MLKit.requestPermissions()
        if (perm.camera !== 'granted') {
          setError('scan.permissionDenied')
          setShowManual(true)
          return
        }

        const handleDetected = async (event) => {
          if (hasScannedRef.current || !mountedRef.current) return
          const code = readBarcodeFromNativeEvent(event)
          if (!code) {
            setHint('scan.qrHint')
            return
          }
          hasScannedRef.current = true
          if (navigator.vibrate) navigator.vibrate(100)
          await stopNativeScanner()
          onScan(code)
        }

        nativeListeners = await Promise.all([
          MLKit.addListener('barcodeScanned', handleDetected),
          MLKit.addListener('barcodesScanned', handleDetected),
          MLKit.addListener('scanError', (event) => {
            console.error('[NutriScan] Native camera error:', event?.message || event)
          }),
        ])

        document.documentElement.classList.add('barcode-scanner-active')
        document.body.classList.add('barcode-scanner-active')
        setNativeScannerActive(true)
        await MLKit.startScan({
          formats: nativeFormats(BarcodeFormat),
          lensFacing: LensFacing?.Back,
          resolution: Resolution?.['1280x720'],
        })
        nativeScannerStarted = true
      } catch (err) {
        if (!mountedRef.current) return
        await stopNativeScanner()
        console.error('[NutriScan] Native camera error:', err)
        if (/denied|permission/i.test(String(err?.message || err))) {
          setError('scan.permissionDenied')
        } else {
          setError('scan.cameraFailed')
        }
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
      stopNativeScanner()
      stopNativeScannerRef.current = () => Promise.resolve()
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

  function stopActiveScanner() {
    stopNativeScannerRef.current()
    const scanner = html5QrRef.current
    if (!scanner) return
    try {
      const state = scanner.getState()
      if (state === 2 || state === 3) scanner.stop().catch(() => {})
    } catch {
      scanner.stop().catch(() => {})
    }
  }

  function handleShowManual() {
    stopActiveScanner()
    setShowManual(true)
  }

  function handleCancel() {
    stopActiveScanner()
    onCancel()
  }

  function handleSearchInstead() {
    stopActiveScanner()
    onManualEntry()
  }

  const shellClass = nativeScannerActive
    ? 'fixed inset-0 z-[9999] bg-transparent flex flex-col barcode-scanner-modal'
    : 'fixed inset-0 z-[9999] bg-night flex flex-col barcode-scanner-modal'
  const viewportHidden = showManual || (!nativeScannerActive && isNative)

  return (
    <div className={shellClass}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-2">
        <button
          onClick={handleCancel}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-cornsilk"
          aria-label={t('common.back')}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="font-display font-bold text-[17px] text-cornsilk">{t('scan.title')}</h2>
        <span className="w-10 h-10" aria-hidden="true" />
      </div>

      {/* Camera viewport — always render the div so html5-qrcode can find it */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 min-h-0">
        <div className={`relative w-full max-w-[320px] ${viewportHidden ? 'hidden' : ''}`}>
          <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden ${nativeScannerActive ? 'bg-transparent border border-white/30' : 'bg-black'}`}>
            {!isNative && <div id="barcode-reader" className="w-full" />}
          </div>
          {/* Viewfinder chrome */}
          <div className="pointer-events-none absolute inset-0">
            <Bracket className="top-0 left-0" />
            <Bracket className="top-0 right-0 rotate-90" />
            <Bracket className="bottom-0 right-0 rotate-180" />
            <Bracket className="bottom-0 left-0 -rotate-90" />
            <div className="absolute left-4 right-4 top-1/2 flex justify-center">
              <div
                className="h-[2.5px] w-full animate-beamSweep"
                style={{ background: 'linear-gradient(90deg,transparent,#F2A93B,transparent)', boxShadow: '0 0 14px rgba(242,169,59,.9)' }}
              />
            </div>
          </div>
        </div>

        {!showManual && (
          <p className="text-sm text-cornsilk/85 text-center max-w-[240px] leading-relaxed mt-6">
            {t('scan.subtitle')}
          </p>
        )}

        {error && (
          <div className="w-full max-w-[320px] bg-blush border border-blush-line rounded-2xl p-3 mt-4">
            <p className="text-sm text-chili-ink">{t(error)}</p>
          </div>
        )}
        {!error && hint && (
          <div className="w-full max-w-[320px] bg-sand border border-sand-line rounded-2xl p-3 mt-4">
            <p className="text-sm text-ochre">{t(hint)}</p>
          </div>
        )}

        {/* Manual barcode entry */}
        {showManual && (
          <form onSubmit={handleManualSubmit} className="w-full max-w-[320px] mt-4">
            <label className="block text-sm font-semibold text-cornsilk mb-2">
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
                className="flex-1 min-w-0 px-4 py-3 bg-white border border-edge rounded-2xl text-lg font-mono text-leaf focus:border-brand focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={manualCode.trim().length < 8}
                className={`px-5 py-3 rounded-2xl font-display font-bold transition-colors ${
                  manualCode.trim().length >= 8
                    ? 'bg-marigold text-spice'
                    : 'bg-white/10 text-cornsilk/40 cursor-not-allowed'
                }`}
              >
                {t('scan.go')}
              </button>
            </div>
            <p className="text-xs text-cornsilk/50 mt-2">{t('scan.barcodeHelp')}</p>
          </form>
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-6 pb-[max(env(safe-area-inset-bottom),2.5rem)] flex flex-col items-center gap-3">
        {!showManual && (
          <button
            onClick={handleShowManual}
            className="w-full flex items-center justify-center gap-2.5 bg-white/10 border border-white/20 rounded-2xl py-3.5 text-sm font-semibold text-cornsilk backdrop-blur-sm transition-all active:scale-[.98]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 18h.01M8 18h.01M16 18h.01M8 14h.01M12 14h.01M16 14h.01M4 10h16M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
            {t('scan.cantScan')}
          </button>
        )}
        <button
          onClick={handleSearchInstead}
          className="text-[13px] font-semibold text-marigold py-1"
        >
          {t('scan.searchInstead')}
        </button>
      </div>

      {/* Styling for html5-qrcode */}
      <style>{`
        html.barcode-scanner-active,
        body.barcode-scanner-active,
        body.barcode-scanner-active #root,
        body.barcode-scanner-active #root > div {
          background: transparent !important;
        }
        body.barcode-scanner-active {
          visibility: hidden;
        }
        body.barcode-scanner-active .barcode-scanner-modal,
        body.barcode-scanner-active .barcode-scanner-modal * {
          visibility: visible !important;
        }
        body.barcode-scanner-active .barcode-scanner-modal {
          background: transparent !important;
        }
        #barcode-reader { border: none !important; }
        #barcode-reader video { border-radius: 16px !important; }
        #barcode-reader__scan_region { min-height: 300px; }
        #barcode-reader__dashboard { display: none !important; }
        #barcode-reader img[alt="Info icon"] { display: none !important; }
        #barcode-reader__header_message { display: none !important; }
      `}</style>
    </div>
  )
}
