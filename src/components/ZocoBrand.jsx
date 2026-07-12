// ZOCO brand primitives — src/components/ZocoBrand.jsx (new file)
import { useT } from '../i18n'

// Rounded-square brand mark: green gradient + lowercase "z".
export function BrandMark({ size = 34 }) {
  return (
    <div
      className="bg-gradient-to-br from-brand-hi to-brand-lo flex items-center justify-center shadow-md shadow-brand-lo/30 shrink-0"
      style={{ width: size, height: size, borderRadius: size * 0.3 }}
    >
      <span
        className="font-display font-extrabold text-cream leading-none"
        style={{ fontSize: size * 0.56 }}
      >
        z
      </span>
    </div>
  )
}

// Lowercase wordmark.
export function Wordmark({ className = 'text-2xl' }) {
  return (
    <span className={`font-display font-extrabold tracking-tight text-ink ${className}`}>
      zoco
    </span>
  )
}

// FSSAI-style veg indicator (green square + dot).
export function VegMark({ size = 15, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" className={`shrink-0 ${className}`} aria-label="Vegetarian">
      <rect x="0.75" y="0.75" width="13.5" height="13.5" rx="2" fill="none" stroke="#1C7A4A" strokeWidth="1.5" />
      <circle cx="7.5" cy="7.5" r="3.4" fill="#1C7A4A" />
    </svg>
  )
}

export function ShieldIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

// "Independent label reading · No sponsored rankings" pill.
export function TrustBadge({ className = '' }) {
  const { t } = useT()
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold text-deep bg-mint rounded-full px-3.5 py-1.5 ${className}`}>
      <ShieldIcon />
      {t('auth.trust')}
    </span>
  )
}

// Diagonal-stripe placeholder for missing product images.
export function ImageStripe({ className = 'w-16 h-16 rounded-xl' }) {
  return (
    <div
      className={`flex items-center justify-center shrink-0 ${className}`}
      style={{ background: 'repeating-linear-gradient(45deg,#F0EADC,#F0EADC 6px,#EAE2CE 6px,#EAE2CE 12px)' }}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#B8AE93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  )
}

export function BarcodeIcon({ className = 'w-5 h-5', strokeWidth = 2.2 }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h3v16H3V4zm5 0h1v16H8V4zm3 0h2v16h-2V4zm4 0h1v16h-1V4zm3 0h3v16h-3V4z" />
    </svg>
  )
}
