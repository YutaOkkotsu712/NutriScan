import { useState, useEffect } from 'react'

const NUTRI_COLORS = {
  a: 'bg-green-600',
  b: 'bg-lime-500',
  c: 'bg-yellow-400',
  d: 'bg-orange-500',
  e: 'bg-red-600',
}

export default function SmartSwapCard({ result, onSelectProduct }) {
  const [alternatives, setAlternatives] = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Only fetch for barcode products (they have categories from OFF)
    if (result.source !== 'openfoodfacts' || !result.barcode) return

    let cancelled = false

    async function fetchAlternatives() {
      setLoading(true)
      try {
        const { findAlternatives } = await import('../utils/searchEngine')
        const alts = await findAlternatives({
          barcode: result.barcode,
          categories: result.categoryTags || [],
        })
        if (!cancelled) {
          setAlternatives(alts)
          setLoaded(true)
        }
      } catch {
        if (!cancelled) setLoaded(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAlternatives()
    return () => { cancelled = true }
  }, [result.barcode, result.source, result.categoryTags])

  // For OCR scans or no alternatives found, show generic advice
  if (result.source !== 'openfoodfacts' || (loaded && alternatives.length === 0)) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">💡</span>
          <span className="font-semibold text-gray-800">Healthier Swap</span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{result.swapSuggestion}</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔄</span>
        <span className="font-semibold text-gray-800">Try These Instead</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
          <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          Finding healthier alternatives...
        </div>
      )}

      {!loading && alternatives.length > 0 && (
        <div className="space-y-2">
          {alternatives.map((alt) => (
            <button
              key={alt.barcode}
              onClick={() => onSelectProduct(alt.barcode)}
              className="w-full flex items-center gap-3 bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-200 rounded-lg p-2.5 text-left transition-colors"
            >
              {alt.image ? (
                <img src={alt.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-sm">📦</span>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{alt.name}</p>
                {alt.brand && (
                  <p className="text-xs text-gray-500 truncate">{alt.brand}</p>
                )}
              </div>

              {alt.nutriScore && (
                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold uppercase ${NUTRI_COLORS[alt.nutriScore] || 'bg-gray-400'}`}>
                  {alt.nutriScore}
                </span>
              )}

              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Generic advice below alternatives */}
      <p className="text-xs text-gray-500 mt-3 leading-relaxed">{result.swapSuggestion}</p>
    </div>
  )
}
