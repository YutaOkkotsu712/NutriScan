import ScoreDial from './ScoreDial'
import CategoryCard from './CategoryCard'
import SwapCard from './SwapCard'

const CATEGORY_ORDER = ['sugars', 'fats', 'sodium', 'fiber', 'processing', 'additives']

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

export default function ResultsScreen({ result, onReset }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-center">
        <p className="text-sm text-amber-700">
          Results based on OCR text scanning — accuracy depends on image quality (v2)
        </p>
        {result.imageCount > 1 && (
          <p className="text-xs text-amber-600 mt-1">
            Merged from {result.imageCount} photos for a more complete analysis
          </p>
        )}
      </div>

      <div className="flex justify-center mb-8">
        <ScoreDial score={result.overallScore} label={result.scoreLabel} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {CATEGORY_ORDER.map(cat => (
          <CategoryCard key={cat} category={cat} data={result.categories[cat]} />
        ))}
      </div>

      <SwapCard suggestion={result.swapSuggestion} />

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
        <details className="mt-4">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            View parsed nutrition data
          </summary>
          <div className="mt-2 bg-gray-50 rounded-xl p-4 text-sm font-mono text-gray-600">
            {Object.entries(result.parsedNutrition).map(([key, val]) => (
              <div key={key} className="flex justify-between py-0.5">
                <span>{key}</span>
                <span className="font-semibold">{val}{key === 'calories' ? '' : key === 'sodium' ? 'mg' : 'g'}</span>
              </div>
            ))}
          </div>
        </details>
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
