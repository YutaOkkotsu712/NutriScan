import { useMemo } from 'react'
import { generateExplanation } from '../utils/scoreExplainer'

export default function ScoreExplainer({ result }) {
  const explanation = useMemo(() => generateExplanation(result), [result])

  if (!explanation) return null

  const scoreColor =
    result.overallScore >= 7 ? 'border-green-200 bg-green-50'
      : result.overallScore >= 4 ? 'border-amber-200 bg-amber-50'
        : 'border-red-200 bg-red-50'

  const textColor =
    result.overallScore >= 7 ? 'text-green-800'
      : result.overallScore >= 4 ? 'text-amber-800'
        : 'text-red-800'

  return (
    <div className={`rounded-xl border-2 p-4 animate-fadeSlideIn ${scoreColor}`}
      style={{ animationDelay: '100ms' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">💡</span>
        <span className="font-semibold text-gray-800">Why This Score?</span>
      </div>
      <p className={`text-sm leading-relaxed ${textColor}`}>
        {explanation}
      </p>
    </div>
  )
}
