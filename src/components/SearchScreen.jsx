import { useState, useRef, useCallback } from 'react'

const NUTRI_COLORS = {
  a: 'bg-green-600',
  b: 'bg-lime-500',
  c: 'bg-yellow-400',
  d: 'bg-orange-500',
  e: 'bg-red-600',
}

export default function SearchScreen({ onSelectProduct, onCancel }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)

  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setResults(null)
      return
    }

    setLoading(true)
    setError('')

    try {
      const { searchProducts } = await import('../utils/searchEngine')
      const data = await searchProducts(q)
      setResults(data)
    } catch {
      setError('Search failed — check your internet connection')
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
    <div className="max-w-lg mx-auto px-4 py-6 min-h-[80vh]">
      <div className="text-center mb-5">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Search Products</h2>
        <p className="text-sm text-gray-500">
          Search by product name, brand, or type
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="e.g. Parle-G, Maggi, Pringles..."
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-green-500 focus:outline-none"
            autoFocus
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-3">
            {results.totalResults > 0
              ? `${results.totalResults} products found`
              : 'No products found — try a different name or brand'
            }
          </p>

          <div className="space-y-2">
            {results.products.map((product) => (
              <button
                key={product.barcode}
                onClick={() => onSelectProduct(product.barcode)}
                className="w-full flex items-center gap-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-3 text-left transition-colors"
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <span className="text-gray-400 text-lg">📦</span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {product.name}
                  </p>
                  {product.brand && (
                    <p className="text-xs text-gray-500 truncate">{product.brand}</p>
                  )}
                </div>

                {product.nutriScore && (
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold uppercase ${NUTRI_COLORS[product.nutriScore] || 'bg-gray-400'}`}>
                    {product.nutriScore}
                  </span>
                )}

                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={onCancel}
        className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
      >
        Back
      </button>
    </div>
  )
}
