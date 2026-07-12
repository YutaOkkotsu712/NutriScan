// Home (logged in) — src/components/LandingScreen.jsx (full replacement)
// OCR / photo-upload is scrapped: barcode scan, search, and manual code only.
// New optional props: entitlement (plan card) + onOpenAccount.
import { useState } from 'react'
import { useT } from '../i18n'
import { TrustBadge, BarcodeIcon } from './ZocoBrand'

export default function LandingScreen({ onScanBarcode, onBarcodeDetected, onSearch, entitlement, onOpenAccount }) {
  const { t } = useT()
  const [showCode, setShowCode] = useState(false)
  const [code, setCode] = useState('')

  function submitCode(e) {
    e.preventDefault()
    const c = code.trim()
    if (c.length >= 8) onBarcodeDetected(c)
  }

  const free = entitlement && !entitlement.subscribed
  const limit = entitlement?.limit ?? 100
  const remaining = entitlement?.remaining ?? limit

  return (
    <div className="max-w-lg mx-auto px-5 pt-6 pb-28 md:pb-10 flex flex-col min-h-[80vh]">
      {/* Headline */}
      <div className="animate-fadeSlideIn">
        <h1 className="font-display font-extrabold text-[33px] leading-[1.06] tracking-tight text-ink">
          {t('welcome.headline')}
        </h1>
        <p className="text-[14.5px] leading-relaxed text-moss mt-2.5 max-w-[300px]">
          {t('common.tagline')}
        </p>
      </div>

      {/* Primary: Scan Barcode hero tile */}
      <button
        onClick={onScanBarcode}
        className="relative mt-5 w-full text-left bg-gradient-to-br from-brand-hi to-brand-lo rounded-[22px] p-5 overflow-hidden shadow-lg shadow-brand-lo/30 transition-all active:scale-[.98] animate-fadeSlideIn"
        style={{ animationDelay: '100ms' }}
      >
        <BarcodeIcon className="absolute -right-3 -top-1 w-36 h-28 text-white opacity-15" strokeWidth={1} />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <span className="font-display font-bold text-[21px] text-white block">
              {t('landing.scanBarcode')}
            </span>
            <span className="text-[13px] text-white/70 mt-1 block max-w-[190px]">
              {t('scan.subtitle')}
            </span>
          </div>
          <span className="w-13 h-13 min-w-[52px] min-h-[52px] rounded-full bg-marigold flex items-center justify-center shadow-md">
            <BarcodeIcon className="w-6 h-6 text-spice" />
          </span>
        </div>
      </button>

      {/* Secondary actions */}
      <div className="grid grid-cols-2 gap-2.5 mt-3 animate-fadeSlideIn" style={{ animationDelay: '200ms' }}>
        <button
          onClick={onSearch}
          className="bg-white border border-line rounded-2xl p-3.5 flex items-center gap-2.5 transition-all active:scale-[.97] min-h-[44px]"
        >
          <span className="w-9 h-9 rounded-full bg-sand flex items-center justify-center shrink-0">
            <svg className="w-[17px] h-[17px] text-ochre-lt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <span className="text-[13px] font-semibold text-fern">{t('landing.searchByName')}</span>
        </button>
        <button
          onClick={() => setShowCode(!showCode)}
          className="bg-white border border-line rounded-2xl p-3.5 flex items-center gap-2.5 transition-all active:scale-[.97] min-h-[44px]"
          aria-expanded={showCode}
        >
          <span className="w-9 h-9 rounded-full bg-stone flex items-center justify-center shrink-0">
            <svg className="w-[17px] h-[17px] text-sage" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 18h.01M8 18h.01M16 18h.01M8 14h.01M12 14h.01M16 14h.01M4 10h16M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
          </span>
          <span className="text-[13px] font-semibold text-fern">{t('scan.enterBarcode')}</span>
        </button>
      </div>

      {/* Inline manual code entry */}
      {showCode && (
        <form onSubmit={submitCode} className="mt-2.5 flex gap-2 animate-fadeSlideIn">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 8901058851854"
            className="flex-1 px-4 py-3 bg-white border border-edge rounded-2xl text-base font-mono text-leaf focus:border-brand focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            disabled={code.trim().length < 8}
            className={`px-5 py-3 rounded-2xl font-display font-bold transition-colors ${
              code.trim().length >= 8
                ? 'bg-gradient-to-br from-brand-hi to-brand-lo text-white'
                : 'bg-stone text-faint cursor-not-allowed'
            }`}
          >
            {t('scan.go')}
          </button>
        </form>
      )}

      {/* Trust badge */}
      <div className="flex justify-center mt-4 animate-fadeIn" style={{ animationDelay: '300ms' }}>
        <TrustBadge />
      </div>

      {/* Free plan card */}
      {free && (
        <button
          onClick={onOpenAccount}
          className="mt-auto pt-4 text-left animate-fadeSlideIn"
          style={{ animationDelay: '350ms' }}
        >
          <div className="bg-white border border-line rounded-2xl px-4 py-3.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-leaf">{t('plan.free')}</p>
              <p className="text-xs text-moss mt-0.5">{t('auth.freeScansLeft', { n: remaining })}</p>
              <div className="h-[5px] bg-hairline rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-marigold animate-barGrow"
                  style={{ width: `${Math.max(0, Math.min(100, (remaining / limit) * 100))}%` }}
                />
              </div>
            </div>
            <svg className="w-[18px] h-[18px] text-faint shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      )}

      <p className="text-xs text-faint text-center mt-5">{t('landing.footer')}</p>
    </div>
  )
}
