import ScoreDial from './ScoreDial'
import CategoryCard from './CategoryCard'
import SmartSwapCard from './SmartSwapCard'

const CATEGORY_ORDER = ['calories', 'sugars', 'fats', 'sodium', 'fiber', 'processing', 'additives']

function concernStyle(concern) {
  if (concern === 'high') return 'bg-red-100 text-red-700'
  if (concern === 'medium') return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

function concernLabel(concern) {
  if (concern === 'high') return 'limit'
  if (concern === 'medium') return 'review'
  return 'low concern'
}

export default function ResultsScreen({ result, onReset, onCompare, onSelectProduct }) {
  const isBarcode = result.source === 'openfoodfacts'

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Product info (barcode scan) */}
      {isBarcode && (
        <div className="flex items-center gap-4 mb-6 bg-white border border-gray-200 rounded-xl p-4">
          {result.imageUrl && (
            <img
              src={result.imageUrl}
              alt={result.productName}
              className="w-16 h-16 rounded-lg object-cover shrink-0"
            />
          )}
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 text-lg leading-tight truncate">
              {result.productName}
            </h2>
            {result.barcode && (
              <p className="text-xs text-gray-400 font-mono mt-0.5">{result.barcode}</p>
            )}
            {result.servingSize && (
              <p className="text-xs text-gray-500 mt-0.5">Serving: {result.servingSize}</p>
            )}
          </div>
        </div>
      )}

      {/* Source banner */}
      <div className={`border rounded-xl p-3 mb-6 text-center ${
        isBarcode
          ? 'bg-green-50 border-green-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <p className={`text-sm ${isBarcode ? 'text-green-700' : 'text-amber-700'}`}>
          {isBarcode
            ? 'Data from Open Food Facts — verified nutrition database'
            : 'Results based on OCR text scanning — accuracy depends on image quality'
          }
        </p>
        {!isBarcode && result.imageCount > 1 && (
          <p className="text-xs text-amber-600 mt-1">
            Merged from {result.imageCount} photos for a more complete analysis
          </p>
        )}
      </div>

      <div className="flex justify-center mb-8">
        <ScoreDial score={result.overallScore} label={result.scoreLabel} />
      </div>

      {/* Compare button */}
      {onCompare && (
        <button
          onClick={() => onCompare(result)}
          className="w-full mb-4 py-3 px-4 bg-white hover:bg-gray-50 border-2 border-dashed border-gray-300 text-gray-600 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Compare with Another Product
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {CATEGORY_ORDER.map(cat => (
          result.categories[cat] && <CategoryCard key={cat} category={cat} data={result.categories[cat]} />
        ))}
      </div>

      {/* Smart swap suggestions */}
      <SmartSwapCard result={result} onSelectProduct={onSelectProduct || (() => {})} />

      {result.flaggedItems?.length > 0 && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🧾</span>
            <span className="font-semibold text-gray-800">Ingredient Review</span>
          </div>
          <div className="space-y-2">
            {result.flaggedItems.map((item, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-100 bg-gray-50 p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-800 capitalize">{item.name}</span>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${concernStyle(item.concern)}`}>
                    {concernLabel(item.concern)}
                  </span>
                </div>
                {item.reason && (
                  <p className="mt-1 text-xs leading-snug text-gray-600">{item.reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {result.parsedNutrition && Object.keys(result.parsedNutrition).length > 0 && (
        <details className="mt-4" open={isBarcode}>
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            View parsed nutrition data
          </summary>
          <div className="mt-2 bg-gray-50 rounded-xl p-4 text-sm font-mono text-gray-600">
            {Object.entries(result.parsedNutrition).map(([key, val]) => (
              <div key={key} className="flex justify-between py-0.5">
                <span>{key}</span>
                <span className="font-semibold">{val}{key === 'calories' ? ' kcal' : key === 'sodium' ? ' mg' : ' g'}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Nutri-Score comparison (if available from OFF) */}
      {result.nutriScore && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">
            Open Food Facts Nutri-Score: <span className="font-bold text-gray-700 uppercase">{result.nutriScore}</span>
          </p>
        </div>
      )}

      <button
        onClick={onReset}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 py-3 px-8 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg transition-colors"
      >
        Scan Another
      </button>
    </div>
  )
}
