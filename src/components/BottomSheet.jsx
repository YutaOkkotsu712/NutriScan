// Bottom sheet / side drawer — src/components/BottomSheet.jsx (full replacement)
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// Reusable drawer (spec §12.3): bottom sheet on mobile, right-side drawer on
// wider screens. Keeps "Back to product" context — the product page stays
// mounted underneath. Closes on backdrop tap or Escape.
export default function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-night/50 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — bottom sheet on mobile, side drawer ≥sm */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:w-[420px] sm:max-w-[90vw] bg-cream rounded-t-3xl sm:rounded-t-none sm:rounded-l-3xl shadow-2xl max-h-[85vh] sm:max-h-none sm:h-full flex flex-col animate-sheetUp sm:animate-drawerIn"
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-edge" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-line shrink-0">
          <h3 className="font-display font-bold text-ink text-base pr-4">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Back to product"
            className="shrink-0 w-8 h-8 rounded-full bg-white border border-edge flex items-center justify-center text-sage transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-5 py-4 flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
