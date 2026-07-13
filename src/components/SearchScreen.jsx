// Search — src/components/SearchScreen.jsx (full replacement)
import { useState, useRef, useCallback } from 'react'
import { useT } from '../i18n'
import { track } from '../utils/analytics'
import { ImageStripe } from './ZocoBrand'

// Nutri-Score letter → token styling (kept from the old NUTRI_COLORS, restyled).
const NUTRI_STYLE = {
  a: 'bg-mint text-deep',
  b: 'bg-mint text-deep',
  c: 'bg-sand text-ochre',
  d: 'bg-blush text-chili-ink',
  e: 'bg-blush text-chili-ink',
}

export default function SearchScreen({ onSelectProduct, onCancel }) {
  const { t } = useT()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const debounceRef = useRef(null)

  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setResults(null)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const { searchProducts } = await import('../utils/searchEngine')
      // Report §18 "most searched products": the term is aggregated into a
      // bounded leaderboard server-side, never stored per-user.
      track('product_search', { term: q })
      const data = await searchProducts(q)
      setResults(data)
      if (!data.products?.length) track('search_fail', { queryLen: q.length })
    } catch {
      setError(true)
      track('search_fail', { queryLen: q.length })
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInput(value) {
    setQuery(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 400)
  }

  function handleSubmit(e) {
    e.preventDefault()
    clearTimeout(debounceRef.current)
    doSearch(query)
  }

  return (
    <div className="max-w-lg md:max-w-2xl mx-auto px-5 py-5 md:py-10 pb-28 md:pb-10 min-h-[80vh]">
      {/* Title row with back button */}
      <div className="flex items-center gap-2.5 mb-4">
        <button
          onClick={onCancel}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-white border border-edge"
          aria-label={t('common.back')}
        >
          <svg className="w-[17px] h-[17px] text-fern" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-display font-bold text-lg text-ink">{t('search.title')}</h2>
      </div>

      {/* Search field */}
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2.5 bg-white border-[1.5px] border-brand rounded-2xl px-3.5 py-3 shadow-sm">
          <svg className="w-[18px] h-[18px] text-brand shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder={t('search.placeholder')}
            className="flex-1 min-w-0 text-[15px] text-leaf placeholder:text-faint focus:outline-none bg-transparent"
            autoFocus
          />
          {loading && (
            <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin shrink-0" />
          )}
        </div>
      </form>
      <p className="text-xs text-faint mt-2.5">{t('search.subtitle')}</p>

      {error && (
        <div className="bg-blush border border-blush-line rounded-2xl p-3 mt-4">
          <p className="text-sm text-chili-ink">{t('search.noResults')}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="mt-4">
          <p className="text-xs text-moss mb-2">
            {results.totalResults > 0
              ? t('search.productsFound', { count: results.totalResults })
              : t('search.noResults')}
          </p>
          <div className="space-y-2">
            {results.products.map((product) => (
              <button
                key={product.barcode}
                onClick={() => onSelectProduct(product.barcode)}
                className="w-full flex items-center gap-3 bg-white border border-line rounded-2xl p-3 text-left transition-all active:scale-[.99]"
              >
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-12 h-12 rounded-[11px] object-cover shrink-0" />
                ) : (
                  <ImageStripe className="w-12 h-12 rounded-[11px]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-leaf truncate">{product.name}</p>
                  {product.brand && <p className="text-xs text-moss truncate mt-0.5">{product.brand}</p>}
                </div>
                {product.nutriScore && (
                  <span className={`shrink-0 text-[10.5px] font-bold px-2 py-0.5 rounded-full uppercase ${NUTRI_STYLE[product.nutriScore] || 'bg-stone text-sage'}`}>
                    {product.nutriScore}
                  </span>
                )}
                <svg className="w-[15px] h-[15px] text-faint shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
